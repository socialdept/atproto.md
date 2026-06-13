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
		throw { status: 400, message: `Invalid NSID: \`${nsid}\`. Expected a dotted name like \`app.bsky.feed.post\`.` };
	}
	return segs.slice(0, -1).reverse().join('.');
}

export async function resolveLexiconDid(nsid: string): Promise<{ did: string; authority: string }> {
	const authority = nsidAuthority(nsid);
	const name = `_lexicon.${authority}`;

	const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=TXT`, {
		headers: { accept: 'application/dns-json' },
	});
	if (!res.ok) throw { status: 502, message: `DNS lookup failed for \`${name}\`.`, upstream: 'lexicon' };

	const data = (await res.json()) as { Answer?: { data?: string }[] };
	for (const answer of data.Answer ?? []) {
		const txt = String(answer.data ?? '').replace(/^"|"$/g, '');
		const match = txt.match(/^did=(.+)$/);
		if (match) return { did: match[1].trim(), authority };
	}

	throw {
		status: 404,
		message: `No lexicon found for \`${nsid}\` — no \`did=\` TXT record at \`${name}\`.`,
		upstream: 'lexicon',
	};
}

// Render a com.atproto.lexicon.schema record value as markdown: a quick index of
// its defs (key → type → description) followed by the full schema JSON.
export function renderLexiconBody(value: Record<string, unknown>): string {
	const defs = (value.defs ?? {}) as Record<string, { type?: string; description?: string }>;
	const keys = Object.keys(defs);
	const lines: string[] = [];

	if (keys.length) {
		lines.push('**Definitions:**', '');
		for (const key of keys) {
			const def = defs[key] ?? {};
			const desc = def.description ? ` — ${def.description}` : '';
			lines.push(`- \`${key}\` (\`${def.type ?? 'unknown'}\`)${desc}`);
		}
		lines.push('');
	}

	lines.push('```json', JSON.stringify(value, null, 2), '```');
	return lines.join('\n');
}
