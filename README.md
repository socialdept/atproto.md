# atproto.md

Every Atmosphere record, one address for agents. atproto.md reads any record on any PDS and returns it as raw JSON, exactly as stored, through an MCP server, a URL or a standard XRPC endpoint.

Records live on each account's own PDS, so reading one normally means resolving a handle, reading a DID document and finding the server first. atproto.md does that on every call. Put an `at://` URI, a handle or a link after `atproto.md/`, or point an SDK at it, and the call reaches the right server. It says whether an account is active and traces its resolution step by step, exports a whole repo as a CAR file, and answers network-wide questions: which repos use a lexicon, and which records link to a record, account or URL. To learn all about it, head over to [the documentation](https://socialde.pt/docs/atproto.md).

Here are a few short examples of what you can do. List the records in any collection on any PDS:

```bash
curl https://atproto.md/at://bsky.app/app.bsky.feed.post
```

Fetch a post with the posts it replies to and quotes, in one call:

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand"
```

Use it as the service URL of any AT Protocol SDK, with no resolving on your side:

```bash
curl "https://atproto.md/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self"
```

See why an account does not resolve, step by step, from DNS to its PDS and entryway:

```bash
curl https://atproto.md/did/trace/bsky.app
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
