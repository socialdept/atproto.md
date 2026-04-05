import { createMcpHandler } from 'agents/mcp';
import { CORS, errMd, mdResponse } from './http';
import { resolveActor } from './identity';
import { llmsTxt, skillMd } from './llms';
import { createMcpServer } from './mcp';
import { pdsGet } from './pds';
import type { AtpRecord } from './types';
import { formatRecordList, formatRepo, formatResolution, formatSingleRecord, indexPage } from './views';

// Populates the formatter registry via side-effect imports
import './formatters';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

		const url = new URL(request.url);
		const origin = url.origin;

		// MCP endpoint — accepts POST and GET per Streamable HTTP spec
		if (url.pathname === '/mcp') {
			return createMcpHandler(createMcpServer(origin))(request, env, ctx);
		}

		// All other routes are GET-only
		if (request.method !== 'GET') return errMd('Only GET requests are supported.', 405);

		const segments = url.pathname.replace(/^\//, '').split('/').filter(Boolean);

		try {
			if (!segments.length) return mdResponse(indexPage(origin));

			if (segments[0] === 'llms.txt') return mdResponse(llmsTxt(origin));
			if (segments[0] === 'skill.md') return mdResponse(skillMd(origin));

			if (segments[0] === 'resolve') {
				const input = segments.slice(1).join('/');
				if (!input) return errMd('Usage: `/resolve/{handle-or-did}`');
				const actor = await resolveActor(input);
				return mdResponse(formatResolution(origin, actor));
			}

			// All remaining routes are AT URIs: /at://{actor}[/{collection}[/{rkey}]]
			const atUri = url.pathname.slice(1);

			if (!atUri.startsWith('at://')) {
				return errMd(
					'Invalid path. Expected an `at://` URI, e.g.:\n' +
						'`/at://did:plc:eob75vcjtmbaef2tn4evc4sl`\n' +
						'`/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post`\n' +
						'`/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}`',
					400,
				);
			}

			const without = atUri.slice('at://'.length);
			const slashIdx = without.indexOf('/');
			const atActor = slashIdx === -1 ? without : without.slice(0, slashIdx);
			const rest = slashIdx === -1 ? '' : without.slice(slashIdx + 1);
			const restParts = rest ? rest.split('/') : [];
			const collection = restParts[0];
			const rkey = restParts[1];

			if (!atActor) return errMd('Invalid AT URI — missing authority.');

			const actor = await resolveActor(atActor);

			if (!collection) {
				const data = await pdsGet(actor.pds, 'com.atproto.repo.describeRepo', { repo: actor.did });
				return mdResponse(formatRepo(origin, actor, (data.collections as string[]) ?? []));
			}

			if (!rkey) {
				const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '25', 10), 100);
				const data = await pdsGet(actor.pds, 'com.atproto.repo.listRecords', {
					repo: actor.did,
					collection,
					limit,
					cursor: url.searchParams.get('cursor') ?? undefined,
					reverse: url.searchParams.get('reverse') === 'true' ? true : undefined,
				});
				return mdResponse(
					formatRecordList(actor, collection, (data.records as AtpRecord[]) ?? [], data.cursor as string | undefined),
				);
			}

			const data = await pdsGet(actor.pds, 'com.atproto.repo.getRecord', {
				repo: actor.did,
				collection,
				rkey,
			});
			return mdResponse(formatSingleRecord(actor, collection, rkey, data as unknown as AtpRecord));
		} catch (err: unknown) {
			const error = err as { status?: number; message?: string };
			const status = error?.status ?? 502;
			const message = error?.message ?? 'Upstream error. The PDS may be unavailable.';
			return errMd(message, status);
		}
	},
} satisfies ExportedHandler<Env>;
