import { getFormatter } from './formatters';
import type { AtpRecord, RecordMeta } from './types';

export function genericMd(value: unknown, depth = 0): string {
	if (value === null || value === undefined) return '*null*';
	if (typeof value !== 'object') return String(value);

	if (Array.isArray(value)) {
		if (!value.length) return '*empty*';
		return value.map((v) => `- ${genericMd(v, depth + 1)}`).join('\n');
	}

	return Object.entries(value as Record<string, unknown>)
		.filter(([k]) => k !== '$type')
		.map(([k, v]) => {
			if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
				const inner = genericMd(v, depth + 1)
					.split('\n')
					.map((l) => '  ' + l)
					.join('\n');
				return depth === 0 ? `**${k}:**\n${inner}` : `*${k}:*\n${inner}`;
			}
			const label = depth === 0 ? `**${k}:**` : `*${k}:*`;
			return `${label} ${genericMd(v, depth + 1)}`;
		})
		.join('\n');
}

export function formatRecord(record: AtpRecord, meta: RecordMeta): string {
	const formatter = getFormatter(meta.collection);
	const body = formatter ? formatter(record, meta) : genericMd(record.value ?? record);

	return [`## \`${meta.rkey}\``, `**Collection:** \`${meta.collection}\``, `**AT URI:** \`${meta.uri}\``, '', body].join('\n');
}
