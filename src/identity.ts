import { USER_AGENT } from './http';
import type { Actor, DidDocument, PlcData, PlcLogEntry, PlcOperation } from './types';

const PLC_DIRECTORY = 'https://plc.directory';

export async function resolveToDid(handleOrDid: string): Promise<string> {
	if (handleOrDid.startsWith('did:')) return handleOrDid;

	const res = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleOrDid)}`);

	if (!res.ok) throw { status: 404, message: `Could not resolve handle: ${handleOrDid}`, upstream: 'handle' };

	const data = (await res.json()) as { did: string };
	return data.did;
}

export async function resolveDidDoc(did: string): Promise<DidDocument> {
	const method = did.split(':')[1];

	if (method === 'plc') {
		const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}`);
		if (!res.ok) throw { status: 404, message: `DID not found: ${did}`, upstream: 'plc' };
		return res.json() as Promise<DidDocument>;
	}

	if (method === 'web') {
		const domain = did.replace('did:web:', '');
		const res = await fetch(`https://${decodeURIComponent(domain)}/.well-known/did.json`, { headers: USER_AGENT });
		if (!res.ok) throw { status: 404, message: `DID not found: ${did}`, upstream: 'did:web' };
		return res.json() as Promise<DidDocument>;
	}

	throw { status: 400, message: `Unsupported DID method: ${method}. Supported: plc, web` };
}

export function pdsFromDidDoc(doc: DidDocument): string {
	const svc = doc.service?.find((s) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
	if (!svc) throw { status: 502, message: `No PDS service found in the DID document for ${doc.id}`, upstream: 'identity' };
	return svc.serviceEndpoint.replace(/\/$/, '');
}

// The entryway is the server that signs an account in and manages it, which can differ from the PDS host that stores
// the repo. Bluesky's PDS hosts (puffball.us-east.host.bsky.network and the rest of that fleet) all name
// https://bsky.social. A self-hosted PDS names itself. Each PDS publishes it as the authorization server in its
// OAuth protected resource metadata. The answer is cached for a day, and any failure falls back to the PDS itself.
// entryway() below is the response field: the entryway only when it differs from the PDS, otherwise null.
async function entrywayFor(pds: string): Promise<string> {
	try {
		const res = await fetch(`${pds}/.well-known/oauth-protected-resource`, {
			signal: AbortSignal.timeout(3000),
			cf: { cacheTtl: 86400, cacheEverything: true },
		} as RequestInit);
		if (!res.ok) return pds;
		const data = (await res.json()) as { authorization_servers?: unknown };
		const server = Array.isArray(data.authorization_servers) ? data.authorization_servers[0] : undefined;
		return typeof server === 'string' && /^https?:\/\//.test(server) ? server.replace(/\/$/, '') : pds;
	} catch {
		return pds;
	}
}

export async function entryway(pds: string): Promise<string | null> {
	const server = await entrywayFor(pds);
	return server === pds ? null : server;
}

function assertPlcDid(did: string): void {
	if (!did.startsWith('did:plc:')) {
		throw { status: 400, message: `PLC operations are only available for did:plc identities, not ${did}` };
	}
}

export async function resolvePlcAuditLog(did: string): Promise<PlcLogEntry[]> {
	assertPlcDid(did);

	const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}/log/audit`);
	if (!res.ok) throw { status: 404, message: `No PLC audit log found for ${did}`, upstream: 'plc' };

	return res.json() as Promise<PlcLogEntry[]>;
}

export async function resolvePlcData(did: string): Promise<PlcData> {
	assertPlcDid(did);

	const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}/data`);
	if (!res.ok) throw { status: 404, message: `No PLC data found for ${did}`, upstream: 'plc' };

	return res.json() as Promise<PlcData>;
}

export async function resolvePlcLastOp(did: string): Promise<PlcOperation> {
	assertPlcDid(did);

	const res = await fetch(`${PLC_DIRECTORY}/${encodeURIComponent(did)}/log/last`);
	if (!res.ok) throw { status: 404, message: `No PLC operations found for ${did}`, upstream: 'plc' };

	return res.json() as Promise<PlcOperation>;
}

export async function resolveActor(actor: string): Promise<Actor> {
	const did = await resolveToDid(actor);
	const doc = await resolveDidDoc(did);
	const pds = pdsFromDidDoc(doc);
	const aka = doc.alsoKnownAs ?? [];
	const handle = aka.find((a) => a.startsWith('at://'))?.replace('at://', '') ?? did;
	return { did, doc, pds, handle };
}
