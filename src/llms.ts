export function llmsTxt(origin: string): string {
	return `# atproto.md

> Every Atmosphere record, one address for agents. Put an at:// URI, a handle or a link after atproto.md/, or set it as an SDK's service URL, and each call reaches the account's own PDS. Records are raw JSON, exactly as stored, for any collection on any PDS. No authentication, public data only.

## Records

- [Repo](${origin}/at://{actor}): DID, handle, PDS, entryway, account status, when it moved to its PDS, DID document and every collection
- [List records](${origin}/at://{actor}/{collection}): records newest first. Params: limit (25, at most 100), cursor, reverse, expand
- [Get record](${origin}/at://{actor}/{collection}/{rkey}): one record with blob URLs. Param: expand
- [Get many](${origin}/get?uri={address}&uri={address}): up to 25 records by at:// URI or web link in one call. Param: expand
- [Blob](${origin}/blob/{actor}/{cid}): a blob as uploaded. Add transform options such as /p=avatar or /w=400,f=webp to redirect to a resized copy from the co/infra image CDN (https://github.com/co-infra/co-infra-img)
- [Repo CAR](${origin}/repo/car/{actor}): the whole repo as a CAR file download

labels on a record route attaches each record's labels, author its account's, and labelers chooses who to ask. expand also returns the records the results reference (reply parent and root, quoted post, like or repost subject), one level deep, under expanded.

## Identity

- [Resolve](${origin}/resolve/{handle-or-did}): the same as /at://{actor}
- [DID document](${origin}/did/doc/{handle-or-did}): the DID document as published
- [Trace](${origin}/did/trace/{handle-or-did}): every resolution step (DNS, HTTPS, DID document, PDS) with its response, for working out why an account does not resolve
- [PLC data](${origin}/plc/data/{handle-or-did}): current PLC state, with rotation keys
- [PLC audit log](${origin}/plc/audit/{handle-or-did}): every PLC operation, dated
- [PLC last op](${origin}/plc/last/{handle-or-did}): the latest PLC operation

## Network

- [Discover](${origin}/discover/{collection}): every repo with records in a collection. Params: limit (100, at most 2000), cursor
- [Lexicon](${origin}/lexicon/{nsid}): the published schema for an NSID
- [Labels](${origin}/labels/{target}): labels on a record or account, from Bluesky's moderation labeler. Params: labelers (all, or handles and DIDs), author (a record's account labels too)
- [Labelers](${origin}/labelers): the known labelers that labelers=all asks
- [Backlinks](${origin}/backlinks/{at-uri-or-did-or-url}): link sources with counts. Add source={collection:path} for the linking record URIs, and hydrate for the records

## XRPC

- [XRPC](${origin}/xrpc/{method}): standard XRPC queries, each sent to the server that answers it. Set ${origin} as the service URL of any AT Protocol SDK. repo and did take a handle or a DID. com.atproto.repo and com.atproto.sync calls go to the account's PDS, other sync calls to the relay, app.bsky calls to Bluesky's public app view, and identity calls are answered by atproto.md. Calls with an Authorization header and procedures are refused.

## Examples

- [A profile](${origin}/at://bsky.app/app.bsky.actor.profile/self)
- [Latest posts](${origin}/at://bsky.app/app.bsky.feed.post?limit=5)
- [A post and what it replies to](${origin}/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand)
- [Repos using site.standard.document](${origin}/discover/site.standard.document)
- [A resolution trace](${origin}/did/trace/bsky.app)
- [A record through XRPC](${origin}/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self)

## Agents

- [MCP server](${origin}/mcp): tools resolve, get, list_records, backlinks, discover, lexicon and labels. Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`
- [Skill sheet](${origin}/skill.md): save it as a command with \`curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md\`
`;
}

