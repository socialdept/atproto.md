import type { StatsSnapshot } from '../../stats';
import { abbrevNum, bytesHuman, fmtNum } from '../../views';
import { COUNTRY_NAMES, WORLD_COLS, WORLD_LAND, WORLD_PATHS, WORLD_ROWS } from '../../world-grid';
import { esc } from '../kit';

export const ID_LABELS: Record<string, string> = { handle: 'Handle', plc: 'did:plc', web: 'did:web' };

// Categorical colors (validated with the dataviz palette checks: lightness, chroma, CVD and normal-vision separation).
// The green sits under 3:1 contrast on the page, so it always appears beside a text label.
export const VIZ = { http: '#2a78d6', mcp: '#1baf7a', earlier: '#94a3b8', errors: '#d03b3b', third: '#8b5cf6' };
// Status colors, kept apart from the categorical ones and always shown with their label.
const STATUS = { ok: '#13855c', redirect: '#94a3b8', client: '#c27c0e', server: '#d03b3b' };

/** The next round number at or above a value: 1, 2 or 5 times a power of ten. */
function niceCeiling(value: number): number {
	const power = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
	return ([1, 2, 5, 10].find((step) => step * power >= value) ?? 10) * power;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dayLabel = (day: string): string => DAY_FORMAT.format(new Date(`${day}T00:00:00Z`));

const percent = (n: number, total: number): string => {
	if (!total || !n) return '0%';
	const p = (n / total) * 100;
	return p < 1 ? '<1%' : `${Math.round(p)}%`;
};

interface Item {
	label: string;
	count: number;
	href?: string;
	mono?: boolean;
	/** Shown on hover, when the label is a short code. */
	title?: string;
}
export const items = (
	list: { key: string; count: number }[],
	label: (k: string) => string = (k) => k,
	href?: (k: string) => string,
	mono = true,
): Item[] => list.map((i) => ({ label: label(i.key), count: i.count, href: href?.(i.key), mono }));

/** One day per UTC date for the last n days, quiet days included, split into HTTP, MCP and not-split counts. */
function lastDays(stats: StatsSnapshot | null, n: number) {
	const recorded = new Map((stats?.daily ?? []).map((d) => [d.day, d]));
	const today = new Date();
	return Array.from({ length: n }, (_, i) => {
		const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (n - 1) + i));
		const day = d.toISOString().slice(0, 10);
		const r = recorded.get(day);
		const split = r ? r.http + r.mcp : 0;
		return { day, http: r?.http ?? 0, mcp: r?.mcp ?? 0, earlier: r ? Math.max(r.count - split, 0) : 0, errors: r?.errors ?? 0 };
	});
}
type Day = ReturnType<typeof lastDays>[number];
const dayTotal = (d: Day) => d.http + d.mcp + d.earlier;

/** A panel: a tray with a title and a one-line description, holding a white card. */
// A figure's value: a leading comparator and a trailing unit (ms, KB, %) get their own spans so phones can set them
// smaller, and the whole value stays on one line. Anything else is printed as it is.
export function figure(v: string): string {
	const m = /^([<>≥≤]=?)?\s*([\d,.]+[KMB]?)\s*(ms|B|KB|MB|GB|%)?$/.exec(v.trim());
	if (!m || (!m[1] && !m[3])) return esc(v);
	return `${m[1] ? `<span class="fig__op">${esc(m[1])}</span>` : ''}${esc(m[2])}${m[3] ? `<span class="fig__unit${m[3] === '%' ? ' fig__unit--pct' : ''}">${esc(m[3])}</span>` : ''}`;
}
export function panel(title: string, sub: string, body: string, cls = ''): string {
	return `<div class="tray panel${cls ? ' ' + cls : ''}"><div class="tray__head"><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div><div class="card">${body}</div></div>`;
}
export const emptyState = (text: string) => `<p class="empty-state">${text}</p>`;

/**
 * A segmented meter, the pixel version of a bar: 24 ticks, as many dark as the item's share of the whole, at least one
 * when it has any. Ranked lists use it, largest first.
 */
