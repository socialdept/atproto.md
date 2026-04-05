import { describe, it, expect } from 'vitest';
import { genericMd, formatRecord } from '../src/format';

// Ensure formatters are registered before tests run
import '../src/formatters';

describe('genericMd', () => {
	it('renders null and undefined as JSON', () => {
		expect(genericMd(null)).toContain('null');
		expect(genericMd(undefined)).toContain('null');
	});

	it('renders primitives as JSON', () => {
		expect(genericMd('hello')).toContain('"hello"');
		expect(genericMd(42)).toContain('42');
		expect(genericMd(true)).toContain('true');
	});

	it('renders arrays as JSON code blocks', () => {
		const result = genericMd(['a', 'b']);
		expect(result).toContain('```json');
		expect(result).toContain('"a"');
		expect(result).toContain('"b"');
	});

	it('renders objects as JSON code blocks', () => {
		const result = genericMd({ name: 'Alice', age: 30 });
		expect(result).toContain('```json');
		expect(result).toContain('"name": "Alice"');
		expect(result).toContain('"age": 30');
	});

	it('strips $type keys', () => {
		const result = genericMd({ $type: 'app.bsky.feed.post', text: 'hello' });
		expect(result).not.toContain('$type');
		expect(result).toContain('"text": "hello"');
	});

	it('strips nested $type keys', () => {
		const result = genericMd({ outer: { $type: 'some.type', value: 1 } });
		expect(result).not.toContain('$type');
		expect(result).toContain('"value": 1');
	});

	it('produces valid JSON inside the code block', () => {
		const result = genericMd({ foo: 'bar', nested: { baz: [1, 2] } });
		const json = result.replace(/```json\n/, '').replace(/\n```/, '');
		expect(() => JSON.parse(json)).not.toThrow();
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

	it('falls back to JSON code block for unknown collections', () => {
		const unknownMeta = { ...meta, collection: 'com.example.unknown' };
		const record = { uri: meta.uri, value: { foo: 'bar' } };
		const result = formatRecord(record, unknownMeta);

		expect(result).toContain('```json');
		expect(result).toContain('"foo": "bar"');
	});
});
