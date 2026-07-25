import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import { formatShinyRate } from "@/lib/features/notifications/shinyRateFormat";
import { randomDespawnUnix } from "@/lib/features/notifications/testData";
import type { RaidTeam, RaidTemplateContext } from "@/lib/features/notifications/types";

export type RaidTestScenario = {
	id: string;
	label: string;
	context: RaidTemplateContext;
};

function shinyRateFields(
	shiny: number,
	total: number
): Pick<RaidTemplateContext, "shinyRatePercent" | "shinyRateFraction" | "shinyRateReduced"> {
	const rate = formatShinyRate({ shiny, total });
	return {
		shinyRatePercent: rate.percent,
		shinyRateFraction: rate.fraction,
		shinyRateReduced: rate.reduced
	};
}

const TEAM_NAMES: Record<RaidTeam, string> = {
	0: "Neutral",
	1: "Mystic",
	2: "Valor",
	3: "Instinct"
};
const TEAM_SLUGS: Record<RaidTeam, string> = {
	0: "neutral",
	1: "mystic",
	2: "valor",
	3: "instinct"
};

function teamFields(
	team: RaidTeam
): Pick<RaidTemplateContext, "teamId" | "teamName" | "teamEmoji"> {
	return {
		teamId: team,
		teamName: TEAM_NAMES[team],
		teamEmoji: discordEmojiTag(`team_${TEAM_SLUGS[team]}`)
	};
}

const bossBase: RaidTemplateContext = {
	isEgg: false,
	gymId: "abc123.16",
	gymName: "City Hall",
	gymUrl: "",
	...teamFields(3),
	level: 5,
	levelName: "Level 5",
	exRaidEligible: false,
	pokemonName: "Tyranitar",
	pokemonId: 248,
	form: 0,
	formName: "",
	costume: 0,
	gender: "Male",
	genderValue: 1,
	type1: "Rock",
	type2: "Dark",
	type1Emoji: discordEmojiTag("type_rock"),
	type2Emoji: discordEmojiTag("type_dark"),
	quickMove: "Bite",
	chargeMove: "Stone Edge",
	quickMoveEmoji: discordEmojiTag("type_dark"),
	chargeMoveEmoji: discordEmojiTag("type_rock"),
	...shinyRateFields(3, 250),
	evolutions: [],
	pokemonImageUrl: "attachment://pokemon.png",
	hatchTime: "",
	raidEndTime: "4:45:12 PM",
	despawnUnix: 1700003600,
	minutesLeft: 42,
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "",
	diademUrl: ""
};

const eggBase: RaidTemplateContext = {
	...bossBase,
	isEgg: true,
	level: 5,
	levelName: "Level 5",
	pokemonName: "",
	pokemonId: 0,
	form: 0,
	formName: "",
	gender: "",
	genderValue: null,
	type1: "",
	type2: "",
	type1Emoji: "",
	type2Emoji: "",
	quickMove: "",
	chargeMove: "",
	quickMoveEmoji: "",
	chargeMoveEmoji: "",
	...shinyRateFields(0, 0),
	evolutions: [],
	pokemonImageUrl: "",
	hatchTime: "3:45:12 PM",
	raidEndTime: ""
};

export const RAID_TEST_SCENARIOS: RaidTestScenario[] = [
	{ id: "egg", label: "Level 5 Egg", context: eggBase },
	{ id: "boss", label: "Level 5 Boss (Tyranitar)", context: bossBase },
	{
		id: "ex-raid",
		label: "EX Raid Boss (Mewtwo)",
		context: {
			...bossBase,
			level: 6,
			levelName: "Mega",
			exRaidEligible: true,
			pokemonName: "Mewtwo",
			pokemonId: 150,
			type1: "Psychic",
			type2: "",
			type1Emoji: discordEmojiTag("type_psychic"),
			type2Emoji: "",
			quickMove: "Confusion",
			chargeMove: "Psystrike",
			quickMoveEmoji: discordEmojiTag("type_psychic"),
			chargeMoveEmoji: discordEmojiTag("type_psychic"),
			...shinyRateFields(0, 40),
			...teamFields(1)
		}
	}
];

/** Generates a plausible-but-random raid context for previewing a template. */
export function randomizeRaidContext(): RaidTemplateContext {
	const isEgg = Math.random() < 0.4;
	const level = ([1, 3, 4, 5, 6] as const)[Math.floor(Math.random() * 5)];
	const team = Math.floor(Math.random() * 4) as RaidTeam;
	const despawnUnix = randomDespawnUnix();
	const minutesLeft = Math.max(1, Math.round((despawnUnix - Date.now() / 1000) / 60));

	if (isEgg) {
		return {
			...eggBase,
			level,
			levelName: level === 6 ? "Mega" : `Level ${level}`,
			...teamFields(team),
			despawnUnix,
			minutesLeft,
			hatchTime: new Date(despawnUnix * 1000).toLocaleTimeString()
		};
	}

	return {
		...bossBase,
		level,
		levelName: level === 6 ? "Mega" : `Level ${level}`,
		...teamFields(team),
		exRaidEligible: level === 6 && Math.random() < 0.3,
		despawnUnix,
		minutesLeft,
		raidEndTime: new Date(despawnUnix * 1000).toLocaleTimeString()
	};
}
