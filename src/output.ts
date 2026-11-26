import { CORS } from './http';

// Every data route returns one JSON object. Agents get it inside a ```json fence so the body is still
// markdown; `?format=json` or `Accept: application/json` returns the bare JSON instead.

export function wantsJson(request: Request, url: URL): boolean {
	const format = url.searchParams.get('format');
	if (format === 'json') return true;
	if (format === 'md' || format === 'markdown') return false;
	const accept = request.headers.get('Accept') ?? '';
	return /application\/json/i.test(accept) && !/text\/markdown/i.test(accept);
}

export function stringify(body: unknown, pretty = false): string {
	return pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body);
}

export function fenced(json: string): string {
	return '```json\n' + json + '\n```\n';
}

const bytesOf = (body: string): string => String(new TextEncoder().encode(body).length);

export function dataResponse(request: Request, url: URL, body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
	const json = stringify(body, url.searchParams.has('pretty'));
	const asJson = wantsJson(request, url);
	const text = asJson ? json : fenced(json);
	return new Response(text, {
		status,
		headers: {
			...CORS,
			'Content-Type': asJson ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
			'Content-Length': bytesOf(text),
			'Cache-Control': status < 400 ? 'public, max-age=60' : 'no-store',
			...extraHeaders,
		},
	});
}

// `upstream` names the failed dependency (pds, plc, relay, ...) for anonymous stats. It rides along as an
// X-Upstream header that the fetch handler reads back when counting.
export function errorResponse(request: Request, url: URL, error: string, status = 400, upstream?: string): Response {
	return dataResponse(request, url, { error, status }, status, upstream ? { 'X-Upstream': upstream } : {});
}
