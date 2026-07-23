import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import type { PokemonTemplateContext } from "@/lib/features/notifications/types";

export type TestScenario = {
	id: string;
	label: string;
	context: PokemonTemplateContext;
};

// Matches pokemonSizes in src/lib/utils/pokemonUtils.ts (1-indexed: XXS..XXL)
const SIZE_LABELS = ["XXS", "XS", "M", "XL", "XXL"];

const base: PokemonTemplateContext = {
	pokemonName: "Dratini",
	pokemonId: 147,
	form: 0,
	formName: "",
	costume: 0,
	gender: "Male",
	genderValue: 1,
	shiny: false,
	trackedShiny: false,
	trackedShinyYesNo: "No",
	trackedShinyEmoji: "",
	trackedHundo: false,
	trackedHundoYesNo: "No",
	trackedHundoEmoji: "",
	trackedNundo: false,
	trackedNundoYesNo: "No",
	trackedNundoEmoji: "",
	trackedShundo: false,
	trackedShundoYesNo: "No",
	trackedShundoEmoji: "",
	size: "M",
	sizeValue: 3,
	type1: "Dragon",
	type2: "",
	type1Emoji: "<:type_dragon:1528451201413414943>",
	type2Emoji: "",
	iv: 65,
	atk: 10,
	def: 10,
	sta: 9,
	cp: 412,
	level: 15,
	weight: 3.3,
	height: 1.8,
	weather: "None",
	weatherEmoji: "",
	quickMove: "Wrap",
	chargeMove: "Aqua Tail",
	quickMoveEmoji: "<:type_dragon:1528451201413414943>",
	chargeMoveEmoji: "<:type_water:1528451215795687504>",
	pvpGreatRank: null,
	pvpUltraRank: null,
	pvpLittleRank: 8,
	pvpLittle: [
		{ fullName: "Dratini", rank: 8, cp: 495, levelWithCap: "20.5" },
		{ fullName: "Dratini", rank: 14, cp: 489, levelWithCap: "19" }
	],
	pvpGreat: [],
	pvpUltra: [],
	despawnTime: "3:45:12 PM",
	despawnUnix: 1700000000,
	minutesLeft: 12,
	firstSeenTime: "3:33:12 PM",
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "attachment://map.png",
	diademUrl: "https://pogovt.com/pokemon/abc123",
	spawnpointId: "8d4f2a1b3c",
	pokestopId: "",
	pokestopName: "",
	username: "scanner01",
	evolutions: [{ fullName: "Dragonair", pokemonId: 148 }],
	pokemonImageUrl: "https://pogovt.com/assets/DEFAULT/pokemon/147.png"
};

export const TEST_SCENARIOS: TestScenario[] = [
	{ id: "boring", label: "Boring (low IV)", context: base },
	{
		id: "hundo",
		label: "Hundo",
		context: { ...base, iv: 100, atk: 15, def: 15, sta: 15, cp: 490, pokemonName: "Dratini" }
	},
	{
		id: "alt-form",
		label: "Alternate Form",
		context: {
			...base,
			pokemonName: "Alolan Raichu",
			pokemonId: 26,
			form: 62,
			formName: "Alolan",
			type1: "Electric",
			type2: "Psychic",
			type1Emoji: discordEmojiTag("type_electric"),
			type2Emoji: discordEmojiTag("type_psychic"),
			quickMove: "Volt Switch",
			chargeMove: "Psychic",
			quickMoveEmoji: discordEmojiTag("type_electric"),
			chargeMoveEmoji: discordEmojiTag("type_psychic"),
			cp: 1289,
			level: 22,
			iv: 78,
			evolutions: [],
			pokemonImageUrl: "https://pogovt.com/assets/DEFAULT/pokemon/26.f62.png"
		}
	},
	{
		id: "great-rank-1",
		label: "Great League Rank 1",
		context: {
			...base,
			pokemonName: "Azumarill",
			pokemonId: 184,
			cp: 1499,
			level: 26,
			iv: 91,
			pvpGreatRank: 1,
			pvpUltraRank: null,
			pvpLittleRank: null,
			pvpLittle: [],
			pvpGreat: [{ fullName: "Azumarill", rank: 1, cp: 1499, levelWithCap: "23" }],
			pvpUltra: []
		}
	},
	{
		id: "already-tracked",
		label: "Already tracked (this catch isn't a hundo)",
		// Demonstrates the distinction the "Have:" preset depends on: this catch is a boring
		// 65% IV roll, but the user has previously tracked a hundo of this species.
		context: {
			...base,
			trackedHundo: true,
			trackedHundoYesNo: "Yes",
			trackedHundoEmoji: "💯"
		}
	},
	{
		id: "weather-boosted",
		label: "Weather Boosted",
		context: {
			...base,
			weather: "Windy",
			weatherEmoji: "<:weather_windy:1528451148443422882>",
			pokemonName: "Dragonair",
			pokemonId: 148,
			cp: 1120,
			iv: 88
		}
	}
];

