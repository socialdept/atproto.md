import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('atproto.md worker', () => {
	it('returns markdown index page on GET /', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');

		const body = await response.text();
		expect(body).toContain('# atproto.md');
		expect(body).toContain('at://');
	});

	it('returns 405 for non-GET methods', async () => {
		const request = new IncomingRequest('http://example.com/', { method: 'POST' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(405);
	});

	it('handles CORS preflight', async () => {
		const request = new IncomingRequest('http://example.com/', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('returns error for invalid paths', async () => {
		const request = new IncomingRequest('http://example.com/invalid/path');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		const body = await response.text();
		expect(body).toContain('Error');
	});

	it('returns usage hint for /resolve without actor', async () => {
		const request = new IncomingRequest('http://example.com/resolve');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		const body = await response.text();
		expect(body).toContain('/resolve/{handle-or-did}');
	});

	it('returns index page via integration style', async () => {
		const response = await SELF.fetch('https://example.com/');
		expect(response.status).toBe(200);
		expect(await response.text()).toContain('# atproto.md');
	});

	it('returns llms.txt with endpoint descriptions', async () => {
		const request = new IncomingRequest('http://example.com/llms.txt');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');

		const body = await response.text();
		expect(body).toContain('# atproto.md');
		expect(body).toContain('/resolve/');
		expect(body).toContain('/mcp');
		expect(body).toContain('http://example.com');
	});
});
