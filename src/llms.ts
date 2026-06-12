export function llmsTxt(origin: string): string {
	return `# atproto.md

> A read-only, markdown-first API for the AT Protocol ecosystem. Returns structured markdown from any PDS. Accepts at:// URIs directly in the URL path. No authentication required — public data only.

atproto.md resolves handles and DIDs, fetches data directly from the user's PDS via \`com.atproto.repo.*\`, and returns rich markdown. Works with any collection on any PDS — not just Bluesky.

## Endpoints

- [Resolve identity](${origin}/resolve/{handle-or-did}): Full identity chain — handle → DID → DID document → PDS endpoint
- [Repo overview](${origin}/at://{actor}): Lists all collections in an actor's repo
- [List records](${origin}/at://{actor}/{collection}): Paginated records from any collection. Params: limit (default 25, max 100), cursor, reverse
- [Get record](${origin}/at://{actor}/{collection}/{rkey}): Fetch a single record by its rkey
- [Get lexicon](${origin}/lexicon/{nsid}): Resolve a Lexicon schema by NSID via DNS-based lexicon resolution (_lexicon TXT → DID → com.atproto.lexicon.schema record)
- [Discover repos by collection](${origin}/discover/{collection}): Every repo on the network with records in a collection NSID. Params: limit (default 100, max 2000), cursor
- [Backlinks](${origin}/backlinks/{at-uri-or-did-or-url}): Who links to a target (likes, reposts, replies, follows, any lexicon). Summary of sources by default; add source={collection:path} to list linking records

## Examples

- [Resolve bsky.app](${origin}/resolve/bsky.app)
- [Browse repo](${origin}/at://bsky.app)
- [List posts](${origin}/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post?limit=5)
- [Get profile](${origin}/at://bsky.app/app.bsky.actor.profile/self)
- [Get the app.bsky.feed.post lexicon](${origin}/lexicon/app.bsky.feed.post)
- [Discover site.standard.document repos](${origin}/discover/site.standard.document)
- [Backlinks to a post](${origin}/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3lgwdn7vd722r)

## Install as MCP server

- [MCP endpoint](${origin}/mcp): Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`
- [Skill instructions](${origin}/skill.md): Full agent skill sheet with usage triggers, examples, and endpoint reference

## Install as a Claude Code command

Save the skill sheet as a slash command (invoke with \`/atproto\`):

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`
`;
}

export function skillMd(origin: string): string {
	return `---
name: atproto-md
description: Fetch any public AT Protocol data as clean Markdown — resolve handles/DIDs, browse repos, read records from any collection on any PDS (Bluesky or third-party lexicons), resolve lexicon schemas by NSID, discover every repo using a lexicon, and explore backlinks. Use whenever the user shares an at:// URI, a handle/DID, or a lexicon NSID (e.g. app.bsky.feed.post, site.standard.document), or asks to inspect AT Protocol / atproto / Bluesky / Standard.site data.
---

# atproto-md — AT Protocol Markdown API

Fetch any public AT Protocol data as clean Markdown. No auth, no API key required.
Works with **any collection on any PDS** — not just Bluesky.
Base URL: ${origin}

## When to use this skill

Use this API whenever the user asks to:
- Browse an AT Protocol repo or list someone's collections
- Read records from any AT Protocol collection (posts, profiles, follows, publications, etc.)
- Resolve a handle to a DID, or inspect someone's DID document and PDS
- Explore third-party lexicons that get rich Markdown formatting: Standard (\`site.standard\`), Leaflet (\`pub.leaflet\`), Offprint (\`app.offprint\`), Pocket (\`blog.pckt\`), Linkat (\`blue.linkat\`), Woosh (\`link.woosh\`), Smoke Signal (\`events.smokesignal.calendar\`), Wisp (\`place.wisp\`), Lexicon schemas (\`com.atproto.lexicon.schema\`), and Bluesky (\`app.bsky.*\`) — any other collection still renders as generic markdown
- Fetch content from any PDS on the AT Protocol network
- Dereference an \`at://\` URI
- Resolve a Lexicon schema definition by its NSID (e.g. inspect the \`app.bsky.feed.post\` schema)
- Discover every repo on the network using a given collection/lexicon (e.g. all repos with \`site.standard.document\`)
- Find who liked, reposted, replied to, follows, or otherwise links to a record, account, or URL (backlinks)

## How to call it

All endpoints return \`Content-Type: text/markdown\`. Just fetch the URL.
Open CORS — works from browser, server, or CLI.

\`\`\`bash
# Resolve a handle or DID
curl ${origin}/resolve/bsky.app

# Browse a repo (list all collections)
curl ${origin}/at://bsky.app

# List records in a collection
curl "${origin}/at://bsky.app/app.bsky.feed.post?limit=5"

# Fetch a single record
curl ${origin}/at://bsky.app/app.bsky.actor.profile/self

# Resolve a Lexicon schema by NSID
curl ${origin}/lexicon/app.bsky.feed.post

# Discover every repo on the network with a given collection
curl ${origin}/discover/site.standard.document

# Find backlinks to a record (summary of all link sources)
curl ${origin}/backlinks/at://bsky.app/app.bsky.feed.post/3lgwdn7vd722r

# List the actual liking records
curl "${origin}/backlinks/at://bsky.app/app.bsky.feed.post/3lgwdn7vd722r?source=app.bsky.feed.like:subject.uri"
\`\`\`

## Endpoint reference

### Resolve identity
\`\`\`
GET ${origin}/resolve/{actor}
\`\`\`
Full identity chain: handle → DID → DID document → PDS endpoint.
Returns the DID, all \`alsoKnownAs\` handles, services, and verification keys.

### Repo overview
\`\`\`
GET ${origin}/at://{actor}
\`\`\`
Lists all collections present in the actor's repo with links to browse each one.

### List records
\`\`\`
GET ${origin}/at://{actor}/{collection}[?limit=&cursor=&reverse=]
\`\`\`
Paginated list of records in any collection. Unknown collections are rendered as generic key-value markdown.

### Single record
\`\`\`
GET ${origin}/at://{actor}/{collection}/{rkey}
\`\`\`
Fetch a single record by its record key.

### Get lexicon
\`\`\`
GET ${origin}/lexicon/{nsid}
\`\`\`
Resolve a Lexicon schema by its NSID using AT Protocol DNS-based lexicon resolution: the
\`_lexicon.{authority}\` TXT record points at a DID, whose repo holds the schema at
\`com.atproto.lexicon.schema/{nsid}\`. Returns the schema's definitions and full JSON.
Works for any published lexicon — e.g. \`/lexicon/app.bsky.feed.post\`.

### Discover repos by collection
\`\`\`
GET ${origin}/discover/{collection}[?limit=&cursor=]
\`\`\`
Every repo (DID) on the network with records in the given collection NSID. Network-wide,
via the relay's \`com.atproto.sync.listReposByCollection\`. Use it to find all users of a
lexicon — e.g. \`/discover/site.standard.document\`. Cursor-paginated (limit default 100, max 2000).
Each result links straight into that repo's records for the collection.

### Backlinks
\`\`\`
GET ${origin}/backlinks/{at-uri-or-did-or-url}[?source=&limit=&cursor=]
\`\`\`
Records across the network that link to a target — likes, reposts, replies, follows, quotes,
or any custom lexicon. Without \`source\`, returns a summary table of every link source with
record + distinct-DID counts. With \`source={collection:path}\` (e.g. \`app.bsky.feed.like:subject.uri\`),
lists the actual linking records, cursor-paginated. Indexed by Constellation (microcosm.blue).

URLs accept \`at://\` URIs directly in the path:

\`\`\`
${origin}/at://{actor}                          → repo overview
${origin}/at://{actor}/{collection}              → list records
${origin}/at://{actor}/{collection}/{rkey}       → single record
\`\`\`

## Parameter notes

- **{actor}** — a handle (\`alice.bsky.social\`, \`bsky.app\`, \`aka.dad\`) or DID (\`did:plc:...\`, \`did:web:...\`)
- **{collection}** — any AT Protocol collection NSID (e.g. \`app.bsky.feed.post\`, \`site.standard.document\`, \`link.woosh.linkPage\`)
- **{rkey}** — the record key (e.g. \`self\`, \`3jui7kd54zh2y\`)
- **limit** — integer 1–100, default 25
- **cursor** — opaque pagination token from a previous response
- **reverse** — \`true\` for oldest-first ordering

## Response format

All responses are plain Markdown text:
- Records include collection type, AT URI, and formatted content
- Known collections get rich formatting (posts with embeds, profiles with bios, publications with URLs, etc.)
- Unknown collections are rendered as generic key-value markdown — nothing is unreadable
- Paginated responses include a cursor for the next page
- Errors return markdown with status code and message

## Rich formatting for known collections

| Collection                                      | Notes                              |
| ----------------------------------------------- | ---------------------------------- |
| \`app.bsky.feed.post\`                            | Text, embeds, reply context        |
| \`app.bsky.actor.profile\`                        | Bio, display name                  |
| \`app.bsky.graph.follow/block/list/listitem\`     | Subjects, timestamps               |
| \`app.bsky.feed.like/repost/generator\`           | Subjects, timestamps               |
| \`app.bsky.labeler.service\`                      | Label policies                     |
| \`site.standard.publication\`                     | Name, URL, description             |
| \`site.standard.document\`                        | Title, content, published date     |
| \`pub.leaflet.publication/document\`              | Name, URL, content from pages      |
| \`app.offprint.publication/document.article\`     | References to standard records     |
| \`blog.pckt.publication\`                         | Reference to standard record       |
| \`link.woosh.linkPage\`                           | Description, labeled link sections |
| \`blue.linkat.entry\`                             | Title, URL, description            |
| \`events.smokesignal.calendar.event\`             | Name, dates, location              |
| *Any other collection*                          | Generic key-value markdown         |

## Install as a Claude Code command

Save this skill sheet as a slash command (then invoke it with \`/atproto\`):

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`

## Full reference

${origin}/llms.txt — structured API summary for LLM discovery
${origin}/mcp — MCP server endpoint (install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`)
${origin}/ — interactive homepage
`;
}
