import { getAllEnabledNotificationSubscriptions } from "@/lib/server/db/internal/repository";
import type { NotificationSubscription } from "@/lib/server/db/internal/schema";

const REFRESH_INTERVAL_MS = 30_000;

let byPokemonId: Map<number, NotificationSubscription[]> = new Map();
let anySpecies: NotificationSubscription[] = [];
let dirty = true;
let lastRefresh = 0;

function rebuild(subscriptions: NotificationSubscription[]) {
	byPokemonId = new Map();
	anySpecies = [];
	for (const sub of subscriptions) {
		if (sub.type !== "pokemon") continue;
		const pokemonIds = sub.filters.pokemonIds;
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

/** Call after any subscription create/update/delete so the next lookup refreshes. */
export function invalidateSubscriptionCache() {
	dirty = true;
}

async function ensureFresh() {
	const stale = Date.now() - lastRefresh > REFRESH_INTERVAL_MS;
	if (!dirty && !stale) return;
	rebuild(await getAllEnabledNotificationSubscriptions());
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
