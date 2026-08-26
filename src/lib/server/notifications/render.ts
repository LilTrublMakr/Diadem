import { getNormalizedForm, getPokemonSize, typeIdToText } from "@/lib/utils/pokemonUtils";
import {
	loadRemoteLocale,
	mCharacter,
	mItem,
	mMove,
	mPokemon,
	mWeather
} from "@/lib/services/ingameLocale";
import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import type { MasterMove } from "@/lib/types/masterfile";
import { getClientConfig } from "@/lib/services/config/config.server";
import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import { formatShinyRate } from "@/lib/features/notifications/shinyRateFormat";
import { isMapImageConfigured } from "@/lib/server/notifications/mapImage";
import { getShinyRate } from "@/lib/server/provider/shinyRateProvider";
import { featuredAttackProvider } from "@/lib/server/provider/featuredAttackProvider";
import { findActiveFeaturedAttack } from "@/lib/utils/featuredAttack";
import { registerNotificationHelpers } from "@/lib/features/notifications/handlebarsHelpers";
import type {
	GolbatInvasionMessage,
	GolbatLureMessage,
	GolbatMaxBattleMessage,
	GolbatPokemonMessage,
	GolbatPvpEntry,
	GolbatQuestMessage,
	GolbatQuestReward,
	GolbatRaidMessage
} from "@/lib/server/notifications/golbatTypes";
import type {
	EmbedTemplate,
	GymTemplateContext,
	InvasionKindFilter,
	InvasionTemplateContext,
	LureTemplateContext,
	MaxBattleTemplateContext,
	PokemonTemplateContext,
	PvpEntryContext,
	QuestRewardTypeFilter,
	QuestTemplateContext,
	RaidTeam,
	RaidTemplateContext
} from "@/lib/features/notifications/types";
import Handlebars from "handlebars";

registerNotificationHelpers(Handlebars);

function bestRank(entries: GolbatPvpEntry[] | undefined): number | null {
	if (!entries || entries.length === 0) return null;
	const ranks = entries.map((e) => e.rank).filter((r) => Number.isInteger(r) && r > 0);
	return ranks.length > 0 ? Math.min(...ranks) : null;
}

function normalizeGenderValue(gender: number | null | undefined): 1 | 2 | 3 {
	if (gender === 1) return 1;
	if (gender === 2) return 2;
	return 3;
}

function genderLabel(gender: number | null | undefined): string {
	const value = normalizeGenderValue(gender);
	if (value === 1) return "Male";
	if (value === 2) return "Female";
	return "Genderless";
}

// Matches the emoji names uploaded from /uicons/weather (see discordEmoji.ts)
const WEATHER_SLUGS: Record<number, string> = {
	1: "sunny",
	2: "rain",
	3: "partly_cloudy",
	4: "cloudy",
	5: "windy",
	6: "snow",
	7: "fog"
};

function moveTypeEmoji(moves: MasterMove[] | undefined, moveId: number | null | undefined): string {
	if (!moveId) return "";
	const move = moves?.find((m) => m.id === moveId);
	if (!move) return "";
	return discordEmojiTag(`type_${typeIdToText(move.type)}`);
}

// "*" flags rankings only reachable at a level cap (mega/XL-candy restricted) —
// mirrors the `capped` flag Golbat's own pvp entries carry.
function buildPvpEntries(entries: GolbatPvpEntry[] | undefined): PvpEntryContext[] {
	if (!entries) return [];
	return entries
		.filter((e) => Number.isInteger(e.rank) && e.rank > 0)
		.sort((a, b) => a.rank - b.rank)
		.map((e) => ({
			fullName: mPokemon({ pokemon_id: e.pokemon, form: getNormalizedForm(e.pokemon, e.form) }),
			rank: e.rank,
			cp: e.cp,
			levelWithCap: e.capped ? `${e.level}*` : `${e.level}`
		}));
}

