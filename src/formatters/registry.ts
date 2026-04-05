import type { RecordFormatter } from '../types';

const registry = new Map<string, RecordFormatter>();

export function register(entries: Record<string, RecordFormatter>): void {
	for (const [collection, fn] of Object.entries(entries)) {
		registry.set(collection, fn);
	}
}

export function getFormatter(collection: string): RecordFormatter | undefined {
	return registry.get(collection);
}
