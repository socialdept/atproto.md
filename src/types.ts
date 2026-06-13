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

export interface PlcOperation {
	type: string; // 'plc_operation' | 'create' (legacy) | 'plc_tombstone'
	sig?: string;
	prev?: string | null;
	services?: Record<string, { type: string; endpoint: string }>;
	alsoKnownAs?: string[];
	rotationKeys?: string[];
	verificationMethods?: Record<string, string>;
	// Legacy `create` operation fields
	handle?: string;
	service?: string;
	signingKey?: string;
	recoveryKey?: string;
}

export interface PlcLogEntry {
	did: string;
	operation: PlcOperation;
	cid: string;
	nullified: boolean;
	createdAt: string;
}

export interface PlcData {
	did: string;
	verificationMethods?: Record<string, string>;
	rotationKeys?: string[];
	alsoKnownAs?: string[];
	services?: Record<string, { type: string; endpoint: string }>;
}


export type RecordFormatter = (record: AtpRecord, meta: RecordMeta) => string | null;
