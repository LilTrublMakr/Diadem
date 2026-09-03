// The export tool's own tag catalog (id -> display name) - these ids show up in
// RawExportPokemon.tags. Not sourced from Niantic/this app's masterfile; hardcoded from a real
// export sample since the catalog is small and rarely changes. Update this table if the export
// tool adds new tags and they start showing up unresolved.
export const TAG_NAMES: Record<string, string> = {
	"16535389260858487948": "Mega Evolve",
	"7391671744901040328": "Mega",
	"11338206287932920079": "2016",
	"11089803734413952391": "SilverBottlecap",
	"5771065898952457720": "Hundo",
	"12863442989931556942": "1 Time",
	"14218658330800873752": "98%",
	"10736691521086747875": "96%",
	"6249636863051435758": "93%",
	"218523346719849799": "Legacy Move",
	"12815095218559744600": "XXL/XXS",
	"5334311886979401319": "Dynamax",
	"17723495440537875460": "GymDefenders",
	"1130230555203550584": "Rare",
	"7318124927946677336": "Good Shadow",
	"5292883196813465858": "Unown Dex",
	"8870892596274460608": "Costume",
	"17527733012915367044": "Max",
	"14395787779730087504": "buddycare"
};

/** Resolves tag ids to display names - an id missing from TAG_NAMES falls back to itself. */
export function resolveTagNames(tagIds: string[]): string[] {
	return tagIds.map((id) => TAG_NAMES[id] ?? id);
}
