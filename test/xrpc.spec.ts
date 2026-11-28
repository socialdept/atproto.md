import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { xrpc } from '../src/xrpc';

// One PLC account on one PDS, plus the relay and the app view.
const DID = 'did:plc:alice';
const PDS = 'https://pds.example';

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let calls: string[] = [];

beforeEach(() => {
	calls = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = new URL(String(input instanceof Request ? input.url : input));
		calls.push(url.href);
		if (url.pathname.endsWith('com.atproto.identity.resolveHandle')) {
			return url.searchParams.get('handle') === 'alice.test' ? json({ did: DID }) : json({ message: 'no' }, 400);
		}
		if (url.hostname === 'plc.directory') {
			return json({
				id: DID,
				alsoKnownAs: ['at://alice.test'],
				service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }],
			});
		}
		return json({ from: url.host, repo: url.searchParams.get('repo'), did: url.searchParams.get('did') });
	});
});

afterEach(() => vi.restoreAllMocks());

const call = (path: string, init?: RequestInit) => {
	const request = new Request(`https://atproto.md/xrpc/${path}`, init);
	return xrpc(request, new URL(request.url));
};

describe('xrpc', () => {
	it("sends a repo method to the account's PDS, with the handle swapped for the DID", async () => {
		const res = await call('com.atproto.repo.getRecord?repo=alice.test&collection=app.bsky.feed.post&rkey=x');
		expect(await res.json()).toEqual({ from: 'pds.example', repo: DID, did: null });
		expect(res.headers.get('X-Upstream-Host')).toBe('pds.example');
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('sends a sync method that names an account to its PDS, and the rest of sync to the relay', async () => {
		expect(await (await call('com.atproto.sync.getLatestCommit?did=alice.test')).json()).toMatchObject({ from: 'pds.example', did: DID });
		expect(await (await call('com.atproto.sync.listReposByCollection?collection=a.b.c')).json()).toMatchObject({
			from: 'relay1.us-west.bsky.network',
		});
	});

	it('sends app.bsky methods to the public app view', async () => {
		expect(await (await call('app.bsky.actor.getProfile?actor=alice.test')).json()).toMatchObject({ from: 'public.api.bsky.app' });
	});

	it('answers identity methods itself', async () => {
		expect(await (await call('com.atproto.identity.resolveHandle?handle=alice.test')).json()).toEqual({ did: DID });
		const id = (await (await call(`com.atproto.identity.resolveIdentity?identifier=${DID}`)).json()) as { handle: string };
		expect(id.handle).toBe('alice.test');
		expect(calls.some((c) => c.startsWith(PDS))).toBe(false);
	});

	it('redirects blobs and whole repos to the PDS without fetching them', async () => {
		const blob = await call('com.atproto.sync.getBlob?did=alice.test&cid=bafy');
		expect(blob.status).toBe(302);
		expect(blob.headers.get('Location')).toBe(`${PDS}/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aalice&cid=bafy`);
		const repo = await call('com.atproto.sync.getRepo?did=alice.test');
		expect(repo.headers.get('Location')).toBe(`${PDS}/xrpc/com.atproto.sync.getRepo?did=did%3Aplc%3Aalice`);
		expect(calls.some((c) => c.startsWith(PDS))).toBe(false);
	});

	it('refuses a signed-in call without forwarding it', async () => {
		const res = await call('com.atproto.repo.getRecord?repo=alice.test', { headers: { Authorization: 'Bearer secret' } });
		expect(res.status).toBe(401);
		expect(((await res.json()) as { error: string }).error).toBe('AuthNotSupported');
		expect(calls).toEqual([]);
	});

	it('refuses procedures', async () => {
		const res = await call('com.atproto.repo.createRecord', { method: 'POST', body: '{}' });
		expect(res.status).toBe(405);
		expect(calls).toEqual([]);
	});

	it('says so when no server is known for a method', async () => {
		const res = await call('chat.bsky.convo.listConvos');
		expect(res.status).toBe(501);
		expect(((await res.json()) as { error: string }).error).toBe('MethodNotImplemented');
	});

	it("reports an account that cannot be resolved in XRPC's error shape", async () => {
		const res = await call('com.atproto.repo.describeRepo?repo=nobody.test');
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'NotFound', message: 'Could not resolve handle: nobody.test' });
	});
});
