import type { StatsSnapshot } from './stats';

// --- Usage stats -----------------------------------------------------------

export const fmtNum = (n: number): string => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Compact number: full digits (with thousands separators) up to 10K, then an abbreviated
// unit with up to 3 decimals and no trailing zeros — 10.192K, 1.45M, 15K, 12.912B. Used for
// large derived counts like est. tokens.
export function abbrevNum(n: number): string {
	if (n < 10_000) return fmtNum(n);
	const units: [number, string][] = [
		[1e12, 'T'],
		[1e9, 'B'],
		[1e6, 'M'],
		[1e3, 'K'],
	];
	for (const [div, unit] of units) {
		if (n >= div) return `${(n / div).toFixed(3).replace(/\.?0+$/, '')}${unit}`;
	}
	return fmtNum(n);
}

const ROUTE_LABELS: Record<string, string> = {
	home: '/',
	resolve: '/resolve/{actor}',
	repo: '/at://{actor}',
	records: '/at://{actor}/{collection}',
	record: '/at://{actor}/{collection}/{rkey}',
	get: '/get?uri=',
	discover: '/discover/{collection}',
	lexicon: '/lexicon/{nsid}',
	backlinks: '/backlinks/{target}',
	'plc/audit': '/plc/audit/{actor}',
	'plc/data': '/plc/data/{actor}',
	'plc/last': '/plc/last/{actor}',
	'llms.txt': '/llms.txt',
	'skill.md': '/skill.md',
	stats: '/stats',
	other: '(other)',
};

export const routeLabel = (key: string): string => ROUTE_LABELS[key] ?? `/${key}`;

export const CHANNEL_LABELS: Record<string, string> = { http: 'HTTP', mcp: 'MCP (tools)' };

const ID_LABELS: Record<string, string> = { handle: 'handle', plc: 'did:plc', web: 'did:web' };
const STATS_THRESHOLD = 5; // hide country/client buckets below this so a rare one can't deanonymize

