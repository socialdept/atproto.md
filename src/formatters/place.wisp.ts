import { extFromMime, formatDate } from '../utils';
import { register } from './registry';

interface FsEntry {
	name: string;
	node: {
		type: 'file' | 'directory';
		entries?: FsEntry[];
		mimeType?: string;
		blob?: { size?: number; ref?: Record<string, string> };
	};
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderTree(entries: FsEntry[], prefix = ''): string[] {
	const lines: string[] = [];
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const isLast = i === entries.length - 1;
		const connector = isLast ? '└── ' : '├── ';
		const childPrefix = isLast ? '    ' : '│   ';

		if (entry.node.type === 'directory') {
			lines.push(`${prefix}${connector}${entry.name}/`);
			if (entry.node.entries?.length) {
				lines.push(...renderTree(entry.node.entries, prefix + childPrefix));
			}
		} else {
			const size = entry.node.blob?.size ? ` (${formatSize(entry.node.blob.size)})` : '';
			const cid = entry.node.blob?.ref?.['$link'] ?? '';
			const ext = extFromMime(entry.node.mimeType);
			const cidSuffix = cid ? ` [${cid}]` : '';
			const extSuffix = ext ? ` (${ext})` : '';
			lines.push(`${prefix}${connector}${entry.name}${size}${cidSuffix}${extSuffix}`);
		}
	}
	return lines;
}

register({
	'place.wisp.fs': (record) => {
		const v = record.value;
		const root = v.root as { entries?: FsEntry[] } | undefined;
		const entries = root?.entries ?? [];

		const lines = [
			`**Site:** ${(v.site as string) ?? 'unknown'}`,
			`**Files:** ${v.fileCount ?? entries.length}`,
			`**Created:** ${formatDate(v.createdAt)}`,
		];

		if (entries.length) {
			lines.push('', '```', ...renderTree(entries), '```');
		}

		return lines.join('\n');
	},
});