export function skillMd(origin: string): string {
	return `---
name: atproto-md
description: Read any public AT Protocol data as raw JSON from one address. Resolve a handle or DID to its PDS, entryway and collections, read records from any collection on any PDS, fetch up to 25 records by at:// URI or web link in one call with the records they reference, find backlinks (likes, replies, quotes, follows), list every repo using a lexicon, fetch a lexicon schema, read a did:plc identity's PLC history, trace why an account does not resolve, export a repo as a CAR file, and call any XRPC query without resolving the account's PDS. Use whenever the user shares an at:// URI, a bsky.app link, a handle or DID, or a lexicon NSID.
---

# atproto-md

Every Atmosphere record, one address. Read-only, no auth. Base URL: ${origin}

## When to use this skill

- Read a record, a collection or a whole repo on any PDS, for Bluesky or any other lexicon
- Dereference an at:// URI or a web link to a record: Bluesky-style client links, explorer links, or any page with at-tags
- Read a post together with its parent, root and quoted post
- Find who liked, reposted, replied to, quoted or follows something
- Check the labels on a post or account, from Bluesky's moderation labeler or any others
- Find every repo using a lexicon, or fetch a lexicon's schema
- Resolve a handle or DID to its PDS and entryway, or date a PDS migration or handle change from the PLC log
- Find out why an account does not resolve or its records are missing: /did/trace shows each step, and /at://{actor} says whether the account is active
- Write code against an AT Protocol SDK that reads any account: set the service URL to ${origin}

For Bluesky threads, timelines, feeds and search, use the Bluesky AppView or bsky.md. atproto.md reads records from each account's own PDS.

## Use the MCP server when it is installed

If the atproto-md MCP server is connected (its tools are resolve, get, list_records, backlinks, discover, lexicon and labels, shown in Claude Code as mcp__atproto-md__*), call those tools instead of curl, unless the user has said to use HTTP. Each tool returns the same JSON as the matching route:

- resolve: /at://{actor} and /resolve, plus plc for /plc/* and did for /did/doc and /did/trace
- get: /get and single records
- list_records: /at://{actor}/{collection}
- backlinks, discover, lexicon and labels: the routes of the same name

Use HTTP for what no tool covers: /xrpc, /blob and /repo/car. Without the MCP server, use HTTP for everything.

## How to call it

Every data route returns one JSON object as application/json. Add \`?pretty\` to indent it.
Records are \`{uri, cid, value, blobs}\`. \`value\` is exactly what the PDS stores, and \`blobs\` lists direct getBlob URLs.
Errors are \`{"error": "...", "status": 404}\`.

Use the fewest calls: batch addresses into one /get, add \`expand\` for referenced records, and add \`hydrate\` to backlinks.

\`\`\`bash
# Identity, PDS, entryway and collections
curl ${origin}/resolve/bsky.app
curl ${origin}/at://bsky.app

# Records
curl "${origin}/at://bsky.app/app.bsky.feed.post?limit=5"
curl ${origin}/at://bsky.app/app.bsky.actor.profile/self

# Several records, with the records they reference
curl "${origin}/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&uri=at://bsky.app/app.bsky.actor.profile/self&expand"

# Why an account does not resolve, step by step
curl ${origin}/did/trace/bsky.app

# Any XRPC query, routed to the account's PDS
curl "${origin}/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self"

# Who replied to a post, as records
curl "${origin}/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j?source=app.bsky.feed.post:reply.parent.uri&hydrate"
\`\`\`

## Endpoint reference

\`\`\`
GET ${origin}/at://{actor}                                  {did, handle, pds, entryway, active, status, pdsSince, collections, didDoc}
GET ${origin}/at://{actor}/{collection}                     {did, handle, pds, entryway, collection, cursor, records}
GET ${origin}/at://{actor}/{collection}/{rkey}              {uri, cid, value, blobs}
GET ${origin}/get?uri={address}&uri=...                     {records, errors, expanded}, up to 25
GET ${origin}/resolve/{actor}                               same as /at://{actor}
GET ${origin}/did/doc/{actor}                               the DID document
GET ${origin}/did/trace/{actor}                             {did, handle, handleVerified, pds, entryway, ok, steps}
GET ${origin}/blob/{actor}/{cid}[/{params}]                 a blob, or a redirect to a resized copy
GET ${origin}/repo/car/{actor}                              the whole repo as a CAR file
GET ${origin}/plc/data/{actor}                              current PLC state
GET ${origin}/plc/audit/{actor}                             {did, operations}
GET ${origin}/plc/last/{actor}                              {did, operation}
GET ${origin}/discover/{collection}                         {collection, cursor, repos}
GET ${origin}/labels/{target}                               {target, labels, labelers}
GET ${origin}/labelers                                      {default, labelers}
GET ${origin}/lexicon/{nsid}                                {nsid, authority, did, uri, cid, schema}
GET ${origin}/backlinks/{target}                            {target, total, sources}
GET ${origin}/backlinks/{target}?source={collection:path}   {target, source, total, cursor, records}
GET ${origin}/xrpc/com.atproto.repo.*?repo={actor}&...      sent to the account's PDS
GET ${origin}/xrpc/com.atproto.sync.*?did={actor}&...       sent to the account's PDS: blobs, repo CAR files
GET ${origin}/xrpc/com.atproto.sync.*                       sent to the relay
GET ${origin}/xrpc/com.atproto.identity.*                   resolveHandle, resolveDid, resolveIdentity
GET ${origin}/xrpc/app.bsky.*                               sent to Bluesky's public app view
\`\`\`

- {actor} is a handle or DID. An {address} is an at:// record URI or a web link: Bluesky-style clients (bsky.app, deer.social, blacksky.community and others), explorers (pdsls.dev, atp.tools, atproto.at) or any page that publishes its AT URI with at-tags (at:canonical).
- Lists take limit, cursor and reverse (oldest first). cursor is null on the last page.
- labels works on every record route: labels attaches each record's labels, author its account's too, and labelers is all or handles and DIDs (Bluesky's moderation labeler by default).
- expand works on every record route. hydrate works on backlinks with source, 25 records at most.
- A batch reports a failed address in errors and still returns the rest.
- /xrpc passes each server's response on unchanged. Its errors are {"error", "message"}. Calls with an Authorization header and procedures are refused: send those to the account's own PDS.

## Install as a Claude Code command

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`
`;
}
