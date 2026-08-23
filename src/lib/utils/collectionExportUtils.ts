import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import type { RawExportPokemon } from "@/lib/types/collectionExport";

// Official per-level CP multipliers, levels 1-80, from Niantic's
// PLAYER_LEVEL_SETTINGS game master template. Half-levels (from powering up
// a caught Pokemon) aren't listed by Niantic directly - they're derived with
// the documented formula below.
const INTEGER_LEVEL_CPM = [
	0.094, 0.16639787, 0.21573247, 0.25572005, 0.29024988, 0.3210876, 0.34921268, 0.3752356,
	0.39956728, 0.4225, 0.44310755, 0.4627984, 0.48168495, 0.49985844, 0.51739395, 0.5343543,
	0.5507927, 0.5667545, 0.5822789, 0.5974, 0.6121573, 0.6265671, 0.64065295, 0.65443563, 0.667934,
	0.6811649, 0.69414365, 0.7068842, 0.7193991, 0.7317, 0.7377695, 0.74378943, 0.74976104,
	0.7556855, 0.76156384, 0.76739717, 0.7731865, 0.77893275, 0.784637, 0.7903, 0.7953, 0.8003,
	0.8053, 0.8103, 0.8153, 0.8203, 0.8253, 0.8303, 0.8353, 0.8403, 0.8453, 0.8503, 0.8553, 0.8603,
	0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
	0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
	0.8653, 0.8653
];

let levelCpmTable: { level: number; cpm: number }[] | undefined;

function buildLevelCpmTable() {
	if (levelCpmTable) return levelCpmTable;

	const table: { level: number; cpm: number }[] = [];
	INTEGER_LEVEL_CPM.forEach((cpm, i) => {
		const level = i + 1;
		table.push({ level, cpm });

		const nextCpm = INTEGER_LEVEL_CPM[i + 1];
		if (nextCpm !== undefined) {
			// half-level CPM = sqrt(avg of the two neighboring squared CPMs)
			table.push({ level: level + 0.5, cpm: Math.sqrt((cpm * cpm + nextCpm * nextCpm) / 2) });
		}
	});

	levelCpmTable = table;
	return table;
}

export function cpmToLevel(cpm: number): number | undefined {
	if (!cpm) return undefined;

	const table = buildLevelCpmTable();
	let closest = table[0];
	let closestDiff = Math.abs(table[0].cpm - cpm);

	for (const entry of table) {
		const diff = Math.abs(entry.cpm - cpm);
		if (diff < closestDiff) {
			closest = entry;
			closestDiff = diff;
		}
	}

	return closest.level;
}

export function getGenderSymbol(gender: number): string {
	if (gender === 1) return "♂";
	if (gender === 2) return "♀";
	return "";
}

// PokemonDisplayProto.alignment: 0 = normal, 1 = shadow, 2 = purified
export function getAlignmentLabel(alignment: number): string {
	if (alignment === 1) return "Shadow";
	if (alignment === 2) return "Purified";
	return "";
}

export function buildMoveNameMap(): Map<number, string> {
	const map = new Map<number, string>();
	const masterFile = getMasterFile();
	if (!masterFile) return map;

	const addMoves = (pokemon: (typeof masterFile.pokemon)[string] | undefined) => {
		if (!pokemon) return;
		for (const move of [...(pokemon.quickMoves ?? []), ...(pokemon.chargedMoves ?? [])]) {
			if (!map.has(move.id)) map.set(move.id, move.name);
		}
	};

	for (const pokemon of Object.values(masterFile.pokemon)) {
		addMoves(pokemon);
		for (const form of Object.values(pokemon.forms ?? {})) addMoves(form);
		for (const tempEvo of Object.values(pokemon.tempEvos ?? {})) addMoves(tempEvo);
	}

	return map;
}

export function getSpeciesName(dex: number): string {
	return getMasterPokemon(dex)?.name ?? "";
}

export function getFormName(dex: number, form: number): string {
	const normalized = getNormalizedForm(dex, form);
	if (!normalized) return "";
	const formData = getMasterPokemon(dex, normalized);
	const name = formData?.name ?? "";
	// forms fall back to the base species name when unnamed - only report an
	// actual form label
	return name && name !== getSpeciesName(dex) ? name : "";
}

function csvField(value: string | number | undefined): string {
	if (value === undefined || value === null) return "";
	const str = String(value);
	if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
	return str;
}

export function csvRow(fields: (string | number | undefined)[]): string {
	return fields.map(csvField).join(",");
}

