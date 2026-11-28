// Turning a web link into the AT URI it shows. Clients that share a URL layout are matched from a table, and any
// other page is read for the AT URI it publishes: at-tags (<meta name="at:canonical">) or an <link href="at://...">.
//
// The client list follows the reverse parsers in @aturi.to/waypoints (MIT, github.com/atpota-to/aturi). Unlike
// those, a link only matches when its whole path fits a known layout. A path we do not know never falls back to
// the profile: it goes to the page lookup, then to an error, so a request never returns a record it did not ask for.

export interface Target {
	actor: string;
	collection?: string;
	rkey?: string;
}

const isActor = (s: string | undefined): s is string => !!s && (s.startsWith('did:') || (s.includes('.') && !s.startsWith('.')));
const isNsid = (s: string | undefined): s is string => !!s && /^[a-zA-Z][\w-]*(\.[\w-]+){2,}$/.test(s);

// Clients forked from or modelled on the Bluesky app: /profile/{actor}[/{segment}/{rkey}].
const BLUESKY_FAMILY = [
	'bsky.app',
	'staging.bsky.app',
	'main.bsky.dev',
	'blacksky.community',
	'reddwarf.app',
	'impro.social',
	'lea.ac',
	'witchsky.app',
	'deer.social',
	'northsky.app',
	'mu.social',
	'anisota.net',
];
const BLUESKY_SEGMENTS: Record<string, string> = {
	post: 'app.bsky.feed.post',
	feed: 'app.bsky.feed.generator',
	lists: 'app.bsky.graph.list',
	list: 'app.bsky.graph.list',
	'starter-pack': 'app.bsky.graph.starterpack',
	document: 'site.standard.document',
};

// An AT URI after a fixed prefix in the path: /at://{actor}/{collection}/{rkey} on explorers like pdsls.
const AT_IN_PATH: Record<string, string> = {
	'pdsls.dev': '',
	'atp.tools': '',
	'bluepy.social': '',
	'atproto.at': 'uri/',
	'atproto.md': '',
};

