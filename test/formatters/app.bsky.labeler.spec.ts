import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('app.bsky.labeler.service', () => {
	const format = formatter('app.bsky.labeler.service');
	const m = meta({ collection: 'app.bsky.labeler.service' });

	it('renders with label policies', () => {
		const result = format(
			record({
				createdAt: '2025-01-01T00:00:00Z',
				policies: { labelValues: ['spam', 'nsfw', 'impersonation'] },
				description: 'My label service',
			}),
			m,
		);
		expect(result).toContain('**Created:**');
		expect(result).toContain('**Label values:** spam, nsfw, impersonation');
		expect(result).toContain('My label service');
	});

	it('handles missing policies', () => {
		const result = format(record({ createdAt: '2025-01-01T00:00:00Z' }), m);
		expect(result).toContain('**Created:**');
		expect(result).not.toContain('Label values');
	});
});
