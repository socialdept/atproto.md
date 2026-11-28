import { resolveDidDoc, resolveToDid } from './identity';
import { DEFAULT_LABELER, LABELERS } from './labelers';

// Labels from labelers, asked directly. Each labeler publishes its own service address in its DID document and answers
// com.atproto.label.queryLabels for the subjects it has labelled. A lookup asks Bluesky's moderation labeler unless it
// names others: "all" for every known labeler, or any mix of handles and DIDs.

const TIMEOUT = 3000;

export interface Label {
	val: string;
	uri: string;
	cid?: string;
	cts: string;
	exp?: string;
	labeler: { did: string; handle: string | null };
}

export interface LabelerResult {
	did: string;
	handle: string | null;
	ok: boolean;
	error?: string;
}

interface RawLabel {
	src: string;
	uri: string;
	cid?: string;
	val: string;
	neg?: boolean;
	cts: string;
	exp?: string;
}

const known = new Map(LABELERS.map((l) => [l.did, l]));
const byHandle = new Map(LABELERS.map((l) => [l.handle, l.did]));

/** The labelers a `labelers` value names: Bluesky's by default, every known one for "all", or handles and DIDs. */
export async function pickLabelers(value?: string | null): Promise<string[]> {
	const v = value?.trim();
	if (!v) return [DEFAULT_LABELER];
	if (v === 'all') return LABELERS.map((l) => l.did);
	const parts = [...new Set(v.split(',').map((p) => p.trim().replace(/^@/, '')).filter(Boolean))];
	if (parts.length > LABELERS.length + 5) throw { status: 400, message: `Name at most ${LABELERS.length + 5} labelers.` };
	return Promise.all(parts.map(async (p) => (p.startsWith('did:') ? p : (byHandle.get(p) ?? (await resolveToDid(p))))));
}

export async function labelerEndpoint(did: string): Promise<string> {
	const doc = await resolveDidDoc(did);
	const svc = doc.service?.find((s) => s.id === '#atproto_labeler' || s.type === 'AtprotoLabeler');
	if (!svc) throw { status: 404, message: `${did} is not a labeler. Its DID document names no labeler service.` };
	return svc.serviceEndpoint.replace(/\/$/, '');
}

async function ask(did: string, subjects: string[]): Promise<RawLabel[]> {
	const url = new URL(`${await labelerEndpoint(did)}/xrpc/com.atproto.label.queryLabels`);
	for (const s of subjects) url.searchParams.append('uriPatterns', s);
	url.searchParams.append('sources', did);
	url.searchParams.set('limit', '250');
	const res = await fetch(url.toString(), {
		headers: { Accept: 'application/json' },
		signal: AbortSignal.timeout(TIMEOUT),
		cf: { cacheTtl: 60, cacheEverything: true },
	} as RequestInit);
	if (!res.ok) throw new Error(`The labeler answered ${res.status}.`);
	return (((await res.json()) as { labels?: RawLabel[] }).labels ?? []).filter((l) => l.src === did);
}

// The labels in force: the latest of each value per subject, without the ones a later label negated or that expired.
export function current(raw: RawLabel[], now = Date.now()): RawLabel[] {
	const latest = new Map<string, RawLabel>();
	for (const l of raw) {
		const key = `${l.src} ${l.uri} ${l.val}`;
		const had = latest.get(key);
		if (!had || l.cts > had.cts) latest.set(key, l);
	}
	return [...latest.values()].filter((l) => !l.neg && !(l.exp && Date.parse(l.exp) <= now));
}

/** Every label the labelers hold on the subjects, by subject, plus how each labeler answered. */
export async function queryLabels(subjects: string[], labelers: string[]): Promise<{ bySubject: Map<string, Label[]>; labelers: LabelerResult[] }> {
	const answers = await Promise.all(
		labelers.map(async (did) => {
			const handle = known.get(did)?.handle ?? null;
			try {
				return { result: { did, handle, ok: true } as LabelerResult, labels: current(await ask(did, subjects)) };
			} catch (e) {
				const raw = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
				// The runtime reports a host it cannot reach as an internal error.
				const error = e instanceof Error && e.name === 'TimeoutError' ? `No answer within ${TIMEOUT / 1000} seconds.` : raw.startsWith('internal error') ? 'Could not connect to the labeler.' : raw;
				return { result: { did, handle, ok: false, error } as LabelerResult, labels: [] };
			}
		}),
	);
	const bySubject = new Map<string, Label[]>(subjects.map((s) => [s, []]));
	for (const { result, labels } of answers) {
		for (const l of labels) {
			const list = bySubject.get(l.uri);
			if (!list) continue;
			list.push({ val: l.val, uri: l.uri, ...(l.cid ? { cid: l.cid } : {}), cts: l.cts, ...(l.exp ? { exp: l.exp } : {}), labeler: { did: result.did, handle: result.handle } });
		}
	}
	return { bySubject, labelers: answers.map((a) => a.result) };
}
