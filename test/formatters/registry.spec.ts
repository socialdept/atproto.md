import { describe, it, expect } from 'vitest';
import { getFormatter } from '../../src/formatters/registry';

// Ensure all formatters are registered
import '../../src/formatters';

describe('formatter registry', () => {
	it('returns undefined for unregistered collections', () => {
		expect(getFormatter('com.example.does.not.exist')).toBeUndefined();
	});

	const expectedCollections = [
		'app.bsky.feed.post',
		'app.bsky.feed.like',
		'app.bsky.feed.repost',
		'app.bsky.feed.generator',
		'app.bsky.actor.profile',
		'app.bsky.graph.follow',
		'app.bsky.graph.block',
		'app.bsky.graph.list',
		'app.bsky.graph.listitem',
		'app.bsky.labeler.service',
		'app.offprint.publication',
		'app.offprint.document.article',
		'blog.pckt.publication',
		'blue.linkat.entry',
		'events.smokesignal.calendar.event',
		'link.woosh.linkPage',
		'pub.leaflet.publication',
		'pub.leaflet.document',
		'site.standard.publication',
		'site.standard.document',
	];

	it.each(expectedCollections)('has a formatter registered for %s', (collection) => {
		expect(getFormatter(collection)).toBeDefined();
	});
});
