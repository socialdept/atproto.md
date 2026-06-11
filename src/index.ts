import { createMcpHandler } from 'agents/mcp';
import { getBacklinks, getLinkSources } from './constellation';
import {
	faviconSvg,
	htmlIndexPage,
	htmlResponse,
	ogImageSvg,
	prefersHtml,
	robotsTxt,
	sitemapXml,
	svgResponse,
} from './html';
import { CORS, errMd, mdResponse } from './http';
import { resolveActor } from './identity';
import { llmsTxt, skillMd } from './llms';
import { createMcpServer } from './mcp';
import { pdsGet } from './pds';
import { listReposByCollection } from './relay';
import type { AtpRecord } from './types';
import {
	formatBacklinkRecords,
	formatBacklinkSources,
	formatDiscovery,
	formatRecordList,
	formatRepo,
	formatResolution,
	formatSingleRecord,
	indexPage,
} from './views';

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
			// Root: HTML (with SEO/OG meta) for browsers and link-card crawlers,
			// markdown for curl and programmatic agents.
			if (!segments.length) {
				return prefersHtml(request) ? htmlResponse(htmlIndexPage(origin)) : mdResponse(indexPage(origin));
			}

			if (segments[0] === 'og.svg') return svgResponse(ogImageSvg());
			if (segments[0] === 'favicon.svg' || segments[0] === 'favicon.ico') return svgResponse(faviconSvg());
			if (segments[0] === 'robots.txt') {
				return new Response(robotsTxt(origin), { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
			}
			if (segments[0] === 'sitemap.xml') {
				return new Response(sitemapXml(origin), { headers: { ...CORS, 'Content-Type': 'application/xml; charset=utf-8' } });
			}

			if (segments[0] === 'llms.txt') return mdResponse(llmsTxt(origin));
			if (segments[0] === 'skill.md') return mdResponse(skillMd(origin));

			if (segments[0] === 'resolve') {
				const input = segments.slice(1).join('/');
				if (!input) return errMd('Usage: `/resolve/{handle-or-did}`');
				const actor = await resolveActor(input);
				return mdResponse(formatResolution(origin, actor));
			}

			// Network-wide discovery: every repo with records in a collection
			if (segments[0] === 'discover') {
				const collection = segments.slice(1).join('/');
				if (!collection) return errMd('Usage: `/discover/{collection}` — e.g. `/discover/app.bsky.feed.post`');
				const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 2000);
				const result = await listReposByCollection(collection, limit, url.searchParams.get('cursor') ?? undefined);
				return mdResponse(formatDiscovery(origin, collection, result));
			}

			// Backlinks: who links to a given at-uri, DID, or web URL (via Constellation)
			if (segments[0] === 'backlinks') {
				const target = url.pathname.slice('/backlinks/'.length);
				if (!target) return errMd('Usage: `/backlinks/{at-uri-or-did-or-url}`');

				const source = url.searchParams.get('source');
				if (source) {
					const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
					const data = await getBacklinks(target, source, limit, url.searchParams.get('cursor') ?? undefined);
					return mdResponse(formatBacklinkRecords(origin, target, source, data));
				}

				const sources = await getLinkSources(target);
				return mdResponse(formatBacklinkSources(origin, target, sources));
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
