import type { StatsSnapshot } from '../../stats';
import { fmtNum, routeLabel, STATS_THRESHOLD } from '../../views';
import { COUNTRY_NAMES } from '../../world-grid';
import { COPY_SCRIPT, footer, head, topBar } from '../chrome';
import {
	chips,
	emptyState,
	figure,
	ID_LABELS,
	items,
	latencyHistogram,
	mcpUsage,
	meterList,
	overview,
	panel,
	requestsChart,
	splitBar,
	statusPanel,
	VIZ,
	worldMap,
} from './components';
import { CHART_SCRIPT } from './script';
import { STATS_STYLES } from './styles';

// --- Stats page ------------------------------------------------------------------------------------------------
//
// Each section has a stat component made for its data: a hero figure with a daily strip and the HTTP and MCP split,
// small figure tiles, a requests chart with 7 and 30 day ranges, segmented meters for ranked lists, a segmented bar
// for identifier types and status classes, a latency histogram, and chips for parameters.

export function htmlStatsPage(origin: string, stats: StatsSnapshot | null): string {
	const countries = (stats?.countries ?? []).filter((c) => c.count >= STATS_THRESHOLD);
	const clients = (stats?.clients ?? []).filter((c) => c.count >= STATS_THRESHOLD);
	const ids = stats?.idTypes ?? [];
	const idCount = (k: string) => ids.find((i) => i.key === k)?.count ?? 0;

	const calls = `<section class="sgroup" aria-labelledby="calls">
    <div class="sgroup__head"><h2 id="calls">Calls</h2><p>Which routes and MCP tools get used, and how accounts are named.</p></div>
    <div class="grid">
      ${panel('HTTP routes', 'Every route, by requests', meterList(items(stats?.routes ?? [], routeLabel), { all: true, empty: 'No HTTP requests yet.' }), 'wide')}
      ${panel('MCP tools', 'Tool calls, by tool', meterList(items(stats?.tools ?? []), { tone: 'blue', empty: 'No MCP tool calls yet.' }))}
      ${panel(
				'Identifier types',
				'How accounts are named in requests',
				splitBar(
					[
						{ label: ID_LABELS.handle, count: idCount('handle'), color: VIZ.http },
						{ label: ID_LABELS.plc, count: idCount('plc'), color: VIZ.mcp },
						{ label: ID_LABELS.web, count: idCount('web'), color: VIZ.third },
					],
					{ tall: true, empty: 'No account lookups yet.' },
				),
			)}
    </div>
  </section>`;

	const reads = `<section class="sgroup" aria-labelledby="reads">
    <div class="sgroup__head"><h2 id="reads">Reads</h2><p>The collections and namespaces requested, and the options used with them.</p></div>
    <div class="grid">
      ${panel(
				'Collections',
				`${fmtNum(stats?.distinctCollections ?? 0)} distinct, the most requested`,
				meterList(
					(stats?.collections ?? []).map((c) => ({ label: c.nsid, count: c.count, href: `${origin}/discover/${c.nsid}`, mono: true })),
					{ empty: 'No collections requested yet.' },
				),
				'wide',
			)}
      ${panel('Namespaces', 'Collections grouped by authority', meterList(items(stats?.authorities ?? []), { empty: 'No collections requested yet.' }))}
      ${panel('Parameters', 'Query options sent with requests', chips(stats?.params ?? [], 'No query options used yet.'))}
      ${panel('Backlink sources', 'Sources asked for on /backlinks', chips(stats?.selectors ?? [], 'No backlink sources asked for yet.'), 'wide')}
    </div>
  </section>`;

	const health = `<section class="sgroup" aria-labelledby="health">
    <div class="sgroup__head"><h2 id="health">Health</h2><p>Response codes, response times, and what failed.</p></div>
    <div class="grid">
      ${panel('Status codes', 'Every response, by status', statusPanel(stats))}
      ${panel('Latency', 'Response time, every timed request', latencyHistogram(stats))}
      ${panel('Errors by route', 'Failed requests, by route', meterList(items(stats?.errorRoutes ?? [], routeLabel), { tone: 'error', stacked: true, empty: 'No failed requests.' }))}
      ${panel('Upstream failures', 'Failures caused by an upstream service', meterList(items(stats?.upstreams ?? []), { tone: 'error', empty: 'No upstream failures.' }))}
    </div>
  </section>`;

	const who = `<section class="sgroup" aria-labelledby="who">
    <div class="sgroup__head"><h2 id="who">Clients</h2><p>Where requests come from and how agents use the MCP server. Rows under ${STATS_THRESHOLD} requests are hidden.</p></div>
    <div class="grid">
      ${panel(
				'Countries',
				'Requests, by country',
				countries.length
					? `<div class="geo"><div class="geo__map">${worldMap(countries)}</div>${meterList(
							countries.map((c) => ({ label: c.key, count: c.count, mono: true, title: COUNTRY_NAMES[c.key] ?? c.key })),
							{ empty: '' },
						)}</div>`
					: emptyState(`No country with ${STATS_THRESHOLD} or more requests yet.`),
				'wide',
			)}
      ${panel('MCP usage', 'How agents use the MCP server', mcpUsage(stats))}
      ${panel('MCP clients', 'Sessions, by client name', meterList(items(clients), { tone: 'blue', empty: `No client with ${STATS_THRESHOLD} or more sessions yet.` }))}
    </div>
  </section>`;

	return `${head(origin, 'Public stats | ATMD', `<meta name="robots" content="noindex">\n<link rel="canonical" href="${origin}/stats">`)}${STATS_STYLES}</style>
</head>
<body>
${topBar(origin, 'stats')}
<main class="wrap">
  <section class="hero">
    <h1>Public stats</h1>
    <p class="lede">Anonymous counts of API requests and MCP tool calls. No IPs, handles, DIDs or record keys are stored.</p>
  </section>
  ${overview(stats)}
  ${requestsChart(stats)}
  ${calls}
  ${reads}
  ${health}
  ${who}
  <p class="note">Visits to this page and the home page are not counted.</p>
</main>
${footer(origin)}
<script>${COPY_SCRIPT}${CHART_SCRIPT}</script>
</body>
</html>
`;
}
