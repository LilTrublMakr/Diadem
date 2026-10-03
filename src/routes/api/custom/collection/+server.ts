import {
	deleteUserCollection,
	getUserCollection,
	saveUserCollection
} from "@/lib/server/db/internal/repository";
import type { RawExportPokemon } from "@/lib/types/collectionExport";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const MAX_POKEMON = 20000;

function isValidPokemon(p: unknown): p is RawExportPokemon {
	if (!p || typeof p !== "object") return false;
	const entry = p as Record<string, unknown>;
	return typeof entry.dex === "number" && typeof entry.cp === "number";
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	return json(await getUserCollection(locals.user.id));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });

	const body = await request.json().catch(() => null);
	const pokemon: unknown[] = Array.isArray(body?.pokemon) ? body.pokemon : [];
	if (pokemon.length === 0 || pokemon.length > MAX_POKEMON || !pokemon.every(isValidPokemon)) {
		return json({ error: "Invalid collection payload" }, { status: 400 });
	}
	const format = typeof body?.format === "string" ? body.format.slice(0, 16) : null;

	await saveUserCollection(locals.user.id, pokemon, format);
	return json({ saved: pokemon.length });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	await deleteUserCollection(locals.user.id);
	return json({ ok: true });
};
