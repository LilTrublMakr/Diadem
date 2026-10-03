import { rocketLineupsProvider } from "@/lib/server/provider/rocketLineupsProvider";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
	return json(await rocketLineupsProvider.get());
};
