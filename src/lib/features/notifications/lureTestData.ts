import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import { randomDespawnUnix } from "@/lib/features/notifications/testData";
import type { LureTemplateContext } from "@/lib/features/notifications/types";

export type LureTestScenario = {
	id: string;
	label: string;
	context: LureTemplateContext;
};

const normalLure: LureTemplateContext = {
	pokestopId: "abc123.16",
	pokestopName: "City Hall",
	pokestopUrl: "",
	lureId: 501,
	lureTypeName: "Normal Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_normal"),
	expireUnix: 1700003600,
	minutesLeft: 27,
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "",
	diademUrl: ""
};

const goldenLure: LureTemplateContext = {
	...normalLure,
	lureId: 506,
	lureTypeName: "Golden Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_golden")
};

const rainyLure: LureTemplateContext = {
	...normalLure,
	lureId: 505,
	lureTypeName: "Rainy Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_rainy")
};

const glacialLure: LureTemplateContext = {
	...normalLure,
	lureId: 502,
	lureTypeName: "Glacial Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_glacial")
};

const mossyLure: LureTemplateContext = {
	...normalLure,
	lureId: 503,
	lureTypeName: "Mossy Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_mossy")
};

const magneticLure: LureTemplateContext = {
	...normalLure,
	lureId: 504,
	lureTypeName: "Magnetic Lure",
	lureTypeEmoji: discordEmojiTag("pstop_lure_magnetic")
};

export const LURE_TEST_SCENARIOS: LureTestScenario[] = [
	{ id: "normal", label: "Normal Lure", context: normalLure },
	{ id: "golden", label: "Golden Lure", context: goldenLure },
	{ id: "rainy", label: "Rainy Lure", context: rainyLure },
	{ id: "glacial", label: "Glacial Lure", context: glacialLure },
	{ id: "mossy", label: "Mossy Lure", context: mossyLure },
	{ id: "magnetic", label: "Magnetic Lure", context: magneticLure }
];

/** Generates a plausible-but-random lure context for previewing a template. */
export function randomizeLureContext(): LureTemplateContext {
	const bases = [normalLure, goldenLure, rainyLure, glacialLure, mossyLure, magneticLure];
	const base = bases[Math.floor(Math.random() * bases.length)];
	const expireUnix = randomDespawnUnix();
	const minutesLeft = Math.max(1, Math.round((expireUnix - Date.now() / 1000) / 60));

	return { ...base, expireUnix, minutesLeft };
}
