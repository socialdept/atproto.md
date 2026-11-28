// Parsing record addresses and finding the references and blobs inside a record value.

import { matchLink, UNKNOWN_LINK, type Target } from './links';

export type { Target };

/**
 * Accepts an at:// URI, a bare handle or DID, or a link from a known client, and returns the actor, collection and
 * rkey it names. Throws a 400 for anything else. Links from other pages are resolved first by toAddress in links.ts.
 */
export function parseTarget(input: string): Target {
	const raw = input.trim();

	if (/^https?:\/\//i.test(raw)) {
		const target = matchLink(new URL(raw));
		if (target) return target;
		throw { status: 400, message: `Unsupported link: ${raw}. ${UNKNOWN_LINK}` };
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
