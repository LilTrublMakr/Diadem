import { getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { RawExportPokemon } from "@/lib/types/collectionExport";

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

/**
 * Groups a parsed collection export by species+form and derives what each group proves for
 * tracker purposes — any individual proving a flag is enough for the whole group. Groups with
 * nothing to report (no hundo/nundo/shundo/shiny/legacy move evidence at all) are omitted.
 */
export function aggregateTrackerImport(pokemon: RawExportPokemon[]): TrackerImportEntry[] {
	const groups = new Map<string, TrackerImportEntry>();

	for (const p of pokemon) {
		const form = getNormalizedForm(p.dex, p.form);
		const key = `${p.dex}-${form}`;
		const hundo = isHundo(p);
		const nundo = isNundo(p);
		const shundo = !!p.shiny && hundo;
		const legacy = legacyMovesOwned(p);

		let entry = groups.get(key);
		if (!entry) {
			entry = {
				pokemonId: p.dex,
				form,
				shiny: false,
				hundo: false,
				nundo: false,
				shundo: false,
				legacyMoves: []
			};
			groups.set(key, entry);
		}

		entry.shiny = entry.shiny || !!p.shiny;
		entry.hundo = entry.hundo || hundo;
		entry.nundo = entry.nundo || nundo;
		entry.shundo = entry.shundo || shundo;
		for (const proto of legacy) {
			if (!entry.legacyMoves.includes(proto)) entry.legacyMoves.push(proto);
		}
	}

	return [...groups.values()].filter(
		(e) => e.shiny || e.hundo || e.nundo || e.shundo || e.legacyMoves.length > 0
	);
}
