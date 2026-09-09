import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { RawExportPokemon } from "@/lib/types/collectionExport";
import type { MasterEvolution } from "@/lib/types/masterfile";

export type TrackerImportEntry = {
	pokemonId: number;
	form: number;
	shiny: boolean;
	hundo: boolean;
	nundo: boolean;
	shundo: boolean;
	legacyMoves: string[];
};

function isHundo(p: RawExportPokemon): boolean {
	return p.atk === 15 && p.def === 15 && p.sta === 15;
}

function isNundo(p: RawExportPokemon): boolean {
	return p.atk === 0 && p.def === 0 && p.sta === 0;
}

// Which of this individual's actual moves are ones its species currently has flagged as
// legacy (isLegacy) — translated id -> proto, since the tracker's legacyMoves column stores
// proto strings, not the numeric move ids RawExportPokemon carries.
function legacyMovesOwned(p: RawExportPokemon): string[] {
	const master = getMasterPokemon(p.dex, getNormalizedForm(p.dex, p.form));
	if (!master) return [];

	const legacyById = new Map<number, string>();
	for (const move of [...(master.quickMoves ?? []), ...(master.chargedMoves ?? [])]) {
		if (move.isLegacy) legacyById.set(move.id, move.proto);
	}
	if (legacyById.size === 0) return [];

	const owned: string[] = [];
	for (const moveId of [p.move1, p.move2, p.move3]) {
		const proto = legacyById.get(moveId);
		if (proto) owned.push(proto);
	}
	return owned;
}

// Reverse of MasterPokemon.evolutions - dex+form key -> the single species+form that evolves
// into it. Built from the whole masterfile once per call site that needs it (pre-evolution
// backfill is opt-in and only walked when at least one group actually proves a flag).
function buildPreEvolutionMap(): Map<string, { pokemonId: number; form: number }> {
	const map = new Map<string, { pokemonId: number; form: number }>();
	const masterFile = getMasterFile();
	if (!masterFile) return map;

	const registerFrom = (dex: number, form: number, evolutions: MasterEvolution[] | undefined) => {
		for (const evo of evolutions ?? []) {
			const targetKey = `${evo.pokemonId}-${getNormalizedForm(evo.pokemonId, evo.form)}`;
			if (!map.has(targetKey)) map.set(targetKey, { pokemonId: dex, form });
		}
	};

	for (const [dexStr, p] of Object.entries(masterFile.pokemon)) {
		const dex = Number(dexStr);
		registerFrom(dex, getNormalizedForm(dex, 0), p.evolutions);
		for (const [formIdStr, f] of Object.entries(p.forms)) {
			registerFrom(dex, getNormalizedForm(dex, Number(formIdStr)), f.evolutions);
		}
	}

	return map;
}

// Every earlier stage of this species+form's evolution line, closest ancestor first. IVs and
// shininess never change on evolution, so a hundo/nundo/shundo/shiny individual proves the same
// for whatever it evolved from - even though the export only ever names the stage actually caught.
function getPreEvolutionChain(
	preEvoMap: Map<string, { pokemonId: number; form: number }>,
	pokemonId: number,
	form: number
): { pokemonId: number; form: number }[] {
	const chain: { pokemonId: number; form: number }[] = [];
	const seen = new Set<string>();
	let current = { pokemonId, form };

	for (;;) {
		const key = `${current.pokemonId}-${current.form}`;
		if (seen.has(key)) break;
		seen.add(key);
		const prev = preEvoMap.get(key);
		if (!prev) break;
		chain.push(prev);
		current = prev;
	}

	return chain;
}

/**
 * Groups a parsed collection export by species+form and derives what each group proves for
 * tracker purposes — any individual proving a flag is enough for the whole group. Groups with
 * nothing to report (no hundo/nundo/shundo/shiny/legacy move evidence at all) are omitted.
 *
 * With `includePreEvolutions`, a hundo/nundo/shundo/shiny group also backfills those same flags
 * (not legacy moves - a legacy move earned on evolution never applied to the pre-evolved stage)
 * onto every earlier stage of its evolution line, creating a group for one if it doesn't already
 * exist from the export itself.
 */
export function aggregateTrackerImport(
	pokemon: RawExportPokemon[],
	options: { includePreEvolutions?: boolean } = {}
): TrackerImportEntry[] {
	const groups = new Map<string, TrackerImportEntry>();

	const getOrCreate = (pokemonId: number, form: number): TrackerImportEntry => {
		const key = `${pokemonId}-${form}`;
		let entry = groups.get(key);
		if (!entry) {
			entry = { pokemonId, form, shiny: false, hundo: false, nundo: false, shundo: false, legacyMoves: [] };
			groups.set(key, entry);
		}
		return entry;
	};

	for (const p of pokemon) {
		const form = getNormalizedForm(p.dex, p.form);
		const hundo = isHundo(p);
		const nundo = isNundo(p);
		const shundo = !!p.shiny && hundo;
		const legacy = legacyMovesOwned(p);

		const entry = getOrCreate(p.dex, form);
		entry.shiny = entry.shiny || !!p.shiny;
		entry.hundo = entry.hundo || hundo;
		entry.nundo = entry.nundo || nundo;
		entry.shundo = entry.shundo || shundo;
		for (const proto of legacy) {
			if (!entry.legacyMoves.includes(proto)) entry.legacyMoves.push(proto);
		}
	}

	if (options.includePreEvolutions) {
		const preEvoMap = buildPreEvolutionMap();
		// Snapshot first - backfilled ancestor groups shouldn't themselves be walked again here,
		// they're already the end of their own chain by construction.
		for (const entry of [...groups.values()]) {
			if (!entry.shiny && !entry.hundo && !entry.nundo && !entry.shundo) continue;
			for (const ancestor of getPreEvolutionChain(preEvoMap, entry.pokemonId, entry.form)) {
				const ancestorEntry = getOrCreate(ancestor.pokemonId, ancestor.form);
				ancestorEntry.shiny = ancestorEntry.shiny || entry.shiny;
				ancestorEntry.hundo = ancestorEntry.hundo || entry.hundo;
				ancestorEntry.nundo = ancestorEntry.nundo || entry.nundo;
				ancestorEntry.shundo = ancestorEntry.shundo || entry.shundo;
			}
		}
	}

	return [...groups.values()].filter(
		(e) => e.shiny || e.hundo || e.nundo || e.shundo || e.legacyMoves.length > 0
	);
}
