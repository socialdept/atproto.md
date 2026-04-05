# Contributing to atproto.md

The most common contribution is adding a formatter for a new AT Protocol collection type. This guide walks through exactly how to do that.

---

## Getting started

```bash
git clone git@tangled.org:socialde.pt/atproto.md atproto-md
cd atproto-md
npm install
npm run dev    # local dev server at http://localhost:8787
npm run test   # run the test suite
```

---

## Code style

Code style is enforced by `.editorconfig` and `.prettierrc` — most editors pick these up automatically.

- Tabs for indentation
- Single quotes
- Semicolons
- 140 character line width

---

## Adding a new formatter

Adding support for a new collection type touches exactly **3 files** (plus one new test file). Here's the full walkthrough.

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
		const result = format(
			record({ title: 'My Site', url: 'https://example.com', description: 'A cool site' }),
			m,
		);
		expect(result).toContain('**Title:** My Site');
		expect(result).toContain('**URL:** [https://example.com](https://example.com)');
		expect(result).toContain('> A cool site');
	});

	it('handles entry with only a URL', () => {
		const result = format(record({ url: 'https://example.com' }), m);
		expect(result).toContain('**URL:**');
		expect(result).not.toContain('Title');
	});
});
```

The test helpers:

- `record(value)` — builds a minimal `AtpRecord` from a value object
- `meta(overrides)` — builds a `RecordMeta` with sensible defaults
- `formatter(collection)` — looks up a formatter and asserts it exists

### 4. Add to the registry test

Add your collection NSID(s) to the `expectedCollections` array in `test/formatters/registry.spec.ts`. This ensures the formatter stays registered.

### 5. Run tests

```bash
npm run test
```

---

## Formatter conventions

- Formatters receive `(record: AtpRecord, meta: RecordMeta)` and return `string | null`
- Access record data via `record.value` with optional chaining throughout
- Use `formatDate()` from `src/utils.ts` for date formatting — never inline `new Date(...).toUTCString()`
- Use the `.filter(Boolean).join('\n')` pattern to build output from nullable lines
- If a formatter needs to preserve empty string spacers (e.g. between metadata and content), use `.filter((l) => l !== null)` instead of `.filter(Boolean)`
- Formatters should never throw — return a string or null

---

## Project structure

```
src/
  index.ts              # Cloudflare Worker entry point and router
  http.ts               # CORS headers, mdResponse(), errMd()
  identity.ts           # Handle/DID resolution chain
  pds.ts                # PDS XRPC helper
  types.ts              # Shared TypeScript interfaces
  utils.ts              # Shared utilities (formatDate)
  format.ts             # formatRecord() dispatch + genericMd() fallback
  views.ts              # Page-level view formatters + index page
  llms.ts               # /llms.txt endpoint
  mcp.ts                # MCP server for LLM tool integration
  formatters/
    registry.ts         # register() and getFormatter()
    index.ts            # Barrel imports for all formatters
    {nsid}.ts           # One file per NSID namespace

test/
  index.spec.ts         # Worker route tests
  format.spec.ts        # genericMd and formatRecord tests
  utils.spec.ts         # Utility function tests
  formatters/
    helpers.ts          # Shared test helpers: record(), meta(), formatter()
    registry.spec.ts    # Ensures all formatters stay registered
    {nsid}.spec.ts      # One test file per formatter
```

---

## Finding record shapes

To see what fields a collection's records contain, use the running dev server or the MCP tools:

```bash
# Browse a repo to find collections
curl http://localhost:8787/at://bsky.app

# List records in a collection to see the shape
curl http://localhost:8787/at://bsky.app/app.bsky.actor.profile/self
```

The generic formatter will render unknown collections as key-value markdown — use that output to understand the record shape before writing a dedicated formatter.
