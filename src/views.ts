import type { Backlinks, LinkSource } from './constellation';
import { formatRecord } from './format';
import { renderLexiconBody } from './lexicon';
import type { ReposByCollection } from './relay';
import type { StatsSnapshot } from './stats';
import type { Actor, AtpRecord, PlcData, PlcLogEntry, PlcOperation } from './types';

export function formatRepo(origin: string, actor: Actor, collections: string[]): string {
	return [
		`# Repo: @${actor.handle}`,
		'',
		`**DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		'',
		'## Collections',
		'',
		...collections.map((c) => `- [\`${c}\`](${origin}/at://${actor.did}/${c})`),
		'',
		'---',
		`*Query any collection: \`${origin}/at://${actor.did}/{collection}\`*`,
	].join('\n');
}

export function formatRecordList(actor: Actor, collection: string, records: AtpRecord[], cursor?: string): string {
	const lines = [
		`# \`${collection}\``,
		`**Author:** @${actor.handle} | **DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		`**Records:** ${records.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!records.length) {
		lines.push('*No records found in this collection.*');
	} else {
		for (const rec of records) {
			const rkey = rec.uri.split('/').pop()!;
			lines.push(formatRecord(rec, { handle: actor.handle, collection, rkey, uri: rec.uri }));
			lines.push('\n---');
		}
	}

	lines.push('', `*Fetched from ${actor.pds} via \`com.atproto.repo.listRecords\`*`);
	return lines.join('\n');
}

export function formatSingleRecord(actor: Actor, collection: string, rkey: string, record: AtpRecord): string {
	const uri = `at://${actor.did}/${collection}/${rkey}`;
	return [
		`# Record`,
		`**Author:** @${actor.handle} (\`${actor.did}\`)`,
		'',
		formatRecord(record, { handle: actor.handle, collection, rkey, uri }),
		'',
		'---',
		`*Fetched from ${actor.pds} via \`com.atproto.repo.getRecord\`*`,
	].join('\n');
}

export function formatDiscovery(origin: string, collection: string, result: ReposByCollection): string {
	const { repos, cursor } = result;
	const lines = [
		`# Repos with \`${collection}\``,
		'',
		`Every repo on the network with at least one \`${collection}\` record.`,
		`**Repos (this page):** ${repos.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!repos.length) {
		lines.push('*No repos found for this collection.*');
	} else {
		for (const { did } of repos) {
			lines.push(`- [\`${did}\`](${origin}/at://${did}/${collection})`);
		}
	}

	if (cursor) {
		lines.push('', `**[Next page →](${origin}/discover/${collection}?cursor=${encodeURIComponent(cursor)})**`);
	}

	lines.push('', '---', `*Discovered via \`com.atproto.sync.listReposByCollection\` on the relay*`);
	return lines.join('\n');
}

export function formatBacklinkSources(origin: string, target: string, sources: LinkSource[]): string {
	const totalRecords = sources.reduce((n, s) => n + s.records, 0);
	const lines = [
		`# Backlinks to \`${target}\``,
		'',
		`Records across the network that link to this target.`,
		`**Total backlinks:** ${totalRecords} from ${sources.length} source${sources.length === 1 ? '' : 's'}`,
		'',
	];

	if (!sources.length) {
		lines.push('*No backlinks indexed for this target.*');
	} else {
		lines.push('| Source collection | Path | Records | Distinct DIDs |', '| --- | --- | --- | --- |');
		for (const s of sources) {
			const source = `${s.collection}:${s.path.replace(/^\./, '')}`;
			const link = `${origin}/backlinks/${target}?source=${encodeURIComponent(source)}`;
			lines.push(`| [\`${s.collection}\`](${link}) | \`${s.path}\` | ${s.records} | ${s.distinctDids} |`);
		}
	}

	lines.push('', '---', `*Indexed by [Constellation](https://constellation.microcosm.blue) — microcosm.blue*`);
	return lines.join('\n');
}

