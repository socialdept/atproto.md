import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { trace } from '../src/trace';

// alice.test publishes its DID over DNS only. bob.test publishes a different DID over HTTPS than over DNS.
const DID = 'did:plc:alice';
const PDS = 'https://pds.example';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const txt = (name: string, values: string[]) => json({ Status: 0, Answer: values.map((v) => ({ name, data: `"${v}"` })) });

beforeEach(() => {
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = new URL(String(input instanceof Request ? input.url : input));
		if (url.hostname === 'cloudflare-dns.com') {
			const name = url.searchParams.get('name')!;
			if (name === '_atproto.alice.test') return txt(name, [`did=${DID}`]);
			if (name === '_atproto.bob.test') return txt(name, ['did=did:plc:bob']);
			return json({ Status: 3 });
		}
		if (url.pathname === '/.well-known/atproto-did') {
			if (url.hostname === 'bob.test') return new Response('did:plc:other');
			if (url.hostname === 'down.test') throw new TypeError('internal error');
			return new Response('Not found', { status: 404 });
		}
		if (url.hostname === 'plc.directory') {
			return json({ id: decodeURIComponent(url.pathname.slice(1)), alsoKnownAs: ['at://alice.test'], service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: PDS }] });
		}
		if (url.origin === PDS && url.pathname === '/.well-known/oauth-protected-resource') return json({ authorization_servers: ['https://entryway.example'] });
		if (url.origin === PDS && url.pathname.endsWith('getRepoStatus')) return json({ did: DID, active: true });
		if (url.pathname.endsWith('getBlob')) return new Response('img', { headers: { 'Content-Type': 'image/png' } });
		if (url.pathname.endsWith('getRepo')) return new Response('car-bytes', { headers: { 'Content-Type': 'application/vnd.ipld.car' } });
		if (url.pathname.endsWith('resolveHandle')) return json({ did: DID });
		return json({ message: `unexpected ${url}` }, 500);
	});
});

afterEach(() => vi.restoreAllMocks());

const steps = (r: Awaited<ReturnType<typeof trace>>) => Object.fromEntries(r.steps.map((s) => [s.step, s]));

describe('trace', () => {
	it('verifies a handle both ways and checks the PDS, while a missing HTTPS record is not a failure', async () => {
		const r = await trace('alice.test');
		expect(r).toMatchObject({ did: DID, handle: 'alice.test', handleVerified: true, pds: PDS, entryway: 'https://entryway.example', ok: true });
		expect(steps(r)['handle-http']).toMatchObject({ ok: false, status: 404 });
		expect(steps(r)['pds']).toMatchObject({ ok: true, result: { active: true } });
	});

	it('resolves a DID forward and checks its handle back', async () => {
		const r = await trace(DID);
		expect(r).toMatchObject({ did: DID, handle: 'alice.test', handleVerified: true, ok: true });
		expect(r.steps[0].step).toBe('did-document');
	});

	it('reports DNS and HTTPS naming different DIDs', async () => {
		const r = await trace('bob.test');
		expect(steps(r)['handle-agree'].error).toBe('DNS and HTTPS name different DIDs: did:plc:bob and did:plc:other.');
		expect(r.handleVerified).toBe(false);
		expect(r.ok).toBe(false);
	});

	it('says a domain could not be reached in place of the runtime error', async () => {
		const r = await trace('down.test');
		expect(steps(r)['handle-http'].error).toBe('Could not connect to down.test. The domain may have no web server.');
		expect(r).toMatchObject({ did: null, ok: false });
	});
});

describe('did, repo and blob routes', () => {
	const get = async (path: string) => {
		const ctx = createExecutionContext();
		const res = await worker.fetch(new Request(`https://atproto.md${path}`) as never, env, ctx);
		await waitOnExecutionContext(ctx);
		return res;
	};

	it('serves the DID document at /did/doc', async () => {
		expect(((await (await get('/did/doc/alice.test')).json()) as { id: string }).id).toBe(DID);
	});

	it('serves the trace at /did/trace', async () => {
		expect(await (await get('/did/trace/alice.test')).json()).toMatchObject({ did: DID, handleVerified: true });
	});

	it('serves the repo as a CAR download at /repo/car', async () => {
		const res = await get('/repo/car/alice.test');
		expect(res.headers.get('Content-Type')).toBe('application/vnd.ipld.car');
		expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="did_plc_alice.car"');
		expect(await res.text()).toBe('car-bytes');
	});

	it('serves a blob sandboxed, and redirects to the image CDN with transform options', async () => {
		const res = await get('/blob/alice.test/bafyimg');
		expect(res.headers.get('Content-Type')).toBe('image/png');
		expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox");
		const cdn = await get('/blob/alice.test/bafyimg/p=avatar,f=webp');
		expect(cdn.status).toBe(302);
		expect(cdn.headers.get('Location')).toBe('https://img.infra.coop/blob/did%3Aplc%3Aalice/bafyimg/p=avatar,f=webp');
	});

	it('refuses a malformed CID or transform options', async () => {
		expect((await get('/blob/alice.test/bafy%2F..')).status).toBe(400);
		expect((await get('/blob/alice.test/bafyimg/p=a%3Cb')).status).toBe(400);
	});

	it('explains an unknown view', async () => {
		const res = await get('/did/nope/alice.test');
		expect(res.status).toBe(400);
		expect(((await res.json()) as { error: string }).error).toBe('Usage: /did/{doc|trace}/{handle-or-did}');
	});
});
