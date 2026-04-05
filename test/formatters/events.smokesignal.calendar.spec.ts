import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('events.smokesignal.calendar.event', () => {
	const format = formatter('events.smokesignal.calendar.event');
	const m = meta({ collection: 'events.smokesignal.calendar.event' });

	it('renders a full event', () => {
		const result = format(
			record({
				name: 'AT Proto Meetup',
				startsAt: '2025-06-15T18:00:00Z',
				endsAt: '2025-06-15T21:00:00Z',
				locations: [{ name: 'San Francisco' }],
				description: 'Come hang out!',
			}),
			m,
		);
		expect(result).toContain('**Name:** AT Proto Meetup');
		expect(result).toContain('**Starts:**');
		expect(result).toContain('**Ends:**');
		expect(result).toContain('**Location:** San Francisco');
		expect(result).toContain('Come hang out!');
	});

	it('handles event with only a name', () => {
		const result = format(record({ name: 'Minimal Event' }), m);
		expect(result).toContain('**Name:** Minimal Event');
		expect(result).not.toContain('Starts');
		expect(result).not.toContain('Location');
	});

	it('shows Untitled when name is missing', () => {
		const result = format(record({}), m);
		expect(result).toContain('**Name:** Untitled');
	});

	it('joins multiple locations', () => {
		const result = format(record({ name: 'Multi', locations: [{ name: 'SF' }, { name: 'NYC' }] }), m);
		expect(result).toContain('**Location:** SF, NYC');
	});
});
