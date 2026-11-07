# Installation

Part of the [atproto.md docs](../introduction.md#documentation). Installing, running locally, configuring and deploying the Worker.

atproto.md is built as a Cloudflare Worker and managed with [Wrangler](https://developers.cloudflare.com/workers/wrangler/). A public instance runs at https://atproto.md, so you only need this page to run a copy of your own.

## Installing

```bash
npm install
```

## Running locally

```bash
npm run dev      # local dev server through wrangler, at http://localhost:8787
npm run test     # run the test suite with vitest
```

## Configuration

Everything the Worker needs is declared in `wrangler.jsonc`:

- **Static assets:** files in `./public`, such as `/og.png`, are served before the Worker. Paths that match nothing fall through to it.
- **`STATS`:** a SQLite-backed Durable Object (`StatsDO`) that aggregates the anonymous usage counters shown at [`/stats`](../endpoints/stats.md).
- **`STATS_RESET_TOKEN`:** an optional secret that turns on `POST /stats/reset`. Set it with `wrangler secret put STATS_RESET_TOKEN`. Without it the reset endpoint answers 404.

Run `npm run cf-typegen` (`wrangler types`) after changing bindings in `wrangler.jsonc`.

## Deploying

```bash
npm run deploy   # wrangler deploy
```

Markdown responses carry `Cache-Control: public, max-age=60`. The Worker has no rate limiting of its own, so the upstream PDS, relay and index limits apply. If you expect significant traffic, add rate limiting per IP, for example backed by Cloudflare KV.
