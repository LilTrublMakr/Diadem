import { moveMechanicsProvider } from "@/lib/server/provider/moveMechanicsProvider";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return json(await moveMechanicsProvider.get());
};
