import { describe, it, expect } from 'vitest';
import {
	abbrevNum,
	formatAuditLog,
	formatBacklinkRecords,
	formatBacklinkSources,
	formatDiscovery,
	formatPlcData,
	formatPlcLastOp,
	formatStats,
} from '../src/views';
import type { PlcLogEntry, PlcOperation } from '../src/types';
import type { StatsSnapshot } from '../src/stats';

const ORIGIN = 'https://atproto.md';

describe('formatDiscovery', () => {
	it('lists repos as links into their collection records', () => {
		const md = formatDiscovery(ORIGIN, 'site.standard.document', {
			repos: [{ did: 'did:plc:abc' }, { did: 'did:plc:xyz' }],
			cursor: 'next123',
		});

		expect(md).toContain('# Repos with `site.standard.document`');
		expect(md).toContain('**Repos (this page):** 2');
		expect(md).toContain('[`did:plc:abc`](https://atproto.md/at://did:plc:abc/site.standard.document)');
		expect(md).toContain('[`did:plc:xyz`](https://atproto.md/at://did:plc:xyz/site.standard.document)');
		expect(md).toContain('com.atproto.sync.listReposByCollection');
	});

	it('renders a next-page link when a cursor is present', () => {
		const md = formatDiscovery(ORIGIN, 'site.standard.document', { repos: [{ did: 'did:plc:abc' }], cursor: 'cur=sor&x' });
		expect(md).toContain('**Cursor (next page):** `cur=sor&x`');
		expect(md).toContain('https://atproto.md/discover/site.standard.document?cursor=cur%3Dsor%26x');
	});

	it('handles an empty result set', () => {
		const md = formatDiscovery(ORIGIN, 'site.standard.document', { repos: [] });
		expect(md).toContain('*No repos found for this collection.*');
		expect(md).not.toContain('Next page');
	});
});

describe('formatBacklinkSources', () => {
	it('renders a summary table sorted by record count with drill-down links', () => {
		const md = formatBacklinkSources(ORIGIN, 'at://did:plc:abc/app.bsky.feed.post/123', [
			{ collection: 'app.bsky.feed.like', path: '.subject.uri', records: 753, distinctDids: 753 },
			{ collection: 'app.bsky.feed.repost', path: '.subject.uri', records: 46, distinctDids: 46 },
		]);

		expect(md).toContain('# Backlinks to `at://did:plc:abc/app.bsky.feed.post/123`');
		expect(md).toContain('**Total backlinks:** 799 from 2 sources');
		expect(md).toContain('| Source collection | Path | Records | Distinct DIDs |');
		expect(md).toContain(
			'[`app.bsky.feed.like`](https://atproto.md/backlinks/at://did:plc:abc/app.bsky.feed.post/123?source=app.bsky.feed.like%3Asubject.uri)',
		);
		expect(md).toContain('| `.subject.uri` | 753 | 753 |');
		expect(md).toContain('Constellation');
	});

	it('handles a target with no indexed backlinks', () => {
		const md = formatBacklinkSources(ORIGIN, 'at://did:plc:abc/app.bsky.feed.post/123', []);
		expect(md).toContain('*No backlinks indexed for this target.*');
		expect(md).toContain('**Total backlinks:** 0 from 0 sources');
	});
});

