import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('blue.linkat.entry', () => {
	const format = formatter('blue.linkat.entry');
	const m = meta({ collection: 'blue.linkat.entry' });

	it('renders a link with all fields', () => {
		const result = format(record({ title: 'My Site', url: 'https://example.com', description: 'A cool site' }), m);
		expect(result).toContain('**Title:** My Site');
		expect(result).toContain('**URL:** [https://example.com](https://example.com)');
		expect(result).toContain('> A cool site');
	});

	it('handles entry with only a URL', () => {
		const result = format(record({ url: 'https://example.com' }), m);
		expect(result).toContain('**URL:** [https://example.com](https://example.com)');
		expect(result).not.toContain('Title');
	});
});