// Every other family member (pre-evolutions AND post-evolutions), not just the immediate next
// stage — e.g. catching Dratini lists Dragonair AND Dragonite, catching Dragonair lists both
// Dratini and Dragonite. Ordered root-first via the same family-grouping + evolution-chain walk
// src/routes/(custom)/pokedex/[id]/+page.svelte uses for its "Evolution Family" section.
function buildEvolutionFamily(pokemonId: number): { fullName: string; pokemonId: number }[] {
	const mf = getMasterFile();
	const base = mf?.pokemon[String(pokemonId)];
	if (!mf || !base) return [];

	const members = new Map<number, { evolutions?: { pokemonId: number }[] }>();
	for (const [idStr, p] of Object.entries(mf.pokemon)) {
		if (p.family === base.family) members.set(Number(idStr), p);
	}
	if (members.size <= 1) return [];

	const allEvoTargets = new Set<number>();
	for (const p of members.values()) {
		for (const evo of p.evolutions ?? []) allEvoTargets.add(evo.pokemonId);
	}
	const rootId = [...members.keys()].find((id) => !allEvoTargets.has(id)) ?? pokemonId;

	const order: number[] = [];
	const seen = new Set<number>();
	function walk(id: number) {
		if (seen.has(id)) return;
		seen.add(id);
		order.push(id);
		for (const evo of members.get(id)?.evolutions ?? []) {
			if (members.has(evo.pokemonId)) walk(evo.pokemonId);
		}
	}
	walk(rootId);
	for (const id of members.keys()) walk(id); // stragglers not reached from root, just in case

	return order
		.filter((id) => id !== pokemonId)
		.map((id) => ({
			fullName: mPokemon({ pokemon_id: id, form: getNormalizedForm(id, 0) }),
			pokemonId: id
		}));
}

