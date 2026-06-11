# atproto.md

A read-only, markdown-first API for the AT Protocol ecosystem, built for LLM agents and tools that consume plain text.

Accepts `at://` URIs directly in the URL path and returns structured markdown — fetched from the user's actual PDS, not a Bluesky-specific AppView. Works with any collection on any PDS. Also goes network-wide: discover every repo using a given lexicon, and explore the backlinks pointing at any record, identity, or URL.

---

## URL structure

URLs accept `at://` URIs directly:

```
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}
GET /at://alice.bsky.social/com.whtwnd.blog.entry
```

Handles and DIDs are both accepted as the authority segment.

---

## Endpoints

### `GET /`
API reference in markdown.

### `GET /llms.txt`
Structured API summary following the [llms.txt convention](https://llmstxt.org/) for LLM agent discovery.

### `GET /mcp` (POST)
Model Context Protocol server endpoint. Install in Claude Code:

```bash
claude mcp add --transport http atproto-md https://atproto.md/mcp
```

Exposes six tools: `resolve_identity`, `get_repo`, `list_records`, `get_record`, `discover_repos_by_collection`, `get_backlinks`.

### `GET /skill.md`
Full agent skill sheet with usage triggers, examples, and endpoint reference. Save it as a Claude Code slash command (invoke with `/atproto`):

```bash
curl -s https://atproto.md/skill.md > ~/.claude/commands/atproto.md
```

### `GET /resolve/{handle-or-did}`
Resolves the full identity chain for an actor: handle → DID → DID document → PDS endpoint. Useful for debugging identity issues or understanding where a user's data lives.

### `GET /at://{actor}`
Lists all collections present in the actor's repo.

### `GET /at://{actor}/{collection}`
Lists records in any collection. No prior knowledge of the lexicon required — unknown collection types are rendered as generic key-value markdown.

| Param     | Default | Max | Notes                                    |
| --------- | ------- | --- | ---------------------------------------- |
| `limit`   | 25      | 100 | Records per page                         |
| `cursor`  | —       | —   | Pagination cursor from previous response |
| `reverse` | `false` | —   | Set to `true` for oldest-first ordering  |

### `GET /at://{actor}/{collection}/{rkey}`
Fetches a single record by its rkey.

### `GET /discover/{collection}`
Discovers every repo on the network with records in a collection — find all users of a lexicon, e.g. `/discover/site.standard.document`. Network-wide, via the relay's `com.atproto.sync.listReposByCollection`. Each result links straight into that repo's records for the collection.

| Param    | Default | Max  | Notes                                    |
| -------- | ------- | ---- | ---------------------------------------- |
| `limit`  | 100     | 2000 | Repos per page                           |
| `cursor` | —       | —    | Pagination cursor from previous response |

### `GET /backlinks/{at-uri-or-did-or-url}`
Finds records across the network that link to a target — likes, reposts, replies, follows, quotes, or any custom lexicon. Without `source`, returns a summary table of every link source with record and distinct-DID counts. Indexed by [Constellation](https://constellation.microcosm.blue) (microcosm.blue).

| Param    | Default | Max | Notes                                                                                         |
| -------- | ------- | --- | --------------------------------------------------------------------------------------------- |
| `source` | —       | —   | A `{collection:path}` selector (e.g. `app.bsky.feed.like:subject.uri`) to list linking records |
| `limit`  | 50      | 100 | Linking records per page                                                                      |
| `cursor` | —       | —   | Pagination cursor from previous response                                                      |

---

## How it works

Every request follows this resolution chain:

```
handle → DID → DID document → #atproto_pds service endpoint → com.atproto.repo.*
```

Data is fetched directly from the user's PDS via `com.atproto.repo.listRecords` and `com.atproto.repo.getRecord`. This means it works for self-hosters, third-party PDS providers, and any actor on the network — not just `bsky.social` users.

Supports `did:plc` (resolved via [plc.directory](https://plc.directory)) and `did:web`.

### Network-wide routes

`/discover` and `/backlinks` answer questions a single PDS can't, so they reach past the resolution chain to network-wide indexes:

- **`/discover/{collection}`** queries a public relay's `com.atproto.sync.listReposByCollection` to enumerate every DID with records in a collection. Results link back into per-PDS `/at://` views.
- **`/backlinks/{target}`** queries [Constellation](https://constellation.microcosm.blue) (microcosm.blue), a firehose-wide backlink index, for the records that link to a given at-uri, DID, or URL. Both the summary (`links/all`) and the per-source record list (`blue.microcosm.links.getBacklinks`) are exposed.

No authentication is used for either — both indexes serve public data.

---

## Record formatting

Known collection types get structured rendering. Everything else falls back to a generic key-value markdown representation, so no collection is unreadable.

| Collection                                                  | Rendering                          |
| ----------------------------------------------------------- | ---------------------------------- |
| `app.bsky.feed.post`                                        | Text, embeds, reply context        |
| `app.bsky.actor.profile`                                    | Display name, bio                  |
| `app.bsky.graph.follow` / `block` / `list` / `listitem`    | Subjects, timestamps               |
| `app.bsky.feed.like` / `repost` / `generator`              | Subjects, timestamps               |
| `app.bsky.labeler.service`                                  | Label policies                     |
| `site.standard.publication`                                 | Name, URL, description             |
| `site.standard.document`                                    | Title, content, published date     |
| `pub.leaflet.publication` / `document`                      | Name, URL, content from pages      |
| `app.offprint.publication` / `document.article`             | References to standard records     |
| `blog.pckt.publication`                                     | Reference to standard record       |
| `link.woosh.linkPage`                                       | Description, labeled link sections |
| `blue.linkat.entry`                                         | Title, URL, description            |
| `events.smokesignal.calendar.event`                         | Name, dates, location              |
| *Any other collection*                                      | Generic key-value markdown         |

### Adding a new formatter

1. Create `src/formatters/{nsid.namespace}.ts`
2. Import `register` from `./registry` and call it with your collection NSID(s)
3. Add one import line to `src/formatters/index.ts`
4. Add a matching test in `test/formatters/{nsid.namespace}.spec.ts`

See any existing formatter file for the pattern — e.g. `src/formatters/blue.linkat.ts`.

---

## Deployment

Built as a Cloudflare Worker.

```bash
npm install
npm run dev      # local dev via wrangler
npm run test     # run tests
npm run deploy   # deploy to Cloudflare
```

---

## Notes

- **Public data only.** No authentication is supported or planned. Private records on a PDS will not be accessible.
- **Rate limits** follow the upstream PDS. If you expect significant traffic, add Cloudflare KV-backed rate limiting per IP.
- **Caching** is set to `Cache-Control: public, max-age=60`. Adjust per endpoint if needed.

---

## Related

- [pds.ls](https://pds.ls) — AT Protocol repo explorer (same URL convention)
- [bsky.md](https://bsky.md) — Bluesky-specific markdown API
- [plc.directory](https://plc.directory) — DID PLC method registry
