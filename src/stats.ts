import { DurableObject } from 'cloudflare:workers';
import { getFormatter } from './formatters/registry';

export type Channel = 'http' | 'mcp';

export interface StatEvent {
	channel: Channel;
	key: string; // namespaced counter, e.g. `route:resolve` or `tool:list_records`
	collection?: string; // a lexicon NSID, when the request targets one (never user-specific)
	rich?: boolean; // whether that collection has a dedicated formatter
	isError?: boolean;
	status?: number; // HTTP status of the response
	upstream?: string; // failed dependency: pds, plc, relay, constellation, lexicon, …
	idType?: string; // identifier as entered: handle | plc | web
	selector?: string; // backlink `collection:path` selector
	flags?: string[]; // e.g. ['param:cursor', 'param:source']
	country?: string; // ISO-3166 country (http only, coarse, threshold-gated on display)
	bytes?: number; // response body size
	latencyMs?: number; // wall time for the request
	day: string; // YYYY-MM-DD (caller-supplied; the DO avoids Date itself)
	now: string; // ISO timestamp
}

export interface StatCount {
	key: string;
	count: number;
}

export interface CollectionStat {
	nsid: string;
	count: number;
	rich: boolean;
}

export interface LatencyStat {
	count: number;
	avgMs: number;
	p50: string;
	p95: string;
	buckets: StatCount[];
}

export interface StatsSnapshot {
	total: number;
	errors: number;
	since: string | null;
	bytes: number;
	avgBytes: number;
	estTokens: number;
	sessions: number;
	distinctCollections: number;
	richTotal: number;
	genericTotal: number;
	channels: StatCount[];
	routes: StatCount[];
	tools: StatCount[];
	statuses: StatCount[];
	errorRoutes: StatCount[];
	upstreams: StatCount[];
	authorities: StatCount[];
	idTypes: StatCount[];
	params: StatCount[];
	selectors: StatCount[];
	clients: StatCount[];
	countries: StatCount[];
	collections: CollectionStat[];
	needsFormatter: CollectionStat[];
	daily: { day: string; count: number }[];
	latency: LatencyStat;
}

const TOP_COLLECTIONS = 25;
const TOP_NEEDS_FORMATTER = 15;
const DAILY_DAYS = 30;

// Latency histogram: upper edges in ms. A sample lands in the first bucket it's below.
const LAT_EDGES = [50, 100, 250, 500, 1000, 2500];
const latBucketKey = (ms: number): string => {
	for (const edge of LAT_EDGES) if (ms < edge) return `lat:<${edge}`;
	return 'lat:>=2500';
};
const LAT_KEYS = [...LAT_EDGES.map((e) => `lat:<${e}`), 'lat:>=2500'];
const latLabel = (key: string): string => key.replace('lat:', '').replace('<', '< ').replace('>=', '≥ ') + 'ms';