const TICKS = 24;
function meter(share: number, tone = 'ink'): string {
	const on = share > 0 ? Math.max(1, Math.round(share * TICKS)) : 0;
	return `<span class="ticks ticks--${tone}" style="--on:${on}" aria-hidden="true"></span>`;
}
export function meterList(list: Item[], opts: { tone?: string; all?: boolean; stacked?: boolean; empty: string }): string {
	if (!list.length) return emptyState(opts.empty);
	const total = list.reduce((n, i) => n + i.count, 0);
	const max = Math.max(1, ...list.map((i) => i.count));
	const rows = list
		.map((i) => {
			// Mono labels are routes and paths: a narrow row breaks them after a slash, never inside a segment.
			const text = i.mono ? esc(i.label).replace(/\/(?!\/)/g, '/<wbr>') : esc(i.label);
			const label = i.href ? `<a href="${esc(i.href)}">${text}</a>` : text;
			return `<li style="--share:${((i.count / max) * 100).toFixed(1)}%"><span class="m__label${i.mono ? ' mono' : ''}"${i.title ? ` title="${esc(i.title)}"` : ''}>${label}</span>${meter(i.count / total, opts.tone)}<span class="m__pct">${percent(i.count, total)}</span><span class="m__num" title="${fmtNum(i.count)}">${esc(abbrevNum(i.count))}</span></li>`;
		})
		.join('');
	return `<ol class="meters${opts.all ? '' : ' meters--scroll'}${opts.stacked ? ' meters--stacked' : ''}">${rows}</ol>`;
}

/** A segmented bar for one whole split into a few parts, each part labelled in the legend under it. */
export function splitBar(parts: { label: string; count: number; color: string }[], opts: { tall?: boolean; empty: string }): string {
	const total = parts.reduce((n, p) => n + p.count, 0);
	if (!total) return emptyState(opts.empty);
	const shown = parts.filter((p) => p.count > 0);
	const bar = shown
		.map(
			(p) =>
				`<span class="split__seg" style="flex:${p.count};background:${p.color}" title="${esc(p.label)}: ${fmtNum(p.count)}">${opts.tall && p.count / total >= 0.12 ? `<b>${percent(p.count, total)}</b>` : ''}</span>`,
		)
		.join('');
	const legend = shown
		.map(
			(p) =>
				`<li><i style="background:${p.color}"></i><span>${esc(p.label)}</span><b>${esc(abbrevNum(p.count))}</b><em>${percent(p.count, total)}</em></li>`,
		)
		.join('');
	return `<div class="split${opts.tall ? ' split--tall' : ''}" role="img" aria-label="${esc(shown.map((p) => `${p.label} ${percent(p.count, total)}`).join(', '))}">${bar}</div><ul class="legend">${legend}</ul>`;
}

/** The overview: the request total as the hero figure, a strip of the last 30 days, and the HTTP and MCP split. */
export function overview(stats: StatsSnapshot | null): string {
	const total = stats?.total ?? 0;
	const channel = (k: string): number => stats?.channels.find((c) => c.key === k)?.count ?? 0;
	const days = lastDays(stats, 30);
	const top = Math.max(1, ...days.map(dayTotal));
	const strip = days
		.map(
			(d) =>
				`<i${dayTotal(d) ? '' : ' class="z"'} style="height:${dayTotal(d) ? Math.max(12, (dayTotal(d) / top) * 100).toFixed(1) : 0}%" title="${esc(dayLabel(d.day))}: ${fmtNum(dayTotal(d))}"></i>`,
		)
		.join('');
	const since = stats?.since ? `Since ${esc(dayLabel(stats.since.slice(0, 10)))}, ${esc(stats.since.slice(0, 4))}` : 'No requests yet';

	const errors = stats?.errors ?? 0;
	const lat = stats?.latency;
	const tiles: [string, string, string][] = [
		['MCP sessions', abbrevNum(stats?.sessions ?? 0), 'Clients that connected'],
		['Error rate', total ? `${((errors / total) * 100).toFixed(1)}%` : '0%', `${fmtNum(errors)} failed requests`],
		[
			'Average latency',
			lat?.count ? `${fmtNum(lat.avgMs)} ms` : 'None yet',
			lat?.count ? `Median ${lat.p50}, p95 ${lat.p95}` : 'No timed requests',
		],
		['Served', bytesHuman(stats?.bytes ?? 0), `About ${abbrevNum(stats?.estTokens ?? 0)} tokens`],
		['Collections', fmtNum(stats?.distinctCollections ?? 0), 'Distinct NSIDs requested'],
		['Average response', bytesHuman(stats?.avgBytes ?? 0), 'Per request'],
	];

	return `<section class="overview">
    <div class="tray hero-tile"><div class="card">
      <div class="hero-tile__top"><div><p class="k">Requests</p><p class="hero-num" title="${fmtNum(total)}">${esc(fmtNum(total))}</p><p class="k-sub">${since}</p></div>
      <div class="strip" role="img" aria-label="Requests per day for the last 30 days">${strip}</div></div>
      ${splitBar(
				[
					{ label: 'HTTP', count: channel('http'), color: VIZ.http },
					{ label: 'MCP tool calls', count: channel('mcp'), color: VIZ.mcp },
				],
				{ empty: 'No requests yet.' },
			)}
    </div></div>
    <div class="tray"><div class="card tiles">
${tiles.map(([k, v, s]) => `      <div class="tile"><p class="k">${k}</p><p class="tile__num">${figure(v)}</p><p class="k-sub">${esc(s)}</p></div>`).join('\n')}
    </div></div>
  </section>`;
}

