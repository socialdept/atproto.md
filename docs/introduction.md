# Introduction

**atproto.md** gives agents one address for every Atmosphere record. Records live on each account's own PDS, so reading one normally means resolving a handle, reading a DID document and finding the server first. atproto.md does that on every call, for any collection on any PDS, and returns public data only. It runs as a Cloudflare Worker.

- **One address:** put an `at://` URI, a handle or a web link after `atproto.md/` and get the repo, a collection or a single record back, from the account's own PDS, or the whole repo as a CAR file.
- **One service URL:** point any AT Protocol SDK or XRPC client at `https://atproto.md`, and each [XRPC](endpoints/xrpc.md) call goes to the server that answers it, with handles resolved on the way.
- **Raw records:** every record is the exact JSON the PDS stores, with direct blob URLs. Images can be resized through the [co/infra image CDN](https://github.com/co-infra/co-infra-img).
- **Fewer calls:** fetch up to 25 records by URI or web link in one call, and add `expand` to get the records they reference in the same response.
- **Identity:** resolve a handle or DID to its DID document, PDS, entryway and account status, trace every resolution step when one fails, and read a `did:plc` identity's history from [plc.directory](https://plc.directory).
- **Network-wide:** discover every repo using a lexicon, explore the backlinks pointing at any record, identity or URL, and resolve a lexicon schema by its NSID through DNS.
- **For agents first:** an MCP server, an [llms.txt](https://llmstxt.org/) summary and a skill sheet for Claude Code, all backed by the same code as the URLs.

No authentication is supported or planned. Private records on a PDS are not reachable, and signed-in calls and writes go to the account's own PDS.

Related tools: [pds.ls](https://pds.ls), an AT Protocol repo explorer with the same URL convention, and [bsky.md](https://bsky.md), for Bluesky threads, feeds and search.

## A first look

List the records in a collection. Handles and DIDs both work as the authority:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Fetch a post and the posts it replies to, in one call:

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand"
```

Read a profile record through the XRPC endpoint, as any SDK would, with a handle in place of the DID:

```bash
curl "https://atproto.md/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self"
```

See which records across the network link to a post, grouped by source, then add `source` and `hydrate` to read them:

```bash
curl https://atproto.md/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j
```

## Documentation

Start with [Installation](getting-started/installation.md) to run your own copy, or [Agents](getting-started/agents.md) to use the hosted one from an LLM tool. The docs are grouped by area, and each group has an index of its own:

- **[Getting started](getting-started/README.md)**: [Installation](getting-started/installation.md), [Agents](getting-started/agents.md)
- **[Endpoints](endpoints/README.md)**: [Repos and records](endpoints/records.md), [Identity](endpoints/identity.md), [Network](endpoints/network.md), [XRPC](endpoints/xrpc.md), [Stats](endpoints/stats.md)
- **[Response format](output.md)**: What every data route returns, raw records, `expand` and errors.
