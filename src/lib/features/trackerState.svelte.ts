type TrackerEntry = { shiny: boolean; hundo: boolean };

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
	const data: { pokemonId: number; shiny: boolean; hundo: boolean }[] = await res.json();
	const record: Record<number, TrackerEntry> = {};
	for (const row of data) {
		record[row.pokemonId] = { shiny: row.shiny, hundo: row.hundo };
	}
	trackers = record;
	loaded = true;
}

export function setTrackerEntry(pokemonId: number, data: Partial<TrackerEntry>): void {
	trackers = {
		...trackers,
		[pokemonId]: { ...(trackers[pokemonId] ?? { shiny: false, hundo: false }), ...data }
	};
}
