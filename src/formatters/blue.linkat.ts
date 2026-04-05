import { register } from './registry';

register({
	'blue.linkat.entry': (record) => {
		const v = record.value;
		return [
			v.title ? `**Title:** ${v.title}` : null,
			v.url ? `**URL:** [${v.url}](${v.url})` : null,
			v.description ? `\n> ${v.description}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},
});
