// The data behind every route and MCP tool. Each function returns a plain object, which the HTTP layer serves as
// application/json and the MCP layer returns as text.

import { getBacklinks, getLinkSources } from './constellation';
import { resolveActor, resolvePlcAuditLog, resolvePlcData, resolvePlcLastOp, resolveToDid, entryway as entrywayOf } from './identity';
import { resolveLexiconDid } from './lexicon';
import { pdsGet } from './pds';
import { blobUrl, collectBlobCids, collectRecordUris, parseTarget } from './refs';
import { toAddress } from './links';
import { listReposByCollection } from './relay';
import { trace } from './trace';
import { pickLabelers, queryLabels, type Label, type LabelerResult } from './labels';
import { DEFAULT_LABELER, LABELERS } from './labelers';
import type { Actor, AtpRecord, PlcLogEntry } from './types';

// The account an address names, from an at:// URI, a handle, a DID or a web link.
const actorOf = async (input: string): Promise<string> => parseTarget(await toAddress(input)).actor;

/** The most records one `get` or hydrated backlinks call fetches, and the most references `expand` follows. */
export const MAX_BATCH = 25;

export interface RecordOut {
	uri: string;
	cid?: string;
	value: Record<string, unknown>;
	blobs?: string[];
	labels?: Label[];
	authorLabels?: Label[];
}

export interface LabelOptions {
	/** Attach each record's labels. */
	labels?: boolean;
	/** Which labelers to ask: Bluesky's moderation labeler by default, "all", or handles and DIDs. */
	labelers?: string;
	/** Also attach the labels on each record's account. Implies labels. */
	author?: boolean;
}

const didOfUri = (uri: string): string => uri.slice('at://'.length).split('/')[0];

// Labels on a set of records, asked once per labeler for the whole set. Returns how each labeler answered, or nothing
// when labels were not asked for.
async function attachLabels(records: RecordOut[], options: LabelOptions): Promise<{ labelers?: LabelerResult[] }> {
	if (!(options.labels || options.author) || !records.length) return {};
	const labelers = await pickLabelers(options.labelers);
	const subjects = new Set(records.map((r) => r.uri));
	if (options.author) for (const r of records) subjects.add(didOfUri(r.uri));
	const found = await queryLabels([...subjects], labelers);
	for (const r of records) {
		r.labels = found.bySubject.get(r.uri) ?? [];
		if (options.author) r.authorLabels = found.bySubject.get(didOfUri(r.uri)) ?? [];
	}
	return { labelers: found.labelers };
}

/** Resolves each actor once per request, so a batch of records from one repo costs one resolution. */
export class Resolver {
	private actors = new Map<string, Promise<Actor>>();

	actor(input: string): Promise<Actor> {
		let actor = this.actors.get(input);
		if (!actor) {
			actor = resolveActor(input);
			this.actors.set(input, actor);
			actor.then((a) => this.actors.set(a.did, actor!)).catch(() => {});
		}
		return actor;
	}
}

function recordOut(actor: Actor, record: AtpRecord): RecordOut {
	const value = (record.value ?? {}) as Record<string, unknown>;
	const out: RecordOut = { uri: record.uri, cid: record.cid, value };
	const cids = [...collectBlobCids(value)];
	if (cids.length) out.blobs = cids.map((cid) => blobUrl(actor.pds, actor.did, cid));
	return out;
}

function requireRecord(input: string) {
	const target = parseTarget(input);
	if (!target.collection || !target.rkey) {
		throw {
			status: 400,
			message: `${input} is not a record address. Use at://{actor}/{collection}/{rkey}, or resolve or list_records for a repo or collection.`,
		};
	}
	return target as Required<typeof target>;
}

async function fetchRecord(resolver: Resolver, input: string): Promise<RecordOut> {
	const { actor: actorInput, collection, rkey } = requireRecord(await toAddress(input));
	const actor = await resolver.actor(actorInput);
	const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', { repo: actor.did, collection, rkey });
	return recordOut(actor, data as unknown as AtpRecord);
}

/** Fetches the records a set of records references, one level deep, skipping ones already present. */
async function expandRefs(resolver: Resolver, records: RecordOut[]): Promise<Record<string, RecordOut | { error: string }>> {
	const have = new Set(records.map((r) => r.uri));
	const uris = new Set<string>();
	for (const r of records) for (const uri of collectRecordUris(r.value)) if (!have.has(uri)) uris.add(uri);

	const picked = [...uris].slice(0, MAX_BATCH);
	const results = await Promise.all(
		picked.map(async (uri) => {
			try {
				return [uri, await fetchRecord(resolver, uri)] as const;
			} catch (e) {
				return [uri, { error: errorMessage(e) }] as const;
			}
		}),
	);
	return Object.fromEntries(results);
}

