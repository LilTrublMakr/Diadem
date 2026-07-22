import { getNormalizedForm, getPokemonSize, typeIdToText } from "@/lib/utils/pokemonUtils";
import { loadRemoteLocale, mMove, mPokemon, mWeather } from "@/lib/services/ingameLocale";
import { getMasterPokemon } from "@/lib/services/masterfile";
import type { MasterMove } from "@/lib/types/masterfile";
import { getClientConfig } from "@/lib/services/config/config.server";
import { discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import { computeIvBadges } from "@/lib/features/notifications/ivBadges";
import { isMapImageConfigured } from "@/lib/server/notifications/mapImage";
import { registerNotificationHelpers } from "@/lib/features/notifications/handlebarsHelpers";
import type { GolbatPokemonMessage, GolbatPvpEntry } from "@/lib/server/notifications/golbatTypes";
import type {
	EmbedTemplate,
	PokemonTemplateContext,
	PvpEntryContext
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
	const evolutions = (master?.evolutions ?? []).map((e) => ({
		fullName: mPokemon({ pokemon_id: e.pokemonId, form: getNormalizedForm(e.pokemonId, e.form) }),
		pokemonId: e.pokemonId
	}));

	const atk = message.individual_attack ?? null;
	const def = message.individual_defense ?? null;
	const sta = message.individual_stamina ?? null;
	const shiny = !!message.shiny;
	const { hundo, nundo, shundo } = computeIvBadges(atk, def, sta, shiny);

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
		shinyYesNo: shiny ? "Yes" : "No",
		shinyEmoji: shiny ? "✨" : "",
		hundo,
		hundoYesNo: hundo ? "Yes" : "No",
		hundoEmoji: hundo ? "💯" : "",
		nundo,
		nundoYesNo: nundo ? "Yes" : "No",
		nundoEmoji: nundo ? "0️⃣" : "",
		shundo,
		shundoYesNo: shundo ? "Yes" : "No",
		shundoEmoji: shundo ? "🌟" : "",
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
		weather: mWeather(message.weather),
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
		// Fetched as bytes and sent as a Discord file attachment (see mapImage.ts's
		// generatePokemonSpriteImage + bot.ts), not a public URL — same reasoning as
		// mapImageUrl above: the sprite is served through this app's own /assets proxy,
		// which the operator may not expose publicly.
		pokemonImageUrl: "attachment://pokemon.png"
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
	context: PokemonTemplateContext
): EmbedTemplate {
	return {
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
