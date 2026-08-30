import { getTracker, upsertTracker } from "@/lib/server/db/internal/repository";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

type ImportEntry = {
	pokemonId: number;
	form: number;
	shiny: boolean;
	hundo: boolean;
	nundo: boolean;
	shundo: boolean;
	legacyMoves: string[];
};

function isValidEntry(e: unknown): e is ImportEntry {
	if (!e || typeof e !== "object") return false;
	const entry = e as Record<string, unknown>;
	return (
		typeof entry.pokemonId === "number" &&
		typeof entry.form === "number" &&
		typeof entry.shiny === "boolean" &&
		typeof entry.hundo === "boolean" &&
		typeof entry.nundo === "boolean" &&
		typeof entry.shundo === "boolean" &&
		Array.isArray(entry.legacyMoves) &&
		entry.legacyMoves.every((m) => typeof m === "string")
	);
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const body = await request.json();
	const entries: unknown[] = Array.isArray(body?.entries) ? body.entries : [];
	const mode = body?.mode === "replace" ? "replace" : "merge";

	let updated = 0;
	for (const raw of entries) {
		if (!isValidEntry(raw)) continue;

		if (mode === "merge") {
			const existing = await getTracker(locals.user.id, raw.pokemonId, raw.form);
			await upsertTracker(locals.user.id, raw.pokemonId, raw.form, {
				shiny: (existing?.shiny ?? false) || raw.shiny,
				hundo: (existing?.hundo ?? false) || raw.hundo,
				nundo: (existing?.nundo ?? false) || raw.nundo,
				shundo: (existing?.shundo ?? false) || raw.shundo,
				legacyMoves: [...new Set([...(existing?.legacyMoves ?? []), ...raw.legacyMoves])]
			});
		} else {
			await upsertTracker(locals.user.id, raw.pokemonId, raw.form, {
				shiny: raw.shiny,
				hundo: raw.hundo,
				nundo: raw.nundo,
				shundo: raw.shundo,
				legacyMoves: raw.legacyMoves
			});
		}
		updated++;
	}

	return json({ updated });
};
