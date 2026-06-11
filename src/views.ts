import type { Backlinks, LinkSource } from './constellation';
import { formatRecord } from './format';
import type { ReposByCollection } from './relay';
import type { Actor, AtpRecord } from './types';

export function formatRepo(origin: string, actor: Actor, collections: string[]): string {
	return [
		`# Repo: @${actor.handle}`,
		'',
		`**DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		'',
		'## Collections',
		'',
		...collections.map((c) => `- [\`${c}\`](${origin}/at://${actor.did}/${c})`),
		'',
		'---',
		`*Query any collection: \`${origin}/at://${actor.did}/{collection}\`*`,
	].join('\n');
}

export function formatRecordList(actor: Actor, collection: string, records: AtpRecord[], cursor?: string): string {
	const lines = [
		`# \`${collection}\``,
		`**Author:** @${actor.handle} | **DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		`**Records:** ${records.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!records.length) {
		lines.push('*No records found in this collection.*');
	} else {
		for (const rec of records) {
			const rkey = rec.uri.split('/').pop()!;
			lines.push(formatRecord(rec, { handle: actor.handle, collection, rkey, uri: rec.uri }));
			lines.push('\n---');
		}
	}

	lines.push('', `*Fetched from ${actor.pds} via \`com.atproto.repo.listRecords\`*`);
	return lines.join('\n');
}

export function formatSingleRecord(actor: Actor, collection: string, rkey: string, record: AtpRecord): string {
	const uri = `at://${actor.did}/${collection}/${rkey}`;
	return [
		`# Record`,
		`**Author:** @${actor.handle} (\`${actor.did}\`)`,
		'',
		formatRecord(record, { handle: actor.handle, collection, rkey, uri }),
		'',
		'---',
		`*Fetched from ${actor.pds} via \`com.atproto.repo.getRecord\`*`,
	].join('\n');
}

export function formatDiscovery(origin: string, collection: string, result: ReposByCollection): string {
	const { repos, cursor } = result;
	const lines = [
		`# Repos with \`${collection}\``,
		'',
		`Every repo on the network with at least one \`${collection}\` record.`,
		`**Repos (this page):** ${repos.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!repos.length) {
		lines.push('*No repos found for this collection.*');
	} else {
		for (const { did } of repos) {
			lines.push(`- [\`${did}\`](${origin}/at://${did}/${collection})`);
		}
	}

	if (cursor) {
		lines.push('', `**[Next page →](${origin}/discover/${collection}?cursor=${encodeURIComponent(cursor)})**`);
	}

	lines.push('', '---', `*Discovered via \`com.atproto.sync.listReposByCollection\` on the relay*`);
	return lines.join('\n');
}

export function formatBacklinkSources(origin: string, target: string, sources: LinkSource[]): string {
	const totalRecords = sources.reduce((n, s) => n + s.records, 0);
	const lines = [
		`# Backlinks to \`${target}\``,
		'',
		`Records across the network that link to this target.`,
		`**Total backlinks:** ${totalRecords} from ${sources.length} source${sources.length === 1 ? '' : 's'}`,
		'',
	];

	if (!sources.length) {
		lines.push('*No backlinks indexed for this target.*');
	} else {
		lines.push('| Source collection | Path | Records | Distinct DIDs |', '| --- | --- | --- | --- |');
		for (const s of sources) {
			const source = `${s.collection}:${s.path.replace(/^\./, '')}`;
			const link = `${origin}/backlinks/${target}?source=${encodeURIComponent(source)}`;
			lines.push(`| [\`${s.collection}\`](${link}) | \`${s.path}\` | ${s.records} | ${s.distinctDids} |`);
		}
	}

	lines.push('', '---', `*Indexed by [Constellation](https://constellation.microcosm.blue) — microcosm.blue*`);
	return lines.join('\n');
}

export function formatBacklinkRecords(origin: string, target: string, source: string, data: Backlinks): string {
	const { total, records, cursor } = data;
	const lines = [
		`# Backlinks: \`${source}\``,
		'',
		`Records from \`${source}\` linking to \`${target}\`.`,
		`**Total:** ${total} | **This page:** ${records.length}`,
	];

	if (cursor) lines.push(`**Cursor (next page):** \`${cursor}\``);
	lines.push('');

	if (!records.length) {
		lines.push('*No linking records found.*');
	} else {
		for (const r of records) {
			const uri = `at://${r.did}/${r.collection}/${r.rkey}`;
			lines.push(`- [\`${uri}\`](${origin}/at://${r.did}/${r.collection}/${r.rkey})`);
		}
	}

	if (cursor) {
		const next = `${origin}/backlinks/${target}?source=${encodeURIComponent(source)}&cursor=${encodeURIComponent(cursor)}`;
		lines.push('', `**[Next page →](${next})**`);
	}

	lines.push('', `**[← All backlink sources](${origin}/backlinks/${target})**`);
	lines.push('', '---', `*Indexed by [Constellation](https://constellation.microcosm.blue) — microcosm.blue*`);
	return lines.join('\n');
}

