// Backlink discovery via microcosm's Constellation — a network-wide index of
// every link (at-uri, DID, web URL) seen in the firehose. Answers "who liked,
// reposted, replied to, or otherwise linked to this record/identity/uri".
// https://constellation.microcosm.blue/

const CONSTELLATION = 'https://constellation.microcosm.blue';

// A single source of backlinks: a collection NSID + the JSON path within those
// records that points at the target (e.g. app.bsky.feed.like at .subject.uri).
export interface LinkSource {
	collection: string;
	path: string;
	records: number;
	distinctDids: number;
}

export interface BacklinkRecord {
	did: string;
	collection: string;
	rkey: string;
}

export interface Backlinks {
	total: number;
	records: BacklinkRecord[];
	cursor?: string;
}

// links/all — summary of every source linking to a target, with record counts
// and distinct linking DIDs. Returns a flat, sorted list of sources.
export async function getLinkSources(target: string): Promise<LinkSource[]> {
	const url = new URL(`${CONSTELLATION}/links/all`);
	url.searchParams.set('target', target);

	const data = (await constellationGet(url)) as {
		links?: Record<string, Record<string, { records?: number; distinct_dids?: number }>>;
	};

	const sources: LinkSource[] = [];
	for (const [collection, paths] of Object.entries(data.links ?? {})) {
		for (const [path, counts] of Object.entries(paths)) {
			sources.push({
				collection,
				path,
				records: counts.records ?? 0,
				distinctDids: counts.distinct_dids ?? 0,
			});
		}
	}

	sources.sort((a, b) => b.records - a.records);
	return sources;
}

// blue.microcosm.links.getBacklinks — the actual linking records from one source.
// `source` is the "collection:path" form, e.g. app.bsky.feed.like:subject.uri.
export async function getBacklinks(target: string, source: string, limit: number, cursor?: string): Promise<Backlinks> {
	const url = new URL(`${CONSTELLATION}/xrpc/blue.microcosm.links.getBacklinks`);
	url.searchParams.set('subject', target);
	url.searchParams.set('source', source);
	url.searchParams.set('limit', String(limit));
	if (cursor) url.searchParams.set('cursor', cursor);

	const data = (await constellationGet(url)) as {
		total?: number;
		records?: BacklinkRecord[];
		cursor?: string;
	};

	return { total: data.total ?? 0, records: data.records ?? [], cursor: data.cursor };
}

async function constellationGet(url: URL): Promise<Record<string, unknown>> {
	const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

	if (!res.ok) {
		const err: Record<string, unknown> = await res.json().catch(() => ({}));
		throw { status: res.status, message: (err.message as string) || res.statusText, upstream: 'constellation' };
	}

	return res.json() as Promise<Record<string, unknown>>;
}