export async function buildPokemonContext(
	message: GolbatPokemonMessage,
	thisFetch: typeof fetch = fetch
): Promise<PokemonTemplateContext> {
	const clientConfig = getClientConfig();

	// mIngame()'s translated strings (mPokemon/mMove/mWeather below) come from an ambient
	// cache normally primed by a page load — this route has no page load, so it must load it
	// itself (same pattern as thumbnail.png/+server.ts and the share-link pages).
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const iv =
		message.individual_attack != null &&
		message.individual_defense != null &&
		message.individual_stamina != null
			? Math.round(
					((message.individual_attack + message.individual_defense + message.individual_stamina) /
						45) *
						100
				)
			: null;

	const despawn = new Date(message.disappear_time * 1000);
	const minutesLeft = Math.max(0, Math.round((message.disappear_time * 1000 - Date.now()) / 60000));
	const firstSeen = message.first_seen ? new Date(message.first_seen * 1000) : null;

	// Golbat's raw form id often IS the species' "default"/"Normal" form rather than 0 — every
	// other query in this app normalizes before using form for display (queryPokemon.ts etc.),
	// otherwise mPokemon() appends a redundant "(Normal)" suffix to species with no real
	// alternate forms.
	const form = getNormalizedForm(message.pokemon_id, message.form ?? 0);
	const master = getMasterPokemon(message.pokemon_id, form);
	const formName = form ? (master?.name ?? "") : "";
	const type1 = typeIdToText(master?.types?.[0]);
	const type2 = master?.types?.[1] ? typeIdToText(master.types[1]) : "";
	const evolutions = buildEvolutionFamily(message.pokemon_id);
	const featuredAttack = findActiveFeaturedAttack(
		await featuredAttackProvider.get(),
		message.pokemon_id,
		form
	);

	const atk = message.individual_attack ?? null;
	const def = message.individual_defense ?? null;
	const sta = message.individual_stamina ?? null;
	const shiny = !!message.shiny;
	const shinyRate = formatShinyRate(await getShinyRate(message.pokemon_id, form));

	const diademBaseUrl = clientConfig.general.url;

	return {
		pokemonName: mPokemon({
			pokemon_id: message.pokemon_id,
			form,
			shiny: message.shiny
		}),
		pokemonId: message.pokemon_id,
		form,
		formName,
		costume: message.costume ?? 0,
		gender: genderLabel(message.gender),
		genderValue: normalizeGenderValue(message.gender),
		shiny,
		shinyRatePercent: shinyRate.percent,
		shinyRateFraction: shinyRate.fraction,
		shinyRateReduced: shinyRate.reduced,
		size: message.size != null ? getPokemonSize(message.size) : "?",
		sizeValue: message.size ?? null,
		type1,
		type2,
		type1Emoji: discordEmojiTag(`type_${type1}`),
		type2Emoji: type2 ? discordEmojiTag(`type_${type2}`) : "",
		iv,
		atk,
		def,
		sta,
		cp: message.cp ?? null,
		level: message.pokemon_level ?? null,
		weight: message.weight ?? null,
		height: message.height ?? null,
		// Golbat sends weather: 0 for "no boost" — mWeather(0) falls through to its generic
		// "Unknown Weather" fallback (meant for an unrecognized id, not "none"), which broke the
		// `{{#if (isnt weather "None")}}` weather-boost preset (always true, since "Unknown
		// Weather" never equals "None"). "None" here is the literal templates check against.
		weather: message.weather ? mWeather(message.weather) : "None",
		weatherEmoji:
			message.weather && WEATHER_SLUGS[message.weather]
				? discordEmojiTag(`weather_${WEATHER_SLUGS[message.weather]}`)
				: "",
		quickMove: mMove(message.move_1),
		chargeMove: mMove(message.move_2),
		quickMoveEmoji: moveTypeEmoji(master?.quickMoves, message.move_1),
		chargeMoveEmoji: moveTypeEmoji(master?.chargedMoves, message.move_2),
		pvpGreatRank: bestRank(message.pvp?.great),
		pvpUltraRank: bestRank(message.pvp?.ultra),
		pvpLittleRank: bestRank(message.pvp?.little),
		pvpLittle: buildPvpEntries(message.pvp?.little),
		pvpGreat: buildPvpEntries(message.pvp?.great),
		pvpUltra: buildPvpEntries(message.pvp?.ultra),
		despawnTime: despawn.toLocaleTimeString(),
		despawnUnix: Math.floor(message.disappear_time),
		minutesLeft,
		firstSeenTime: firstSeen ? firstSeen.toLocaleTimeString() : "",
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: isMapImageConfigured() ? "attachment://map.png" : "",
		diademUrl: diademBaseUrl ? `${diademBaseUrl}/pokemon/${message.encounter_id}` : "",
		spawnpointId: message.spawnpoint_id ?? "",
		pokestopId: message.pokestop_id ?? "",
		pokestopName: message.pokestop_name ?? "",
		username: message.username ?? "",
		evolutions,
		hasFeaturedAttack: !!featuredAttack,
		featuredAttackMoveName: featuredAttack?.moveName ?? "",
		featuredAttackMoveCategory: featuredAttack?.moveCategory ?? "",
		featuredAttackEvolvesTo: featuredAttack?.resultName ?? "",
		// Fetched as bytes and sent as a Discord file attachment (see mapImage.ts's
		// generatePokemonSpriteImage + bot.ts), not a public URL — same reasoning as
		// mapImageUrl above: the sprite is served through this app's own /assets proxy,
		// which the operator may not expose publicly.
		pokemonImageUrl: "attachment://pokemon.png",
		// Filled in per-recipient by applyTrackedBadges — this shared context has no
		// single user to resolve a tracker row against yet.
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
		trackedShundoEmoji: ""
	};
}

const RAID_TEAM_NAMES: Record<number, string> = {
	0: "Neutral",
	1: "Mystic",
	2: "Valor",
	3: "Instinct"
};
const RAID_TEAM_SLUGS: Record<number, string> = {
	0: "neutral",
	1: "mystic",
	2: "valor",
	3: "instinct"
};
const RAID_LEVEL_NAMES: Record<number, string> = {
	1: "Level 1",
	2: "Level 2",
	3: "Level 3",
	4: "Level 4",
	5: "Level 5",
	6: "Mega"
};

/**
 * Covers both the unhatched-egg phase (pokemon_id: 0) and the hatched-boss phase — same Golbat
 * wire type, differentiated only by `isEgg`. Egg-phase pokemon/type/move/evolution/shiny-rate
 * fields are all empty — the boss species isn't known yet.
 */