describe('formatAuditLog', () => {
	const op = (overrides: Partial<PlcLogEntry['operation']>): PlcLogEntry['operation'] => ({
		type: 'plc_operation',
		services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://bsky.social' } },
		alsoKnownAs: ['at://alice.bsky.social'],
		rotationKeys: ['did:key:rot1'],
		verificationMethods: { atproto: 'did:key:sign1' },
		...overrides,
	});
	const entry = (createdAt: string, operation: PlcLogEntry['operation'], extra: Partial<PlcLogEntry> = {}): PlcLogEntry => ({
		did: 'did:plc:abc',
		operation,
		cid: 'bafycid',
		nullified: false,
		createdAt,
		...extra,
	});

	it('labels the first operation as genesis with PDS, handle, and signing key', () => {
		const md = formatAuditLog(ORIGIN, 'did:plc:abc', 'alice.bsky.social', [entry('2023-04-12T04:53:57.057Z', op({}))]);

		expect(md).toContain('# PLC Audit Log: @alice.bsky.social');
		expect(md).toContain('**DID:** `did:plc:abc`');
		expect(md).toContain('**Operations:** 1');
		expect(md).toContain('— Genesis');
		expect(md).toContain('**PDS:** https://bsky.social');
		expect(md).toContain('**Handle:** `alice.bsky.social`');
		expect(md).toContain('**Signing key:** `did:key:sign1`');
		expect(md).toContain('https://plc.directory/did:plc:abc/log/audit');
	});

	it('flags a PDS migration with the from/to endpoints', () => {
		const md = formatAuditLog(ORIGIN, 'did:plc:abc', 'alice.bsky.social', [
			entry('2023-04-12T04:53:57.057Z', op({})),
			entry('2023-11-09T21:49:10.793Z', op({ services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://puffball.us-east.host.bsky.network' } } })),
		]);

		expect(md).toContain('PDS migration 🔀');
		expect(md).toContain('**PDS:** https://puffball.us-east.host.bsky.network *(was https://bsky.social)*');
	});

	it('detects handle changes and counts nullified ops', () => {
		const md = formatAuditLog(ORIGIN, 'did:plc:abc', 'bob.bsky.social', [
			entry('2023-04-12T04:53:57.057Z', op({}), { nullified: true }),
			entry('2023-04-12T17:26:46.468Z', op({ alsoKnownAs: ['at://bob.bsky.social'] })),
		]);

		expect(md).toContain('(1 active, 1 nullified)');
		expect(md).toContain('⚠️ *nullified*');
		expect(md).toContain('Handle change');
		expect(md).toContain('**Handle:** `bob.bsky.social` *(was `alice.bsky.social`)*');
	});

	it('handles legacy create ops and tombstones', () => {
		const md = formatAuditLog(ORIGIN, 'did:plc:abc', 'alice.bsky.social', [
			entry('2022-11-17T00:00:00.000Z', { type: 'create', handle: 'alice.bsky.social', service: 'https://bsky.social', signingKey: 'did:key:legacy' } as PlcLogEntry['operation']),
			entry('2024-01-01T00:00:00.000Z', { type: 'plc_tombstone' } as PlcLogEntry['operation']),
		]);

		expect(md).toContain('**PDS:** https://bsky.social');
		expect(md).toContain('**Handle:** `alice.bsky.social`');
		expect(md).toContain('Tombstone 🪦');
		expect(md).toContain('Identity deactivated (tombstoned).');
	});

	it('handles an empty log', () => {
		const md = formatAuditLog(ORIGIN, 'did:plc:abc', 'did:plc:abc', []);
		expect(md).toContain('*No operations found in the PLC audit log.*');
	});
});

describe('formatPlcData', () => {
	it('renders PDS, handles, methods, and priority-ordered rotation keys', () => {
		const md = formatPlcData(ORIGIN, 'did:plc:abc', 'alice.bsky.social', {
			did: 'did:plc:abc',
			verificationMethods: { atproto: 'did:key:sign1' },
			rotationKeys: ['did:key:rotA', 'did:key:rotB'],
			alsoKnownAs: ['at://alice.bsky.social', 'at://alice.com'],
			services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://pds.example' } },
		});

		expect(md).toContain('# PLC Data: @alice.bsky.social');
		expect(md).toContain('## PDS\nhttps://pds.example');
		expect(md).toContain('- `alice.bsky.social`');
		expect(md).toContain('- `alice.com`');
		expect(md).toContain('- **atproto:** `did:key:sign1`');
		expect(md).toContain('1. `did:key:rotA`');
		expect(md).toContain('2. `did:key:rotB`');
		expect(md).toContain(`[Full history →](${ORIGIN}/plc/audit/did:plc:abc)`);
	});

	it('handles missing fields gracefully', () => {
		const md = formatPlcData(ORIGIN, 'did:plc:abc', 'did:plc:abc', { did: 'did:plc:abc' });
		expect(md).toContain('*No PDS service registered.*');
		expect(md).toMatch(/## Rotation keys[\s\S]*\*None\.\*/);
	});
});

describe('formatPlcLastOp', () => {
	const op: PlcOperation = {
		type: 'plc_operation',
		prev: 'bafyprev',
		services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://pds.example' } },
		alsoKnownAs: ['at://alice.bsky.social'],
		rotationKeys: ['did:key:rotA', 'did:key:rotB'],
		verificationMethods: { atproto: 'did:key:sign1' },
	};

	it('renders the op type, prev pointer, and resulting state', () => {
		const md = formatPlcLastOp(ORIGIN, 'did:plc:abc', 'alice.bsky.social', op);
		expect(md).toContain('# PLC Last Operation: @alice.bsky.social');
		expect(md).toContain('**Type:** `plc_operation`');
		expect(md).toContain('**Previous op:** `bafyprev`');
		expect(md).toContain('- **PDS:** https://pds.example');
		expect(md).toContain('- **Signing key:** `did:key:sign1`');
		expect(md).toContain('- **Rotation keys:** 2');
		expect(md).toContain(`[full audit log →](${ORIGIN}/plc/audit/did:plc:abc)`);
	});

	it('marks a genesis op (no prev) and a tombstone', () => {
		const genesis = formatPlcLastOp(ORIGIN, 'did:plc:abc', 'alice', { ...op, prev: null });
		expect(genesis).toContain('*genesis (none)*');

		const tomb = formatPlcLastOp(ORIGIN, 'did:plc:abc', 'alice', { type: 'plc_tombstone' });
		expect(tomb).toContain('*Identity deactivated (tombstoned).*');
	});
});

describe('abbrevNum', () => {
	it('shows full digits up to 10K, then abbreviated units', () => {
		expect(abbrevNum(9_994)).toBe('9,994');
		expect(abbrevNum(10_192)).toBe('10.192K');
		expect(abbrevNum(1_453_000)).toBe('1.453M');
		expect(abbrevNum(31_182_000)).toBe('31.182M');
		expect(abbrevNum(994_121_000)).toBe('994.121M');
		expect(abbrevNum(12_912_000_000)).toBe('12.912B');
	});

	it('strips trailing zeros', () => {
		expect(abbrevNum(15_000)).toBe('15K');
		expect(abbrevNum(1_450_000)).toBe('1.45M');
		expect(abbrevNum(2_000_000)).toBe('2M');
		expect(abbrevNum(994_120_000)).toBe('994.12M');
	});
});

describe('formatStats', () => {
	const snapshot: StatsSnapshot = {
		total: 1234,
		errors: 12,
		since: '2026-06-01T08:30:00.000Z',
		bytes: 4_096_000,
		avgBytes: 3320,
		estTokens: 1_024_000,
		sessions: 37,
		distinctCollections: 9,
		richTotal: 480,
		genericTotal: 140,
		channels: [
			{ key: 'http', count: 1000 },
			{ key: 'mcp', count: 234 },
		],
		routes: [
			{ key: 'records', count: 500 },
			{ key: 'home', count: 300 },
		],
		tools: [
			{ key: 'list_records', count: 150 },
			{ key: 'plc_audit', count: 84 },
		],
		statuses: [
			{ key: '200', count: 1200 },
			{ key: '404', count: 10 },
		],
		errorRoutes: [{ key: 'records', count: 8 }],
		upstreams: [{ key: 'pds', count: 7 }],
		authorities: [{ key: 'app.bsky', count: 600 }],
		idTypes: [
			{ key: 'handle', count: 800 },
			{ key: 'plc', count: 200 },
		],
		params: [{ key: 'cursor', count: 90 }],
		selectors: [{ key: 'app.bsky.feed.like:subject.uri', count: 45 }],
		clients: [
			{ key: 'claude-code', count: 30 },
			{ key: 'rare-client', count: 2 },
		],
		countries: [
			{ key: 'US', count: 500 },
			{ key: 'XX', count: 1 },
		],
		collections: [
			{ nsid: 'app.bsky.feed.post', count: 420, rich: true },
			{ nsid: 'com.example.thing', count: 99, rich: false },
		],
		needsFormatter: [{ nsid: 'com.example.thing', count: 99, rich: false }],
		daily: [
			{ day: '2026-06-10', count: 100 },
			{ day: '2026-06-11', count: 400 },
		],
		latency: {
			count: 1200,
			avgMs: 180,
			p50: '< 250ms',
			p95: '< 1000ms',
			buckets: [
				{ key: '< 250ms', count: 800 },
				{ key: '< 1000ms', count: 400 },
			],
		},
	};

	it('renders totals, channels, routes, tools, and collections', () => {
		const md = formatStats(ORIGIN, snapshot);

		expect(md).toContain('# atproto.md — usage stats');
		expect(md).toContain('**Total requests:** 1,234');
		expect(md).toContain('**Counting since:** 2026-06-01');
		expect(md).toContain('**Errors:** 12 (1.0%)');
		expect(md).toContain('**MCP sessions:** 37');
		expect(md).toContain('**MD bytes served:** 3.9 MB (~1.024M est. MD tokens)');

		expect(md).toContain('| HTTP (markdown) | 1,000 | 81.0% |');
		expect(md).toContain('| MCP (tools) | 234 | 19.0% |');

		expect(md).toContain('| `/at://{actor}/{collection}` | 500 |');
		expect(md).toContain('| `list_records` | 150 |');
		expect(md).toContain('| [`app.bsky.feed.post`](https://atproto.md/discover/app.bsky.feed.post) | rich | 420 |');
		expect(md).toContain('never IPs, handles, DIDs, or record keys');
	});

	it('renders the new dimensions and respects the privacy threshold', () => {
		const md = formatStats(ORIGIN, snapshot);

		expect(md).toContain('## Requests over time');
		expect(md).toContain('## Latency');
		expect(md).toContain('**p95:** < 1000ms');
		expect(md).toContain('| `200` | 1,200 |'); // status codes
		expect(md).toContain('## Upstream failures');
		expect(md).toContain('| `pds` | 7 |');
		expect(md).toContain('| `app.bsky` | 600 |'); // authority
		expect(md).toContain('| `did:plc` | 200 |'); // identifier type label
		expect(md).toContain('| `app.bsky.feed.like:subject.uri` | 45 |'); // selector
		expect(md).toContain('## Collections needing a formatter');
		expect(md).toContain('9 distinct');

		// threshold: kept buckets present, rare ones hidden
		expect(md).toContain('| `claude-code` | 30 |');
		expect(md).not.toContain('rare-client');
		expect(md).toContain('| `US` | 500 |');
		expect(md).not.toContain('| `XX` |');
	});

	it('handles the empty / null state', () => {
		expect(formatStats(ORIGIN, null)).toContain('*No requests recorded yet.*');
		const zero: StatsSnapshot = {
			total: 0,
			errors: 0,
			since: null,
			bytes: 0,
			avgBytes: 0,
			estTokens: 0,
			sessions: 0,
			distinctCollections: 0,
			richTotal: 0,
			genericTotal: 0,
			channels: [],
			routes: [],
			tools: [],
			statuses: [],
			errorRoutes: [],
			upstreams: [],
			authorities: [],
			idTypes: [],
			params: [],
			selectors: [],
			clients: [],
			countries: [],
			collections: [],
			needsFormatter: [],
			daily: [],
			latency: { count: 0, avgMs: 0, p50: '—', p95: '—', buckets: [] },
		};
		expect(formatStats(ORIGIN, zero)).toContain('*No requests recorded yet.*');
	});
});

describe('formatBacklinkRecords', () => {
	it('lists linking records as links and a next-page link', () => {
		const md = formatBacklinkRecords(ORIGIN, 'at://did:plc:abc/app.bsky.feed.post/123', 'app.bsky.feed.like:subject.uri', {
			total: 753,
			records: [
				{ did: 'did:plc:liker', collection: 'app.bsky.feed.like', rkey: 'rk1' },
				{ did: 'did:plc:other', collection: 'app.bsky.feed.like', rkey: 'rk2' },
			],
			cursor: 'page2',
		});

		expect(md).toContain('# Backlinks: `app.bsky.feed.like:subject.uri`');
		expect(md).toContain('**Total:** 753 | **This page:** 2');
		expect(md).toContain('[`at://did:plc:liker/app.bsky.feed.like/rk1`](https://atproto.md/at://did:plc:liker/app.bsky.feed.like/rk1)');
		expect(md).toContain('source=app.bsky.feed.like%3Asubject.uri&cursor=page2');
		expect(md).toContain('[← All backlink sources](https://atproto.md/backlinks/at://did:plc:abc/app.bsky.feed.post/123)');
	});

	it('handles no linking records', () => {
		const md = formatBacklinkRecords(ORIGIN, 'at://did:plc:abc/app.bsky.feed.post/123', 'app.bsky.feed.like:subject.uri', {
			total: 0,
			records: [],
		});
		expect(md).toContain('*No linking records found.*');
	});
});
