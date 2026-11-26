# Agents

Part of the [atproto.md docs](../introduction.md#documentation). The MCP server, the skill sheet for Claude Code, and `llms.txt`.

## MCP server

`/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server over Streamable HTTP, so it accepts both `GET` and `POST`. Install it in Claude Code:

```bash
claude mcp add --transport http atproto-md https://atproto.md/mcp
```

It exposes six tools, each backed by the same code as an HTTP endpoint. Every result is the same JSON object the endpoint returns, and a failed call returns `{"error", "status"}` flagged as an error.

| Tool           | What it does                                                                                     | Endpoint                                                        |
| -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `resolve`      | Identity, PDS, DID document and collections. `plc` returns the PLC data, audit log or last op     | [`/resolve`, `/plc/*`](../endpoints/identity.md)                |
| `get`          | Up to 25 records by `at://` URI or bsky.app link, with `expand` for referenced records           | [`/get`](../endpoints/records.md)                               |
| `list_records` | Records in a collection, paginated, with `expand`                                                | [`/at://{actor}/{collection}`](../endpoints/records.md)         |
| `backlinks`    | Link sources and counts, or with `source` the linking records, hydrated on request               | [`/backlinks/{target}`](../endpoints/network.md)                |
| `discover`     | Every repo with records in a collection                                                          | [`/discover/{collection}`](../endpoints/network.md)             |
| `lexicon`      | The published Lexicon schema for an NSID                                                         | [`/lexicon/{nsid}`](../endpoints/network.md)                    |

## Skill sheet

`GET /skill.md` returns a full agent skill sheet with usage triggers, examples and an endpoint reference. Save it as a Claude Code slash command, invoked with `/atproto`:

```bash
curl -s https://atproto.md/skill.md > ~/.claude/commands/atproto.md
```

## llms.txt

`GET /llms.txt` returns a structured API summary following the [llms.txt convention](https://llmstxt.org/), for agents that discover APIs that way.

## The home page

`GET /` is the API reference. Browsers and link-card crawlers get HTML, and everything else, such as `curl`, gets markdown. The data routes return JSON, described in [Response format](../output.md).
