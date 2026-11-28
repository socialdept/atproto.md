import { esc } from '../kit';

interface Param {
	name: string;
	/** Where it goes: in the path or the query string. */
	in: 'path' | 'query';
	type: string;
	def?: string;
	desc: string;
}

interface Endpoint {
	path: string;
	desc: string;
	params: Param[];
	returns: string;
	note?: string;
	example: string;
}

const ACTOR: Param = {
	name: 'actor',
	in: 'path',
	type: 'handle or DID',
	desc: 'The account, as a handle such as bsky.app or a did:plc or did:web.',
};
const EXPAND: Param = {
	name: 'expand',
	in: 'query',
	type: 'flag',
	desc: 'Also fetch the records these reference (reply parent and root, quoted post, like or repost subject), one level deep, up to 25, under expanded.',
};

const LABELERS: Param = {
	name: 'labelers',
	in: 'query',
	type: 'all, handles or DIDs',
	desc: 'Which labelers to ask: all for every known one, or handles and DIDs separated by commas. Bluesky’s moderation labeler when left out.',
};
const LABEL_PARAMS: Param[] = [
	{ name: 'labels', in: 'query', type: 'flag', desc: 'Attach each record’s labels, under labels.' },
	{ name: 'author', in: 'query', type: 'flag', desc: 'Also attach the labels on each record’s account, under authorLabels.' },
	LABELERS,
];

