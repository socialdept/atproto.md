import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('site.standard.publication', () => {
	const format = formatter('site.standard.publication');
	const m = meta({ collection: 'site.standard.publication' });

	it('renders publication with all fields', () => {
		const result = format(
			record({
				name: 'Dad Blog',
				url: 'https://blog.aka.dad',
				description: 'The first Offprint publication ever',
				preferences: { locale: 'en-US', timezone: 'America/Denver', showByline: false, showInDiscover: true },
			}),
			m,
		);
		expect(result).toContain('**Name:** Dad Blog');
		expect(result).toContain('**URL:** [https://blog.aka.dad](https://blog.aka.dad)');
		expect(result).toContain('**Description:** The first Offprint publication ever');
		expect(result).toContain('**Locale:** en-US');
	});

	it('renders minimal publication', () => {
		const result = format(record({ name: 'Minimal' }), m);
		expect(result).toContain('**Name:** Minimal');
		expect(result).not.toContain('URL');
		expect(result).not.toContain('Description');
	});

	it('omits theme data from output', () => {
		const result = format(
			record({ name: 'Themed', theme: { colors: { accent: { r: 255, g: 0, b: 0 } } }, basicTheme: { accent: {} } }),
			m,
		);
		expect(result).not.toContain('theme');
		expect(result).not.toContain('accent');
	});

	it('renders icon, labels and discoverability', () => {
		const result = format(
			record({
				name: 'Full Pub',
				icon: { ref: { $link: 'bafyicon' }, mimeType: 'image/png', size: 1234 },
				labels: { values: [{ val: 'nsfw' }] },
				preferences: { showInDiscover: false },
			}),
			m,
		);
		expect(result).toContain('**Icon:** `bafyicon` (.png)');
		expect(result).toContain('**Labels:** nsfw');
		expect(result).toContain('**Discoverable:** No');
	});
});

describe('site.standard.document', () => {
	const format = formatter('site.standard.document');
	const m = meta({ collection: 'site.standard.document' });

	it('renders document with all fields', () => {
		const result = format(
			record({
				title: 'My Article',
				publishedAt: '2025-06-01T00:00:00Z',
				description: 'A great article',
				site: 'at://did:plc:test/site.standard.publication/abc',
				path: '/a/my-article',
				textContent: 'This is the full text of the article.',
			}),
			m,
		);
		expect(result).toContain('**Title:** My Article');
		expect(result).toContain('**Published:**');
		expect(result).toContain('**Description:** A great article');
		expect(result).toContain('**Publication:** `at://did:plc:test/site.standard.publication/abc`');
		expect(result).toContain('**Path:** /a/my-article');
		expect(result).toContain('This is the full text of the article.');
	});

	it('shows defaults for missing fields', () => {
		const result = format(record({}), m);
		expect(result).toContain('**Title:** Untitled');
		expect(result).toContain('*No content*');
	});

	it('surfaces tags, updatedAt, labels, cover image, bsky ref and contributors', () => {
		const result = format(
			record({
				title: 'Rich Doc',
				publishedAt: '2025-06-01T00:00:00Z',
				updatedAt: '2025-06-10T00:00:00Z',
				tags: ['atproto', 'markdown'],
				labels: { values: [{ val: 'spoiler' }] },
				coverImage: { ref: { $link: 'bafycover' }, mimeType: 'image/jpeg' },
				bskyPostRef: { uri: 'at://did:plc:test/app.bsky.feed.post/xyz', cid: 'bafy' },
				contributors: [
					{ did: 'did:plc:alice', displayName: 'Alice', role: 'author' },
					{ did: 'did:plc:bob' },
				],
				textContent: 'Body',
			}),
			m,
		);
		expect(result).toContain('**Updated:**');
		expect(result).toContain('**Tags:** atproto, markdown');
		expect(result).toContain('**Labels:** spoiler');
		expect(result).toContain('**Cover Image:** `bafycover` (.jpg)');
		expect(result).toContain('**Bluesky Post:** `at://did:plc:test/app.bsky.feed.post/xyz`');
		expect(result).toContain('**Contributors:**');
		expect(result).toContain('- Alice (author) `did:plc:alice`');
		expect(result).toContain('- did:plc:bob');
	});

	it('renders at.markpub.markdown content fenced as markdown', () => {
		const result = format(
			record({
				title: 'Doc',
				content: { $type: 'at.markpub.markdown', text: { $type: 'at.markpub.text', markdown: '# Hi\n\nBody.' }, flavor: 'gfm' },
				textContent: 'Hi',
			}),
			m,
		);
		expect(result).toContain('**Content:**\n```markdown\n# Hi\n\nBody.\n```');
		expect(result).not.toContain('```json');
		expect(result).not.toContain('$type');
	});

	it('widens the fence when markdown contains code fences', () => {
		const result = format(
			record({
				title: 'Doc',
				content: { $type: 'at.markpub.markdown', text: { $type: 'at.markpub.text', markdown: 'See:\n```js\nx\n```' } },
				textContent: 'x',
			}),
			m,
		);
		expect(result).toContain('````markdown\nSee:\n```js\nx\n```\n````');
	});

	it('suppresses textContent when content is present', () => {
		const result = format(
			record({
				title: 'Doc',
				content: { $type: 'at.markpub.markdown', text: { $type: 'at.markpub.text', markdown: '# Real body' } },
				textContent: 'Duplicate plaintext body',
			}),
			m,
		);
		expect(result).toContain('# Real body');
		expect(result).not.toContain('Duplicate plaintext body');
	});

	it('falls back to textContent when content is absent', () => {
		const result = format(record({ title: 'Doc', textContent: 'Just plaintext' }), m);
		expect(result).toContain('Just plaintext');
		expect(result).not.toContain('**Content:**');
	});

	it('renders unknown content types as a json block', () => {
		const result = format(
			record({ title: 'Doc', content: { $type: 'com.example.weird', value: 42 }, textContent: 'x' }),
			m,
		);
		expect(result).toContain('**Content:**');
		expect(result).toContain('```json');
		expect(result).toContain('"$type": "com.example.weird"');
	});

	it('omits optional fields when absent', () => {
		const result = format(record({ title: 'Bare', textContent: 'x' }), m);
		expect(result).not.toContain('**Tags:**');
		expect(result).not.toContain('**Updated:**');
		expect(result).not.toContain('**Contributors:**');
		expect(result).not.toContain('**Cover Image:**');
		expect(result).not.toContain('**Content:**');
	});

	it('preserves empty line before content', () => {
		const result = format(record({ title: 'Test', textContent: 'Body here' }), m);
		const lines = result.split('\n');
		const titleIdx = lines.findIndex((l) => l.startsWith('**Title:**'));
		const bodyIdx = lines.indexOf('Body here');
		expect(lines[bodyIdx - 1]).toBe('');
	});
});
