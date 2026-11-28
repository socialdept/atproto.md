# Contributing

Contributions are **welcome** and will be fully **credited**.

## Etiquette

This project is open source, and as such, the maintainers give their free time to build and maintain the source code held within. They make the code freely available in the hope that it will be of use to other developers. It would be extremely unfair for them to suffer abuse or anger for their hard work.

Please be considerate towards maintainers when raising issues or presenting pull requests. Let's show the world that developers are civilized and selfless people.

It's the duty of the maintainer to ensure that all submissions to the project are of sufficient quality to benefit the project. Many developers have different skillsets, strengths, and weaknesses. Respect the maintainer's decision, and do not be upset or abusive if your submission is not used.

## Viability

When requesting or submitting new features, first consider whether it might be useful to others. Open source projects are used by many developers, who may have entirely different needs to your own. Think about whether or not your feature is likely to be used by other users of the project.
## Procedure

### Before Filing an Issue

- Search existing issues to avoid duplicates
- Check the [documentation](https://socialde.pt/docs/atproto.md) to ensure it's not a usage question
- Provide a clear title and description
- Include the URL you requested and the response you got back
- For wrong or missing data, link the record and say what the PDS returns for it

### Before Submitting a Pull Request

- **Discuss non-trivial changes first** by opening an issue
- **Fork the repository** and create a feature branch from `main`
- **Follow all requirements** listed below
- **Write tests** for your changes
- **Update documentation** if behavior changes
- **Ensure all tests pass** with `npx vitest run`
- **Write clear commit messages** that explain what and why

## Requirements

- **Follow the editor config** - Tabs, single quotes, semicolons and a 140 character line width, from `.editorconfig` and `.prettierrc`. Most editors pick these up automatically.
- **Add tests** - Your patch won't be accepted if it doesn't have tests. Tests stub `fetch`, so they never reach the network. See `test/api.spec.ts`.
- **Records stay raw** - A record's `value` is returned exactly as the PDS stores it. Nothing is renamed, summarised or removed. Extra context goes next to `value`, never inside it.
- **One shape for HTTP and MCP** - Every route and tool returns the plain object built in `src/api.ts`, so the two never drift apart.
- **Document any change in behavior** - Make sure the `README.md`, the docs, the home page and the `/llms.txt` and `/skill.md` output are kept up-to-date.
- **Keep URLs and fields stable** - Agents and tools link to atproto.md paths and read its fields. Removing a path or a field, or changing what it holds, is a breaking change.
- **One pull request per feature** - If you want to do more than one thing, send multiple pull requests.
- **Send coherent history** - Make sure each individual commit in your pull request is meaningful. If you had to make multiple intermediate commits while developing, please [squash them](https://www.git-scm.com/book/en/v2/Git-Tools-Rewriting-History#Changing-Multiple-Commit-Messages) before submitting.

## How Changes Land

`main` is protected. Every change arrives by pull request, and direct pushes are
blocked.

- **Merges are squash-only, and the PR title becomes the permanent commit
  message on `main`.** Write it as one descriptive line. Individual commit
  messages are preserved in the body.
- No approval is required, but review threads must be resolved.

## Running Tests

```bash
npm install
npx vitest run
```

The tests run inside the Workers runtime through `@cloudflare/vitest-pool-workers`. `npm run test` runs the same suite in watch mode, and `npm run dev` serves the Worker at http://localhost:8787.

## How the code is laid out

A request goes through three layers:

1. `src/index.ts` (HTTP) and `src/mcp.ts` (MCP tools) read the parameters.
2. `src/api.ts` fetches the data and builds one plain object per route. This is where new data goes.
3. `src/output.ts` sends that object as JSON.

`/xrpc` is the one route outside these layers: `src/xrpc.ts` answers identity methods itself and passes every other call to the server that answers it, found by `src/services.ts` for apps other than Bluesky.

`src/refs.ts` parses addresses (at:// URIs, handles, DIDs, bsky.app links) and finds the record URIs and blobs inside a value. The upstream clients are `src/identity.ts` (handles, DIDs, PLC), `src/pds.ts`, `src/relay.ts`, `src/constellation.ts` and `src/lexicon.ts`.

## Adding an endpoint

1. Add a function to `src/api.ts` that returns a plain object. Throw `{status, message, upstream}` for errors.
2. Route it in `handleGet` in `src/index.ts`, and register a tool for it in `src/mcp.ts` only if it is not already covered by one.
3. Give the route a label in `classifyHttp` (`src/stats.ts`) and `ROUTE_LABELS` (`src/views.ts`) so it is counted.
4. Add tests to `test/api.spec.ts`, extending its fake network for any new upstream.
5. Document it in `docs/endpoints/`, the home page (`indexPage` in `src/views.ts` and `ROUTES` in `src/web/home/routes.ts`), and `src/llms.ts`.

## Project structure

```
src/
  index.ts              # Worker entry point and HTTP router
  mcp.ts                # MCP server and tools
  api.ts                # The data behind every route and tool
  output.ts             # Raw JSON responses
  refs.ts               # Address parsing, record references and blobs
  links.ts              # Web links to AT URIs: the client table and at-tags in pages
  identity.ts           # Handle, DID and PLC resolution
  trace.ts              # /did/trace: each resolution step, run and recorded
  labels.ts             # Labels, asked of each labeler directly
  labelers.ts           # The known labelers, chosen by hand. scripts/labelers.mjs lists candidates
  pds.ts                # PDS XRPC helper
  relay.ts              # Relay helper for /discover
  constellation.ts      # Constellation helper for /backlinks
  lexicon.ts            # DNS lexicon resolution for /lexicon
  xrpc.ts               # /xrpc: identity answers and routing to the PDS, relay or app view
  services.ts           # The service for other apps' methods: atproto-proxy, or the app view on the app's domain
  http.ts               # CORS headers and markdown responses for the docs pages
  views.ts              # Home page and /stats markdown, for agents
  html.ts               # HTML responses for browsers and crawlers, robots.txt, sitemap
  web/
    kit.ts              # Palette, escaping, icons and the stepped pixel frames
    chrome.ts           # Page head, header, footer and the shared scripts
    brand.ts            # Open Graph card, mark and favicon
    home/               # Home page: routes catalogue, entrance, styles, scripts
    stats/              # /stats page: stat components, chart script, styles
  og-glyphs.ts          # Generated by scripts/og-glyphs.mjs
  world-grid.ts         # Generated by scripts/world-grid.mjs
  llms.ts               # /llms.txt and /skill.md
  stats.ts              # Anonymous usage counters (StatsDO) for /stats
  types.ts              # Shared TypeScript interfaces

test/
  api.spec.ts           # Records, batches, expand, backlinks and output, against a fake network
  refs.spec.ts          # Address parsing, references and blobs
  index.spec.ts         # Routing, docs pages, stats and CORS
  lexicon.spec.ts       # NSID authority parsing
  views.spec.ts         # /stats markdown
  links.spec.ts         # Web links and at-tags
  web.spec.ts           # Page helpers: figures and parameter tables
  xrpc.spec.ts          # /xrpc routing, refusals and response headers
  services.spec.ts      # atproto-proxy, app view discovery and forwarded procedures
  trace.spec.ts         # Resolution traces and the did and repo namespaces
  labels.spec.ts        # Labels: choosing labelers, negation, records and XRPC
```

## Checking against real data

`npm run dev` serves the Worker at http://localhost:8787 against the live network. Compare a response with what the PDS returns for the same record:

```bash
curl "http://localhost:8787/at://bsky.app/app.bsky.actor.profile/self?pretty"
```