export async function buildRaidContext(
	message: GolbatRaidMessage,
	thisFetch: typeof fetch = fetch
): Promise<RaidTemplateContext> {
	const clientConfig = getClientConfig();
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const isEgg = !message.pokemon_id;
	const form = isEgg ? 0 : getNormalizedForm(message.pokemon_id, message.form ?? 0);
	const master = isEgg ? undefined : getMasterPokemon(message.pokemon_id, form);
	const formName = !isEgg && form ? (master?.name ?? "") : "";
	const type1 = isEgg ? "" : typeIdToText(master?.types?.[0]);
	const type2 = !isEgg && master?.types?.[1] ? typeIdToText(master.types[1]) : "";
	const shinyRate = isEgg
		? { percent: "?", fraction: "?", reduced: "?" }
		: formatShinyRate(await getShinyRate(message.pokemon_id, form));

	const teamId = (message.team_id ?? 0) as RaidTeam;
	const hatch = new Date(message.start * 1000);
	const raidEnd = new Date(message.end * 1000);
	const despawnUnix = Math.floor(isEgg ? message.start : message.end);
	const minutesLeft = Math.max(0, Math.round((despawnUnix * 1000 - Date.now()) / 60000));

	return {
		isEgg,
		gymId: message.gym_id,
		gymName: message.gym_name ?? "",
		gymUrl: message.gym_url ?? "",
		teamId,
		teamName: RAID_TEAM_NAMES[teamId] ?? "Neutral",
		teamEmoji: discordEmojiTag(`team_${RAID_TEAM_SLUGS[teamId] ?? "neutral"}`),
		level: message.level,
		levelName: RAID_LEVEL_NAMES[message.level] ?? `Level ${message.level}`,
		exRaidEligible: !!message.ex_raid_eligible,
		pokemonName: isEgg ? "" : mPokemon({ pokemon_id: message.pokemon_id, form }),
		pokemonId: isEgg ? 0 : message.pokemon_id,
		form,
		formName,
		costume: message.costume ?? 0,
		gender: isEgg ? "" : genderLabel(message.gender),
		genderValue: isEgg ? null : normalizeGenderValue(message.gender),
		type1,
		type2,
		type1Emoji: type1 ? discordEmojiTag(`type_${type1}`) : "",
		type2Emoji: type2 ? discordEmojiTag(`type_${type2}`) : "",
		quickMove: isEgg ? "" : mMove(message.move_1),
		chargeMove: isEgg ? "" : mMove(message.move_2),
		quickMoveEmoji: isEgg ? "" : moveTypeEmoji(master?.quickMoves, message.move_1),
		chargeMoveEmoji: isEgg ? "" : moveTypeEmoji(master?.chargedMoves, message.move_2),
		shinyRatePercent: shinyRate.percent,
		shinyRateFraction: shinyRate.fraction,
		shinyRateReduced: shinyRate.reduced,
		evolutions: isEgg ? [] : buildEvolutionFamily(message.pokemon_id),
		// Fetched as a Discord file attachment (see webhook/golbat/+server.ts's deliverRaid),
		// same as pokemon's own sprite — reuses generatePokemonSpriteImage since it's species-only.
		pokemonImageUrl: isEgg ? "" : "attachment://pokemon.png",
		hatchTime: isEgg ? hatch.toLocaleTimeString() : "",
		raidEndTime: isEgg ? "" : raidEnd.toLocaleTimeString(),
		despawnUnix,
		minutesLeft,
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No gym detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

/**
 * A Dynamax/Gigantamax battle station. No egg phase — the webhook always carries whatever boss
 * info is currently known (zeroed out fields before a battle is active).
 */
export async function buildMaxBattleContext(
	message: GolbatMaxBattleMessage,
	thisFetch: typeof fetch = fetch
): Promise<MaxBattleTemplateContext> {
	const clientConfig = getClientConfig();
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const pokemonId = message.battle_pokemon_id ?? 0;
	const hasBoss = pokemonId > 0;
	const form = hasBoss ? getNormalizedForm(pokemonId, message.battle_pokemon_form ?? 0) : 0;
	const master = hasBoss ? getMasterPokemon(pokemonId, form) : undefined;
	const formName = hasBoss && form ? (master?.name ?? "") : "";
	const type1 = hasBoss ? typeIdToText(master?.types?.[0]) : "";
	const type2 = hasBoss && master?.types?.[1] ? typeIdToText(master.types[1]) : "";
	const shinyRate = hasBoss
		? formatShinyRate(await getShinyRate(pokemonId, form))
		: { percent: "?", fraction: "?", reduced: "?" };

	// Golbat has no plain "is this gmax" field — derive it the same way PoracleNG does
	// (processor/cmd/processor/maxbattle.go:56-63): bread_mode 2 = Gigantamax; bread_mode 0 with
	// a level above the normal Dynamax range also counts (older/incomplete scans).
	const gmax =
		message.battle_pokemon_bread_mode === 2 ||
		(message.battle_pokemon_bread_mode === 0 && message.battle_level > 6);

	const battleEnd = new Date(message.battle_end * 1000);
	const despawnUnix = Math.floor(message.battle_end);
	const minutesLeft = Math.max(0, Math.round((despawnUnix * 1000 - Date.now()) / 60000));

	return {
		stationId: message.id,
		stationName: message.name ?? "",
		level: message.battle_level,
		gmax,
		gmaxYesNo: gmax ? "Yes" : "No",
		pokemonName: hasBoss ? mPokemon({ pokemon_id: pokemonId, form }) : "",
		pokemonId,
		form,
		formName,
		type1,
		type2,
		type1Emoji: type1 ? discordEmojiTag(`type_${type1}`) : "",
		type2Emoji: type2 ? discordEmojiTag(`type_${type2}`) : "",
		quickMove: hasBoss ? mMove(message.battle_pokemon_move_1) : "",
		chargeMove: hasBoss ? mMove(message.battle_pokemon_move_2) : "",
		quickMoveEmoji: hasBoss ? moveTypeEmoji(master?.quickMoves, message.battle_pokemon_move_1) : "",
		chargeMoveEmoji: hasBoss
			? moveTypeEmoji(master?.chargedMoves, message.battle_pokemon_move_2)
			: "",
		shinyRatePercent: shinyRate.percent,
		shinyRateFraction: shinyRate.fraction,
		shinyRateReduced: shinyRate.reduced,
		evolutions: hasBoss ? buildEvolutionFamily(pokemonId) : [],
		// Reuses generatePokemonSpriteImage (species-only, see webhook/golbat/+server.ts).
		pokemonImageUrl: hasBoss ? "attachment://pokemon.png" : "",
		battleEndTime: hasBoss ? battleEnd.toLocaleTimeString() : "",
		despawnUnix,
		minutesLeft,
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No dedicated station detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

// Golbat quest reward `type` values this app recognizes — see GolbatQuestReward's doc comment.
const QUEST_REWARD_TYPE_MAP: Record<number, QuestRewardTypeFilter> = {
	2: "item",
	3: "stardust",
	4: "candy",
	7: "pokemon",
	12: "megaEnergy"
};

// Human-readable summary of every reward on a quest (usually just one) — used for the
// `rewardString` tag. Mirrors PoracleNG's own reward-text formatting (enrichment/quest.go) but
// hardcodes English rather than pulling from its translation system, matching this codebase's
// existing "custom pages hardcode English" convention.
function buildQuestRewardString(rewards: GolbatQuestReward[]): string {
	const parts = rewards.map((r) => {
		const info = r.info;
		const amount = Number(info.amount) || 0;
		switch (r.type) {
			case 7: {
				// pokemon
				const pokemonId = Number(info.pokemon_id) || 0;
				if (!pokemonId) return "";
				const form = getNormalizedForm(pokemonId, Number(info.form_id) || 0);
				return mPokemon({ pokemon_id: pokemonId, form, shiny: !!info.shiny });
			}
			case 2: {
				// item
				const itemId = Number(info.item_id) || 0;
				if (!itemId) return "";
				const name = mItem(itemId);
				return amount > 0 ? `${amount} ${name}` : name;
			}
			case 3: // stardust
				return amount > 0 ? `${amount} Stardust` : "Stardust";
			case 4: {
				// candy
				const pokemonId = Number(info.pokemon_id) || 0;
				if (!pokemonId) return "";
				const name = `${mPokemon({ pokemon_id: pokemonId })} Candy`;
				return amount > 0 ? `${amount} ${name}` : name;
			}
			case 12: {
				// mega energy
				const pokemonId = Number(info.pokemon_id) || 0;
				const name = pokemonId
					? `${mPokemon({ pokemon_id: pokemonId })} Mega Energy`
					: "Mega Energy";
				return amount > 0 ? `${amount} ${name}` : name;
			}
			default:
				return "";
		}
	});
	return parts.filter(Boolean).join(", ");
}

/**
 * Quests almost always carry exactly one reward, so — like PoracleNG's own summary-buffer
 * simplification — only the FIRST reward is modeled in structured fields (pokemonName, itemId,
 * amount, etc). `rewardString` still summarizes every reward for display. No despawn/countdown
 * fields — Golbat's quest webhook carries no expiry timestamp.
 */
export async function buildQuestContext(
	message: GolbatQuestMessage,
	thisFetch: typeof fetch = fetch
): Promise<QuestTemplateContext> {
	const clientConfig = getClientConfig();
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const primary = message.rewards[0] as GolbatQuestReward | undefined;
	const rewardType: QuestRewardTypeFilter | "" = primary
		? (QUEST_REWARD_TYPE_MAP[primary.type] ?? "")
		: "";

	let pokemonName = "";
	let pokemonId = 0;
	let form = 0;
	let formName = "";
	let shiny = false;
	let itemId = 0;
	let itemName = "";
	let amount = 0;

	if (primary) {
		const info = primary.info;
		if (rewardType === "pokemon") {
			pokemonId = Number(info.pokemon_id) || 0;
			form = pokemonId ? getNormalizedForm(pokemonId, Number(info.form_id) || 0) : 0;
			formName = form ? (getMasterPokemon(pokemonId, form)?.name ?? "") : "";
			shiny = !!info.shiny;
			pokemonName = pokemonId ? mPokemon({ pokemon_id: pokemonId, form, shiny }) : "";
		} else if (rewardType === "candy" || rewardType === "megaEnergy") {
			pokemonId = Number(info.pokemon_id) || 0;
			amount = Number(info.amount) || 0;
			pokemonName = pokemonId ? mPokemon({ pokemon_id: pokemonId }) : "";
		} else if (rewardType === "item") {
			itemId = Number(info.item_id) || 0;
			amount = Number(info.amount) || 0;
			itemName = itemId ? mItem(itemId) : "";
		} else if (rewardType === "stardust") {
			amount = Number(info.amount) || 0;
		}
	}

	return {
		pokestopId: message.pokestop_id,
		pokestopName: message.pokestop_name ?? "",
		pokestopUrl: message.pokestop_url ?? "",
		questTitle: message.title ?? "",
		target: message.target ?? 0,
		withAr: !!message.with_ar,
		rewardType,
		rewardString: buildQuestRewardString(message.rewards),
		pokemonName,
		pokemonId,
		form,
		formName,
		shiny,
		itemId,
		itemName,
		amount,
		pokemonImageUrl: rewardType === "pokemon" && pokemonId ? "attachment://pokemon.png" : "",
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No pokestop detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

// Matches pokestopUtils.ts's own INCIDENT_DISPLAY_* constants — redeclared locally rather than
// imported so this server-side render module doesn't pull in that file's reactive client state
// (getActiveSearch/getUserSettings), which it only uses for map-filter helpers this module
// doesn't need.
const INCIDENT_DISPLAY_GOLD = 7;
const INCIDENT_DISPLAY_KECLEON = 8;
const INCIDENT_DISPLAY_SHOWCASE = 9;

/**
 * Covers both a regular Team GO Rocket grunt takeover AND a Kecleon/Showcase/Gold-Stop event
 * incident — same Golbat wire type, differentiated by `kind` (derived from the incident's
 * display type). Event incidents carry no grunt character, so `character`/`characterName`/
 * `confirmed` are 0/""/false for those three kinds.
 */
export async function buildInvasionContext(
	message: GolbatInvasionMessage,
	thisFetch: typeof fetch = fetch
): Promise<InvasionTemplateContext> {
	const clientConfig = getClientConfig();
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const displayType = message.incident_display_type ?? message.display_type ?? 0;
	const kind: InvasionKindFilter =
		displayType === INCIDENT_DISPLAY_KECLEON
			? "kecleon"
			: displayType === INCIDENT_DISPLAY_SHOWCASE
				? "showcase"
				: displayType === INCIDENT_DISPLAY_GOLD
					? "goldStop"
					: "grunt";

	const character = kind === "grunt" ? message.incident_grunt_type || message.grunt_type || 0 : 0;
	const confirmed = !!message.confirmed;
	const characterName = kind === "grunt" ? mCharacter(character, { confirmed }) : "";

	const lineup = (message.lineup ?? []).map((entry) => {
		const form = getNormalizedForm(entry.pokemon_id, entry.form ?? 0);
		return {
			pokemonName: mPokemon({ pokemon_id: entry.pokemon_id, form }),
			pokemonId: entry.pokemon_id,
			form
		};
	});

	const expireUnix = Math.floor(message.incident_expiration);
	const minutesLeft = Math.max(0, Math.round((expireUnix * 1000 - Date.now()) / 60000));

	return {
		pokestopId: message.pokestop_id,
		pokestopName: message.pokestop_name ?? message.name ?? "",
		pokestopUrl: message.url ?? "",
		kind,
		character,
		characterName,
		confirmed,
		lineup,
		expireUnix,
		minutesLeft,
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No pokestop detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

// Golbat's raw lure_id -> display name/emoji slug. Best-effort community-known numbering (no
// authoritative local source) — matches the `pstop_lure_*` emoji set already uploaded for this
// bot (discordEmoji.ts). Wrong purely-cosmetic ordering here doesn't affect filter matching
// (still keyed on the raw numeric lureId), only the display name/emoji.
const LURE_TYPE_INFO: Record<number, { name: string; slug: string }> = {
	501: { name: "Normal Lure", slug: "normal" },
	502: { name: "Glacial Lure", slug: "glacial" },
	503: { name: "Mossy Lure", slug: "mossy" },
	504: { name: "Magnetic Lure", slug: "magnetic" },
	505: { name: "Rainy Lure", slug: "rainy" },
	506: { name: "Golden Lure", slug: "golden" }
};

/** A lured pokestop. Golbat has no dedicated "lure" wire type — always arrives bundled on a
 * "pokestop" envelope (see webhook/golbat/+server.ts's dispatch sniff). */
export async function buildLureContext(
	message: GolbatLureMessage,
	thisFetch: typeof fetch = fetch
): Promise<LureTemplateContext> {
	const clientConfig = getClientConfig();
	await loadRemoteLocale(clientConfig.general.defaultLocale, thisFetch);

	const info = LURE_TYPE_INFO[message.lure_id];
	const expireUnix = Math.floor(message.lure_expiration);
	const minutesLeft = Math.max(0, Math.round((expireUnix * 1000 - Date.now()) / 60000));

	return {
		pokestopId: message.pokestop_id,
		pokestopName: message.pokestop_name ?? message.name ?? "",
		pokestopUrl: message.url ?? "",
		lureId: message.lure_id,
		lureTypeName: info?.name ?? `Lure #${message.lure_id}`,
		lureTypeEmoji: info ? discordEmojiTag(`pstop_lure_${info.slug}`) : "",
		expireUnix,
		minutesLeft,
		latitude: message.latitude,
		longitude: message.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${message.latitude},${message.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${message.latitude},${message.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${message.latitude},${message.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No pokestop detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

function gymTeamName(teamId: number): string {
	if (teamId < 0) return "Unknown";
	return RAID_TEAM_NAMES[teamId] ?? "Neutral";
}

function gymTeamEmoji(teamId: number): string {
	if (teamId < 0) return "";
	return discordEmojiTag(`team_${RAID_TEAM_SLUGS[teamId] ?? "neutral"}`);
}

/**
 * A team/slot/battle-state delta at a gym. Unlike every other build*Context function, this one
 * isn't a pure transform of a single Golbat message — the caller (webhook/golbat/+server.ts) owns
 * the gym state tracker and resolves old-vs-new values before calling this, since that's server
 * state, not something derivable from one webhook message alone.
 */
export function buildGymContext(params: {
	gymId: string;
	gymName: string;
	gymUrl: string;
	latitude: number;
	longitude: number;
	teamId: RaidTeam;
	oldTeamId: number; // -1 = unknown (first sighting)
	slotsAvailable: number;
	oldSlotsAvailable: number; // -1 = unknown (first sighting)
	inBattle: boolean;
	lastControllerId: number; // -1 = never controlled
}): GymTemplateContext {
	return {
		gymId: params.gymId,
		gymName: params.gymName,
		gymUrl: params.gymUrl,
		teamId: params.teamId,
		teamName: gymTeamName(params.teamId),
		teamEmoji: gymTeamEmoji(params.teamId),
		oldTeamId: params.oldTeamId,
		oldTeamName: gymTeamName(params.oldTeamId),
		oldTeamEmoji: gymTeamEmoji(params.oldTeamId),
		lastControllerId: params.lastControllerId,
		lastControllerName: gymTeamName(params.lastControllerId),
		slotsAvailable: params.slotsAvailable,
		oldSlotsAvailable: params.oldSlotsAvailable,
		trainerCount: 6 - params.slotsAvailable,
		oldTrainerCount: params.oldSlotsAvailable >= 0 ? 6 - params.oldSlotsAvailable : -1,
		inBattle: params.inBattle,
		teamChanged: params.oldTeamId !== params.teamId,
		slotsChanged: params.oldSlotsAvailable !== params.slotsAvailable,
		latitude: params.latitude,
		longitude: params.longitude,
		googleMapsUrl: `https://maps.google.com/maps?q=${params.latitude},${params.longitude}`,
		appleMapsUrl: `https://maps.apple.com/?ll=${params.latitude},${params.longitude}`,
		wazeMapUrl: `https://waze.com/ul?ll=${params.latitude},${params.longitude}&navigate=yes`,
		mapImageUrl: "",
		// No gym detail page exists in this app yet — nothing to link to.
		diademUrl: ""
	};
}

export type TrackedStatus = { shiny: boolean; hundo: boolean; nundo: boolean; shundo: boolean };

/**
 * Overlays the delivering user's own pokemon_tracker status (did THEY mark this species as
 * shiny/hundo/nundo/shundo in their collection) onto a shared event context. Must be called
 * per-recipient, right before rendering — unlike every other field, tracked status isn't a fact
 * about the encounter itself.
 */
export function applyTrackedBadges(
	context: PokemonTemplateContext,
	tracker: TrackedStatus | null
): PokemonTemplateContext {
	const t = tracker ?? { shiny: false, hundo: false, nundo: false, shundo: false };
	return {
		...context,
		trackedShiny: t.shiny,
		trackedShinyYesNo: t.shiny ? "Yes" : "No",
		trackedShinyEmoji: t.shiny ? "✨" : "",
		trackedHundo: t.hundo,
		trackedHundoYesNo: t.hundo ? "Yes" : "No",
		trackedHundoEmoji: t.hundo ? "💯" : "",
		trackedNundo: t.nundo,
		trackedNundoYesNo: t.nundo ? "Yes" : "No",
		trackedNundoEmoji: t.nundo ? "0️⃣" : "",
		trackedShundo: t.shundo,
		trackedShundoYesNo: t.shundo ? "Yes" : "No",
		trackedShundoEmoji: t.shundo ? "🌟" : ""
	};
}

const compileCache = new Map<string, Handlebars.TemplateDelegate>();

function compile(source: string): Handlebars.TemplateDelegate {
	let template = compileCache.get(source);
	if (!template) {
		template = Handlebars.compile(source, { noEscape: false });
		compileCache.set(source, template);
	}
	return template;
}

export function renderEmbed(
	template: EmbedTemplate,
	context:
		| PokemonTemplateContext
		| RaidTemplateContext
		| MaxBattleTemplateContext
		| QuestTemplateContext
		| InvasionTemplateContext
		| LureTemplateContext
		| GymTemplateContext
): EmbedTemplate {
	return {
		// template.content ?? "" — older saved templates predate this field
		content: compile(template.content ?? "")(context),
		title: compile(template.title)(context),
		description: compile(template.description)(context),
		color: compile(template.color)(context),
		thumbnailUrl: compile(template.thumbnailUrl)(context),
		imageUrl: compile(template.imageUrl)(context),
		footerText: compile(template.footerText)(context),
		url: compile(template.url)(context),
		// (template.fields ?? []) — older saved templates predate the fields feature
		fields: (template.fields ?? []).map((field) => ({
			name: compile(field.name)(context),
			value: compile(field.value)(context),
			inline: field.inline
		}))
	};
}