function atFromPath(path: string): Target | null {
	const m = path.match(/^at:\/{1,2}([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?\/?$/);
	if (!m || !isActor(m[1])) return null;
	const [, actor, collection, rkey] = m;
	if (collection && !isNsid(collection)) return null;
	return { actor, collection, rkey };
}

/** Matches a link from a known client. Returns null when the host or the path is not one we know. */
export function matchLink(url: URL): Target | null {
	const host = url.hostname.toLowerCase().replace(/^www\./, '');
	const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
	const [a, b, c, d] = parts;

	if (BLUESKY_FAMILY.includes(host) || host.endsWith('.anisota.net')) {
		// bsky.app also links starter packs as /starter-pack/{actor}/{rkey}.
		if (a === 'starter-pack' && isActor(b) && c && parts.length === 3)
			return { actor: b, collection: 'app.bsky.graph.starterpack', rkey: c };
		if (a !== 'profile' || !isActor(b)) return null;
		if (parts.length === 2) return { actor: b };
		const collection = BLUESKY_SEGMENTS[c];
		return collection && d && parts.length === 4 ? { actor: b, collection, rkey: d } : null;
	}

	if (host in AT_IN_PATH) {
		const path = url.pathname.replace(/^\/+/, '');
		const prefix = AT_IN_PATH[host];
		return path.startsWith(prefix) ? atFromPath(decodeURIComponent(path.slice(prefix.length))) : null;
	}

	switch (host) {
		case 'aturi.to':
			if (a === 'explore' && isActor(b)) return atFromPath(`at://${parts.slice(1).join('/')}`);
			if (a === 'profile' && isActor(b)) {
				if (parts.length === 2) return { actor: b };
				const collection = BLUESKY_SEGMENTS[c] ?? (isNsid(c) ? c : undefined);
				return collection && d && parts.length === 4 ? { actor: b, collection, rkey: d } : null;
			}
			return null;
		case 'pinkleap.app': {
			const uri = url.searchParams.get('uri');
			if (a === 'feed' && uri) return atFromPath(uri);
			return a === 'profile' && isActor(b) && parts.length === 2 ? { actor: b } : null;
		}
		case 'margin.at':
			if (a === 'profile' && isActor(b) && parts.length === 2) return { actor: b };
			if (isActor(a) && ['annotation', 'highlight', 'bookmark'].includes(b) && c && parts.length === 3)
				return { actor: a, collection: `at.margin.${b}`, rkey: c };
			return null;
		case 'grain.social':
			if (a !== 'profile' || !isActor(b)) return null;
			if (parts.length === 2) return { actor: b };
			return c === 'gallery' && d && parts.length === 4 ? { actor: b, collection: 'social.grain.gallery', rkey: d } : null;
		case 'unthread.at': {
			// Documents live at /@{actor}/{rkey}, the path the site.standard.document record itself stores.
			const actor = a?.startsWith('@') ? a.slice(1) : undefined;
			return isActor(actor) && b && parts.length === 2 ? { actor, collection: 'site.standard.document', rkey: b } : null;
		}
		case 'standard-reader.app':
			if (a === 'a' && isActor(b) && c && parts.length === 3) return { actor: b, collection: 'site.standard.document', rkey: c };
			return a === 'u' && isActor(b) && parts.length === 2 ? { actor: b } : null;
		// Profile pages only. Any deeper path on these hosts goes to the page lookup.
		case 'semble.so':
		case 'popfeed.social':
			return a === 'profile' && isActor(b) && parts.length === 2 ? { actor: b } : null;
		case 'leaflet.pub':
		case 'sifa.id':
			return a === 'p' && isActor(b) && parts.length === 2 ? { actor: b } : null;
		case 'tangled.org':
		case 'stream.place':
		case 'blento.app':
			return isActor(a) && parts.length === 1 ? { actor: a } : null;
	}
	return null;
}

const META = /<meta\b[^>]*>/gi;
const LINK = /<link\b[^>]*>/gi;
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];

/**
 * The AT URI a page publishes about itself, from its <head>: at-tags first (at:canonical, the record the page is),
 * then any <link href="at://..."> (standard.site documents use one), then at:me (the account the site belongs to).
 * at:author and at:alternate are skipped: they name records the page points at, not the page itself.
 */
export function atUriFromHtml(html: string): string | null {
	const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? html;
	const metas = head.match(META) ?? [];
	const meta = (name: string) =>
		metas.map((t) => (attr(t, 'name')?.toLowerCase() === name ? attr(t, 'content') : undefined)).find((v) => v?.startsWith('at://'));
	const link = (head.match(LINK) ?? []).map((t) => attr(t, 'href')).find((v) => v?.startsWith('at://'));
	return meta('at:canonical') ?? link ?? meta('at:me') ?? null;
}

const MAX_PAGE_BYTES = 256 * 1024;

/** Fetches a page and reads the AT URI it publishes. Reads at most 256 KB, gives up after 4 seconds. */
async function atUriFromPage(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			redirect: 'follow',
			signal: AbortSignal.timeout(4000),
			headers: { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'User-Agent': 'atproto.md (+https://atproto.md)' },
			cf: { cacheTtl: 300, cacheEverything: true },
		} as RequestInit);
		if (!res.ok || !/html/i.test(res.headers.get('content-type') ?? '') || !res.body) return null;
		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let html = '';
		while (html.length < MAX_PAGE_BYTES) {
			const { done, value } = await reader.read();
			if (done) break;
			html += decoder.decode(value, { stream: true });
			if (/<\/head>/i.test(html)) break;
		}
		reader.cancel().catch(() => {});
		return atUriFromHtml(html);
	} catch {
		return null;
	}
}

const isWebLink = (s: string) => /^https?:\/\//i.test(s.trim());

export const UNKNOWN_LINK =
	'atproto.md reads links from Bluesky-style clients (bsky.app, deer.social, blacksky.community and others), record explorers (pdsls.dev, atp.tools, atproto.at, aturi.to), and any page that publishes its AT URI as an at:canonical meta tag or an at:// link.';

/**
 * Normalizes any address to something parseTarget reads: at:// URIs, handles and DIDs pass through, known client
 * links are matched from the table, and any other web page is fetched for the AT URI it publishes.
 */
export async function toAddress(input: string): Promise<string> {
	const raw = input.trim();
	if (!isWebLink(raw)) return raw;
	const url = new URL(raw);
	if (matchLink(url)) return raw;
	const found = await atUriFromPage(url.href);
	if (found) return found;
	throw { status: 400, message: `No AT URI found for ${raw}. ${UNKNOWN_LINK}` };
}