export function errorMessage(e: unknown): string {
	return (e as { message?: string })?.message ?? 'Upstream error.';
}

// --- Identity and repos ---------------------------------------------------------------------------------------

export async function resolve(input: string, resolver = new Resolver()) {
	const actor = await resolver.actor(await actorOf(input));
	const [repo, entryway, status, pdsSince] = await Promise.all([
		pdsGet(actor.pds, 'com.atproto.repo.describeRepo', { repo: actor.did }).catch(() => null),
		entrywayOf(actor.pds),
		pdsGet(actor.pds, 'com.atproto.sync.getRepoStatus', { did: actor.did }).catch(() => null),
		actor.did.startsWith('did:plc:') ? resolvePlcAuditLog(actor.did).then(pdsSinceOf).catch(() => null) : null,
	]);
	return {
		did: actor.did,
		handle: actor.handle,
		pds: actor.pds,
		entryway,
		active: typeof status?.active === 'boolean' ? status.active : null,
		status: typeof status?.status === 'string' ? status.status : null,
		pdsSince,
		collections: (repo?.collections as string[] | undefined) ?? null,
		didDoc: actor.doc,
	};
}

// When the account moved to the PDS it is on now: the first operation of the latest run that names that PDS, or the
// creation of the DID when it never moved. Nullified operations never took effect, so they are skipped.
export function pdsSinceOf(log: PlcLogEntry[]): string | null {
	const endpoint = (op: PlcLogEntry['operation']): string | undefined => {
		const o = op as { services?: { atproto_pds?: { endpoint?: string } }; service?: string };
		return (o.services?.atproto_pds?.endpoint ?? o.service)?.replace(/\/$/, '');
	};
	const ops = log.filter((e) => !e.nullified);
	let since: string | null = null;
	let current: string | undefined;
	for (const e of ops) {
		const pds = endpoint(e.operation);
		if (pds && pds !== current) {
			current = pds;
			since = e.createdAt;
		}
	}
	return since;
}

/** The labels on a record or an account. With author, a record's account labels come too. */
export async function labels(input: string, options: Omit<LabelOptions, 'labels'> = {}) {
	const { actor, collection, rkey } = parseTarget(await toAddress(input));
	const did = await resolveToDid(actor);
	const target = collection && rkey ? `at://${did}/${collection}/${rkey}` : did;
	const withAuthor = !!options.author && target !== did;
	const found = await queryLabels(withAuthor ? [target, did] : [target], await pickLabelers(options.labelers));
	return {
		target,
		labels: found.bySubject.get(target) ?? [],
		...(withAuthor ? { authorLabels: found.bySubject.get(did) ?? [] } : {}),
		labelers: found.labelers,
	};
}

/** The known labelers that "all" asks, and the default one. */
export function knownLabelers() {
	return { default: DEFAULT_LABELER, labelers: LABELERS };
}

/** The account's DID document, exactly as plc.directory or the did:web domain serves it. */
export async function didDocument(input: string) {
	return (await resolveActor(await actorOf(input))).doc;
}

/** Every step of resolving the account, with what each one returned. */
export async function traceActor(input: string) {
	return trace(await actorOf(input));
}

/** The account's whole repo as a CAR file, streamed from its PDS. */
export async function repoCar(input: string): Promise<{ did: string; body: ReadableStream | null; status: number; type: string }> {
	const actor = await resolveActor(await actorOf(input));
	const res = await fetch(`${actor.pds}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(actor.did)}`);
	if (!res.ok) {
		const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
		throw { status: res.status, message: (err.message as string) || `The PDS answered ${res.status}.`, upstream: 'pds' };
	}
	return { did: actor.did, body: res.body, status: res.status, type: res.headers.get('Content-Type') ?? 'application/vnd.ipld.car' };
}

export type PlcView = 'data' | 'audit' | 'last';

export async function plc(input: string, view: PlcView) {
	const did = await resolveToDid(await actorOf(input));
	if (view === 'audit') return { did, operations: await resolvePlcAuditLog(did) };
	if (view === 'last') return { did, operation: await resolvePlcLastOp(did) };
	return await resolvePlcData(did);
}

// --- Records --------------------------------------------------------------------------------------------------

