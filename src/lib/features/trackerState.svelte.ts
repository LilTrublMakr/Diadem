export type TrackerEntry = { pokemonId: number; form: number; shiny: boolean; hundo: boolean; nundo: boolean; shundo: boolean; legacyMoves: string[] };

const EMPTY_FLAGS = { shiny: false, hundo: false, nundo: false, shundo: false, legacyMoves: [] as string[] };

export function trackerKey(pokemonId: number, form: number): string {
	return `${pokemonId}-${form}`;
}

let trackers = $state<Record<string, TrackerEntry>>({});
let loaded = $state(false);

export function getTrackers(): Record<string, TrackerEntry> {
	return trackers;
}

export function isTrackerLoaded(): boolean {
	return loaded;
}

export async function loadTrackers(): Promise<void> {
	const res = await fetch('/api/custom/tracker');
	if (!res.ok) { loaded = true; return; }
	const data: { pokemonId: number; form: number; shiny: boolean; hundo: boolean; nundo: boolean; shundo: boolean; legacyMoves: string[] }[] = await res.json();
	const record: Record<string, TrackerEntry> = {};
	for (const row of data) {
		record[trackerKey(row.pokemonId, row.form)] = { pokemonId: row.pokemonId, form: row.form, shiny: row.shiny, hundo: row.hundo, nundo: row.nundo, shundo: row.shundo, legacyMoves: row.legacyMoves ?? [] };
	}
	trackers = record;
	loaded = true;
}

export function setTrackerEntry(pokemonId: number, form: number, data: Partial<Omit<TrackerEntry, 'pokemonId' | 'form'>>): void {
	const key = trackerKey(pokemonId, form);
	const existing = trackers[key];
	trackers = {
		...trackers,
		[key]: {
			pokemonId,
			form,
			shiny: existing?.shiny ?? false,
			hundo: existing?.hundo ?? false,
			nundo: existing?.nundo ?? false,
			shundo: existing?.shundo ?? false,
			legacyMoves: existing?.legacyMoves ?? [],
			...data
		}
	};
}
