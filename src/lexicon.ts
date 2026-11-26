// AT Protocol Lexicon resolution.
// An NSID resolves to a published schema record via DNS: the authority domain
// (the NSID minus its name segment, reversed) has a `_lexicon.<authority>` TXT
// record pointing at a DID, whose repo holds the schema at
// `com.atproto.lexicon.schema/<nsid>`.
// https://atproto.com/specs/lexicon

const DOH = 'https://cloudflare-dns.com/dns-query';

// app.bsky.feed.post → feed.bsky.app  (drop the name, reverse the domain labels)
export function nsidAuthority(nsid: string): string {
	const segs = nsid.split('.');
	if (segs.length < 3 || segs.some((s) => s === '')) {
		throw { status: 400, message: `Invalid NSID: ${nsid}. Expected a dotted name like app.bsky.feed.post.` };
	}
	return segs.slice(0, -1).reverse().join('.');
}

export async function resolveLexiconDid(nsid: string): Promise<{ did: string; authority: string }> {
	const authority = nsidAuthority(nsid);
	const name = `_lexicon.${authority}`;

	const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=TXT`, {
		headers: { accept: 'application/dns-json' },
	});
	if (!res.ok) throw { status: 502, message: `DNS lookup failed for ${name}.`, upstream: 'lexicon' };

	const data = (await res.json()) as { Answer?: { data?: string }[] };
	for (const answer of data.Answer ?? []) {
		const txt = String(answer.data ?? '').replace(/^"|"$/g, '');
		const match = txt.match(/^did=(.+)$/);
		if (match) return { did: match[1].trim(), authority };
	}

	throw {
		status: 404,
		message: `No lexicon found for ${nsid}. There is no did= TXT record at ${name}.`,
		upstream: 'lexicon',
	};
}
