import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import { formatShinyRate } from "@/lib/features/notifications/shinyRateFormat";
import { randomDespawnUnix } from "@/lib/features/notifications/testData";
import type { MaxBattleTemplateContext } from "@/lib/features/notifications/types";

export type MaxBattleTestScenario = {
	id: string;
	label: string;
	context: MaxBattleTemplateContext;
};

function shinyRateFields(
	shiny: number,
	total: number
): Pick<MaxBattleTemplateContext, "shinyRatePercent" | "shinyRateFraction" | "shinyRateReduced"> {
	const rate = formatShinyRate({ shiny, total });
	return {
		shinyRatePercent: rate.percent,
		shinyRateFraction: rate.fraction,
		shinyRateReduced: rate.reduced
	};
}

const dynamaxBase: MaxBattleTemplateContext = {
	stationId: "abc123.16",
	stationName: "City Hall",
	level: 3,
	gmax: false,
	gmaxYesNo: "No",
	pokemonName: "Machamp",
	pokemonId: 68,
	form: 0,
	formName: "",
	type1: "Fighting",
	type2: "",
	type1Emoji: discordEmojiTag("type_fighting"),
	type2Emoji: "",
	quickMove: "Counter",
	chargeMove: "Dynamic Punch",
	quickMoveEmoji: discordEmojiTag("type_fighting"),
	chargeMoveEmoji: discordEmojiTag("type_fighting"),
	...shinyRateFields(4, 300),
	evolutions: [],
	pokemonImageUrl: "attachment://pokemon.png",
	battleEndTime: "4:45:12 PM",
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

const gmaxBase: MaxBattleTemplateContext = {
	...dynamaxBase,
	level: 7,
	gmax: true,
	gmaxYesNo: "Yes",
	pokemonName: "Gigantamax Butterfree",
	pokemonId: 12,
	type1: "Bug",
	type2: "Flying",
	type1Emoji: discordEmojiTag("type_bug"),
	type2Emoji: discordEmojiTag("type_flying"),
	quickMove: "Bug Bite",
	chargeMove: "Bug Buzz",
	quickMoveEmoji: discordEmojiTag("type_bug"),
	chargeMoveEmoji: discordEmojiTag("type_bug"),
	...shinyRateFields(5, 200)
};

const noBossBase: MaxBattleTemplateContext = {
	...dynamaxBase,
	pokemonName: "",
	pokemonId: 0,
	formName: "",
	type1: "",
	type2: "",
	type1Emoji: "",
	type2Emoji: "",
	quickMove: "",
	chargeMove: "",
	quickMoveEmoji: "",
	chargeMoveEmoji: "",
	...shinyRateFields(0, 0),
	pokemonImageUrl: ""
};

export const MAXBATTLE_TEST_SCENARIOS: MaxBattleTestScenario[] = [
	{ id: "dynamax", label: "Dynamax Battle (Machamp)", context: dynamaxBase },
	{ id: "gmax", label: "Gigantamax Battle (Butterfree)", context: gmaxBase },
	{ id: "no-boss", label: "Station With No Active Battle", context: noBossBase }
];

/** Generates a plausible-but-random max battle context for previewing a template. */
export function randomizeMaxBattleContext(): MaxBattleTemplateContext {
	const gmax = Math.random() < 0.3;
	const base = gmax ? gmaxBase : dynamaxBase;
	const despawnUnix = randomDespawnUnix();
	const minutesLeft = Math.max(1, Math.round((despawnUnix - Date.now() / 1000) / 60));

	return {
		...base,
		despawnUnix,
		minutesLeft,
		battleEndTime: new Date(despawnUnix * 1000).toLocaleTimeString()
	};
}
