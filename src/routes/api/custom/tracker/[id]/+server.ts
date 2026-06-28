import { getTracker, upsertTracker } from "@/lib/server/db/internal/repository";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const pokemonId = parseInt(params.id);
	if (isNaN(pokemonId)) return json({ error: "Invalid id" }, { status: 400 });
	const row = await getTracker(locals.user.id, pokemonId);
	return json({ shiny: row?.shiny ?? false, hundo: row?.hundo ?? false, nundo: row?.nundo ?? false, shundo: row?.shundo ?? false });
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const pokemonId = parseInt(params.id);
	if (isNaN(pokemonId)) return json({ error: "Invalid id" }, { status: 400 });
	const body = await request.json();
	const data: { shiny?: boolean; hundo?: boolean; nundo?: boolean; shundo?: boolean } = {};
	if (typeof body.shiny === "boolean") data.shiny = body.shiny;
	if (typeof body.hundo === "boolean") data.hundo = body.hundo;
	if (typeof body.nundo === "boolean") data.nundo = body.nundo;
	if (typeof body.shundo === "boolean") data.shundo = body.shundo;
	const row = await upsertTracker(locals.user.id, pokemonId, data);
	return json({ shiny: row?.shiny ?? false, hundo: row?.hundo ?? false, nundo: row?.nundo ?? false, shundo: row?.shundo ?? false });
};
