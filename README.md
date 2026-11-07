# atproto.md

A read-only, markdown-first API for the AT Protocol ecosystem, built for LLM agents and tools that consume plain text.

atproto.md is a Cloudflare Worker that takes `at://` URIs in the URL path and returns markdown. Records come from the user's own PDS, not a Bluesky-specific AppView, so it works with any collection on any PDS. It also answers network-wide questions: which repos use a lexicon, and which records link to a record, identity or URL. To learn all about it, head over to [the documentation](https://socialde.pt/docs/atproto.md).

Here are a few short examples of what you can do. List the records in any collection on any PDS:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Resolve the identity chain for a handle, from handle to DID to DID document to PDS:

```bash
curl https://atproto.md/resolve/bsky.app
```

Find every repo on the network with records in a collection:

```bash
curl https://atproto.md/discover/site.standard.document
```

Or install it as an MCP server in Claude Code:

```bash
claude mcp add --transport http atproto-md https://atproto.md/mcp
```

## Documentation

You'll find the documentation on [https://socialde.pt/docs/atproto.md](https://socialde.pt/docs/atproto.md).

Find yourself stuck using it? Found a bug? Do you have general questions or suggestions for improving it? Feel free to [create an issue on GitHub](https://github.com/socialdept/atproto.md/issues).

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.
