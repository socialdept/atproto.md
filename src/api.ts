// The data behind every route and MCP tool. Each function returns a plain object, which the HTTP layer serves as
// application/json and the MCP layer returns as text.

import { getBacklinks, getLinkSources } from './constellation';
import { resolveActor, resolvePlcAuditLog, resolvePlcData, resolvePlcLastOp, resolveToDid } from './identity';
import { resolveLexiconDid } from './lexicon';
import { pdsGet } from './pds';
import { blobUrl, collectBlobCids, collectRecordUris, parseTarget } from './refs';
import { listReposByCollection } from './relay';
import type { Actor, AtpRecord } from './types';

/** The most records one `get` or hydrated backlinks call fetches, and the most references `expand` follows. */
export const MAX_BATCH = 25;

export interface RecordOut {
	uri: string;
	cid?: string;
	value: Record<string, unknown>;
	blobs?: string[];
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
		throw { status: 400, message: `${input} is not a record address. Use at://{actor}/{collection}/{rkey}, or resolve or list_records for a repo or collection.` };
	}
	return target as Required<typeof target>;
}

async function fetchRecord(resolver: Resolver, input: string): Promise<RecordOut> {
	const { actor: actorInput, collection, rkey } = requireRecord(input);
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
	const actor = await resolver.actor(parseTarget(input).actor);
	const repo = await pdsGet(actor.pds, 'com.atproto.repo.describeRepo', { repo: actor.did }).catch(() => null);
	return {
		did: actor.did,
		handle: actor.handle,
		pds: actor.pds,
		collections: (repo?.collections as string[] | undefined) ?? null,
		didDoc: actor.doc,
	};
}

export type PlcView = 'data' | 'audit' | 'last';

export async function plc(input: string, view: PlcView) {
	const did = await resolveToDid(parseTarget(input).actor);
	if (view === 'audit') return { did, operations: await resolvePlcAuditLog(did) };
	if (view === 'last') return { did, operation: await resolvePlcLastOp(did) };
	return await resolvePlcData(did);
}

// --- Records --------------------------------------------------------------------------------------------------

export interface ListOptions {
	limit?: number;
	cursor?: string;
	reverse?: boolean;
	expand?: boolean;
}

export async function listRecords(actorInput: string, collection: string, options: ListOptions = {}) {
	const resolver = new Resolver();
	const actor = await resolver.actor(parseTarget(actorInput).actor);
	const data = await pdsGet(actor.pds, 'com.atproto.repo.listRecords', {
		repo: actor.did,
		collection,
		limit: Math.min(Math.max(options.limit ?? 25, 1), 100),
		cursor: options.cursor,
		reverse: options.reverse || undefined,
	});
	const records = ((data.records as AtpRecord[]) ?? []).map((r) => recordOut(actor, r));
	return {
		did: actor.did,
		handle: actor.handle,
		pds: actor.pds,
		collection,
		cursor: (data.cursor as string | undefined) ?? null,
		records,
		...(options.expand ? { expanded: await expandRefs(resolver, records) } : {}),
	};
}

/** One record, as served at /at://{actor}/{collection}/{rkey}. */
export async function getRecord(input: string, options: { expand?: boolean } = {}) {
	const resolver = new Resolver();
	const record = await fetchRecord(resolver, input);
	return options.expand ? { ...record, expanded: await expandRefs(resolver, [record]) } : record;
}

/** Up to MAX_BATCH records by address, fetched in parallel. A failed address goes to `errors`, never the whole call. */
export async function getRecords(inputs: string[], options: { expand?: boolean } = {}) {
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
	return {
		records,
		...(errors.length ? { errors } : {}),
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
