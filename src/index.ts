import { createMcpHandler } from 'agents/mcp';
import { backlinks, discover, getRecord, getRecords, lexicon, listRecords, MAX_BATCH, plc, resolve } from './api';
import {
	faviconSvg,
	htmlIndexPage,
	htmlResponse,
	htmlStatsPage,
	ogImageSvg,
	prefersHtml,
	robotsTxt,
	sitemapXml,
	svgResponse,
} from './html';
import { CORS, errMd, mdResponse } from './http';
import { dataResponse, errorResponse } from './output';
import { parseTarget } from './refs';
import { toAddress } from './links';
import { llmsTxt, skillMd } from './llms';
import { createMcpServer } from './mcp';
import { classifyHttp, getStats, recordVisit, resetStats } from './stats';
import { formatStats, indexPage } from './views';

export { StatsDO } from './stats';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

		const url = new URL(request.url);
		// Behind a local TLS proxy (Herd in development) the worker sees http, so links follow the proxy's scheme.
		if (url.protocol === 'http:' && request.headers.get('X-Forwarded-Proto') === 'https') url.protocol = 'https:';
		const origin = url.origin;

		// MCP endpoint — accepts POST and GET per Streamable HTTP spec. Tool calls are
		// counted inside the tool handlers (the `mcp` channel), so protocol-level POSTs
		// like initialize/tools.list aren't double-counted here.
		if (url.pathname === '/mcp') {
			return createMcpHandler(createMcpServer(origin, env, ctx))(request, env, ctx);
		}

		// Operator-only stats wipe: POST /stats/reset with `Authorization: Bearer <token>`, where
		// the token is the STATS_RESET_TOKEN secret (set via `wrangler secret put`, never in source).
		// Any failure (wrong method, no/unset token, mismatch) returns 404 so the endpoint isn't
		// advertised. This keeps wipes operator-controlled — not triggerable from the public repo.
		if (url.pathname === '/stats/reset') {
			const token = env.STATS_RESET_TOKEN;
			const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
			if (request.method !== 'POST' || !token || provided !== token) return errMd('Not found.', 404);
			await resetStats(env);
			return mdResponse('# Stats reset\n\nAll counters cleared.\n');
		}

		// All other routes are GET-only
		if (request.method !== 'GET') return errorResponse(url, 'Only GET requests are supported.', 405);

		const start = Date.now();
		const response = await handleGet(request, url, origin, env);
		const latencyMs = Date.now() - start;

		// Anonymous usage counter, fire-and-forget. Counts only the API: JSON responses, plus llms.txt and skill.md.
		// The home page and /stats are never counted, for browsers or agents, since they would drown the API signal.
		const stat = classifyHttp(url);
		const type = response.headers.get('Content-Type') ?? '';
		if (stat && (type.startsWith('text/markdown') || type.startsWith('application/json'))) {
			const isError = response.status >= 400;
			const country = typeof request.cf?.country === 'string' ? request.cf.country : undefined;
			const contentLength = response.headers.get('Content-Length');
			recordVisit(env, ctx, {
				channel: 'http',
				key: stat.key,
				collection: stat.collection,
				idType: stat.idType,
				selector: stat.selector,
				flags: stat.flags,
				isError,
				status: response.status,
				upstream: isError ? response.headers.get('X-Upstream') ?? undefined : undefined,
				country,
				bytes: contentLength ? Number(contentLength) : undefined,
				latencyMs,
			});
		}
		return response;
	},
} satisfies ExportedHandler<Env>;

const flag = (url: URL, name: string): boolean => {
	const v = url.searchParams.get(name);
	return v !== null && v !== 'false' && v !== '0';
};

const int = (url: URL, name: string): number | undefined => {
	const v = url.searchParams.get(name);
	const n = v === null ? NaN : parseInt(v, 10);
	return Number.isFinite(n) ? n : undefined;
};