/** Requests per day as stacked bars, HTTP under MCP, for one range. Days counted before the split show in grey. */
function requestsPlot(days: Day[], range: string, active: boolean): string {
	const sum = (key: 'http' | 'mcp' | 'earlier' | 'errors') => days.reduce((n, d) => n + d[key], 0);
	const total = sum('http') + sum('mcp') + sum('earlier');
	const top = niceCeiling(Math.max(1, ...days.map(dayTotal)));
	const pct = (n: number) => ((n / top) * 100).toFixed(2);
	const cols = days
		.map((d) => {
			const segs = (
				[
					[d.http, VIZ.http],
					[d.mcp, VIZ.mcp],
					[d.earlier, VIZ.earlier],
				] as [number, string][]
			)
				.filter(([n]) => n > 0)
				.map(([n, color]) => `<span class="seg" style="height:max(${pct(n)}%,3px);background:${color}"></span>`)
				.join('');
			return `<div class="col" data-day="${esc(dayLabel(d.day))}" data-http="${d.http}" data-mcp="${d.mcp}" data-earlier="${d.earlier}" data-errors="${d.errors}">${segs}</div>`;
		})
		.join('');
	const figures: [string, number, string][] = [
		['HTTP', sum('http'), VIZ.http],
		['MCP', sum('mcp'), VIZ.mcp],
		['Errors', sum('errors'), VIZ.errors],
	];
	return `<div class="range" data-range="${range}"${active ? '' : ' hidden'}>
      <div class="chart__top">
        <div><p class="hero-num hero-num--md">${esc(fmtNum(total))}</p><p class="k-sub">${esc(dayLabel(days[0].day))} to ${esc(dayLabel(days[days.length - 1].day))}</p></div>
        <ul class="legend legend--inline">${figures.map(([label, n, color]) => `<li><i style="background:${color}"></i><span>${label}</span><b>${esc(abbrevNum(n))}</b></li>`).join('')}</ul>
      </div>
      <div class="plotgrid">
        <div class="axis" aria-hidden="true"><span>${esc(abbrevNum(top))}</span><span>${esc(abbrevNum(top / 2))}</span><span>0</span></div>
        <div class="plot" tabindex="0" role="img" aria-label="Requests per day, ${esc(fmtNum(total))} in all">
          <div class="cols cols--${days.length}">${cols}</div>
          <div class="tip" hidden></div>
        </div>
        <div class="dates" aria-hidden="true"><span>${esc(dayLabel(days[0].day))}</span><span>${esc(dayLabel(days[Math.floor(days.length / 2)].day))}</span><span>${esc(dayLabel(days[days.length - 1].day))}</span></div>
      </div>
    </div>`;
}

export function requestsChart(stats: StatsSnapshot | null): string {
	const month = lastDays(stats, 30);
	const hasEarlier = month.some((d) => d.earlier > 0);
	return `<div class="tray panel chart-panel"><div class="tray__head"><h3>Requests per day</h3>
      <div class="tabs" role="tablist" aria-label="Range"><button type="button" role="tab" aria-selected="false" data-show="7">7D</button><button type="button" role="tab" aria-selected="true" data-show="30">30D</button></div></div>
    <div class="card chart">
      ${requestsPlot(month.slice(-7), '7', false)}
      ${requestsPlot(month, '30', true)}
      ${hasEarlier ? '<p class="chart__note">Grey bars are days counted before HTTP and MCP were recorded separately.</p>' : ''}
    </div></div>`;
}

/** Latency as a histogram of the time buckets, one hue, with the median and p95 named above it. */
export function latencyHistogram(stats: StatsSnapshot | null): string {
	const lat = stats?.latency;
	if (!lat?.count) return emptyState('No timed requests yet.');
	const top = Math.max(1, ...lat.buckets.map((b) => b.count));
	const bars = lat.buckets
		.map(
			(b) =>
				`<div class="hist__col" data-count="${fmtNum(b.count)}" title="${esc(b.key)}: ${fmtNum(b.count)} (${percent(b.count, lat.count)})"><span style="height:${b.count ? Math.max(3, (b.count / top) * 100).toFixed(1) : 0}%"></span></div>`,
		)
		.join('');
	const labels = lat.buckets.map((b) => `<span>${esc(b.key.replace(/ms$/, ''))}</span>`).join('');
	return `<div class="hist__figures"><div><p class="k">Average</p><p class="tile__num">${figure(`${fmtNum(lat.avgMs)} ms`)}</p></div><div><p class="k">Median</p><p class="tile__num">${figure(lat.p50)}</p></div><div><p class="k">p95</p><p class="tile__num">${figure(lat.p95)}</p></div></div>
    <div class="hist" role="img" aria-label="Response times: ${esc(lat.buckets.map((b) => `${b.key} ${b.count}`).join(', '))}">${bars}</div>
    <div class="hist__labels" aria-hidden="true">${labels}</div><p class="k-sub hist__unit">Milliseconds</p>`;
}

