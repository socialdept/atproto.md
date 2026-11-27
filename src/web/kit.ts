// The pieces every page draws with: the palette, HTML escaping, the Lucide icons and the stepped pixel frames.

// Palette in hex, shared by the pages and the SVG cards (rasterizers do not read CSS variables).
export const C = {
	bg: '#fcfcfd',
	ink: '#111822',
	muted: '#65758b',
	faint: '#94a3b8',
	line: '#e3e7ed',
	tray: '#f3f5f7',
	card: '#ffffff',
};

export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Lucide copy and check, solid strokes.
export const ICON_COPY =
	'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
export const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

// A nine-slice pixel frame as CSS: stepped corners (pixel size p, corner rows set in by ins) that stay fixed while
// the edges stretch, with the middle filled. The border keeps its width (bw) so layout and spacing do not change.
// The image is drawn wider than the border, over the element's own padding, which it fills with the same color.
export function pixelFrame(stroke: string, fill: string, p: number, ins: number[], sw = 1, bw = sw): string {
	const slice = Math.max(ins[0] ?? 0, ins.length) * p + Math.ceil(sw) + 2;
	const S = slice * 2 + 8;
	const outer = pixelBox(0, 0, S, S, p, ins),
		inner = pixelBox(sw, sw, S - sw * 2, S - sw * 2, p, ins);
	// fill 'none' draws only the outline: the inner shape is cut out of the outer one as a hole.
	const shapes =
		fill === 'none'
			? `<path d="${outer}${inner}" fill="${stroke}" fill-rule="evenodd"/>`
			: `<path d="${outer}" fill="${stroke}"/><path d="${inner}" fill="${fill}"/>`;
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${shapes}</svg>`;
	return `border: ${bw}px solid transparent; border-image: url("data:image/svg+xml,${encodeURIComponent(svg)}") ${slice} fill / ${slice}px stretch; background: none; border-radius: 0;`;
}
// Only the image of a frame, for hover and focus states that swap the fill.
export const frameSrc = (css: string): string => css.match(/url\("[^"]*"\)/)![0];
// Small controls get one notched pixel. Fields, cards and trays get the hub's pixel-circle corner (rows set in 3, 1, 1).
export const NOTCH = [3, [1]] as const;
export const CURVE = [3, [3, 1, 1]] as const;
export const CURVE_LARGE = [4, [3, 1, 1]] as const;
export const px = (stroke: string, fill: string, [p, ins]: readonly [number, readonly number[]], sw?: number, bw?: number) =>
	pixelFrame(stroke, fill, p, [...ins], sw, bw);

// A box with pixel corners and every vertex rounded by half a pixel, the way Beast rounds its pixels. ins lists how
// far each pixel row of a corner is set in, top row first. Used for the host badge image.
export function pixelBox(x: number, y: number, w: number, h: number, p: number, ins: number[]): string {
	const corner: [number, number][] = [[ins[0] ?? 0, 0]];
	let cur = ins[0] ?? 0;
	for (let i = 1; i <= ins.length; i++) {
		const next = ins[i] ?? 0;
		if (next !== cur) {
			corner.push([cur, i], [next, i]);
			cur = next;
		}
	}
	const r = x + w,
		b = y + h;
	const pts: [number, number][] = [
		...corner.map(([n, row]): [number, number] => [r - n * p, y + row * p]),
		...[...corner].reverse().map(([n, row]): [number, number] => [r - n * p, b - row * p]),
		...corner.map(([n, row]): [number, number] => [x + n * p, b - row * p]),
		...[...corner].reverse().map(([n, row]): [number, number] => [x + n * p, y + row * p]),
	];
	const round = (v: number) => +v.toFixed(2);
	return (
		pts
			.map((v, i) => {
				const a = pts[(i - 1 + pts.length) % pts.length],
					c = pts[(i + 1) % pts.length];
				const l1 = Math.hypot(v[0] - a[0], v[1] - a[1]) || 1,
					l2 = Math.hypot(c[0] - v[0], c[1] - v[1]) || 1;
				const r1 = Math.min(p / 2, l1 / 2),
					r2 = Math.min(p / 2, l2 / 2);
				const from = [v[0] - ((v[0] - a[0]) / l1) * r1, v[1] - ((v[1] - a[1]) / l1) * r1];
				const to = [v[0] + ((c[0] - v[0]) / l2) * r2, v[1] + ((c[1] - v[1]) / l2) * r2];
				return `${i ? 'L' : 'M'}${round(from[0])},${round(from[1])}Q${v[0]},${v[1]} ${round(to[0])},${round(to[1])}`;
			})
			.join('') + 'Z'
	);
}
