import { listShinyAccounts, removeShinyAccount } from "@/lib/server/shinyPrediction/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	const id = Number(params.id);
	if (!Number.isInteger(id)) return json({ error: "Invalid id" }, { status: 400 });

	await removeShinyAccount(locals.user.id, id);
	return json(await listShinyAccounts(locals.user.id));
};
