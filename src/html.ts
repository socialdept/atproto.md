// Browser- and crawler-facing HTML. The API itself is markdown-first (every data
// route returns text/markdown); this exists only so link-sharing cards, Google,
// and humans hitting the root in a browser get a real <head> with SEO/OG meta —
// and, since they came for a console, an interface that behaves like one.

import type { StatsSnapshot } from './stats';
import { abbrevNum, fmtNum, routeLabel } from './views';

const TITLE = 'atproto.md — AT Protocol data as Markdown';
const DESCRIPTION =
	'A read-only, markdown-first API for the AT Protocol. Fetch any repo, collection, or record from any PDS as clean Markdown, discover every repo using a lexicon, and explore backlinks. No auth, no API key.';

// Detect clients that should get HTML instead of markdown: real browsers
// (Accept: text/html) and link-unfurling / search crawlers (by User-Agent).
// curl and programmatic agents send Accept: */* with a non-browser UA → markdown.
const CRAWLER_UA =
	/bot|crawler|spider|facebookexternalhit|slackbot|twitterbot|discordbot|whatsapp|linkedinbot|telegrambot|embedly|quora|pinterest|redditbot|applebot|googlebot|bingbot|skypeuripreview|vkshare|w3c_validator|mastodon|bluesky/i;

export function prefersHtml(request: Request): boolean {
	const accept = request.headers.get('Accept') ?? '';
	if (accept.includes('text/html')) return true;
	return CRAWLER_UA.test(request.headers.get('User-Agent') ?? '');
}

export function htmlResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Length': String(new TextEncoder().encode(body).length),
			'Cache-Control': 'public, max-age=300',
		},
	});
}

export function svgResponse(body: string): Response {
	return new Response(body, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	});
}

