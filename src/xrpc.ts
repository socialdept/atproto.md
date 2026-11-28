import { CORS } from './http';
import { resolveActor, resolveDidDoc, resolveToDid } from './identity';
import { RELAY } from './relay';
import { DEFAULT_LABELER } from './labelers';
import { labelerEndpoint } from './labels';
import { discover, proxyService } from './services';

// One XRPC endpoint for the whole network: /xrpc/{method} with the same query an atproto server takes. Identity
// methods are answered here. Repo and sync methods that name an account go to that account's PDS, a handle in
// their place is resolved to the DID first, the rest of sync goes to the relay, and app.bsky methods go to the public
// app view. Any other app's methods go to the service an atproto-proxy header names, or to the app view its domain
// publishes (see services.ts). Public calls only: a call that signs in is refused, so no credential passes through,
// and so is every com.atproto procedure, since some of those write without signing in (createAccount).

const APPVIEW = 'https://public.api.bsky.app';

// Upstream headers worth passing on. Everything else (cookies, the upstream's own CORS) is left behind.
const PASS = [
	'content-type',
	'content-length',
	'content-encoding',
	'etag',
	'last-modified',
	'atproto-repo-rev',
	'atproto-content-labelers',
];

// Blobs are whatever the account uploaded, so nothing proxied may run as a page on this origin.
const SAFE = { 'Content-Security-Policy': "default-src 'none'; sandbox", 'X-Content-Type-Options': 'nosniff' };

// Responses are cached for a minute.
const TTL = 60;

// Blobs and whole repos are sent on to the PDS with a redirect, since the PDS is built to stream them.
const REDIRECTS = new Set(['com.atproto.sync.getBlob', 'com.atproto.sync.getRepo']);
// Where a redirect points stays the same until the account moves, so a client may keep it for five minutes.
const REDIRECT_TTL = 300;

