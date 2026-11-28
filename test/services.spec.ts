import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { didDocument } from '../src/api';
import { xrpc } from '../src/xrpc';

// Two app domains: pics.example publishes an app view beside a PDS, labeler and feed generator, and quiet.example
// publishes nothing. The lexicon for example.pics.photo.upload is published, as a procedure.
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const LEXICON_DID = 'did:plc:lexicons';

let calls: { url: string; method: string; body: string | null; headers: Record<string, string> }[] = [];

beforeEach(() => {
	calls = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const req = input instanceof Request ? input : new Request(String(input), init);
		const url = new URL(req.url);
		calls.push({ url: url.href, method: req.method, body: req.body ? await req.text() : null, headers: Object.fromEntries(req.headers) });
		if (url.href === 'https://pics.example/.well-known/did.json') {
			return json({
				id: 'did:web:pics.example',
				service: [
					{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.pics.example' },
					{ id: '#atproto_labeler', type: 'AtprotoLabeler', serviceEndpoint: 'https://labels.pics.example' },
					{ id: '#pics_fg', type: 'BskyFeedGenerator', serviceEndpoint: 'https://feeds.pics.example' },
					{ id: '#pics_appview', type: 'PicsAppView', serviceEndpoint: 'https://api.pics.example/' },
				],
			});
		}
		// A domain with no server: the connection never answers.
		if (url.href === 'https://api.pics.example/.well-known/did.json') return new Promise<Response>(() => {});
		if (url.href === 'https://named.example/.well-known/did.json') {
			return json({
				id: 'did:web:named.example',
				service: [{ id: '#special', type: 'Special', serviceEndpoint: 'https://special.example' }],
			});
		}
		if (url.hostname === 'cloudflare-dns.com') {
			const name = url.searchParams.get('name');
			return name === '_lexicon.photo.pics.example' ? json({ Status: 0, Answer: [{ data: `"did=${LEXICON_DID}"` }] }) : json({ Status: 3 });
		}
		if (url.hostname === 'plc.directory') {
			return json({
				id: LEXICON_DID,
				service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.lexicons.example' }],
			});
		}
		if (url.origin === 'https://pds.lexicons.example' && url.pathname.endsWith('getRecord')) {
			return json({
				uri: 'at://x',
				cid: 'c',
				value: {
					lexicon: 1,
					id: url.searchParams.get('rkey'),
					defs: { main: { type: url.searchParams.get('rkey')!.endsWith('upload') ? 'procedure' : 'query' } },
				},
			});
		}
		if (url.origin === 'https://api.pics.example' || url.origin === 'https://special.example')
			return json({ from: url.host, path: url.pathname });
		return new Response('not found', { status: 404 });
	});
});

afterEach(() => vi.restoreAllMocks());

const call = (path: string, init?: RequestInit) => {
	const request = new Request(`https://atproto.md/xrpc/${path}`, init);
	return xrpc(request, new URL(request.url));
};

describe('services', () => {
	it('sends a call to the service an atproto-proxy header names', async () => {
		const res = await call('example.any.thing', { headers: { 'atproto-proxy': 'did:web:named.example#special' } });
		expect(await res.json()).toEqual({ from: 'special.example', path: '/xrpc/example.any.thing' });
		expect(res.headers.get('X-Upstream-Service')).toBe('did:web:named.example#special');
	});

	it('explains a malformed header or a service the DID does not have', async () => {
		expect((await call('example.any.thing', { headers: { 'atproto-proxy': 'not-a-did' } })).status).toBe(400);
		const missing = await call('example.any.thing', { headers: { 'atproto-proxy': 'did:web:named.example#nope' } });
		expect(missing.status).toBe(404);
		expect(((await missing.json()) as { message: string }).message).toBe('did:web:named.example has no service #nope.');
	});

	it("finds the app view on the app's own domain, past its PDS, labeler and feed generator", async () => {
		const res = await call('example.pics.photo.getPhoto?id=1');
		expect(await res.json()).toEqual({ from: 'api.pics.example', path: '/xrpc/example.pics.photo.getPhoto' });
		expect(res.headers.get('X-Upstream-Service')).toBe('did:web:pics.example#pics_appview');
	});

	it('says where it looked when no app view is published', async () => {
		const res = await call('example.quiet.thing.get');
		expect(res.status).toBe(501);
		expect(((await res.json()) as { message: string }).message).toContain('quiet.example, api.quiet.example');
	});

	it("forwards a procedure's body, and holds each verb to what the lexicon says", async () => {
		const res = await call('example.pics.photo.upload', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{"a":1}',
		});
		expect(res.status).toBe(200);
		const sent = calls.find((c) => c.url.startsWith('https://api.pics.example/xrpc/'))!;
		expect(sent).toMatchObject({ method: 'POST', body: '{"a":1}' });
		expect(sent.headers['content-type']).toBe('application/json');
		expect((await call('example.pics.photo.upload')).status).toBe(405);
	});

	it('refuses every com.atproto procedure, since some write without signing in', async () => {
		const res = await call('com.atproto.server.createAccount', { method: 'POST', body: '{}' });
		expect(res.status).toBe(405);
		expect(calls).toEqual([]);
	});

	it('names itself when fetching a did:web document, and reads one with no PDS', async () => {
		expect((await didDocument('did:web:pics.example')).id).toBe('did:web:pics.example');
		expect(calls.find((c) => c.url.endsWith('/.well-known/did.json'))!.headers['user-agent']).toBe('atproto.md (+https://atproto.md)');
	});
});
