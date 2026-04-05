import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('place.wisp.fs', () => {
	const format = formatter('place.wisp.fs');
	const m = meta({ collection: 'place.wisp.fs' });

	it('renders a site with files as a tree', () => {
		const result = format(
			record({
				site: 'mysite',
				fileCount: 2,
				createdAt: '2026-03-18T10:00:00Z',
				root: {
					type: 'directory',
					entries: [
						{ name: 'index.html', node: { type: 'file', mimeType: 'text/html', blob: { size: 1024, ref: { $link: 'bafabc123' } } } },
						{ name: 'style.css', node: { type: 'file', mimeType: 'text/css', blob: { size: 512, ref: { $link: 'bafdef456' } } } },
					],
				},
			}),
			m,
		);
		expect(result).toContain('**Site:** mysite');
		expect(result).toContain('**Files:** 2');
		expect(result).toContain('**Created:**');
		expect(result).toContain('├── index.html (1.0 KB) [bafabc123] (.html)');
		expect(result).toContain('└── style.css (512 B) [bafdef456] (.css)');
	});

	it('renders nested directories', () => {
		const result = format(
			record({
				site: 'nested',
				fileCount: 1,
				createdAt: '2026-03-18T10:00:00Z',
				root: {
					type: 'directory',
					entries: [
						{
							name: '.well_known',
							node: {
								type: 'directory',
								entries: [{ name: 'atproto-did', node: { type: 'file', blob: { size: 12, ref: { $link: 'bafxyz' } } } }],
							},
						},
					],
				},
			}),
			m,
		);
		expect(result).toContain('└── .well_known/');
		expect(result).toContain('    └── atproto-did (12 B) [bafxyz]');
	});

	it('handles empty root', () => {
		const result = format(
			record({ site: 'empty', fileCount: 0, createdAt: '2026-03-18T10:00:00Z', root: { type: 'directory', entries: [] } }),
			m,
		);
		expect(result).toContain('**Site:** empty');
		expect(result).toContain('**Files:** 0');
		expect(result).not.toContain('├──');
	});
});
