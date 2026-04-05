import { register } from './registry';

register({
	'link.woosh.linkPage': (record) => {
		const v = record.value;
		const collections = v.collections as Record<string, unknown>[] | undefined;
		const lines: string[] = [];

		if (v.description) lines.push(v.description as string, '');

		if (collections?.length) {
			for (const collection of collections) {
				if (collection.label) lines.push(`### ${collection.label}`, '');
				const links = collection.links as Record<string, string>[] | undefined;
				if (links?.length) {
					for (const link of links) {
						lines.push(`- [${link.title || link.uri}](${link.uri})`);
					}
					lines.push('');
				}
			}
		}

		return lines.join('\n') || '*Empty link page*';
	},
});
