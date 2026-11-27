# atproto.md

A read-only API for the AT Protocol ecosystem, built for LLM agents. Records come back as raw JSON, exactly as the PDS stores them.

atproto.md is a Cloudflare Worker that takes `at://` URIs, handles or links in the URL path and returns JSON. Records come from the user's own PDS, not a Bluesky-specific AppView, so it works with any collection on any PDS. It also answers network-wide questions: which repos use a lexicon, and which records link to a record, identity or URL. To learn all about it, head over to [the documentation](https://socialde.pt/docs/atproto.md).

Here are a few short examples of what you can do. List the records in any collection on any PDS:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Resolve a handle to its DID, PDS, DID document and collections:

```bash
curl https://atproto.md/resolve/bsky.app
```

Fetch a post with the posts it replies to and quotes, in one call:

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand"
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

## License

The MIT License (MIT). Please see [LICENSE](LICENSE) for more information.
