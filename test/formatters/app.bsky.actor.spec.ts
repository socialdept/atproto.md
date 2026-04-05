import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('app.bsky.actor.profile', () => {
	const format = formatter('app.bsky.actor.profile');
	const m = meta({ collection: 'app.bsky.actor.profile', rkey: 'self' });

	it('renders display name and description', () => {
		const result = format(record({ displayName: 'Alice', description: 'Building things' }), m);
		expect(result).toContain('**Display Name:** Alice');
		expect(result).toContain('Building things');
	});

	it('handles profile with only display name', () => {
		const result = format(record({ displayName: 'Alice' }), m);
		expect(result).toContain('**Display Name:** Alice');
		expect(result).not.toContain('undefined');
	});

	it('handles profile with only description', () => {
		const result = format(record({ description: 'Just a bio' }), m);
		expect(result).toContain('Just a bio');
		expect(result).not.toContain('Display Name');
	});
});
