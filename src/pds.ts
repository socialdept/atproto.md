export async function pdsGet(pds: string, lexicon: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
	const url = new URL(`${pds}/xrpc/${lexicon}`);

	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
	}

	const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });

	if (!res.ok) {
		const err: Record<string, unknown> = await res.json().catch(() => ({}));
		throw { status: res.status, message: (err.message as string) || res.statusText, upstream: 'pds' };
	}

	return res.json() as Promise<Record<string, unknown>>;
}
