// Sent on requests to other people's servers. Some sites refuse a request that names no client.
export const USER_AGENT = { 'User-Agent': 'atproto.md (+https://atproto.md)' };

export const CORS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	// XRPC clients send these: which service to reach, which labelers to apply, and a procedure's body type.
	'Access-Control-Allow-Headers': 'atproto-proxy, atproto-accept-labelers, content-type',
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

// A markdown error, for the routes that answer in markdown. API errors are JSON, from errorResponse in output.ts.
export function errMd(msg: string, status = 400): Response {
	return mdResponse(`# Error ${status}\n\n${msg}\n`, status);
}
