// A LeekDuck-published "Featured Attack" — evolving (or, for some events, simply catching) this
// species during the active window grants a move it can't otherwise obtain. See
// featuredAttackProvider.ts for how these are scraped and src/lib/utils/featuredAttack.ts for
// matching a live encounter against them.
export type FeaturedAttackEntry = {
	pokemonId: number;
	form: number;
	// "evolve" = only evolving this species during the window grants the move (Community Day).
	// "catchOrEvolve" = catching this species directly ALSO grants it, not just evolving into it
	// (seen on flagship multi-day "event" pages) — a real mechanic difference, not just wording.
	trigger: "evolve" | "catchOrEvolve";
	// Display name of the species that ends up knowing the move — for "evolve" this differs from
	// the trigger species above (e.g. trigger Arctibax, resultName "Baxcalibur"); for
	// "catchOrEvolve" it's the same species as the trigger (the named species IS the result).
	resultName: string;
	moveName: string;
	moveCategory: "fast" | "charged";
	activeFrom: string; // ISO, = event.start
	activeUntil: string; // ISO, = event.end (+ parsed grace-period hours for "evolve" entries)
	eventName: string;
	sourceUrl: string;
};
