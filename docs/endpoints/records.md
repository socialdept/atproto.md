# Repos and records

Part of the [atproto.md docs](../introduction.md#documentation). The `at://` URL structure, the resolution chain, repos, collections and single records.

## URL structure

URLs take `at://` URIs directly in the path:

```
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}
GET /at://alice.bsky.social/com.whtwnd.blog.entry
```

Handles and DIDs are both accepted as the authority segment. All of these routes are `GET` only.

## How it works

Every request follows this resolution chain:

```
handle → DID → DID document → #atproto_pds service endpoint → com.atproto.repo.*
```

A handle is resolved to a DID through `com.atproto.identity.resolveHandle` on `bsky.social`. `did:plc` documents come from [plc.directory](https://plc.directory), and `did:web` documents from the domain's `/.well-known/did.json`. Other DID methods are rejected.

Records are then fetched from the user's PDS with `com.atproto.repo.describeRepo`, `com.atproto.repo.listRecords` and `com.atproto.repo.getRecord`. This works for self-hosters, third-party PDS providers and any actor on the network, not just `bsky.social` users. Rate limits are the upstream PDS's.

## `GET /at://{actor}`

Lists every collection in the actor's repo, each linked to its records.

## `GET /at://{actor}/{collection}`

Lists the records in any collection. No knowledge of the lexicon is needed. Collection types without a [formatter](../formatting.md) are rendered as generic key-value markdown.

| Param     | Default | Max | Notes                                    |
| --------- | ------- | --- | ---------------------------------------- |
| `limit`   | 25      | 100 | Records per page                         |
| `cursor`  |         |     | Pagination cursor from previous response |
| `reverse` | `false` |     | Set to `true` for oldest-first ordering  |

## `GET /at://{actor}/{collection}/{rkey}`

Fetches a single record by its rkey.
