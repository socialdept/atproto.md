import { formatDate } from '../utils';
import { register } from './registry';

register({
	'app.bsky.labeler.service': (record) => {
		const v = record.value;
		const policies = ((v.policies as Record<string, string[]>)?.labelValues as string[]) ?? [];
		return [
			`**Created:** ${formatDate(v.createdAt)}`,
			policies.length ? `**Label values:** ${policies.join(', ')}` : null,
			v.description ? `\n${v.description}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},
});
