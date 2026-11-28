import { entryway as entrywayOf, pdsFromDidDoc } from './identity';
import type { DidDocument } from './types';

// Every step of resolving an account, run here rather than through bsky.social, each with what it asked, what came
// back, how long it took and whether it worked. For working out why an account does not resolve.

const DOH = 'https://cloudflare-dns.com/dns-query';
const PLC_DIRECTORY = 'https://plc.directory';
const TIMEOUT = 4000;
// Long enough for any DID or DID document error page to be read, short enough to keep the trace small.
const BODY_LIMIT = 2000;

export interface TraceStep {
	step: string;
	request: string;
	ok: boolean;
	ms: number;
	status?: number;
	result?: unknown;
	error?: string;
}

async function timed(step: string, request: string, run: () => Promise<Omit<TraceStep, 'step' | 'request' | 'ms'>>): Promise<TraceStep> {
	const start = Date.now();
	try {
		const out = await run();
		return { step, request, ms: Date.now() - start, ...out };
	} catch (e) {
		const message =
			e instanceof Error ? (e.name === 'TimeoutError' ? `No answer within ${TIMEOUT / 1000} seconds.` : e.message) : String(e);
		return { step, request, ok: false, ms: Date.now() - start, error: message };
	}
}

const signal = () => AbortSignal.timeout(TIMEOUT);
const text = async (res: Response) => (await res.text()).slice(0, BODY_LIMIT);

/** _atproto.{handle} TXT, through DNS over HTTPS. */
function dnsStep(handle: string): Promise<TraceStep> {
	const name = `_atproto.${handle}`;
	return timed('handle-dns', `TXT ${name}`, async () => {
		const res = await fetch(`${DOH}?name=${encodeURIComponent(name)}&type=TXT`, {
			headers: { accept: 'application/dns-json' },
			signal: signal(),
		});
		const data = (await res.json()) as { Status?: number; Answer?: { data?: string }[] };
		const records = (data.Answer ?? []).map((a) => String(a.data ?? '').replace(/^"|"$/g, ''));
		const dids = records.flatMap((r) => r.match(/^did=(.+)$/)?.[1]?.trim() ?? []);
		if (dids.length === 1) return { ok: true, status: res.status, result: { did: dids[0], records } };
		const error =
			dids.length > 1 ? `${name} has ${dids.length} did= records. It must have exactly one.` : `${name} has no did= TXT record.`;
		return { ok: false, status: res.status, result: { records }, error };
	});
}

/** https://{handle}/.well-known/atproto-did. */
function httpStep(handle: string): Promise<TraceStep> {
	const url = `https://${handle}/.well-known/atproto-did`;
	return timed('handle-http', `GET ${url}`, async () => {
		let res: Response;
		try {
			res = await fetch(url, { redirect: 'manual', signal: signal() });
		} catch (e) {
			if ((e as Error).name === 'TimeoutError') throw e;
			// The runtime reports a host with no address, or a refused connection, as an internal error.
			return { ok: false, error: `Could not connect to ${handle}. The domain may have no web server.` };
		}
		const body = (await text(res)).trim();
		if (!res.ok) return { ok: false, status: res.status, result: { body }, error: `${url} answered ${res.status}.` };
		if (!/^did:[a-z]+:[A-Za-z0-9._:%-]+$/.test(body))
			return { ok: false, status: res.status, result: { body }, error: 'The body is not a DID.' };
		return { ok: true, status: res.status, result: { did: body } };
	});
}

