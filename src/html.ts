// Browser- and crawler-facing HTML. The API itself returns raw JSON.
// These pages exist so link cards, search engines and people opening the site in a browser get a real page:
// the home page with a live request box, and the /stats dashboard. The look follows the Social Dept. apps:
// near-white slate, Inter, grey ledes, dark slate buttons, white cards in soft trays. The pages
// themselves live in src/web: kit (palette, icons, pixel frames), chrome (head, header, footer, shared scripts), brand
// (Open Graph card, mark, favicon), home and stats. This module routes to them.

export { faviconSvg, markSvg, ogImageSvg, BEAST_AT, BEAST_MD } from './web/brand';
export { pixelBox } from './web/kit';
export { htmlIndexPage } from './web/home/index';
export { htmlStatsPage } from './web/stats/index';

// Detect clients that should get HTML instead of markdown: real browsers (Accept: text/html) and
// link-unfurling or search crawlers (by User-Agent). curl and agents send Accept: */* and get markdown.
const CRAWLER_UA =
	/bot|crawler|spider|facebookexternalhit|slackbot|twitterbot|discordbot|whatsapp|linkedinbot|telegrambot|embedly|quora|pinterest|redditbot|applebot|googlebot|bingbot|skypeuripreview|vkshare|w3c_validator|mastodon|bluesky/i;

export function prefersHtml(request: Request): boolean {
	const accept = request.headers.get('Accept') ?? '';
	if (accept.includes('text/html')) return true;
	return CRAWLER_UA.test(request.headers.get('User-Agent') ?? '');
}

export function htmlResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Length': String(new TextEncoder().encode(body).length),
			'Cache-Control': 'public, max-age=300',
		},
	});
}

export function svgResponse(body: string): Response {
	return new Response(body, {
		headers: {
			'Content-Type': 'image/svg+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	});
}

export function robotsTxt(origin: string): string {
	return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

export function sitemapXml(origin: string): string {
	const urls = ['/', '/llms.txt', '/skill.md', '/stats'];
	const entries = urls.map((u) => `  <url><loc>${origin}${u === '/' ? '/' : u}</loc></url>`).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
