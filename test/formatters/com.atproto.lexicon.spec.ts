import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('com.atproto.lexicon.schema', () => {
	const format = formatter('com.atproto.lexicon.schema');
	const m = meta({ collection: 'com.atproto.lexicon.schema' });

	it('renders the def index and schema JSON', () => {
		const result = format(
			record({
				lexicon: 1,
				id: 'app.bsky.feed.like',
				defs: { main: { type: 'record', description: 'A like.' } },
			}),
			m,
		);
		expect(result).toContain('**Definitions:**');
		expect(result).toContain('- `main` (`record`) — A like.');
		expect(result).toContain('```json');
		expect(result).toContain('"id": "app.bsky.feed.like"');
	});
});
