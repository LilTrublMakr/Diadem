import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import type { GymTemplateContext } from "@/lib/features/notifications/types";

export type GymTestScenario = {
	id: string;
	label: string;
	context: GymTemplateContext;
};

const teamTakeover: GymTemplateContext = {
	gymId: "abc123.16",
	gymName: "City Hall",
	gymUrl: "",
	teamId: 3,
	teamName: "Instinct",
	teamEmoji: discordEmojiTag("team_instinct"),
	oldTeamId: 1,
	oldTeamName: "Mystic",
	oldTeamEmoji: discordEmojiTag("team_mystic"),
	lastControllerId: 3,
	lastControllerName: "Instinct",
	slotsAvailable: 4,
	oldSlotsAvailable: 0,
	trainerCount: 2,
	oldTrainerCount: 6,
	inBattle: false,
	teamChanged: true,
	slotsChanged: true,
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "",
	diademUrl: ""
};

const slotChange: GymTemplateContext = {
	...teamTakeover,
	teamId: 3,
	oldTeamId: 3,
	oldTeamName: "Instinct",
	oldTeamEmoji: discordEmojiTag("team_instinct"),
	slotsAvailable: 3,
	oldSlotsAvailable: 4,
	trainerCount: 3,
	oldTrainerCount: 2,
	teamChanged: false,
	slotsChanged: true
};

const battleStarted: GymTemplateContext = {
	...teamTakeover,
	oldTeamId: 3,
	oldTeamName: "Instinct",
	oldTeamEmoji: discordEmojiTag("team_instinct"),
	slotsAvailable: 0,
	oldSlotsAvailable: 0,
	trainerCount: 6,
	oldTrainerCount: 6,
	inBattle: true,
	teamChanged: false,
	slotsChanged: false
};

const firstSighting: GymTemplateContext = {
	...teamTakeover,
	oldTeamId: -1,
	oldTeamName: "Unknown",
	oldTeamEmoji: "",
	oldSlotsAvailable: -1,
	oldTrainerCount: -1,
	lastControllerId: 3,
	teamChanged: true,
	slotsChanged: true
};

const wentNeutral: GymTemplateContext = {
	...teamTakeover,
	teamId: 0,
	teamName: "Neutral",
	teamEmoji: discordEmojiTag("team_neutral"),
	oldTeamId: 1,
	oldTeamName: "Mystic",
	oldTeamEmoji: discordEmojiTag("team_mystic"),
	lastControllerId: 1,
	lastControllerName: "Mystic",
	teamChanged: true
};

export const GYM_TEST_SCENARIOS: GymTestScenario[] = [
	{ id: "takeover", label: "Team Takeover (Mystic → Instinct)", context: teamTakeover },
	{ id: "slot-change", label: "Slot Change (no team change)", context: slotChange },
	{ id: "battle", label: "Battle Started (no team/slot change)", context: battleStarted },
	{
		id: "first-sighting",
		label: "First Sighting (unknown previous state)",
		context: firstSighting
	},
	{ id: "neutral", label: "Went Neutral (Uncontested)", context: wentNeutral }
];

/** Generates a plausible-but-random gym context for previewing a template. */
export function randomizeGymContext(): GymTemplateContext {
	const bases = [teamTakeover, slotChange, battleStarted, wentNeutral];
	return { ...bases[Math.floor(Math.random() * bases.length)] };
}
