# Introduction

**atproto.md** is a read-only, markdown-first API for the AT Protocol ecosystem, built for LLM agents and tools that consume plain text. It runs as a Cloudflare Worker and serves public data only:

- **Repos and records:** pass an `at://` URI in the URL path and get the repo, a collection or a single record back as markdown, fetched from the user's own PDS.
- **Any collection:** known collection types get structured rendering, and everything else falls back to generic key-value markdown, so no collection is unreadable.
- **Identity:** resolve a handle or DID to its DID document and PDS, and read a `did:plc` identity's history and current state from [plc.directory](https://plc.directory).
- **Network-wide:** discover every repo using a lexicon, explore the backlinks pointing at any record, identity or URL, and resolve a lexicon schema by its NSID through DNS.
- **For agents:** an MCP server, an [llms.txt](https://llmstxt.org/) summary and a skill sheet for Claude Code.

No authentication is supported or planned. Private records on a PDS are not reachable.

Related tools: [pds.ls](https://pds.ls), an AT Protocol repo explorer with the same URL convention, and [bsky.md](https://bsky.md), a Bluesky-specific markdown API.

## A first look

List the records in a collection. Handles and DIDs both work as the authority:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Read the history of a `did:plc` identity, including PDS migrations and handle changes:

```bash
curl https://atproto.md/plc/audit/bsky.app
```

See which records across the network link to a post, grouped by source:

```bash
curl https://atproto.md/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3lgwdn7vd722r
```

## Documentation

Start with [Installation](getting-started/installation.md) to run your own copy, or [Agents](getting-started/agents.md) to use the hosted one from an LLM tool. The docs are grouped by area, and each group has an index of its own:

- **[Getting started](getting-started/README.md)**: [Installation](getting-started/installation.md), [Agents](getting-started/agents.md)
- **[Endpoints](endpoints/README.md)**: [Repos and records](endpoints/records.md), [Identity](endpoints/identity.md), [Network](endpoints/network.md), [Stats](endpoints/stats.md)
- **[Record formatting](formatting.md)**: The collections with a dedicated formatter, and how to add one.