function didDocStep(did: string): Promise<{ step: TraceStep; doc?: DidDocument }> {
	let url: string;
	if (did.startsWith('did:plc:')) url = `${PLC_DIRECTORY}/${did}`;
	else if (did.startsWith('did:web:')) url = `https://${decodeURIComponent(did.slice('did:web:'.length))}/.well-known/did.json`;
	else {
		return Promise.resolve({
			step: { step: 'did-document', request: did, ok: false, ms: 0, error: `Unsupported DID method. Supported: plc, web.` },
		});
	}
	let doc: DidDocument | undefined;
	return timed('did-document', `GET ${url}`, async () => {
		const res = await fetch(url, { signal: signal() });
		const body = await res.text();
		if (!res.ok)
			return { ok: false, status: res.status, result: { body: body.slice(0, BODY_LIMIT) }, error: `${url} answered ${res.status}.` };
		try {
			doc = JSON.parse(body) as DidDocument;
		} catch {
			return { ok: false, status: res.status, result: { body: body.slice(0, BODY_LIMIT) }, error: 'The DID document is not JSON.' };
		}
		if (doc.id !== did) return { ok: false, status: res.status, result: doc, error: `The document is for ${doc.id}, not ${did}.` };
		return { ok: true, status: res.status, result: doc };
	}).then((step) => ({ step, doc }));
}

function pdsStep(pds: string, did: string): Promise<TraceStep> {
	const url = `${pds}/xrpc/com.atproto.sync.getRepoStatus?did=${encodeURIComponent(did)}`;
	return timed('pds', `GET ${url}`, async () => {
		const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: signal() });
		const body = await text(res);
		let result: unknown = body;
		try {
			result = JSON.parse(body);
		} catch {}
		if (!res.ok) return { ok: false, status: res.status, result, error: `The PDS answered ${res.status}.` };
		const active = (result as { active?: boolean }).active;
		return {
			ok: active !== false,
			status: res.status,
			result,
			error: active === false ? 'The PDS has the repo, but it is not active.' : undefined,
		};
	});
}

const handleOf = (doc?: DidDocument): string | undefined => doc?.alsoKnownAs?.find((a) => a.startsWith('at://'))?.slice('at://'.length);

export async function trace(input: string) {
	const steps: TraceStep[] = [];
	const isDid = input.startsWith('did:');
	let handle = isDid ? undefined : input.replace(/^@/, '').toLowerCase();
	let did = isDid ? input : undefined;

	// A handle: both lookups run, since a handle may publish either. They should agree.
	if (handle) {
		const [dns, http] = await Promise.all([dnsStep(handle), httpStep(handle)]);
		steps.push(dns, http);
		const found = [dns, http].flatMap((s) => (s.ok ? [(s.result as { did: string }).did] : []));
		if (new Set(found).size > 1) {
			steps.push({
				step: 'handle-agree',
				request: handle,
				ok: false,
				ms: 0,
				error: `DNS and HTTPS name different DIDs: ${found.join(' and ')}.`,
			});
		}
		did = found[0];
	}

	if (!did) return { input, did: null, handle: handle ?? null, handleVerified: false, pds: null, entryway: null, ok: false, steps };

	const { step, doc } = await didDocStep(did);
	steps.push(step);
	const named = handleOf(doc);

	// A DID: the handle in its document is checked the other way, by resolving it back.
	if (isDid && named) {
		handle = named;
		const [dns, http] = await Promise.all([dnsStep(named), httpStep(named)]);
		steps.push(dns, http);
	}
	const back = steps
		.filter((s) => (s.step === 'handle-dns' || s.step === 'handle-http') && s.ok)
		.map((s) => (s.result as { did: string }).did);
	const handleVerified = !!handle && named === handle && back.includes(did);
	if (doc && handle && named !== handle) {
		steps.push({
			step: 'handle-document',
			request: handle,
			ok: false,
			ms: 0,
			error: named ? `The DID document names ${named}, not ${handle}.` : 'The DID document names no handle.',
		});
	}

	let pds: string | null = null;
	let entryway: string | null = null;
	if (doc) {
		try {
			pds = pdsFromDidDoc(doc);
			const [step, server] = await Promise.all([pdsStep(pds, did), entrywayOf(pds)]);
			steps.push(step);
			entryway = server;
		} catch (e) {
			steps.push({
				step: 'pds',
				request: did,
				ok: false,
				ms: 0,
				error: (e as { message?: string }).message ?? 'No PDS in the DID document.',
			});
		}
	}

	return {
		input,
		did,
		handle: handle ?? null,
		handleVerified,
		pds,
		entryway,
		ok: handleVerified && steps.every((s) => s.ok || s.step.startsWith('handle-')),
		steps,
	};
}
