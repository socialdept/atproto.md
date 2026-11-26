# Repos and records

Part of the [atproto.md docs](../introduction.md#documentation). The `at://` URL structure, the resolution chain, repos, collections, single records and batches.

## URL structure

URLs take `at://` URIs directly in the path:

```
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post
GET /at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}
GET /at://alice.bsky.social/com.whtwnd.blog.entry
```

Handles and DIDs are both accepted as the authority segment. All of these routes are `GET` only. Every response is one JSON object, described in [Response format](../output.md).

## How it works

Every request follows this resolution chain:

```
handle → DID → DID document → #atproto_pds service endpoint → com.atproto.repo.*
```

A handle is resolved to a DID through `com.atproto.identity.resolveHandle` on `bsky.social`. `did:plc` documents come from [plc.directory](https://plc.directory), and `did:web` documents from the domain's `/.well-known/did.json`. Other DID methods are rejected.

Records are then fetched from the user's PDS with `com.atproto.repo.describeRepo`, `com.atproto.repo.listRecords` and `com.atproto.repo.getRecord`. This works for self-hosters, third-party PDS providers and any actor on the network, not just `bsky.social` users. Rate limits are the upstream PDS's.

## `GET /at://{actor}`

The actor's identity and repo in one response: `did`, `handle`, `pds`, `collections` and `didDoc`. The same as [`/resolve/{actor}`](identity.md).

## `GET /at://{actor}/{collection}`

The records in any collection, newest first, as `{did, handle, pds, collection, cursor, records}`. No knowledge of the lexicon is needed.

| Param     | Default | Max | Notes                                                        |
| --------- | ------- | --- | ------------------------------------------------------------ |
| `limit`   | 25      | 100 | Records per page                                             |
| `cursor`  |         |     | The `cursor` from the previous page. `null` on the last page |
| `reverse` |         |     | Oldest first                                                 |
| `expand`  |         |     | Also return the records these reference, under `expanded`   |

## `GET /at://{actor}/{collection}/{rkey}`

One record as `{uri, cid, value, blobs}`. Takes `expand`.

## `GET /get?uri={address}&uri={address}`

Up to 25 records in one call, fetched in parallel, as `{records, errors, expanded}`. Each address is an `at://` record URI or a bsky.app link to a post, feed, list or starter pack:

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&uri=at://bsky.app/app.bsky.actor.profile/self&expand"
```

Each actor is resolved once per call. An address that fails goes into `errors` as `{address, error}`, and the other records still come back. Takes `expand`.
