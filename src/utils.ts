export function formatDate(value: unknown): string {
	return value && typeof value === 'string' ? new Date(value).toUTCString() : 'Unknown';
}
