export function llmsTxt(origin: string): string {
	return `# atproto.md

> A read-only AT Protocol API for agents. Every data route returns one JSON object in a \`\`\`json fence, or bare JSON with ?format=json. Records are raw, exactly as the PDS stores them, for any collection on any PDS. No authentication, public data only.

## Records

- [Repo](${origin}/at://{actor}): DID, handle, PDS, DID document and every collection
- [List records](${origin}/at://{actor}/{collection}): records newest first. Params: limit (25, at most 100), cursor, reverse, expand
- [Get record](${origin}/at://{actor}/{collection}/{rkey}): one record with blob URLs. Param: expand
- [Get many](${origin}/get?uri={address}&uri={address}): up to 25 records by at:// URI or bsky.app link in one call. Param: expand

expand also returns the records the results reference (reply parent and root, quoted post, like or repost subject), one level deep, under expanded.

## Identity

- [Resolve](${origin}/resolve/{handle-or-did}): the same as /at://{actor}
- [PLC data](${origin}/plc/data/{handle-or-did}): current PLC state, with rotation keys
- [PLC audit log](${origin}/plc/audit/{handle-or-did}): every PLC operation, dated
- [PLC last op](${origin}/plc/last/{handle-or-did}): the latest PLC operation

## Network

- [Discover](${origin}/discover/{collection}): every repo with records in a collection. Params: limit (100, at most 2000), cursor
- [Lexicon](${origin}/lexicon/{nsid}): the published schema for an NSID
- [Backlinks](${origin}/backlinks/{at-uri-or-did-or-url}): link sources with counts. Add source={collection:path} for the linking record URIs, and hydrate for the records

## Examples

- [A profile](${origin}/at://bsky.app/app.bsky.actor.profile/self)
- [Latest posts](${origin}/at://bsky.app/app.bsky.feed.post?limit=5)
- [A post and what it replies to](${origin}/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand)
- [Repos using site.standard.document](${origin}/discover/site.standard.document)

## Agents

- [MCP server](${origin}/mcp): tools resolve, get, list_records, backlinks, discover and lexicon. Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`
- [Skill sheet](${origin}/skill.md): save it as a command with \`curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md\`
`;
}

export function skillMd(origin: string): string {
	return `---
name: atproto-md
description: Read any public AT Protocol data as raw JSON. Resolve a handle or DID to its PDS and collections, read records from any collection on any PDS, fetch up to 25 records by at:// URI or bsky.app link in one call with the records they reference, find backlinks (likes, replies, quotes, follows), list every repo using a lexicon, fetch a lexicon schema, and read a did:plc identity's PLC history. Use whenever the user shares an at:// URI, a bsky.app link, a handle or DID, or a lexicon NSID.
---

# atproto-md

Read-only AT Protocol data, as JSON. No auth. Base URL: ${origin}

## When to use this skill

- Read a record, a collection or a whole repo on any PDS, for Bluesky or any other lexicon
- Dereference an at:// URI or a bsky.app post, feed, list or starter pack link
- Read a post together with its parent, root and quoted post
- Find who liked, reposted, replied to, quoted or follows something
- Find every repo using a lexicon, or fetch a lexicon's schema
- Resolve a handle or DID to its PDS, or date a PDS migration or handle change from the PLC log

For Bluesky threads, timelines, feeds and search, use the Bluesky AppView or bsky.md. atproto.md reads records from each account's own PDS.

## How to call it

Every data route returns one JSON object inside a \`\`\`json fence. Add \`?format=json\` for bare JSON and \`?pretty\` to indent it.
Records are \`{uri, cid, value, blobs}\`. \`value\` is exactly what the PDS stores, and \`blobs\` lists direct getBlob URLs.
Errors are \`{"error": "...", "status": 404}\`.

Use the fewest calls: batch addresses into one /get, add \`expand\` for referenced records, and add \`hydrate\` to backlinks.

\`\`\`bash
# Identity, PDS and collections
curl ${origin}/resolve/bsky.app
curl ${origin}/at://bsky.app

# Records
curl "${origin}/at://bsky.app/app.bsky.feed.post?limit=5"
curl ${origin}/at://bsky.app/app.bsky.actor.profile/self

# Several records, with the records they reference
curl "${origin}/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&uri=at://bsky.app/app.bsky.actor.profile/self&expand"

# Who replied to a post, as records
curl "${origin}/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j?source=app.bsky.feed.post:reply.parent.uri&hydrate"
\`\`\`

## Endpoint reference

\`\`\`
GET ${origin}/at://{actor}                                  {did, handle, pds, collections, didDoc}
GET ${origin}/at://{actor}/{collection}                     {did, handle, pds, collection, cursor, records}
GET ${origin}/at://{actor}/{collection}/{rkey}              {uri, cid, value, blobs}
GET ${origin}/get?uri={address}&uri=...                     {records, errors, expanded}, up to 25
GET ${origin}/resolve/{actor}                               same as /at://{actor}
GET ${origin}/plc/data/{actor}                              current PLC state
GET ${origin}/plc/audit/{actor}                             {did, operations}
GET ${origin}/plc/last/{actor}                              {did, operation}
GET ${origin}/discover/{collection}                         {collection, cursor, repos}
GET ${origin}/lexicon/{nsid}                                {nsid, authority, did, uri, cid, schema}
GET ${origin}/backlinks/{target}                            {target, total, sources}
GET ${origin}/backlinks/{target}?source={collection:path}   {target, source, total, cursor, records}
\`\`\`

- {actor} is a handle or DID. An {address} is an at:// record URI or a bsky.app link.
- Lists take limit, cursor and reverse (oldest first). cursor is null on the last page.
- expand works on every record route. hydrate works on backlinks with source, 25 records at most.
- A batch reports a failed address in errors and still returns the rest.

## Install as a Claude Code command

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`

MCP server: \`claude mcp add --transport http atproto-md ${origin}/mcp\`, with the tools resolve, get, list_records, backlinks, discover and lexicon.
`;
}
