import { describe, it, expect } from 'vitest';
import { formatDate } from '../src/utils';

describe('formatDate', () => {
	it('formats a valid ISO date string', () => {
		expect(formatDate('2025-01-15T12:00:00.000Z')).toBe('Wed, 15 Jan 2025 12:00:00 GMT');
	});

	it('returns Unknown for undefined', () => {
		expect(formatDate(undefined)).toBe('Unknown');
	});

	it('returns Unknown for null', () => {
		expect(formatDate(null)).toBe('Unknown');
	});

	it('returns Unknown for non-string values', () => {
		expect(formatDate(12345)).toBe('Unknown');
		expect(formatDate(true)).toBe('Unknown');
		expect(formatDate({})).toBe('Unknown');
	});

	it('returns Unknown for empty string', () => {
		expect(formatDate('')).toBe('Unknown');
	});
});
