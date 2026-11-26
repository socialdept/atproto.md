import { describe, it, expect } from 'vitest';
import { blobUrl, collectBlobCids, collectRecordUris, isRecordUri, parseTarget } from '../src/refs';

describe('parseTarget', () => {
	it('splits an at:// URI', () => {
		expect(parseTarget('at://bsky.app/app.bsky.feed.post/3abc')).toEqual({ actor: 'bsky.app', collection: 'app.bsky.feed.post', rkey: '3abc' });
		expect(parseTarget('at://did:plc:abc')).toEqual({ actor: 'did:plc:abc', collection: undefined, rkey: undefined });
	});

	it('accepts a bare handle or DID', () => {
		expect(parseTarget('bsky.app').actor).toBe('bsky.app');
		expect(parseTarget(' did:plc:abc ').actor).toBe('did:plc:abc');
	});

	it('maps bsky.app links to records', () => {
		expect(parseTarget('https://bsky.app/profile/aka.dad/post/3n3alrdkksk2f')).toEqual({
			actor: 'aka.dad',
			collection: 'app.bsky.feed.post',
			rkey: '3n3alrdkksk2f',
		});
		expect(parseTarget('https://bsky.app/profile/bsky.app/feed/whats-hot').collection).toBe('app.bsky.feed.generator');
		expect(parseTarget('https://bsky.app/profile/bsky.app/lists/3k').collection).toBe('app.bsky.graph.list');
		expect(parseTarget('https://bsky.app/profile/bsky.app/starter-pack/3k').collection).toBe('app.bsky.graph.starterpack');
		expect(parseTarget('https://bsky.app/profile/aka.dad')).toEqual({ actor: 'aka.dad' });
	});

	it('rejects other URLs and empty input', () => {
		expect(() => parseTarget('https://example.com/post/1')).toThrow();
		expect(() => parseTarget('https://bsky.app/search?q=x')).toThrow();
		expect(() => parseTarget('at://')).toThrow();
	});
});

describe('collectRecordUris', () => {
	it('finds strong refs, reply refs and embedded records anywhere in a value, once each', () => {
		const post = {
			text: 'hi at://not/a-uri',
			reply: {
				root: { uri: 'at://did:plc:a/app.bsky.feed.post/1', cid: 'c1' },
				parent: { uri: 'at://did:plc:a/app.bsky.feed.post/2', cid: 'c2' },
			},
			embed: { record: { uri: 'at://did:plc:b/app.bsky.feed.post/3', cid: 'c3' } },
			also: ['at://did:plc:a/app.bsky.feed.post/1'],
		};
		expect([...collectRecordUris(post)]).toEqual([
			'at://did:plc:a/app.bsky.feed.post/1',
			'at://did:plc:a/app.bsky.feed.post/2',
			'at://did:plc:b/app.bsky.feed.post/3',
		]);
	});

	it('ignores repo and collection URIs', () => {
		expect(isRecordUri('at://did:plc:a')).toBe(false);
		expect(isRecordUri('at://did:plc:a/app.bsky.feed.post')).toBe(false);
		expect(isRecordUri('at://did:plc:a/app.bsky.feed.post/3k')).toBe(true);
	});
});

describe('collectBlobCids', () => {
	it('finds current and legacy blob refs', () => {
		const profile = {
			avatar: { $type: 'blob', ref: { $link: 'bafyavatar' }, mimeType: 'image/jpeg', size: 1 },
			embed: { images: [{ image: { $type: 'blob', ref: { $link: 'bafyimg' }, mimeType: 'image/png', size: 2 } }] },
			legacy: { cid: 'bafylegacy', mimeType: 'image/jpeg' },
			strongRef: { uri: 'at://did:plc:a/app.bsky.feed.post/1', cid: 'bafynotablob' },
		};
		expect([...collectBlobCids(profile)]).toEqual(['bafyavatar', 'bafyimg', 'bafylegacy']);
	});

	it('builds getBlob URLs', () => {
		expect(blobUrl('https://pds.example', 'did:plc:a', 'bafy')).toBe(
			'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did:plc:a&cid=bafy',
		);
	});
});
