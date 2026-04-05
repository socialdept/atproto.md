import { formatDate } from '../utils';
import { register } from './registry';

register({
	'site.standard.publication': (record) => {
		const v = record.value;
		return [
			`**Name:** ${(v.name as string) ?? 'Untitled'}`,
			v.url ? `**URL:** [${v.url}](${v.url})` : null,
			v.description ? `**Description:** ${v.description}` : null,
			(v.preferences as Record<string, unknown>)?.locale ? `**Locale:** ${(v.preferences as Record<string, unknown>).locale}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},

	'site.standard.document': (record) => {
		const v = record.value;
		return [
			`**Title:** ${(v.title as string) ?? 'Untitled'}`,
			v.publishedAt ? `**Published:** ${formatDate(v.publishedAt)}` : null,
			v.description ? `**Description:** ${v.description}` : null,
			v.site ? `**Publication:** \`${v.site}\`` : null,
			v.path ? `**Path:** ${v.path}` : null,
			'',
			(v.textContent as string) ?? '*No content*',
		]
			.filter((l) => l !== null)
			.join('\n');
	},
});
