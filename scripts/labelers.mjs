// Lists candidate labelers for src/labelers.ts, which is curated by hand. Every account on the network with an
// app.bsky.labeler.service record is ranked by likes, and the top ones are printed with their description, a few of
// their label values, whether their service answers, and whether they are already on the list. It never edits the
// list. Run: npm run labelers [count]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RELAY = 'https://relay1.us-west.bsky.network';
const APPVIEW = 'https://public.api.bsky.app';
const COUNT = Number(process.argv[2] ?? 40);
const listed = new Set([...readFileSync(join(root, 'src/labelers.ts'), 'utf8').matchAll(/"did": "([^"]+)"/g)].map((m) => m[1]));

async function json(url) {
	const res = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!res.ok) throw new Error(`${url} answered ${res.status}`);
	return res.json();
}

// Every DID with a labeler service record.
const dids = [];
let cursor;
do {
	const url = new URL(`${RELAY}/xrpc/com.atproto.sync.listReposByCollection`);
	url.searchParams.set('collection', 'app.bsky.labeler.service');
	url.searchParams.set('limit', '2000');
	if (cursor) url.searchParams.set('cursor', cursor);
	const page = await json(url);
	dids.push(...page.repos.map((r) => r.did));
	cursor = page.cursor;
} while (cursor);

// Their like counts, descriptions and label values from the app view, 25 at a time.
const views = [];
for (let i = 0; i < dids.length; i += 25) {
	const url = new URL(`${APPVIEW}/xrpc/app.bsky.labeler.getServices`);
	for (const did of dids.slice(i, i + 25)) url.searchParams.append('dids', did);
	url.searchParams.set('detailed', 'true');
	try {
		views.push(...(await json(url)).views);
	} catch {}
}

// Whether the labeler's service answers. A 400 still counts: many labelers reject the wildcard used here.
async function answers(did) {
	try {
		const doc = await json(`https://plc.directory/${did}`);
		const svc = doc.service?.find((s) => s.id === '#atproto_labeler');
		if (!svc) return 'no service';
		const res = await fetch(`${svc.serviceEndpoint.replace(/\/$/, '')}/xrpc/com.atproto.label.queryLabels?uriPatterns=*&limit=1`, {
			signal: AbortSignal.timeout(4000),
		});
		return res.ok || res.status === 400 ? 'answers' : `answered ${res.status}`;
	} catch (e) {
		return e.name === 'TimeoutError' ? 'timed out' : 'unreachable';
	}
}

const top = views
	.filter((v) => v.creator?.handle && v.creator.handle !== 'handle.invalid')
	.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
	.slice(0, COUNT);
const line = (s, n) =>
	String(s ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, n);

console.log(`${dids.length} labelers on the network. The top ${top.length} by likes:\n`);
for (const v of top) {
	const mark = listed.has(v.creator.did) ? 'listed' : '      ';
	console.log(`${mark}  ${String(v.likeCount ?? 0).padStart(6)}  ${v.creator.handle}  (${await answers(v.creator.did)})`);
	console.log(`        ${v.creator.did}  ${line(v.creator.displayName, 60)}`);
	console.log(`        ${line(v.creator.description, 140)}`);
	console.log(`        labels: ${(v.policies?.labelValues ?? []).slice(0, 8).join(', ')}\n`);
}
