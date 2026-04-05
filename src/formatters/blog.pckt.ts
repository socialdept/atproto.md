import { register } from './registry';

register({
	'blog.pckt.publication': (record) => {
		const ref = record.value.publication as Record<string, string> | undefined;
		if (!ref) return '*No publication reference*';
		return ref.uri ? `**Publication:** \`${ref.uri}\`` : `**Publication:** \`${ref}\``;
	},
});
