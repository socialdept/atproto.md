import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('blog.pckt.publication', () => {
	const format = formatter('blog.pckt.publication');
	const m = meta({ collection: 'blog.pckt.publication' });

	it('renders the publication strongRef', () => {
		const result = format(
			record({ publication: { uri: 'at://did:plc:test/site.standard.publication/abc', cid: 'baf...' } }),
			m,
		);
		expect(result).toContain('**Publication:** `at://did:plc:test/site.standard.publication/abc`');
	});

	it('handles missing publication ref', () => {
		const result = format(record({}), m);
		expect(result).toContain('*No publication reference*');
	});
});
