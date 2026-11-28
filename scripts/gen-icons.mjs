// Renders the favicon mark (faviconSvg in src/web/brand.ts) to the raster icons that favicon fetchers, home screens and
// MCP clients ask for: favicon.ico with 32 and 48 pixel images, a 180 pixel apple-touch-icon, and 192 and 512 pixel
// PNGs. Some fetchers ignore an SVG icon, so the site ships both.
//
// Usage: npm run dev, then npm run icons. ICONS_SVG_URL overrides where the mark is fetched from.
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const url = process.env.ICONS_SVG_URL ?? 'http://127.0.0.1:8823/favicon.svg';
const res = await fetch(url).catch(() => null);
if (!res?.ok) {
	console.error(`Could not fetch ${url}. Is the dev server running? (npm run dev)`);
	process.exit(1);
}
const svg = await res.text();
const png = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng();

// An ICO file is a small directory of images. Each entry here holds a PNG, which every current reader accepts.
function ico(sizes) {
	const images = sizes.map((s) => [s, png(s)]);
	const head = Buffer.alloc(6 + 16 * images.length);
	head.writeUInt16LE(0, 0);
	head.writeUInt16LE(1, 2);
	head.writeUInt16LE(images.length, 4);
	let offset = head.length;
	images.forEach(([size, data], i) => {
		const at = 6 + 16 * i;
		head.writeUInt8(size % 256, at);
		head.writeUInt8(size % 256, at + 1);
		head.writeUInt16LE(1, at + 4);
		head.writeUInt16LE(32, at + 6);
		head.writeUInt32LE(data.length, at + 8);
		head.writeUInt32LE(offset, at + 12);
		offset += data.length;
	});
	return Buffer.concat([head, ...images.map(([, data]) => data)]);
}

writeFileSync(join(out, 'favicon.ico'), ico([32, 48]));
writeFileSync(join(out, 'apple-touch-icon.png'), png(180));
writeFileSync(join(out, 'icon-192.png'), png(192));
writeFileSync(join(out, 'icon-512.png'), png(512));
console.log('Wrote favicon.ico, apple-touch-icon.png, icon-192.png and icon-512.png to public/.');