function bytesHuman(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function sparkline(counts: number[]): string {
	if (!counts.length) return '';
	const blocks = '▁▂▃▄▅▆▇█';
	const max = Math.max(...counts, 1);
	return counts.map((c) => blocks[Math.min(7, Math.round((c / max) * 7))]).join('');
}

// A markdown table for a `[{key,count}]` list, with optional label + link transforms. Empty → ''.
function countTable(
	title: string,
	col: string,
	items: { key: string; count: number }[],
	label: (k: string) => string = (k) => k,
	link?: (k: string) => string,
): string[] {
	if (!items.length) return [];
	const lines = [`## ${title}`, '', `| ${col} | Count |`, '| --- | --- |'];
	for (const i of items) {
		const name = link ? `[\`${label(i.key)}\`](${link(i.key)})` : `\`${label(i.key)}\``;
		lines.push(`| ${name} | ${fmtNum(i.count)} |`);
	}
	lines.push('');
	return lines;
}

export function formatStats(origin: string, stats: StatsSnapshot | null): string {
	const footer =
		'*Only anonymous route names, MCP tool names, lexicon NSIDs, status codes, coarse country, and aggregate timing are counted — never IPs, handles, DIDs, or record keys. Country & client rows below a small threshold are hidden.*';

	if (!stats || stats.total === 0) {
		return ['# atproto.md — usage stats', '', '*No requests recorded yet.*', '', '---', footer].join('\n');
	}

	const pct = (n: number): string => `${((n / stats.total) * 100).toFixed(1)}%`;
	const lines = ['# atproto.md — usage stats', '', `**Total requests:** ${fmtNum(stats.total)}`];
	if (stats.since) lines.push(`**Counting since:** ${stats.since.slice(0, 10)}`);
	lines.push(`**Errors:** ${fmtNum(stats.errors)} (${pct(stats.errors)})`);
	lines.push(`**MCP sessions:** ${fmtNum(stats.sessions)}`);
	lines.push(`**Bytes served:** ${bytesHuman(stats.bytes)} (~${abbrevNum(stats.estTokens)} est. tokens)`);
	lines.push('');

	// Requests over time (sparkline).
	if (stats.daily.length) {
		const peak = Math.max(...stats.daily.map((d) => d.count));
		lines.push('## Requests over time', '');
		lines.push(`\`${sparkline(stats.daily.map((d) => d.count))}\``);
		lines.push('', `*${stats.daily[0].day} → ${stats.daily[stats.daily.length - 1].day} · peak ${fmtNum(peak)}/day*`, '');
	}

	// Latency.
	if (stats.latency.count) {
		const l = stats.latency;
		lines.push('## Latency', '', `**Average:** ${fmtNum(l.avgMs)}ms · **p50:** ${l.p50} · **p95:** ${l.p95} · ${fmtNum(l.count)} samples`);
		lines.push('*Approximate — the Workers clock advances only across I/O.*', '');
	}

	lines.push('## By channel', '', '| Channel | Requests | Share |', '| --- | --- | --- |');
	for (const c of stats.channels) lines.push(`| ${CHANNEL_LABELS[c.key] ?? c.key} | ${fmtNum(c.count)} | ${pct(c.count)} |`);
	lines.push('');

	lines.push(...countTable('HTTP routes', 'Route', stats.routes, routeLabel));
	lines.push(...countTable('MCP tools', 'Tool', stats.tools));
	lines.push(...countTable('Identifier type', 'Type', stats.idTypes, (k) => ID_LABELS[k] ?? k));
	lines.push(...countTable('Pagination & params', 'Param', stats.params));
	lines.push(...countTable('Backlink selectors', 'Selector', stats.selectors));
	lines.push(...countTable('Status codes', 'Status', stats.statuses));
	lines.push(...countTable('Errors by route', 'Route', stats.errorRoutes));
	lines.push(...countTable('Upstream failures', 'Upstream', stats.upstreams));
	lines.push(...countTable('Top authorities', 'Authority', stats.authorities));

	if (stats.collections.length) {
		lines.push('## Most queried collections', '', `*${fmtNum(stats.distinctCollections)} distinct collections queried.*`, '');
		lines.push('| Collection | Queries |', '| --- | --- |');
		for (const c of stats.collections) lines.push(`| [\`${c.nsid}\`](${origin}/discover/${c.nsid}) | ${fmtNum(c.count)} |`);
		lines.push('');
	}
	lines.push(...countTable('MCP clients', 'Client', stats.clients.filter((c) => c.count >= STATS_THRESHOLD)));
	lines.push(...countTable('Countries', 'Country', stats.countries.filter((c) => c.count >= STATS_THRESHOLD)));
	lines.push(...countTable('Latency distribution', 'Bucket', stats.latency.buckets));

	lines.push('---', footer);
	return lines.join('\n');
}

export function indexPage(origin: string): string {
	return `# atproto.md

A read-only AT Protocol API for agents. Every data route returns one JSON object as application/json.
Records are raw JSON, exactly as the PDS stores them, with direct blob URLs. Any collection on any PDS.

Add \`?pretty\` to indent the JSON.

## Records

\`\`\`
GET ${origin}/at://{actor}                                  DID, handle, PDS, DID document, collections
GET ${origin}/at://{actor}/{collection}                     records, newest first
GET ${origin}/at://{actor}/{collection}/{rkey}              one record
GET ${origin}/get?uri={address}&uri={address}               up to 25 records in one call
\`\`\`

- \`{actor}\` is a handle or DID. A \`{address}\` is an at:// record URI or a web link: Bluesky-style clients (bsky.app, deer.social, blacksky.community and others), explorers (pdsls.dev, atp.tools, atproto.at) or any page that publishes its AT URI with at-tags (at:canonical).
- Lists take \`limit\` (25 by default, 100 at most), \`cursor\` and \`reverse\` (oldest first).
- \`expand\` on any record route also returns the records they reference (reply parent and root, quoted post,
  like or repost subject), one level deep, under \`expanded\`.

## Identity

\`\`\`
GET ${origin}/resolve/{actor}                               same as /at://{actor}
GET ${origin}/plc/data/{actor}                              current PLC state, with rotation keys
GET ${origin}/plc/audit/{actor}                             full PLC operation log
GET ${origin}/plc/last/{actor}                              latest PLC operation
\`\`\`

## Network

\`\`\`
GET ${origin}/discover/{collection}                         every repo with records in a collection
GET ${origin}/lexicon/{nsid}                                the published Lexicon schema
GET ${origin}/backlinks/{at-uri-or-did-or-url}              who links to a target, by source
GET ${origin}/backlinks/{target}?source={collection:path}   the linking record URIs
GET ${origin}/backlinks/{target}?source=...&hydrate         the linking records themselves
\`\`\`

\`discover\` takes \`limit\` (100 by default, 2000 at most) and \`cursor\`. Backlinks take \`limit\` and \`cursor\`.

## Errors

Errors are JSON too: \`{"error": "...", "status": 404}\`, with the same HTTP status.

## For agents

- MCP server at \`${origin}/mcp\`, with the tools resolve, get, list_records, backlinks, discover and lexicon.
  Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`
- [\`/skill.md\`](${origin}/skill.md): the skill sheet. Save it as a command with \`curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md\`
- [\`/llms.txt\`](${origin}/llms.txt): the API summary
- [\`/stats\`](${origin}/stats): anonymous usage counts

Records come from each account's own PDS, discovery from the relay, and backlinks from [Constellation](https://constellation.microcosm.blue). Public data only.
`;
}
