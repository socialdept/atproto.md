// Network-wide discovery via a public AT Protocol relay.
// Unlike PDS calls (scoped to one repo), the relay can answer
// "which repos have records in collection X" across the whole network.

const RELAY = 'https://relay1.us-west.bsky.network';

export interface ReposByCollection {
	repos: { did: string }[];
	cursor?: string;
}

// com.atproto.sync.listReposByCollection — enumerates every DID with at least
// one record in the given collection NSID. Cursor-paginated.
export async function listReposByCollection(collection: string, limit: number, cursor?: string): Promise<ReposByCollection> {
	const url = new URL(`${RELAY}/xrpc/com.atproto.sync.listReposByCollection`);
	url.searchParams.set('collection', collection);
	url.searchParams.set('limit', String(limit));
	if (cursor) url.searchParams.set('cursor', cursor);

	const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

	if (!res.ok) {
		const err: Record<string, unknown> = await res.json().catch(() => ({}));
		throw { status: res.status, message: (err.message as string) || res.statusText, upstream: 'relay' };
	}

	const data = (await res.json()) as { repos?: { did: string }[]; cursor?: string };
	return { repos: data.repos ?? [], cursor: data.cursor };
}
