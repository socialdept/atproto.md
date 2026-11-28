# Stats

The anonymous usage dashboard and how to reset it.

## `GET /stats`

An anonymous usage dashboard: request counts by route and MCP tool, MCP sessions and their client names, the most-queried collections, status codes, upstream failures, and aggregate timing. Browsers get HTML, and agents get markdown.

- **XRPC.** Calls through [`/xrpc`](xrpc.md), by method namespace (`app.bsky`, `com.atproto`) and by the server that answered: the account's PDS, the relay, Bluesky's app view, a labeler, a service named by `atproto-proxy`, an app view found from the app's domain, or atproto.md itself.
- **Labels.** The share of [label lookups](labels.md) that found a label, split into accounts and records, the collections of the records looked up, the labels found by value and by labeler, and each labeler's average answer time and failure rate. Labelers outside the curated list are counted together as "Other labelers".

The JSON responses served over HTTP, redirects (`/blob`, `/repo/car` and the blob and repo calls through `/xrpc`), `/llms.txt`, `/skill.md` and the MCP tool calls are counted. HTML visits to the home and stats pages are not. Counters never hold IPs, handles, DIDs or record keys. A label lookup is counted by kind only: an account, or a record's collection. HTTP requests do record a coarse country code.

Rare rows are hidden: countries under 20 requests, status codes under 15 responses, namespaces under 10 requests, and MCP clients, backlink sources and labels under 5.

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
