import type { Actor, DidDocument } from './types';

const PLC_DIRECTORY = 'https://plc.directory';

export async function resolveToDid(handleOrDid: string): Promise<string> {
	if (handleOrDid.startsWith('did:')) return handleOrDid;

	const res = await fetch(
		`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleOrDid)}`,
	);

	if (!res.ok) throw { status: 404, message: `Could not resolve handle: \`${handleOrDid}\`` };

	const data = (await res.json()) as { did: string };
	return data.did;
}

export async function resolveDidDoc(did: string): Promise<DidDocument> {
	const method = did.split(':')[1];

	if (method === 'plc') {
		const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}`);
		if (!res.ok) throw { status: 404, message: `DID not found: \`${did}\`` };
		return res.json() as Promise<DidDocument>;
	}

	if (method === 'web') {
		const domain = did.replace('did:web:', '');
		const res = await fetch(`https://${domain}/.well-known/did.json`);
		if (!res.ok) throw { status: 404, message: `DID not found: \`${did}\`` };
		return res.json() as Promise<DidDocument>;
	}

	throw { status: 400, message: `Unsupported DID method: \`${method}\`. Supported: \`plc\`, \`web\`` };
}

export function pdsFromDidDoc(doc: DidDocument): string {
	const svc = doc.service?.find((s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
	if (!svc) throw { status: 502, message: `No PDS service found in DID doc for \`${doc.id}\`` };
	return svc.serviceEndpoint.replace(/\/$/, '');
}

export async function resolveActor(actor: string): Promise<Actor> {
	const did = await resolveToDid(actor);
	const doc = await resolveDidDoc(did);
	const pds = pdsFromDidDoc(doc);
	const aka = doc.alsoKnownAs ?? [];
	const handle = aka.find((a) => a.startsWith('at://'))?.replace('at://', '') ?? did;
	return { did, doc, pds, handle };
}
