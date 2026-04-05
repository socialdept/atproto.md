import { formatDate } from '../utils';
import { register } from './registry';

register({
	'app.bsky.graph.follow': (record) => {
		const v = record.value;
		return `**Follows:** \`${v.subject}\`\n**At:** ${formatDate(v.createdAt)}`;
	},

	'app.bsky.graph.block': (record) => {
		const v = record.value;
		return `**Blocks:** \`${v.subject}\`\n**At:** ${formatDate(v.createdAt)}`;
	},

	'app.bsky.graph.list': (record) => {
		const v = record.value;
		return [`**Name:** ${v.name}`, `**Purpose:** \`${v.purpose}\``, v.description ? `\n${v.description}` : null]
			.filter(Boolean)
			.join('\n');
	},

	'app.bsky.graph.listitem': (record) => {
		const v = record.value;
		return `**Subject:** \`${v.subject}\`\n**List:** \`${v.list}\`\n**At:** ${formatDate(v.createdAt)}`;
	},
});
