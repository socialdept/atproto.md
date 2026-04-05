export function formatDate(value: unknown): string {
	return value && typeof value === 'string' ? new Date(value).toUTCString() : 'Unknown';
}

const MIME_TO_EXT: Record<string, string> = {
	'image/png': '.png',
	'image/jpeg': '.jpg',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'image/svg+xml': '.svg',
	'image/avif': '.avif',
	'image/bmp': '.bmp',
	'image/tiff': '.tiff',
	'video/mp4': '.mp4',
	'video/webm': '.webm',
	'video/quicktime': '.mov',
	'audio/mpeg': '.mp3',
	'audio/ogg': '.ogg',
	'audio/wav': '.wav',
	'application/pdf': '.pdf',
	'application/json': '.json',
	'application/zip': '.zip',
	'application/gzip': '.gz',
	'application/xml': '.xml',
	'application/wasm': '.wasm',
	'application/octet-stream': '.bin',
	'text/html': '.html',
	'text/css': '.css',
	'text/javascript': '.js',
	'text/plain': '.txt',
	'text/markdown': '.md',
	'text/xml': '.xml',
	'text/csv': '.csv',
	'font/woff': '.woff',
	'font/woff2': '.woff2',
	'font/ttf': '.ttf',
	'font/otf': '.otf',
};

export function extFromMime(mimeType: unknown): string {
	if (!mimeType || typeof mimeType !== 'string') return '';
	return MIME_TO_EXT[mimeType] ?? '';
}
