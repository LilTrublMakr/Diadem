type TrackerEntry = { shiny: boolean; hundo: boolean; nundo: boolean; shundo: boolean };

const EMPTY: TrackerEntry = { shiny: false, hundo: false, nundo: false, shundo: false };

let trackers = $state<Record<number, TrackerEntry>>({});
let loaded = $state(false);

export function getTrackers(): Record<number, TrackerEntry> {
	return trackers;
}

export function isTrackerLoaded(): boolean {
	return loaded;
}

export async function loadTrackers(): Promise<void> {
	const res = await fetch('/api/custom/tracker');
	if (!res.ok) { loaded = true; return; }
	const data: { pokemonId: number; shiny: boolean; hundo: boolean; nundo: boolean; shundo: boolean }[] = await res.json();
	const record: Record<number, TrackerEntry> = {};
	for (const row of data) {
		record[row.pokemonId] = { shiny: row.shiny, hundo: row.hundo, nundo: row.nundo, shundo: row.shundo };
	}
	trackers = record;
	loaded = true;
}

export function setTrackerEntry(pokemonId: number, data: Partial<TrackerEntry>): void {
	trackers = {
		...trackers,
		[pokemonId]: { ...(trackers[pokemonId] ?? { ...EMPTY }), ...data }
	};
}