export interface ListOptions extends LabelOptions {
	limit?: number;
	cursor?: string;
	reverse?: boolean;
	expand?: boolean;
}

export async function listRecords(actorInput: string, collection: string, options: ListOptions = {}) {
	const resolver = new Resolver();
	const actor = await resolver.actor(await actorOf(actorInput));
	const [data, entryway] = await Promise.all([
		pdsGet(actor.pds, 'com.atproto.repo.listRecords', {
			repo: actor.did,
			collection,
			limit: Math.min(Math.max(options.limit ?? 25, 1), 100),
			cursor: options.cursor,
			reverse: options.reverse || undefined,
		}),
		entrywayOf(actor.pds),
	]);
	const records = ((data.records as AtpRecord[]) ?? []).map((r) => recordOut(actor, r));
	const labelled = await attachLabels(records, options);
	return {
		did: actor.did,
		handle: actor.handle,
		pds: actor.pds,
		entryway,
		collection,
		cursor: (data.cursor as string | undefined) ?? null,
		records,
		...labelled,
		...(options.expand ? { expanded: await expandRefs(resolver, records) } : {}),
	};
}

/** One record, as served at /at://{actor}/{collection}/{rkey}. */
export async function getRecord(input: string, options: { expand?: boolean } & LabelOptions = {}) {
	const resolver = new Resolver();
	const record = await fetchRecord(resolver, input);
	const labelled = await attachLabels([record], options);
	return { ...record, ...labelled, ...(options.expand ? { expanded: await expandRefs(resolver, [record]) } : {}) };
}

/** Up to MAX_BATCH records by address, fetched in parallel. A failed address goes to `errors`, never the whole call. */
export async function getRecords(inputs: string[], options: { expand?: boolean } & LabelOptions = {}) {
	if (!inputs.length) throw { status: 400, message: 'Pass at least one record address.' };
	if (inputs.length > MAX_BATCH) throw { status: 400, message: `At most ${MAX_BATCH} records per call. ${inputs.length} were passed.` };

	const resolver = new Resolver();
	const settled = await Promise.all(
		inputs.map(async (input) => {
			try {
				return { record: await fetchRecord(resolver, input) };
			} catch (e) {
				return { error: { address: input, error: errorMessage(e) } };
			}
		}),
	);
	const records = settled.flatMap((s) => (s.record ? [s.record] : []));
	const errors = settled.flatMap((s) => (s.error ? [s.error] : []));
	const labelled = await attachLabels(records, options);
	return {
		records,
		...(errors.length ? { errors } : {}),
		...labelled,
		...(options.expand ? { expanded: await expandRefs(resolver, records) } : {}),
	};
}

// --- Network --------------------------------------------------------------------------------------------------

export async function discover(collection: string, limit = 100, cursor?: string) {
	const result = await listReposByCollection(collection, Math.min(Math.max(limit, 1), 2000), cursor);
	return { collection, cursor: result.cursor ?? null, repos: result.repos.map((r) => r.did) };
}

export async function lexicon(nsid: string) {
	const { did, authority } = await resolveLexiconDid(nsid);
	const actor = await resolveActor(did);
	const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
		repo: actor.did,
		collection: 'com.atproto.lexicon.schema',
		rkey: nsid,
	});
	return { nsid, authority, did, uri: data.uri as string, cid: data.cid as string, schema: data.value };
}

export interface BacklinkOptions {
	source?: string;
	limit?: number;
	cursor?: string;
	hydrate?: boolean;
}

export async function backlinks(target: string, options: BacklinkOptions = {}) {
	if (!options.source) {
		const sources = await getLinkSources(target);
		return {
			target,
			total: sources.reduce((n, s) => n + s.records, 0),
			sources: sources.map((s) => ({ source: `${s.collection}:${s.path.replace(/^\./, '')}`, records: s.records, dids: s.distinctDids })),
		};
	}

	const max = options.hydrate ? MAX_BATCH : 100;
	const limit = Math.min(Math.max(options.limit ?? (options.hydrate ? MAX_BATCH : 50), 1), max);
	const data = await getBacklinks(target, options.source, limit, options.cursor);
	const uris = data.records.map((r) => `at://${r.did}/${r.collection}/${r.rkey}`);
	const base = { target, source: options.source, total: data.total, cursor: data.cursor ?? null };
	if (!options.hydrate) return { ...base, records: uris };

	if (!uris.length) return { ...base, records: [] };
	const { records, errors } = await getRecords(uris);
	return { ...base, records, ...(errors ? { errors } : {}) };
}
