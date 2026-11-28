# Response format

What every data route returns.

## One JSON object per response

Every data route returns a single JSON object as `application/json`, the same object the matching MCP tool returns:

```json
{"uri":"at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.actor.profile/self","cid":"bafy...","value":{...}}
```

Add `?pretty` to indent the JSON. It is compact by default, which keeps responses small for agents. `?format=json`, from older links, is still accepted and changes nothing.

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

## Files and XRPC responses

[`/repo/car`](endpoints/records.md#get-repocaractor) returns a CAR file download in place of JSON. [`/xrpc`](endpoints/xrpc.md) is the other exception: it passes each server's response on unchanged, in that server's own format, and its errors use the XRPC shape `{"error", "message"}`.

## Pages for reading

The home page, `/llms.txt`, `/skill.md` and `/stats` describe the API for people and agents. Browsers get HTML for the home page and `/stats`, and everything else gets markdown.