export function formatBacklinkRecords(origin: string, target: string, source: string, data: Backlinks): string {
	const { total, records, cursor } = data;
	const lines = [
		`# Backlinks: \`${source}\``,
		'',
		`Records from \`${source}\` linking to \`${target}\`.`,
		`**Total:** ${total} | **This page:** ${records.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!records.length) {
		lines.push('*No linking records found.*');
	} else {
		for (const r of records) {
			const uri = `at://${r.did}/${r.collection}/${r.rkey}`;
			lines.push(`- [\`${uri}\`](${origin}/at://${r.did}/${r.collection}/${r.rkey})`);
		}
	}

	if (cursor) {
		const next = `${origin}/backlinks/${target}?source=${encodeURIComponent(source)}&cursor=${encodeURIComponent(cursor)}`;
		lines.push('', `**[Next page →](${next})**`);
	}

	lines.push('', `**[← All backlink sources](${origin}/backlinks/${target})**`);
	lines.push('', '---', `*Indexed by [Constellation](https://constellation.microcosm.blue) — microcosm.blue*`);
	return lines.join('\n');
}

export function formatLexicon(origin: string, nsid: string, authority: string, actor: Actor, record: AtpRecord): string {
	const path = `at://${actor.did}/com.atproto.lexicon.schema/${nsid}`;
	return [
		`# Lexicon: \`${nsid}\``,
		'',
		`**Authority:** \`${authority}\` (via \`_lexicon.${authority}\` TXT)`,
		`**Published by:** \`${actor.did}\` ([@${actor.handle}](${origin}/at://${actor.did}))`,
		`**Schema record:** [\`${path}\`](${origin}/at://${actor.did}/com.atproto.lexicon.schema/${nsid})`,
		'',
		renderLexiconBody((record.value ?? {}) as Record<string, unknown>),
		'',
		'---',
		`*Resolved via \`_lexicon\` DNS TXT → \`com.atproto.lexicon.schema\` record*`,
	].join('\n');
}

export function formatResolution(origin: string, actor: Actor): string {
	const { doc } = actor;
	const aka = doc.alsoKnownAs ?? [];
	const services = doc.service ?? [];
	const keys = doc.verificationMethod ?? [];

	return [
		`# Identity: @${actor.handle}`,
		'',
		`**DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		'',
		'## Also Known As',
		...aka.map((a) => `- \`${a}\``),
		'',
		'## Services',
		...services.map((s) => `- **${s.id}** (\`${s.type}\`): ${s.serviceEndpoint}`),
		'',
		'## Verification Keys',
		...keys.map((k) => `- **${k.id}** (\`${k.type}\`)`),
		'',
		'---',
		`*Resolved via ${actor.did.startsWith('did:plc') ? 'PLC Directory' : 'did:web'}*`,
		`*[View repo \u2192](${origin}/at://${actor.did})*`,
	].join('\n');
}

// --- PLC audit log ---------------------------------------------------------

function opPds(op: PlcOperation): string | undefined {
	return op.services?.atproto_pds?.endpoint ?? op.service;
}

