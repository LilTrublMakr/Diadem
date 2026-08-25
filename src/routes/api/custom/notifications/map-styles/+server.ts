import { guardNotificationRequest } from "@/lib/server/notifications/endpointUtils";
import { rampardosStylesProvider } from "@/lib/server/provider/rampardosStylesProvider";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const styles = await rampardosStylesProvider.get();
	return json(styles);
};
