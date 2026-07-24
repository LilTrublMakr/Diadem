import { getTracker, upsertTracker } from "@/lib/server/db/internal/repository";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const pokemonId = parseInt(params.id);
	if (isNaN(pokemonId)) return json({ error: "Invalid id" }, { status: 400 });
	const form = parseInt(url.searchParams.get('form') ?? '0') || 0;
	const row = await getTracker(locals.user.id, pokemonId, form);
	return json({ shiny: row?.shiny ?? false, hundo: row?.hundo ?? false, nundo: row?.nundo ?? false, shundo: row?.shundo ?? false, legacyMoves: row?.legacyMoves ?? [] });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const pokemonId = parseInt(params.id);
	if (isNaN(pokemonId)) return json({ error: "Invalid id" }, { status: 400 });
	const body = await request.json();
	const form = typeof body.form === "number" ? body.form : 0;
	const data: { shiny?: boolean; hundo?: boolean; nundo?: boolean; shundo?: boolean; legacyMoves?: string[] } = {};
	if (typeof body.shiny === "boolean") data.shiny = body.shiny;
	if (typeof body.hundo === "boolean") data.hundo = body.hundo;
	if (typeof body.nundo === "boolean") data.nundo = body.nundo;
	if (typeof body.shundo === "boolean") data.shundo = body.shundo;
	if (Array.isArray(body.legacyMoves) && body.legacyMoves.every((m: unknown) => typeof m === "string")) data.legacyMoves = body.legacyMoves;
	const row = await upsertTracker(locals.user.id, pokemonId, form, data);
	return json({ shiny: row?.shiny ?? false, hundo: row?.hundo ?? false, nundo: row?.nundo ?? false, shundo: row?.shundo ?? false, legacyMoves: row?.legacyMoves ?? [] });
};
