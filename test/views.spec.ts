import { describe, it, expect } from 'vitest';
import { formatStats } from '../src/views';
import type { StatsSnapshot } from '../src/stats';

const ORIGIN = 'https://atproto.md';

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
		xrpcNamespaces: [
			{ key: 'app.bsky', count: 30 },
			{ key: 'rare.ns', count: 2 },
		],
		xrpcDestinations: [
			{ key: 'appview', count: 30 },
			{ key: 'pds', count: 12 },
		],
		clients: [
			{ key: 'claude-code', count: 30 },
			{ key: 'rare-client', count: 2 },
		],
		countries: [
			{ key: 'US', count: 500 },
			{ key: 'XX', count: 1 },
		],
		collections: [
			{ nsid: 'app.bsky.feed.post', count: 420 },
			{ nsid: 'com.example.thing', count: 99 },
		],
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
		expect(md).toContain('**Bytes served:** 3.9 MB (~1.024M est. tokens)');

		expect(md).toContain('| HTTP | 1,000 | 81.0% |');
		expect(md).toContain('| MCP (tools) | 234 | 19.0% |');

		expect(md).toContain('| `/at://{actor}/{collection}` | 500 |');
		expect(md).toContain('| `list_records` | 150 |');
		expect(md).toContain('| [`app.bsky.feed.post`](https://atproto.md/discover/app.bsky.feed.post) | 420 |');
		expect(md).toContain('never IPs, handles, DIDs, or record keys');
	});

	it('renders the new dimensions and respects the privacy threshold', () => {
		const md = formatStats(ORIGIN, snapshot);

		expect(md).toContain('## Requests over time');
		expect(md).toContain('## Latency');
		expect(md).toContain('**p95:** < 1000ms');
		expect(md).toContain('| `200` | 1,200 |'); // status codes
		expect(md).toContain('## XRPC namespaces');
		expect(md).toContain('| `app.bsky` | 30 |');
		expect(md).not.toContain('rare.ns');
		expect(md).toContain('| `Bluesky app view` | 30 |');
		expect(md).toContain('## Upstream failures');
		expect(md).toContain('| `pds` | 7 |');
		expect(md).toContain('| `app.bsky` | 600 |'); // authority
		expect(md).toContain('| `did:plc` | 200 |'); // identifier type label
		expect(md).toContain('| `app.bsky.feed.like:subject.uri` | 45 |'); // selector
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
			xrpcNamespaces: [],
			xrpcDestinations: [],
			clients: [],
			countries: [],
			collections: [],
			daily: [],
			latency: { count: 0, avgMs: 0, p50: '—', p95: '—', buckets: [] },
		};
		expect(formatStats(ORIGIN, zero)).toContain('*No requests recorded yet.*');
	});
});
