import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('pub.leaflet.publication', () => {
	const format = formatter('pub.leaflet.publication');
	const m = meta({ collection: 'pub.leaflet.publication' });

	it('renders publication with name and base_path', () => {
		const result = format(record({ name: '@aka.dad', base_path: 'dad.leaflet.pub' }), m);
		expect(result).toContain('**Name:** @aka.dad');
		expect(result).toContain('**URL:** [dad.leaflet.pub](https://dad.leaflet.pub)');
	});

	it('renders publication with only name', () => {
		const result = format(record({ name: 'Minimal' }), m);
		expect(result).toContain('**Name:** Minimal');
		expect(result).not.toContain('URL');
	});
});

describe('pub.leaflet.document', () => {
	const format = formatter('pub.leaflet.document');
	const m = meta({ collection: 'pub.leaflet.document' });

	it('renders document with title and text from pages', () => {
		const result = format(
			record({
				title: 'My Article',
				publishedAt: '2025-06-01T00:00:00Z',
				description: 'About something',
				publication: 'at://did:plc:test/pub.leaflet.publication/abc',
				pages: [
					{
						id: 'page1',
						blocks: [{ block: { plaintext: 'First paragraph.' } }, { block: { plaintext: 'Second paragraph.' } }],
					},
				],
			}),
			m,
		);
		expect(result).toContain('**Title:** My Article');
		expect(result).toContain('**Published:**');
		expect(result).toContain('**Description:** About something');
		expect(result).toContain('**Publication:** `at://did:plc:test/pub.leaflet.publication/abc`');
		expect(result).toContain('First paragraph.');
		expect(result).toContain('Second paragraph.');
	});

	it('shows defaults for empty document', () => {
		const result = format(record({}), m);
		expect(result).toContain('**Title:** Untitled');
		expect(result).toContain('*No content*');
	});
});
