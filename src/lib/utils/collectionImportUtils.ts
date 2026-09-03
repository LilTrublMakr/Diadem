import { getMasterFile, getMasterPokemon } from "@/lib/services/masterfile";
import { parseCsv } from "@/lib/utils/csvParse";
import { buildMoveNameMap, levelToCpm } from "@/lib/utils/collectionExportUtils";
import type { RawExportPokemon } from "@/lib/types/collectionExport";

export type ExportFormat = "json" | "pokegenie" | "calcyiv" | "unknown";

/**
 * Try the app's own JSON export shape first, then sniff a CSV header row for a couple of column
 * names distinctive to each third-party format — not a full exact-header match, so minor column
 * additions in a newer PokeGenie/CalcyIV app version don't silently break detection.
 *
 * The export tool's JSON shape changed (as of Sept 2026) from a `{payload:{ok,pokemon:[...]}}`
 * wrapper to a plain top-level array of pokemon — both are accepted here, and in
 * ExportParsePanel.svelte's parseJsonExport, in case an older export is ever pasted in.
 */
export function detectExportFormat(text: string): ExportFormat {
	const trimmed = text.trim();
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		try {
			const data = JSON.parse(trimmed);
			if (Array.isArray(data)) return "json";
			if (Array.isArray(data?.payload?.pokemon)) return "json";
		} catch {
			// fall through to CSV sniffing below
		}
	}

	const rows = parseCsv(trimmed);
	const header = rows[0] ?? [];
	if (header.includes("Marked for PvP use") && header.includes("Sha/Pur (G)")) return "pokegenie";
	if (header.includes("possibleLevels") && header.includes("ØATT IV")) return "calcyiv";
	return "unknown";
}

/** Inverts buildMoveNameMap() (id→name) for formats that only export a move's display name. */
export function buildMoveIdMap(): Map<string, number> {
	const byId = buildMoveNameMap();
	const byName = new Map<string, number>();
	for (const [id, name] of byId) byName.set(name.toLowerCase(), id);
	return byName;
}

function colIndex(header: string[], label: string): number {
	return header.indexOf(label);
}

function cell(row: string[], header: string[], label: string): string {
	const idx = colIndex(header, label);
	return idx >= 0 ? (row[idx] ?? "") : "";
}

function genderToValue(symbol: string): number {
	if (symbol === "♂") return 1;
	if (symbol === "♀") return 2;
	return 3;
}

function alignmentLabelToValue(label: string): number {
	if (label === "Shadow") return 1;
	if (label === "Purified") return 2;
	return 0;
}

// Resolves a form's display name (e.g. "Alolan") to a form id, scoped to the row's own dex —
// a global name→id map would be ambiguous (many species share generic form labels).
function resolveFormId(dex: number, formLabel: string): number {
	if (!formLabel) return 0;
	const base = getMasterPokemon(dex);
	if (!base) return 0;
	const needle = formLabel.toLowerCase();
	for (const [formId, form] of Object.entries(base.forms ?? {})) {
		if ((form.name ?? "").toLowerCase() === needle) return Number(formId);
	}
	return 0;
}

function parsePokeGenieDate(text: string): number {
	const m = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
	if (!m) return Date.now();
	const [, y, mo, d, h, mi] = m;
	return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi)).getTime();
}

function parseCalcyIvDate(text: string): number {
	const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
	if (!m) return Date.now();
	const [, mo, d, y2, h, mi, s] = m;
	return new Date(
		2000 + Number(y2),
		Number(mo) - 1,
		Number(d),
		Number(h),
		Number(mi),
		Number(s)
	).getTime();
}

/**
 * Lossy on purpose: PokeGenie's export has no shiny/nickname/costume/tags/traded/hatched
 * columns at all — those fields don't exist in that format, so they're defaulted here the same
 * way collectionExportUtils.ts's builders already leave columns blank when the SOURCE export.json
 * lacks data, just mirrored on the parse side.
 */
