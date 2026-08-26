import { featuredAttackProvider } from "@/lib/server/provider/featuredAttackProvider";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return json(await featuredAttackProvider.get());
};