const xrpcError = (status: number, error: string, message: string): Response =>
	new Response(JSON.stringify({ error, message }), {
		status,
		headers: { ...CORS, ...SAFE, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
	});

// Where a call went, sent as X-Upstream-Kind so the usage stats can count destinations: the account's PDS, the relay,
// Bluesky's app view, a labeler, a service an atproto-proxy header named, an app view found from the app's domain, or
// atproto.md itself.
type Kind = 'pds' | 'relay' | 'appview' | 'labeler' | 'proxy' | 'discovered' | 'local';

const json = (body: unknown): Response =>
	new Response(JSON.stringify(body), {
		headers: {
			...CORS,
			...SAFE,
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': `public, max-age=${TTL}`,
			'X-Upstream-Kind': 'local',
		},
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

interface Target {
	base: string;
	params: URLSearchParams;
	/** The service as did#id, when one was named or found. */
	service?: string;
	/** The method's kind from its lexicon, when one was looked up. */
	kind?: 'query' | 'procedure' | null;
	/** Which sort of server answers it. */
	to: Kind;
}

// Where a method goes, with the query to send. Null when no server for it is known.
async function route(method: string, params: URLSearchParams, proxy: string | null): Promise<Target | null> {
	if (proxy) {
		const svc = await proxyService(proxy);
		return { base: svc.endpoint, params, service: svc.ref, to: 'proxy' };
	}
	const name = accountParam(method, params);
	if (name) {
		const actor = await resolveActor(params.get(name)!);
		const out = new URLSearchParams(params);
		out.set(name, actor.did);
		return { base: actor.pds, params: out, to: 'pds' };
	}
	// Labels are asked of the labeler named in sources, Bluesky's moderation labeler when none is. /labels asks several.
	if (method === 'com.atproto.label.queryLabels') {
		const sources = params.getAll('sources');
		if (sources.length > 1) throw { status: 400, message: 'Name one labeler in sources. /labels/{target}?labelers= asks several at once.' };
		const did = sources[0] ? await resolveToDid(sources[0]) : DEFAULT_LABELER;
		const out = new URLSearchParams(params);
		out.set('sources', did);
		return { base: await labelerEndpoint(did), params: out, to: 'labeler' };
	}
	if (method.startsWith('com.atproto.sync.')) return { base: RELAY, params, to: 'relay' };
	if (method.startsWith('app.bsky.')) return { base: APPVIEW, params, to: 'appview' };
	if (method.startsWith('com.atproto.')) return null;
	const found = await discover(method);
	if (!found.service) {
		throw {
			status: 501,
			message: `No app view found for ${method} at ${found.tried.join(', ')}. Send an atproto-proxy header naming the service, such as did:web:example.com#example_appview.`,
		};
	}
	return { base: found.service.endpoint, params, service: found.service.ref, kind: found.kind, to: 'discovered' };
}

// Request headers an app view may use, passed on as they came.
const FORWARD = ['accept', 'accept-language', 'atproto-accept-labelers', 'content-type'];

export async function xrpc(request: Request, url: URL): Promise<Response> {
	const method = url.pathname.slice('/xrpc/'.length);
	if (!/^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/.test(method)) {
		return xrpcError(400, 'InvalidRequest', 'Expected /xrpc/{method}, for example /xrpc/com.atproto.repo.getRecord');
	}
	if (request.headers.has('Authorization')) {
		return xrpcError(401, 'AuthNotSupported', 'atproto.md serves public reads only. Send signed-in calls to the account’s own PDS.');
	}
	const post = request.method === 'POST';
	if (!post && request.method !== 'GET' && request.method !== 'HEAD') {
		return xrpcError(405, 'MethodNotSupported', 'Send queries with GET and procedures with POST.');
	}
	if (post && method.startsWith('com.atproto.')) {
		return xrpcError(405, 'MethodNotSupported', 'atproto.md does not forward com.atproto procedures. Send them to the account’s own PDS.');
	}

	try {
		const answered = post ? null : await identity(method, url.searchParams);
		if (answered) return answered;

		const target = await route(method, url.searchParams, request.headers.get('atproto-proxy'));
		if (!target) return xrpcError(501, 'MethodNotImplemented', `atproto.md does not know which server answers ${method}.`);
		// A published lexicon says which verb the method takes.
		if (target.kind === 'procedure' && !post) return xrpcError(405, 'MethodNotSupported', `${method} is a procedure. Send it with POST.`);
		if (target.kind === 'query' && post) return xrpcError(405, 'MethodNotSupported', `${method} is a query. Send it with GET.`);

		const upstream = new URL(`${target.base}/xrpc/${method}`);
		upstream.search = target.params.toString();
		const host = new URL(target.base).host;
		if (REDIRECTS.has(method)) {
			return new Response(null, {
				status: 302,
				headers: {
					...CORS,
					Location: upstream.toString(),
					'X-Upstream-Host': host,
					'X-Upstream-Kind': target.to,
					'Cache-Control': `public, max-age=${REDIRECT_TTL}`,
				},
			});
		}
		let res: Response;
		try {
			const headers: Record<string, string> = {};
			for (const h of FORWARD) {
				const v = request.headers.get(h);
				if (v) headers[h] = v;
			}
			headers.accept ??= '*/*';
			res = await fetch(upstream.toString(), {
				method: request.method,
				headers,
				...(post ? { body: request.body } : { cf: { cacheTtl: TTL, cacheEverything: true } }),
			} as RequestInit);
		} catch {
			return xrpcError(502, 'UpstreamFailure', `Could not reach ${host}.`);
		}

		const headers = new Headers({
			...CORS,
			...SAFE,
			'X-Upstream-Host': host,
			'X-Upstream-Kind': target.to,
			...(target.service ? { 'X-Upstream-Service': target.service } : {}),
		});
		for (const h of PASS) {
			const v = res.headers.get(h);
			if (v) headers.set(h, v);
		}
		headers.set('Cache-Control', res.ok && !post ? `public, max-age=${TTL}` : 'no-store');
		return new Response(res.body, { status: res.status, headers });
	} catch (err: unknown) {
		const error = err as { status?: number; message?: string };
		const status = error?.status ?? 502;
		const code =
			status === 404 ? 'NotFound' : status === 400 ? 'InvalidRequest' : status === 501 ? 'MethodNotImplemented' : 'UpstreamFailure';
		return xrpcError(status, code, error?.message ?? 'The request could not be completed.');
	}
}