export function parsePokeGenieCsv(text: string, moveIds: Map<string, number>): RawExportPokemon[] {
	const rows = parseCsv(text.trim());
	const header = rows[0] ?? [];
	if (!getMasterFile())
		throw new Error("Masterfile must be loaded before parsing a PokeGenie export");

	return rows.slice(1).map((row, i) => {
		const dex = Number(cell(row, header, "Pokemon")) || 0;
		const level = Number(cell(row, header, "Level Min")) || undefined;

		return {
			alignment: alignmentLabelToValue(cell(row, header, "Shadow/Purified")),
			atk: Number(cell(row, header, "Atk IV")) || 0,
			buddy_level: 0,
			caught_ms: parsePokeGenieDate(cell(row, header, "Catch Date")),
			costume: 0,
			cp: Number(cell(row, header, "CP")) || 0,
			cpm: levelToCpm(level ?? 0) ?? 0,
			def: Number(cell(row, header, "Def IV")) || 0,
			dex,
			favorite: cell(row, header, "Favorite") === "1",
			form: resolveFormId(dex, cell(row, header, "Form")),
			gender: genderToValue(cell(row, header, "Gender")),
			hatched: false,
			id: crypto.randomUUID(),
			lucky: cell(row, header, "Lucky") === "1",
			mega_level: 0,
			move1: moveIds.get(cell(row, header, "Quick Move").toLowerCase()) ?? 0,
			move2: moveIds.get(cell(row, header, "Charge Move").toLowerCase()) ?? 0,
			move3: moveIds.get(cell(row, header, "Charge Move 2").toLowerCase()) ?? 0,
			nickname: "",
			shiny: false,
			size: "",
			sta: Number(cell(row, header, "Sta IV")) || 0,
			tags: [],
			traded: false
		} satisfies RawExportPokemon;
	});
}

/** CalcyIV's export round-trips more completely than PokeGenie's — it carries move IDs, nickname,
 * and egg status directly, so those fields don't need the defaulting PokeGenie's parser does. */
export function parseCalcyIvCsv(text: string, moveIds: Map<string, number>): RawExportPokemon[] {
	const rows = parseCsv(text.trim());
	const header = rows[0] ?? [];
	if (!getMasterFile())
		throw new Error("Masterfile must be loaded before parsing a CalcyIV export");

	return rows.slice(1).map((row) => {
		const dex = Number(cell(row, header, "Nr")) || 0;
		const level = Number(cell(row, header, "Level")) || undefined;
		const fastMoveId = Number(cell(row, header, "Fast move (ID)")) || undefined;
		const specialMoveId = Number(cell(row, header, "Special move (ID)")) || undefined;
		const specialMove2Id = Number(cell(row, header, "Special move 2 (ID)")) || undefined;

		return {
			alignment: cell(row, header, "ShadowForm") === "1" ? 1 : 0,
			atk: Math.round(Number(cell(row, header, "ØATT IV"))) || 0,
			buddy_level: 0,
			caught_ms: parseCalcyIvDate(cell(row, header, "Catch Date")),
			costume: 0,
			cp: Number(cell(row, header, "CP")) || 0,
			cpm: levelToCpm(level ?? 0) ?? 0,
			def: Math.round(Number(cell(row, header, "ØDEF IV"))) || 0,
			dex,
			favorite: cell(row, header, "Favorite") === "1",
			form: resolveFormId(dex, cell(row, header, "Form")),
			gender: genderToValue(cell(row, header, "Gender")),
			hatched: cell(row, header, "Egg") === "1",
			id: crypto.randomUUID(),
			lucky: cell(row, header, "Lucky?") === "1",
			mega_level: 0,
			move1: fastMoveId ?? moveIds.get(cell(row, header, "Fast move").toLowerCase()) ?? 0,
			move2: specialMoveId ?? moveIds.get(cell(row, header, "Special move").toLowerCase()) ?? 0,
			move3: specialMove2Id ?? moveIds.get(cell(row, header, "Special move 2").toLowerCase()) ?? 0,
			nickname: cell(row, header, "Nickname"),
			shiny: false,
			size: "",
			sta: Math.round(Number(cell(row, header, "ØHP IV"))) || 0,
			tags: [],
			traded: false
		} satisfies RawExportPokemon;
	});
}
