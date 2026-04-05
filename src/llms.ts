export function llmsTxt(origin: string): string {
	return `# atproto.md

> A read-only, markdown-first API for the AT Protocol ecosystem. Returns structured markdown from any PDS. Accepts at:// URIs directly in the URL path. No authentication required — public data only.

atproto.md resolves handles and DIDs, fetches data directly from the user's PDS via \`com.atproto.repo.*\`, and returns rich markdown. Works with any collection on any PDS — not just Bluesky.

## Endpoints

- [Resolve identity](${origin}/resolve/{handle-or-did}): Full identity chain — handle → DID → DID document → PDS endpoint
- [Repo overview](${origin}/at://{actor}): Lists all collections in an actor's repo
- [List records](${origin}/at://{actor}/{collection}): Paginated records from any collection. Params: limit (default 25, max 100), cursor, reverse
- [Get record](${origin}/at://{actor}/{collection}/{rkey}): Fetch a single record by its rkey

## Examples

- [Resolve bsky.app](${origin}/resolve/bsky.app)
- [Browse repo](${origin}/at://bsky.app)
- [List posts](${origin}/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post?limit=5)
- [Get profile](${origin}/at://bsky.app/app.bsky.actor.profile/self)

## Install as MCP server

- [MCP endpoint](${origin}/mcp): Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`
`;
}