export const ROUTES: [string, string, Endpoint[]][] = [
	[
		'Records',
		'Read from each account’s own PDS. Values are returned exactly as stored, with direct blob URLs.',
		[
			{
				path: '/{link}',
				desc: 'A web link in place of the AT URI. Returns the account, collection or record the link shows.',
				params: [
					{
						name: 'link',
						in: 'path',
						type: 'URL',
						desc: 'A link from a Bluesky-style client, an explorer such as pdsls.dev, or any page that publishes its AT URI with at-tags.',
					},
				],
				returns: 'The same response as the matching /at:// route.',
				note: 'A link that names no record or account returns a 400 that lists what is supported.',
				example: '/https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d',
			},
			{
				path: '/at://{actor}',
				desc: 'The account’s identity and repo in one response.',
				params: [ACTOR],
				returns: '{ did, handle, pds, entryway, active, status, pdsSince, collections, didDoc }',
				note: 'active and status come from the PDS: status says deactivated, takendown or suspended when active is false. pdsSince is when the account moved to its PDS. collections is null when the PDS does not answer describeRepo.',
				example: '/at://bsky.app',
			},
			{
				path: '/at://{actor}/{collection}',
				desc: 'Records in one collection, newest first.',
				params: [
					ACTOR,
					{ name: 'collection', in: 'path', type: 'NSID', desc: 'The collection, such as app.bsky.feed.post.' },
					{ name: 'limit', in: 'query', type: '1 to 100', def: '25', desc: 'Records per page.' },
					{ name: 'cursor', in: 'query', type: 'string', desc: 'The cursor from the previous page.' },
					{ name: 'reverse', in: 'query', type: 'flag', desc: 'Oldest first.' },
					EXPAND,
					...LABEL_PARAMS,
				],
				returns: '{ did, handle, pds, entryway, collection, cursor, records: [{ uri, cid, value, blobs }] }',
				note: 'cursor is null on the last page.',
				example: '/at://bsky.app/app.bsky.feed.post?limit=5',
			},
			{
				path: '/at://{actor}/{collection}/{rkey}',
				desc: 'One record.',
				params: [
					ACTOR,
					{ name: 'collection', in: 'path', type: 'NSID', desc: 'The record’s collection.' },
					{ name: 'rkey', in: 'path', type: 'string', desc: 'The record key, such as self or 3l6oveex3ii2l.' },
					EXPAND,
					...LABEL_PARAMS,
				],
				returns: '{ uri, cid, value, blobs, expanded }',
				note: 'blobs lists a getBlob URL for each image or video in value. expanded is present only with expand.',
				example: '/at://bsky.app/app.bsky.actor.profile/self',
			},
			{
				path: '/blob/{actor}/{cid}',
				desc: 'Redirects to the blob on its PDS, or with transform options, to a resized copy from the co/infra image CDN.',
				params: [
					ACTOR,
					{ name: 'cid', in: 'path', type: 'CID', desc: 'The blob, as listed in a record’s blobs.' },
					{
						name: 'params',
						in: 'path',
						type: 'optional',
						desc: 'Transform options for the co/infra image CDN, such as p=avatar or w=400,f=webp. With them, the response redirects to the CDN.',
					},
				],
				returns: 'A redirect to the PDS, or to img.infra.coop',
				note: 'The CDN’s options and presets are listed at github.com/co-infra/co-infra-img.',
				example: '/blob/bsky.app/bafkreihwihm6kpd6zuwhhlro75p5qks5qtrcu55jp3gddbfjsieiv7wuka',
			},
			{
				path: '/repo/car/{actor}',
				desc: 'Redirects to the whole repo as a CAR file, streamed by the account’s PDS.',
				params: [ACTOR],
				returns: 'A redirect to the PDS’s getRepo',
				note: 'The PDS’s own rate limits apply. Large repos take a while.',
				example: '/repo/car/pds.rip',
			},
			{
				path: '/get',
				desc: 'Up to 25 records in one call, fetched in parallel.',
				params: [
					{
						name: 'uri',
						in: 'query',
						type: 'repeatable',
						desc: 'An at:// record URI or a link to the record: a Bluesky-style client, an explorer such as pdsls.dev, or any page that publishes at-tags. Repeat it for each record, up to 25.',
					},
					EXPAND,
					...LABEL_PARAMS,
				],
				returns: '{ records, errors, expanded }',
				note: 'Each account is looked up once per call. An address that fails goes into errors as { address, error }, and the rest still come back.',
				example: '/get?uri=https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d&expand',
			},
		],
	],
	[
		'Identity',
		'Handles and DIDs both work. The PLC routes need a did:plc.',
		[
			{
				path: '/resolve/{actor}',
				desc: 'The same response as /at://{actor}.',
				params: [ACTOR],
				returns: '{ did, handle, pds, entryway, active, status, pdsSince, collections, didDoc }',
				example: '/resolve/bsky.app',
			},
			{
				path: '/did/doc/{actor}',
				desc: 'The DID document, as plc.directory or the did:web domain serves it.',
				params: [ACTOR],
				returns: '{ id, alsoKnownAs, verificationMethod, service }',
				example: '/did/doc/bsky.app',
			},
			{
				path: '/did/trace/{actor}',
				desc: 'Every step of resolving the account, with what each one returned.',
				params: [ACTOR],
				returns: '{ did, handle, handleVerified, pds, entryway, ok, steps: [{ step, request, ok, ms, status, result, error }] }',
				note: 'Runs the DNS and HTTPS handle lookups, the DID document fetch and a PDS check itself. A handle needs only one of the two lookups to work.',
				example: '/did/trace/bsky.app',
			},
			{
				path: '/plc/data/{actor}',
				desc: 'The current PLC state, as plc.directory serves it.',
				params: [ACTOR],
				returns: '{ did, verificationMethods, rotationKeys, alsoKnownAs, services }',
				note: 'rotationKeys are in priority order. did:web accounts get a 400.',
				example: '/plc/data/bsky.app',
			},
			{
				path: '/plc/audit/{actor}',
				desc: 'Every PLC operation, dated.',
				params: [ACTOR],
				returns: '{ did, operations: [{ operation, cid, nullified, createdAt }] }',
				note: 'Compare consecutive operations to date PDS migrations, handle changes and key rotations.',
				example: '/plc/audit/bsky.app',
			},
			{
				path: '/plc/last/{actor}',
				desc: 'The latest PLC operation.',
				params: [ACTOR],
				returns: '{ did, operation }',
				example: '/plc/last/bsky.app',
			},
		],
	],
	[
		'Labels',
		'Asked of each labeler directly. Bluesky’s moderation labeler unless labelers names others.',
		[
			{
				path: '/labels/{target}',
				desc: 'The labels on a record or an account.',
				params: [
					{
						name: 'target',
						in: 'path',
						type: 'at:// URI, handle, DID or link',
						desc: 'A record, or an account by handle, DID or profile link.',
					},
					LABELERS,
					{ name: 'author', in: 'query', type: 'flag', desc: 'For a record, also return the labels on its account.' },
				],
				returns: '{ target, labels: [{ val, uri, cts, exp, labeler }], authorLabels, labelers: [{ did, handle, ok, error }] }',
				note: 'Negated and expired labels are left out. A labeler that fails is listed in labelers, and the rest still answer.',
				example: '/labels/bsky.app?labelers=all',
			},
			{
				path: '/labelers',
				desc: 'The known labelers that labelers=all asks.',
				params: [],
				returns: '{ default, labelers: [{ did, handle, name }] }',
				example: '/labelers',
			},
		],
	],
	[
		'Network',
		'Answers no single PDS can give, from the Bluesky relay, DNS and Constellation.',
		[
			{
				path: '/discover/{collection}',
				desc: 'Every repo with at least one record in a collection.',
				params: [
					{ name: 'collection', in: 'path', type: 'NSID', desc: 'The collection, such as site.standard.document.' },
					{ name: 'limit', in: 'query', type: '1 to 2000', def: '100', desc: 'Repos per page.' },
					{ name: 'cursor', in: 'query', type: 'string', desc: 'The cursor from the previous page.' },
				],
				returns: '{ collection, cursor, repos: [did] }',
				example: '/discover/site.standard.document?limit=20',
			},
			{
				path: '/lexicon/{nsid}',
				desc: 'The published Lexicon schema, found through the NSID’s _lexicon DNS record.',
				params: [{ name: 'nsid', in: 'path', type: 'NSID', desc: 'The lexicon, such as app.bsky.feed.post.' }],
				returns: '{ nsid, authority, did, uri, cid, schema }',
				example: '/lexicon/app.bsky.feed.post',
			},
			{
				path: '/backlinks/{target}',
				desc: 'Records anywhere on the network that link to a record, account or URL.',
				params: [
					{ name: 'target', in: 'path', type: 'at:// URI, DID or URL', desc: 'What the records link to.' },
					{
						name: 'source',
						in: 'query',
						type: 'collection:path',
						desc: 'One source from the summary, such as app.bsky.feed.like:subject.uri. Leave it out for the summary.',
					},
					{ name: 'hydrate', in: 'query', type: 'flag', desc: 'With source, return the linking records instead of their URIs.' },
					{ name: 'limit', in: 'query', type: '1 to 100', def: '50', desc: 'Records per page with source. At most 25 with hydrate.' },
					{ name: 'cursor', in: 'query', type: 'string', desc: 'The cursor from the previous page.' },
				],
				returns:
					'Without source: { target, total, sources: [{ source, records, dids }] }. With source: { target, source, total, cursor, records }',
				example:
					'/backlinks/at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3n2opitxdyc2j?source=app.bsky.feed.post:reply.parent.uri&hydrate&limit=5',
			},
		],
	],
];

