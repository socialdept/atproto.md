export const CORS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export function mdResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: {
			...CORS,
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'public, max-age=60',
		},
	});
}

export function errMd(msg: string, status = 400): Response {
	return mdResponse(`# Error ${status}\n\n${msg}\n`, status);
}
