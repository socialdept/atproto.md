import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('app.offprint.publication', () => {
	const format = formatter('app.offprint.publication');
	const m = meta({ collection: 'app.offprint.publication' });

	it('renders the publication reference', () => {
		const result = format(
			record({ publication: 'at://did:plc:test/site.standard.publication/abc' }),
			m,
		);
		expect(result).toContain('**Publication:** `at://did:plc:test/site.standard.publication/abc`');
	});
});

describe('app.offprint.document.article', () => {
	const format = formatter('app.offprint.document.article');
	const m = meta({ collection: 'app.offprint.document.article' });

	it('renders the document reference as strongRef', () => {
		const result = format(
			record({ document: { uri: 'at://did:plc:test/site.standard.document/abc', cid: 'baf...' } }),
			m,
		);
		expect(result).toContain('**Document:** `at://did:plc:test/site.standard.document/abc`');
	});
});
