import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('app.bsky.graph.follow', () => {
	const format = formatter('app.bsky.graph.follow');
	const m = meta({ collection: 'app.bsky.graph.follow' });

	it('renders the followed subject', () => {
		const result = format(record({ subject: 'did:plc:followed', createdAt: '2025-03-01T00:00:00Z' }), m);
		expect(result).toContain('**Follows:** `did:plc:followed`');
		expect(result).toContain('**At:**');
	});
});

describe('app.bsky.graph.block', () => {
	const format = formatter('app.bsky.graph.block');
	const m = meta({ collection: 'app.bsky.graph.block' });

	it('renders the blocked subject', () => {
		const result = format(record({ subject: 'did:plc:blocked', createdAt: '2025-03-01T00:00:00Z' }), m);
		expect(result).toContain('**Blocks:** `did:plc:blocked`');
	});
});

describe('app.bsky.graph.list', () => {
	const format = formatter('app.bsky.graph.list');
	const m = meta({ collection: 'app.bsky.graph.list' });

	it('renders list with all fields', () => {
		const result = format(
			record({ name: 'Cool People', purpose: 'app.bsky.graph.defs#curatelist', description: 'People I like' }),
			m,
		);
		expect(result).toContain('**Name:** Cool People');
		expect(result).toContain('**Purpose:** `app.bsky.graph.defs#curatelist`');
		expect(result).toContain('People I like');
	});

	it('renders list without description', () => {
		const result = format(record({ name: 'Mute List', purpose: 'app.bsky.graph.defs#modlist' }), m);
		expect(result).toContain('**Name:** Mute List');
		expect(result).not.toContain('undefined');
	});
});

describe('app.bsky.graph.listitem', () => {
	const format = formatter('app.bsky.graph.listitem');
	const m = meta({ collection: 'app.bsky.graph.listitem' });

	it('renders subject and list reference', () => {
		const result = format(
			record({
				subject: 'did:plc:member',
				list: 'at://did:plc:test/app.bsky.graph.list/abc',
				createdAt: '2025-03-01T00:00:00Z',
			}),
			m,
		);
		expect(result).toContain('**Subject:** `did:plc:member`');
		expect(result).toContain('**List:** `at://did:plc:test/app.bsky.graph.list/abc`');
	});
});
