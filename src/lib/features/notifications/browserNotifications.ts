import type { FilterPokemon } from "@/lib/features/filters/filters";
import type { FiltersetPokemon } from "@/lib/features/filters/filtersets";
import { filterTitle } from "@/lib/features/filters/filtersetUtils.svelte";
import { getTrackers } from "@/lib/features/trackerState.svelte";
import { flyTo } from "@/lib/map/utils";
import { getMasterPokemon } from "@/lib/services/masterfile";
import { getIconPokemon } from "@/lib/services/uicons.svelte";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
import { Coords } from "@/lib/utils/coordinates";
import { League } from "@/lib/utils/pokemonUtils";

export function isNotificationsSupported(): boolean {
	return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
	return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
	return Notification.requestPermission();
}

function inRange(value: number | undefined, min: number, max: number): boolean {
	if (value === undefined) return false;
	return value >= min && value <= max;
}

export function pokemonMatchesFilter(pokemon: PokemonData, filter: FiltersetPokemon): boolean {
	if (filter.pokemon && filter.pokemon.length > 0) {
		const match = filter.pokemon.some(
			(p) => p.pokemon_id === pokemon.pokemon_id && p.form === pokemon.form
		);
		if (!match) return false;
	}

	if (filter.iv && !inRange(pokemon.iv, filter.iv.min, filter.iv.max)) return false;
	if (filter.cp && !inRange(pokemon.cp, filter.cp.min, filter.cp.max)) return false;
	if (filter.ivAtk && !inRange(pokemon.atk_iv, filter.ivAtk.min, filter.ivAtk.max)) return false;
	if (filter.ivDef && !inRange(pokemon.def_iv, filter.ivDef.min, filter.ivDef.max)) return false;
	if (filter.ivSta && !inRange(pokemon.sta_iv, filter.ivSta.min, filter.ivSta.max)) return false;
	if (filter.level && !inRange(pokemon.level, filter.level.min, filter.level.max)) return false;

	if (filter.gender && filter.gender.length > 0) {
		if (pokemon.gender === undefined || !filter.gender.includes(pokemon.gender)) return false;
	}

	if (filter.size && !inRange(pokemon.size, filter.size.min, filter.size.max)) return false;

	if (filter.pvpRankLittle) {
		const rank = pokemon.pvp?.[League.LITTLE]?.[0]?.rank;
		if (!inRange(rank, filter.pvpRankLittle.min, filter.pvpRankLittle.max)) return false;
	}
	if (filter.pvpRankGreat) {
		const rank = pokemon.pvp?.[League.GREAT]?.[0]?.rank;
		if (!inRange(rank, filter.pvpRankGreat.min, filter.pvpRankGreat.max)) return false;
	}
	if (filter.pvpRankUltra) {
		const rank = pokemon.pvp?.[League.ULTRA]?.[0]?.rank;
		if (!inRange(rank, filter.pvpRankUltra.min, filter.pvpRankUltra.max)) return false;
	}

	return true;
}

function buildNotificationBody(pokemon: PokemonData): string {
	const name = getMasterPokemon(pokemon.pokemon_id)?.name ?? `#${pokemon.pokemon_id}`;
	const parts: string[] = [name];
	if (pokemon.iv !== undefined) parts.push(`${pokemon.iv}% IV`);
	if (pokemon.cp !== undefined) parts.push(`CP ${pokemon.cp}`);
	if (pokemon.level !== undefined) parts.push(`L${pokemon.level}`);
	let body = parts.join(" · ");

	const tracker = getTrackers()[pokemon.pokemon_id];
	if (tracker) {
		const badges: string[] = [];
		if (tracker.shundo) badges.push("🌟");
		if (tracker.hundo) badges.push("💯");
		if (tracker.shiny) badges.push("✨");
		if (tracker.nundo) badges.push("0️⃣");
		if (badges.length > 0) body += `\nTracked: ${badges.join(" ")}`;
	}

	return body;
}

function getNotificationIcon(pokemon: PokemonData): string | undefined {
	try {
		const url = getIconPokemon({ pokemon_id: pokemon.pokemon_id, form: pokemon.form });
		return new URL(url, window.location.href).href;
	} catch {
		return undefined;
	}
}

export function fireNotification(pokemon: PokemonData, matchedFilter: FiltersetPokemon): void {
	const title = filterTitle(matchedFilter);
	const body = buildNotificationBody(pokemon);
	const icon = getNotificationIcon(pokemon);

	const notification = new Notification(title, { body, icon });
	notification.onclick = () => {
		window.focus();
		flyTo(new Coords(pokemon.lat, pokemon.lon), 16);
		notification.close();
	};
}

export function checkAndFirePokemonNotifications(
	newPokemon: PokemonData[],
	pokemonFilter: FilterPokemon
): void {
	if (!isNotificationsSupported() || Notification.permission !== "granted") return;

	for (const pokemon of newPokemon) {
		for (const filter of pokemonFilter.filters) {
			if (!filter.enabled || !filter.notify) continue;
			if (pokemonMatchesFilter(pokemon, filter)) {
				fireNotification(pokemon, filter);
				break;
			}
		}
	}
}
