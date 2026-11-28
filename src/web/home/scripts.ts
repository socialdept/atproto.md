import { C } from '../kit';

// The request box: turns an address into an API path, fetches it as JSON and prints it highlighted.
// Phone text fit for the hero: each line gets the font size that makes it exactly as wide as the screen minus the
// page's 20px gutter on each side, the same edges as the lede. Runs before the line script measures the page, again once Beast loads, and on resize.
export const FIT_SCRIPT = `
(() => {
  const lines = document.querySelectorAll('.hero h1.fit .l');
  const fit = () => {
    const phone = matchMedia('(max-width: 640px)').matches;
    // At most 480px wide, so the lines stop growing on wide phones and small tablets before the breakpoint.
    const avail = Math.min(480, document.documentElement.clientWidth - 40);
    lines.forEach((l) => {
      if (!phone) { l.style.fontSize = ''; return; }
      // Two passes: hinting and rounding make width not quite linear in font size.
      let size = 100;
      for (let i = 0; i < 2; i++) {
        l.style.fontSize = size + 'px';
        size = size * avail / l.getBoundingClientRect().width;
      }
      l.style.fontSize = size.toFixed(2) + 'px';
    });
  };
  fit();
  document.fonts?.ready.then(fit);
  addEventListener('resize', fit);
})();
`;

export const DEMO_SCRIPT = `
const form = document.getElementById('ask');
const input = document.getElementById('address');
const out = document.getElementById('out');
const req = document.getElementById('req');
const reqPath = document.getElementById('req-path');
const reqMeta = document.getElementById('req-meta');
const reqCopy = document.getElementById('req-copy');

function pathFor(value) {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('/')) return v;
  // A link goes straight after the address, like an at:// URI, and resolves to whatever it shows.
  if (/^https?:\\/\\//i.test(v)) return '/' + v + (v.includes('?') ? '' : '?expand');
  if (/^(resolve|plc|discover|lexicon|backlinks|get)\\b/.test(v)) return '/' + v;
  return '/' + (v.startsWith('at://') ? v : 'at://' + v);
}

function highlight(json) {
  const escd = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escd.replace(/("(?:\\\\.|[^"\\\\])*")(\\s*:)?|\\b(-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?|true|false|null)\\b|([{}\\[\\],])/gi, (m, str, colon, lit, punct) => {
    if (str) return colon ? '<span class="k">' + str + '</span><span class="p">:</span>' : '<span class="s">' + str + '</span>';
    if (lit) return '<span class="n">' + lit + '</span>';
    return '<span class="p">' + punct + '</span>';
  });
}

async function run(value) {
  const path = pathFor(value);
  if (!path) { input.focus(); return; }
  const url = new URL(path, location.origin);
  if (url.pathname === '/get' && /^\\/get\\?uri=https?:/.test(path)) { url.search = ''; url.searchParams.set('uri', path.slice('/get?uri='.length).replace(/&expand$/, '')); url.searchParams.set('expand', ''); }
  const shown = location.origin + path;
  req.hidden = false;
  setText(reqPath, shown);
  reqCopy.dataset.copy = 'curl "' + shown + '"';
  setText(reqMeta, 'Loading');
  out.innerHTML = '';
  const started = performance.now();
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let body;
    try { body = JSON.stringify(JSON.parse(text), null, 2); } catch { body = text; }
    const kb = (new Blob([text]).size / 1024).toFixed(1);
    setText(reqMeta, res.status + ', ' + kb + ' KB, ' + Math.round(performance.now() - started) + ' ms');
    out.innerHTML = highlight(body);
    out.classList.toggle('err', !res.ok);
  } catch (err) {
    setText(reqMeta, 'Failed');
    out.textContent = 'The request did not complete. Check the connection and try again.';
    out.classList.add('err');
  }
}

form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-try]');
  if (!b) return;
  input.value = b.dataset.try;
  document.getElementById('try').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  run(b.dataset.try);
});
`;

