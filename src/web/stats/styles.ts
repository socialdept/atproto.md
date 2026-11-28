import { C, CURVE, CURVE_LARGE, NOTCH, px } from '../kit';
import { VIZ } from './components';

export const STATS_STYLES = `
/* The stats page uses the same stepped pixel trays and cards as the home page. */
.tray { ${px(C.line, C.tray, CURVE_LARGE)} }
.card { ${px(C.line, C.card, CURVE)} box-shadow: none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.03)) drop-shadow(0 3px 3px rgba(0,0,0,.03)); }
.tray__head h3 { font: 500 14px var(--accent); }
.hero { padding: 64px 0 36px; }
.hero h1 { font-family: var(--beast); font-weight: 400; letter-spacing: -0.04em; font-size: clamp(40px, 6vw, 64px); }
.hero .lede { margin: 16px 0 0; max-width: 40em; }

/* Small labels and figures, shared by every component. */
.k { margin: 0; font: 500 12.5px var(--accent); color: var(--muted); }
.k-sub { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
.hero-num { margin: 6px 0 0; font-size: 56px; font-weight: 600; line-height: 1; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.hero-num--md { font-size: 32px; margin: 0; }
.tile__num { margin: 8px 0 0; font-size: 26px; font-weight: 600; line-height: 1.1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.empty-state { margin: 0; padding: 28px 16px; text-align: center; color: var(--muted); font-size: 14px; }

/* Overview: the hero figure beside a grid of six tiles. */
.overview { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 16px; }
.hero-tile .card { padding: 20px; height: 100%; display: flex; flex-direction: column; gap: 20px; }
.hero-tile__top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.strip { display: flex; align-items: flex-end; gap: 3px; height: 56px; flex: 1; max-width: 220px; }
/* One bar per day for 30 days. A quiet day is a short faint tick, so the strip always reads as 30 days. */
.strip i { flex: 1; min-width: 3px; min-height: 4px; background: var(--ink); border-radius: 1px; }
.strip i.z { background: var(--line); }
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); height: 100%; }
.tile { padding: 18px 20px; }
.tile:not(:nth-child(3n+1)) { border-left: 1px solid var(--line); }
.tile:nth-child(n+4) { border-top: 1px solid var(--line); }

/* Segmented bar and its legend. */
.split { display: flex; gap: 2px; height: 10px; }
.split--tall { height: 40px; }
.split__seg { display: flex; align-items: center; padding: 0 8px; min-width: 3px; border-radius: 2px; }
.split__seg b { font: 600 12.5px var(--accent); color: #fff; }
.legend { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.legend li, .codes li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 44px; align-items: center; gap: 10px; font-size: 14px; }
.legend i, .codes i { width: 10px; height: 10px; border-radius: 2px; }
.legend b, .codes b { font-weight: 500; font-variant-numeric: tabular-nums; }
.legend em, .codes em { font-style: normal; color: var(--muted); text-align: right; font: 500 12.5px var(--accent); }
.legend--inline { display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 0; }
.legend--inline li { display: flex; gap: 8px; }
.codes { list-style: none; margin: 16px 0 0; padding: 14px 0 0; border-top: 1px solid var(--line); display: grid; gap: 8px; }
.codes .mono { font: 500 13px var(--accent); }

/* Panels: a tray head with a title and a line, then the card. */
/* Panels side by side share a height, so each card fills its tray and an empty state sits in the middle. */
.panel { display: flex; flex-direction: column; }
.panel > .card { flex: 1; }
.panel > .card:has(> .empty-state:only-child) { display: flex; align-items: center; justify-content: center; }
.panel .card { padding: 18px 20px; }
.panel .card:has(> .meters) { padding: 8px 20px; }
.panel .tray__head { align-items: center; padding-inline: 21px; } /* lines up with the card's 20px padding inside its 1px frame */

/* Segmented meters for ranked lists. */
.meters { list-style: none; margin: 0; padding: 0; }
.meters li { display: grid; grid-template-columns: minmax(0, 1fr) auto 40px 48px; align-items: center; gap: 14px; min-height: 40px; padding: 6px 0; }
.meters li + li { border-top: 1px solid var(--line); }
/* Seven rows, then the rest scrolls. HTTP routes shows every row. */
/* The scroll box reaches the card's top and bottom edges, with the card's 8px inside it, so rows clip at the frame. */
.meters--scroll { max-height: calc(7 * 41px + 16px); overflow-y: auto; margin: -8px 0; padding: 8px 0; }
.m__label { min-width: 0; overflow-wrap: anywhere; font-size: 14px; }
.m__label.mono { font: 500 13px var(--accent); overflow-wrap: normal; }
.m__label a { text-decoration: none; }
.m__label a:hover { text-decoration: underline; text-underline-offset: 3px; }
.m__pct { text-align: right; font: 500 12.5px var(--accent); color: var(--muted); }
.m__num { text-align: right; font-weight: 500; font-variant-numeric: tabular-nums; font-size: 14px; }
.ticks { --tick: 4px; --gap: 2px; position: relative; width: calc(24 * (var(--tick) + var(--gap)) - var(--gap)); height: 14px;
  background: repeating-linear-gradient(90deg, var(--line) 0 var(--tick), transparent var(--tick) calc(var(--tick) + var(--gap))); }
.ticks::before { content: ''; position: absolute; inset: 0 auto 0 0; width: calc(var(--on) * (var(--tick) + var(--gap)) - var(--gap));
  background: repeating-linear-gradient(90deg, var(--ink) 0 var(--tick), transparent var(--tick) calc(var(--tick) + var(--gap))); }
.ticks--error::before { background: repeating-linear-gradient(90deg, ${VIZ.errors} 0 var(--tick), transparent var(--tick) calc(var(--tick) + var(--gap))); }
.ticks--blue::before { background: repeating-linear-gradient(90deg, ${VIZ.http} 0 var(--tick), transparent var(--tick) calc(var(--tick) + var(--gap))); }

/* Stacked meters, for long labels in a half-width panel: the label and count on one line, then the meter across the
   full width with its share beside it, so the label gets the whole row. 48 ticks divide the row's width (a mask cuts
   the gaps), so they stay thin and line up at any width, and the fill moves two ticks per step of the 24-step share. */
.meters--stacked li { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "label num" "bar pct"; row-gap: 8px; padding: 10px 0; }
.meters--stacked .m__label { grid-area: label; }
.meters--stacked .m__num { grid-area: num; }
.meters--stacked .m__pct { grid-area: pct; min-width: 36px; }
.meters--stacked .ticks { grid-area: bar; width: 100%; height: 10px; --fill: ${VIZ.errors};
  /* The fill edge sits 1px before the tick boundary, inside a gap, so rounding never cuts a tick in half. */
  background: linear-gradient(90deg, var(--fill) calc(var(--on) * 100% / 24 - 1px), var(--line) 0);
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 calc(100% / 48 - 2px), transparent calc(100% / 48 - 2px) calc(100% / 48));
  mask: repeating-linear-gradient(90deg, #000 0 calc(100% / 48 - 2px), transparent calc(100% / 48 - 2px) calc(100% / 48)); }
.meters--stacked .ticks::before { display: none; }
.meters--stacked .ticks--blue { --fill: ${VIZ.http}; }
.meters--stacked .ticks--ink { --fill: var(--ink); }
.meters--stacked.meters--scroll { max-height: calc(7 * 64px + 16px); }

/* Requests per day: range tabs, headline figure, stacked bars. */
.tabs { display: flex; gap: 4px; }
.tabs button { border: 0; background: none; padding: 4px 8px; font: 500 12.5px var(--accent); color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; }
.tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--ink); }
.chart { padding: 20px; }
.chart__top { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px 24px; margin-bottom: 20px; }
.plotgrid { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; }
.axis { display: flex; flex-direction: column; justify-content: space-between; font: 500 11.5px var(--accent); color: var(--faint); text-align: right; }
.axis span:first-child { transform: translateY(-50%); }
.axis span:last-child { transform: translateY(50%); }
.plot { position: relative; height: 200px; outline: none; touch-action: none;
  background: linear-gradient(var(--line), var(--line)) 0 0 / 100% 1px no-repeat, linear-gradient(var(--line), var(--line)) 0 50% / 100% 1px no-repeat, linear-gradient(var(--line), var(--line)) 0 100% / 100% 1px no-repeat; }
.plot:focus-visible { box-shadow: 0 0 0 2px rgba(17,24,34,.25); border-radius: 4px; }
.cols { position: absolute; inset: 0; display: flex; align-items: flex-end; }
.col { flex: 1; height: 100%; display: flex; flex-direction: column-reverse; align-items: center; gap: 2px; padding: 0 2px; }
.cols--7 .col { padding: 0 10px; }
.col.on { background: rgba(17,24,34,.05); }
.seg { width: 100%; max-width: 28px; flex: none; border-radius: 1px; }
.seg:last-child { border-radius: 3px 3px 1px 1px; }
.dates { grid-column: 2; display: flex; justify-content: space-between; margin-top: 8px; font: 500 11.5px var(--accent); color: var(--faint); }
.tip { position: absolute; top: 0; z-index: 5; min-width: 168px; white-space: nowrap; padding: 10px 12px; ${px(C.line, C.card, CURVE)} filter: drop-shadow(0 4px 10px rgba(0,0,0,.08)); font-size: 12.5px; pointer-events: none; }
.tip p { display: flex; align-items: center; gap: 8px; margin: 0; }
.tip p + p { margin-top: 4px; }
.tip .when { font: 500 12px var(--accent); color: var(--muted); margin-bottom: 6px; }
.tip i { width: 10px; height: 10px; border-radius: 2px; flex: none; }
.tip b { margin-left: auto; padding-left: 12px; font-weight: 500; font-variant-numeric: tabular-nums; }
.tip .muted { color: var(--muted); }
.chart__note { color: var(--muted); font-size: 13px; margin: 14px 0 0; }

/* Latency histogram. */
.hist__figures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.hist { display: flex; align-items: flex-end; gap: 6px; height: 120px; border-bottom: 1px solid var(--line); }
.hist__col { position: relative; flex: 1; height: 100%; display: flex; align-items: flex-end; }
.hist__col span { width: 100%; background: ${VIZ.http}; border-radius: 3px 3px 1px 1px; }
.hist__col:hover span { background: #1f5fae; }
.hist__col:hover::after { content: attr(data-count); position: absolute; left: 50%; bottom: calc(100% + 4px); transform: translateX(-50%); font: 600 12px var(--accent); }
.hist__labels { display: flex; gap: 6px; margin-top: 6px; }
.hist__labels span { flex: 1; text-align: center; font: 500 11px var(--accent); color: var(--faint); white-space: nowrap; }
.hist__unit { text-align: center; font-size: 12px; }
.tile__num { white-space: nowrap; }
.fig__op { margin-right: .2em; }
.fig__unit { margin-left: .2em; }
.fig__unit--pct { margin-left: .05em; }

/* MCP usage: four figures in a two by two grid. */
.panel .card:has(> .mini-tiles) { padding: 0; }
.mini-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.mini-tiles > div { padding: 18px 20px; }
.mini-tiles > div:nth-child(even) { border-left: 1px solid var(--line); }
.mini-tiles > div:nth-child(n+3) { border-top: 1px solid var(--line); }

/* Parameter chips. */
.chipset { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
/* A chip is one line tall until its name is wider than the card, then it wraps at the breaks the name allows. */
.chipset li { display: inline-flex; align-items: center; gap: 8px; min-height: 30px; max-width: 100%; box-sizing: border-box; padding: 4px 4px 4px 10px; ${px(C.line, C.card, NOTCH)} }
.chipset code { min-width: 0; font: 500 13px var(--accent); }
.chipset b { flex: none; min-width: 22px; padding: 1px 6px; text-align: center; font: 600 12px var(--accent); color: var(--muted); ${px(C.tray, C.tray, [2, [1]])} }

/* Sections. */
.sgroup { margin-top: 64px; }
.sgroup__head { margin-bottom: 18px; }
.sgroup__head h2 { margin: 0; font-family: var(--beast); font-weight: 400; letter-spacing: -0.04em; font-size: 30px; }
.sgroup__head p { margin: 6px 0 0; color: var(--muted); font-size: 15px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grid .wide { grid-column: 1 / -1; }
.grid > *, .overview > * { min-width: 0; }
.chart-panel { margin-top: 16px; }

/* Countries: the pixel world map beside the ranked list. */
.geo { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 28px; align-items: start; padding: 12px 0; }
.map { display: block; width: 100%; height: auto; }
.map__layer path { cursor: default; transition: fill .15s; }
.map__layer path:hover { fill: var(--ink); }
.map__legend { display: flex; align-items: center; gap: 4px; margin-top: 12px; font: 500 12px var(--accent); color: var(--muted); }
.map__legend span:first-child { margin-right: 6px; }
.map__legend span:last-child { margin-left: 6px; }
.map__legend i { width: 18px; height: 10px; border-radius: 2px; }
.note { color: var(--muted); font-size: 14px; margin: 32px 0 0; }

/* Motion. Each panel's marks play once as the panel comes into view, short and in order: bars rise from their
   baseline, meters fill a tick at a time, split bars wipe in from the left, the map shades from the fewest requests
   up, and figures count up (in the script). Each animation ends on the element's own style, so it fills backwards
   only: once it ends it lets go, and the marks drop out of the GPU layers an animation holds. html.motion is set only when reduced motion is off and the script runs,
   so without it every mark shows at once. --i is each mark's place in its row, set by the script. */
@property --on { syntax: '<integer>'; inherits: true; initial-value: 0; }
@property --share { syntax: '<percentage>'; inherits: true; initial-value: 0%; }
html.motion { --ease: cubic-bezier(.22, 1, .36, 1); }
html.motion .tray:not(.in) :is(.strip i, .cols .col, .hist__col span) { transform: scaleY(0); }
html.motion .tray:not(.in) :is(.hero-num, .tile__num) { visibility: hidden; }
html.motion .tray:not(.in) .split { clip-path: inset(0 100% 0 0); }
html.motion .tray:not(.in) .map__layer, html.motion .tray:not(.in) .ticks { opacity: 0; }
html.motion .tray.in .strip i { transform-origin: bottom; animation: rise .45s var(--ease) calc(var(--i, 0) * 10ms) backwards; }
html.motion .tray.in .cols .col { transform-origin: bottom; animation: rise .5s var(--ease) calc(var(--i, 0) * 12ms) backwards; }
html.motion .tray.in .hist__col span { transform-origin: bottom; animation: rise .5s var(--ease) calc(var(--i, 0) * 40ms) backwards; }
html.motion .tray.in .ticks { animation: fill .55s var(--ease) calc(min(var(--i, 0), 8) * 35ms) backwards; }
html.motion .tray.in .meters li { animation: share .55s var(--ease) calc(min(var(--i, 0), 8) * 35ms) backwards; }
html.motion .tray.in .split { animation: wipe .6s var(--ease) backwards; }
html.motion .tray.in .map__layer { animation: shade .4s ease-out calc(var(--i, 0) * 70ms) backwards; }
@keyframes rise { from { transform: scaleY(0); } }
@keyframes fill { from { --on: 0; } }
@keyframes share { from { --share: 0%; } }
@keyframes wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes shade { from { opacity: 0; } }

@media (max-width: 900px) {
  .overview { grid-template-columns: 1fr; }
  .geo { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tile { border-left: 0 !important; border-top: 1px solid var(--line); }
  .tile:nth-child(-n+2) { border-top: 0; }
  .tile:nth-child(even) { border-left: 1px solid var(--line) !important; }
  .grid { grid-template-columns: 1fr; }
  .hero-num { font-size: 44px; }
  /* Phones go back to row bars: each row is filled behind its label, as wide as its count against the largest. */
  .meters li { position: relative; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; min-height: 36px; padding: 7px 10px; border: 0 !important; }
  .meters li + li { margin-top: 2px; }
  .meters li::before { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--share); background: var(--tray); border-radius: 6px; }
  .meters .m__label, .meters .m__num { position: relative; }
  .meters .ticks, .meters .m__pct { display: none; }
  /* Figures: the comparator and unit drop to a small secondary size, so values fit across a phone. */
  .hist__figures .tile__num { font-size: 22px; }
  .fig__op, .fig__unit { font-size: 15px; font-weight: 500; color: var(--muted); letter-spacing: 0; }
  /* Stacked meters are row bars here too: one line, label and count. */
  .meters--stacked li { grid-template-areas: none; row-gap: 0; padding: 7px 10px; }
  .meters--stacked .m__label, .meters--stacked .m__num { grid-area: auto; }
  /* No scrolling inside a card on a phone: every row shows and the page scrolls. */
  .meters--scroll, .meters--stacked.meters--scroll { max-height: none; overflow: visible; margin: 0; padding: 0; }
}
`;
