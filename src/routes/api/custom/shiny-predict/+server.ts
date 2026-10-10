import { predictShiny } from "@/lib/server/shinyPrediction/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// GET ?encounterId=&pokemonId=&form= — which of the caller's linked accounts see this spawn as
// shiny. Done server-side so linked player ids never reach the browser.
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const encounterId = url.searchParams.get("encounterId") ?? "";
	const pokemonId = Number(url.searchParams.get("pokemonId"));
	const form = Number(url.searchParams.get("form") ?? 0);
	if (!Number.isInteger(pokemonId) || !Number.isInteger(form))
		return json({ error: "Invalid pokemon" }, { status: 400 });

	return json(await predictShiny(locals.user.id, encounterId, pokemonId, form));
};
