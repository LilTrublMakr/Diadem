import type { FeaturedAttackEntry } from "@/lib/types/featuredAttack";

let entries = $state<FeaturedAttackEntry[]>([]);
let loadPromise: Promise<void> | null = null;

export function getFeaturedAttacks(): FeaturedAttackEntry[] {
	return entries;
}

/** Idempotent — safe to call on every popup open, only fetches once. */
export function ensureFeaturedAttacksLoaded(): Promise<void> {
	if (!loadPromise) {
		loadPromise = fetch("/api/custom/featured-attacks")
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				entries = data;
			})
			.catch(() => {
				entries = [];
			});
	}
	return loadPromise;
}
