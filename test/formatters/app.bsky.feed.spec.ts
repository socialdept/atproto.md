import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('app.bsky.feed.post', () => {
	const format = formatter('app.bsky.feed.post');
	const m = meta({ collection: 'app.bsky.feed.post' });

	it('renders a simple text post', () => {
		const result = format(record({ text: 'Hello world', createdAt: '2025-01-15T12:00:00.000Z' }), m);
		expect(result).toContain('Hello world');
		expect(result).toContain('**Date:** Wed, 15 Jan 2025 12:00:00 GMT');
		expect(result).toContain('View on Bluesky');
		expect(result).toContain(`https://bsky.app/profile/${m.handle}/post/${m.rkey}`);
	});

	it('shows placeholder for posts without text', () => {
		const result = format(record({ createdAt: '2025-01-15T12:00:00.000Z' }), m);
		expect(result).toContain('*[No text content]*');
	});

	it('renders reply context', () => {
		const result = format(
			record({
				text: 'Reply text',
				createdAt: '2025-01-15T12:00:00.000Z',
				reply: { parent: { uri: 'at://did:plc:other/app.bsky.feed.post/abc' } },
			}),
			m,
		);
		expect(result).toContain('Reply to `at://did:plc:other/app.bsky.feed.post/abc`');
	});

	it('renders external embeds', () => {
		const result = format(
			record({
				text: 'Check this out',
				createdAt: '2025-01-15T12:00:00.000Z',
				embed: { external: { uri: 'https://example.com', title: 'Example', description: 'A site' } },
			}),
			m,
		);
		expect(result).toContain('**Link:** [Example](https://example.com)');
		expect(result).toContain('> A site');
	});

	it('renders image embeds with alt text', () => {
		const result = format(
			record({
				text: 'Photos',
				createdAt: '2025-01-15T12:00:00.000Z',
				embed: { images: [{ alt: 'sunset' }, { alt: '' }] },
			}),
			m,
		);
		expect(result).toContain('**Images:** sunset, image');
	});
});

describe('app.bsky.feed.like', () => {
	const format = formatter('app.bsky.feed.like');
	const m = meta({ collection: 'app.bsky.feed.like' });

	it('renders the liked subject and timestamp', () => {
		const result = format(
			record({ subject: { uri: 'at://did:plc:x/app.bsky.feed.post/abc', cid: 'baf...' }, createdAt: '2025-06-01T00:00:00Z' }),
			m,
		);
		expect(result).toContain('**Likes:** `at://did:plc:x/app.bsky.feed.post/abc`');
		expect(result).toContain('**At:**');
	});
});

describe('app.bsky.feed.repost', () => {
	const format = formatter('app.bsky.feed.repost');
	const m = meta({ collection: 'app.bsky.feed.repost' });

	it('renders the reposted subject and timestamp', () => {
		const result = format(
			record({ subject: { uri: 'at://did:plc:x/app.bsky.feed.post/abc', cid: 'baf...' }, createdAt: '2025-06-01T00:00:00Z' }),
			m,
		);
		expect(result).toContain('**Reposts:** `at://did:plc:x/app.bsky.feed.post/abc`');
		expect(result).toContain('**At:**');
	});
});

describe('app.bsky.feed.generator', () => {
	const format = formatter('app.bsky.feed.generator');
	const m = meta({ collection: 'app.bsky.feed.generator' });

	it('renders generator with all fields', () => {
		const result = format(
			record({ displayName: 'My Feed', did: 'did:plc:gen', createdAt: '2025-01-01T00:00:00Z', description: 'A custom feed' }),
			m,
		);
		expect(result).toContain('**Name:** My Feed');
		expect(result).toContain('**DID:** `did:plc:gen`');
		expect(result).toContain('**Created:**');
		expect(result).toContain('A custom feed');
	});

	it('shows Untitled when displayName is missing', () => {
		const result = format(record({ did: 'did:plc:gen', createdAt: '2025-01-01T00:00:00Z' }), m);
		expect(result).toContain('**Name:** Untitled');
	});
});
