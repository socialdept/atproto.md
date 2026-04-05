import { register } from './registry';

function formatRef(label: string, ref: unknown): string {
	if (!ref) return `*No ${label} reference*`;
	const r = ref as Record<string, string>;
	return r.uri ? `**${label}:** \`${r.uri}\`` : `**${label}:** \`${ref}\``;
}

register({
	'app.offprint.publication': (record) => formatRef('Publication', record.value.publication),
	'app.offprint.document.article': (record) => formatRef('Document', record.value.document),
});