function opHandles(op: PlcOperation): string[] {
	if (op.alsoKnownAs?.length) return op.alsoKnownAs.map((a) => a.replace(/^at:\/\//, ''));
	if (op.handle) return [op.handle];
	return [];
}

function opSigningKey(op: PlcOperation): string | undefined {
	return op.verificationMethods?.atproto ?? op.signingKey;
}

interface PlcSnapshot {
	pds?: string;
	handles: string[];
	signingKey?: string;
	rotationKeys: string[];
}

function snapshotOf(op: PlcOperation): PlcSnapshot {
	return {
		pds: opPds(op),
		handles: opHandles(op),
		signingKey: opSigningKey(op),
		rotationKeys: op.rotationKeys ?? [],
	};
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function formatAuditLog(origin: string, did: string, handle: string, log: PlcLogEntry[]): string {
	const active = log.filter((e) => !e.nullified);
	const nullifiedCount = log.length - active.length;

	const first = log[0]?.createdAt?.slice(0, 10);
	const last = active[active.length - 1]?.createdAt?.slice(0, 10) ?? log[log.length - 1]?.createdAt?.slice(0, 10);

	const lines = [
		`# PLC Audit Log: @${handle}`,
		'',
		`**DID:** \`${did}\``,
		`**Operations:** ${log.length}${nullifiedCount ? ` (${active.length} active, ${nullifiedCount} nullified)` : ''}`,
	];
	if (first) lines.push(`**Created:** ${first}`);
	if (last && last !== first) lines.push(`**Last updated:** ${last}`);
	lines.push('', '## Timeline', '');

	if (!log.length) {
		lines.push('*No operations found in the PLC audit log.*');
		return lines.join('\n');
	}

	let prev: PlcSnapshot | null = null;
	log.forEach((entry, i) => {
		const op = entry.operation;
		const snap = snapshotOf(op);
		const changes: string[] = [];
		const labels: string[] = [];

		if (op.type === 'plc_tombstone') {
			labels.push('Tombstone 🪦');
			changes.push('Identity deactivated (tombstoned).');
		} else if (!prev) {
			labels.push('Genesis');
			if (snap.pds) changes.push(`**PDS:** ${snap.pds}`);
			if (snap.handles.length) changes.push(`**Handle:** ${snap.handles.map((h) => `\`${h}\``).join(', ')}`);
			if (snap.signingKey) changes.push(`**Signing key:** \`${snap.signingKey}\``);
		} else {
			if (snap.pds !== prev.pds) {
				labels.push('PDS migration 🔀');
				changes.push(`**PDS:** ${snap.pds ?? '—'} *(was ${prev.pds ?? '—'})*`);
			}
			if (!sameSet(snap.handles, prev.handles)) {
				labels.push('Handle change');
				changes.push(`**Handle:** ${snap.handles.map((h) => `\`${h}\``).join(', ') || '—'} *(was ${prev.handles.map((h) => `\`${h}\``).join(', ') || '—'})*`);
			}
			if (snap.signingKey !== prev.signingKey) {
				labels.push('Key rotation 🔑');
				changes.push(`**Signing key:** \`${snap.signingKey ?? '—'}\` *(rotated)*`);
			}
			if (!sameSet(snap.rotationKeys, prev.rotationKeys)) {
				if (!labels.includes('Key rotation 🔑')) labels.push('Key rotation 🔑');
				changes.push(`**Rotation keys updated** (${snap.rotationKeys.length} key${snap.rotationKeys.length === 1 ? '' : 's'})`);
			}
		}

		if (!labels.length) labels.push('No-op');
		if (!changes.length) changes.push('*No effective change (re-signed / no-op).*');

		const ts = entry.createdAt.replace(/\.\d+Z$/, 'Z');
		const heading = `### ${i + 1}. ${ts} — ${labels.join(' + ')}`;
		lines.push(entry.nullified ? `${heading} ⚠️ *nullified*` : heading);
		lines.push(...changes.map((c) => `- ${c}`));
		lines.push(`- \`${op.type}\` · CID \`${entry.cid}\``);
		lines.push('');

		if (op.type !== 'plc_tombstone') prev = snap;
	});

	lines.push('---', `*Audit log from [plc.directory](https://plc.directory/${did}/log/audit)*`, `*[View identity →](${origin}/resolve/${did})*`);
	return lines.join('\n');
}

export function formatPlcData(origin: string, did: string, handle: string, data: PlcData): string {
	const pds = data.services?.atproto_pds?.endpoint;
	const handles = (data.alsoKnownAs ?? []).map((a) => a.replace(/^at:\/\//, ''));
	const methods = Object.entries(data.verificationMethods ?? {});
	const rotationKeys = data.rotationKeys ?? [];
	const otherServices = Object.entries(data.services ?? {}).filter(([id]) => id !== 'atproto_pds');

	const lines = [
		`# PLC Data: @${handle}`,
		'',
		`**DID:** \`${did}\``,
		'',
		'The current canonical identity state held by plc.directory — the materialized result of all operations.',
		'',
		'## PDS',
		pds ? pds : '*No PDS service registered.*',
		'',
		'## Handles',
		...(handles.length ? handles.map((h) => `- \`${h}\``) : ['*None.*']),
		'',
		'## Verification methods',
		...(methods.length ? methods.map(([id, key]) => `- **${id}:** \`${key}\``) : ['*None.*']),
		'',
		'## Rotation keys',
		'*In priority order — earlier keys can override operations signed by later ones.*',
		...(rotationKeys.length ? rotationKeys.map((k, i) => `${i + 1}. \`${k}\``) : ['*None.*']),
	];

	if (otherServices.length) {
		lines.push('', '## Other services', ...otherServices.map(([id, s]) => `- **${id}** (\`${s.type}\`): ${s.endpoint}`));
	}

	lines.push(
		'',
		'---',
		`*Current state from [plc.directory](https://plc.directory/${did}/data)*`,
		`*[Full history →](${origin}/plc/audit/${did})* · *[Identity →](${origin}/resolve/${did})*`,
	);
	return lines.join('\n');
}

export function formatPlcLastOp(origin: string, did: string, handle: string, op: PlcOperation): string {
	const snap = snapshotOf(op);
	const lines = [
		`# PLC Last Operation: @${handle}`,
		'',
		`**DID:** \`${did}\``,
		`**Type:** \`${op.type}\``,
		`**Previous op:** ${op.prev ? `\`${op.prev}\`` : '*genesis (none)*'}`,
		'',
		'The most recent operation in this identity\'s PLC log, and the state it established.',
		'',
		'## Resulting state',
	];

	if (op.type === 'plc_tombstone') {
		lines.push('- *Identity deactivated (tombstoned).*');
	} else {
		lines.push(`- **PDS:** ${snap.pds ?? '—'}`);
		lines.push(`- **Handle:** ${snap.handles.map((h) => `\`${h}\``).join(', ') || '—'}`);
		lines.push(`- **Signing key:** \`${snap.signingKey ?? '—'}\``);
		lines.push(`- **Rotation keys:** ${snap.rotationKeys.length}`);
	}

	lines.push(
		'',
		'---',
		`*Latest operation from [plc.directory](https://plc.directory/${did}/log/last). For timestamps and prior operations, see the [full audit log →](${origin}/plc/audit/${did}).*`,
	);
	return lines.join('\n');
}

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

