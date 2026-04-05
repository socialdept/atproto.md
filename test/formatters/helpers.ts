import { expect } from 'vitest';
import { getFormatter } from '../../src/formatters/registry';
import type { AtpRecord, RecordMeta } from '../../src/types';

// Ensure all formatters are registered
import '../../src/formatters';

/** Build a minimal AtpRecord from a value object */
export function record(value: Record<string, unknown>): AtpRecord {
	return { uri: 'at://did:plc:test/collection/rkey123', value };
}

/** Build a minimal RecordMeta */
export function meta(overrides: Partial<RecordMeta> = {}): RecordMeta {
	return {
		handle: 'alice.bsky.social',
		collection: 'test.collection',
		rkey: 'rkey123',
		uri: 'at://did:plc:test/test.collection/rkey123',
		...overrides,
	};
}

/** Get a formatter and assert it exists */
export function formatter(collection: string) {
	const fn = getFormatter(collection);
	expect(fn, `No formatter registered for ${collection}`).toBeDefined();
	return fn!;
}