const METHOD_PARAMS: Param = {
	name: 'params',
	in: 'query',
	type: 'per method',
	desc: 'The method’s own parameters, exactly as its lexicon defines them.',
};

// The XRPC endpoint, one entry per kind of method, since each kind goes to a different server.
export const XRPC_ROUTES: [string, string, Endpoint[]][] = [
	[
		'XRPC',
		'Standard XRPC queries, each sent to the server that answers it. Calls with an Authorization header and procedures are refused.',
		[
			{
				path: '/xrpc/com.atproto.repo.*',
				desc: 'Sent to the account’s PDS. repo takes a handle or a DID.',
				params: [
					{ name: 'repo', in: 'query', type: 'handle or DID', desc: 'The account. A handle is resolved, and the PDS gets the DID.' },
					METHOD_PARAMS,
				],
				returns: 'The PDS’s response, unchanged',
				note: 'getRecord, listRecords and describeRepo. The X-Upstream-Host header names the PDS that answered.',
				example: '/xrpc/com.atproto.repo.getRecord?repo=bsky.app&collection=app.bsky.actor.profile&rkey=self',
			},
			{
				path: '/xrpc/com.atproto.sync.*',
				desc: 'With did, sent to the account’s PDS. Without, to the relay.',
				params: [
					{ name: 'did', in: 'query', type: 'handle or DID', desc: 'The account. A handle is resolved, and the PDS gets the DID.' },
					METHOD_PARAMS,
				],
				returns: 'The response unchanged, or for getBlob and getRepo a redirect to the PDS',
				note: 'Blobs and whole repos redirect to the PDS, which streams them.',
				example: '/xrpc/com.atproto.sync.getLatestCommit?did=bsky.app',
			},
			{
				path: '/xrpc/com.atproto.identity.*',
				desc: 'Answered by atproto.md: resolveHandle, resolveDid and resolveIdentity.',
				params: [METHOD_PARAMS],
				returns: '{ did }, { didDoc } or { did, handle, didDoc }',
				note: 'resolveIdentity returns handle.invalid when the handle does not point back at the DID.',
				example: '/xrpc/com.atproto.identity.resolveHandle?handle=bsky.app',
			},
			{
				path: '/xrpc/app.bsky.*',
				desc: 'Sent to Bluesky’s public app view.',
				params: [METHOD_PARAMS],
				returns: 'The app view’s response, unchanged',
				example: '/xrpc/app.bsky.actor.getProfile?actor=bsky.app',
			},
		],
	],
];

