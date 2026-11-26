# Network

Part of the [atproto.md docs](../introduction.md#documentation). Discovering repos by collection, backlinks through Constellation, and lexicon resolution through DNS.

These routes answer questions a single PDS can't, so they go past the [resolution chain](records.md#how-it-works) to network-wide sources. None of them use authentication, since every source serves public data.

## `GET /discover/{collection}`

Discovers every repo on the network with records in a collection, which finds all users of a lexicon, for example `/discover/site.standard.document`. It calls `com.atproto.sync.listReposByCollection` on the public relay `relay1.us-west.bsky.network`. It returns `{collection, cursor, repos}`, where `repos` is a list of DIDs.

| Param    | Default | Max  | Notes                                    |
| -------- | ------- | ---- | ---------------------------------------- |
| `limit`  | 100     | 2000 | Repos per page                           |
| `cursor` |         |      | Pagination cursor from previous response |

## `GET /backlinks/{at-uri-or-did-or-url}`

Finds records across the network that link to a target: likes, reposts, replies, follows, quotes, or any custom lexicon. The index is [Constellation](https://constellation.microcosm.blue) by microcosm.blue, a backlink index of the whole firehose.

Without `source`, it returns `{target, total, sources}`: every link source as a `collection:path` string with its record and distinct account counts, from Constellation's `links/all`. With `source`, it returns `{target, source, total, cursor, records}`, where `records` lists the linking record URIs, through `blue.microcosm.links.getBacklinks`. Add `hydrate` and `records` holds the records themselves, so one call answers who liked or replied to something.

| Param    | Default | Max | Notes                                                                                         |
| -------- | ------- | --- | --------------------------------------------------------------------------------------------- |
| `source` |         |     | A `{collection:path}` selector (`app.bsky.feed.like:subject.uri`, for one) to list linking records |
| `limit`  | 50      | 100 | Linking records per page, used only with `source`. At most 25 with `hydrate`                  |
| `cursor` |         |     | Pagination cursor from previous response, used only with `source`                             |
| `hydrate`|         |     | Return the linking records in place of their URIs, used only with `source`                    |

```bash
curl "https://atproto.md/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j?source=app.bsky.feed.post:reply.parent.uri&hydrate"
```

## `GET /lexicon/{nsid}`

Resolves a lexicon schema by its NSID with [DNS-based lexicon resolution](https://atproto.com/specs/lexicon). The NSID's authority is its segments minus the name, reversed, so `app.bsky.feed.post` has the authority `feed.bsky.app`. A DNS-over-HTTPS lookup through Cloudflare finds the `_lexicon.{authority}` TXT record, which points at a DID. That DID's repo holds the schema at `com.atproto.lexicon.schema/{nsid}`. There is no central registry.

It returns `{nsid, authority, did, uri, cid, schema}`, where `schema` is the full schema record, for example `/lexicon/app.bsky.feed.post`.
