// Pre-render the static Open Graph card (ogImageSvg in src/web/brand.ts) to a raster PNG.
// SVG og:image is rejected by several link-card scrapers (X, Facebook, iMessage),
// so we ship a PNG. The card has no per-request data, so a build-time render is enough.
//
// Usage:
//   1. npm run dev          (serves the live /og.svg the worker generates)
//   2. npm run og           (fetches it, rasterizes, writes public/og.png)
//
// Env overrides: OG_SVG_URL (default http://127.0.0.1:8787/og.svg, wrangler dev's port)
//
// Every word on the card is outlined in src/og-glyphs.ts, so the render needs no fonts.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.OG_SVG_URL ?? 'http://127.0.0.1:8787/og.svg';
const outPath = join(here, '..', 'public', 'og.png');

const res = await fetch(url).catch(() => null);
if (!res || !res.ok) {
	console.error(`Could not fetch ${url}. Is the dev server running? (npm run dev)`);
	process.exit(1);
}
const svg = await res.text();

const resvg = new Resvg(svg, {
	fitTo: { mode: 'width', value: 1200 },
	font: { loadSystemFonts: false },
});
const png = resvg.render().asPng();
writeFileSync(outPath, png);
console.log(`wrote public/og.png (${png.length} bytes) from ${url}`);
