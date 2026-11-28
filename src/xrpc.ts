import { CORS } from './http';
import { resolveActor, resolveDidDoc, resolveToDid } from './identity';
import { RELAY } from './relay';
import { DEFAULT_LABELER } from './labelers';
import { labelerEndpoint } from './labels';

// One XRPC endpoint for the whole network: /xrpc/{method} with the same query an atproto server takes. Identity
// methods are answered here. Repo and sync methods that name an account go to that account's PDS, a handle in
// their place is resolved to the DID first, the rest of sync goes to the relay, and app.bsky methods go to the public
// app view. Read only: a call that signs in, or any procedure, is refused, so no credential ever passes through.

const APPVIEW = 'https://public.api.bsky.app';

// Upstream headers worth passing on. Everything else (cookies, the upstream's own CORS) is left behind.
const PASS = ['content-type', 'content-length', 'content-encoding', 'etag', 'last-modified', 'atproto-repo-rev', 'atproto-content-labelers'];

// Blobs are whatever the account uploaded, so nothing proxied may run as a page on this origin.
const SAFE = { 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff' };

// A blob is addressed by its CID and never changes, so it can be cached for long. Everything else for a minute.
const BLOB_TTL = 86400;
const TTL = 60;

const xrpcError = (status: number, error: string, message: string): Response =>
	new Response(JSON.stringify({ error, message }), {
		status,
		headers: { ...CORS, ...SAFE, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
	});

const json = (body: unknown): Response =>
	new Response(JSON.stringify(body), {
		headers: { ...CORS, ...SAFE, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${TTL}` },
	});

// The account a method is about, and the parameter that names it.
function accountParam(method: string, params: URLSearchParams): string | null {
	if (method.startsWith('com.atproto.repo.') && params.has('repo')) return 'repo';
	if (method.startsWith('com.atproto.sync.') && params.has('did')) return 'did';
	return null;
}

// A handle's DID, or null when the handle does not point back at a DID whose document names it.
async function verifiedHandle(did: string, aka: string[] | undefined): Promise<string> {
	const handle = aka?.find((a) => a.startsWith('at://'))?.slice('at://'.length);
	if (!handle) return 'handle.invalid';
	try {
		return (await resolveToDid(handle)) === did ? handle : 'handle.invalid';
	} catch {
		return 'handle.invalid';
	}
}

async function identity(method: string, params: URLSearchParams): Promise<Response | null> {
	if (method === 'com.atproto.identity.resolveHandle') {
		const handle = params.get('handle');
		if (!handle) return xrpcError(400, 'InvalidRequest', 'Error: Params must have the property "handle"');
		return json({ did: await resolveToDid(handle) });
	}
	if (method === 'com.atproto.identity.resolveDid') {
		const did = params.get('did');
		if (!did) return xrpcError(400, 'InvalidRequest', 'Error: Params must have the property "did"');
		return json({ didDoc: await resolveDidDoc(did) });
	}
	if (method === 'com.atproto.identity.resolveIdentity') {
		const identifier = params.get('identifier');
		if (!identifier) return xrpcError(400, 'InvalidRequest', 'Error: Params must have the property "identifier"');
		const did = await resolveToDid(identifier);
		const didDoc = await resolveDidDoc(did);
		return json({ did, handle: await verifiedHandle(did, didDoc.alsoKnownAs), didDoc });
	}
	return null;
}

// Where a method goes, with the query to send. Null when no server for it is known.
async function route(method: string, params: URLSearchParams): Promise<{ base: string; params: URLSearchParams } | null> {
	const name = accountParam(method, params);
	if (name) {
		const actor = await resolveActor(params.get(name)!);
		const out = new URLSearchParams(params);
		out.set(name, actor.did);
		return { base: actor.pds, params: out };
	}
	// Labels are asked of the labeler named in sources, Bluesky's moderation labeler when none is. /labels asks several.
	if (method === 'com.atproto.label.queryLabels') {
		const sources = params.getAll('sources');
		if (sources.length > 1) throw { status: 400, message: 'Name one labeler in sources. /labels/{target}?labelers= asks several at once.' };
		const did = sources[0] ? await resolveToDid(sources[0]) : DEFAULT_LABELER;
		const out = new URLSearchParams(params);
		out.set('sources', did);
		return { base: await labelerEndpoint(did), params: out };
	}
	if (method.startsWith('com.atproto.sync.')) return { base: RELAY, params };
	if (method.startsWith('app.bsky.')) return { base: APPVIEW, params };
	return null;
}

export async function xrpc(request: Request, url: URL): Promise<Response> {
	const method = url.pathname.slice('/xrpc/'.length);
	if (!/^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/.test(method)) {
		return xrpcError(400, 'InvalidRequest', 'Expected /xrpc/{method}, for example /xrpc/com.atproto.repo.getRecord');
	}
	if (request.headers.has('Authorization')) {
		return xrpcError(401, 'AuthNotSupported', 'atproto.md serves public reads only. Send signed-in calls to the account’s own PDS.');
	}
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		return xrpcError(405, 'MethodNotSupported', 'atproto.md serves queries only. Send procedures to the account’s own PDS.');
	}

	try {
		const answered = await identity(method, url.searchParams);
		if (answered) return answered;

		const target = await route(method, url.searchParams);
		if (!target) return xrpcError(501, 'MethodNotImplemented', `atproto.md does not know which server answers ${method}.`);

		const upstream = new URL(`${target.base}/xrpc/${method}`);
		upstream.search = target.params.toString();
		const ttl = method === 'com.atproto.sync.getBlob' ? BLOB_TTL : TTL;
		let res: Response;
		try {
			res = await fetch(upstream.toString(), {
				method: request.method,
				headers: { Accept: request.headers.get('Accept') ?? '*/*' },
				cf: { cacheTtl: ttl, cacheEverything: true },
			} as RequestInit);
		} catch {
			return xrpcError(502, 'UpstreamFailure', `Could not reach ${new URL(target.base).host}.`);
		}

		const headers = new Headers({ ...CORS, ...SAFE, 'X-Upstream-Host': new URL(target.base).host });
		for (const h of PASS) {
			const v = res.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('Cache-Control', res.ok ? `public, max-age=${ttl}` : 'no-store');
		return new Response(res.body, { status: res.status, headers });
	} catch (err: unknown) {
		const error = err as { status?: number; message?: string };
		const status = error?.status ?? 502;
		const code = status === 404 ? 'NotFound' : status === 400 ? 'InvalidRequest' : 'UpstreamFailure';
		return xrpcError(status, code, error?.message ?? 'The request could not be completed.');
	}
}
