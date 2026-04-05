import { formatDate } from '../utils';
import { register } from './registry';

register({
	'com.whtwnd.blog.entry': (record) => {
		const v = record.value;
		return [
			`**Title:** ${(v.title as string) ?? 'Untitled'}`,
			`**Date:** ${formatDate(v.createdAt)}`,
			v.visibility ? `**Visibility:** ${v.visibility}` : null,
			'',
			(v.content as string) ?? '*No content*',
		]
			.filter((l) => l !== null)
			.join('\n');
	},
});
