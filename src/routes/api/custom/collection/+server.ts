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

	let body: { pokemon?: unknown; format?: unknown } | null;
	try {
		body = await request.json();
	} catch {
		// Most likely cause: the request body exceeded adapter-node's BODY_SIZE_LIMIT (default
		// 512K) before this handler ever saw it - a real multi-thousand-entry collection as JSON
		// is easily a few MB. Raise BODY_SIZE_LIMIT (e.g. to "10M") in the server's environment.
		return json(
			{ error: "Couldn't read the request body - it may be too large (see server logs/BODY_SIZE_LIMIT)" },
			{ status: 400 }
		);
	}

	const pokemon: unknown[] = Array.isArray(body?.pokemon) ? body.pokemon : [];
	if (pokemon.length === 0) {
		return json({ error: "No Pokemon in payload" }, { status: 400 });
	}
	if (pokemon.length > MAX_POKEMON) {
		return json({ error: `Collection too large (${pokemon.length} > ${MAX_POKEMON} max)` }, { status: 400 });
	}
	const invalidIndex = pokemon.findIndex((p) => !isValidPokemon(p));
	if (invalidIndex !== -1) {
		return json(
			{ error: `Entry ${invalidIndex} is missing a numeric dex/cp - got: ${JSON.stringify(pokemon[invalidIndex]).slice(0, 200)}` },
			{ status: 400 }
		);
	}
	const format = typeof body?.format === "string" ? body.format.slice(0, 16) : null;

	await saveUserCollection(locals.user.id, pokemon as RawExportPokemon[], format);
	return json({ saved: pokemon.length });
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	await deleteUserCollection(locals.user.id);
	return json({ ok: true });
};
