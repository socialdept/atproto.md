# Record formatting

Part of the [atproto.md docs](introduction.md#documentation). The collections with a dedicated formatter, and how to add one.

Known collection types get structured rendering. Everything else falls back to a generic key-value markdown representation, so no collection is unreadable.

| Collection                                             | Rendering                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| `app.bsky.feed.post`                                   | Date, text, reply context, link and image embeds                |
| `app.bsky.feed.like` / `repost`                        | Subject, timestamp                                              |
| `app.bsky.feed.generator`                              | Name, DID, date, description                                    |
| `app.bsky.actor.profile`                               | Display name, bio                                               |
| `app.bsky.graph.follow` / `block` / `listitem`         | Subject, list for list items, timestamp                         |
| `app.bsky.graph.list`                                  | Name, purpose, description                                      |
| `app.bsky.labeler.service`                             | Date, label values, description                                 |
| `com.atproto.lexicon.schema`                           | Definitions, full schema JSON                                   |
| `site.standard.publication`                            | Name, URL, description, icon, labels, locale                    |
| `site.standard.document`                               | Title, dates, tags, labels, cover image, contributors, content  |
| `pub.leaflet.publication`                              | Name, URL                                                       |
| `pub.leaflet.document`                                 | Title, date, description, publication, text from pages          |
| `app.offprint.publication` / `document.article`        | References to standard records                                  |
| `blog.pckt.publication`                                | Reference to standard record                                    |
| `link.woosh.linkPage`                                  | Description, labeled link sections                              |
| `blue.linkat.entry`                                    | Title, URL, description                                         |
| `events.smokesignal.calendar.event`                    | Name, dates, location                                           |
| `place.wisp.fs`                                        | Site, file count, date, file tree                               |
| *Any other collection*                                 | Generic key-value markdown                                      |

## Adding a formatter

1. Create `src/formatters/{nsid.namespace}.ts`.
2. Import `register` from `./registry` and call it with your collection NSIDs.
3. Add one import line to `src/formatters/index.ts`.
4. Add a matching test in `test/formatters/{nsid.namespace}.spec.ts`.
5. Add the NSIDs to `expectedCollections` in `test/formatters/registry.spec.ts`.

See any existing formatter for the pattern, such as `src/formatters/blue.linkat.ts`. [CONTRIBUTING](../CONTRIBUTING.md) walks through each step with code and lists the formatter conventions.