type RandomSpecies = {
	name: string;
	id: number;
	type1: string;
	type2: string;
	quickMove: string;
	chargeMove: string;
	// real next-stage evolution, or undefined if not evolvable/ambiguous (e.g. Eevee) —
	// never invent an unrelated species here, that's exactly the bug this fixes
	evolvesTo?: { fullName: string; pokemonId: number };
	// the one weather condition that actually boosts this species' primary type
	boostWeather: (typeof WEATHER_OPTIONS)[number];
};

const WEATHER_OPTIONS = [
	{ label: "None", slug: "" },
	{ label: "Sunny", slug: "sunny" },
	{ label: "Rain", slug: "rain" },
	{ label: "Partly Cloudy", slug: "partly_cloudy" },
	{ label: "Cloudy", slug: "cloudy" },
	{ label: "Windy", slug: "windy" },
	{ label: "Snow", slug: "snow" },
	{ label: "Fog", slug: "fog" }
] as const;

const NO_WEATHER = WEATHER_OPTIONS[0];
const SUNNY = WEATHER_OPTIONS[1];
const RAIN = WEATHER_OPTIONS[2];
const PARTLY_CLOUDY = WEATHER_OPTIONS[3];
const CLOUDY = WEATHER_OPTIONS[4];
const WINDY = WEATHER_OPTIONS[5];
const SNOW = WEATHER_OPTIONS[6];
const FOG = WEATHER_OPTIONS[7];

// Real Pokemon GO type -> boosting-weather pairs, so test data doesn't pair a
// Fighting-type with Snow (Snow boosts Ice/Steel, not Fighting).
const RANDOM_SPECIES: RandomSpecies[] = [
	{
		name: "Dratini",
		id: 147,
		type1: "dragon",
		type2: "",
		quickMove: "Wrap",
		chargeMove: "Aqua Tail",
		evolvesTo: { fullName: "Dragonair", pokemonId: 148 },
		boostWeather: WINDY
	},
	{
		name: "Charmander",
		id: 4,
		type1: "fire",
		type2: "",
		quickMove: "Ember",
		chargeMove: "Flame Burst",
		evolvesTo: { fullName: "Charmeleon", pokemonId: 5 },
		boostWeather: SUNNY
	},
	{
		name: "Bulbasaur",
		id: 1,
		type1: "grass",
		type2: "poison",
		quickMove: "Vine Whip",
		chargeMove: "Seed Bomb",
		evolvesTo: { fullName: "Ivysaur", pokemonId: 2 },
		boostWeather: SUNNY
	},
	{
		name: "Squirtle",
		id: 7,
		type1: "water",
		type2: "",
		quickMove: "Bubble",
		chargeMove: "Aqua Jet",
		evolvesTo: { fullName: "Wartortle", pokemonId: 8 },
		boostWeather: RAIN
	},
	{
		name: "Machop",
		id: 66,
		type1: "fighting",
		type2: "",
		quickMove: "Karate Chop",
		chargeMove: "Cross Chop",
		evolvesTo: { fullName: "Machoke", pokemonId: 67 },
		boostWeather: CLOUDY
	},
	{
		name: "Gastly",
		id: 92,
		type1: "ghost",
		type2: "poison",
		quickMove: "Lick",
		chargeMove: "Shadow Ball",
		evolvesTo: { fullName: "Haunter", pokemonId: 93 },
		boostWeather: FOG
	},
	{
		name: "Magnemite",
		id: 81,
		type1: "electric",
		type2: "steel",
		quickMove: "Spark",
		chargeMove: "Magnet Bomb",
		evolvesTo: { fullName: "Magneton", pokemonId: 82 },
		boostWeather: RAIN
	},
	{
		name: "Eevee",
		id: 133,
		type1: "normal",
		type2: "",
		quickMove: "Tackle",
		chargeMove: "Body Slam",
		// no single canonical next stage (8 possible eeveelutions) — leave unset
		boostWeather: PARTLY_CLOUDY
	},
	{
		name: "Growlithe",
		id: 58,
		type1: "fire",
		type2: "",
		quickMove: "Bite",
		chargeMove: "Flamethrower",
		evolvesTo: { fullName: "Arcanine", pokemonId: 59 },
		boostWeather: SUNNY
	},
	{
		name: "Staryu",
		id: 120,
		type1: "water",
		type2: "",
		quickMove: "Water Gun",
		chargeMove: "Power Gem",
		evolvesTo: { fullName: "Starmie", pokemonId: 121 },
		boostWeather: RAIN
	},
	{
		name: "Abra",
		id: 63,
		type1: "psychic",
		type2: "",
		quickMove: "Zen Headbutt",
		chargeMove: "Shadow Ball",
		evolvesTo: { fullName: "Kadabra", pokemonId: 64 },
		boostWeather: WINDY
	},
	{
		name: "Sandshrew",
		id: 27,
		type1: "ground",
		type2: "",
		quickMove: "Scratch",
		chargeMove: "Rock Tomb",
		evolvesTo: { fullName: "Sandslash", pokemonId: 28 },
		boostWeather: SUNNY
	},
	{
		name: "Zubat",
		id: 41,
		type1: "poison",
		type2: "flying",
		quickMove: "Bite",
		chargeMove: "Sludge Bomb",
		evolvesTo: { fullName: "Golbat", pokemonId: 42 },
		boostWeather: CLOUDY
	},
	{
		name: "Snorunt",
		id: 361,
		type1: "ice",
		type2: "",
		quickMove: "Powder Snow",
		chargeMove: "Icy Wind",
		evolvesTo: { fullName: "Glalie", pokemonId: 362 },
		boostWeather: SNOW
	},
	{
		name: "Larvitar",
		id: 246,
		type1: "rock",
		type2: "ground",
		quickMove: "Bite",
		chargeMove: "Stone Edge",
		evolvesTo: { fullName: "Pupitar", pokemonId: 247 },
		boostWeather: PARTLY_CLOUDY
	},
	{
		name: "Ralts",
		id: 280,
		type1: "psychic",
		type2: "fairy",
		quickMove: "Charm",
		chargeMove: "Shadow Ball",
		evolvesTo: { fullName: "Kirlia", pokemonId: 281 },
		boostWeather: WINDY
	}
];

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
	return arr[randomInt(0, arr.length - 1)];
}

