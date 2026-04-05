import { formatRecord } from './format';
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

---

## Rich formatting for known collections

| Collection                                      | Notes                        |
| ----------------------------------------------- | ---------------------------- |
| \`app.bsky.feed.post\`                            | Text, embeds, reply context  |
| \`app.bsky.actor.profile\`                        | Bio, display name            |
| \`app.bsky.graph.follow/block/list/listitem\`     | Subjects, timestamps         |
| \`app.bsky.feed.like/repost/generator\`           | Subjects, timestamps         |
| \`app.bsky.labeler.service\`                      | Label policies               |
| \`com.whtwnd.blog.entry\`                         | Title, full markdown content |
| \`blue.linkat.entry\`                             | Title, URL, description      |
| \`events.smokesignal.calendar.event\`             | Name, dates, location        |
| *Any other collection*                          | Generic key-value markdown   |

---

*Data fetched directly from AT Protocol PDSes via \`com.atproto.repo.*\`*
*No authentication. Public data only.*
`;
}