export function robotsTxt(origin: string): string {
	return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(origin: string): string {
	const urls = ['/', '/llms.txt', '/skill.md', '/stats'];
	const entries = urls.map((u) => `  <url><loc>${origin}${u === '/' ? '/' : u}</loc></url>`).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

// ── Palette (hex, for SVG rasterizers that don't grok oklch) ──────────────────
const C = {
	bg: '#0a0d0a',
	panel: '#0f130e',
	line: '#272d24',
	text: '#e8efe3',
	dim: '#8b9581',
	lime: '#bef264',
	limeBright: '#a3e635',
};

// 1200×630 social card — a terminal window, generated, no image asset needed.
export function ogImageSvg(): string {
	const mono = "'SFMono-Regular','SF Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace";
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="${mono}">
  <rect width="1200" height="630" fill="${C.bg}"/>
  <g stroke="${C.line}" stroke-width="1" opacity="0.5">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 120}" y1="0" x2="${i * 120}" y2="630"/>`).join('\n    ')}
  </g>
  <path d="M64 64 H1136 V552 A14 14 0 0 1 1122 566 H78 A14 14 0 0 1 64 552 Z" fill="${C.panel}" stroke="${C.line}" stroke-width="1.5"/>
  <rect x="64" y="64" width="1072" height="4" fill="${C.lime}"/>
  <!-- title bar -->
  <text x="96" y="118" font-size="26" fill="${C.dim}">atproto.md</text>
  <text x="1104" y="118" font-size="22" fill="${C.dim}" text-anchor="end">read-only · markdown · no-auth</text>
  <line x1="64" y1="150" x2="1136" y2="150" stroke="${C.line}" stroke-width="1.5"/>
  <!-- prompt -->
  <text x="96" y="220" font-size="27" fill="${C.dim}"><tspan fill="${C.lime}">~ ▸</tspan> <tspan fill="${C.text}">curl</tspan> <tspan fill="${C.dim}">atproto.md/at://{actor}/{collection}/{rkey}</tspan></text>
  <!-- wordmark (textLength pins the width so the cursor rect lands right after ".md") -->
  <text x="94" y="356" font-size="104" font-weight="700" fill="${C.text}" textLength="598" lengthAdjust="spacing">atproto.md</text>
  <rect x="700" y="264" width="64" height="104" fill="${C.lime}"/>
  <!-- routes -->
  <text x="96" y="446" font-size="27" fill="${C.dim}"><tspan fill="${C.limeBright}">GET</tspan> /discover/{collection}<tspan fill="${C.line}">  ·  </tspan><tspan fill="${C.limeBright}">GET</tspan> /backlinks/{uri}</text>
  <!-- status bar -->
  <line x1="64" y1="494" x2="1136" y2="494" stroke="${C.line}" stroke-width="1.5"/>
  <circle cx="100" cy="530" r="6" fill="${C.limeBright}"/>
  <text x="118" y="538" font-size="23" fill="${C.text}">live</text>
  <text x="1104" y="538" font-size="23" fill="${C.dim}" text-anchor="end">any collection · any PDS · no auth</text>
</svg>
`;
}

// Square favicon — bracketed prompt mark.
export function faviconSvg(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" font-family="monospace">
  <rect width="64" height="64" rx="13" fill="${C.bg}" stroke="${C.line}" stroke-width="2"/>
  <text x="14" y="44" font-size="34" font-weight="700" fill="${C.lime}">▸</text>
  <rect x="38" y="36" width="14" height="6" fill="${C.text}"/>
</svg>
`;
}

export function htmlIndexPage(origin: string): string {
	// Rasterized PNG (served from public/ via static assets) — SVG og:image is
	// rejected by several scrapers (X, Facebook, iMessage). Regenerate with `npm run og`.
	const ogImage = `${origin}/og.png`;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${origin}/">
<link rel="icon" href="${origin}/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0a0d0a">

<meta property="og:type" content="website">
<meta property="og:site_name" content="atproto.md">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="${origin}/">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${ogImage}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Martian+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">

<style>
  :root {
    color-scheme: dark;
    --bg: oklch(0.16 0.01 140);
    --panel: oklch(0.195 0.012 140);
    --panel-2: oklch(0.235 0.014 140);
    --line: oklch(0.31 0.012 140);
    --text: oklch(0.94 0.008 140);
    --dim: oklch(0.70 0.014 140);
    --faint: oklch(0.56 0.014 140);
    --lime: oklch(0.88 0.20 128);
    --lime-bright: oklch(0.83 0.21 130);

    --mono: 'Martian Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --sans: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;

    --s-2: 0.5rem; --s-3: 0.75rem; --s-4: 1rem; --s-6: 1.5rem;
    --s-8: 2rem; --s-12: 3rem; --s-16: 4rem; --s-24: 6rem;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    background-image:
      linear-gradient(90deg, color-mix(in oklch, var(--line) 35%, transparent) 1px, transparent 1px);
    background-size: 64px 100%;
    background-position: center top;
    color: var(--text);
    font-family: var(--sans);
    font-size: clamp(0.95rem, 0.9rem + 0.3vw, 1.05rem);
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .console {
    max-width: 880px;
    margin: 0 auto;
    padding: clamp(1rem, 0.5rem + 2vw, 2.5rem) clamp(1rem, 0.5rem + 2vw, 2rem) var(--s-24);
  }
  .mono { font-family: var(--mono); }
  a { color: var(--lime); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }

  /* ── status bar ── */
  .bar {
    display: flex; align-items: center; gap: var(--s-4);
    font-family: var(--mono); font-size: 0.74rem; font-weight: 400;
    letter-spacing: 0.02em; color: var(--faint);
    padding: var(--s-3) var(--s-4);
    border: 1px solid var(--line);
    border-radius: 10px 10px 0 0;
    border-bottom: none;
    background: var(--panel);
  }
  .bar__id { color: var(--dim); }
  .bar__meta { color: var(--faint); }
  .bar__status { margin-left: auto; display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text); }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lime-bright); box-shadow: 0 0 0 0 color-mix(in oklch, var(--lime-bright) 70%, transparent); }

  /* ── hero ── */
  .hero {
    border: 1px solid var(--line);
    border-radius: 0 0 10px 10px;
    background: var(--panel);
    padding: var(--s-8) clamp(1rem, 0.5rem + 2.5vw, 2.25rem) var(--s-12);
  }
  .prompt {
    font-family: var(--mono); font-size: clamp(0.72rem, 0.66rem + 0.4vw, 0.86rem);
    color: var(--faint); margin-bottom: var(--s-6); overflow-x: auto; white-space: nowrap;
    padding-bottom: var(--s-2);
  }
  .prompt .cue { color: var(--lime); }
  .prompt .cmd { color: var(--text); }
  h1 {
    font-family: var(--mono); font-weight: 700;
    font-size: clamp(2.4rem, 1.4rem + 6vw, 4.6rem);
    letter-spacing: -0.05em; line-height: 0.95; margin: 0;
    color: var(--text);
  }
  .cursor {
    display: inline-block;
    width: 0.62em;
    height: 1em;
    margin-left: 0.04em;
    background: var(--lime);
    vertical-align: baseline;
    transform: translateY(4px);
  }
  .lede {
    max-width: 56ch; margin: var(--s-6) 0 0;
    color: var(--dim); font-size: clamp(1rem, 0.95rem + 0.4vw, 1.18rem);
  }

  /* ── section headings ── */
  h2 {
    font-family: var(--mono); font-weight: 500; font-size: 0.8rem;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint);
    margin: var(--s-16) 0 var(--s-4);
  }
  h2::before { content: '// '; color: var(--lime); }

  /* ── routes table ── */
  .routes { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--panel); }
  .route {
    display: grid; grid-template-columns: 1fr; gap: 0.1rem;
    padding: var(--s-4) clamp(0.85rem, 0.5rem + 1.5vw, 1.25rem);
    border-top: 1px solid var(--line);
    transition: background 0.18s ease;
  }
  .route:first-child { border-top: none; }
  .route:hover, .route:focus-within { background: var(--panel-2); }
  .route__sig { font-family: var(--mono); font-size: 0.9rem; color: var(--text); overflow-x: auto; white-space: nowrap; }
  .route__sig .m { color: var(--lime-bright); font-weight: 600; margin-right: 0.6rem; }
  .badge {
    margin-left: 0.6rem; padding: 0.08rem 0.4rem;
    font-size: 0.6rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--bg); background: var(--lime); border-radius: 4px; vertical-align: 0.12em;
  }
  .route__sig a { color: var(--text); }
  .route__sig a:hover { color: var(--lime); }
  .route__desc { color: var(--dim); font-size: 0.92rem; }
  .route__desc code { font-family: var(--mono); font-size: 0.85em; color: var(--text); }
  .route__eg {
    margin-top: 0.3rem; width: fit-content; max-width: 100%;
    font-family: var(--mono); font-size: 0.8rem; color: var(--lime);
    overflow-x: auto; white-space: nowrap;
  }
  .route__eg::before { content: '↳\\00a0'; color: var(--faint); }

  /* ── terminal blocks ── */
  .term {
    font-family: var(--mono); font-size: clamp(0.74rem, 0.68rem + 0.4vw, 0.86rem);
    line-height: 1.85; margin: 0;
    border: 1px solid var(--line); border-radius: 10px;
    background: var(--panel); padding: var(--s-6) clamp(0.85rem, 0.5rem + 1.5vw, 1.25rem);
    overflow-x: auto;
  }
  .term .l { display: block; white-space: pre; }
  .term .c { color: var(--faint); }
  .term .p { color: var(--lime); }
  .term .o { color: var(--text); }
  .term .u { color: var(--dim); }

  .links { display: flex; flex-wrap: wrap; gap: var(--s-2) var(--s-6); font-family: var(--mono); font-size: 0.85rem; margin-bottom: var(--s-4); }
  .links span { color: var(--line); }

  footer {
    margin-top: var(--s-16); padding-top: var(--s-6);
    border-top: 1px solid var(--line);
    font-family: var(--mono); font-size: 0.74rem; line-height: 2;
    color: var(--faint); letter-spacing: 0.01em;
  }
  footer a { color: var(--dim); }
  footer .k { color: var(--text); }

  /* ── motion: one orchestrated load + steady cursor ── */
  @media (prefers-reduced-motion: no-preference) {
    .reveal { opacity: 0; transform: translateY(14px); animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .reveal:nth-child(1) { animation-delay: 0.04s; }
    .reveal:nth-child(2) { animation-delay: 0.12s; }
    .reveal:nth-child(3) { animation-delay: 0.20s; }
    .reveal:nth-child(4) { animation-delay: 0.28s; }
    .reveal:nth-child(5) { animation-delay: 0.36s; }
    .reveal:nth-child(6) { animation-delay: 0.44s; }
    .reveal:nth-child(7) { animation-delay: 0.52s; }
    .cursor { animation: blink 1.15s steps(1, end) infinite; }
    .dot { animation: pulse 2.4s ease-out infinite; }
  }
  @keyframes rise { to { opacity: 1; transform: none; } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--lime-bright) 60%, transparent); }
    70%, 100% { box-shadow: 0 0 0 7px transparent; }
  }

  @media (max-width: 560px) {
    body { background-image: none; }
    .bar__meta { display: none; }
  }
