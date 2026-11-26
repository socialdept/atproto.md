# Identity

Part of the [atproto.md docs](../introduction.md#documentation). Resolving a handle or DID, and a `did:plc` identity's PLC audit log, current data and last operation.

Every route here takes a handle or a DID. The `/plc` routes work only for `did:plc` identities. `did:web` identities have no PLC log, so they get a 400.

## `GET /resolve/{handle-or-did}`

The identity and repo in one response: `did`, `handle`, `pds`, `collections` and the full `didDoc`. `collections` is `null` when the PDS does not answer `describeRepo`.

## `GET /plc/audit/{handle-or-did}`

The full operation log of a `did:plc` identity from [plc.directory](https://plc.directory), as `{did, operations}`. Each operation is returned as plc.directory serves it, with its `createdAt`, `cid` and `nullified` flag, so PDS migrations, handle changes and key rotations can be dated from the services, `alsoKnownAs` and keys of consecutive operations.

## `GET /plc/data/{handle-or-did}`

The current canonical PLC state as plc.directory serves it: the services (including the active PDS), all handles, the verification methods and the rotation keys in priority order. Unlike `/resolve`, which shows the DID document, this exposes the rotation keys that control the identity.

## `GET /plc/last/{handle-or-did}`

The most recent PLC operation, as `{did, operation}`.
