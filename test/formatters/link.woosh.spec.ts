import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('link.woosh.linkPage', () => {
	const format = formatter('link.woosh.linkPage');
	const m = meta({ collection: 'link.woosh.linkPage', rkey: 'index' });

	it('renders a full link page with collections', () => {
		const result = format(
			record({
				description: 'My cool links',
				collections: [
					{
						label: 'Socials',
						links: [
							{ uri: 'https://bsky.app/profile/test', title: 'Bluesky' },
							{ uri: 'https://github.com/test', title: 'GitHub' },
						],
					},
					{
						label: 'Projects',
						links: [{ uri: 'https://example.com', title: 'My Project' }],
					},
				],
			}),
			m,
		);
		expect(result).toContain('My cool links');
		expect(result).toContain('### Socials');
		expect(result).toContain('- [Bluesky](https://bsky.app/profile/test)');
		expect(result).toContain('- [GitHub](https://github.com/test)');
		expect(result).toContain('### Projects');
		expect(result).toContain('- [My Project](https://example.com)');
	});

	it('renders empty link page', () => {
		const result = format(record({}), m);
		expect(result).toContain('*Empty link page*');
	});

	it('falls back to URI when title is missing', () => {
		const result = format(
			record({ collections: [{ label: 'Links', links: [{ uri: 'https://example.com' }] }] }),
			m,
		);
		expect(result).toContain('- [https://example.com](https://example.com)');
	});
});