</style>
</head>
<body>
<main class="console">

  <div class="bar reveal">
    <span class="bar__id mono">atproto.md</span>
    <span class="bar__meta">read-only · markdown · no-auth</span>
    <span class="bar__status"><i class="dot"></i> live</span>
  </div>

  <section class="hero reveal">
    <div class="prompt"><span class="cue">~ ▸</span> <span class="cmd">curl</span> atproto.md/at://{actor}/{collection}/{rkey}</div>
    <h1>atproto.md<span class="cursor" aria-hidden="true"></span></h1>
    <p class="lede">AT Protocol data as clean Markdown. Any collection on any PDS — first-party Bluesky or third-party lexicons. No auth, no API key.</p>
  </section>

  <h2 class="reveal">routes</h2>
  <div class="routes reveal">
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/at://{actor}</div>
      <div class="route__desc">Repo overview — every collection in the repo.</div>
      <a class="route__eg" href="${origin}/at://bsky.app">/at://bsky.app</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/at://{actor}/{collection}</div>
      <div class="route__desc">List records in any collection on any PDS. Paginated.</div>
      <a class="route__eg" href="${origin}/at://bsky.app/app.bsky.feed.post">/at://bsky.app/app.bsky.feed.post</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/at://{actor}/{collection}/{rkey}</div>
      <div class="route__desc">Fetch a single record by rkey.</div>
      <a class="route__eg" href="${origin}/at://bsky.app/app.bsky.actor.profile/self">/at://bsky.app/app.bsky.actor.profile/self</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/backlinks/{at-uri-or-did-or-url}<span class="badge">new</span></div>
      <div class="route__desc">Who links to a target — likes, reposts, replies, follows, or any lexicon.</div>
      <a class="route__eg" href="${origin}/backlinks/at://did:plc:btxrwcaeyodrap5mnjw2fvmz/site.standard.document/3md4qsktbms24">/backlinks/at://…/site.standard.document/3md4qsktbms24</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/discover/{collection}<span class="badge">new</span></div>
      <div class="route__desc">Every repo on the network using a lexicon.</div>
      <a class="route__eg" href="${origin}/discover/site.standard.document">/discover/site.standard.document</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/lexicon/{nsid}<span class="badge">new</span></div>
      <div class="route__desc">Resolve a Lexicon schema by NSID — DNS <code>_lexicon</code> TXT → DID → schema record.</div>
      <a class="route__eg" href="${origin}/lexicon/app.bsky.feed.post">/lexicon/app.bsky.feed.post</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/plc/audit/{actor}<span class="badge">new</span></div>
      <div class="route__desc">PLC audit log — PDS migrations, handle changes, and key rotations over time.</div>
      <a class="route__eg" href="${origin}/plc/audit/bsky.app">/plc/audit/bsky.app</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/plc/data/{actor}<span class="badge">new</span></div>
      <div class="route__desc">Current PLC state — active PDS, handles, signing key, and rotation keys.</div>
      <a class="route__eg" href="${origin}/plc/data/bsky.app">/plc/data/bsky.app</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/plc/last/{actor}<span class="badge">new</span></div>
      <div class="route__desc">The most recent PLC operation and the state it established.</div>
      <a class="route__eg" href="${origin}/plc/last/bsky.app">/plc/last/bsky.app</a>
    </div>
    <div class="route">
      <div class="route__sig"><span class="m">GET</span>/resolve/{actor}</div>
      <div class="route__desc">Full identity chain — handle → DID → DID document → PDS endpoint.</div>
      <a class="route__eg" href="${origin}/resolve/bsky.app">/resolve/bsky.app</a>
    </div>
  </div>

  <h2 class="reveal">try it</h2>
  <pre class="term reveal"><span class="l"><span class="c"># resolve a profile</span></span><span class="l"><span class="p">~ ▸</span> <span class="o">curl ${origin}/at://bsky.app/app.bsky.actor.profile/self</span></span><span class="l"> </span><span class="l"><span class="c"># find everyone using a lexicon</span></span><span class="l"><span class="p">~ ▸</span> <span class="o">curl ${origin}/discover/site.standard.document</span></span><span class="l"> </span><span class="l"><span class="c"># latest posts</span></span><span class="l"><span class="p">~ ▸</span> <span class="o">curl <span class="u">"</span>${origin}/at://bsky.app/app.bsky.feed.post?limit=5<span class="u">"</span></span></span></pre>

  <h2 class="reveal">for llm agents</h2>
  <div class="reveal">
    <div class="links">
      <a href="${origin}/skill.md">/skill.md</a><span>·</span>
      <a href="${origin}/llms.txt">/llms.txt</a><span>·</span>
      <span class="mono" style="color:var(--dim)">MCP at /mcp</span>
    </div>
    <pre class="term"><span class="l"><span class="c"># install the MCP server in Claude Code</span></span><span class="l"><span class="p">~ ▸</span> <span class="o">claude mcp add --transport http atproto-md ${origin}/mcp</span></span><span class="l"> </span><span class="l"><span class="c"># or save the skill as a slash command</span></span><span class="l"><span class="p">~ ▸</span> <span class="o">curl -s ${origin}/skill.md <span class="u">></span> ~/.claude/commands/atproto.md</span></span></pre>
  </div>

  <footer class="reveal">
    Data fetched directly from AT Protocol PDSes via <span class="k">com.atproto.repo.*</span>.<br>
    Network discovery via the relay's <span class="k">com.atproto.sync.listReposByCollection</span>.<br>
    Backlinks indexed by <a href="https://constellation.microcosm.blue">Constellation</a> <span class="k">microcosm.blue</span>.<br>
    No authentication · public data only · <a href="${origin}/stats">stats</a> · <a href="https://tangled.org/socialde.pt/atproto.md/">source</a>
  </footer>

