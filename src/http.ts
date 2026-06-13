export const CORS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const bytesOf = (body: string): string => String(new TextEncoder().encode(body).length);

export function mdResponse(body: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
	return new Response(body, {
		status,
		headers: {
			...CORS,
			'Content-Type': 'text/markdown; charset=utf-8',
			'Content-Length': bytesOf(body),
			'Cache-Control': 'public, max-age=60',
			...extraHeaders,
		},
	});
}

// `upstream` names the failed dependency (pds, plc, relay, …) for anonymous stats; it rides
// along as an X-Upstream header that the worker's fetch handler reads back when counting.
export function errMd(msg: string, status = 400, upstream?: string): Response {
	return mdResponse(`# Error ${status}\n\n${msg}\n`, status, upstream ? { 'X-Upstream': upstream } : {});
}
