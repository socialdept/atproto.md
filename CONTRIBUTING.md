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
- Include the URL you requested and the Markdown you got back
- For a missing or wrong formatter, name the collection NSID and link an example record

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
- **Add tests** - Your patch won't be accepted if it doesn't have tests. Every formatter gets its own spec file and an entry in the registry test.
- **Formatters never throw** - A formatter returns a string or null for any record, including ones with missing or unexpected fields.
- **Document any change in behavior** - Make sure the `README.md`, the docs and the `/llms.txt` and `/skill.md` output are kept up-to-date.
- **Keep URLs stable** - Agents and tools link to atproto.md paths. Changing what an existing path returns, or removing one, is a breaking change.
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

## Adding a new formatter

Adding support for a new collection type adds two files (the formatter and its test) and touches two more (`src/formatters/index.ts` and `test/formatters/registry.spec.ts`). Here's the full walkthrough.

### 1. Create the formatter

Create `src/formatters/{nsid.namespace}.ts`. The filename should be the NSID namespace prefix of the collection(s) you're formatting.

```typescript
// src/formatters/blue.linkat.ts
import { register } from './registry';

register({
	'blue.linkat.entry': (record) => {
		const v = record.value;
		return [
			v.title ? `**Title:** ${v.title}` : null,
			v.url ? `**URL:** [${v.url}](${v.url})` : null,
			v.description ? `\n> ${v.description}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},
});
```

A single file can register multiple collections if they share a namespace (see `app.bsky.feed.ts` for an example with `post`, `like`, `repost`, and `generator`).

### 2. Register the import

Add one line to `src/formatters/index.ts`, in alphabetical order:

```typescript
import './blue.linkat';
```

### 3. Write tests

Create `test/formatters/{nsid.namespace}.spec.ts`. Use the shared helpers from `test/formatters/helpers.ts`:

```typescript
// test/formatters/blue.linkat.spec.ts
import { describe, it, expect } from 'vitest';
import { formatter, record, meta } from './helpers';

describe('blue.linkat.entry', () => {
	const format = formatter('blue.linkat.entry');
	const m = meta({ collection: 'blue.linkat.entry' });

	it('renders a link with all fields', () => {
		const result = format(record({ title: 'My Site', url: 'https://example.com', description: 'A cool site' }), m);
		expect(result).toContain('**Title:** My Site');
		expect(result).toContain('**URL:** [https://example.com](https://example.com)');
		expect(result).toContain('> A cool site');
	});

	it('handles entry with only a URL', () => {
		const result = format(record({ url: 'https://example.com' }), m);
		expect(result).toContain('**URL:** [https://example.com](https://example.com)');
		expect(result).not.toContain('Title');
	});
});
```

The test helpers:

- `record(value)` builds a minimal `AtpRecord` from a value object
- `meta(overrides)` builds a `RecordMeta` with sensible defaults
- `formatter(collection)` looks up a formatter and asserts it exists

### 4. Add to the registry test

Add your collection NSID(s) to the `expectedCollections` array in `test/formatters/registry.spec.ts`. This ensures the formatter stays registered.

### 5. Run tests

```bash
npm run test
```


## Formatter conventions

- Formatters receive `(record: AtpRecord, meta: RecordMeta)` and return `string | null`
- Access record data via `record.value` with optional chaining throughout
- Use `formatDate()` from `src/utils.ts` for date formatting, never an inline `new Date(...).toUTCString()`
- Use the `.filter(Boolean).join('\n')` pattern to build output from nullable lines
- If a formatter needs to preserve empty string spacers (e.g. between metadata and content), use `.filter((l) => l !== null)` instead of `.filter(Boolean)`
- Formatters should never throw. Return a string or null


## Project structure

```
src/
  index.ts              # Cloudflare Worker entry point and router
  http.ts               # CORS headers, mdResponse(), errMd()
  identity.ts           # Handle/DID resolution chain
  pds.ts                # PDS XRPC helper
  relay.ts              # Relay helper for /discover
  constellation.ts      # Constellation helper for /backlinks
  lexicon.ts            # DNS lexicon resolution for /lexicon
  types.ts              # Shared TypeScript interfaces
  utils.ts              # Shared utilities (formatDate, extFromMime)
  format.ts             # formatRecord() dispatch + genericMd() fallback
  views.ts              # Page-level view formatters + index page
  html.ts               # HTML pages for browsers, OG image, robots.txt, sitemap
  llms.ts               # /llms.txt and /skill.md
  mcp.ts                # MCP server for LLM tool integration
  stats.ts              # Anonymous usage counters (StatsDO) for /stats
  formatters/
    registry.ts         # register() and getFormatter()
    index.ts            # Barrel imports for all formatters
    {nsid}.ts           # One file per NSID namespace

test/
  index.spec.ts         # Worker route tests
  format.spec.ts        # genericMd and formatRecord tests
  lexicon.spec.ts       # Lexicon resolution tests
  views.spec.ts         # View formatter tests
  utils.spec.ts         # Utility function tests
  formatters/
    helpers.ts          # Shared test helpers: record(), meta(), formatter()
    registry.spec.ts    # Ensures all formatters stay registered
    {nsid}.spec.ts      # One test file per formatter
```


## Finding record shapes

To see what fields a collection's records contain, use the running dev server or the MCP tools:

```bash
# Browse a repo to find collections
curl http://localhost:8787/at://bsky.app

# List records in a collection to see the shape
curl http://localhost:8787/at://bsky.app/app.bsky.actor.profile

# Fetch a single record
curl http://localhost:8787/at://bsky.app/app.bsky.actor.profile/self
```

The generic formatter will render unknown collections as key-value markdown. Use that output to understand the record shape before writing a dedicated formatter.
