# XRPC

One service URL for the whole network: standard XRPC calls, each routed to the server that answers it, for Bluesky and for any other app.

Every account's data lives on its own PDS, so a client normally resolves a handle to a DID, reads the DID document, finds the PDS and only then makes its call. `/xrpc` does that for you. Set the service URL of any AT Protocol SDK or XRPC client to `https://atproto.md`, call methods as usual, and each call reaches the right server:

```ts
import { AtpAgent } from '@atproto/api';

const agent = new AtpAgent({ service: 'https://atproto.md' });
const { data } = await agent.com.atproto.repo.listRecords({ repo: 'bsky.app', collection: 'app.bsky.feed.post', limit: 5 });
```

The same works with curl:

```bash
curl "https://atproto.md/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self"
```

## Where each call goes

| Method                                                            | Answered by                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `com.atproto.identity.resolveHandle`, `resolveDid`, `resolveIdentity` | atproto.md itself, through the same [resolution chain](records.md#how-it-works) as every other route |
| `com.atproto.repo.*` with `repo`                                  | The account's PDS                                                              |
| `com.atproto.sync.*` with `did`                                   | The account's PDS                                                              |
| `com.atproto.label.queryLabels`                                   | The labeler named in `sources`, or Bluesky's moderation labeler. See [Labels](labels.md#through-xrpc) |
| Any other `com.atproto.sync.*`                                    | The public relay, `relay1.us-west.bsky.network`                                |
| `app.bsky.*`                                                      | Bluesky's public app view, `public.api.bsky.app`                               |
| Any other app's methods                                           | That app's app view, found as described in [Other apps](#other-apps)           |
| Any method, with an `atproto-proxy` header                        | The service the header names                                                   |

`repo` and `did` take a handle or a DID. A handle is resolved, and the PDS gets the DID, so `getBlob`, `getRepo` and the other sync methods work with a handle too. `resolveIdentity` returns `handle.invalid` when the handle in the DID document does not point back at the DID, as the [identity spec](https://atproto.com/specs/handle) asks.

## Other apps

Every app on the network can have its own app view, and its methods (`social.grain.*`, `place.stream.*` and the rest) go there. atproto.md finds it the way a client would, in this order:

1. **The `atproto-proxy` header.** The protocol's own way to name a service, as `did#service_id`, such as `did:web:grain.social#grain_appview`. atproto.md reads the service's address from that DID document. It works for any method, Bluesky's included.
2. **The app's own domain.** An app view publishes a `did:web` document on its domain. The first two segments of the method, reversed, name it: `social.grain.actor.getProfile` is `grain.social`. atproto.md reads `did:web:grain.social`, then `did:web:api.grain.social`, then the domain of the account that published the method's lexicon. It takes the service typed as an app view, past any PDS, labeler or feed generator, or the only other service listed.

When neither finds one, the call answers `501` with the domains that were tried, and a header names the service from then on. The service that answered comes back in an `X-Upstream-Service` header, ready to reuse as `atproto-proxy`.

```bash
curl "https://atproto.md/xrpc/social.grain.actor.getProfile?actor=grain.social"
curl -H "atproto-proxy: did:web:api.bsky.app#bsky_appview" "https://atproto.md/xrpc/app.bsky.actor.getProfile?actor=bsky.app"
```

When the method's [lexicon](network.md#get-lexiconnsid) is published, it also says whether the method is a query, sent with `GET`, or a procedure, sent with `POST`, and a call with the other verb is refused before it is forwarded.

Procedures are forwarded with their body and `Content-Type`, for app views that take public calls without signing in. Every `com.atproto` procedure is refused, since some of them write without signing in, such as `createAccount`.

## Responses

The upstream response is passed on unchanged: its status, its body and its `Content-Type`. An `X-Upstream-Host` header names the server that answered, and `X-Upstream-Kind` says what it is: `pds`, `relay`, `appview`, `labeler`, `proxy` (named by an `atproto-proxy` header), `discovered` (found from the app's domain) or `local` (answered by atproto.md). Cookies and other upstream headers are left behind.

- **Blobs and repos redirect:** `com.atproto.sync.getBlob` and `com.atproto.sync.getRepo` answer with a redirect to the account's PDS, which is built to stream files and whole repos. Clients that follow redirects, as SDKs and `curl -L` do, get the file from the PDS.
- **Caching:** responses are cached for 60 seconds, and redirects for 5 minutes. Errors are not cached.
- **Nothing runs as a page:** every response carries `Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`.
- **CORS:** every response allows any origin, and browsers may send `atproto-proxy`, `atproto-accept-labelers` and `Content-Type`, so browser apps can call it directly.
- **Headers passed on:** `Accept`, `Accept-Language`, `atproto-accept-labelers` and `Content-Type` go to the server that answers. Nothing else is forwarded.

Errors from atproto.md itself use the XRPC error shape, `{"error": "...", "message": "..."}`:

| Status | `error`                | When                                                    |
| ------ | ---------------------- | ------------------------------------------------------- |
| 400    | `InvalidRequest`       | The path is not a method name, or a required parameter is missing |
| 401    | `AuthNotSupported`     | The call carries an `Authorization` header              |
| 400    | `InvalidRequest`       | The `atproto-proxy` header is not `did#service_id`      |
| 404    | `NotFound`             | The handle or DID could not be resolved, or the DID has no such service |
| 405    | `MethodNotSupported`   | A `com.atproto` procedure, or a verb the method's lexicon does not take |
| 501    | `MethodNotImplemented` | No server is known for the method. The message names the domains tried |
| 502    | `UpstreamFailure`      | The server for the call could not be reached            |

## Public calls only

`/xrpc` forwards calls without authentication. A call that carries an `Authorization` header is refused before anything is forwarded, so no credential ever passes through atproto.md. Send signed-in calls and writes to the account's own PDS. OAuth tokens are bound to the server they are sent to, so they could not be relayed anyway.
