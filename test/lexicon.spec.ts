import { describe, it, expect } from 'vitest';
import { nsidAuthority, renderLexiconBody } from '../src/lexicon';

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

describe('renderLexiconBody', () => {
	const value = {
		lexicon: 1,
		id: 'app.bsky.feed.post',
		defs: {
			main: { type: 'record', description: 'A declaration of a post.' },
			replyRef: { type: 'object' },
		},
	};

	it('lists each def with its type and description', () => {
		const md = renderLexiconBody(value);
		expect(md).toContain('**Definitions:**');
		expect(md).toContain('- `main` (`record`) — A declaration of a post.');
		expect(md).toContain('- `replyRef` (`object`)');
	});

	it('embeds the full schema JSON', () => {
		const md = renderLexiconBody(value);
		expect(md).toContain('```json');
		expect(md).toContain('"id": "app.bsky.feed.post"');
	});

	it('handles a value with no defs', () => {
		const md = renderLexiconBody({ id: 'x.y.z' });
		expect(md).not.toContain('**Definitions:**');
		expect(md).toContain('```json');
	});
});