// Avoids back-to-back repeats of the same species — with only a dozen or so
// entries, plain random.pick() repeats often enough to look broken.
let lastSpeciesId: number | null = null;

function pickSpecies(): RandomSpecies {
	const pool =
		RANDOM_SPECIES.length > 1
			? RANDOM_SPECIES.filter((s) => s.id !== lastSpeciesId)
			: RANDOM_SPECIES;
	const chosen = pick(pool);
	lastSpeciesId = chosen.id;
	return chosen;
}

// PVP league CP caps + typical level ranges for a competitively-ranked mon in that
// league — a "Little Cup" entry showing 2490 CP (real cap: 500) was the coherence bug.
const LEAGUE_CAPS = {
	little: { cp: 500, levelRange: [8, 25] as const },
	great: { cp: 1500, levelRange: [20, 40] as const },
	ultra: { cp: 2500, levelRange: [25, 45] as const }
};

function randomPvpEntries(
	species: string,
	league: keyof typeof LEAGUE_CAPS
): PokemonTemplateContext["pvpLittle"] {
	if (Math.random() < 0.4) return [];
	const { cp: capCp, levelRange } = LEAGUE_CAPS[league];
	const [minLevel, maxLevel] = levelRange;
	const count = randomInt(1, 2);
	return Array.from({ length: count }, (_, i) => ({
		fullName: species,
		rank: randomInt(1, 20) + i * 5,
		cp: randomInt(Math.round(capCp * 0.85), capCp),
		levelWithCap:
			Math.random() < 0.3
				? `${randomInt(minLevel, maxLevel)}.5*`
				: `${randomInt(minLevel, maxLevel)}`
	}));
}

function bestRank(entries: { rank: number }[]): number | null {
	return entries.length > 0 ? Math.min(...entries.map((e) => e.rank)) : null;
}

/** A despawn time 2-30 minutes from now — realistic for previews/test sends. */
export function randomDespawnUnix(): number {
	return Math.floor(Date.now() / 1000) + randomInt(120, 1800);
}

