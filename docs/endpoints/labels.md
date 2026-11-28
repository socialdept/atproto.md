# Labels

Labels are short values, such as `porn`, `spam` or `bluesky-elder`, that a labeler attaches to a record or an account. Each labeler is an account with its own service, and atproto.md asks each one directly with `com.atproto.label.queryLabels`, at the address its DID document gives.

## Choosing labelers

Every labels lookup takes a `labelers` parameter:

| Value                              | Labelers asked                                                        |
| ---------------------------------- | --------------------------------------------------------------------- |
| Left out                           | Bluesky's moderation labeler, `moderation.bsky.app`                   |
| `all`                              | Every labeler in the [known list](#get-labelers)                      |
| `skywatch.blue,moderation.bsky.app` | The labelers named, by handle or DID, in or out of the list, mixed freely |

The labelers are asked in parallel, with 3 seconds each. A labeler that fails or does not answer in time is reported in `labelers` with its reason, and the labels from the rest still come back.

Only the labels in force are returned. For each labeler, subject and value, the latest label wins, so a label that was later negated is left out, and so is one past its expiry.

## `GET /labels/{target}`

The labels on a record or an account. The target is an `at://` record URI, a handle, a DID, or a web link to a post or profile, as everywhere else. A handle or link to a profile names the account, and its DID is the subject.

It returns `{target, labels, labelers}`. Each label is `{val, uri, cid, cts, exp, labeler}`, where `labeler` holds the labeler's DID and handle. `labelers` lists each labeler asked as `{did, handle, ok, error}`.

| Param      | Default | Notes                                                                       |
| ---------- | ------- | --------------------------------------------------------------------------- |
| `labelers` |         | `all`, or handles and DIDs separated by commas. Bluesky's moderation labeler when left out |
| `author`   |         | For a record, also return the labels on its account, under `authorLabels`   |

```bash
curl "https://atproto.md/labels/bsky.app?labelers=all"
```

## Labels on records

The record routes, `/at://{actor}/{collection}`, `/at://{actor}/{collection}/{rkey}` and `/get`, take the same options:

| Param      | Notes                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `labels`   | Attach each record's labels, under `labels`                                                    |
| `author`   | Also attach the labels on each record's account, under `authorLabels`. Implies `labels`       |
| `labelers` | Which labelers to ask, as above                                                                |

The response gains a `labelers` list. However many records a call returns, each labeler is asked once for all of them.

## `GET /labelers`

The known labelers that `all` asks, as `{default, labelers}`, each `{did, handle, name}`. The list is built by `npm run labelers` from every `app.bsky.labeler.service` record on the network, ranked by likes, and reviewed before it is committed.

## Through XRPC

[`/xrpc/com.atproto.label.queryLabels`](xrpc.md) goes to the labeler named in `sources`, by handle or DID, and to Bluesky's moderation labeler when `sources` is left out. It takes one labeler. `/labels/{target}` asks several at once.
