import { getAllTrackers } from "@/lib/server/db/internal/repository";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const rows = await getAllTrackers(locals.user.id);
	return json(rows.map((r) => ({ pokemonId: r.pokemonId, form: r.form, shiny: r.shiny, hundo: r.hundo, nundo: r.nundo, shundo: r.shundo })));
};