/** Generates a plausible-but-random pokemon context for previewing a template. */
export function randomizePokemonContext(): PokemonTemplateContext {
	const species = pickSpecies();
	// weather is coherent with the species' actual type (or "None" half the time) —
	// never an unrelated condition like Snow-boosted Machop
	const weather = Math.random() < 0.5 ? NO_WEATHER : species.boostWeather;
	// Biased toward 15/15/15 or 0/0/0 sometimes so `iv`/`atk`/`def`/`sta` previews show a
	// realistic hundo/nundo roll — true 15/15/15 or 0/0/0 rolls are 1-in-4096 organically.
	const forceHundo = Math.random() < 0.15;
	const forceNundo = !forceHundo && Math.random() < 0.1;
	const atk = forceHundo ? 15 : forceNundo ? 0 : randomInt(0, 15);
	const def = forceHundo ? 15 : forceNundo ? 0 : randomInt(0, 15);
	const sta = forceHundo ? 15 : forceNundo ? 0 : randomInt(0, 15);
	const level = randomInt(1, 40);
	const shiny = Math.random() < 0.1;
	// Tracked-collection status is per-user history, not a fact about this roll — randomized
	// independently so previews actually exercise the distinction (see applyTrackedBadges).
	const trackedHundo = Math.random() < 0.3;
	const trackedNundo = !trackedHundo && Math.random() < 0.15;
	const trackedShiny = Math.random() < 0.2;
	const trackedShundo = trackedHundo && trackedShiny;
	const pvpLittle = randomPvpEntries(species.name, "little");
	const pvpGreat = randomPvpEntries(species.name, "great");
	const pvpUltra = randomPvpEntries(species.name, "ultra");
	// CP has no basis in reality without per-species base stats, but it should at
	// least scale with level/IV instead of being a totally independent 10-3000 roll
	// (previously a level-1 mon could roll a level-40-tier CP and vice versa).
	const cp = Math.max(10, Math.round(level * 60 + (atk + def + sta) * 8));
	const sizeValue = randomInt(1, 5);
	const genderValue = pick([1, 2, 3] as const);

	return {
		...base,
		pokemonName: species.name + (shiny ? " ✨" : ""),
		pokemonId: species.id,
		form: 0,
		formName: "",
		costume: 0,
		gender: genderValue === 1 ? "Male" : genderValue === 2 ? "Female" : "Genderless",
		genderValue,
		shiny,
		trackedShiny,
		trackedShinyYesNo: trackedShiny ? "Yes" : "No",
		trackedShinyEmoji: trackedShiny ? "✨" : "",
		trackedHundo,
		trackedHundoYesNo: trackedHundo ? "Yes" : "No",
		trackedHundoEmoji: trackedHundo ? "💯" : "",
		trackedNundo,
		trackedNundoYesNo: trackedNundo ? "Yes" : "No",
		trackedNundoEmoji: trackedNundo ? "0️⃣" : "",
		trackedShundo,
		trackedShundoYesNo: trackedShundo ? "Yes" : "No",
		trackedShundoEmoji: trackedShundo ? "🌟" : "",
		size: SIZE_LABELS[sizeValue - 1],
		sizeValue,
		type1: species.type1,
		type2: species.type2,
		type1Emoji: discordEmojiTag(`type_${species.type1}`),
		type2Emoji: species.type2 ? discordEmojiTag(`type_${species.type2}`) : "",
		iv: Math.round(((atk + def + sta) / 45) * 100),
		atk,
		def,
		sta,
		cp,
		level,
		weight: Math.round(Math.random() * 200) / 10,
		height: Math.round(Math.random() * 20) / 10,
		weather: weather.label,
		weatherEmoji: weather.slug ? discordEmojiTag(`weather_${weather.slug}`) : "",
		quickMove: species.quickMove,
		chargeMove: species.chargeMove,
		quickMoveEmoji: discordEmojiTag(`type_${species.type1}`),
		chargeMoveEmoji: discordEmojiTag(`type_${species.type1}`),
		pvpLittle,
		pvpGreat,
		pvpUltra,
		pvpLittleRank: bestRank(pvpLittle),
		pvpGreatRank: bestRank(pvpGreat),
		pvpUltraRank: bestRank(pvpUltra),
		despawnUnix: randomDespawnUnix(),
		minutesLeft: randomInt(1, 60),
		// only this species' real next stage — never a random unrelated species
		evolutions: species.evolvesTo ? [species.evolvesTo] : [],
		pokemonImageUrl: `https://pogovt.com/assets/DEFAULT/pokemon/${species.id}.png`
	};
}
