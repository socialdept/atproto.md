// Parsing record addresses and finding the references and blobs inside a record value.

export interface Target {
	actor: string;
	collection?: string;
	rkey?: string;
}

// bsky.app path segments that map to a record collection: /profile/{actor}/{segment}/{rkey}
const BSKY_PATHS: Record<string, string> = {
	post: 'app.bsky.feed.post',
	feed: 'app.bsky.feed.generator',
	lists: 'app.bsky.graph.list',
	'starter-pack': 'app.bsky.graph.starterpack',
};

const BSKY_HOSTS = new Set(['bsky.app', 'www.bsky.app', 'staging.bsky.app', 'main.bsky.dev']);

/**
 * Accepts an at:// URI, a bare handle or DID, or a bsky.app link, and returns the actor, collection and rkey it
 * names. Throws a 400 for anything else.
 */
export function parseTarget(input: string): Target {
	const raw = input.trim();

	if (/^https?:\/\//i.test(raw)) {
		const url = new URL(raw);
		const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
		if (BSKY_HOSTS.has(url.hostname) && parts[0] === 'profile' && parts[1]) {
			if (parts.length === 2) return { actor: parts[1] };
			const collection = BSKY_PATHS[parts[2]];
			if (collection && parts[3]) return { actor: parts[1], collection, rkey: parts[3] };
		}
		throw { status: 400, message: `Unsupported URL: ${raw}. Use an at:// URI or a bsky.app profile, post, feed, list or starter pack link.` };
	}

	const path = raw.replace(/^at:\/\//, '');
	const [actor, collection, rkey] = path.split('/').filter(Boolean);
	if (!actor) throw { status: 400, message: `Invalid address: ${raw}. Expected at://{actor}/{collection}/{rkey}.` };
	return { actor, collection, rkey };
}

export function isRecordUri(value: unknown): value is string {
	return typeof value === 'string' && /^at:\/\/[^/\s]+\/[a-zA-Z][\w.-]*\.[\w-]+\/[^/\s]+$/.test(value);
}

/** Every record URI referenced anywhere in a value (strong refs, reply parents, list and feed URIs), in order. */
export function collectRecordUris(value: unknown, found: Set<string> = new Set()): Set<string> {
	if (isRecordUri(value)) found.add(value);
	else if (Array.isArray(value)) for (const v of value) collectRecordUris(v, found);
	else if (value && typeof value === 'object') for (const v of Object.values(value)) collectRecordUris(v, found);
	return found;
}

/** CIDs of every blob in a value: the current `{$type: blob, ref: {$link}}` shape and the legacy `{cid, mimeType}` one. */
export function collectBlobCids(value: unknown, found: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) {
		for (const v of value) collectBlobCids(v, found);
	} else if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const link = (obj.ref as { $link?: unknown } | undefined)?.$link;
		if (obj.$type === 'blob' && typeof link === 'string') found.add(link);
		else if (typeof obj.cid === 'string' && typeof obj.mimeType === 'string' && !('$type' in obj)) found.add(obj.cid);
		else for (const v of Object.values(obj)) collectBlobCids(v, found);
	}
	return found;
}

export function blobUrl(pds: string, did: string, cid: string): string {
	// DIDs and CIDs only hold URL-safe characters, so the query string stays readable.
	return `${pds}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}