export const CHANNEL_LABELS: Record<string, string> = { http: 'HTTP (markdown)', mcp: 'MCP (tools)' };

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
	lines.push(`**MD bytes served:** ${bytesHuman(stats.bytes)} (~${abbrevNum(stats.estTokens)} est. MD tokens)`);
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

	// Collections with rich/generic annotation.
	if (stats.collections.length) {
		lines.push('## Most queried collections', '');
		lines.push(
			`*${fmtNum(stats.distinctCollections)} distinct · ${fmtNum(stats.richTotal)} queries to richly-formatted, ${fmtNum(stats.genericTotal)} to generic.*`,
			'',
		);
		lines.push('| Collection | Formatter | Queries |', '| --- | --- | --- |');
		for (const c of stats.collections) {
			lines.push(`| [\`${c.nsid}\`](${origin}/discover/${c.nsid}) | ${c.rich ? 'rich' : 'generic'} | ${fmtNum(c.count)} |`);
		}
		lines.push('');
	}

	lines.push(
		...countTable(
			'Collections needing a formatter',
			'Collection',
			stats.needsFormatter.map((c) => ({ key: c.nsid, count: c.count })),
			(k) => k,
			(k) => `${origin}/discover/${k}`,
		),
	);
	lines.push(...countTable('MCP clients', 'Client', stats.clients.filter((c) => c.count >= STATS_THRESHOLD)));
	lines.push(...countTable('Countries', 'Country', stats.countries.filter((c) => c.count >= STATS_THRESHOLD)));
	lines.push(...countTable('Latency distribution', 'Bucket', stats.latency.buckets));

	lines.push('---', footer);
	return lines.join('\n');
}

