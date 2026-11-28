import { VIZ } from './components';

// Range tabs switch the chart between 7 and 30 days, and hover or the arrow keys pick a day and show its counts.
export const CHART_SCRIPT = `
(() => {
  document.querySelectorAll('.chart-panel .tabs button').forEach((b) => b.addEventListener('click', () => {
    const panel = b.closest('.chart-panel');
    panel.querySelectorAll('.tabs button').forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    panel.querySelectorAll('.range').forEach((r) => { r.hidden = r.dataset.range !== b.dataset.show; });
  }));
  const fmt = new Intl.NumberFormat('en-US');
  const rows = [['HTTP', 'http', '${VIZ.http}'], ['MCP', 'mcp', '${VIZ.mcp}'], ['Not split', 'earlier', '${VIZ.earlier}'], ['Errors', 'errors', '${VIZ.errors}']];
  document.querySelectorAll('.plot').forEach((plot) => {
    const tip = plot.querySelector('.tip');
    const cols = [...plot.querySelectorAll('.col')];
    let at = null;
    function show(i) {
      cols.forEach((c, j) => c.classList.toggle('on', j === i));
      at = i;
      if (i === null) { tip.hidden = true; return; }
      const d = cols[i].dataset;
      tip.innerHTML = '<p class="when">' + d.day + '</p>' + rows
        .filter(([, key]) => key !== 'earlier' || d.earlier !== '0')
        .map(([label, key, color]) => '<p><i style="background:' + color + '"></i><span class="muted">' + label + '</span><b>' + fmt.format(+d[key]) + '</b></p>').join('');
      tip.hidden = false;
      const left = ((i + 0.5) / cols.length) * 100;
      tip.style.left = left + '%';
      tip.style.transform = left > 60 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)';
    }
    const indexAt = (x) => { const r = plot.getBoundingClientRect(); return Math.min(cols.length - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * cols.length))); };
    plot.addEventListener('pointermove', (e) => show(indexAt(e.clientX)));
    plot.addEventListener('pointerleave', () => show(null));
    plot.addEventListener('blur', () => show(null));
    plot.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const i = at === null ? cols.length - 1 : at + (e.key === 'ArrowLeft' ? -1 : 1);
      show(Math.min(cols.length - 1, Math.max(0, i)));
    });
  });
})();`;


// Sets html.motion before the page paints, so marks start hidden only when they will animate.
export const MOTION_HEAD = `if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');`;

// Plays each panel's entrance as it comes into view: numbers the marks for the stagger, counts the figures up from
// zero in their own format (commas and decimals kept), and marks the panel so the CSS animations run.
export const MOTION_SCRIPT = `
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const number = (groups) => groups.forEach((g) => [...g].forEach((el, i) => el.style.setProperty('--i', i)));
  number([...document.querySelectorAll('.strip')].map((s) => s.children));
  number([...document.querySelectorAll('.cols')].map((c) => c.children));
  number([...document.querySelectorAll('.hist')].map((h) => h.querySelectorAll('.hist__col span')));
  number([...document.querySelectorAll('.meters')].map((m) => m.children));
  number([...document.querySelectorAll('.meters')].map((m) => m.querySelectorAll('.ticks')));
  number([...document.querySelectorAll('.map')].map((m) => m.querySelectorAll('.map__layer')));

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  function count(el) {
    const nodes = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) if (/\\d/.test(walk.currentNode.nodeValue)) nodes.push(walk.currentNode);
    nodes.forEach((node) => {
      const text = node.nodeValue;
      const m = text.match(/\\d[\\d,]*(\\.\\d+)?/);
      if (!m) return;
      const target = parseFloat(m[0].replace(/,/g, ''));
      const decimals = m[1] ? m[1].length - 1 : 0;
      const commas = m[0].includes(',');
      const fmt = (v) => { const s = v.toFixed(decimals); return commas ? Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : s; };
      const start = performance.now(), dur = 700;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        node.nodeValue = text.slice(0, m.index) + fmt(target * ease(t)) + text.slice(m.index + m[0].length);
        if (t < 1) requestAnimationFrame(step);
      };
      node.nodeValue = text.slice(0, m.index) + fmt(0) + text.slice(m.index + m[0].length);
      requestAnimationFrame(step);
    });
  }

  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    e.target.querySelectorAll('.hero-num, .tile__num').forEach(count);
    e.target.classList.add('in');
  }), { threshold: 0.15 });
  document.querySelectorAll('main .tray').forEach((t) => io.observe(t));
})();`;
