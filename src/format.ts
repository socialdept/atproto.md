import { getFormatter } from './formatters';
import type { AtpRecord, RecordMeta } from './types';

export function genericMd(value: unknown): string {
	const cleaned = stripType(value ?? null);
	return '```json\n' + JSON.stringify(cleaned, null, 2) + '\n```';
}

function stripType(value: unknown): unknown {
	if (value === null || value === undefined || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map(stripType);

	const obj = value as Record<string, unknown>;
	const result: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k === '$type') continue;
		result[k] = stripType(v);
	}
	return result;
}

export function formatRecord(record: AtpRecord, meta: RecordMeta): string {
	const formatter = getFormatter(meta.collection);
	const body = formatter ? formatter(record, meta) : genericMd(record.value ?? record);

	return [`## \`${meta.rkey}\``, `**Collection:** \`${meta.collection}\``, `**AT URI:** \`${meta.uri}\``, '', body].join('\n');
}
