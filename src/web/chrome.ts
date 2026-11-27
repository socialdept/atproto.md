import { version } from '../../package.json';
import { C, CURVE, frameSrc, ICON_CHECK, ICON_COPY, NOTCH, px } from './kit';

export const TITLE = 'ATMD | Every Atmosphere record, one address for agents';
export const DESCRIPTION =
	'Any record on any PDS as raw JSON, through an MCP server or a URL. Paste an at:// URI, a handle or a link after atproto.md/. No auth, no API key.';

export const REPO = 'https://github.com/socialdept/atproto.md';
export const DOCS = 'https://socialde.pt/docs/atproto.md';

// --- Shared chrome ---------------------------------------------------------------------------------------------

export const STYLES = `
@font-face { font-family: Inter; src: url('/fonts/InterVariable.woff2') format('woff2'); font-weight: 100 900; font-display: swap; }
/* JetBrains Mono (OFL) for small accents: chips, GET badges, parameter tags and headings. */
@font-face { font-family: 'JetBrains Mono'; src: url('/fonts/JetBrainsMono-Medium.woff2') format('woff2'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'JetBrains Mono'; src: url('/fonts/JetBrainsMono-SemiBold.woff2') format('woff2'); font-weight: 600; font-display: swap; }
/* Beast by Fonderie.download (WTFPL), for the ATMD mark and the home page headlines. */
@font-face { font-family: Beast; src: url('/fonts/Beast-Regular.woff2') format('woff2'); font-display: swap; }
:root {
  --bg: ${C.bg}; --ink: ${C.ink}; --muted: ${C.muted}; --faint: ${C.faint};
  --line: ${C.line}; --tray: ${C.tray}; --card: ${C.card};
  --sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --beast: Beast, var(--sans);
  --accent: 'JetBrains Mono', var(--mono);
  --mono: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
  --shadow: 0 1px 1px rgba(0,0,0,.03), 0 3px 3px rgba(0,0,0,.03);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 var(--sans); font-feature-settings: 'cv11', 'ss01'; -webkit-font-smoothing: antialiased; }
a { color: inherit; }
code, pre, .mono { font-family: var(--mono); }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 6px; }
.icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: none; }

.wrap { max-width: 1040px; margin: 0 auto; padding: 0 20px; }
/* Header (variant B of the header exploration): the wordmark in the middle is where the page's line starts. */
.top { position: sticky; top: 0; z-index: 10; transition: background .2s, border-color .2s; border-bottom: 1px solid transparent; }
.top.scrolled { background: rgba(252,252,253,.86); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); border-bottom-color: var(--line); }
.bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; max-width: 1040px; margin: 0 auto; padding: 18px 20px; transition: padding .2s; }
.top.scrolled .bar { padding-top: 10px; padding-bottom: 10px; }
.bar nav { display: flex; align-items: center; gap: 4px; }
.bar nav.start { margin-left: -10px; }
.bar nav.end { justify-self: end; }
.bar a.link { color: var(--muted); text-decoration: none; font-size: 14px; padding: 6px 10px; border-radius: 999px; }
.bar a.link:hover, .bar a.link[aria-current] { color: var(--ink); background: var(--tray); }
.bar__mark { position: relative; justify-self: center; font-family: var(--beast); font-weight: 400; font-size: 18px; letter-spacing: -0.03em; font-kerning: normal; text-decoration: none; padding: 7px calc(18px + 0.03em) 7px 18px; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--bg); transition: border-color .2s; }
/* The stepped outline is drawn on a layer behind the wordmark, so it can fade and shrink away when the header turns
   frosted on scroll (a border image cannot be transitioned). */
.bar__mark { isolation: isolate; border-color: transparent; background: none; }
/* The letters are spaced by their serifs: where each pair comes closest (A's foot and T's foot, T's bar and M's top
   serif, M's and D's serifs), every pair sits 0.11em apart. Beast sets those at 0.14em, except A and T, whose feet sit
   0.28em apart until its A-T kerning pair pulls them in by 0.14em. So the word stays one run of text (browsers kern
   only within a run, and a span around TM once broke the pair), kerning stays on, and one letter-spacing of -0.03em
   tightens every pair alike. The last letter's spacing tightens the right edge, so the right padding gives that 0.03em
   back and the word stays centered in the pill. */
.bar__mark::before { content: ''; position: absolute; inset: -1.5px; z-index: -1; ${px(C.ink, C.bg, CURVE, 1.5, 1.5)} transition: opacity .25s ease, transform .25s ease; }
.top.scrolled .bar__mark::before { opacity: 0; transform: scale(.92); }
.bar .btn--ghost { height: 32px; padding: 0 12px; font-weight: 500; font-size: 13px; margin-left: 4px; }
/* One line from the bottom of the header pill into the hero, fading out. It starts 20px up, under the header,
   so there is no seam where the header ends. */
.line-start { display: block; width: 1.5px; height: 60px; margin: -20px auto 18px; background: linear-gradient(var(--ink), var(--bg)); }
@media (max-width: 720px) {
  .bar { grid-template-columns: 1fr auto; padding: 14px 16px; }
  .bar nav.start, .bar nav.end a.link { display: none; }
  .bar__mark { justify-self: start; }
  .line-start { display: none; }
}

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--ink); color: #fff; font: 600 14px/1 var(--sans); text-decoration: none; cursor: pointer; white-space: nowrap; }
.btn { ${px(C.ink, C.ink, CURVE)} }
.btn--ghost { ${px(C.line, C.card, NOTCH)} color: var(--ink); }
/* Hovers swap the frame's fill, so no rounded background ever shows behind the stepped corners. */
.btn:hover { border-image-source: ${frameSrc(px('#243042', '#243042', CURVE))}; }
.btn--ghost:hover { border-image-source: ${frameSrc(px(C.line, C.tray, NOTCH))}; }
.btn:disabled { cursor: not-allowed; border-image-source: ${frameSrc(px(C.faint, C.faint, CURVE))}; }

h1 { font-size: clamp(40px, 6.4vw, 68px); line-height: 1.04; font-weight: 600; letter-spacing: -0.035em; margin: 0; text-wrap: balance; }
h2 { font-size: 26px; line-height: 1.2; font-weight: 600; letter-spacing: -0.025em; margin: 0 0 6px; }
h3 { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.lede { color: var(--muted); font-size: 18px; line-height: 1.6; margin: 20px auto 0; max-width: 34em; text-wrap: pretty; }
.sub { color: var(--muted); margin: 0 0 20px; max-width: 40em; }
.sub code { font-size: .875em; color: var(--ink); }

.tray { background: var(--tray); border: 1px solid var(--line); border-radius: 16px; padding: 6px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 11px; box-shadow: var(--shadow); }
.tray__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 8px 17px 12px; }
.tray__head p { margin: 0; color: var(--muted); font-size: 14px; }

section.block { padding: 72px 0 0; }
footer.foot { padding-top: 72px; padding-bottom: 8px; text-align: left; }
.foot__cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; padding: 32px 0; border-top: 1px solid var(--line); }
.foot__cols h3 { font: 500 12.5px var(--accent); letter-spacing: 0; margin: 0 0 12px; }
.foot__cols a { display: block; width: fit-content; color: var(--muted); text-decoration: none; font-size: 14px; margin: 0 0 8px; transition: color .15s; }
.foot__cols a:hover { color: var(--ink); }
.foot__row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; padding: 18px 0; border-top: 1px solid var(--line); color: var(--faint); font-size: 13px; }
.foot__row a { color: var(--muted); text-decoration: none; }
.landing-foot + .foot { padding-top: 0; } .foot__row a:hover { color: var(--ink); }
@media (max-width: 640px) { .foot__cols { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 28px; } }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

export function head(origin: string, title: string, extra = ''): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="${origin}/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${origin}/fonts/InterVariable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${origin}/fonts/Beast-Regular.woff2" as="font" type="font/woff2" crossorigin>
<script type="module">import { TextMorph } from '${origin}/vendor/torph-0.1.3.mjs'; window.TextMorph = TextMorph;</script>
<meta name="theme-color" content="${C.bg}">
${extra}
<style>${STYLES}`;
}

