import { describe, expect, it } from 'vitest';
import { figure } from '../src/web/stats/components';
import { paramTable } from '../src/web/home/routes';

describe('figure', () => {
	it('splits a comparator and a unit off the number', () => {
		expect(figure('< 250ms')).toBe('<span class="fig__op">&lt;</span>250<span class="fig__unit">ms</span>');
		expect(figure('830.5 KB')).toBe('830.5<span class="fig__unit">KB</span>');
	});

	it('marks a percent sign so it sits tight against the number', () => {
		expect(figure('12.9%')).toBe('12.9<span class="fig__unit fig__unit--pct">%</span>');
	});

	it('prints a bare number or anything else as it is, escaped', () => {
		expect(figure('1,204')).toBe('1,204');
		expect(figure('n/a')).toBe('n/a');
		expect(figure('<b>')).toBe('&lt;b&gt;');
	});
});

describe('paramTable', () => {
	const param = (over: Record<string, string> = {}) => ({
		name: 'actor',
		in: 'path' as const,
		type: 'handle or DID',
		desc: 'The account.',
		...over,
	});

	it('leaves out the Default column when no parameter has one', () => {
		const html = paramTable('Path parameters', [param()]);
		expect(html).not.toContain('Default');
		expect(html).not.toContain('c-def');
	});

	it('shows the Default column when any parameter has one', () => {
		const html = paramTable('Query parameters', [param({ name: 'limit', def: '25' }), param({ name: 'cursor' })]);
		expect(html).toContain('<th class="c-def">Default</th>');
		expect(html.match(/<td class="c-def">/g)).toHaveLength(2);
	});

	it('lets a list of types break only after a comma', () => {
		const html = paramTable('Path parameters', [param({ type: 'at:// URI, DID or URL' })]);
		expect(html).toContain('<td class="c-type"><span>at:// URI</span>, <span>DID or URL</span></td>');
	});

	it('lets dotted names in a description break after a dot or colon', () => {
		const html = paramTable('Query parameters', [param({ desc: 'Such as app.bsky.feed.like:subject.uri.' })]);
		expect(html).toContain('app.<wbr>bsky.<wbr>feed.<wbr>like:<wbr>subject.<wbr>uri.');
	});

	it('returns nothing for an empty list', () => {
		expect(paramTable('Path parameters', [])).toBe('');
	});
});
