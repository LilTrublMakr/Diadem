import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
import { CALCY_IV_MOVE_IDS } from "@/lib/utils/calcyIvMoveIds";
import { findCalcyFormId } from "@/lib/utils/calcyIvFormIds";
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

// Reverse of cpmToLevel - used when parsing a source that only records level (e.g. an imported
// PokeGenie/CalcyIV CSV), since RawExportPokemon stores cpm, not level, internally.
export function levelToCpm(level: number): number | undefined {
	if (!level) return undefined;

	const table = buildLevelCpmTable();
	let closest = table[0];
	let closestDiff = Math.abs(table[0].level - level);

	for (const entry of table) {
		const diff = Math.abs(entry.level - level);
		if (diff < closestDiff) {
			closest = entry;
			closestDiff = diff;
		}
	}

	return closest.cpm;
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

	// The global move list is authoritative and includes retired/no-longer-learnable moves (old
	// Community Day exclusives, etc.) that a per-species movepool walk below would miss - a caught
	// pokemon can still hold one of these even though no current species can learn it anymore.
	for (const move of Object.values(masterFile.moves ?? {})) {
		map.set(move.id, move.name);
	}

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

/**
 * Real in-game HP = floor((baseStamina + staminaIV) * cpm) - not just a display value, CalcyIV's
 * own importer uses it as a required disambiguator when re-deriving valid IV combinations from
 * CP+Level+species (confirmed via its logcat: `updateIV: not computable` / "empty combinations"
 * for every row where this app used to leave HP blank, since CP+Level alone match dozens of
 * different IV combos - HP narrows it down to the one that's actually correct).
 */
export function calculateHp(dex: number, form: number, staIv: number, cpm: number): number | null {
	const normalized = getNormalizedForm(dex, form);
	const baseSta = getMasterPokemon(dex, normalized)?.baseSta;
	if (baseSta === undefined) return null;
	return Math.max(10, Math.floor((baseSta + staIv) * cpm));
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

export const POKE_GENIE_HEADER = [
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

// PokeGenie's own move name field splits a Hidden Power variant into a plain "Hidden Power" plus
// a separate type field (e.g. quickMove: "Hidden Power", hiddenPowerType: "Ground") rather than a
// single "Hidden Power Ground" string.
function splitHiddenPower(name: string): { move: string; hiddenPowerType: string } {
	const prefix = "Hidden Power ";
	return name.startsWith(prefix)
		? { move: "Hidden Power", hiddenPowerType: name.slice(prefix.length) }
		: { move: name, hiddenPowerType: "" };
}

function formatPokeGenieBackupTimestamp(ms: number): string {
	const d = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	const offsetMin = -d.getTimezoneOffset();
	const sign = offsetMin >= 0 ? "+" : "-";
	const offH = pad(Math.floor(Math.abs(offsetMin) / 60));
	const offM = pad(Math.abs(offsetMin) % 60);
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${offH}${offM}`
	);
}

/**
 * PokeGenie's real import path is a Dropbox "Backup" folder restore, not a file upload - there is
 * no public spec for scan_data.json. This was reverse-engineered from decompiling PokeGenie's own
 * APK (com.cjin.pokegenie.standard, class com.canjin.pokegenie.pokegenie.ScanResultObject) after a
 * real backup a user pulled from their own Dropbox showed the file's general shape, so field names
 * and types below are verified against the actual Gson target class, not guessed:
 * - The whole array is parsed by Gson in one shot (GsonBuilder().setDateFormat("yyyy-MM-dd'T'HH:mm:ssZ")
 *   .fromJson(json, new TypeToken<List<ScanResultObject>>(){}.getType())) - a type mismatch on ANY
 *   field of ANY entry throws JsonSyntaxException and aborts the entire restore, not just one row.
 *   Every field written below was checked against ScanResultObject's real declared type for this
 *   reason; anything not confirmed is omitted rather than guessed (Gson defaults a missing key
 *   quietly - int/boolean fields to 0/false, object fields to null - it only throws on a present key
 *   whose value doesn't fit the field's type).
 * - `id` is a per-entry unique key: DataManager.restoreDataFromBackup() does
 *   `scanResultsDict.put(id, scanResultObject)` on a plain HashMap, so a repeated `id` across
 *   entries silently drops all but the last one sharing it - it must NOT be the species number
 *   (`pokemonNumber` already carries that), which is why this uses the source export's own
 *   per-catch id.
 * - `appOverallL`/`appStatsL` are real Java enums (GFun$AppraisalOverall/AppraisalStatsRating) whose
 *   constants carry @SerializedName("0".."4") - the literal string "0" (their "Unknown" value) is a
 *   genuine, confirmed-valid wire value, not a placeholder guess.
 * - `singleValidIvComb`'s target type (IVComb) has exactly the four fields written here
 *   (attackIV/defenseIV/pokemonLevel/staminaIV as int/int/String/int) - confirmed field-for-field.
 * - Restoring pokedex images and name-gen settings are independent user-toggleable options
 *   (BackupOptions.restorePokedex/restoreNameGenPref); restoring scan_data.json itself is not
 *   optional but also doesn't require those other two files to be present.
 */
export function buildPokeGenieBackupJson(
	pokemon: RawExportPokemon[],
	moveNames: Map<number, string>
): string {
	const entries = pokemon.map((p) => {
		const level = cpmToLevel(p.cpm) ?? 0;
		const hp = calculateHp(p.dex, p.form, p.sta, p.cpm);
		const ivFraction = (p.atk + p.def + p.sta) / 45;
		const formName = getFormName(p.dex, p.form);
		const quick = splitHiddenPower(moveNames.get(p.move1) ?? "");
		const charge = splitHiddenPower(moveNames.get(p.move2) ?? "").move;
		const charge2 = p.move3 ? splitHiddenPower(moveNames.get(p.move3) ?? "").move : "";

		return {
			appOverallL: "0",
			appStatsL: "0",
			avgAttackIV: p.atk,
			avgDefenseIV: p.def,
			avgStaminaIV: p.sta,
			buddyBoost: false,
			captureDay: 0,
			captureMonth: 0,
			capturePriority: 0,
			captureYear: 0,
			chargeMove: charge,
			chargeMove2: charge2,
			cp: p.cp,
			cpNext: 0,
			defendingGym: false,
			dust: 0,
			favSelection: p.favorite ? 1 : 0,
			...(formName ? { form: formName } : {}),
			gender: p.gender,
			hatchedFromEgg: p.hatched,
			height: "0",
			hiddenPowerType: quick.hiddenPowerType,
			hp: hp ?? 0,
			// Unique per-entry key (see doc comment above) - NOT the species number.
			id: p.id,
			imageId: "",
			isLuckyPokemon: p.lucky,
			ivLower: ivFraction,
			ivPercentage: ivFraction,
			ivUpper: ivFraction,
			level4Mega: false,
			level4Mega2: false,
			level4Mega2Set: false,
			level4MegaSet: false,
			maxAttackIV: p.atk,
			maxBattleIV: 0,
			maxCPLower: 0,
			maxCPUpper: 0,
			maxDefenseIV: p.def,
			maxHPLower: 0,
			maxHPUpper: 0,
			maxStaminaIV: p.sta,
			megaSwitched: false,
			minAttackIV: p.atk,
			minBattleIV: 0,
			minDefenseIV: p.def,
			minStaminaIV: p.sta,
			pokemonLevelLower: level.toFixed(1),
			pokemonLevelUpper: "",
			pokemonName: getSpeciesName(p.dex),
			pokemonNumber: p.dex,
			pvpPinned: false,
			pvpSelected: false,
			pvpStatus: 0,
			quickMove: quick.move,
			selectedMegaEvol: 0,
			setPokemonLevel: Math.round(level),
			// Real backups showed only 0 (normal) / 1 (shadow) - purified isn't confirmed, treated as 0.
			shadowPokemon: p.alignment === 1 ? 1 : 0,
			singleIVComb: true,
			singleValidIvComb: {
				attackIV: p.atk,
				defenseIV: p.def,
				pokemonLevel: level.toFixed(1),
				staminaIV: p.sta
			},
			timeOfScan: formatPokeGenieBackupTimestamp(p.caught_ms),
			trainerLevel: 0,
			unread: true,
			userManuallySetPokemonLevel: false,
			weatherBoost: false,
			weight: "0"
		};
	});

	return JSON.stringify(entries);
}

/** Companion metadata.json for a PokeGenie Backup folder - counts must match what's actually in
 * the folder (numPokedexImages: 0 since this export includes no pokedex/scan_thumb images). */
export function buildPokeGenieMetadataJson(scanCount: number, atMs: number): string {
	const timestamp = formatPokeGenieBackupTimestamp(atMs);
	return JSON.stringify({
		lastBackupDate: timestamp,
		lastNameGenDate: timestamp,
		lastPokedexBackupDate: timestamp,
		numPokedexImages: 0,
		numScans: scanCount,
		platform: 1,
		protocolVersion: 1
	});
}

export const CALCY_IV_HEADER = [
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
		const hp = calculateHp(p.dex, p.form, p.sta, p.cpm);
		const formName = getFormName(p.dex, p.form);
		const calcyFormId = formName ? findCalcyFormId(p.dex, formName) : undefined;

		// CalcyIV's own placeholder for a missing move is " - " (with spaces) on both the name
		// and id columns, never a blank cell - and `id || ""` would wrongly blank out a real id
		// of 0, so check explicitly instead.
		//
		// The ID column must be CalcyIV's own move id (CALCY_IV_MOVE_IDS), not this app's own
		// moveId param - CalcyIV's importer trusts the ID column and looks it up in its own
		// internal move enumeration (unrelated to Niantic's real move ids), ignoring the name
		// text entirely. Writing our own id there made CalcyIV display a wrong (or blank) move
		// for the vast majority of rows.
		const moveCell = (moveId: number): [string, string] => {
			if (!moveId) return [" - ", " - "];
			const name = moveNames.get(moveId) ?? "";
			// This app's masterfile source uses a curly apostrophe (Nature's Madness) where
			// CalcyIV's own table uses a straight one - normalize before lookup.
			const calcyId = CALCY_IV_MOVE_IDS[name] ?? CALCY_IV_MOVE_IDS[name.replace(/’/g, "'")];
			return calcyId === undefined ? [name, " - "] : [name, String(calcyId)];
		};
		const [move1Name, move1Id] = moveCell(p.move1);
		const [move2Name, move2Id] = moveCell(p.move2);
		const [move3Name, move3Id] = moveCell(p.move3);

		lines.push(
			csvRow([
				0, // Ancestor?
				catchDate, // Scan date - not distinct from catch date in source export
				p.dex,
				p.alignment === 1 ? `${getSpeciesName(p.dex)} Shadow` : getSpeciesName(p.dex),
				"-", // Temp Evo
				getGenderSymbol(p.gender),
				p.nickname,
				level?.toFixed(1) ?? "",
				level?.toFixed(1) ?? "",
				p.cp,
				hp ?? "",
				"", // Dust cost
				ivPct.toFixed(1),
				ivPct.toFixed(1),
				ivPct.toFixed(1),
				p.atk.toFixed(1),
				p.def.toFixed(1),
				p.sta.toFixed(1),
				1, // Unique?
				move1Name,
				move1Id,
				move2Name,
				move2Id,
				move3Name,
				move3Id,
				"0.0", // DPS
				"", "", "", "", "", "", "", "", // LL/GL/UL rank + evo columns
				"Default", // Box
				"", // Custom1
				"", // Custom2
				0, // Saved
				p.hatched ? 1 : 0, // Egg
				p.lucky ? 1 : 0,
				p.favorite ? 1 : 0,
				0, // BuddyBoosted
				// CalcyIV's own per-(species,form) monster id (calcyIvFormIds.ts) - blank is correct
				// for a base-form individual (CalcyIV's own default already resolves to the only
				// monster for that dex), but a real alt form needs the right one or CalcyIV's CP+HP+IV
				// combo-search runs against the wrong (base) form's stats and rejects the row.
				calcyFormId ?? "",
				// CalcyIV's ShadowForm encoding is the REVERSE of this app's own `alignment`
				// (0=normal here too, but CalcyIV uses 2=shadow/1=purified vs our 1=shadow/2=purified)
				p.alignment === 1 ? 2 : p.alignment === 2 ? 1 : 0,
				0, // MultiForm?
				"", // Dynamax
				"", // Height (cm)
				"", // Weight (g)
				"", // Height Tag
				catchDate,
				"" // Catch Level
			])
		);
	});

	return lines.join("\n");
}
