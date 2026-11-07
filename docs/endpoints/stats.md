# Stats

Part of the [atproto.md docs](../introduction.md#documentation). The anonymous usage dashboard and how to reset it.

## `GET /stats`

An anonymous usage dashboard: request counts by route and MCP tool, MCP sessions, the most-queried collections and which of them still need a [formatter](../formatting.md), status codes, upstream failures, and aggregate timing. Browsers get HTML, and agents get markdown.

Only the markdown responses served over HTTP and the MCP tool calls are counted. HTML visits to the home and stats pages are not. Counters never hold IPs, handles, DIDs or record keys. HTTP requests do record a coarse country code.

The counters live in the `STATS` Durable Object, which is SQLite-backed.

## `POST /stats/reset`

Wipes every counter. It is off unless the `STATS_RESET_TOKEN` secret is set:

```bash
wrangler secret put STATS_RESET_TOKEN
```

Then send the token as a bearer token:

```bash
curl -X POST -H "Authorization: Bearer <token>" https://atproto.md/stats/reset
```

A wrong method, a missing or unset token, or a mismatch all answer 404, so the endpoint is not advertised.
