import { deleteNotificationArea, updateNotificationArea } from "@/lib/server/notifications/service";
import {
	guardNotificationRequest,
	notificationErrorResponse,
	parseNotificationId,
	toAreaDto
} from "@/lib/server/notifications/endpointUtils";
import { patchNotificationAreaSchema } from "@/lib/server/notifications/areaValidation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseNotificationId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	const parsed = patchNotificationAreaSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await updateNotificationArea(guard.userId, id, parsed.data);
		return json(toAreaDto(row));
	} catch (error) {
		return notificationErrorResponse(error);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseNotificationId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	try {
		await deleteNotificationArea(guard.userId, id);
		return new Response(null, { status: 204 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
