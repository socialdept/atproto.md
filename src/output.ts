import { CORS } from './http';

// Every data route returns one JSON object as application/json, errors included. `?pretty` indents it.
// `?format=json` from older links is accepted and changes nothing.

export function stringify(body: unknown, pretty = false): string {
	return pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body);
}

const bytesOf = (body: string): string => String(new TextEncoder().encode(body).length);

export function dataResponse(_request: Request, url: URL, body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
	const text = stringify(body, url.searchParams.has('pretty'));
	return new Response(text, {
		status,
		headers: {
			...CORS,
			'Content-Type': 'application/json; charset=utf-8',
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
