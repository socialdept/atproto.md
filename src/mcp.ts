import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveActor } from './identity';
import { pdsGet } from './pds';
import type { AtpRecord } from './types';
import { formatRecordList, formatRepo, formatResolution, formatSingleRecord } from './views';

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

	return server;
}
