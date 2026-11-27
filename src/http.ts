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

// A markdown error, for the routes that answer in markdown. API errors are JSON, from errorResponse in output.ts.
export function errMd(msg: string, status = 400): Response {
	return mdResponse(`# Error ${status}\n\n${msg}\n`, status);
}
