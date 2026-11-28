import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecords, labels } from '../src/api';
import { current, pickLabelers } from '../src/labels';
import { DEFAULT_LABELER, LABELERS } from '../src/labelers';
import { xrpc } from '../src/xrpc';

// Alice's post carries a label from the default labeler, her account one from a second labeler that also negated
// an older label, and a third labeler is down.
const DID = 'did:plc:alice';
const PDS = 'https://pds.example';
const POST = `at://${DID}/app.bsky.feed.post/p1`;
const SECOND = 'did:plc:second';
const DOWN = 'did:plc:down';

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const doc = (did: string, service: Record<string, string>) =>
	json({ id: did, alsoKnownAs: [`at://${did.slice(8)}.test`], service: [service] });

const LABELS: Record<string, unknown[]> = {
	[DEFAULT_LABELER]: [{ src: DEFAULT_LABELER, uri: POST, val: 'porn', cts: '2026-01-01T00:00:00Z' }],
	[SECOND]: [
		{ src: SECOND, uri: DID, val: 'spam', cts: '2025-01-01T00:00:00Z' },
		{ src: SECOND, uri: DID, val: 'spam', cts: '2025-02-01T00:00:00Z', neg: true },
		{ src: SECOND, uri: DID, val: 'artist', cts: '2025-03-01T00:00:00Z' },
		{ src: 'did:plc:someone-else', uri: DID, val: 'forged', cts: '2025-03-01T00:00:00Z' },
	],
};

let calls: string[] = [];

beforeEach(() => {
	calls = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = new URL(String(input instanceof Request ? input.url : input));
		calls.push(url.href);
		if (url.pathname.endsWith('resolveHandle')) {
			const handle = url.searchParams.get('handle');
			return handle === 'alice.test' ? json({ did: DID }) : handle === 'second.test' ? json({ did: SECOND }) : json({ message: 'no' }, 400);
		}
		if (url.hostname === 'plc.directory') {
			const did = decodeURIComponent(url.pathname.slice(1));
			if (did === DID) return doc(DID, { id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS });
			return doc(did, { id: '#atproto_labeler', type: 'AtprotoLabeler', serviceEndpoint: `https://${did.slice(8)}.labeler.example` });
		}
		if (url.pathname.endsWith('queryLabels')) {
			const src = url.searchParams.get('sources')!;
			if (src === DOWN) return json({ message: 'down' }, 503);
			const patterns = url.searchParams.getAll('uriPatterns');
			return json({ labels: (LABELS[src] ?? []).filter((l) => patterns.includes((l as { uri: string }).uri)) });
		}
		if (url.origin === PDS && url.pathname.endsWith('getRecord')) {
			return json({
				uri: `at://${DID}/${url.searchParams.get('collection')}/${url.searchParams.get('rkey')}`,
				cid: 'c',
				value: { text: 'hi' },
			});
		}
		return json({ message: `unexpected ${url}` }, 500);
	});
});

afterEach(() => vi.restoreAllMocks());

describe('pickLabelers', () => {
	it('asks Bluesky only by default, every known labeler for all, and any handles or DIDs named', async () => {
		expect(await pickLabelers()).toEqual([DEFAULT_LABELER]);
		expect(await pickLabelers('all')).toEqual(LABELERS.map((l) => l.did));
		expect(await pickLabelers(`second.test, ${DOWN}, @second.test`)).toEqual([SECOND, DOWN]);
	});
});

describe('current', () => {
	it('keeps the latest label of each value, without negated or expired ones', () => {
		const now = Date.parse('2026-06-01T00:00:00Z');
		const out = current(
			[
				{ src: 'a', uri: 'u', val: 'x', cts: '2025-01-01' },
				{ src: 'a', uri: 'u', val: 'x', cts: '2025-02-01', neg: true },
				{ src: 'a', uri: 'u', val: 'y', cts: '2025-01-01', exp: '2026-01-01T00:00:00Z' },
				{ src: 'a', uri: 'u', val: 'z', cts: '2025-01-01' },
			],
			now,
		);
		expect(out.map((l) => l.val)).toEqual(['z']);
	});
});

describe('labels', () => {
	it("returns a record's labels from the default labeler", async () => {
		const r = await labels(POST);
		expect(r.target).toBe(POST);
		expect(r.labels).toEqual([
			{ val: 'porn', uri: POST, cts: '2026-01-01T00:00:00Z', labeler: { did: DEFAULT_LABELER, handle: 'moderation.bsky.app' } },
		]);
		expect(r).not.toHaveProperty('authorLabels');
	});

	it("adds the account's labels with author, and reports a labeler that failed without dropping the rest", async () => {
		const r = await labels('https://bsky.app/profile/alice.test/post/p1', { author: true, labelers: `${SECOND},${DOWN}` });
		expect(r.authorLabels!.map((l) => l.val)).toEqual(['artist']);
		expect(r.labelers).toEqual([
			{ did: SECOND, handle: null, ok: true },
			{ did: DOWN, handle: null, ok: false, error: 'The labeler answered 503.' },
		]);
	});

	it("targets the account's DID for a handle", async () => {
		expect((await labels('alice.test', { labelers: SECOND })).labels.map((l) => l.val)).toEqual(['artist']);
	});
});

describe('labels on records', () => {
	it('asks each labeler once for a whole batch, and attaches labels and author labels per record', async () => {
		const r = await getRecords([POST, `at://${DID}/app.bsky.feed.post/p2`], { author: true, labelers: `${DEFAULT_LABELER},${SECOND}` });
		expect(calls.filter((c) => c.includes('queryLabels'))).toHaveLength(2);
		expect(r.records[0].labels!.map((l) => l.val)).toEqual(['porn']);
		expect(r.records[1].labels).toEqual([]);
		expect(r.records[1].authorLabels!.map((l) => l.val)).toEqual(['artist']);
	});

	it('leaves labels out unless they are asked for', async () => {
		const r = await getRecords([POST]);
		expect(r.records[0]).not.toHaveProperty('labels');
		expect(r).not.toHaveProperty('labelers');
		expect(calls.some((c) => c.includes('queryLabels'))).toBe(false);
	});
});

describe('xrpc queryLabels', () => {
	const call = (q: string) => {
		const request = new Request(`https://atproto.md/xrpc/com.atproto.label.queryLabels?${q}`);
		return xrpc(request, new URL(request.url));
	};

	it('goes to the labeler named in sources, or the default one', async () => {
		expect((await call(`uriPatterns=${DID}&sources=second.test`)).headers.get('X-Upstream-Host')).toBe('second.labeler.example');
		expect((await call(`uriPatterns=${DID}`)).headers.get('X-Upstream-Host')).toBe(`${DEFAULT_LABELER.slice(8)}.labeler.example`);
	});

	it('refuses more than one labeler in sources', async () => {
		expect((await call(`uriPatterns=x&sources=${SECOND}&sources=${DOWN}`)).status).toBe(400);
	});
});
