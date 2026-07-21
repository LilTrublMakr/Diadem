import { createNotificationArea, listNotificationAreas } from "@/lib/server/notifications/service";
import {
	guardNotificationRequest,
	notificationErrorResponse,
	toAreaDto
} from "@/lib/server/notifications/endpointUtils";
import { createNotificationAreaSchema } from "@/lib/server/notifications/areaValidation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const areas = await listNotificationAreas(guard.userId);
	return json(areas.map(toAreaDto));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const parsed = createNotificationAreaSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await createNotificationArea(guard.userId, parsed.data);
		return json(toAreaDto(row), { status: 201 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