// A single global Durable Object aggregates anonymous usage counters. Requests to one DO
// instance are serialized, so the read-modify-write increments below never race. Privacy:
// only route/tool names, lexicon NSIDs, status codes, coarse country, and aggregate timing
// are stored — never IPs, handles, DIDs, record keys, or anything identifying a visitor.
export class StatsDO extends DurableObject {
	private sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)`);
		this.sql.exec(
			`CREATE TABLE IF NOT EXISTS collections (nsid TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, rich INTEGER NOT NULL DEFAULT 0)`,
		);
		this.sql.exec(`CREATE TABLE IF NOT EXISTS daily (day TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)`);
		this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);

		// Self-heal: add `rich` to a pre-existing collections table (e.g. local dev state from
		// before this column existed). On a fresh deploy the CREATE above already includes it.
		const hasRich = [...this.sql.exec(`PRAGMA table_info(collections)`)].some((c) => c.name === 'rich');
		if (!hasRich) this.sql.exec(`ALTER TABLE collections ADD COLUMN rich INTEGER NOT NULL DEFAULT 0`);
	}

	private add(key: string, n: number): void {
		this.sql.exec(`INSERT INTO counters (key, count) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET count = count + ?`, key, n, n);
	}

	private bump(key: string): void {
		this.add(key, 1);
	}

	private since(now: string): void {
		this.sql.exec(`INSERT INTO meta (key, value) VALUES ('since', ?) ON CONFLICT(key) DO NOTHING`, now);
	}

	record(event: StatEvent): void {
		this.bump('total');
		this.bump(`channel:${event.channel}`);
		this.bump(event.key);
		this.sql.exec(`INSERT INTO daily (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1`, event.day);

		if (event.status) this.bump(`status:${event.status}`);
		if (event.isError) {
			this.bump('errors');
			this.bump(`errroute:${event.key.replace(/^(route|tool):/, '')}`);
		}
		if (event.upstream) this.bump(`upstream:${event.upstream}`);
		if (event.idType) this.bump(`idtype:${event.idType}`);
		if (event.selector) this.bump(`sel:${event.selector}`);
		for (const flag of event.flags ?? []) this.bump(flag);
		if (event.country) this.bump(`country:${event.country}`);

		if (typeof event.latencyMs === 'number') {
			this.bump(latBucketKey(event.latencyMs));
			this.add('lat:sum', Math.round(event.latencyMs));
			this.bump('lat:count');
		}
		if (typeof event.bytes === 'number') this.add('bytes:sum', event.bytes);

		if (event.collection) {
			this.sql.exec(
				`INSERT INTO collections (nsid, count, rich) VALUES (?, 1, ?) ON CONFLICT(nsid) DO UPDATE SET count = count + 1, rich = ?`,
				event.collection,
				event.rich ? 1 : 0,
				event.rich ? 1 : 0,
			);
			const authority = event.collection.split('.').slice(0, 2).join('.');
			if (authority.includes('.')) this.bump(`authority:${authority}`);
		}

		this.since(event.now);
	}

	session(client: string | undefined, now: string): void {
		this.bump('mcp:sessions');
		if (client) this.bump(`client:${client.slice(0, 64)}`);
		this.since(now);
	}

	snapshot(): StatsSnapshot {
		const counter = (key: string): number => {
			const rows = [...this.sql.exec(`SELECT count FROM counters WHERE key = ?`, key)];
			return rows.length ? Number(rows[0].count) : 0;
		};
		const prefixed = (prefix: string): StatCount[] =>
			[...this.sql.exec(`SELECT key, count FROM counters WHERE key LIKE ? ORDER BY count DESC`, `${prefix}%`)].map((r) => ({
				key: String(r.key).slice(prefix.length),
				count: Number(r.count),
			}));

		const total = counter('total');
		const bytes = counter('bytes:sum');

		const collRows = [
			...this.sql.exec(`SELECT nsid, count, rich FROM collections ORDER BY count DESC LIMIT ?`, TOP_COLLECTIONS),
		].map((r) => ({ nsid: String(r.nsid), count: Number(r.count), rich: Number(r.rich) === 1 }));
		const needsFormatter = [
			...this.sql.exec(`SELECT nsid, count FROM collections WHERE rich = 0 ORDER BY count DESC LIMIT ?`, TOP_NEEDS_FORMATTER),
		].map((r) => ({ nsid: String(r.nsid), count: Number(r.count), rich: false }));
		const distinctCollections = Number([...this.sql.exec(`SELECT COUNT(*) AS n FROM collections`)][0]?.n ?? 0);
		const richTotal = Number([...this.sql.exec(`SELECT COALESCE(SUM(count),0) AS n FROM collections WHERE rich = 1`)][0]?.n ?? 0);
		const genericTotal = Number([...this.sql.exec(`SELECT COALESCE(SUM(count),0) AS n FROM collections WHERE rich = 0`)][0]?.n ?? 0);

		const daily = [...this.sql.exec(`SELECT day, count FROM daily ORDER BY day DESC LIMIT ?`, DAILY_DAYS)]
			.map((r) => ({ day: String(r.day), count: Number(r.count) }))
			.reverse();

		const sinceRows = [...this.sql.exec(`SELECT value FROM meta WHERE key = 'since'`)];

		return {
			total,
			errors: counter('errors'),
			since: sinceRows.length ? String(sinceRows[0].value) : null,
			bytes,
			avgBytes: total ? Math.round(bytes / total) : 0,
			estTokens: Math.round(bytes / 4),
			sessions: counter('mcp:sessions'),
			distinctCollections,
			richTotal,
			genericTotal,
			channels: prefixed('channel:'),
			routes: prefixed('route:'),
			tools: prefixed('tool:'),
			statuses: prefixed('status:'),
			errorRoutes: prefixed('errroute:'),
			upstreams: prefixed('upstream:'),
			authorities: prefixed('authority:'),
			idTypes: prefixed('idtype:'),
			params: prefixed('param:'),
			selectors: prefixed('sel:'),
			clients: prefixed('client:'),
			countries: prefixed('country:'),
			collections: collRows,
			needsFormatter,
			daily,
			latency: this.latency(),
		};
	}

	private latency(): LatencyStat {
		const count = Number([...this.sql.exec(`SELECT count FROM counters WHERE key = 'lat:count'`)][0]?.count ?? 0);
		const sum = Number([...this.sql.exec(`SELECT count FROM counters WHERE key = 'lat:sum'`)][0]?.count ?? 0);
		const buckets = LAT_KEYS.map((key) => ({
			key: latLabel(key),
			count: Number([...this.sql.exec(`SELECT count FROM counters WHERE key = ?`, key)][0]?.count ?? 0),
		}));

		const percentile = (p: number): string => {
			if (!count) return '—';
			const target = p * count;
			let cumulative = 0;
			for (let i = 0; i < LAT_KEYS.length; i++) {
				cumulative += buckets[i].count;
				if (cumulative >= target) return buckets[i].key;
			}
			return buckets[buckets.length - 1].key;
		};

		return { count, avgMs: count ? Math.round(sum / count) : 0, p50: percentile(0.5), p95: percentile(0.95), buckets };
	}
}

function stub(env: Env): DurableObjectStub<StatsDO> | null {
	if (!env.STATS) return null;
	return env.STATS.get(env.STATS.idFromName('global'));
}

// A well-formed NSID and a `collection:path` selector. Anything else (junk or hostile path
// segments) is dropped so it can't pollute or inject into the stats.
const NSID_RE = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/i;
const SELECTOR_RE = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+:[a-z0-9_.[\]]{1,64}$/i;

export interface VisitInput {
	channel: Channel;
	key: string;
	collection?: string;
	isError?: boolean;
	status?: number;
	upstream?: string;
	idType?: string;
	selector?: string;
	flags?: string[];
	country?: string;
	bytes?: number;
	latencyMs?: number;
}

// Fire-and-forget: never blocks or fails the response it is measuring.
export function recordVisit(env: Env, ctx: ExecutionContext, input: VisitInput): void {
	const s = stub(env);
	if (!s) return;

	const collection = input.collection && NSID_RE.test(input.collection) ? input.collection : undefined;
	const selector = input.selector && SELECTOR_RE.test(input.selector) ? input.selector : undefined;
	const d = new Date();
	const now = d.toISOString();

	const event: StatEvent = {
		...input,
		collection,
		selector,
		rich: collection ? getFormatter(collection) !== undefined : undefined,
		day: now.slice(0, 10),
		now,
	};
	ctx.waitUntil(Promise.resolve(s.record(event)).catch(() => {}));
}

export function recordSession(env: Env, ctx: ExecutionContext, client?: string): void {
	const s = stub(env);
	if (!s) return;
	const now = new Date().toISOString();
	ctx.waitUntil(Promise.resolve(s.session(client, now)).catch(() => {}));
}

export async function getStats(env: Env): Promise<StatsSnapshot | null> {
	const s = stub(env);
	if (!s) return null;
	return s.snapshot();
}

const idTypeOf = (s?: string): string | undefined =>
	s?.startsWith('did:plc:') ? 'plc' : s?.startsWith('did:web:') ? 'web' : s ? 'handle' : undefined;

const paramFlags = (url: URL): string[] =>
	['cursor', 'reverse', 'limit', 'source'].filter((p) => url.searchParams.has(p)).map((p) => `param:${p}`);

export interface HttpClass {
	key: string;
	collection?: string;
	idType?: string;
	selector?: string;
	flags?: string[];
}

// Derive an anonymous route label (plus any targeted collection NSID, identifier type, backlink
// selector, and pagination flags) from the URL alone. Returns null for crawler/asset noise.
export function classifyHttp(url: URL): HttpClass | null {
	const path = url.pathname;
	const flags = paramFlags(url);

	if (path === '/') return { key: 'route:home' };

	if (path.startsWith('/at://')) {
		const parts = path.slice('/at://'.length).split('/').filter(Boolean);
		const idType = idTypeOf(parts[0]);
		if (parts.length <= 1) return { key: 'route:repo', idType, flags };
		if (parts.length === 2) return { key: 'route:records', collection: parts[1], idType, flags };
		return { key: 'route:record', collection: parts[1], idType, flags };
	}

	const segments = path.replace(/^\//, '').split('/').filter(Boolean);
	const head = segments[0];

	if (['og.svg', 'og.png', 'favicon.svg', 'favicon.ico', 'robots.txt', 'sitemap.xml'].includes(head)) return null;

	if (head === 'llms.txt') return { key: 'route:llms.txt' };
	if (head === 'skill.md') return { key: 'route:skill.md' };
	if (head === 'stats') return { key: 'route:stats' };
	if (head === 'resolve') return { key: 'route:resolve', idType: idTypeOf(segments[1]) };
	if (head === 'discover') return { key: 'route:discover', collection: segments[1], flags };
	if (head === 'lexicon') return { key: 'route:lexicon', collection: segments[1] };
	if (head === 'backlinks') {
		return { key: 'route:backlinks', selector: url.searchParams.get('source') ?? undefined, flags };
	}
	if (head === 'plc') return { key: `route:plc/${segments[1] ?? ''}`.replace(/\/$/, ''), idType: idTypeOf(segments[2]) };

	return { key: 'route:other' };
}
