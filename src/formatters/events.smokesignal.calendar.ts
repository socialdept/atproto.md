import { formatDate } from '../utils';
import { register } from './registry';

register({
	'events.smokesignal.calendar.event': (record) => {
		const v = record.value;
		const locations = v.locations as Record<string, string>[] | undefined;
		return [
			`**Name:** ${(v.name as string) ?? 'Untitled'}`,
			v.startsAt ? `**Starts:** ${formatDate(v.startsAt)}` : null,
			v.endsAt ? `**Ends:** ${formatDate(v.endsAt)}` : null,
			locations?.length ? `**Location:** ${locations.map((l) => l.name ?? l.uri ?? String(l)).join(', ')}` : null,
			v.description ? `\n${v.description}` : null,
		]
			.filter(Boolean)
			.join('\n');
	},
});
