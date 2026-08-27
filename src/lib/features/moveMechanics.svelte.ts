import type { MoveMechanics } from "@/lib/types/moveMechanics";

let mechanics = $state<Record<string, MoveMechanics>>({});
let loadPromise: Promise<void> | null = null;

export function getMoveMechanics(): Record<string, MoveMechanics> {
	return mechanics;
}

/** Idempotent — safe to call on every page mount, only fetches once. */
export function ensureMoveMechanicsLoaded(): Promise<void> {
	if (!loadPromise) {
		loadPromise = fetch("/api/custom/move-mechanics")
			.then((res) => (res.ok ? res.json() : {}))
			.then((data) => {
				mechanics = data;
			})
			.catch(() => {
				mechanics = {};
			});
	}
	return loadPromise;
}
