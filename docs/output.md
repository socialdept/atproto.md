# Response format

Part of the [atproto.md docs](introduction.md#documentation). What every data route returns, and how to ask for bare JSON.

## One JSON object per response

Every data route returns a single JSON object. By default it comes inside a fenced `json` code block with `Content-Type: text/markdown`, so the body is still markdown:

````
```json
{"uri":"at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.actor.profile/self","cid":"bafy...","value":{...}}
```
````

Two ways to get the JSON without the fence, served as `application/json`:

- add `?format=json` to the URL
- send `Accept: application/json`

Add `?pretty` to indent the JSON. It is compact by default, which keeps responses small for agents.

## Records are raw

A record is `{uri, cid, value}`, where `value` is exactly what the PDS stores: every field, including `$type`, facets, embeds, `langs` and reply refs. Nothing is renamed, summarised or left out.

When a record holds blobs (avatars, banners, images, video), a `blobs` array lists a direct `com.atproto.sync.getBlob` URL for each one on the account's PDS, so fetching an image takes no extra lookup.

## Referenced records

`?expand` on any record route also fetches the records the results reference: reply parents and roots, quoted posts, the subject of a like or repost, list and feed URIs. They come back under `expanded`, keyed by URI, one level deep and at most 25 per call. A reference that cannot be fetched holds `{"error": "..."}` in place of the record.

## Errors

Errors use the same format, with the HTTP status repeated in the body:

```json
{"error":"Could not locate record","status":400}
```

## Pages that stay markdown

The home page, `/llms.txt`, `/skill.md` and `/stats` are documentation for people and agents, so they stay markdown. Browsers get HTML for the home page and `/stats`.