/** Status codes: the split by class as a thin bar, then every code with its count. */
export function statusPanel(stats: StatsSnapshot | null): string {
	const codes = stats?.statuses ?? [];
	const cls = (c: string) => c.charAt(0);
	const sum = (k: string) => codes.filter((c) => cls(c.key) === k).reduce((n, c) => n + c.count, 0);
	const bar = splitBar(
		[
			{ label: 'Success, 2xx', count: sum('2'), color: STATUS.ok },
			{ label: 'Redirect, 3xx', count: sum('3'), color: STATUS.redirect },
			{ label: 'Client error, 4xx', count: sum('4'), color: STATUS.client },
			{ label: 'Server error, 5xx', count: sum('5'), color: STATUS.server },
		],
		{ empty: 'No requests yet.' },
	);
	if (!codes.length) return bar;
	const color = (k: string) =>
		({ '2': STATUS.ok, '3': STATUS.redirect, '4': STATUS.client, '5': STATUS.server })[cls(k)] ?? STATUS.redirect;
	const total = codes.reduce((n, c) => n + c.count, 0);
	const list = codes
		.map(
			(c) =>
				`<li><i style="background:${color(c.key)}"></i><span class="mono">${esc(c.key)}</span><b>${esc(fmtNum(c.count))}</b><em>${percent(c.count, total)}</em></li>`,
		)
		.join('');
	return `${bar}<ul class="codes">${list}</ul>`;
}

// Sequential blue for request counts by country, lightest for the fewest. One hue, so more always reads as darker.
const MAP_RAMP = ['#bcd4f3', '#86b0e8', '#4a88d9', '#1f5fae'];
const MAP_LAND = '#e6eaef';

/**
 * Requests by country on a pixel world map. The outlines come from scripts/world-grid.mjs with every corner rounded by
 * half a cell, the way Beast rounds its pixels: a lone cell is a dot, and cells that touch only at a corner stay apart.
 * Countries with requests are shaded on a log scale so one busy country does not wash out the rest, and each names
 * itself and its count on hover.
 */
export function worldMap(list: { key: string; count: number }[]): string {
	const max = Math.max(1, ...list.map((c) => c.count));
	const shade = (n: number) => (max <= 1 ? 3 : Math.min(3, Math.floor((Math.log(n) / Math.log(max)) * 3.999)));
	const layers: string[][] = [[], [], [], []];
	for (const c of list) {
		const d = WORLD_PATHS[c.key];
		if (!d) continue;
		const name = COUNTRY_NAMES[c.key] ?? c.key;
		layers[shade(c.count)].push(`<path d="${d}"><title>${esc(name)}: ${fmtNum(c.count)} requests</title></path>`);
	}
	return `<svg class="map" viewBox="-1 -1 ${WORLD_COLS + 2} ${WORLD_ROWS + 2}" role="img" aria-label="Requests by country on a world map">
      <path d="${WORLD_LAND}" fill="${MAP_LAND}"/>
      ${layers.map((paths, i) => (paths.length ? `<g class="map__layer" fill="${MAP_RAMP[i]}">${paths.join('')}</g>` : '')).join('')}
    </svg>
    <div class="map__legend"><span>Fewer</span>${MAP_RAMP.map((c) => `<i style="background:${c}"></i>`).join('')}<span>More requests</span></div>`;
}

/** MCP usage as four figures: sessions, tool calls, calls per session, and MCP's share of all requests. */
export function mcpUsage(stats: StatsSnapshot | null): string {
	const sessions = stats?.sessions ?? 0;
	const calls = stats?.channels.find((c) => c.key === 'mcp')?.count ?? 0;
	const total = stats?.total ?? 0;
	const figures: [string, string, string][] = [
		['Sessions', fmtNum(sessions), 'Clients that connected'],
		['Tool calls', fmtNum(calls), 'Across every session'],
		['Calls per session', sessions ? (calls / sessions).toFixed(1) : '0', 'On average'],
		['Share of requests', percent(calls, total), 'MCP, against all requests'],
	];
	return `<div class="mini-tiles">${figures.map(([k, v, sub]) => `<div><p class="k">${k}</p><p class="tile__num">${figure(v)}</p><p class="k-sub">${sub}</p></div>`).join('')}</div>`;
}

export function chips(list: { key: string; count: number }[], empty: string): string {
	if (!list.length) return emptyState(empty);
	return `<ul class="chipset">${list.map((p) => `<li><code>${esc(p.key)}</code><b>${esc(abbrevNum(p.count))}</b></li>`).join('')}</ul>`;
}
