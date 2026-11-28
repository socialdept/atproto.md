# Repos and records

The `at://` URL structure, the resolution chain, repos, collections, single records, batches, blobs and CAR exports.

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

The actor's identity and repo in one response: `did`, `handle`, `pds`, `entryway`, `active`, `status`, `pdsSince`, `collections` and `didDoc`. The same as [`/resolve/{actor}`](identity.md#get-resolvehandle-or-did), which explains each field.

## `GET /at://{actor}/{collection}`

The records in any collection, newest first, as `{did, handle, pds, entryway, collection, cursor, records}`. No knowledge of the lexicon is needed.

| Param     | Default | Max | Notes                                                        |
| --------- | ------- | --- | ------------------------------------------------------------ |
| `limit`   | 25      | 100 | Records per page                                             |
| `cursor`  |         |     | The `cursor` from the previous page. `null` on the last page |
| `reverse` |         |     | Oldest first                                                 |
| `expand`  |         |     | Also return the records these reference, under `expanded`   |

## `GET /at://{actor}/{collection}/{rkey}`

One record as `{uri, cid, value, blobs}`. Takes `expand`.

## `GET /get?uri={address}&uri={address}`

Up to 25 records in one call, fetched in parallel, as `{records, errors, expanded}`. Each address is an `at://` record URI or a web link to the record (see [Links](#links)):

```bash
curl "https://atproto.md/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&uri=at://bsky.app/app.bsky.actor.profile/self&expand"
```

Each actor is resolved once per call. An address that fails goes into `errors` as `{address, error}`, and the other records still come back. Takes `expand`.

## `GET /blob/{actor}/{cid}`

A blob (an image, video or other file) as its account uploaded it, with its own `Content-Type`. It is served the way [`/xrpc`](xrpc.md) serves `com.atproto.sync.getBlob`: cached for a day, since a CID never changes, and sandboxed, so a file never runs as a page on atproto.md. Errors use the XRPC shape.

Add transform options after the CID and the response is a redirect to the [co/infra image CDN](https://github.com/co-infra/co-infra-img), which resizes, crops and reformats the image and caches the result. The options are the CDN's own, comma separated, including presets such as `p=avatar`, `p=thumb` and `p=card`:

```bash
curl -L https://atproto.md/blob/bsky.app/bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3gddbfjsieiv7wuka/p=avatar
```

The handle is resolved to its DID before the redirect, so the CDN address works on its own afterwards.

## `GET /repo/car/{actor}`

The account's whole repo as a CAR file, streamed from its PDS through `com.atproto.sync.getRepo`, as a download named after the DID. Use it for backups and indexing. The PDS's own rate limits apply, and a large repo takes a while.

```bash
curl -o repo.car https://atproto.md/repo/car/bsky.app
```

## Links

Anywhere an address is taken (`/get`, `/resolve`, the MCP tools), a web link works in place of an `at://` URI. A link also works straight after the address, like an `at://` URI, and returns the account, collection or record it shows:

```bash
curl "https://atproto.md/https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d"
```

atproto.md turns a link into the AT URI it shows, in this order:

1. **Known client layouts.** Bluesky-style clients share `/profile/{actor}`, `/profile/{actor}/post/{rkey}`, `/feed/`, `/lists/` and `/starter-pack/`: bsky.app, deer.social, blacksky.community, witchsky.app, northsky.app, mu.social, impro.social, reddwarf.app, lea.ac and anisota.net. Explorers carry the AT URI in the path: pdsls.dev, atp.tools, bluepy.social, atproto.at (`/uri/at://...`) and aturi.to. A few apps have their own layouts: margin.at, grain.social, standard-reader.app, unthread.at and pinkleap.app, and profile pages on leaflet.pub, tangled.org, semble.so, stream.place, popfeed.social, sifa.id and blento.app.
2. **The page itself.** Any other link is fetched, and its `<head>` is read for the AT URI it publishes: an [at-tags](https://tangled.org/chrisshank.me/at-tags) `<meta name="at:canonical">` first, then any `<link href="at://...">` (standard.site publications and documents use one), then `at:me` for the account the site belongs to. The page is read up to its `</head>`, for at most 4 seconds.

A link to a path that is not a known layout is never guessed as the profile. If neither step finds an AT URI, the response is a 400 that says what is supported.

The client list follows the reverse parsers in [@aturi.to/waypoints](https://github.com/atpota-to/aturi).