export const EXAMPLES: [string, string][] = [
	['Profile', 'at://bsky.app/app.bsky.actor.profile/self'],
	['Reply, expanded', 'https://bsky.app/profile/bsky.app/post/3n2mkgfb4tk2d'],
	['Latest posts', 'at://bsky.app/app.bsky.feed.post'],
	['Lexicon', 'lexicon/site.standard.document'],
	// A page that publishes its AT URI with at-tags, resolved through the page lookup.
	['Blog link', 'https://blog.pds.rip'],
];

// One table per kind of parameter, so what goes in the path never mixes with what goes after the ?.
// Dotted names in prose (NSIDs, source paths) may break after a dot or colon, so one never sets a column's minimum width.
const breakable = (text: string): string => esc(text).replace(/([\w-])([.:])(?=[\w-])/g, '$1$2<wbr>');
export function paramTable(title: string, params: Param[]): string {
	if (!params.length) return '';
	// The Default column shows only when a parameter in this table has one.
	const hasDef = params.some((p) => p.def);
	const rows = params
		.map(
			(p) =>
				`<tr><td><code>${esc(p.name)}</code></td><td class="c-type">${p.type
					.split(/,\s*/)
					.map((part) => `<span>${esc(part)}</span>`)
					.join(
						', ',
					)}</td>${hasDef ? `<td class="c-def">${p.def ? `<code>${esc(p.def)}</code>` : ''}</td>` : ''}<td>${breakable(p.desc)}</td></tr>`,
		)
		.join('');
	return `<div class="params"><h4>${title}</h4><div class="ptable"><div class="ptable__scroll"><table><thead><tr><th>Name</th><th class="c-type">Type</th>${hasDef ? '<th class="c-def">Default</th>' : ''}<th>What it does</th></tr></thead><tbody>${rows}</tbody></table></div><i class="ptable__edge" aria-hidden="true"></i></div></div>`;
}
