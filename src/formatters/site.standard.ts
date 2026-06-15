import { extFromMime, formatDate } from '../utils';
import { register } from './registry';

interface Blob {
	ref?: Record<string, string>;
	mimeType?: string;
	size?: number;
}

interface Contributor {
	did: string;
	role?: string;
	displayName?: string;
}

interface SelfLabels {
	values?: { val?: string }[];
}

function formatLabels(labels: unknown): string | null {
	const values = (labels as SelfLabels | undefined)?.values;
	if (!values?.length) return null;
	const vals = values.map((l) => l.val).filter(Boolean);
	return vals.length ? `**Labels:** ${vals.join(', ')}` : null;
}

function formatBlob(label: string, blob: unknown): string | null {
	const b = blob as Blob | undefined;
	const cid = b?.ref?.['$link'];
	if (!cid) return null;
	const ext = extFromMime(b?.mimeType);
	return `**${label}:** \`${cid}\`${ext ? ` (${ext})` : ''}`;
}

function formatContributors(contributors: unknown): string | null {
	const list = contributors as Contributor[] | undefined;
	if (!list?.length) return null;
	const lines = list.map((c) => {
		const name = c.displayName ?? c.did;
		const role = c.role ? ` (${c.role})` : '';
		const did = c.displayName ? ` \`${c.did}\`` : '';
		return `- ${name}${role}${did}`;
	});
	return ['**Contributors:**', ...lines].join('\n');
}

function fence(body: string, lang: string): string {
	const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((m) => m.length));
	const ticks = '`'.repeat(Math.max(3, longest + 1));
	return `${ticks}${lang}\n${body}\n${ticks}`;
}

function formatContent(content: unknown): string | null {
	const c = content as Record<string, unknown> | undefined;
	if (!c) return null;

	if (c.$type === 'at.markpub.markdown') {
		const markdown = (c.text as { markdown?: string } | undefined)?.markdown;
		return markdown ? `**Content:**\n${fence(markdown, 'markdown')}` : null;
	}

	return `**Content:**\n${fence(JSON.stringify(c, null, 2), 'json')}`;
}

register({
	'site.standard.publication': (record) => {
		const v = record.value;
		const prefs = v.preferences as Record<string, unknown> | undefined;
		return [
			`**Name:** ${(v.name as string) ?? 'Untitled'}`,
			v.url ? `**URL:** [${v.url}](${v.url})` : null,
			v.description ? `**Description:** ${v.description}` : null,
			formatBlob('Icon', v.icon),
			formatLabels(v.labels),
			prefs?.locale ? `**Locale:** ${prefs.locale}` : null,
			prefs?.showInDiscover === false ? `**Discoverable:** No` : null,
		]
			.filter((l) => l !== null)
			.join('\n');
	},

	'site.standard.document': (record) => {
		const v = record.value;
		const tags = (v.tags as string[] | undefined)?.filter(Boolean);
		const bskyRef = v.bskyPostRef as { uri?: string } | undefined;

		// Prefer the structured `content`; fall back to `textContent` only when content
		// is absent, so the article body isn't printed twice.
		const content = formatContent(v.content);
		const body = content ?? (v.textContent as string) ?? '*No content*';

		return [
			`**Title:** ${(v.title as string) ?? 'Untitled'}`,
			v.publishedAt ? `**Published:** ${formatDate(v.publishedAt)}` : null,
			v.updatedAt ? `**Updated:** ${formatDate(v.updatedAt)}` : null,
			v.description ? `**Description:** ${v.description}` : null,
			v.site ? `**Publication:** \`${v.site}\`` : null,
			v.path ? `**Path:** ${v.path}` : null,
			tags?.length ? `**Tags:** ${tags.join(', ')}` : null,
			formatLabels(v.labels),
			formatBlob('Cover Image', v.coverImage),
			bskyRef?.uri ? `**Bluesky Post:** \`${bskyRef.uri}\`` : null,
			formatContributors(v.contributors),
			'',
			body,
		]
			.filter((l) => l !== null)
			.join('\n');
	},
});
