import { lexicon } from './api';
import { resolveDidDoc } from './identity';
import type { DidDocument, DidService } from './types';

// Finding the server that answers a method outside com.atproto and app.bsky. The protocol's own way is the
// atproto-proxy header, "did#service_id", which a PDS resolves for its users: the DID document names the service's
// address. Without the header, the app's own domain is tried, since app views publish a did:web document there
// (grain.social names #grain_appview, whtwnd.com #whitewind_blog). Lexicon publishers are ordinary accounts that
// name no app view, so the lexicon only says whether a method is a query or a procedure.

export interface Service {
	/** The service as "did#id", the form an atproto-proxy header takes. */
	ref: string;
	endpoint: string;
}

const PROXY = /^(did:[a-z]+:[A-Za-z0-9._:%-]+)#([A-Za-z0-9._-]+)$/;

// Entries a DID document can hold that never answer an app's methods.
const NOT_APPVIEW = (s: DidService) =>
	s.id.endsWith('#atproto_pds') || s.id.endsWith('#atproto_labeler') || /FeedGenerator|PersonalDataServer|Labeler/.test(s.type);

const endpointOf = (s: DidService) => (typeof s.serviceEndpoint === 'string' ? s.serviceEndpoint.replace(/\/$/, '') : null);

/** The service an atproto-proxy header names. */
export async function proxyService(header: string): Promise<Service> {
	const m = header.trim().match(PROXY);
	if (!m) throw { status: 400, message: `The atproto-proxy header should be did#service_id, such as did:web:api.bsky.app#bsky_appview.` };
	const [, did, id] = m;
	let doc: DidDocument;
	try {
		doc = await resolveDidDoc(did);
	} catch {
		throw { status: 404, message: `Could not resolve ${did}, named in the atproto-proxy header.` };
	}
	const svc = doc.service?.find((s) => s.id === `#${id}` || s.id === `${did}#${id}`);
	const endpoint = svc && endpointOf(svc);
	if (!endpoint) throw { status: 404, message: `${did} has no service #${id}.` };
	return { ref: `${did}#${id}`, endpoint };
}

// The app view a did:web document names: one typed as an app view first, then the only remaining service.
async function appViewAt(domain: string): Promise<Service | null> {
	const did = `did:web:${domain}`;
	let doc: DidDocument;
	try {
		doc = await resolveDidDoc(did);
	} catch {
		return null;
	}
	const candidates = (doc.service ?? []).filter((s) => !NOT_APPVIEW(s) && endpointOf(s));
	const pick =
		candidates.find((s) => /AppView/i.test(s.type) || /appview/i.test(s.id)) ?? (candidates.length === 1 ? candidates[0] : undefined);
	return pick ? { ref: `${did}#${pick.id.split('#').pop()}`, endpoint: endpointOf(pick)! } : null;
}

export interface Discovery {
	service: Service | null;
	/** The method's kind from its published lexicon, or null when none is published. */
	kind: 'query' | 'procedure' | null;
	/** The domains that were tried, for the error message. */
	tried: string[];
}

// Discovery is cached for ten minutes per isolate, so a busy method does not resolve on every call.
const cache = new Map<string, { at: number; found: Discovery }>();
const CACHE_MS = 10 * 60 * 1000;

/** The app view for a method, found from the app's domain and the lexicon's publisher. */
export async function discover(method: string): Promise<Discovery> {
	const hit = cache.get(method);
	if (hit && Date.now() - hit.at < CACHE_MS) return hit.found;

	// social.grain.gallery.getGallery: the app's domain is the first two segments reversed, grain.social.
	const [tld, name] = method.split('.');
	const domain = `${name}.${tld}`;
	const schema = await lexicon(method).catch(() => null);
	const def = (schema?.schema as { defs?: { main?: { type?: string } } } | undefined)?.defs?.main;
	const kind = def?.type === 'query' || def?.type === 'procedure' ? def.type : null;
	// The lexicon's publisher may live on another domain than the NSID, such as an app that moved.
	const publisher = schema
		? await resolveDidDoc(schema.did)
				.then((d) => d.alsoKnownAs?.find((a) => a.startsWith('at://'))?.slice(5))
				.catch(() => undefined)
		: undefined;

	const tried = [...new Set([domain, `api.${domain}`, ...(publisher ? [publisher] : [])])];
	const found = await Promise.all(tried.map(appViewAt));
	const result: Discovery = { service: found.find(Boolean) ?? null, kind, tried };
	cache.set(method, { at: Date.now(), found: result });
	return result;
}