</main>
</body>
</html>
`;
}

const esc = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Fill width for a bar inset 4px on every side: a fraction of the row minus the left+right gaps.
function barWidth(count: number, max: number): string {
	const frac = max > 0 ? count / max : 0;
	return `max(3px, calc((100% - 8px) * ${frac.toFixed(4)}))`;
}

// One horizontal bar row: a label, a count, and a track filled proportional to the section max.
function statRow(label: string, count: number, max: number, href?: string): string {
	const key = href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);
	return `    <div class="srow"><span class="srow__bar" style="width:${barWidth(count, max)}"></span><span class="srow__k mono">${key}</span><span class="srow__v mono">${esc(fmtNum(count))}</span></div>`;
}

function statSection(title: string, rows: string[]): string {
	if (!rows.length) return '';
	return `  <h2 class="reveal">${title}</h2>\n  <div class="stable reveal">\n${rows.join('\n')}\n  </div>\n`;
}

const THRESHOLD = 5; // hide country/client buckets below this so a rare bucket can't deanonymize

const ID_LABELS: Record<string, string> = { handle: 'handle', plc: 'did:plc', web: 'did:web' };

function bytesHuman(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Rows helper for a [{key,count}] list, with optional label + href transforms.
function countRows(items: { key: string; count: number }[], label: (k: string) => string = (k) => k, href?: (k: string) => string): string[] {
	const max = Math.max(0, ...items.map((i) => i.count));
	return items.map((i) => statRow(label(i.key), i.count, max, href?.(i.key)));
}

// One cell of the top readout strip (hairline-divided, not a free-floating card). When `full`
// is given (an abbreviated value), the number gets a hover tooltip with the exact figure.
function roCell(value: string, label: string, full?: string): string {
	const more = full ? ` data-full="${esc(full)}" data-label="${esc(label)}" aria-label="${esc(full)} ${esc(label)}"` : '';
	return `    <div class="ro"><span class="ro__n mono${full ? ' ro__n--more' : ''}"${more}>${esc(value)}</span><span class="ro__l mono">${esc(label)}</span></div>`;
}

// A section sized for the two-column grid (compact heading; the grid provides separation).
function gridCell(title: string, rows: string[]): string {
	if (!rows.length) return '';
	return `    <section class="cell">\n      <h3>${title}</h3>\n      <div class="stable">\n${rows.join('\n')}\n      </div>\n    </section>`;
}

// Crisp CSS bar series for requests-over-time — clearer than unicode blocks on screen.
// Each bar carries data-* for the cursor-following tooltip and an aria-label for no-JS / AT.
function seriesBars(daily: { day: string; count: number }[]): string {
	const max = Math.max(1, ...daily.map((d) => d.count));
	return daily
		.map((d) => {
			const pct = Math.round((d.count / max) * 100);
			const count = esc(fmtNum(d.count));
			return `<span class="series__bar" style="height:max(2px,${pct}%)" data-day="${esc(d.day)}" data-count="${count}" aria-label="${esc(d.day)}: ${count} requests"></span>`;
		})
		.join('');
}

export function htmlStatsPage(origin: string, stats: StatsSnapshot | null): string {
	const total = stats?.total ?? 0;
	const since = stats?.since ? stats.since.slice(0, 10) : '—';
	const errors = stats?.errors ?? 0;
	const errPct = total > 0 ? `${((errors / total) * 100).toFixed(1)}%` : '0%';
	const channelCount = (k: string): number => stats?.channels.find((c) => c.key === k)?.count ?? 0;
	const empty = total === 0;

	const http = channelCount('http');
	const mcp = channelCount('mcp');
	const sessions = stats?.sessions ?? 0;
	const estTokens = stats?.estTokens ?? 0;
	const full = (n: number): string | undefined => (n >= 10_000 ? fmtNum(n) : undefined); // only when abbreviated

	const readout = [
		roCell(abbrevNum(total), 'total requests', full(total)),
		roCell(abbrevNum(http), 'http requests', full(http)),
		roCell(abbrevNum(mcp), 'mcp tool calls', full(mcp)),
		roCell(abbrevNum(sessions), 'mcp sessions', full(sessions)),
		roCell(errPct, 'error rate'),
		roCell(stats?.latency.count ? `${fmtNum(stats.latency.avgMs)}ms` : '—', 'avg latency'),
		roCell(bytesHuman(stats?.bytes ?? 0), 'md bytes served'),
		roCell(`~${abbrevNum(estTokens)}`, 'est. md tokens', estTokens >= 10_000 ? `~${fmtNum(estTokens)}` : undefined),
	].join('\n');

	// Collections carry a rich/generic badge; the generic ones are formatter candidates.
	const collMax = Math.max(0, ...(stats?.collections.map((c) => c.count) ?? []));
	const collRows = (stats?.collections ?? []).map((c) => {
		const tag = c.rich ? '<span class="tag tag--rich">rich</span>' : '<span class="tag tag--gen">generic</span>';
		return `    <div class="srow"><span class="srow__bar" style="width:${barWidth(c.count, collMax)}"></span><span class="srow__k mono"><a href="${esc(origin)}/discover/${esc(c.nsid)}">${esc(c.nsid)}</a> ${tag}</span><span class="srow__v mono">${esc(fmtNum(c.count))}</span></div>`;
	});

	const lat = stats?.latency;
	const latLine = lat && lat.count
		? `  <p class="note reveal">avg ${fmtNum(lat.avgMs)}ms · p50 ${esc(lat.p50)} · p95 ${esc(lat.p95)} · ${fmtNum(lat.count)} samples<br><span class="approx">approximate, the Workers clock advances only across I/O</span></p>\n`
		: '';

	const daily = stats?.daily ?? [];
	const series = daily.length
		? `  <h2 class="reveal">requests over time</h2>\n  <div class="serieswrap reveal"><div class="series">${seriesBars(daily)}</div><p class="note">${esc(daily[0].day)} → ${esc(daily[daily.length - 1].day)} · peak ${fmtNum(Math.max(...daily.map((d) => d.count)))}/day</p></div>\n`
		: '';

	const countries = (stats?.countries ?? []).filter((c) => c.count >= THRESHOLD);
	const clients = (stats?.clients ?? []).filter((c) => c.count >= THRESHOLD);

	// Wide, attention-worthy breakdowns run full width; the many small dimensions sit in a
	// responsive grid so the page reads as a composed dashboard, not an endless ledger.
	const wide =
		statSection('http routes', countRows(stats?.routes ?? [], routeLabel)) +
		statSection('most queried collections', collRows) +
		statSection(
			'collections needing a formatter',
			countRows((stats?.needsFormatter ?? []).map((c) => ({ key: c.nsid, count: c.count })), (k) => k, (k) => `${origin}/discover/${k}`),
		);

	const cells = [
		gridCell('mcp tools', countRows(stats?.tools ?? [])),
		gridCell('identifier type', countRows(stats?.idTypes ?? [], (k) => ID_LABELS[k] ?? k)),
		gridCell('status codes', countRows(stats?.statuses ?? [])),
		gridCell('errors by route', countRows(stats?.errorRoutes ?? [])),
		gridCell('upstream failures', countRows(stats?.upstreams ?? [])),
		gridCell('top authorities', countRows(stats?.authorities ?? [])),
		gridCell('pagination &amp; params', countRows(stats?.params ?? [])),
		gridCell('backlink selectors', countRows(stats?.selectors ?? [])),
		gridCell('latency distribution', countRows(lat?.buckets ?? [])),
		gridCell('mcp clients', countRows(clients)),
		gridCell('countries', countRows(countries)),
	].filter(Boolean);
	const grid = cells.length ? `  <div class="grid2 reveal">\n${cells.join('\n')}\n  </div>\n` : '';

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>usage stats — atproto.md</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${origin}/stats">
<link rel="icon" href="${origin}/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0a0d0a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600&family=Martian+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    color-scheme: dark;
    --bg: oklch(0.16 0.01 140); --panel: oklch(0.195 0.012 140);
    --line: oklch(0.31 0.012 140); --text: oklch(0.94 0.008 140);
    --dim: oklch(0.70 0.014 140); --faint: oklch(0.56 0.014 140);
    --lime: oklch(0.88 0.20 128); --lime-bright: oklch(0.83 0.21 130);
    --mono: 'Martian Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --sans: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text); font-family: var(--sans);
    font-size: clamp(0.95rem, 0.9rem + 0.3vw, 1.05rem); line-height: 1.65;
    background-image: linear-gradient(90deg, color-mix(in oklch, var(--line) 35%, transparent) 1px, transparent 1px);
    background-size: 64px 100%; -webkit-font-smoothing: antialiased;
  }
  .console { max-width: 880px; margin: 0 auto; padding: clamp(1rem, 0.5rem + 2vw, 2.5rem) clamp(1rem, 0.5rem + 2vw, 2rem) 6rem; }
  .mono { font-family: var(--mono); }
  a { color: var(--lime); text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .bar { display: flex; align-items: center; gap: 1rem; font-family: var(--mono); font-size: 0.74rem; letter-spacing: 0.02em; color: var(--faint); padding: 0.75rem 1rem; border: 1px solid var(--line); border-radius: 10px 10px 0 0; border-bottom: none; background: var(--panel); }
  .bar__id { color: var(--dim); }
  .bar__meta { color: var(--faint); }
  .bar__status { margin-left: auto; display: inline-flex; align-items: center; gap: 0.45rem; color: var(--text); }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lime-bright); box-shadow: 0 0 0 0 color-mix(in oklch, var(--lime-bright) 70%, transparent); }
  .hero { border: 1px solid var(--line); border-radius: 0 0 10px 10px; background: var(--panel); padding: 2rem clamp(1rem, 0.5rem + 2.5vw, 2.25rem) 2.5rem; }
  .prompt { font-family: var(--mono); font-size: clamp(0.72rem, 0.66rem + 0.4vw, 0.86rem); color: var(--faint); margin-bottom: 1.5rem; }
  .prompt .cue { color: var(--lime); }
  .prompt .cmd { color: var(--text); }
  h1 { font-family: var(--mono); font-weight: 700; font-size: clamp(2.4rem, 1.4rem + 6vw, 4.6rem); letter-spacing: -0.05em; line-height: 0.95; margin: 0; }
  .cursor { display: inline-block; width: 0.6em; height: 0.92em; margin-left: 0.06em; background: var(--lime); vertical-align: baseline; transform: translateY(0.12em); }
  .lede { max-width: 60ch; margin: 1.5rem 0 0; color: var(--dim); }
  h2 { font-family: var(--mono); font-weight: 500; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin: 3.5rem 0 1rem; }
  h2::before { content: '// '; color: var(--lime); }
  .readout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 1.75rem; border: 1px solid var(--line); border-radius: 10px; background: var(--line); overflow: hidden; }
  @media (max-width: 640px) { .readout { grid-template-columns: repeat(2, 1fr); } }
  .ro { background: var(--panel); padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.35rem; }
  .ro__n { font-size: 1.5rem; font-weight: 600; color: var(--text); line-height: 1; }
  .ro__n--more { cursor: help; text-decoration: underline dotted; text-decoration-color: var(--faint); text-underline-offset: 4px; }
  .ro__l { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--faint); }
  .stable { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--panel); }
  .srow { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; padding: 0.5rem clamp(0.85rem, 0.5rem + 1.5vw, 1.15rem); border-top: 1px solid var(--line); }
  .srow:first-child { border-top: none; }
  .srow__bar { position: absolute; left: 4px; top: 4px; bottom: 4px; background: color-mix(in oklch, var(--lime) 15%, transparent); border-radius: 4px; }
  .srow__k { position: relative; font-size: 0.82rem; color: var(--text); overflow-x: auto; white-space: nowrap; }
  .srow__k a { color: var(--text); }
  .srow__k a:hover { color: var(--lime); }
  .srow__v { position: relative; font-size: 0.82rem; color: var(--lime); text-align: right; font-variant-numeric: tabular-nums; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; align-items: start; margin-top: 1rem; }
  .cell h3 { font-family: var(--mono); font-weight: 500; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint); margin: 0 0 0.7rem; }
  .cell h3::before { content: '// '; color: var(--lime); }
  .tag { font-family: var(--mono); font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.05rem 0.35rem; border-radius: 4px; vertical-align: 0.12em; }
  .tag--rich { color: var(--bg); background: var(--lime); }
  .tag--gen { color: var(--faint); border: 1px solid var(--line); }
  .serieswrap { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); padding: 1.25rem; }
  .series { display: flex; align-items: flex-end; justify-content: flex-start; gap: 3px; height: 56px; overflow-x: auto; }
  .series__bar { flex: 1 1 0; min-width: 3px; max-width: 26px; background: color-mix(in oklch, var(--lime) 45%, transparent); border-radius: 2px 2px 0 0; transition: background 0.12s ease; }
  .series__bar:hover { background: var(--lime); }
  .tip { position: fixed; left: 0; top: 0; z-index: 50; pointer-events: none; display: flex; flex-direction: column; gap: 0.15rem; padding: 0.45rem 0.65rem; font-family: var(--mono); font-size: 0.7rem; color: var(--dim); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 8px 26px rgba(0,0,0,0.45); white-space: nowrap; }
  .tip[hidden] { display: none; }
  .tip__n { color: var(--lime); font-weight: 600; }
  .tip__d { color: var(--faint); }
  .note { color: var(--faint); font-family: var(--mono); font-size: 0.72rem; margin: 0.7rem 0 0; }
  .approx { color: var(--faint); }
  footer { margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 0.74rem; line-height: 2; color: var(--faint); }
  footer a { color: var(--dim); }
  @media (prefers-reduced-motion: no-preference) {
    .reveal { opacity: 0; transform: translateY(14px); animation: rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .reveal:nth-child(1){animation-delay:.04s}.reveal:nth-child(2){animation-delay:.12s}.reveal:nth-child(3){animation-delay:.2s}.reveal:nth-child(4){animation-delay:.28s}.reveal:nth-child(5){animation-delay:.36s}.reveal:nth-child(6){animation-delay:.44s}.reveal:nth-child(7){animation-delay:.52s}.reveal:nth-child(8){animation-delay:.6s}
    .cursor { animation: blink 1.15s steps(1, end) infinite; }
    .dot { animation: pulse 2.4s ease-out infinite; }
  }
  @keyframes rise { to { opacity: 1; transform: none; } }
  @keyframes blink { 50% { opacity: 0; } }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--lime-bright) 60%, transparent); } 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
  @media (max-width: 560px) { body { background-image: none; } .bar__meta { display: none; } }
</style>
</head>
<body>
<main class="console">

  <div class="bar reveal">
    <span class="bar__id mono">atproto.md</span>
    <span class="bar__meta">usage · anonymous · no PII</span>
    <span class="bar__status"><i class="dot"></i> live</span>
  </div>

  <section class="hero reveal">
    <div class="prompt"><span class="cue">~ ▸</span> <span class="cmd">curl</span> atproto.md/stats</div>
    <h1>usage stats<span class="cursor" aria-hidden="true"></span></h1>
    <p class="lede">Anonymous traffic for atproto.md — route &amp; MCP-tool hits and the most-queried collections. No IPs, handles, DIDs, or record keys are ever stored.${empty ? ' <strong>No requests recorded yet.</strong>' : ` Counting since ${esc(since)}.`}</p>
  </section>

  <div class="readout reveal">
${readout}
  </div>

${series}${latLine}
  <p class="note reveal">${esc(fmtNum(stats?.distinctCollections ?? 0))} distinct collections · ${esc(fmtNum(stats?.richTotal ?? 0))} queries to richly-formatted, ${esc(fmtNum(stats?.genericTotal ?? 0))} to generic.</p>

${wide}${grid}
  <footer class="reveal">
    Only anonymous route names, MCP tool names, lexicon NSIDs, status codes, coarse country, and aggregate timing are counted. Country &amp; client rows below a small threshold are hidden.<br>
    No IPs · no handles · no DIDs · no record keys.<br>
    <a href="${origin}/">home</a> · <a href="${origin}/stats">refresh</a> · <a href="https://tangled.org/socialde.pt/atproto.md/">source</a>
  </footer>

  <div id="tip" class="tip" role="status" hidden></div>

</main>
<script>
(function(){
  var root = document.querySelector('.console');
  var tip = document.getElementById('tip');
  if (!root || !tip) return;
  root.addEventListener('mousemove', function(e){
    var t = e.target.closest ? e.target.closest('.series__bar,[data-full]') : null;
    if (!t){ tip.hidden = true; return; }
    if (t.classList.contains('series__bar')) {
      tip.innerHTML = '<span><span class="tip__n">' + t.dataset.count + '</span> requests</span><span class="tip__d">' + t.dataset.day + '</span>';
    } else {
      tip.innerHTML = '<span class="tip__n">' + t.dataset.full + '</span><span class="tip__d">' + t.dataset.label + '</span>';
    }
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - r.width - 8) + 'px';
    tip.style.top = Math.max(8, e.clientY - r.height - 12) + 'px';
  });
  root.addEventListener('mouseleave', function(){ tip.hidden = true; });
})();
</script>
</body>
</html>
`;
}
