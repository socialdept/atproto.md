import { describe, it, expect } from 'vitest';
import {
	formatAuditLog,
	formatBacklinkRecords,
	formatBacklinkSources,
	formatDiscovery,
	formatPlcData,
	formatPlcLastOp,
} from '../src/views';
import type { PlcLogEntry, PlcOperation } from '../src/types';

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
