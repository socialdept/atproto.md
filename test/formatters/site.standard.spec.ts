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

	it('preserves empty line before content', () => {
		const result = format(record({ title: 'Test', textContent: 'Body here' }), m);
		const lines = result.split('\n');
		const titleIdx = lines.findIndex((l) => l.startsWith('**Title:**'));
		const bodyIdx = lines.indexOf('Body here');
		expect(lines[bodyIdx - 1]).toBe('');
	});
});