async function handleGet(request: Request, url: URL, origin: string, env: Env): Promise<Response> {
	const segments = url.pathname.replace(/^\//, '').split('/').filter(Boolean);
	const data = (body: unknown) => dataResponse(url, body);
	const usage = (message: string) => errorResponse(url, message, 400);

	try {
		// Root: HTML (with SEO/OG meta) for browsers and link-card crawlers, markdown docs for agents.
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

		// Usage stats: HTML dashboard for browsers, markdown for agents.
		if (segments[0] === 'stats') {
			const snapshot = await getStats(env);
			return prefersHtml(request) ? htmlResponse(htmlStatsPage(origin, snapshot)) : mdResponse(formatStats(origin, snapshot));
		}

		if (segments[0] === 'resolve') {
			// Read the raw path so a pasted link keeps its //.
			const input = decodeURIComponent(url.pathname.slice('/resolve/'.length));
			if (!input) return usage('Usage: /resolve/{handle-or-did}');
			return data(await resolve(input));
		}

		// PLC operations: identity history and current state via plc.directory
		if (segments[0] === 'plc') {
			const view = segments[1];
			const input = segments.slice(2).join('/');
			if (view !== 'audit' && view !== 'data' && view !== 'last') return usage('Usage: /plc/{audit|data|last}/{handle-or-did}');
			if (!input) return usage(`Usage: /plc/${view}/{handle-or-did}, for example /plc/${view}/bsky.app`);
			return data(await plc(input, view));
		}

		if (segments[0] === 'discover') {
			const collection = segments.slice(1).join('/');
			if (!collection) return usage('Usage: /discover/{collection}, for example /discover/app.bsky.feed.post');
			return data(await discover(collection, int(url, 'limit'), url.searchParams.get('cursor') ?? undefined));
		}

		if (segments[0] === 'lexicon') {
			const nsid = segments.slice(1).join('/');
			if (!nsid) return usage('Usage: /lexicon/{nsid}, for example /lexicon/app.bsky.feed.post');
			return data(await lexicon(nsid));
		}

		if (segments[0] === 'backlinks') {
			const target = url.pathname.slice('/backlinks/'.length);
			if (!target) return usage('Usage: /backlinks/{at-uri-or-did-or-url}');
			return data(
				await backlinks(target, {
					source: url.searchParams.get('source') ?? undefined,
					limit: int(url, 'limit'),
					cursor: url.searchParams.get('cursor') ?? undefined,
					hydrate: flag(url, 'hydrate'),
				}),
			);
		}

		// Batch: /get?uri={at-uri-or-bsky-link}&uri=...
		if (segments[0] === 'get') {
			const uris = url.searchParams.getAll('uri').flatMap((u) => u.split(/\s+/)).filter(Boolean);
			if (!uris.length) return usage(`Usage: /get?uri={at-uri}&uri={at-uri}, up to ${MAX_BATCH} records`);
			return data(await getRecords(uris, { expand: flag(url, 'expand') }));
		}

		// All remaining routes are AT URIs, /at://{actor}[/{collection}[/{rkey}]], or a web link in their place,
		// /https://bsky.app/profile/{actor}/post/{rkey}, which is first turned into the AT URI it shows.
		let atUri = url.pathname.slice(1);
		const link = decodeURIComponent(atUri).replace(/^(https?:)\/(?!\/)/i, '$1//');
		if (/^https?:\/\//i.test(link)) atUri = await toAddress(link);
		if (!atUri.startsWith('at://') && !/^https?:\/\//i.test(atUri)) {
			return usage('Invalid path. Expected an at:// URI, for example /at://bsky.app, /at://bsky.app/app.bsky.feed.post or /at://bsky.app/app.bsky.feed.post/{rkey}');
		}

		const { actor, collection, rkey } = parseTarget(atUri);
		if (!collection) return data(await resolve(actor));
		if (!rkey) {
			return data(
				await listRecords(actor, collection, {
					limit: int(url, 'limit'),
					cursor: url.searchParams.get('cursor') ?? undefined,
					reverse: flag(url, 'reverse'),
					expand: flag(url, 'expand'),
				}),
			);
		}
		return data(await getRecord(atUri, { expand: flag(url, 'expand') }));
	} catch (err: unknown) {
		const error = err as { status?: number; message?: string; upstream?: string };
		const status = error?.status ?? 502;
		const message = error?.message ?? 'Upstream error. The PDS may be unavailable.';
		return errorResponse(url, message, status, error?.upstream);
	}
}
