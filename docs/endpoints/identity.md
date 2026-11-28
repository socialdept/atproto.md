# Identity

Resolving a handle or DID, the DID document, a trace of every resolution step, and a `did:plc` identity's PLC audit log, current data and last operation.

Every route here takes a handle or a DID. The `/plc` routes work only for `did:plc` identities. `did:web` identities have no PLC log, so they get a 400.

## `GET /resolve/{handle-or-did}`

The identity and repo in one response: `did`, `handle`, `pds`, `entryway`, `active`, `status`, `pdsSince`, `collections` and the full `didDoc`. `collections` is `null` when the PDS does not answer `describeRepo`.

`active` and `status` come from the PDS's `com.atproto.sync.getRepoStatus`. When `active` is `false`, `status` says why, such as `deactivated`, `takendown` or `suspended`, which explains an account whose records cannot be read. Both are `null` when the PDS does not answer. `pdsSince` is when the account moved to its current PDS, taken from the PLC log: the first operation that named this PDS after a different one, or the creation of the DID if it never moved. Nullified operations are skipped. It is `null` for `did:web` accounts.

`pds` is the PDS host from the DID document, the server that stores the repo and serves its records and blobs. `entryway` is the server that signs the account in and manages it, taken from the PDS's OAuth protected resource metadata, and is `null` when it is the PDS itself. The two differ for accounts on a fleet of PDS hosts behind one entryway: a Bluesky account lives on a host such as `https://puffball.us-east.host.bsky.network` with the entryway `https://bsky.social`. On a self-hosted PDS, or when the PDS does not publish the metadata, `entryway` is `null`.

## `GET /did/doc/{handle-or-did}`

The DID document exactly as it is published: from [plc.directory](https://plc.directory) for a `did:plc`, and from the domain's `/.well-known/did.json` for a `did:web`.

## `GET /did/trace/{handle-or-did}`

Every step of resolving the account, for working out why one does not resolve. atproto.md runs each step itself, without going through `bsky.social`, and returns `{did, handle, handleVerified, pds, ok, steps}`. Each step is `{step, request, ok, ms, status, result, error}`, with what was asked, what came back and how long it took:

| Step              | What it checks                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `handle-dns`      | The `_atproto.{handle}` TXT record, through DNS over HTTPS. It must hold exactly one `did=` value   |
| `handle-http`     | `https://{handle}/.well-known/atproto-did`, which must answer with the DID as plain text            |
| `handle-agree`    | Present only when DNS and HTTPS name different DIDs                                                |
| `did-document`    | The DID document fetch, and that the document is for the same DID                                   |
| `handle-document` | Present only when the DID document names a different handle, or none                               |
| `pds`             | The PDS's `getRepoStatus` for the DID, which fails when the PDS does not host the repo or it is not active |

A handle needs only one of the two lookups to work, so a failed `handle-http` beside a working `handle-dns` is normal. `handleVerified` is `true` when the handle resolves to the DID and the DID document names the handle back. `ok` is `true` when the handle is verified, the DID document loads and the PDS has the repo active. For a DID, the document is fetched first, then the handle it names is checked back.

## `GET /plc/audit/{handle-or-did}`

The full operation log of a `did:plc` identity from [plc.directory](https://plc.directory), as `{did, operations}`. Each operation is returned as plc.directory serves it, with its `createdAt`, `cid` and `nullified` flag, so PDS migrations, handle changes and key rotations can be dated from the services, `alsoKnownAs` and keys of consecutive operations.

## `GET /plc/data/{handle-or-did}`

The current canonical PLC state as plc.directory serves it: the services (including the active PDS), all handles, the verification methods and the rotation keys in priority order. Unlike `/resolve`, which shows the DID document, this exposes the rotation keys that control the identity.

## `GET /plc/last/{handle-or-did}`

The most recent PLC operation, as `{did, operation}`.
