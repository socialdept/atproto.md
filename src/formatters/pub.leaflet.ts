import { formatDate } from '../utils';
import { register } from './registry';

register({
	'pub.leaflet.publication': (record) => {
		const v = record.value;
		return [
			`**Name:** ${(v.name as string) ?? 'Untitled'}`,
			v.base_path ? `**URL:** [${v.base_path}](https://${v.base_path})` : null,
		]
			.filter(Boolean)
			.join('\n');
	},

	'pub.leaflet.document': (record) => {
		const v = record.value;
		const pages = v.pages as Record<string, unknown>[] | undefined;
		const text = pages
			?.flatMap((page) => {
				const blocks = (page.blocks as Record<string, Record<string, unknown>>[]) ?? [];
				return blocks.map((b) => (b.block?.plaintext as string) ?? '').filter(Boolean);
			})
			.join('\n\n');

		return [
			`**Title:** ${(v.title as string) ?? 'Untitled'}`,
			v.publishedAt ? `**Published:** ${formatDate(v.publishedAt)}` : null,
			v.description ? `**Description:** ${v.description}` : null,
			v.publication ? `**Publication:** \`${v.publication}\`` : null,
			'',
			text || '*No content*',
		]
			.filter((l) => l !== null)
			.join('\n');
	},
});
