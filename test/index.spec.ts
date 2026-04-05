import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function workerFetch(url: string, init?: RequestInit) {
	const request = new IncomingRequest(url, init);
	const ctx = createExecutionContext();
	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);
	return response;
}

describe('routing', () => {
	it('returns the index page on GET /', async () => {
		const res = await workerFetch('http://example.com/');

		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');

		const body = await res.text();
		expect(body).toContain('# atproto.md');
		expect(body).toContain('at://');
	});

	it('includes the request origin in index page URLs', async () => {
		const body = await (await workerFetch('http://localhost:8787/')).text();
		expect(body).toContain('http://localhost:8787/at://');
		expect(body).toContain('http://localhost:8787/resolve/');
	});

	it('returns 405 for non-GET/OPTIONS methods on non-MCP routes', async () => {
		const res = await workerFetch('http://example.com/', { method: 'POST' });
		expect(res.status).toBe(405);
	});

	it('returns 405 for PUT', async () => {
		const res = await workerFetch('http://example.com/', { method: 'PUT' });
		expect(res.status).toBe(405);
	});

	it('returns 400 for unrecognized paths', async () => {
		const res = await workerFetch('http://example.com/invalid/path');
		expect(res.status).toBe(400);
		expect(await res.text()).toContain('Error');
	});

	it('returns usage hint for /resolve without an actor', async () => {
		const res = await workerFetch('http://example.com/resolve');
		expect(res.status).toBe(400);
		expect(await res.text()).toContain('/resolve/{handle-or-did}');
	});
});

describe('CORS', () => {
	it('responds to OPTIONS preflight with CORS headers', async () => {
		const res = await workerFetch('http://example.com/', { method: 'OPTIONS' });

		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
		expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
	});

	it('includes CORS headers on markdown responses', async () => {
		const res = await workerFetch('http://example.com/');
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('includes CORS headers on error responses', async () => {
		const res = await workerFetch('http://example.com/invalid');
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});
});

describe('response headers', () => {
	it('sets Content-Type to text/markdown', async () => {
		const res = await workerFetch('http://example.com/');
		expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
	});

	it('sets Cache-Control', async () => {
		const res = await workerFetch('http://example.com/');
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
	});
});

describe('/llms.txt', () => {
	it('returns structured markdown', async () => {
		const res = await workerFetch('http://example.com/llms.txt');

		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');

		const body = await res.text();
		expect(body).toContain('# atproto.md');
	});

	it('includes all endpoint descriptions', async () => {
		const body = await (await workerFetch('http://example.com/llms.txt')).text();
		expect(body).toContain('/resolve/');
		expect(body).toContain('/at://');
		expect(body).toContain('/mcp');
	});

	it('uses the request origin in URLs', async () => {
		const body = await (await workerFetch('https://atproto.md/llms.txt')).text();
		expect(body).toContain('https://atproto.md/resolve/');
		expect(body).toContain('https://atproto.md/mcp');
	});

	it('includes the MCP install command', async () => {
		const body = await (await workerFetch('http://example.com/llms.txt')).text();
		expect(body).toContain('claude mcp add --transport http atproto-md http://example.com/mcp');
	});
});

describe('index page content', () => {
	it('documents all endpoints', async () => {
		const body = await (await workerFetch('http://example.com/')).text();
		expect(body).toContain('/resolve/{actor}');
		expect(body).toContain('/at://{actor}');
		expect(body).toContain('/at://{actor}/{collection}');
		expect(body).toContain('/at://{actor}/{collection}/{rkey}');
	});

	it('lists known collection formatters', async () => {
		const body = await (await workerFetch('http://example.com/')).text();
		expect(body).toContain('app.bsky.feed.post');
		expect(body).toContain('app.bsky.actor.profile');
		expect(body).toContain('com.whtwnd.blog.entry');
		expect(body).toContain('blue.linkat.entry');
		expect(body).toContain('events.smokesignal.calendar.event');
	});

	it('mentions llms.txt and MCP', async () => {
		const body = await (await workerFetch('http://example.com/')).text();
		expect(body).toContain('/llms.txt');
		expect(body).toContain('/mcp');
	});
});

describe('integration (via SELF)', () => {
	it('serves the index page', async () => {
		const res = await SELF.fetch('https://example.com/');
		expect(res.status).toBe(200);
		expect(await res.text()).toContain('# atproto.md');
	});

	it('serves llms.txt', async () => {
		const res = await SELF.fetch('https://example.com/llms.txt');
		expect(res.status).toBe(200);
		expect(await res.text()).toContain('# atproto.md');
	});
});
