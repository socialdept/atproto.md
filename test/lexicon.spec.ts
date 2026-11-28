import { describe, it, expect } from 'vitest';
import { nsidAuthority } from '../src/lexicon';

describe('nsidAuthority', () => {
	it('drops the name segment and reverses the domain labels', () => {
		expect(nsidAuthority('app.bsky.feed.post')).toBe('feed.bsky.app');
		expect(nsidAuthority('com.example.fooBar')).toBe('example.com');
		expect(nsidAuthority('community.lexicon.calendar.event')).toBe('calendar.lexicon.community');
	});

	it('handles the spec example', () => {
		expect(nsidAuthority('edu.university.dept.lab.blogging.getBlogPost')).toBe('blogging.lab.dept.university.edu');
	});

	it('rejects NSIDs with fewer than three segments', () => {
		expect(() => nsidAuthority('com.example')).toThrow();
		expect(() => nsidAuthority('single')).toThrow();
	});

	it('rejects NSIDs with empty segments', () => {
		expect(() => nsidAuthority('app..post')).toThrow();
	});
});