export function topBar(origin: string, current: 'home' | 'stats'): string {
	// On the home page the line runs from the wordmark into the hero, so the header carries its first piece.
	return `<header class="top" id="top"><div class="bar">
  <nav class="start" aria-label="Site">
    <a class="link" href="${DOCS}">Docs</a>
    <a class="link" href="${origin}/stats"${current === 'stats' ? ' aria-current="page"' : ''}>Stats</a>
  </nav>
  <a class="bar__mark" href="${origin}/" aria-label="atproto.md">ATMD</a>
  <nav class="end" aria-label="More">
    <a class="link" href="${REPO}">GitHub</a>
    <button class="btn btn--ghost" type="button" data-copy="claude mcp add --transport http atproto-md ${origin}/mcp" aria-label="Copy the command that adds the MCP server to Claude Code">${ICON_COPY}<span>Add to Claude</span></button>
  </nav>
</div></header>`;
}

export function footer(origin: string, wrapped = true): string {
	const cols: [string, [string, string][]][] = [
		[
			'ATMD',
			[
				['Docs', DOCS],
				['Routes', `${origin}/#routes`],
				['Public stats', `${origin}/stats`],
			],
		],
		[
			'For agents',
			[
				['MCP server', `${origin}/#agents`],
				['skill.md', `${origin}/skill.md`],
				['llms.txt', `${origin}/llms.txt`],
			],
		],
		[
			'Source',
			[
				['GitHub', REPO],
				['Tangled', 'https://tangled.org/socialde.pt/atproto.md'],
				['MIT license', `${REPO}/blob/main/LICENSE`],
			],
		],
		[
			'Social Dept.',
			[
				['socialde.pt', 'https://socialde.pt'],
				['Bluesky', 'https://bsky.app/profile/socialde.pt'],
			],
		],
	];
	return `<footer class="foot${wrapped ? ' wrap' : ''}">
  <nav class="foot__cols" aria-label="Footer">${cols.map(([title, links]) => `<div><h3>${title}</h3>${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div>`).join('')}</nav>
  <div class="foot__row"><span>ATMD v${version}. Public data only, no sign-in. Backlinks from <a href="https://constellation.microcosm.blue">Constellation</a>.</span><span>MIT licensed. Maintained by <a href="https://socialde.pt">Social Dept.</a></span></div>
</footer>`;
}

// Text that changes with state morphs with torph (loaded in the page head as window.TextMorph). Each element keeps one
// TextMorph, and its current text in data-text, since torph adds a screen reader copy that doubles textContent.
// Before torph loads, or with reduced motion, the text is swapped plainly.
export const TEXT_SCRIPT = `
window.setText = (el, text) => {
  if (!el) return;
  const current = el.dataset.text ?? el.textContent;
  if (current === text) return;
  el.dataset.text = text;
  if (!window.TextMorph || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = text; return; }
  if (el._morph) { el._morph.update(text); return; }
  // torph only animates from text it has rendered itself, so the first change hands it the current text, then
  // morphs to the new text on the next frame.
  el._morph = new window.TextMorph({ element: el });
  el._morph.update(current);
  requestAnimationFrame(() => requestAnimationFrame(() => el._morph.update(el.dataset.text)));
};
`;

// Parameter tables: marks each panel with data-more-left and data-more-right while there is more to scroll that way, so
// the fades in .ptable show it. A side fades only while more than 16px is left to scroll that way, so a few pixels of
// overflow never draw a fade over the text.
export const TABLE_SCRIPT = `
document.querySelectorAll('.ptable__scroll').forEach((scroller) => {
  const panel = scroller.parentElement;
  const mark = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    // A fade shows only while more than 16px is left to scroll on that side.
    panel.toggleAttribute('data-more-left', scroller.scrollLeft > 16);
    panel.toggleAttribute('data-more-right', max - scroller.scrollLeft > 16);
  };
  scroller.addEventListener('scroll', mark, { passive: true });
  // The table is watched too: its width changes when the fonts load, which the scroller's own size does not show.
  const ro = new ResizeObserver(mark);
  ro.observe(scroller);
  ro.observe(scroller.firstElementChild);
  mark();
});
`;

// Copy buttons: any [data-copy] copies its text and shows a check for a moment, the label morphing to "Copied".
export const COPY_SCRIPT = `${TEXT_SCRIPT}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
  const label = b.querySelector('span');
  const icon = b.querySelector('svg');
  // The original label and icon are kept once, so a second click during "Copied" still restores them.
  if (label && !b.dataset.label) b.dataset.label = label.dataset.text || label.textContent;
  if (icon && !b._icon) b._icon = icon.outerHTML;
  const before = [b.dataset.label, b._icon];
  clearTimeout(b._reset);
  setText(label, 'Copied');
  if (icon) icon.outerHTML = ${JSON.stringify(ICON_CHECK)};
  b._reset = setTimeout(() => {
    setText(label, before[0]);
    const now = b.querySelector('svg');
    if (now && before[1]) now.outerHTML = before[1];
  }, 1600);
});
(() => {
  const top = document.getElementById('top');
  const set = () => top.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', set, { passive: true });
  set();
})();`;
