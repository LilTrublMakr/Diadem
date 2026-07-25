import type { InvasionTemplateContext } from "@/lib/features/notifications/types";

export type InvasionTestScenario = {
	id: string;
	label: string;
	context: InvasionTemplateContext;
};

const gruntBase: InvasionTemplateContext = {
	pokestopId: "abc123.16",
	pokestopName: "City Hall",
	pokestopUrl: "",
	kind: "grunt",
	character: 8,
	characterName: "Grunt (Electric)",
	confirmed: true,
	lineup: [],
	expireUnix: 1700003600,
	minutesLeft: 42,
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "",
	diademUrl: ""
};

const unconfirmedGrunt: InvasionTemplateContext = {
	...gruntBase,
	character: 4,
	characterName: "Could be Giovanni…",
	confirmed: false
};

const leaderInvasion: InvasionTemplateContext = {
	...gruntBase,
	character: 44,
	characterName: "Giovanni",
	confirmed: true
};

const completedGrunt: InvasionTemplateContext = {
	...gruntBase,
	lineup: [
		{ pokemonName: "Magnemite", pokemonId: 81, form: 0 },
		{ pokemonName: "Voltorb", pokemonId: 100, form: 0 },
		{ pokemonName: "Electrike", pokemonId: 309, form: 0 }
	]
};

const kecleonIncident: InvasionTemplateContext = {
	...gruntBase,
	kind: "kecleon",
	character: 0,
	characterName: "",
	confirmed: false
};

const showcaseIncident: InvasionTemplateContext = {
	...gruntBase,
	kind: "showcase",
	character: 0,
	characterName: "",
	confirmed: false
};

const goldStopIncident: InvasionTemplateContext = {
	...gruntBase,
	kind: "goldStop",
	character: 0,
	characterName: "",
	confirmed: false
};

export const INVASION_TEST_SCENARIOS: InvasionTestScenario[] = [
	{ id: "grunt", label: "Grunt (Electric, confirmed)", context: gruntBase },
	{
		id: "unconfirmed",
		label: "Grunt (unconfirmed — could be Giovanni)",
		context: unconfirmedGrunt
	},
	{ id: "leader", label: "Team Leader (Giovanni)", context: leaderInvasion },
	{ id: "completed", label: "Completed Battle (with lineup)", context: completedGrunt },
	{ id: "kecleon", label: "Kecleon Incident", context: kecleonIncident },
	{ id: "showcase", label: "Showcase Incident", context: showcaseIncident },
	{ id: "gold-stop", label: "Gold Pokestop Incident", context: goldStopIncident }
];

const RANDOM_GRUNTS = [
	{ character: 6, name: "Grunt (Water)" },
	{ character: 8, name: "Grunt (Electric)" },
	{ character: 10, name: "Grunt (Fire)" },
	{ character: 44, name: "Giovanni" }
];

/** Generates a plausible-but-random invasion context for previewing a template. */
export function randomizeInvasionContext(): InvasionTemplateContext {
	const roll = Math.random();
	if (roll < 0.15) return { ...kecleonIncident };
	if (roll < 0.25) return { ...showcaseIncident };
	if (roll < 0.35) return { ...goldStopIncident };

	const grunt = RANDOM_GRUNTS[Math.floor(Math.random() * RANDOM_GRUNTS.length)];
	return { ...gruntBase, character: grunt.character, characterName: grunt.name };
}
