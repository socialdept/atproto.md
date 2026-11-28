import { describe, expect, it } from 'vitest';
import { scope } from '../src/scope';
import { recordLabels, type LabelEvent } from '../src/stats';

// A stats binding that keeps what it is sent, and a ctx that runs waitUntil work straight away.
function capture() {
	const sent: LabelEvent[] = [];
	const env = { STATS: { idFromName: () => 'id', get: () => ({ labelLookup: (e: LabelEvent) => sent.push(e) }) } } as unknown as Env;
	const ctx = { waitUntil: () => {} } as unknown as ExecutionContext;
	return { sent, run: (fn: () => void) => scope.run({ env, ctx }, fn) };
}

describe('label stats', () => {
	it('keeps only the kind of each subject, never its DID or record key', () => {
		const { sent, run } = capture();
		run(() =>
			recordLabels({
				subjects: [
					{ uri: 'did:plc:ewvi7nxzyoun6zhxrhs64oiz', labeled: true },
					{ uri: 'at://did:plc:ewvi7nxzyoun6zhxrhs64oiz/app.bsky.feed.post/3abc', labeled: false },
				],
				values: ['spam', '!hide', 'Not A Label <b>'],
				labelers: [
					{ did: 'did:plc:ar7c4by46qjdydhdevvrndac', ok: true, ms: 120, labels: 2 },
					{ did: 'did:plc:someoneelse', ok: false, ms: 3000, labels: 0 },
				],
			}),
		);
		expect(sent).toEqual([
			{
				subjects: [
					{ kind: 'account', labeled: true },
					{ kind: 'app.bsky.feed.post', labeled: false },
				],
				values: ['spam', '!hide'],
				labelers: [
					{ key: 'did:plc:ar7c4by46qjdydhdevvrndac', ok: true, ms: 120, labels: 2 },
					{ key: 'other', ok: false, ms: 3000, labels: 0 },
				],
			},
		]);
		expect(JSON.stringify(sent)).not.toMatch(/ewvi7nxzyoun6zhxrhs64oiz|someoneelse/);
	});

	it('does nothing outside a request', () => {
		expect(() => recordLabels({ subjects: [], values: [], labelers: [] })).not.toThrow();
	});
});
