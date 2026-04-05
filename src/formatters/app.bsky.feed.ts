import { formatDate } from '../utils';
import { register } from './registry';

register({
	'app.bsky.feed.post': (record, meta) => {
		const v = record.value;
		const bskyUrl = `https://bsky.app/profile/${meta.handle}/post/${meta.rkey}`;
		const lines = [`**Date:** ${formatDate(v.createdAt)}`, ''];

		const reply = v.reply as Record<string, Record<string, string>> | undefined;
		if (reply) lines.push(`*\u21a9 Reply to \`${reply.parent?.uri}\`*`, '');

		lines.push((v.text as string) || '*[No text content]*');

		const embed = v.embed as Record<string, unknown> | undefined;
		if (embed?.external) {
			const ext = embed.external as Record<string, string>;
			lines.push('', `**Link:** [${ext.title || ext.uri}](${ext.uri})`);
			if (ext.description) lines.push(`> ${ext.description}`);
		}
		if (Array.isArray(embed?.images) && embed.images.length) {
			lines.push('', `**Images:** ${embed.images.map((i: Record<string, string>) => i.alt || 'image').join(', ')}`);
		}

		lines.push('', `[View on Bluesky \u2197](${bskyUrl})`);
		return lines.join('\n');
	},

	'app.bsky.feed.like': (record) => {
		const v = record.value;
		const subject = v.subject as Record<string, string> | undefined;
		return `**Likes:** \`${subject?.uri}\`\n**At:** ${formatDate(v.createdAt)}`;
	},

	'app.bsky.feed.repost': (record) => {
		const v = record.value;
		const subject = v.subject as Record<string, string> | undefined;
		return `**Reposts:** \`${subject?.uri}\`\n**At:** ${formatDate(v.createdAt)}`;
	},

	'app.bsky.feed.generator': (record) => {
		const v = record.value;
		return [
			`**Name:** ${(v.displayName as string) ?? 'Untitled'}`,
			`**DID:** \`${v.did}\``,
			`**Created:** ${formatDate(v.createdAt)}`,
			v.description ? `\n${v.description}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},
});
