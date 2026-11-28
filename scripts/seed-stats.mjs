// Copies the public stats of the live site into the local dev server's stats, so the stats page can be checked
// against real data: long names, large counts and hundreds of rows. It reads https://atproto.md/stats as markdown and
// as HTML (for the per-day split and the MCP clients), rebuilds the counters, and writes them into the local
// StatsDO's SQLite file under .wrangler, after keeping a copy of the file beside it. Only what the public page shows is
// copied, so rows the page hides (countries and clients under the threshold) are left out.
//
// Usage: npm run stats:seed [-- https://atproto.md]
import { execFileSync } from 'node:child_process';
import { copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.argv[2] ?? 'https://atproto.md';

const get = async (accept) => {
	const res = await fetch(`${site}/stats`, { headers: { Accept: accept } });
	if (!res.ok) throw new Error(`${site}/stats answered ${res.status}`);
	return res.text();
};
const [md, html] = await Promise.all([get('text/markdown'), get('text/html')]);

const num = (s) => Number(String(s).replace(/[^\d.]/g, ''));
const header = (label) => {
	const m = md.match(new RegExp(`\\*\\*${label}:\\*\\* ([^\\n]+)`));
	if (!m) throw new Error(`No "${label}" line in the markdown stats`);
	return m[1];
};
// A markdown table's rows under a heading, as [first cell without code or link marks, count].
const table = (heading) => {
	const at = md.indexOf(`## ${heading}\n`);
	if (at < 0) return [];
	const block = md.slice(at).split('\n## ')[0];
	return [...block.matchAll(/^\| (.+?) \| ([\d,]+) \|/gm)]
		.map(([, cell, count]) => [cell.replace(/^\[`?|`?\]\(.*\)$/g, '').replace(/`/g, ''), num(count)])
		.filter(([cell]) => !/^-+$/.test(cell));
};

// Route labels back to the keys the counters use, from the same table the site renders them with.
const views = readFileSync(join(root, 'src/views.ts'), 'utf8');
const labels = views.slice(views.indexOf('const ROUTE_LABELS'), views.indexOf('};', views.indexOf('const ROUTE_LABELS')));
const routeKey = new Map([...labels.matchAll(/\s'?([\w./-]+)'?: '([^']+)'/g)].map(([, key, label]) => [label, key]));
const keyOf = (label) => routeKey.get(label) ?? label.replace(/^\//, '');
const ID_KEYS = { handle: 'handle', 'did:plc': 'plc', 'did:web': 'web' };
const CHANNELS = { HTTP: 'http', 'MCP (tools)': 'mcp' };
const LAT = {
	'< 50ms': 'lat:<50',
	'< 100ms': 'lat:<100',
	'< 250ms': 'lat:<250',
	'< 500ms': 'lat:<500',
	'< 1000ms': 'lat:<1000',
	'< 2500ms': 'lat:<2500',
	'≥ 2500ms': 'lat:>=2500',
};

const counters = new Map();
const add = (key, n) => counters.set(key, (counters.get(key) ?? 0) + n);
add('total', num(header('Total requests')));
add('errors', num(header('Errors').split('(')[0]));
add('mcp:sessions', num(header('MCP sessions')));
const [size, unit] = header('Bytes served').split(' ');
add('bytes:sum', Math.round(Number(size) * { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[unit]));
for (const [label, n] of table('By channel')) add(`channel:${CHANNELS[label] ?? label}`, n);
for (const [label, n] of table('HTTP routes')) add(`route:${keyOf(label)}`, n);
for (const [name, n] of table('MCP tools')) add(`tool:${name}`, n);
for (const [label, n] of table('Identifier type')) add(`idtype:${ID_KEYS[label] ?? label}`, n);
for (const [name, n] of table('Pagination & params')) add(`param:${name}`, n);
for (const [sel, n] of table('Backlink selectors')) add(`sel:${sel}`, n);
for (const [code, n] of table('Status codes')) add(`status:${code}`, n);
for (const [label, n] of table('Errors by route')) add(`errroute:${keyOf(label)}`, n);
for (const [name, n] of table('Upstream failures')) add(`upstream:${name}`, n);
for (const [name, n] of table('Top authorities')) add(`authority:${name}`, n);
for (const [code, n] of table('Countries')) add(`country:${code}`, n);
for (const [bucket, n] of table('Latency distribution')) if (LAT[bucket]) add(LAT[bucket], n);
const latency = header('Average').match(/([\d,]+)ms .* ([\d,]+) samples/);
if (latency) {
	add('lat:count', num(latency[2]));
	add('lat:sum', num(latency[1]) * num(latency[2]));
}
// The MCP clients only appear on the HTML page, as a meter list in their panel.
const clientsPanel = html.split('<h3>MCP clients</h3>')[1]?.split('</ol>')[0] ?? '';
for (const [, name, n] of clientsPanel.matchAll(
	/<span class="m__label[^"]*"[^>]*>([^<]+)<\/span>.*?<span class="m__num" title="([\d,]+)"/g,
)) {
	add(`client:${name.replace(/<wbr>/g, '')}`, num(n));
}

const collections = table('Most queried collections');
const distinct = num(md.match(/\*(\d[\d,]*) distinct collections/)?.[1] ?? collections.length);
// The page lists the top collections only. The rest are filled in with one query each, so the distinct count matches.
for (let i = collections.length; i < distinct; i++) collections.push([`seed.filler.collection${i}`, 1]);

// The 30 day chart: one column per day, from the first date in the markdown's range line.
const start = md.match(/\*(\d{4}-\d{2}-\d{2}) → \d{4}-\d{2}-\d{2}/)?.[1];
const cols = [...html.split('data-range="30"')[1].matchAll(/data-http="(\d+)" data-mcp="(\d+)" data-earlier="(\d+)" data-errors="(\d+)"/g)];
const day = (i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
const daily = cols
	.map(([, http, mcp, earlier, errors], i) => [day(i), +http + +mcp + +earlier, +http, +mcp, +errors])
	.filter((d) => d[1] > 0);
const since = header('Counting since').trim();

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = [
	'BEGIN;',
	'DELETE FROM counters; DELETE FROM collections; DELETE FROM daily; DELETE FROM meta;',
	...[...counters].map(([k, n]) => `INSERT INTO counters (key, count) VALUES (${q(k)}, ${n});`),
	...collections.map(([nsid, n]) => `INSERT INTO collections (nsid, count) VALUES (${q(nsid)}, ${n});`),
	...daily.map(
		([d, count, http, mcp, errors]) =>
			`INSERT INTO daily (day, count, http, mcp, errors) VALUES (${q(d)}, ${count}, ${http}, ${mcp}, ${errors});`,
	),
	`INSERT INTO meta (key, value) VALUES ('since', ${q(`${since}T00:00:00.000Z`)});`,
	'COMMIT;',
].join('\n');

const dir = join(root, '.wrangler/state/v3/do/atproto-md-StatsDO');
const file = readdirSync(dir).find((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite');
if (!file) throw new Error('No local stats yet. Start the dev server and open /stats once, then run this again.');
const db = join(dir, file);
copyFileSync(db, `${db}.before-seed`);
const script = join(tmpdir(), `atproto-md-seed-${process.pid}.sql`);
writeFileSync(script, sql);
execFileSync('sqlite3', [db, `.read ${script}`]);
console.log(
	`Seeded local stats from ${site}: ${counters.size} counters, ${collections.length} collections, ${daily.length} days. The previous stats are in ${file}.before-seed.`,
);
