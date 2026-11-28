// Builds the pixel world map for the stats page into src/world-grid.ts: the world as a grid of cells, each cell
// tagged with the country (ISO 3166 alpha-2, the code Cloudflare reports) whose land covers its center.
//
// Country shapes come from Natural Earth (public domain) through world-atlas (ISC). A country too small to cover a
// cell center (Singapore, Malta, most islands) gets the cell under its centroid, so every country can light up.
// Antarctica is left out. Re-run after changing the grid size: npm run world:grid
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { feature } from 'topojson-client';
import { geoBounds, geoCentroid, geoContains } from 'd3-geo';
import countries from 'i18n-iso-countries';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const topo = JSON.parse(readFileSync(join(root, 'node_modules/world-atlas/countries-50m.json'), 'utf8'));
const world = feature(topo, topo.objects.countries);

// 2.5 degree cells from 180W to 180E and from 83N to 57S.
const CELL = 2.5,
	WEST = -180,
	NORTH = 83,
	SOUTH = -57;
const COLS = Math.round(360 / CELL),
	ROWS = Math.round((NORTH - SOUTH) / CELL);

const shapes = world.features
	.map((f) => ({ f, code: countries.numericToAlpha2(String(f.id).padStart(3, '0')), bounds: geoBounds(f) }))
	.filter((s) => s.code && s.code !== 'AQ');

const grid = new Map(); // "col,row" -> code
for (let row = 0; row < ROWS; row++) {
	const lat = NORTH - (row + 0.5) * CELL;
	for (let col = 0; col < COLS; col++) {
		const lon = WEST + (col + 0.5) * CELL;
		for (const s of shapes) {
			const [[w, sLat], [e, nLat]] = s.bounds;
			const inLon = w <= e ? lon >= w && lon <= e : lon >= w || lon <= e; // bounds can cross the antimeridian
			if (!inLon || lat < sLat || lat > nLat) continue;
			if (geoContains(s.f, [lon, lat])) {
				grid.set(`${col},${row}`, s.code);
				break;
			}
		}
	}
}

// Small countries: the cell under the centroid, unless a larger neighbor already holds it.
for (const s of shapes) {
	if ([...grid.values()].includes(s.code)) continue;
	const [lon, lat] = geoCentroid(s.f);
	const col = Math.min(COLS - 1, Math.max(0, Math.floor((lon - WEST) / CELL)));
	const row = Math.min(ROWS - 1, Math.max(0, Math.floor((NORTH - lat) / CELL)));
	if (!grid.has(`${col},${row}`)) grid.set(`${col},${row}`, s.code);
}

// Outlines of a set of cells with every corner rounded by half a cell, the way Beast rounds its pixels: a lone cell
// becomes a dot, a straight run gets round ends, and an inside corner is filled with a curve. Each cell contributes its
// four edges clockwise, shared edges cancel, and the rest are walked into loops. Where two cells touch only at a
// corner, the walk turns right, back into its own cell, so diagonal neighbors stay apart and their corners round away
// from each other.
const R = 0.5;
function rounded(cells) {
	const has = (c, r) => cells.has(`${c},${r}`);
	const out = new Map(); // "x,y" -> edges leaving that point
	const add = (x1, y1, x2, y2) => {
		const k = `${x1},${y1}`;
		if (!out.has(k)) out.set(k, []);
		out.get(k).push({ x1, y1, x2, y2, used: false });
	};
	for (const key of cells) {
		const [c, r] = key.split(',').map(Number);
		if (!has(c, r - 1)) add(c, r, c + 1, r);
		if (!has(c + 1, r)) add(c + 1, r, c + 1, r + 1);
		if (!has(c, r + 1)) add(c + 1, r + 1, c, r + 1);
		if (!has(c - 1, r)) add(c, r + 1, c, r);
	}
	const dir = (e) => [Math.sign(e.x2 - e.x1), Math.sign(e.y2 - e.y1)];
	// With y pointing down, a right turn from (dx, dy) heads to (-dy, dx).
	const turnRank = (a, b) => {
		const [ax, ay] = dir(a),
			[bx, by] = dir(b);
		if (bx === -ay && by === ax) return 0; // right
		if (bx === ax && by === ay) return 1; // straight
		return 2; // left
	};
	let d = '';
	for (const list of out.values()) {
		for (const start of list) {
			if (start.used) continue;
			const loop = [];
			let e = start;
			while (e && !e.used) {
				e.used = true;
				loop.push(e);
				const next = (out.get(`${e.x2},${e.y2}`) ?? []).filter((n) => !n.used);
				next.sort((a, b) => turnRank(e, a) - turnRank(e, b));
				e = next[0];
			}
			// Corners: points where the direction changes, with the turn's direction.
			const corners = [];
			for (let i = 0; i < loop.length; i++) {
				const a = loop[i],
					b = loop[(i + 1) % loop.length];
				const [ax, ay] = dir(a),
					[bx, by] = dir(b);
				if (ax === bx && ay === by) continue;
				corners.push({ x: a.x2, y: a.y2, in: [ax, ay], out: [bx, by], sweep: bx === -ay && by === ax ? 1 : 0 });
			}
			if (!corners.length) continue;
			const f = (n) => +n.toFixed(3);
			const first = corners[0];
			d += `M${f(first.x + first.out[0] * R)} ${f(first.y + first.out[1] * R)}`;
			for (let i = 1; i <= corners.length; i++) {
				const k = corners[i % corners.length];
				d += `L${f(k.x - k.in[0] * R)} ${f(k.y - k.in[1] * R)}A${R} ${R} 0 0 ${k.sweep} ${f(k.x + k.out[0] * R)} ${f(k.y + k.out[1] * R)}`;
			}
			d += 'Z';
		}
	}
	return d;
}

const byCountry = new Map();
for (const [key, code] of grid) {
	if (!byCountry.has(code)) byCountry.set(code, new Set());
	byCountry.get(code).add(key);
}
const paths = Object.fromEntries([...byCountry].map(([code, cells]) => [code, rounded(cells)]));
const land = rounded(new Set(grid.keys()));
// The short common name ("United States", "Russia") unless it has a comma, is only an abbreviation ("UK") or is
// shared by two countries (both Congos are "Congo"), then the official one.
const alias = (c) => countries.getName(c, 'en', { select: 'alias' });
const aliasCount = new Map();
for (const c of Object.keys(paths)) aliasCount.set(alias(c), (aliasCount.get(alias(c)) ?? 0) + 1);
const nameOf = (c) => {
	const a = alias(c);
	return a && a.length > 3 && !a.includes(',') && aliasCount.get(a) === 1 ? a : (countries.getName(c, 'en') ?? c);
};
const names = Object.fromEntries(Object.keys(paths).map((c) => [c, nameOf(c)]));

const file = `// Generated by scripts/world-grid.mjs from Natural Earth (public domain) via world-atlas (ISC). Do not edit by hand.
// The world as ${COLS} by ${ROWS} cells of ${CELL} degrees, all land as one rounded outline,
// and one rounded outline per country (ISO 3166 alpha-2).
export const WORLD_COLS = ${COLS};
export const WORLD_ROWS = ${ROWS};
export const WORLD_LAND = ${JSON.stringify(land)};
export const WORLD_PATHS: Record<string, string> = ${JSON.stringify(paths)};
export const COUNTRY_NAMES: Record<string, string> = ${JSON.stringify(names)};
`;
writeFileSync(join(root, 'src/world-grid.ts'), file);
console.log(`wrote src/world-grid.ts: ${grid.size} cells, ${Object.keys(paths).length} countries, ${file.length} bytes`);
