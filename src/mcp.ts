import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getBacklinks, getLinkSources } from './constellation';
import { resolveActor } from './identity';
import { resolveLexiconDid } from './lexicon';
import { pdsGet } from './pds';
import { listReposByCollection } from './relay';
import type { AtpRecord } from './types';
import {
	formatBacklinkRecords,
	formatBacklinkSources,
	formatDiscovery,
	formatLexicon,
	formatRecordList,
	formatRepo,
	formatResolution,
	formatSingleRecord,
} from './views';

export function createMcpServer(origin: string): McpServer {
	const server = new McpServer({
		name: 'atproto-md',
		version: '1.0.0',
	});

	server.tool(
		'resolve_identity',
		'Resolve the full identity chain for an AT Protocol actor: handle → DID → DID document → PDS endpoint',
		{ actor: z.string().describe('A handle (e.g. bsky.app) or DID (e.g. did:plc:z72i7hdynmk6r22z27h6tvur)') },
		async ({ actor: input }) => {
			const actor = await resolveActor(input);
			return { content: [{ type: 'text', text: formatResolution(origin, actor) }] };
		},
	);

	server.tool(
		'get_repo',
		'List all collections in an AT Protocol repo',
		{ actor: z.string().describe('A handle or DID') },
		async ({ actor: input }) => {
			const actor = await resolveActor(input);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.describeRepo', { repo: actor.did });
			return { content: [{ type: 'text', text: formatRepo(origin, actor, (data.collections as string[]) ?? []) }] };
		},
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
		async ({ actor: input, collection, limit, cursor, reverse }) => {
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
		},
	);

	server.tool(
		'get_record',
		'Fetch a single AT Protocol record by its rkey',
		{
			actor: z.string().describe('A handle or DID'),
			collection: z.string().describe('Collection NSID (e.g. app.bsky.feed.post)'),
			rkey: z.string().describe('Record key (e.g. self, 3jui7kd54zh2y)'),
		},
		async ({ actor: input, collection, rkey }) => {
			const actor = await resolveActor(input);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
				repo: actor.did,
				collection,
				rkey,
			});
			return { content: [{ type: 'text', text: formatSingleRecord(actor, collection, rkey, data as unknown as AtpRecord) }] };
		},
	);

	server.tool(
		'discover_repos_by_collection',
		'Discover every repo (DID) on the AT Protocol network that has records in a given collection NSID. Useful for finding all users of a third-party lexicon, e.g. site.standard.document. Network-wide, via the relay.',
		{
			collection: z.string().describe('Collection NSID (e.g. site.standard.document, app.bsky.feed.post)'),
			limit: z.number().min(1).max(2000).default(100).describe('Repos per page'),
			cursor: z.string().optional().describe('Pagination cursor from a previous response'),
		},
		async ({ collection, limit, cursor }) => {
			const result = await listReposByCollection(collection, limit, cursor ?? undefined);
			return { content: [{ type: 'text', text: formatDiscovery(origin, collection, result) }] };
		},
	);

	server.tool(
		'get_lexicon',
		'Resolve an AT Protocol Lexicon schema by its NSID. Uses DNS-based lexicon resolution (_lexicon TXT record → DID → com.atproto.lexicon.schema record) to fetch the canonical schema definition for any lexicon, e.g. app.bsky.feed.post.',
		{ nsid: z.string().describe('Lexicon NSID (e.g. app.bsky.feed.post, community.lexicon.calendar.event)') },
		async ({ nsid }) => {
			const { did, authority } = await resolveLexiconDid(nsid);
			const actor = await resolveActor(did);
			const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
				repo: actor.did,
				collection: 'com.atproto.lexicon.schema',
				rkey: nsid,
			});
			return { content: [{ type: 'text', text: formatLexicon(origin, nsid, authority, actor, data as unknown as AtpRecord) }] };
		},
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
		async ({ target, source, limit, cursor }) => {
			if (!source) {
				const sources = await getLinkSources(target);
				return { content: [{ type: 'text', text: formatBacklinkSources(origin, target, sources) }] };
			}
			const data = await getBacklinks(target, source, limit, cursor ?? undefined);
			return { content: [{ type: 'text', text: formatBacklinkRecords(origin, target, source, data) }] };
		},
	);

	return server;
}
