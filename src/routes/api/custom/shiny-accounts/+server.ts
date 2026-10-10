import {
	addShinyAccount,
	isShinyPredictionEnabled,
	listShinyAccounts
} from "@/lib/server/shinyPrediction/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	if (!isShinyPredictionEnabled()) return json({ error: "Not enabled" }, { status: 404 });
	return json(await listShinyAccounts(locals.user.id));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
	if (!isShinyPredictionEnabled()) return json({ error: "Not enabled" }, { status: 404 });

	const body: { label?: unknown; playerId?: unknown } | null = await request
		.json()
		.catch(() => null);
	const error = await addShinyAccount(locals.user.id, body?.label, body?.playerId);
	if (error) return json({ error }, { status: 400 });
	return json(await listShinyAccounts(locals.user.id));
};