export function indexPage(origin: string): string {
	return `# atproto.md

A read-only, markdown-first API for exploring the full AT Protocol ecosystem.
Works with **any collection on any PDS** — first-party Bluesky or third-party lexicons.

---

## URL Structure

URLs accept \`at://\` URIs directly in the path:

\`\`\`
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}

GET ${origin}/at://alice.bsky.social
GET ${origin}/at://alice.bsky.social/com.whtwnd.blog.entry
\`\`\`

---

## Endpoints

### \`GET ${origin}/resolve/{actor}\`
Full identity chain: handle → DID → DID document → PDS endpoint.

### \`GET ${origin}/plc/audit/{actor}\` &nbsp;\`NEW\`
PLC audit log for a \`did:plc\` identity — the full chronological history from plc.directory,
with PDS migrations, handle changes, and key rotations called out. E.g.
[\`/plc/audit/bsky.app\`](${origin}/plc/audit/bsky.app).

### \`GET ${origin}/plc/data/{actor}\` &nbsp;\`NEW\`
Current canonical PLC state — active PDS, handles, signing key, and the rotation keys that
control the identity. E.g. [\`/plc/data/bsky.app\`](${origin}/plc/data/bsky.app).

### \`GET ${origin}/plc/last/{actor}\` &nbsp;\`NEW\`
The most recent PLC operation and the state it established. E.g.
[\`/plc/last/bsky.app\`](${origin}/plc/last/bsky.app).

### \`GET ${origin}/at://{actor}\`
Repo overview. Lists all collections present in the repo.

### \`GET ${origin}/at://{actor}/{collection}\`
List records in any collection on any PDS.

**Query params:**
- \`limit\` — Records per page (default: 25, max: 100)
- \`cursor\` — Pagination cursor
- \`reverse\` — \`true\` for oldest-first

### \`GET ${origin}/at://{actor}/{collection}/{rkey}\`
Fetch a single record by rkey.

### \`GET ${origin}/lexicon/{nsid}\` &nbsp;\`NEW\`
Resolve a Lexicon schema by its NSID via DNS-based lexicon resolution
(\`_lexicon\` TXT → DID → \`com.atproto.lexicon.schema\` record).
E.g. [\`/lexicon/app.bsky.feed.post\`](${origin}/lexicon/app.bsky.feed.post).

### \`GET ${origin}/discover/{collection}\` &nbsp;\`NEW\`
Discover every repo on the network with records in a collection — find all users
of a lexicon, e.g. [\`/discover/site.standard.document\`](${origin}/discover/site.standard.document).

**Query params:**
- \`limit\` — Repos per page (default: 100, max: 2000)
- \`cursor\` — Pagination cursor

### \`GET ${origin}/backlinks/{at-uri-or-did-or-url}\` &nbsp;\`NEW\`
Find records across the network that link to a target — likes, reposts, replies,
follows, quotes, or any custom lexicon. Without \`source\`, returns a summary of every
link source with counts.

**Query params:**
- \`source\` — A \`{collection:path}\` selector (e.g. \`app.bsky.feed.like:subject.uri\`) to list the actual linking records
- \`limit\` — Linking records per page (default: 50, max: 100)
- \`cursor\` — Pagination cursor

---

## Rich formatting for known collections

| Collection                                      | Notes                              |
| ----------------------------------------------- | ---------------------------------- |
| \`app.bsky.feed.post\`                            | Text, embeds, reply context        |
| \`app.bsky.actor.profile\`                        | Bio, display name                  |
| \`app.bsky.graph.follow/block/list/listitem\`     | Subjects, timestamps               |
| \`app.bsky.feed.like/repost/generator\`           | Subjects, timestamps               |
| \`app.bsky.labeler.service\`                      | Label policies                     |
| \`site.standard.publication\`                     | Name, URL, description             |
| \`site.standard.document\`                        | Title, content, published date     |
| \`pub.leaflet.publication/document\`              | Name, URL, content from pages      |
| \`app.offprint.publication/document.article\`     | References to standard records     |
| \`blog.pckt.publication\`                         | Reference to standard record       |
| \`link.woosh.linkPage\`                           | Description, labeled link sections |
| \`blue.linkat.entry\`                             | Title, URL, description            |
| \`events.smokesignal.calendar.event\`             | Name, dates, location              |
| *Any other collection*                          | Generic key-value markdown         |

---

## For LLM agents

- **[\`/skill.md\`](${origin}/skill.md)** — Full agent skill sheet with usage triggers, examples, and endpoint reference
- **[\`/llms.txt\`](${origin}/llms.txt)** — Structured API summary for LLM discovery
- **[\`/stats\`](${origin}/stats)** — Anonymous usage stats: route + MCP-tool hits and most-queried collections (no user data)
- **\`/mcp\`** — MCP server endpoint. Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`

### Install as a Claude Code command

Drop the skill sheet into your Claude Code commands so you can invoke it with \`/atproto\`:

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`

---

## Contributing

Missing a collection formatter? [Open an issue](https://tangled.org/socialde.pt/atproto.md/issues) or [contribute a formatter](https://tangled.org/socialde.pt/atproto.md/) — adding one is just a few lines of TypeScript.

---

*Data fetched directly from AT Protocol PDSes via \`com.atproto.repo.*\`*
*Network discovery via the relay's \`com.atproto.sync.listReposByCollection\`.*
*Backlinks indexed by [Constellation](https://constellation.microcosm.blue) (microcosm.blue).*
*No authentication. Public data only.*
`;
}
