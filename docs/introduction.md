# Introduction

**atproto.md** is a read-only API for the AT Protocol ecosystem, built for LLM agents. It runs as a Cloudflare Worker, serves public data only, and returns every response as one JSON object inside a markdown code fence, or as bare JSON on request:

- **Repos and records:** pass an `at://` URI in the URL path and get the repo, a collection or a single record back, fetched from the user's own PDS.
- **Raw records:** every record is the exact JSON the PDS stores, for any collection, with direct blob URLs.
- **Fewer calls:** fetch up to 25 records by URI or bsky.app link in one call, and add `expand` to get the records they reference in the same response.
- **Identity:** resolve a handle or DID to its DID document and PDS, and read a `did:plc` identity's history and current state from [plc.directory](https://plc.directory).
- **Network-wide:** discover every repo using a lexicon, explore the backlinks pointing at any record, identity or URL, and resolve a lexicon schema by its NSID through DNS.
- **For agents:** an MCP server, an [llms.txt](https://llmstxt.org/) summary and a skill sheet for Claude Code.

No authentication is supported or planned. Private records on a PDS are not reachable.

Related tools: [pds.ls](https://pds.ls), an AT Protocol repo explorer with the same URL convention, and [bsky.md](https://bsky.md), a Bluesky-specific markdown API for threads, feeds and search.

## A first look

List the records in a collection. Handles and DIDs both work as the authority:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Fetch a post and the posts it replies to, in one call:

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand"
```

See which records across the network link to a post, grouped by source, then add `source` and `hydrate` to read them:

```bash
curl https://atproto.md/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j
```

## Documentation

Start with [Installation](getting-started/installation.md) to run your own copy, or [Agents](getting-started/agents.md) to use the hosted one from an LLM tool. The docs are grouped by area, and each group has an index of its own:

- **[Getting started](getting-started/README.md)**: [Installation](getting-started/installation.md), [Agents](getting-started/agents.md)
- **[Endpoints](endpoints/README.md)**: [Repos and records](endpoints/records.md), [Identity](endpoints/identity.md), [Network](endpoints/network.md), [Stats](endpoints/stats.md)
- **[Response format](output.md)**: What every data route returns, raw records, `expand`, and how to ask for bare JSON.
