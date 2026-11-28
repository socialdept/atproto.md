// The brand art: the Open Graph card and the ATMD mark, as SVG strings (rasterizers do not read CSS variables).
import { FIGURES, OG_GLYPHS, TOOLS } from '../og-glyphs';
import { C, pixelBox } from './kit';

// 1200x630 social card: the MCP server answering a question about a post. The hub ("atproto.md/mcp" and its cursor)
// fans out to the seven tools on notched badges, with backlinks lit, over the question and the four counts it returned
// for a real bsky.app post, on a white to tray grey gradient. All text is outlined in src/og-glyphs.ts, so it renders
// the same without web fonts. scripts/gen-og.mjs rasterizes it to public/og.png.
export function ogImageSvg(): string {
	const BLUE = '#2a78d6';
	const g = (key: string) => OG_GLYPHS[key];
	const widthOf = (key: string, size: number) => (g(key).width * size) / g(key).upm;
	// A run placed in a CSS line box: the baseline sits where a browser puts it for that line height.
	const text = (key: string, x: number, lineTop: number, lineHeight: number, size: number, fill: string) => {
		const run = g(key);
		const s = size / run.upm;
		const baseline = lineTop + (lineHeight - (run.asc - run.desc) * s) / 2 + run.asc * s;
		return `<path transform="translate(${+x.toFixed(2)} ${+baseline.toFixed(2)}) scale(${+s.toFixed(5)})" d="${run.d}" fill="${fill}"/>`;
	};
	const box = (x: number, y: number, w: number, h: number, p: number, ins: number[], stroke: string, fill: string, sw: number) =>
		`<path d="${pixelBox(x, y, w, h, p, ins)}" fill="${stroke}"/><path d="${pixelBox(x + sw, y + sw, w - sw * 2, h - sw * 2, p, ins)}" fill="${fill}"/>`;

	// The hub, centered: 34px in on the left, 30px on the right, the cursor 6px after the text.
	const hubText = widthOf('hub', 30),
		hubW = 2 + 34 + hubText + 6 + 15 + 30,
		hubX = 600 - hubW / 2,
		hubY = 52;
	const hub =
		box(hubX, hubY, hubW, 83, 3, [3, 1, 1], C.ink, C.ink, 1) +
		text('hub', hubX + 35, hubY + 19, 45, 30, '#ffffff') +
		`<rect x="${(hubX + 35 + hubText + 6).toFixed(2)}" y="${hubY + 29.8}" width="15" height="23.4" rx="1.05" fill="#5b9be6"/>`;

	// The tools sit on an arc with even gaps between them, each tilted a little. Each badge is its text plus 15px a
	// side, drawn with the badge frame at twice its size, and its line meets the middle of its top edge.
	const tilts = [-3, 2, -1.5, 0, 2, -2, 3];
	const widths = TOOLS.map((t) => widthOf(t, 27) + 30);
	const gap = (1144 - 56 - widths.reduce((a, w) => a + w, 0)) / (TOOLS.length - 1);
	let left = 56,
		lines = '',
		badges = '';
	TOOLS.forEach((t, i) => {
		const w = widths[i],
			cx = left + w / 2,
			y = 232 + Math.sin((Math.PI * i) / (TOOLS.length - 1)) * 62;
		const lit = t === 'backlinks';
		lines += `<path d="M600 136C600 206 ${+cx.toFixed(2)} ${+(y - 70).toFixed(2)} ${+cx.toFixed(2)} ${+(y + 3).toFixed(2)}" fill="none" stroke="${lit ? BLUE : C.line}" stroke-width="2.5"/>`;
		badges +=
			`<g transform="rotate(${tilts[i]} ${+cx.toFixed(2)} ${+(y + 21).toFixed(2)})">` +
			box(cx - w / 2, y, w, 42, 6, [1], lit ? BLUE : C.line, '#ffffff', 2) +
			text(t, cx - widthOf(t, 27) / 2, y + 6, 30, 27, lit ? BLUE : C.muted) +
			'</g>';
		left += w + gap;
	});

	// The question, centered, then the counts in a card of four cells.
	const question = text('question', 600 - widthOf('question', 24) / 2, 386, 36, 24, C.muted);
	const cardY = 630 - 52 - 120.68,
		cell = (900 - 2) / 4;
	let cells = '';
	FIGURES.forEach(([n, l], i) => {
		const x = 151 + cell * i;
		if (i < 3) cells += `<rect x="${+(x + cell - 1).toFixed(2)}" y="${+(cardY + 1).toFixed(2)}" width="1" height="118.68" fill="${C.line}"/>`;
		cells += text(n, x + 22, cardY + 21, 49.68, 46, C.ink) + text(l, x + 22, cardY + 76.68, 23, 18, C.muted);
	});

	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <title>atproto.md MCP. Who replied to this post, and how many liked it?</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${C.tray}"/></linearGradient>
    <filter id="lift" x="-5%" y="-20%" width="110%" height="150%"><feDropShadow dx="0" dy="1" stdDeviation="0.5" flood-color="#000" flood-opacity="0.03"/><feDropShadow dx="0" dy="3" stdDeviation="1.5" flood-color="#000" flood-opacity="0.04"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${lines}${badges}${hub}
  ${question}
  <g filter="url(#lift)">${box(150, cardY, 900, 120.68, 3, [3, 1, 1], C.line, '#ffffff', 1)}</g>${cells}
</svg>
`;
}

// The mark: AT over MD in Beast by Fonderie.download (WTFPL, fonderie.download/beast.html), outlined to paths with
// its ss01 alternates (the rounder A and D), the same glyphs the page shows, since the page turns ss01 on for Inter.
// D sits one Beast pixel closer to M than the font spaces it, as in the header, so the gaps read as even.
// Beast is drawn on a 70-unit pixel grid with the cap top at y 0. At 2/70 one font pixel is 2 units of the 80-unit
// tile. Both rows start at the same left edge so A sits over M. MD is 27 font pixels wide, AT 26.
const BEAST_AT =
	'M70 175L70 525C70 547 83 560 105 560L175 560C197 560 210 573 210 595L210 665C210 687 223 700 245 700L597 700C619 700 630 687 630 665L630 596C630 576 646 560 666 560L734 560C754 560 770 576 770 596L770 664C770 684 786 700 806 700L1014 700C1034 700 1050 684 1050 664L1050 596C1050 576 1034 560 1014 560L946 560C926 560 910 544 910 524L910 176C910 156 894 140 874 140L806 140C786 140 770 124 770 104L770 36C770 16 754 0 734 0L245 0C223 0 210 13 210 35L210 105C210 127 197 140 175 140L105 140C83 140 70 153 70 175ZM350 525L350 175C350 153 363 140 385 140L594 140C614 140 630 156 630 176L630 524C630 544 614 560 594 560L385 560C363 560 350 547 350 525ZM1855 0L1085 0C1063 0 1050 13 1050 35L1050 245C1050 267 1063 280 1085 280L1155 280C1177 280 1190 267 1190 245L1190 175C1190 153 1203 140 1225 140L1295 140C1317 140 1330 153 1330 175L1330 525C1330 547 1317 560 1295 560L1225 560C1203 560 1190 573 1190 595L1190 665C1190 687 1203 700 1225 700L1715 700C1737 700 1750 687 1750 665L1750 595C1750 573 1737 560 1715 560L1645 560C1623 560 1610 547 1610 525L1610 175C1610 153 1623 140 1645 140L1715 140C1737 140 1750 153 1750 175L1750 245C1750 267 1763 280 1785 280L1855 280C1877 280 1890 267 1890 245L1890 35C1890 13 1877 0 1855 0Z';
const BEAST_MD =
	'M105 700L455 700C477 700 490 687 490 665L490 595C490 573 477 560 455 560L385 560C363 560 350 547 350 525L350 455C350 433 363 420 385 420L455 420C477 420 490 433 490 455L490 525C490 547 503 560 525 560L595 560C617 560 630 547 630 525L630 455C630 433 643 420 665 420L735 420C757 420 770 433 770 455L770 525C770 547 757 560 735 560L665 560C643 560 630 573 630 595L630 665C630 687 643 700 665 700L1015 700C1037 700 1050 687 1050 665L1050 595C1050 573 1037 560 1015 560L945 560C923 560 910 547 910 525L910 175C910 153 923 140 945 140L1015 140C1037 140 1050 127 1050 105L1050 35C1050 13 1037 0 1015 0L805 0C783 0 770 13 770 35L770 105C770 127 757 140 735 140L665 140C643 140 630 153 630 175L630 245C630 267 617 280 595 280L525 280C503 280 490 267 490 245L490 175C490 153 477 140 455 140L385 140C363 140 350 127 350 105L350 35C350 13 337 0 315 0L105 0C83 0 70 13 70 35L70 105C70 127 83 140 105 140L175 140C197 140 210 153 210 175L210 525C210 547 197 560 175 560L105 560C83 560 70 573 70 595L70 665C70 687 83 700 105 700ZM1155 700L1785 700C1807 700 1820 687 1820 665L1820 595C1820 573 1833 560 1855 560L1925 560C1947 560 1960 547 1960 525L1960 175C1960 153 1947 140 1925 140L1855 140C1833 140 1820 127 1820 105L1820 35C1820 13 1807 0 1785 0L1155 0C1133 0 1120 13 1120 35L1120 105C1120 127 1133 140 1155 140L1225 140C1247 140 1260 153 1260 175L1260 525C1260 547 1247 560 1225 560L1155 560C1133 560 1120 573 1120 595L1120 665C1120 687 1133 700 1155 700Z';

function markSvg(size = 64, bg = C.ink, fg = '#ffffff'): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 80 80">
  <path d="${pixelBox(0, 0, 80, 80, 6, [3, 1, 1])}" fill="${bg}"/>
  <path transform="translate(11 18) scale(${2 / 70})" d="${BEAST_AT}" fill="${fg}"/>
  <path transform="translate(11 42) scale(${2 / 70})" d="${BEAST_MD}" fill="${fg}"/>
</svg>
`;
}

export function faviconSvg(): string {
	return markSvg();
}
