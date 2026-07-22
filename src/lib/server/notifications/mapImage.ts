import { resize } from "@/lib/services/assets";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getIconPokemon, initAllIconSets } from "@/lib/services/uicons.svelte";
import { getDefaultIconSet } from "@/lib/services/userSettings.svelte";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { GolbatPokemonMessage } from "@/lib/server/notifications/golbatTypes";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("discordNotifications");

export function isMapImageConfigured(): boolean {
	const staticMap = getServerConfig().staticMap;
	return !!staticMap?.enabled && !!staticMap.url;
}

/**
 * Renders a static map image with a pokemon marker via this app's existing
 * [server.staticMap] integration, hitting Rampardos's /multistaticmap/poracle-multi-monster
 * template — the same one PoracleNG uses for its own pokemon alerts (see
 * staticMapFieldsForType("monster") in PoracleNG's enrichment package). Reusing
 * PoracleNG's own field names/template means width/height/zoom/marker sizing are
 * whatever that template is already configured to render — this only supplies data.
 */
export async function generatePokemonMapImage(
	message: GolbatPokemonMessage,
	thisFetch: typeof fetch = fetch
): Promise<Buffer | null> {
	const staticMap = getServerConfig().staticMap;
	if (!staticMap?.enabled || !staticMap.url) return null;

	try {
		await initAllIconSets(thisFetch);
		const iconSetId = getDefaultIconSet(MapObjectType.POKEMON).id;
		const iconUrl = getIconPokemon(
			{
				pokemon_id: message.pokemon_id,
				form: message.form,
				gender: message.gender,
				shiny: message.shiny
			},
			iconSetId
		);

		const payload = {
			latitude: message.latitude,
			longitude: message.longitude,
			imgUrl: staticMap.diademUrl + resize(iconUrl, { width: 64 }),
			style: staticMap.style || "positron",
			pokemon_id: message.pokemon_id,
			pokemonId: message.pokemon_id,
			display_pokemon_id: message.display_pokemon_id ?? message.pokemon_id,
			form: message.form ?? 0,
			costume: message.costume ?? 0,
			weather: message.weather ?? 0,
			seen_type: message.seen_type,
			seenType: message.seen_type,
			verified: message.disappear_time_verified,
			confirmedTime: message.disappear_time_verified
		};

		const response = await thisFetch(`${staticMap.url}/multistaticmap/poracle-multi-monster`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(10_000)
		});
		if (!response.ok) {
			log.warning(`Static map request failed: ${response.status}`);
			return null;
		}
		return Buffer.from(await response.arrayBuffer());
	} catch (error) {
		const cause = error instanceof Error && error.cause ? ` (${error.cause})` : "";
		log.warning(`Failed to generate map image: ${error}${cause}`);
		return null;
	}
}

/**
 * Fetches the pokemon's sprite as bytes (for upload as a Discord file attachment) instead of
 * handing Discord a public URL — this app's own /assets icon proxy isn't necessarily reachable
 * from the public internet, same reasoning as the static map image above. `thisFetch` resolves
 * the relative /assets/... path internally (same mechanism initAllIconSets already relies on),
 * so this works whether or not the app is actually public-facing.
 */
export async function generatePokemonSpriteImage(
	message: GolbatPokemonMessage,
	thisFetch: typeof fetch = fetch
): Promise<Buffer | null> {
	try {
		await initAllIconSets(thisFetch);
		const iconSetId = getDefaultIconSet(MapObjectType.POKEMON).id;
		const iconPath = getIconPokemon(
			{
				pokemon_id: message.pokemon_id,
				form: message.form,
				costume: message.costume,
				gender: message.gender,
				shiny: message.shiny
			},
			iconSetId
		);

		const response = await thisFetch(resize(iconPath, { width: 64 }), {
			signal: AbortSignal.timeout(10_000)
		});
		if (!response.ok) {
			log.warning(`Sprite image request failed: ${response.status}`);
			return null;
		}
		return Buffer.from(await response.arrayBuffer());
	} catch (error) {
		const cause = error instanceof Error && error.cause ? ` (${error.cause})` : "";
		log.warning(`Failed to generate sprite image: ${error}${cause}`);
		return null;
	}
}
