import { describe, it, expect } from 'vitest';
import { genericMd, formatRecord } from '../src/format';

// Ensure formatters are registered before tests run
import '../src/formatters';

describe('genericMd', () => {
	it('renders null and undefined', () => {
		expect(genericMd(null)).toBe('*null*');
		expect(genericMd(undefined)).toBe('*null*');
	});

	it('renders primitives as strings', () => {
		expect(genericMd('hello')).toBe('hello');
		expect(genericMd(42)).toBe('42');
		expect(genericMd(true)).toBe('true');
	});

	it('renders empty array', () => {
		expect(genericMd([])).toBe('*empty*');
	});

	it('renders flat array as list', () => {
		expect(genericMd(['a', 'b'])).toBe('- a\n- b');
	});

	it('renders flat object with bold keys at depth 0', () => {
		const result = genericMd({ name: 'Alice', age: 30 });
		expect(result).toContain('**name:** Alice');
		expect(result).toContain('**age:** 30');
	});

	it('renders nested object with italic keys at depth > 0', () => {
		const result = genericMd({ outer: { inner: 'value' } });
		expect(result).toContain('**outer:**');
		expect(result).toContain('*inner:* value');
	});

	it('strips $type keys', () => {
		const result = genericMd({ $type: 'app.bsky.feed.post', text: 'hello' });
		expect(result).not.toContain('$type');
		expect(result).toContain('**text:** hello');
	});
});

describe('formatRecord', () => {
	const meta = {
		handle: 'alice.bsky.social',
		collection: 'app.bsky.actor.profile',
		rkey: 'self',
		uri: 'at://did:plc:abc/app.bsky.actor.profile/self',
	};

	it('includes rkey, collection, and AT URI in the header', () => {
		const record = { uri: meta.uri, value: { displayName: 'Alice' } };
		const result = formatRecord(record, meta);

		expect(result).toContain('## `self`');
		expect(result).toContain('**Collection:** `app.bsky.actor.profile`');
		expect(result).toContain('**AT URI:** `at://did:plc:abc/app.bsky.actor.profile/self`');
	});

	it('uses a registered formatter when available', () => {
		const record = { uri: meta.uri, value: { displayName: 'Alice', description: 'Hello world' } };
		const result = formatRecord(record, meta);

		expect(result).toContain('**Display Name:** Alice');
		expect(result).toContain('Hello world');
	});

	it('falls back to genericMd for unknown collections', () => {
		const unknownMeta = { ...meta, collection: 'com.example.unknown' };
		const record = { uri: meta.uri, value: { foo: 'bar' } };
		const result = formatRecord(record, unknownMeta);

		expect(result).toContain('**foo:** bar');
	});
});
