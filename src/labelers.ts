// The known labelers, chosen by hand: moderation and safety services, AI media and screenshot labelers, and labelers
// that add context about an account. Badges people pick for themselves, games and labelers that do not answer are
// left out. "all" asks every one of these. To find candidates, run: npm run labelers
export interface KnownLabeler {
	did: string;
	handle: string;
	name: string;
}

/** Bluesky's moderation labeler, used when a lookup names no labelers. */
export const DEFAULT_LABELER = 'did:plc:ar7c4by46qjdydhdevvrndac';

export const LABELERS: KnownLabeler[] = [
	{
		did: 'did:plc:ar7c4by46qjdydhdevvrndac',
		handle: 'moderation.bsky.app',
		name: 'Bluesky Moderation Service',
	},
	{
		did: 'did:plc:d2mkddsbmnrgr3domzg5qexf',
		handle: 'moderation.blacksky.app',
		name: 'Blacksky Moderation',
	},
	{
		did: 'did:plc:p2cxrw3ank4dzs55mpm6ohq4',
		handle: 'moderation.northsky.social',
		name: 'Northsky Moderation',
	},
	{
		did: 'did:plc:fmug4zegnl7lf6ljp7aokpeh',
		handle: 'moderation.medsky.network',
		name: 'Medsky Moderation',
	},
	{
		did: 'did:plc:e4elbtctnfqocyfcml6h2lf7',
		handle: 'skywatch.blue',
		name: 'Skywatch Blue',
	},
	{
		did: 'did:plc:q2xsp2z6li7wlzet4ova2edb',
		handle: 'shadowbanner.bsky.social',
		name: 'The Shadowbanner',
	},
	{
		did: 'did:plc:uac6er53o2pvr5y2qmvaf7hw',
		handle: 'pef-moderation.org',
		name: 'Moderation Service',
	},
	{
		did: 'did:plc:bpkpvmwpd3nr2ry4btt55ack',
		handle: 'aimod.social',
		name: 'AI Imagery Labeler',
	},
	{
		did: 'did:plc:flwugseenu2x4o3h2ymutc3x',
		handle: 'labeler.blackwall.gg',
		name: 'AI Media Labeler',
	},
	{
		did: 'did:plc:newitj5jo3uel7o4mnf3vj2o',
		handle: 'xblock.aendra.dev',
		name: 'XBlock Screenshot Labeller',
	},
	{
		did: 'did:plc:i65enriuag7n5fgkopbqtkyk',
		handle: 'profile-labels.bossett.social',
		name: 'Profile Labeller',
	},
	{
		did: 'did:plc:oubsyca6hhgqhmbbk27lvs7c',
		handle: 'stechlab-labels.bsky.social',
		name: 'Account Activity Labeler',
	},
	{
		did: 'did:plc:uyauirpjzk6le4ygqzatcwnq',
		handle: 'pds.labeler.tny.im',
		name: 'Independent PDS Labeler',
	},
	{
		did: 'did:plc:lcdcygpdeiittdmdeddxwt4w',
		handle: 'laelaps.fyi',
		name: 'Laelaps',
	},
	{
		did: 'did:plc:3eivfiql4memqxkryeu4tqnk',
		handle: 'mod.shawn.party',
		name: 'Spoiler Droid',
	},
];
