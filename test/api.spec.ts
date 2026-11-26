import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { backlinks, getRecord, getRecords, listRecords, resolve } from '../src/api';

// A small fake network: one PLC DID on one PDS, with a reply thread and a profile.
const DID = 'did:plc:alice';
const PDS = 'https://pds.example';

const RECORDS: Record<string, { cid: string; value: Record<string, unknown> }> = {
	'app.bsky.actor.profile/self': {
		cid: 'cprofile',
		value: { $type: 'app.bsky.actor.profile', displayName: 'Alice', avatar: { $type: 'blob', ref: { $link: 'bafyavatar' }, mimeType: 'image/jpeg', size: 9 } },
	},
	'app.bsky.feed.post/root': { cid: 'croot', value: { $type: 'app.bsky.feed.post', text: 'root', createdAt: '2026-01-01T00:00:00Z' } },
	'app.bsky.feed.post/reply': {
		cid: 'creply',
		value: {
			$type: 'app.bsky.feed.post',
			text: 'reply',
			langs: ['en'],
			reply: { root: { uri: `at://${DID}/app.bsky.feed.post/root`, cid: 'croot' }, parent: { uri: `at://${DID}/app.bsky.feed.post/root`, cid: 'croot' } },
		},
	},
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fakeNetwork(input: RequestInfo | URL): Response {
	const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
	const q = url.searchParams;

	if (url.pathname.endsWith('com.atproto.identity.resolveHandle')) return q.get('handle') === 'alice.test' ? json({ did: DID }) : json({ message: 'no' }, 400);
	if (url.hostname === 'plc.directory') {
		return json({ id: DID, alsoKnownAs: ['at://alice.test'], service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }] });
	}
	if (url.hostname === 'constellation.microcosm.blue') {
		return json({ total: 1, records: [{ did: DID, collection: 'app.bsky.feed.post', rkey: 'reply' }] });
	}
	if (url.origin === PDS) {
		if (url.pathname.endsWith('describeRepo')) return json({ collections: ['app.bsky.actor.profile', 'app.bsky.feed.post'] });
		if (url.pathname.endsWith('listRecords')) {
			const records = Object.entries(RECORDS)
				.filter(([k]) => k.startsWith(`${q.get('collection')}/`))
				.map(([k, r]) => ({ uri: `at://${DID}/${k}`, ...r }));
			return json({ records, cursor: 'next' });
		}
		if (url.pathname.endsWith('getRecord')) {
			const r = RECORDS[`${q.get('collection')}/${q.get('rkey')}`];
			return r ? json({ uri: `at://${DID}/${q.get('collection')}/${q.get('rkey')}`, ...r }) : json({ error: 'RecordNotFound', message: 'Could not locate record' }, 400);
		}
	}
	return json({ message: `unexpected ${url}` }, 500);
}

let calls: string[] = [];

beforeEach(() => {
	calls = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		calls.push(String(input instanceof Request ? input.url : input));
		return fakeNetwork(input as RequestInfo);
	});
});

afterEach(() => vi.restoreAllMocks());

describe('records', () => {
	it('returns a record exactly as stored, with blob URLs', async () => {
		const r = await getRecord('at://alice.test/app.bsky.actor.profile/self');
		expect(r.value).toEqual(RECORDS['app.bsky.actor.profile/self'].value);
		expect(r.cid).toBe('cprofile');
		expect(r.blobs).toEqual([`${PDS}/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=bafyavatar`]);
	});

	it('expands referenced records one level deep', async () => {
		const r = await getRecord(`at://${DID}/app.bsky.feed.post/reply`, { expand: true });
		expect(Object.keys(r.expanded!)).toEqual([`at://${DID}/app.bsky.feed.post/root`]);
		expect((r.expanded![`at://${DID}/app.bsky.feed.post/root`] as { value: { text: string } }).value.text).toBe('root');
	});

	it('batches records, resolving each actor once, and reports failures per address', async () => {
		const r = await getRecords([
			'at://alice.test/app.bsky.feed.post/root',
			'https://bsky.app/profile/alice.test/post/reply',
			'at://alice.test/app.bsky.feed.post/missing',
		]);
		expect(r.records.map((x) => x.cid)).toEqual(['croot', 'creply']);
		expect(r.errors).toEqual([{ address: 'at://alice.test/app.bsky.feed.post/missing', error: 'Could not locate record' }]);
		expect(calls.filter((c) => c.includes('resolveHandle'))).toHaveLength(1);
		expect(calls.filter((c) => c.includes('plc.directory'))).toHaveLength(1);
	});

	it('refuses a batch over the limit and non-record addresses', async () => {
		await expect(getRecords(Array(26).fill('at://alice.test/app.bsky.feed.post/root'))).rejects.toMatchObject({ status: 400 });
		const r = await getRecords(['at://alice.test']);
		expect(r.errors?.[0].error).toContain('is not a record address');
	});

	it('lists records with the cursor and raw values', async () => {
		const r = await listRecords('alice.test', 'app.bsky.feed.post', { limit: 5 });
		expect(r).toMatchObject({ did: DID, handle: 'alice.test', pds: PDS, collection: 'app.bsky.feed.post', cursor: 'next' });
		expect(r.records[1].value).toEqual(RECORDS['app.bsky.feed.post/reply'].value);
	});

	it('resolves identity and collections together', async () => {
		const r = await resolve('alice.test');
		expect(r).toMatchObject({ did: DID, handle: 'alice.test', pds: PDS, collections: ['app.bsky.actor.profile', 'app.bsky.feed.post'] });
		expect(r.didDoc.id).toBe(DID);
	});

	it('hydrates backlinks into records', async () => {
		const r = await backlinks(`at://${DID}/app.bsky.feed.post/root`, { source: 'app.bsky.feed.post:reply.parent.uri', hydrate: true });
		expect(r).toMatchObject({ total: 1, cursor: null });
		expect((r.records as { cid: string }[])[0].cid).toBe('creply');
	});
});

async function workerFetch(path: string, init?: RequestInit) {
	const ctx = createExecutionContext();
	const res = await worker.fetch(new Request(`https://atproto.md${path}`, init) as never, env, ctx);
	await waitOnExecutionContext(ctx);
	return res;
}

describe('HTTP output', () => {
	it('wraps the JSON in a markdown fence by default', async () => {
		const res = await workerFetch('/at://alice.test/app.bsky.actor.profile/self');
		expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
		const body = await res.text();
		expect(body.startsWith('```json\n')).toBe(true);
		expect(JSON.parse(body.slice(8, body.lastIndexOf('\n```'))).value.displayName).toBe('Alice');
	});

	it('returns bare JSON for ?format=json and Accept: application/json', async () => {
		const a = await workerFetch('/at://alice.test/app.bsky.actor.profile/self?format=json');
		expect(a.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
		expect((await a.json<{ cid: string }>()).cid).toBe('cprofile');

		const b = await workerFetch('/resolve/alice.test', { headers: { Accept: 'application/json' } });
		expect((await b.json<{ did: string }>()).did).toBe(DID);
	});

	it('serves batches at /get', async () => {
		const res = await workerFetch(`/get?format=json&expand&uri=${encodeURIComponent(`at://${DID}/app.bsky.feed.post/reply`)}`);
		const body = await res.json<{ records: unknown[]; expanded: Record<string, unknown> }>();
		expect(body.records).toHaveLength(1);
		expect(Object.keys(body.expanded)).toHaveLength(1);
	});

	it('returns errors as JSON with the HTTP status', async () => {
		const res = await workerFetch('/at://alice.test/app.bsky.feed.post/missing?format=json');
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Could not locate record', status: 400 });
	});
});
