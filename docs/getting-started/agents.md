# Agents

Part of the [atproto.md docs](../introduction.md#documentation). The MCP server, the skill sheet for Claude Code, and `llms.txt`.

## MCP server

`/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server over Streamable HTTP, so it accepts both `GET` and `POST`. Install it in Claude Code:

```bash
claude mcp add --transport http atproto-md https://atproto.md/mcp
```

It exposes ten tools, each backed by the same code as an HTTP endpoint:

| Tool                           | Endpoint                                               |
| ------------------------------ | ------------------------------------------------------ |
| `resolve_identity`             | [`/resolve/{handle-or-did}`](../endpoints/identity.md) |
| `get_repo`                     | [`/at://{actor}`](../endpoints/records.md)             |
| `list_records`                 | [`/at://{actor}/{collection}`](../endpoints/records.md) |
| `get_record`                   | [`/at://{actor}/{collection}/{rkey}`](../endpoints/records.md) |
| `get_lexicon`                  | [`/lexicon/{nsid}`](../endpoints/network.md)           |
| `discover_repos_by_collection` | [`/discover/{collection}`](../endpoints/network.md)    |
| `get_backlinks`                | [`/backlinks/{target}`](../endpoints/network.md)       |
| `plc_audit`                    | [`/plc/audit/{handle-or-did}`](../endpoints/identity.md) |
| `plc_data`                     | [`/plc/data/{handle-or-did}`](../endpoints/identity.md) |
| `plc_last`                     | [`/plc/last/{handle-or-did}`](../endpoints/identity.md) |

## Skill sheet

`GET /skill.md` returns a full agent skill sheet with usage triggers, examples and an endpoint reference. Save it as a Claude Code slash command, invoked with `/atproto`:

```bash
curl -s https://atproto.md/skill.md > ~/.claude/commands/atproto.md
```

## llms.txt

`GET /llms.txt` returns a structured API summary following the [llms.txt convention](https://llmstxt.org/), for agents that discover APIs that way.

## The home page

`GET /` is the API reference. Browsers and link-card crawlers get HTML, and everything else, such as `curl`, gets markdown.