export function formatPokeGenieDate(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatCalcyIvDate(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	const year2 = String(d.getFullYear()).slice(-2);
	return `${d.getMonth() + 1}/${d.getDate()}/${year2} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const POKE_GENIE_HEADER = [
	"Index", "Name", "Form", "Pokemon", "Gender", "CP", "HP", "Atk IV", "Def IV", "Sta IV",
	"IV Avg", "Level Min", "Level Max", "Quick Move", "Charge Move", "Charge Move 2", "Scan Date",
	"Catch Date", "Weight", "Height", "Lucky", "Shadow/Purified", "Favorite", "Dust",
	"Rank % (G)", "Rank # (G)", "Stat Product (G)", "Dust Cost (G)", "Candy Cost (G)", "Name (G)",
	"Form (G)", "Sha/Pur (G)", "Rank % (U)", "Rank # (U)", "Stat Product (U)", "Dust Cost (U)",
	"Candy Cost (U)", "Name (U)", "Form (U)", "Sha/Pur (U)", "Rank % (L)", "Rank # (L)",
	"Stat Product (L)", "Dust Cost (L)", "Candy Cost (L)", "Name (L)", "Form (L)", "Sha/Pur (L)",
	"Marked for PvP use"
];

export function buildPokeGenieCsv(
	pokemon: RawExportPokemon[],
	moveNames: Map<number, string>
): string {
	const lines = [csvRow(POKE_GENIE_HEADER)];

	pokemon.forEach((p, i) => {
		const ivAvg = ((p.atk + p.def + p.sta) / 45) * 100;
		const level = cpmToLevel(p.cpm);

		lines.push(
			csvRow([
				i + 1,
				getSpeciesName(p.dex),
				getFormName(p.dex, p.form),
				p.dex,
				getGenderSymbol(p.gender),
				p.cp,
				"", // HP - not in source export
				p.atk,
				p.def,
				p.sta,
				ivAvg.toFixed(1),
				level?.toFixed(1) ?? "",
				level?.toFixed(1) ?? "",
				moveNames.get(p.move1) ?? "",
				moveNames.get(p.move2) ?? "",
				p.move3 ? (moveNames.get(p.move3) ?? "") : "",
				"", // Scan Date - not distinct from catch date in source export
				formatPokeGenieDate(p.caught_ms),
				"", // Weight
				"", // Height
				p.lucky ? 1 : 0,
				getAlignmentLabel(p.alignment),
				p.favorite ? 1 : 0,
				"", // Dust
				"", "", "", "", "", "", "", "", // Great League rank columns
				"", "", "", "", "", "", "", "", // Ultra League rank columns
				"", "", "", "", "", "", "", "", // Little League rank columns
				"" // Marked for PvP use
			])
		);
	});

	return lines.join("\r\n");
}

const CALCY_IV_HEADER = [
	"Ancestor?", "Scan date", "Nr", "Name", "Temp Evo", "Gender", "Nickname", "Level",
	"possibleLevels", "CP", "HP", "Dust cost", "min IV%", "ØIV%", "max IV%", "ØATT IV", "ØDEF IV",
	"ØHP IV", "Unique?", "Fast move", "Fast move (ID)", "Special move", "Special move (ID)",
	"Special move 2", "Special move 2 (ID)", "DPS", "LL Rank (min)", "LL Rank (max)", "GL Evo",
	"GL Rank (min)", "GL Rank (max)", "UL Evo", "UL Rank (min)", "UL Rank (max)", "Box", "Custom1",
	"Custom2", "Saved", "Egg", "Lucky?", "Favorite", "BuddyBoosted", "Form", "ShadowForm",
	"MultiForm?", "Dynamax", "Height (cm)", "Weight (g)", "Height Tag", "Catch Date", "Catch Level"
];

export function buildCalcyIvCsv(
	pokemon: RawExportPokemon[],
	moveNames: Map<number, string>
): string {
	const lines = [csvRow(CALCY_IV_HEADER)];

	pokemon.forEach((p) => {
		const ivPct = ((p.atk + p.def + p.sta) / 45) * 100;
		const level = cpmToLevel(p.cpm);
		const catchDate = formatCalcyIvDate(p.caught_ms);

		lines.push(
			csvRow([
				"", // Ancestor?
				catchDate, // Scan date - not distinct from catch date in source export
				p.dex,
				p.alignment === 1 ? `${getSpeciesName(p.dex)} Shadow` : getSpeciesName(p.dex),
				"", // Temp Evo
				getGenderSymbol(p.gender),
				p.nickname,
				level?.toFixed(1) ?? "",
				level?.toFixed(1) ?? "",
				p.cp,
				"", // HP
				"", // Dust cost
				ivPct.toFixed(1),
				ivPct.toFixed(1),
				ivPct.toFixed(1),
				p.atk.toFixed(1),
				p.def.toFixed(1),
				p.sta.toFixed(1),
				"", // Unique?
				moveNames.get(p.move1) ?? "",
				p.move1 || "",
				moveNames.get(p.move2) ?? "",
				p.move2 || "",
				p.move3 ? (moveNames.get(p.move3) ?? "") : "",
				p.move3 || "",
				"", // DPS
				"", "", "", "", "", "", "", "", // LL/GL/UL rank + evo columns
				"", // Box
				"", // Custom1
				"", // Custom2
				"", // Saved
				p.hatched ? 1 : 0, // Egg
				p.lucky ? 1 : 0,
				p.favorite ? 1 : 0,
				"", // BuddyBoosted
				getFormName(p.dex, p.form),
				p.alignment === 1 ? 1 : 0, // ShadowForm
				"", // MultiForm?
				"", // Dynamax
				"", // Height (cm)
				"", // Weight (g)
				"", // Height Tag
				catchDate,
				"" // Catch Level
			])
		);
	});

	return lines.join("\r\n");
}