// The line: built from anchors in the page, and on every scroll the highlight moves to where the reader is.
export const LINE_SCRIPT = `
(() => {
  const page = document.querySelector('.page');
  const svg = page.querySelector('.wire');
  const cut = page.querySelector('.wire-cut');
  const cutHead = cut.querySelector('.wire-cut__head i');
  // How far past the head the tail is drawn. The grey band trims it exactly at the head, so a tail a script frame behind
  // the scroll never stops short of it.
  const LEAD = 16;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAIL_LENGTH = 180, TAIL_SEGMENTS = 14;
  let path, done, trail, tails = [], total = 0, fans = [], hostEls = [], nodes = [], ring = [], ringLen = 0, coreBox = null, bases = [], fanFrom = null, floating = false, hostLeft = 0;
  // Scroll state, measured when the line is built so a scroll frame reads no layout: the path sampled every STEP px of
  // its length, the page's top in document coordinates, the head's offset in the grey band's box, and the rail dots.
  const STEP = 2;
  let xs = new Float32Array(0), ys = new Float32Array(0), pageTop = 0, cutX = 0, maxScroll = 1, nodeEls = [], frame = 0;
  // How far each pixel row of a corner is set in, for a quarter circle R pixels across, top row first. R 5 gives
  // 3, 1, 1: long steps that shorten as the corner turns, so it reads as a curve and not a 45 degree diagonal.
  const cornerInsets = (R) => {
    const out = [];
    for (let row = 0; row < R; row++) {
      const k = Math.round(R - Math.sqrt(R * R - (R - row - 0.5) ** 2));
      if (k === 0) break;
      out.push(k);
    }
    return out;
  };
  // Half of a box with pixel-circle corners, from the top center to the bottom center on the side of edge x.
  // Offsetting a staircase like this outward moves every vertex by the same amount, so the ring around the hub is
  // the same function on a box grown by the gap.
  const halfSteps = (cx, x, t, b, p, ins) => {
    const k = Math.sign(x - cx);
    const X = (n) => x - k * n * p;
    const corner = []; // [inset, row] vertices of the top corner, outside in
    let cur = ins[0] || 0;
    corner.push([cur, 0]);
    for (let i = 1; i <= ins.length; i++) {
      const next = ins[i] || 0;
      if (next !== cur) { corner.push([cur, i], [next, i]); cur = next; }
    }
    const top = corner.map(([n, row]) => [X(n), t + row * p]);
    const bottom = corner.slice().reverse().map(([n, row]) => [X(n), b - row * p]);
    return [[cx, t], ...top, ...bottom, [cx, b]];
  };
  // A path through points with every corner rounded by r, like the curved pixels in Beast.
  const stepped = (pts, r) => {
    let d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i - 1], [vx, vy] = pts[i], [cx2, cy2] = pts[i + 1];
      const l1 = Math.hypot(vx - ax, vy - ay) || 1, l2 = Math.hypot(cx2 - vx, cy2 - vy) || 1;
      const r1 = Math.min(r, l1 / 2), r2 = Math.min(r, l2 / 2);
      d += ' L' + (vx - (vx - ax) / l1 * r1) + ',' + (vy - (vy - ay) / l1 * r1) + ' Q' + vx + ',' + vy + ' ' + (vx + (cx2 - vx) / l2 * r2) + ',' + (vy + (cy2 - vy) / l2 * r2);
    }
    const z = pts[pts.length - 1];
    return d + ' L' + z[0] + ',' + z[1];
  };
  const rel = (el) => { const r = el.getBoundingClientRect(), p = page.getBoundingClientRect(); return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height }; };

  function build() {
    const start = rel(document.getElementById('try'));
    // The rail sits in the page margin, 40px left of the content. Without a margin it moves inside and the content is inset
    // on both sides. Up to 720px it rides the screen edge, 10px in, so the sections keep most of the width.
    const inset = page.getBoundingClientRect().left < 48;
    document.body.classList.toggle('inset', inset);
    const edge = matchMedia('(max-width: 720px)').matches;
    const rail = inset ? (edge ? 10 - page.getBoundingClientRect().left : 26) : -20;
    const heads = [...page.querySelectorAll('.block > h2')].map(rel);
    const core = rel(page.querySelector('.core'));
    const gap = 5;
    const sx = start.x + start.w / 2, sy = start.y + start.h, firstY = heads[0].y + heads[0].h / 2;
    const cx = core.x + core.w / 2, cy = core.y - gap;
    let d = 'M' + sx + ',' + sy + ' L' + sx + ',' + (sy + 24) + ' C' + sx + ',' + (sy + 110) + ' ' + rail + ',' + (sy + 40) + ' ' + rail + ',' + (firstY - 40);
    // The rail runs past the bottom of the last section before it curves toward the middle, so the curve never
    // passes under a card.
    const blocks = page.querySelectorAll('.block'); const last = rel(blocks[blocks.length - 1]);
    const turn = last.y + last.h + 32, span = cy - turn;
    d += ' L' + rail + ',' + turn + ' C' + rail + ',' + (turn + span * 0.65) + ' ' + cx + ',' + (cy - span * 0.65) + ' ' + cx + ',' + cy;
    const hosts = page.querySelector('.hosts'); hostEls = [...hosts.children];
    const narrow = page.clientWidth < 640;
    let fanD = '';
    bases = [];
    hostEls.forEach((el) => { el.style.translate = ''; el.style.width = ''; });
    hosts.classList.toggle('list', narrow);
    hostEls.forEach((el) => { el.style.left = ''; el.style.top = ''; });
    // Too narrow for the arc: the badges wrap in centered rows, and each line still runs from the hub to the middle of
    // its badge's top edge, passing under the rows above. Each badge keeps the width it started with, so a torph
    // morph never moves its neighbors off their lines.
    if (narrow) {
      hostEls.forEach((el) => { el.style.width = el.offsetWidth + 'px'; });
      hostEls.forEach((el, i) => {
        const b = rel(el);
        el.style.transformOrigin = '50% 0';
        el.classList.add('tilt-' + (i % 3));
        el.style.animationDelay = '-' + ((i * 1.3 + 0.4) % 11).toFixed(1) + 's';
        bases[i] = { x: b.x + b.w / 2, y: b.y + b.h / 2, h: b.h };
        fanD += '<path class="fan" d=""/>';
      });
    }
    const hb = rel(hosts);
    const w = hb.w, n = hostEls.length, top = core.y + core.h + gap;
    if (!narrow) hostEls.forEach((el, i) => {
      const a = Math.PI * (n === 1 ? 0.5 : i / (n - 1));
      // Each line meets its badge in the middle. A badge near the edge is kept inside the page, and its line follows it.
      // The badge is centered on its line by CSS, so it stays centered while torph changes its width.
      const bw = el.offsetWidth;
      const x = Math.min(hb.x + w - bw / 2, Math.max(hb.x + bw / 2, hb.x + w / 2 - Math.cos(a) * w * 0.44));
      const y = hb.y + 90 + Math.sin(a) * (hb.h - 130);
      el.style.left = (x - hb.x) + 'px'; el.style.top = (y - hb.y) + 'px';
      // Offprint's tilt pivots on the point where the line meets the badge, the middle of its top edge. The badge is
      // centered with translate(-50%, -50%), which the tilt rotates along with it, so in the badge's own coordinates
      // that point is (0, -50%), not (50%, 0). A pivot at 50% 0 swings the top edge several pixels off the line.
      el.style.transformOrigin = '0 -50%';
      el.classList.add('tilt-' + (i % 3));
      el.style.animationDelay = '-' + ((i * 1.3 + 0.4) % 11).toFixed(1) + 's';
      bases[i] = { x, y, h: el.offsetHeight };
      fanD += '<path class="fan" d=""/>';
    });
    fanFrom = { x: cx, y: top };
    hostLeft = hb.x;
    coreBox = core;
    // The ring follows the hub's own shape: a pill, a rounded tile, or (with data-step) Beast-style stepped corners.
    const coreEl = page.querySelector('.core');
    const step = parseFloat(coreEl.dataset.step || '0');
    const ins = cornerInsets(parseFloat(coreEl.dataset.corner || '5'));
    const x0 = core.x - gap, x1 = core.x + core.w + gap, t = core.y - gap, b = core.y + core.h + gap;
    let left, right;
    if (step) {
      right = stepped(halfSteps(cx, x1, t, b, step, ins), step / 2);
      left = stepped(halfSteps(cx, x0, t, b, step, ins), step / 2);
      const bg = coreEl.querySelector('.core__bg path');
      if (bg) {
        const w = core.w, h = core.h, m = w / 2;
        const half = halfSteps(m, w, 0, h, step, ins);
        bg.setAttribute('d', stepped([...half, ...halfSteps(m, 0, 0, h, step, ins).reverse().slice(1)], step / 2) + 'Z');
      }
    } else {
      const corner = parseFloat(getComputedStyle(coreEl).borderTopLeftRadius) || 0;
      const r = Math.min(corner, core.h / 2) + gap;
      left = 'M' + cx + ',' + t + ' L' + (x0 + r) + ',' + t + ' A' + r + ',' + r + ' 0 0 0 ' + x0 + ',' + (t + r) + ' L' + x0 + ',' + (b - r) + ' A' + r + ',' + r + ' 0 0 0 ' + (x0 + r) + ',' + b + ' L' + cx + ',' + b;
      right = 'M' + cx + ',' + t + ' L' + (x1 - r) + ',' + t + ' A' + r + ',' + r + ' 0 0 1 ' + x1 + ',' + (t + r) + ' L' + x1 + ',' + (b - r) + ' A' + r + ',' + r + ' 0 0 1 ' + (x1 - r) + ',' + b + ' L' + cx + ',' + b;
    }
    nodes = heads.map((h) => h.y + h.h / 2);
    svg.innerHTML = '<path class="base" d="' + d + '"/><path class="done" d="' + d + '"/><g class="trail">' + Array.from({ length: TAIL_SEGMENTS }, () => '<path d="' + d + '"/>').join('') + '</g>' +
      '<path class="ring-base" d="' + left + '"/><path class="ring-base" d="' + right + '"/><path class="ring" d="' + left + '"/><path class="ring" d="' + right + '"/>' +
      fanD + nodes.map((y) => '<rect class="node" x="' + (rail - 5) + '" y="' + (y - 5) + '" width="10" height="10" rx="1.5"/>').join('');
    path = svg.querySelector('.base'); done = svg.querySelector('.done'); trail = svg.querySelector('.trail'); tails = [...trail.querySelectorAll('path')];
    ring = [...svg.querySelectorAll('.ring')]; ringLen = ring[0].getTotalLength();
    fans = [...svg.querySelectorAll('.fan')]; total = path.getTotalLength();
    xs = new Float32Array(Math.ceil(total / STEP) + 1); ys = new Float32Array(xs.length);
    for (let i = 0; i < xs.length; i++) { const q = path.getPointAtLength(Math.min(total, i * STEP)); xs[i] = q.x; ys[i] = q.y; }
    const box = page.getBoundingClientRect();
    pageTop = box.top + scrollY;
    // The grey band's box spans the line from its start to its end, wide enough for the rail, and only reaches outside
    // the page where the page has a margin to reach into.
    const cutLeft = Math.min(0, rail - 24);
    cut.style.left = cutLeft + 'px';
    cut.style.width = (page.clientWidth - cutLeft) + 'px';
    cut.style.top = sy + 'px';
    cut.style.height = (cy - sy) + 'px';
    cut.style.display = still ? 'none' : '';
    cutX = -cutLeft;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    nodeEls = [...svg.querySelectorAll('.node')];
    float(performance.now());
    if (!floating && !still && bases.length) { floating = true; requestAnimationFrame(loop); }
    tick();
  }

  // Offprint's float: each badge drifts on a small circle (4 to 5px), four speeds and directions, each out of step.
  // Its line is redrawn from the same position every frame, so the line stays attached while the badge moves.
  const FLOATS = [{ r: 4, s: 7 }, { r: 5, s: -9 }, { r: 4.2, s: 8 }, { r: 5, s: -10 }];
  function float(now) {
    if (!fanFrom) return;
    bases.forEach((b, i) => {
      const f = FLOATS[i % 4], th = still ? 0 : ((now / 1000 + (i * 1.1) % 7) / f.s) * Math.PI * 2;
      const dx = still ? 0 : Math.cos(th) * f.r, dy = still ? 0 : Math.sin(th) * f.r;
      hostEls[i].style.translate = dx + 'px ' + dy + 'px';
      // The line ends 2px inside the badge's top edge, so it always reads as attached.
      const x = b.x + dx, y = b.y + dy - b.h / 2 + 2, t = fanFrom.y;
      fans[i].setAttribute('d', 'M' + fanFrom.x + ',' + t + ' C' + fanFrom.x + ',' + (t + 40) + ' ' + x + ',' + (t + 10) + ' ' + x + ',' + y);
    });
  }
  function loop(now) {
    if (!bases.length) { floating = false; return; }
    float(now);
    requestAnimationFrame(loop);
  }

  // The length along the path whose point sits at a page y, from the samples. The path only goes down, so a binary
  // search works, and the step between two samples is interpolated.
  function lengthAt(y) {
    let lo = 0, hi = ys.length - 1;
    if (y <= ys[0]) return 0;
    if (y >= ys[hi]) return total;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ys[mid] < y) lo = mid; else hi = mid; }
    const span = ys[hi] - ys[lo];
    return Math.min(total, (lo + (span > 0 ? (y - ys[lo]) / span : 0)) * STEP);
  }
  function pointAt(len) {
    const f = Math.max(0, len) / STEP, i = Math.min(xs.length - 1, Math.floor(f)), j = Math.min(xs.length - 1, i + 1), t = f - i;
    return { x: xs[i] + (xs[j] - xs[i]) * t, y: ys[i] + (ys[j] - ys[i]) * t };
  }

  // The reading point sits just above the middle of the screen and slides to the bottom edge over the last stretch,
  // so the line always finishes even though the footer cannot scroll up to the middle.
  function eyeTarget() {
    const near = Math.min(1, Math.max(0, (scrollY - (maxScroll - innerHeight * 0.6)) / (innerHeight * 0.6)));
    return scrollY - pageTop + innerHeight * (0.55 + 0.45 * near);
  }

  // One update per frame, however many scroll events arrive in it.
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; tick(); }); }

  function tick() {
    if (!path) return;
    const eye = eyeTarget();
    // The edge sits 55% down the screen and slides to the bottom over the last stretch. It is set only while it moves.
    const cutTop = eye - (scrollY - pageTop);
    const want = Math.round(cutTop) + 'px';
    if (cut.style.getPropertyValue('--cut') !== want) cut.style.setProperty('--cut', want);
    const at = still ? total : lengthAt(eye);
    // The ink line is drawn whole, and the grey band turns it grey below the head.
    done.style.strokeDasharray = still ? '' : 'none';
    const onLine = at < total - 2;
    // Nothing lights at the top of the page: the trail fades in over the first 120px of scrolling.
    const glow = onLine && !still ? Math.min(1, scrollY / 120) : 0;
    trail.style.opacity = glow;
    cutHead.style.opacity = glow;
    // The tail: short segments behind the head, each fainter and thinner than the one before it.
    const seg = TAIL_LENGTH / TAIL_SEGMENTS;
    tails.forEach((t, k) => {
      const end = at + LEAD - k * seg, start = Math.max(0, end - seg);
      t.style.strokeDasharray = Math.max(0, end - start) + ' ' + (total + TAIL_LENGTH);
      t.style.strokeDashoffset = -start;
      t.style.opacity = end > 0 ? Math.pow(1 - k / TAIL_SEGMENTS, 1.8) : 0;
      t.style.strokeWidth = 3 - (k / TAIL_SEGMENTS) * 1.5;
    });
    // The head's height comes from the sticky edge. Only its x follows the path, which moves on the curves.
    cutHead.style.setProperty('--hx', (pointAt(at).x + cutX) + 'px');
    // Past the line's end the glow splits around the pill, both sides together.
    const around = still ? 1 : onLine ? 0 : Math.min(1, Math.max(0, (eye - coreBox.y) / (coreBox.h + 140)));
    // A round cap still paints a dot at zero length, so the ring stays hidden until it has started.
    ring.forEach((p) => { p.style.strokeDasharray = around * ringLen + ' ' + ringLen; p.style.opacity = around > 0 ? 1 : 0; });
    nodeEls.forEach((c, i) => c.classList.toggle('lit', nodes[i] <= eye));
    const arrived = around >= 1;
    fans.forEach((f, i) => { f.classList.toggle('lit', arrived); f.style.transitionDelay = arrived ? (i * 60) + 'ms' : '0ms'; });
    hostEls.forEach((h, i) => { h.classList.toggle('lit', arrived); h.style.transitionDelay = arrived ? (i * 60 + 200) + 'ms' : '0ms'; });
  }

  // The other slots take turns showing the rest of the pool. torph morphs each name into the next, and the badge stays
  // centered on its line as its width changes, so the lines never move.
  const hostList = page.querySelector('.hosts');
  const pool = JSON.parse(hostList.dataset.pool);
  const fixed = JSON.parse(hostList.dataset.fixed);
  const morphs = new Map();
  // Each slot's current name, kept here because torph adds a hidden copy for screen readers to the badge's text.
  const names = [...hostList.children].map((el) => el.textContent);
  const ruler = document.createElement('canvas').getContext('2d');
  const textWidth = (name, i) => { ruler.font = getComputedStyle(hostEls[i]).font; return ruler.measureText(name).width; };
  let room = null;
  let turn = 0;
  function rotate() {
    if (!bases.length || document.hidden || !window.TextMorph) return;
    if (!room) room = names.map((name, i) => textWidth(name, i) + 0.5);
    const slots = [...hostEls.keys()].filter((i) => !fixed.includes(i));
    const i = slots[turn++ % slots.length];
    if (!morphs.has(i)) { const m = new window.TextMorph({ element: hostEls[i].firstElementChild }); m.update(names[i]); morphs.set(i, m); }
    // A slot only takes a name that fits in the width it started with, so a wide name never lands where a
    // neighbor's line runs under it. Names that do not fit wait in the pool for a wider slot.
    const at = pool.findIndex((name) => textWidth(name, i) <= room[i]);
    if (at < 0) return;
    const next = pool.splice(at, 1)[0];
    pool.push(names[i]);
    names[i] = next;
    morphs.get(i).update(next);
  }
  if (!still) setInterval(rotate, 2200);

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', build);
  // Opening an endpoint, or a response arriving, changes the page height, so the line is rebuilt.
  document.addEventListener('toggle', build, true);
  new ResizeObserver(() => build()).observe(document.getElementById('try'));
  document.fonts.ready.then(build);
  build();
})();`;
