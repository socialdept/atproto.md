import { esc, ICON_COPY } from '../kit';
import { COPY_SCRIPT, DESCRIPTION, footer, head, TABLE_SCRIPT, TITLE, topBar } from '../chrome';
import { EXAMPLES, paramTable, ROUTES } from './routes';
import { INTRO_SCRIPT, INTRO_STYLES } from './intro';
import { HOME_STYLES } from './styles';
import { DEMO_SCRIPT, FIT_SCRIPT, LINE_SCRIPT } from './scripts';

// --- Home page -------------------------------------------------------------------------------------------------
// One line runs the length of the page: from the wordmark into the hero, from the request box down a rail past each
// section, and into atproto.md in the footer, which fans out to the hosts. A highlight follows the reader along it.

/**
 * Real PDS hosts for the footer, picked from the relay's host list (com.atproto.sync.listHosts) by account count and
 * each checked to answer _health. Bluesky's PDSes are one fleet, so it is named bsky.network, never by its individual
 * servers. Eight slots sit on the arc: bsky.network stays fixed, and the other seven take turns showing the pool,
 * switched with torph. A slot only takes a name that fits the width it started with, so selfhosted.social, the widest,
 * starts in the slot with the most room.
 */
const HOSTS = ['blacksky.app', 'eurosky.social', 'certified.one', 'selfhosted.social', 'bsky.network', 'tngl.sh', 'npmx.social', 'pds.rip'];
const FIXED_SLOTS = [4];
const HOST_POOL = ['northsky.social', 'pds.sprk.so', 'surf.social', 'roomy.chat', 'margin.cafe', 'pds.pckt.cafe', 'losers.club'];

const CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

