import { afterEach, describe, expect, it, vi } from 'vitest';
import { atUriFromHtml, matchLink, toAddress } from '../src/links';

const m = (href: string) => matchLink(new URL(href));

describe('client links', () => {
	it('reads Bluesky-style clients', () => {
		expect(m('https://bsky.app/profile/bsky.app/post/3k7')).toEqual({ actor: 'bsky.app', collection: 'app.bsky.feed.post', rkey: '3k7' });
		expect(m('https://deer.social/profile/did:plc:abc/feed/whats-hot')).toEqual({
			actor: 'did:plc:abc',
			collection: 'app.bsky.feed.generator',
			rkey: 'whats-hot',
		});
		expect(m('https://blacksky.community/profile/alice.test')).toEqual({ actor: 'alice.test' });
		expect(m('https://bsky.app/starter-pack/alice.test/3abc')).toEqual({
			actor: 'alice.test',
			collection: 'app.bsky.graph.starterpack',
			rkey: '3abc',
		});
		expect(m('https://bsky.app/profile/alice.test/starter-pack/3abc')).toEqual({
			actor: 'alice.test',
			collection: 'app.bsky.graph.starterpack',
			rkey: '3abc',
		});
		expect(m('https://me.anisota.net/profile/alice.test/post/3k7')?.collection).toBe('app.bsky.feed.post');
	});

	it('reads explorers that carry the AT URI in the path', () => {
		expect(m('https://pdsls.dev/at://did:plc:abc/app.bsky.feed.post/3k7')).toEqual({
			actor: 'did:plc:abc',
			collection: 'app.bsky.feed.post',
			rkey: '3k7',
		});
		expect(m('https://atproto.at/uri/at://alice.test/site.standard.document/x')).toEqual({
			actor: 'alice.test',
			collection: 'site.standard.document',
			rkey: 'x',
		});
		expect(m('https://aturi.to/explore/alice.test/app.bsky.feed.post/3k7')?.rkey).toBe('3k7');
		expect(m('https://unthread.at/@alice.test/3mw')).toEqual({ actor: 'alice.test', collection: 'site.standard.document', rkey: '3mw' });
	});

	it('never falls back to the profile for a path it does not know', () => {
		expect(m('https://bsky.app/profile/alice.test/followers')).toBeNull();
		expect(m('https://bsky.app/profile/alice.test/post')).toBeNull();
		expect(m('https://tangled.org/chrisshank.me/at-tags')).toBeNull();
		expect(m('https://example.org/alice.test/site.standard.document/x')).toBeNull();
		expect(m('https://example.com/profile/alice.test')).toBeNull();
	});
});

describe('at-tags and page links', () => {
	it('prefers at:canonical, in any attribute order', () => {
		const html = `<head><link rel="x" href="at://did:plc:b/site.standard.publication/p"><meta content="at://did:plc:a/site.standard.document/d" name="at:canonical"></head>`;
		expect(atUriFromHtml(html)).toBe('at://did:plc:a/site.standard.document/d');
	});

	it('falls back to an at:// link, then at:me, and ignores at:author and at:alternate', () => {
		expect(atUriFromHtml(`<head><link rel="site.standard.document" href="at://did:plc:a/site.standard.document/d"></head>`)).toBe(
			'at://did:plc:a/site.standard.document/d',
		);
		expect(
			atUriFromHtml(`<head><meta name="at:author" content="at://did:plc:x"><meta name="at:me" content="at://did:plc:me"></head>`),
		).toBe('at://did:plc:me');
		expect(atUriFromHtml(`<head><meta name="at:alternate" content="at://did:plc:a/app.bsky.feed.post/p"></head>`)).toBeNull();
	});
});

describe('toAddress', () => {
	afterEach(() => vi.restoreAllMocks());

	it('passes AT URIs and known links through without fetching', async () => {
		const spy = vi.spyOn(globalThis, 'fetch');
		expect(await toAddress('at://alice.test')).toBe('at://alice.test');
		expect(await toAddress('https://bsky.app/profile/alice.test')).toBe('https://bsky.app/profile/alice.test');
		expect(spy).not.toHaveBeenCalled();
	});

	it('reads any other page for the AT URI it publishes, or explains what is supported', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
			String(input).includes('blog.example')
				? new Response('<html><head><meta name="at:canonical" content="at://did:plc:a/site.standard.document/d"></head><body>', {
						headers: { 'Content-Type': 'text/html' },
					})
				: new Response('<html><head></head></html>', { headers: { 'Content-Type': 'text/html' } }),
		);
		expect(await toAddress('https://blog.example/posts/hello')).toBe('at://did:plc:a/site.standard.document/d');
		await expect(toAddress('https://plain.example/')).rejects.toMatchObject({ status: 400 });
	});
});
