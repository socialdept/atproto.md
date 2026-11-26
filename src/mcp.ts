import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { backlinks, discover, getRecords, lexicon, listRecords, MAX_BATCH, plc, resolve } from './api';
import { recordSession, recordVisit } from './stats';
import { version } from '../package.json';

type TextResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

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
		if (args.expand) flags.push('param:expand');
		if (args.hydrate) flags.push('param:hydrate');
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
			const err = e as { status?: number; upstream?: string; message?: string };
			status = err?.status ?? 502;
			upstream = err?.upstream;
			// Errors come back as the same JSON shape the HTTP API uses, flagged so the client sees a failed call.
			const body = { error: err?.message ?? 'Upstream error.', status };
			return { content: [{ type: 'text', text: JSON.stringify(body) }], isError: true };
		} finally {
			recordVisit(env, ctx, { channel: 'mcp', key: `tool:${tool}`, isError, status, upstream, ...argMeta(args) });
		}
	};

	const json = (body: unknown): TextResult => ({ content: [{ type: 'text', text: JSON.stringify(body) }] });

	server.tool(
		'resolve',
		'Resolve an Atmosphere account (handle, DID, at:// URI or bsky.app profile link) to its DID, handle, PDS, DID document and the collections in its repo. Pass plc to get plc.directory data instead: "data" for current state with rotation keys, "audit" for the full dated operation log (migrations, handle changes, key rotations), "last" for the latest operation.',
		{
			actor: z.string().describe('Handle, DID, at:// URI or bsky.app profile link'),
			plc: z.enum(['data', 'audit', 'last']).optional().describe('Return plc.directory data for a did:plc instead of the identity'),
		},
		tracked('resolve', async ({ actor, plc: view }) => json(view ? await plc(actor, view) : await resolve(actor))),
	);

	server.tool(
		'get',
		`Fetch up to ${MAX_BATCH} records by address in one call, as raw JSON exactly as the PDS stores them, with blob URLs. Addresses are at:// record URIs or bsky.app post, feed, list or starter pack links. expand also fetches every record the results reference (reply parent and root, quoted post, like or repost subject), one level deep.`,
		{
			uris: z.array(z.string()).min(1).max(MAX_BATCH).describe('Record addresses: at://{actor}/{collection}/{rkey} or a bsky.app link'),
			expand: z.boolean().default(false).describe('Also fetch the records these reference, under expanded'),
		},
		tracked('get', async ({ uris, expand }) => json(await getRecords(uris, { expand }))),
	);

	server.tool(
		'list_records',
		'List records in any collection of any repo, as raw JSON with blob URLs. Newest first unless reverse is set.',
		{
			actor: z.string().describe('Handle or DID'),
			collection: z.string().describe('Collection NSID, for example app.bsky.feed.post'),
			limit: z.number().min(1).max(100).default(25),
			cursor: z.string().optional().describe('cursor from the previous page'),
			reverse: z.boolean().default(false).describe('Oldest first'),
			expand: z.boolean().default(false).describe(`Also fetch up to ${MAX_BATCH} records these reference, under expanded`),
		},
		tracked('list_records', async ({ actor, collection, limit, cursor, reverse, expand }) =>
			json(await listRecords(actor, collection, { limit, cursor, reverse, expand })),
		),
	);

	server.tool(
		'backlinks',
		'Find records anywhere on the network that link to a target (an at:// URI, DID or web URL): likes, reposts, replies, quotes, follows or any lexicon. Without source, returns each source as "collection:path" with record and account counts. With source, returns the linking record URIs, or the records themselves when hydrate is set. Indexed by microcosm Constellation.',
		{
			target: z.string().describe('at:// URI, DID or web URL'),
			source: z.string().optional().describe('A "collection:path" source from the summary, for example app.bsky.feed.like:subject.uri'),
			limit: z.number().min(1).max(100).optional().describe(`Records per page (50 by default, at most ${MAX_BATCH} when hydrating)`),
			cursor: z.string().optional(),
			hydrate: z.boolean().default(false).describe('Return the linking records instead of their URIs'),
		},
		tracked('backlinks', async ({ target, source, limit, cursor, hydrate }) => json(await backlinks(target, { source, limit, cursor, hydrate }))),
	);

	server.tool(
		'discover',
		'List every repo (DID) on the network that has records in a collection, via the relay. Finds the users of any lexicon, for example site.standard.document.',
		{
			collection: z.string().describe('Collection NSID'),
			limit: z.number().min(1).max(2000).default(100),
			cursor: z.string().optional(),
		},
		tracked('discover', async ({ collection, limit, cursor }) => json(await discover(collection, limit, cursor))),
	);

	server.tool(
		'lexicon',
		'Fetch the published Lexicon schema for an NSID, resolved through its _lexicon DNS record to the com.atproto.lexicon.schema record.',
		{ nsid: z.string().describe('Lexicon NSID, for example app.bsky.feed.post') },
		tracked('lexicon', async ({ nsid }) => json(await lexicon(nsid))),
	);

	return server;
}
