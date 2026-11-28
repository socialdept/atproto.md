import { C, CURVE, CURVE_LARGE, frameSrc, NOTCH, pixelBox, px } from '../kit';

// The host badge outline as a 24 by 24 nine-slice image: a 1px stroke with one 3px pixel notched from each corner.
function badgeImage(stroke: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${pixelBox(0, 0, 24, 24, 3, [1])}" fill="${stroke}"/><path d="${pixelBox(1, 1, 22, 22, 3, [1])}" fill="#fff"/></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const HOME_STYLES = `
.page { position: relative; }
.wire { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 0; }
/* Where the line turns from ink to grey, and the head that sits there, hold a fixed point on screen. Both are sticky, so
   the browser moves them with the scroll on every frame it draws: Safari runs page scripts at 60Hz while it scrolls at
   120Hz, and anything a script moved would trail the line. The box covers the line from its start to its end and
   clips at both, and its left and width are set by the line script. Below the sticky edge, a band in the line's grey
   blends with lighten over the line's layer: the ink line becomes exactly the grey line and the page background, being
   lighter, stays as it is. Content sits above in its own layer and is untouched. */
.wire-cut { position: absolute; left: 0; top: 0; overflow: clip; pointer-events: none; }
.wire-cut__grey, .wire-cut__head { position: sticky; top: var(--cut, 55vh); height: 0; }
.wire-cut__grey { mix-blend-mode: lighten; }
.wire-cut__grey::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 400vh; background: ${C.line}; }
.wire-cut__head i { position: absolute; top: -4.5px; left: calc(var(--hx, 0px) - 4.5px); width: 9px; height: 9px; border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0 1.8px, #5b9be6 2.2px); filter: drop-shadow(0 0 5px rgba(42,120,214,.75)); transition: opacity .2s; }
.wire .base { fill: none; stroke: var(--line); stroke-width: 1.5; }
.wire .done { fill: none; stroke: var(--ink); stroke-width: 1.5; }
/* The scroll trail: a tail of short segments that fade out behind the head, which lives in .wire-cut. The glow is on
   the group, so it is drawn once for the whole trail. */
.wire .trail { filter: drop-shadow(0 0 5px rgba(42,120,214,.75)); transition: opacity .2s; }
.wire .trail path { fill: none; stroke: #2a78d6; stroke-linecap: round; }
.wire .ring-base { fill: none; stroke: var(--line); stroke-width: 1.5; }
.wire .ring { fill: none; stroke: #2a78d6; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 0 9999; opacity: 0; filter: drop-shadow(0 0 5px rgba(42,120,214,.6)); }
.wire .fan { fill: none; stroke: var(--line); stroke-width: 1.25; transition: stroke .5s, stroke-width .5s; }
.wire .fan.lit { stroke: #2a78d6; stroke-width: 1.75; }
/* Rail dots. When the trail reaches one it flashes like the trail's head (white center, thick blue outline, glow),
   then settles to a white dot with an ink outline, the color of the line behind the trail. */
.wire .node { fill: var(--bg); stroke: var(--line); stroke-width: 1.5; transform-box: fill-box; transform-origin: center; transition: stroke .3s, stroke-width .3s; }
.wire .node.lit { fill: #ffffff; stroke: var(--ink); stroke-width: 2; animation: node-hit .7s cubic-bezier(.2, .8, .2, 1); }
@keyframes node-hit {
  0% { stroke: #2a78d6; stroke-width: 3; transform: scale(1.45); filter: drop-shadow(0 0 6px rgba(42,120,214,.85)); }
  45% { stroke: #2a78d6; stroke-width: 2.5; transform: scale(1.1); filter: drop-shadow(0 0 4px rgba(42,120,214,.5)); }
  100% { stroke: var(--ink); stroke-width: 2; transform: scale(1); filter: drop-shadow(0 0 0 rgba(42,120,214,0)); }
}
.page > section, .page > .landing-foot, .page > .foot { position: relative; z-index: 1; }

.hero { text-align: center; padding: 0 0 40px; }
#try { scroll-margin-top: 88px; }
.demo .card { overflow: hidden; }
.ask { display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--line); }
.ask input { flex: 1; min-width: 0; height: 44px; padding: 0 14px; font: 16px var(--mono); color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 10px; }
.ask input::placeholder { color: var(--faint); }
.ask input:focus { outline: none; border-color: var(--faint); background: var(--card); }
.ask .btn { height: 44px; padding: 0 20px; border-radius: 10px; }
.examples { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
.chip { height: 30px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--muted); font: 500 13px var(--sans); cursor: pointer; }
.chip:hover { color: var(--ink); background: var(--tray); }
.req { display: flex; align-items: center; gap: 8px; padding: 10px 12px 10px 16px; border-bottom: 1px solid var(--line); font-size: 13px; color: var(--muted); }
.req code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
.req .meta { white-space: nowrap; font-variant-numeric: tabular-nums; }
.iconbtn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); color: var(--muted); font: 500 13px var(--sans); cursor: pointer; }
.iconbtn:hover { color: var(--ink); background: var(--tray); }
.iconbtn .icon { width: 14px; height: 14px; }
.out { margin: 0; padding: 16px; max-height: 460px; overflow: auto; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; tab-size: 2; }
.out .k { color: var(--muted); } .out .s { color: var(--ink); } .out .n { color: #2f5fb8; } .out .p { color: var(--faint); }
.empty { display: block; padding: 40px 16px; text-align: center; color: var(--muted); font: 15px/1.5 var(--sans); white-space: normal; }
.err { color: #b42318; }

.block { padding: 120px 0 0; }
.demo + .block { padding-top: 180px; }
.inset .block { padding-left: 40px; padding-right: 40px; }
.block h2 { font-size: 28px; }
.common { margin: 0 0 20px; padding: 14px 23px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); font-size: 14px; }
.common p { margin: 0 0 8px; color: var(--muted); } .common p b { color: var(--ink); font-weight: 600; }
.common dl { margin: 0; display: grid; gap: 6px; } .common dl div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; }
.common dt { font-weight: 500; } .common dd { margin: 0; color: var(--muted); }
.common code, .block code { font-size: .92em; }
.groups { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.eps { overflow: hidden; }
.ep + .ep { border-top: 1px solid var(--line); }
.ep summary { list-style: none; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; grid-template-areas: "verb path chips chev" ". desc desc ."; align-items: center; gap: 2px 10px; padding: 12px 14px 12px 16px; cursor: pointer; }
.ep summary::-webkit-details-marker { display: none; }
.ep summary:hover { background: #fafbfc; }
.verb { grid-area: verb; font: 600 11px var(--mono); color: #13855c; background: #e8f7f0; border-radius: 5px; padding: 2px 6px; }
.path { grid-area: path; font-size: 14px; overflow-wrap: anywhere; }
.desc { grid-area: desc; color: var(--muted); font-size: 14px; }
.chips { grid-area: chips; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.chips i { font: 500 11px var(--mono); font-style: normal; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 1px 7px; }
.chev { grid-area: chev; width: 16px; height: 16px; fill: none; stroke: var(--faint); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .15s; }
.ep[open] .chev { transform: rotate(180deg); }
.ep .body { padding: 4px 16px 16px; }
/* Column widths come from the cells, as in the Social Dept. docs: the table is as wide as its panel, or wider when the
   columns' minimum widths add up to more, so long text wraps at its minimum and the panel scrolls the rest. Headers
   and inline code stay on one line and widen their column instead. */
.ep table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ep th { text-align: left; font-weight: 500; color: var(--muted); padding: 7px 24px 7px 0; border-bottom: 1px solid var(--line); white-space: nowrap; }
.ep td { padding: 8px 24px 8px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.ep td code { white-space: nowrap; }
/* A type stays on one line, except that a list may break after a comma, between its parts. */
.ep td.c-type span { white-space: nowrap; }
/* The description column never narrows past a readable measure: below that the panel scrolls instead. */
.ep td:last-child { min-width: 176px; }
.ep th:first-child, .ep td:first-child { padding-left: 14px; }
/* 24px between columns, as in the Social Dept. docs tables, and the table's 14px edge after the last one. */
.ep th:last-child, .ep td:last-child { padding-right: 14px; }
@media (max-width: 480px) { .ep td:last-child { min-width: 160px; } .ep th, .ep td { padding-right: 16px; } .ep th:last-child, .ep td:last-child { padding-right: 14px; } }
.ep tbody tr:last-child td { border-bottom: 0; }
/* Each parameter table sits in its own panel, as in the Social Dept. docs: the panel scrolls sideways when the table is
   wider than it, and the side with more to see fades to white (data-more-left and data-more-right, from TABLE_SCRIPT). */
/* The stepped border is its own layer above the fades, so a fade never paints over a corner. */
.ptable { position: relative; margin-top: 6px; border: 1px solid transparent; background: var(--card); }
.ptable__edge { position: absolute; inset: -1px; z-index: 2; pointer-events: none; ${px(C.line, 'none', CURVE)} }
.ptable::before, .ptable::after { content: ''; position: absolute; top: 0; bottom: 0; z-index: 1; width: 48px; pointer-events: none; opacity: 0; transition: opacity .2s; }
.ptable::before { left: 0; background: linear-gradient(to right, #fff, rgba(255,255,255,.6) 50%, rgba(255,255,255,0)); }
.ptable::after { right: 0; background: linear-gradient(to left, #fff, rgba(255,255,255,.6) 50%, rgba(255,255,255,0)); }
.ptable[data-more-left]::before, .ptable[data-more-right]::after { opacity: 1; }
.ptable__scroll { overflow-x: auto; }
.ep td.c-type, .ep td.c-def { color: var(--muted); }
.params + .params { margin-top: 14px; }
.params h4 { margin: 0 0 2px; font-size: 13px; font-weight: 600; }
.ret { display: grid; grid-template-columns: 70px 1fr; gap: 10px; margin-top: 12px; font-size: 13px; }
.ret span { color: var(--muted); } .ret code { overflow-wrap: anywhere; }
.note { margin: 8px 0 0 80px; color: var(--muted); font-size: 13px; }
.ex { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 8px 8px 8px 12px; background: var(--tray); border: 1px solid var(--line); border-radius: 10px; }
.ex code { flex: 1; min-width: 0; font-size: 12.5px; overflow-wrap: anywhere; }

.agents { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.agents__wide { grid-column: 1 / -1; }
.agent { padding: 6px; }
.cmd { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 10px; }
.cmd code { flex: 1; min-width: 0; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }

.landing-foot { padding: 240px 0 0; text-align: center; }
/* The hub: a dark block with pixel-circle corners (drawn into .core__bg by the line script from data-step and
   data-corner), "atproto.md/" in Beast and a blinking block cursor rounded like Beast's pixels. */
.core { position: relative; display: inline-block; color: #fff; font-family: var(--beast); font-weight: 400; font-size: 24px; letter-spacing: -0.02em; padding: 18px 28px 18px 32px; }
.core > span { position: relative; display: inline-flex; align-items: center; gap: 4px; }
.core__bg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 12px rgba(17,24,34,.18)); }
.core__bg path { fill: var(--ink); }
.cursor { display: inline-block; width: 0.5em; height: 0.78em; background: #5b9be6; border-radius: 0.035em; animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
@font-face { font-family: Courneuf; src: url('/fonts/Courneuf-Regular.ttf') format('truetype'); font-display: swap; }
.hosts { position: relative; height: 300px; list-style: none; margin: 0; padding: 0; }
/* Host badges: Courneuf on its 9 pixel grid (13.5px is crisp on retina screens), with one pixel notched from each
   corner. The notched outline is a nine-slice image, so the corners stay fixed while torph changes the width. */
.hosts li { position: absolute; transform: translate(-50%, -50%); font: 400 13.5px Courneuf, var(--mono); border: 6px solid transparent; border-image: ${badgeImage(C.line)} 6 fill / 6px stretch; padding: 0 5px; line-height: 16px; white-space: nowrap; filter: drop-shadow(0 1px 1px rgba(0,0,0,.04)) drop-shadow(0 3px 3px rgba(0,0,0,.04)); transition: color .5s; }
.hosts li.lit { border-image-source: ${badgeImage('#2a78d6')}; color: #2a78d6; }
/* Offprint's tilt (SiteLayout os-tilt-a, b and c). The float itself moves each badge from the line script. */
.hosts li.tilt-0 { animation: tilt-a 8s ease-in-out infinite; }
.hosts li.tilt-1 { animation: tilt-b 11s ease-in-out infinite; }
.hosts li.tilt-2 { animation: tilt-c 9s ease-in-out infinite; }
@keyframes tilt-a { 0%, 100% { rotate: -3deg; } 50% { rotate: 3deg; } }
@keyframes tilt-b { 0%, 100% { rotate: 2deg; } 50% { rotate: -2deg; } }
@keyframes tilt-c { 0%, 100% { rotate: -1.5deg; } 50% { rotate: 2.5deg; } }
@media (prefers-reduced-motion: reduce) { .hosts li, .cursor { animation: none !important; } }

/* The pixel look. Trays, cards, the address field, chips and badges get stepped pixel corners that match the hub and
   the host badges. Small labels are JetBrains Mono. */
.tray { ${px(C.line, C.tray, CURVE_LARGE)} }
.card { ${px(C.line, C.card, CURVE)} box-shadow: none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.03)) drop-shadow(0 3px 3px rgba(0,0,0,.03)); }
.common { ${px(C.line, C.card, CURVE)} }
.ex { ${px(C.line, C.tray, CURVE)} }
.tray__head h3 { font: 500 15px var(--accent); }
.chip, .iconbtn { ${px(C.line, C.card, NOTCH)} }
.chip { font: 500 13px var(--accent); }
.chip:hover, .iconbtn:hover { background: none; border-image-source: ${frameSrc(px(C.line, C.tray, NOTCH))}; }
.verb { ${px('#e8f7f0', '#e8f7f0', [2, [1]])} padding: 1px 5px; font: 600 11.5px/16px var(--accent); }
.chips i { ${px(C.line, C.card, NOTCH)} font: 500 11.5px/14px var(--accent); }
/* The address field: a joined "atproto.md/" prefix set like the placeholder, a divider, then the input, in one
   stepped frame. Phones drop the prefix to leave room for the address. */
.field { ${px(C.line, C.bg, CURVE)} flex: 1; min-width: 0; display: flex; align-items: center; height: 44px; cursor: text; }
.field:focus-within { border-image-source: ${frameSrc(px(C.faint, C.card, CURVE))}; }
.field .prefix { display: flex; align-items: center; align-self: stretch; padding: 0 12px 0 19px; border-right: 1px solid var(--line); font: 16px var(--mono); color: var(--muted); white-space: nowrap; }
.ask .field input, .ask .field input:focus { flex: 1; min-width: 0; height: 100%; padding: 0 14px 0 12px; border: 0; border-radius: 0; background: none; }
@media (max-width: 720px) { .ask .field { flex: none; } .field .prefix { display: none; } .ask .field input, .ask .field input:focus { padding-left: 19px; } }
/* Too narrow for an arc: the hosts wrap in centered rows under the pill, with room above and between the rows for
   the lines. */
.hosts.list { position: static; height: auto; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 8px; margin-top: 72px; }
.hosts.list li { position: static; transform: none; text-align: center; }
/* Home page headlines are set in Beast. */
.hero h1, .block h2, .landing-foot h2 { font-family: var(--beast); font-weight: 400; letter-spacing: -0.04em; }
/* Sized to its longest line, "Every record on the" (about 13.4em in Beast), so it only shrinks when it has to. */
.hero h1 { font-size: min(54px, calc((100vw - 48px) / 14)); line-height: 1.15; }
/* The masthead grows with the screen: at least 80% of the viewport less the header, with the headline and lede centered
   in it as one group, so taller screens get more room above the headline and below the lede. The fixed paddings set
   on tablets and phones below stay as the least room. svh is the viewport with the browser's toolbars shown, so on a
   phone the masthead keeps its height when the toolbars collapse during scrolling. On desktop it equals dvh. */
.hero { display: flex; flex-direction: column; min-height: calc(80svh - 64px); }
.hero h1 { margin-top: auto; }
.hero .lede { margin-bottom: auto; }
/* Each line is its own block. On phones FIT_SCRIPT sizes every line to fill the width, 48px from each screen edge. */
.hero h1 .l { display: block; }
.hero h1 .narrow { display: none; }
@media (max-width: 640px) {
  .hero h1 .l { width: max-content; margin: 0 auto; white-space: nowrap; line-height: 1.1; }
  .hero h1 .wide { display: none; }
  .hero h1 .narrow { display: inline; }
}
.landing-foot h2 { font-size: clamp(32px, 5vw, 56px); line-height: 1.1; margin: 32px 0 80px; }

@media (max-width: 720px) {
  /* Tablets and phones get fixed room around the masthead, more on tablets than on phones. */
  .hero { padding: 72px 0 64px; }
  .hero .lede { margin-top: 28px; }
  .ask { flex-direction: column; } .ask input { flex: none; }
  .req .meta { display: none; }
  .block { padding-top: 88px; }
  /* The line rides the screen edge (10px in), so the sections keep a 24px side padding: the page's 20px plus 4px. */
  .inset .block { padding-left: 4px; padding-right: 4px; }
  .agents { grid-template-columns: 1fr; }
  .tray__head { flex-direction: column; gap: 2px; }
  .ep summary { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "verb path chev" "desc desc desc" "chips chips chips"; }
  .chips { justify-content: flex-start; margin-top: 4px; }
  .note { margin-left: 0; } .ret { grid-template-columns: 1fr; gap: 2px; }
  .common dl div { grid-template-columns: 1fr; gap: 0; }
}
@media (max-width: 480px) {
  .hero { padding: 48px 0 48px; }
  .hero .lede { margin-top: 24px; }
}
@media (max-width: 640px) {
  .hero .lede { font-size: 16px; }
}
`;
