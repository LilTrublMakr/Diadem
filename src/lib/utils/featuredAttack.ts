import type { FeaturedAttackEntry } from "@/lib/types/featuredAttack";

/** Isomorphic — used both server-side (render.ts) and client-side (PokemonPopup.svelte). */
export function findActiveFeaturedAttack(
	entries: FeaturedAttackEntry[],
	pokemonId: number,
	form: number,
	now: Date = new Date()
): FeaturedAttackEntry | undefined {
	const t = now.getTime();
	return entries.find(
		(e) =>
			e.pokemonId === pokemonId &&
			e.form === form &&
			t >= new Date(e.activeFrom).getTime() &&
			t <= new Date(e.activeUntil).getTime()
	);
}
