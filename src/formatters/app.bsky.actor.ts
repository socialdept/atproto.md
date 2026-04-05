import { register } from './registry';

register({
	'app.bsky.actor.profile': (record) => {
		const v = record.value;
		return [v.displayName ? `**Display Name:** ${v.displayName}` : null, v.description ? `\n${v.description}` : null]
			.filter(Boolean)
			.join('\n');
	},
});
