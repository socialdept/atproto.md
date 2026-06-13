import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBacklinks, getLinkSources } from './constellation';
import { resolveActor, resolvePlcAuditLog, resolvePlcData, resolvePlcLastOp, resolveToDid } from './identity';
import { resolveLexiconDid } from './lexicon';
import { pdsGet } from './pds';
import { listReposByCollection } from './relay';
import { recordSession, recordVisit } from './stats';
import type { AtpRecord } from './types';
import { version } from '../package.json';
import {
	formatAuditLog,
	formatBacklinkRecords,
	formatBacklinkSources,
	formatDiscovery,
	formatPlcData,
	formatPlcLastOp,
	formatLexicon,
	formatRecordList,
	formatRepo,
	formatResolution,
	formatSingleRecord,
} from './views';

type TextResult = { content: { type: 'text'; text: string }[] };

export function createMcpServer(origin: string, env: Env, ctx: ExecutionContext): McpServer {
	const server = new McpServer({
		name: 'atproto-md',
		version,
	});

	// Count a distinct MCP session per `initialize` handshake — the closest privacy-safe proxy
	// for "installs". Records only the client's self-reported app name, nothing identifying.
	server.server.oninitialized = () => {
		recordSession(env, ctx, server.server.getClientVersion()?.name);
	};

	// Anonymous meta derived from a tool's arguments: the targeted collection/lexicon, the
	// identifier type (handle vs raw did), a backlink selector, and pagination flags.
	const argMeta = (args: Record<string, unknown>) => {
		const collection = (args.collection ?? args.nsid) as string | undefined;
		const actor = args.actor as string | undefined;
		const idType = actor?.startsWith('did:plc:') ? 'plc' : actor?.startsWith('did:web:') ? 'web' : actor ? 'handle' : undefined;
		const flags: string[] = [];
		if (args.cursor) flags.push('param:cursor');
		if (args.reverse) flags.push('param:reverse');
		if (args.source) flags.push('param:source');
		return { collection, idType, selector: args.source as string | undefined, flags };
	};

	// Wrap a tool callback so every invocation is counted exactly once (success or error),
	// against the `mcp` channel, carrying the anonymous arg meta.
	const tracked = (tool: string, cb: (args: any) => Promise<TextResult>) => async (args: any): Promise<TextResult> => {
		let isError = false;
		let status: number | undefined;
		let upstream: string | undefined;
		try {
			return await cb(args);
		} catch (e) {
			isError = true;
			const err = e as { status?: number; upstream?: string };
			status = err?.status;
			upstream = err?.upstream;
			throw e;
		} finally {
			recordVisit(env, ctx, { channel: 'mcp', key: `tool:${tool}`, isError, status, upstream, ...argMeta(args) });
		}
	};

	server.tool(
		'resolve_identity',
		'Resolve the full identity chain for an AT Protocol actor: handle → DID → DID document → PDS endpoint',
		{ actor: z.string().describe('A handle (e.g. bsky.app) or DID (e.g. did:plc:z72i7hdynmk6r22z27h6tvur)') },
		tracked('resolve_identity', async ({ actor: input }) => {
			const actor = await resolveActor(input);
			return { content: [{ type: 'text', text: formatResolution(origin, actor) }] };
		}),
	);

	server.tool(
		'get_repo',
		'List all collections in an AT Protocol repo',
		{ actor: z.string().describe('A handle or DID') },
		tracked('get_repo', async ({ actor: input }) => {
			const actor = await resolveActor(input);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.describeRepo', { repo: actor.did });
			return { content: [{ type: 'text', text: formatRepo(origin, actor, (data.collections as string[]) ?? []) }] };
		}),
	);

	server.tool(
		'list_records',
		'List records in any AT Protocol collection on any PDS',
		{
			actor: z.string().describe('A handle or DID'),
			collection: z.string().describe('Collection NSID (e.g. app.bsky.feed.post, com.whtwnd.blog.entry)'),
			limit: z.number().min(1).max(100).default(25).describe('Records per page'),
			cursor: z.string().optional().describe('Pagination cursor from a previous response'),
			reverse: z.boolean().default(false).describe('Set true for oldest-first ordering'),
		},
		tracked('list_records', async ({ actor: input, collection, limit, cursor, reverse }) => {
			const actor = await resolveActor(input);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.listRecords', {
				repo: actor.did,
				collection,
				limit,
				cursor: cursor ?? undefined,
				reverse: reverse || undefined,
			});
			const text = formatRecordList(actor, collection, (data.records as AtpRecord[]) ?? [], data.cursor as string | undefined);
			return { content: [{ type: 'text', text }] };
		}),
	);

	server.tool(
		'get_record',
		'Fetch a single AT Protocol record by its rkey',
		{
			actor: z.string().describe('A handle or DID'),
			collection: z.string().describe('Collection NSID (e.g. app.bsky.feed.post)'),
			rkey: z.string().describe('Record key (e.g. self, 3jui7kd54zh2y)'),
		},
		tracked('get_record', async ({ actor: input, collection, rkey }) => {
			const actor = await resolveActor(input);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
				repo: actor.did,
				collection,
				rkey,
			});
			return { content: [{ type: 'text', text: formatSingleRecord(actor, collection, rkey, data as unknown as AtpRecord) }] };
		}),
	);

	server.tool(
		'discover_repos_by_collection',
		'Discover every repo (DID) on the AT Protocol network that has records in a given collection NSID. Useful for finding all users of a third-party lexicon, e.g. site.standard.document. Network-wide, via the relay.',
		{
			collection: z.string().describe('Collection NSID (e.g. site.standard.document, app.bsky.feed.post)'),
			limit: z.number().min(1).max(2000).default(100).describe('Repos per page'),
			cursor: z.string().optional().describe('Pagination cursor from a previous response'),
		},
		tracked('discover_repos_by_collection', async ({ collection, limit, cursor }) => {
			const result = await listReposByCollection(collection, limit, cursor ?? undefined);
			return { content: [{ type: 'text', text: formatDiscovery(origin, collection, result) }] };
		}),
	);

	server.tool(
		'get_lexicon',
		'Resolve an AT Protocol Lexicon schema by its NSID. Uses DNS-based lexicon resolution (_lexicon TXT record → DID → com.atproto.lexicon.schema record) to fetch the canonical schema definition for any lexicon, e.g. app.bsky.feed.post.',
		{ nsid: z.string().describe('Lexicon NSID (e.g. app.bsky.feed.post, community.lexicon.calendar.event)') },
		tracked('get_lexicon', async ({ nsid }) => {
			const { did, authority } = await resolveLexiconDid(nsid);
			const actor = await resolveActor(did);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
				repo: actor.did,
				collection: 'com.atproto.lexicon.schema',
				rkey: nsid,
			});
			return { content: [{ type: 'text', text: formatLexicon(origin, nsid, authority, actor, data as unknown as AtpRecord) }] };
		}),
	);

	server.tool(
		'plc_audit',
		'Fetch the PLC audit log for a did:plc identity — the full, chronological history of identity operations from plc.directory. Surfaces PDS migrations (when and from/to which host), handle changes, and signing/rotation key rotations. Use to date a migration, debug a moved repo, or verify an identity\'s provenance.',
		{ actor: z.string().describe('A handle (e.g. bsky.app) or did:plc DID') },
		tracked('plc_audit', async ({ actor: input }) => {
			const did = await resolveToDid(input);
			const log = await resolvePlcAuditLog(did);
			const handle = log[log.length - 1]?.operation?.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? did;
			return { content: [{ type: 'text', text: formatAuditLog(origin, did, handle, log) }] };
		}),
	);

	server.tool(
		'plc_data',
		'Fetch the current canonical PLC state for a did:plc identity from plc.directory — its active PDS, all handles (alsoKnownAs), atproto signing key, and rotation keys in priority order. Unlike resolve_identity (DID document), this surfaces the rotation keys that actually control the identity.',
		{ actor: z.string().describe('A handle (e.g. bsky.app) or did:plc DID') },
		tracked('plc_data', async ({ actor: input }) => {
			const did = await resolveToDid(input);
			const data = await resolvePlcData(did);
			const handle = data.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? did;
			return { content: [{ type: 'text', text: formatPlcData(origin, did, handle, data) }] };
		}),
	);

	server.tool(
		'plc_last',
		'Fetch the most recent PLC operation for a did:plc identity and the state it established (PDS, handles, keys, operation type). Lightweight "what changed last" check; use plc_audit for the full dated history.',
		{ actor: z.string().describe('A handle (e.g. bsky.app) or did:plc DID') },
		tracked('plc_last', async ({ actor: input }) => {
			const did = await resolveToDid(input);
			const op = await resolvePlcLastOp(did);
			const handle = op.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? did;
			return { content: [{ type: 'text', text: formatPlcLastOp(origin, did, handle, op) }] };
		}),
	);

	server.tool(
		'get_backlinks',
		'Find records across the network that link to a target (an at:// URI, DID, or web URL) — likes, reposts, replies, follows, or any lexicon. Omit `source` for a summary of all link sources with counts; provide it to list the actual linking records. Indexed by microcosm Constellation.',
		{
			target: z.string().describe('Target to find backlinks to: an at:// URI, DID, or web URL'),
			source: z
				.string()
				.optional()
				.describe('A "collection:path" selector from the summary (e.g. app.bsky.feed.like:subject.uri). Omit for the summary of all sources.'),
			limit: z.number().min(1).max(100).default(50).describe('Linking records per page (only used with source)'),
			cursor: z.string().optional().describe('Pagination cursor from a previous response (only used with source)'),
		},
		tracked('get_backlinks', async ({ target, source, limit, cursor }) => {
			if (!source) {
				const sources = await getLinkSources(target);
				return { content: [{ type: 'text', text: formatBacklinkSources(origin, target, sources) }] };
			}
			const data = await getBacklinks(target, source, limit, cursor ?? undefined);
			return { content: [{ type: 'text', text: formatBacklinkRecords(origin, target, source, data) }] };
		}),
	);

	return server;
}
