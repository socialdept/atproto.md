export interface DidService {
	id: string;
	type: string;
	serviceEndpoint: string;
}

export interface VerificationMethod {
	id: string;
	type: string;
}

export interface DidDocument {
	id: string;
	alsoKnownAs?: string[];
	service?: DidService[];
	verificationMethod?: VerificationMethod[];
}

export interface Actor {
	did: string;
	doc: DidDocument;
	pds: string;
	handle: string;
}

export interface RecordMeta {
	handle: string;
	collection: string;
	rkey: string;
	uri: string;
}

export interface AtpRecord {
	uri: string;
	cid?: string;
	value: Record<string, unknown>;
}

export type RecordFormatter = (record: AtpRecord, meta: RecordMeta) => string | null;
