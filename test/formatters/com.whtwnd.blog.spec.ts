import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('com.whtwnd.blog.entry', () => {
	const format = formatter('com.whtwnd.blog.entry');
	const m = meta({ collection: 'com.whtwnd.blog.entry' });

	it('renders full blog entry', () => {
		const result = format(
			record({
				title: 'My Post',
				createdAt: '2025-02-01T00:00:00Z',
				visibility: 'public',
				content: '# Hello\n\nThis is my blog post.',
			}),
			m,
		);
		expect(result).toContain('**Title:** My Post');
		expect(result).toContain('**Date:**');
		expect(result).toContain('**Visibility:** public');
		expect(result).toContain('# Hello\n\nThis is my blog post.');
	});

	it('shows defaults for missing fields', () => {
		const result = format(record({}), m);
		expect(result).toContain('**Title:** Untitled');
		expect(result).toContain('**Date:** Unknown');
		expect(result).toContain('*No content*');
		expect(result).not.toContain('Visibility');
	});

	it('preserves empty line between metadata and content', () => {
		const result = format(record({ title: 'Test', createdAt: '2025-01-01T00:00:00Z', content: 'Body text' }), m);
		const lines = result.split('\n');
		const dateLineIdx = lines.findIndex((l) => l.startsWith('**Date:**'));
		expect(lines[dateLineIdx + 1]).toBe('');
		expect(lines[dateLineIdx + 2]).toBe('Body text');
	});
});