export function formatResolution(origin: string, actor: Actor): string {
	const { doc } = actor;
	const aka = doc.alsoKnownAs ?? [];
	const services = doc.service ?? [];
	const keys = doc.verificationMethod ?? [];

	return [
		`# Identity: @${actor.handle}`,
		'',
		`**DID:** \`${actor.did}\``,
		`**PDS:** ${actor.pds}`,
		'',
		'## Also Known As',
		...aka.map((a) => `- \`${a}\``),
		'',
		'## Services',
		...services.map((s) => `- **${s.id}** (\`${s.type}\`): ${s.serviceEndpoint}`),
		'',
		'## Verification Keys',
		...keys.map((k) => `- **${k.id}** (\`${k.type}\`)`),
		'',
		'---',
		`*Resolved via ${actor.did.startsWith('did:plc') ? 'PLC Directory' : 'did:web'}*`,
		`*[View repo \u2192](${origin}/at://${actor.did})*`,
	].join('\n');
}

export function indexPage(origin: string): string {
	return `# atproto.md

A read-only, markdown-first API for exploring the full AT Protocol ecosystem.
Works with **any collection on any PDS** — first-party Bluesky or third-party lexicons.

---

## URL Structure

URLs accept \`at://\` URIs directly in the path:

\`\`\`
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post
GET ${origin}/at://did:plc:eob75vcjtmbaef2tn4evc4sl/app.bsky.feed.post/{rkey}

GET ${origin}/at://alice.bsky.social
GET ${origin}/at://alice.bsky.social/com.whtwnd.blog.entry
\`\`\`

---

## Endpoints

### \`GET ${origin}/resolve/{actor}\`
Full identity chain: handle → DID → DID document → PDS endpoint.

### \`GET ${origin}/at://{actor}\`
Repo overview. Lists all collections present in the repo.

### \`GET ${origin}/at://{actor}/{collection}\`
List records in any collection on any PDS.

**Query params:**
- \`limit\` — Records per page (default: 25, max: 100)
- \`cursor\` — Pagination cursor
- \`reverse\` — \`true\` for oldest-first

### \`GET ${origin}/at://{actor}/{collection}/{rkey}\`
Fetch a single record by rkey.

### \`GET ${origin}/discover/{collection}\`
Discover every repo on the network with records in a collection — find all users
of a lexicon, e.g. [\`/discover/site.standard.document\`](${origin}/discover/site.standard.document).

**Query params:**
- \`limit\` — Repos per page (default: 100, max: 2000)
- \`cursor\` — Pagination cursor

### \`GET ${origin}/backlinks/{at-uri-or-did-or-url}\`
Find records across the network that link to a target — likes, reposts, replies,
follows, quotes, or any custom lexicon. Without \`source\`, returns a summary of every
link source with counts.

**Query params:**
- \`source\` — A \`{collection:path}\` selector (e.g. \`app.bsky.feed.like:subject.uri\`) to list the actual linking records
- \`limit\` — Linking records per page (default: 50, max: 100)
- \`cursor\` — Pagination cursor

---

## Rich formatting for known collections

| Collection                                      | Notes                              |
| ----------------------------------------------- | ---------------------------------- |
| \`app.bsky.feed.post\`                            | Text, embeds, reply context        |
| \`app.bsky.actor.profile\`                        | Bio, display name                  |
| \`app.bsky.graph.follow/block/list/listitem\`     | Subjects, timestamps               |
| \`app.bsky.feed.like/repost/generator\`           | Subjects, timestamps               |
| \`app.bsky.labeler.service\`                      | Label policies                     |
| \`site.standard.publication\`                     | Name, URL, description             |
| \`site.standard.document\`                        | Title, content, published date     |
| \`pub.leaflet.publication/document\`              | Name, URL, content from pages      |
| \`app.offprint.publication/document.article\`     | References to standard records     |
| \`blog.pckt.publication\`                         | Reference to standard record       |
| \`link.woosh.linkPage\`                           | Description, labeled link sections |
| \`blue.linkat.entry\`                             | Title, URL, description            |
| \`events.smokesignal.calendar.event\`             | Name, dates, location              |
| *Any other collection*                          | Generic key-value markdown         |

---

## For LLM agents

- **[\`/skill.md\`](${origin}/skill.md)** — Full agent skill sheet with usage triggers, examples, and endpoint reference
- **[\`/llms.txt\`](${origin}/llms.txt)** — Structured API summary for LLM discovery
- **\`/mcp\`** — MCP server endpoint. Install in Claude Code: \`claude mcp add --transport http atproto-md ${origin}/mcp\`

### Install as a Claude Code command

Drop the skill sheet into your Claude Code commands so you can invoke it with \`/atproto\`:

\`\`\`bash
curl -s ${origin}/skill.md > ~/.claude/commands/atproto.md
\`\`\`

---

## Contributing

Missing a collection formatter? [Open an issue](https://tangled.org/socialde.pt/atproto.md/issues) or [contribute a formatter](https://tangled.org/socialde.pt/atproto.md/) — adding one is just a few lines of TypeScript.

---

*Data fetched directly from AT Protocol PDSes via \`com.atproto.repo.*\`*
*Network discovery via the relay's \`com.atproto.sync.listReposByCollection\`.*
*Backlinks indexed by [Constellation](https://constellation.microcosm.blue) (microcosm.blue).*
*No authentication. Public data only.*
`;
}
