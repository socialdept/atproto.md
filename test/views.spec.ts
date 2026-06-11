import { describe, it, expect } from 'vitest';
import { formatBacklinkRecords, formatBacklinkSources, formatDiscovery } from '../src/views';

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
