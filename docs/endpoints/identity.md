# Identity

Part of the [atproto.md docs](../introduction.md#documentation). Resolving a handle or DID, and a `did:plc` identity's PLC audit log, current data and last operation.

Every route here takes a handle or a DID. The `/plc` routes work only for `did:plc` identities. `did:web` identities have no PLC log, so they get a 400.

## `GET /resolve/{handle-or-did}`

Resolves the full identity chain for an actor: handle, DID, DID document and PDS endpoint. Useful for debugging identity issues or finding where a user's data lives.

## `GET /plc/audit/{handle-or-did}`

The chronological history of a `did:plc` identity from [plc.directory](https://plc.directory), each operation diffed against the previous one: PDS migrations (from and to host, and the date), handle changes, and signing and rotation key changes. Useful for dating a migration or checking provenance.

## `GET /plc/data/{handle-or-did}`

The current canonical PLC state: the active PDS, all handles, the atproto signing key, and the rotation keys in priority order. Unlike `/resolve`, which shows the DID document, this exposes the rotation keys that actually control the identity.

## `GET /plc/last/{handle-or-did}`

The most recent PLC operation and the state it established.