export function htmlIndexPage(origin: string): string {
	// A raster PNG from public/, since several scrapers (X, Facebook, iMessage) reject SVG. Regenerate with `npm run og`.
	const ogImage = `${origin}/og.png`;
	const meta = `<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${origin}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ATMD (atproto.md)">
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
<meta name="twitter:image" content="${ogImage}">`;

	const groups = ROUTES.map(
		([title, note, endpoints], g) => `<div class="tray">
      <div class="tray__head"><h3>${title}</h3><p>${esc(note)}</p></div>
      <div class="card eps">${endpoints
				.map(
					(e, i) => `
        <details class="ep"${g === 0 && i === 0 ? ' open' : ''}>
          <summary><span class="verb">GET</span><code class="path">${esc(e.path)}</code><span class="desc">${esc(e.desc)}</span><span class="chips">${e.params
						.filter((p) => p.in === 'query')
						.map((p) => `<i>${esc(p.name)}</i>`)
						.join('')}</span>${CHEVRON}</summary>
          <div class="body">
            ${paramTable(
							'Path parameters',
							e.params.filter((p) => p.in === 'path'),
						)}${paramTable(
							'Query parameters',
							e.params.filter((p) => p.in === 'query'),
						)}
            <div class="ret"><span>Returns</span><code>${esc(e.returns)}</code></div>
            ${e.note ? `<p class="note">${esc(e.note)}</p>` : ''}
            <div class="ex"><code>curl "${esc(origin + e.example)}"</code><button class="iconbtn" type="button" data-try="${esc(e.example)}">Try it</button></div>
          </div>
        </details>`,
				)
				.join('')}
      </div>
    </div>`,
	).join('\n    ');

	const command = (text: string, label: string) =>
		`<div class="cmd"><code>${esc(text)}</code><button class="iconbtn" type="button" data-copy="${esc(text)}" aria-label="${esc(label)}">${ICON_COPY}<span>Copy</span></button></div>`;

	return `${head(origin, TITLE, `${meta}\n<script>${INTRO_SCRIPT}</script>`)}${HOME_STYLES}${INTRO_STYLES}</style>
</head>
<body>
${topBar(origin, 'home')}
<main class="wrap page">
  <svg class="wire" aria-hidden="true"></svg><div class="wire-cut" aria-hidden="true"><div class="wire-cut__grey"></div><div class="wire-cut__head"><i></i></div></div>
  <section class="hero">
    <i class="line-start" aria-hidden="true"></i>
    <h1 class="fit"><span class="l">One address.</span> <span class="l">Every record on<span class="wide"> the</span></span> <span class="l"><span class="narrow">the </span>Atmosphere.</span></h1>
    <p class="lede">An MCP server and a URL for agents. Put an at:// URI, a handle or a link after atproto.md/ and get the record from its own PDS as raw JSON, exactly as stored.</p>
  </section>

  <section class="demo" id="try" aria-label="Try a request">
    <div class="tray">
      <div class="card">
        <form class="ask" id="ask">
          <label class="field"><span class="prefix" aria-hidden="true">atproto.md/</span><input id="address" name="address" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="at://handle, a link or lexicon/{nsid}" aria-label="An at:// URI, a handle, a link or an API path"></label>
          <button class="btn" type="submit">Fetch</button>
        </form>
        <div class="examples">
${EXAMPLES.map(([label, value]) => `          <button class="chip" type="button" data-try="${esc(value)}">${esc(label)}</button>`).join('\n')}
        </div>
        <div class="req" id="req" hidden>
          <code id="req-path"></code>
          <span class="meta" id="req-meta"></span>
          <button class="iconbtn" type="button" id="req-copy" data-copy="" aria-label="Copy as curl">${ICON_COPY}<span>curl</span></button>
        </div>
        <pre class="out" id="out" aria-live="polite"><span class="empty">The response appears here. Paste an address or pick an example.</span></pre>
      </div>
    </div>
  </section>

  <section class="block" aria-labelledby="agents">
    <h2 id="agents">For agents</h2>
    <p class="sub">The MCP server has six tools: resolve, get, list_records, backlinks, discover and lexicon. The skill sheet teaches the HTTP routes to any agent that can run curl.</p>
    <div class="agents">
      <div class="tray">
        <div class="tray__head"><h3>MCP server</h3><p>Install in Claude Code</p></div>
        <div class="card agent">${command(`claude mcp add --transport http atproto-md ${origin}/mcp`, 'Copy the MCP command')}</div>
      </div>
      <div class="tray">
        <div class="tray__head"><h3>Skill sheet</h3><p>Saved as the /atproto command</p></div>
        <div class="card agent">${command(`curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md`, 'Copy the skill command')}</div>
      </div>
      <div class="tray agents__wide">
        <div class="tray__head"><h3>MCP server URL</h3><p>For any other MCP client</p></div>
        <div class="card agent">${command(`${origin}/mcp`, 'Copy the MCP server URL')}</div>
      </div>
    </div>
  </section>

  <section class="block" aria-labelledby="routes">
    <h2 id="routes">HTTP routes</h2>
    <div class="common">
      <p><b>Every route</b> returns one JSON object as application/json and takes this option:</p>
      <dl>
        <div><dt><code>pretty</code></dt><dd>Indent the JSON. It is compact by default.</dd></div>
        <div><dt>Errors</dt><dd><code>{ "error", "status" }</code> with the same HTTP status.</dd></div>
      </dl>
    </div>
    <div class="groups">
    ${groups}
    </div>
  </section>

  <div class="landing-foot">
    <div class="core" data-step="4" data-corner="5"><svg class="core__bg" aria-hidden="true"><path/></svg><span>atproto.md/<i class="cursor" aria-hidden="true"></i></span></div>
    <ul class="hosts" aria-label="Some of the PDS hosts atproto.md reads from" data-pool="${esc(JSON.stringify(HOST_POOL))}" data-fixed="${esc(JSON.stringify(FIXED_SLOTS))}">${HOSTS.map((h) => `<li><span>${esc(h)}</span></li>`).join('')}</ul>
    <h2>Every PDS. One address.</h2>
  </div>
  ${footer(origin, false)}
</main>
<script>${FIT_SCRIPT}${TABLE_SCRIPT}${COPY_SCRIPT}${DEMO_SCRIPT}${LINE_SCRIPT}</script>
</body>
</html>
`;
}
