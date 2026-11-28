# XRPC

One service URL for the whole network: standard XRPC queries, each routed to the server that answers it.

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

`repo` and `did` take a handle or a DID. A handle is resolved, and the PDS gets the DID, so `getBlob`, `getRepo` and the other sync methods work with a handle too. `resolveIdentity` returns `handle.invalid` when the handle in the DID document does not point back at the DID, as the [identity spec](https://atproto.com/specs/handle) asks.

Any other method answers `501` with `MethodNotImplemented`.

## Responses

The upstream response is passed on unchanged: its status, its body and its `Content-Type`. An `X-Upstream-Host` header names the server that answered. Cookies and other upstream headers are left behind.

- **Blobs and repos redirect:** `com.atproto.sync.getBlob` and `com.atproto.sync.getRepo` answer with a redirect to the account's PDS, which is built to stream files and whole repos. Clients that follow redirects, as SDKs and `curl -L` do, get the file from the PDS.
- **Caching:** responses are cached for 60 seconds, and redirects for 5 minutes. Errors are not cached.
- **Nothing runs as a page:** every response carries `Content-Security-Policy: default-src 'none'; sandbox` and `X-Content-Type-Options: nosniff`.
- **CORS:** every response allows any origin, so browser apps can call it directly.

Errors from atproto.md itself use the XRPC error shape, `{"error": "...", "message": "..."}`:

| Status | `error`                | When                                                    |
| ------ | ---------------------- | ------------------------------------------------------- |
| 400    | `InvalidRequest`       | The path is not a method name, or a required parameter is missing |
| 401    | `AuthNotSupported`     | The call carries an `Authorization` header              |
| 404    | `NotFound`             | The handle or DID could not be resolved                 |
| 405    | `MethodNotSupported`   | The call is a procedure, sent with `POST`               |
| 501    | `MethodNotImplemented` | No server is known for the method                       |
| 502    | `UpstreamFailure`      | The server for the call could not be reached            |

## Public reads only

`/xrpc` serves queries without authentication. A call that carries an `Authorization` header is refused before anything is forwarded, so no credential ever passes through atproto.md, and procedures such as `createRecord` are refused too. Send signed-in calls and writes to the account's own PDS. OAuth tokens are bound to the server they are sent to, so they could not be relayed anyway.
