// PVE move mechanics not present in this app's own masterfile (duration/energy) — sourced from
// Pokébattler's /moves endpoint, keyed by the same proto convention already used everywhere
// (e.g. "FIRE_BLAST", "AIR_SLASH_FAST"). See moveMechanicsProvider.ts.
export type MoveMechanics = {
	durationMs: number;
	energyDelta: number;
};
