import {
	getAllEnabledChannelSubscriptions,
	getAllEnabledNotificationSubscriptions
} from "@/lib/server/db/internal/repository";
import type {
	NotificationChannelSubscription,
	NotificationSubscription
} from "@/lib/server/db/internal/schema";
import type {
	NotificationType,
	PokemonSubscriptionFilters
} from "@/lib/features/notifications/types";

const REFRESH_INTERVAL_MS = 30_000;

let byPokemonId: Map<number, NotificationSubscription[]> = new Map();
let anySpecies: NotificationSubscription[] = [];
// Every enabled subscription regardless of type — low-volume categories (raid, quest, etc.)
// don't need a real index the way pokemon spawns do; a per-type flat-array filter is plenty
// (see getSubscriptionsByType below).
let allEnabled: NotificationSubscription[] = [];

// Same shape, for admin-configured channel subscriptions — kept as a separate index rather than
// merged into the above, since callers (the webhook route) need to tell "DM this user" and "post
// to this channel" apart to deliver them differently.
let channelByPokemonId: Map<number, NotificationChannelSubscription[]> = new Map();
let channelAnySpecies: NotificationChannelSubscription[] = [];
let channelAllEnabled: NotificationChannelSubscription[] = [];

let dirty = true;
let lastRefresh = 0;

function rebuild(subscriptions: NotificationSubscription[]) {
	allEnabled = subscriptions;
	byPokemonId = new Map();
	anySpecies = [];
	for (const sub of subscriptions) {
		if (sub.type !== "pokemon") continue;
		const pokemonIds = (sub.filters as PokemonSubscriptionFilters).pokemonIds;
		if (pokemonIds && pokemonIds.length > 0) {
			for (const pokemonId of pokemonIds) {
				const bucket = byPokemonId.get(pokemonId) ?? [];
				bucket.push(sub);
				byPokemonId.set(pokemonId, bucket);
			}
		} else {
			anySpecies.push(sub);
		}
	}
}

function rebuildChannels(subscriptions: NotificationChannelSubscription[]) {
	channelAllEnabled = subscriptions;
	channelByPokemonId = new Map();
	channelAnySpecies = [];
	for (const sub of subscriptions) {
		if (sub.type !== "pokemon") continue;
		const pokemonIds = (sub.filters as PokemonSubscriptionFilters).pokemonIds;
		if (pokemonIds && pokemonIds.length > 0) {
			for (const pokemonId of pokemonIds) {
				const bucket = channelByPokemonId.get(pokemonId) ?? [];
				bucket.push(sub);
				channelByPokemonId.set(pokemonId, bucket);
			}
		} else {
			channelAnySpecies.push(sub);
		}
	}
}

/** Call after any subscription (DM or channel) create/update/delete so the next lookup refreshes. */
export function invalidateSubscriptionCache() {
	dirty = true;
}

async function ensureFresh() {
	const stale = Date.now() - lastRefresh > REFRESH_INTERVAL_MS;
	if (!dirty && !stale) return;
	const [subs, channelSubs] = await Promise.all([
		getAllEnabledNotificationSubscriptions(),
		getAllEnabledChannelSubscriptions()
	]);
	rebuild(subs);
	rebuildChannels(channelSubs);
	dirty = false;
	lastRefresh = Date.now();
}

/** Candidate subscriptions for a pokemon_id — species-specific plus any-species subs. */
export async function getPokemonSubscriptionCandidates(
	pokemonId: number
): Promise<NotificationSubscription[]> {
	await ensureFresh();
	return [...(byPokemonId.get(pokemonId) ?? []), ...anySpecies];
}

/**
 * All enabled subscriptions of a given type — for low-volume categories where a real index
 * (like the pokemon-specific one above) isn't worth the complexity; matching just filters this
 * flat list in plain JS.
 */
export async function getSubscriptionsByType(
	type: NotificationType
): Promise<NotificationSubscription[]> {
	await ensureFresh();
	return allEnabled.filter((s) => s.type === type);
}

/** Channel-subscription equivalent of getPokemonSubscriptionCandidates. */
export async function getChannelSubscriptionCandidates(
	pokemonId: number
): Promise<NotificationChannelSubscription[]> {
	await ensureFresh();
	return [...(channelByPokemonId.get(pokemonId) ?? []), ...channelAnySpecies];
}

/** Channel-subscription equivalent of getSubscriptionsByType. */
export async function getChannelSubscriptionsByType(
	type: NotificationType
): Promise<NotificationChannelSubscription[]> {
	await ensureFresh();
	return channelAllEnabled.filter((s) => s.type === type);
}
