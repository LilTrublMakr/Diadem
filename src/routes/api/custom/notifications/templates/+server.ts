import { listTemplates, createTemplate } from "@/lib/server/notifications/service";
import {
	guardNotificationRequest,
	notificationErrorResponse,
	toTemplateDto
} from "@/lib/server/notifications/endpointUtils";
import { createTemplateSchema } from "@/lib/server/notifications/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const templates = await listTemplates(guard.userId);
	return json(templates.map(toTemplateDto));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const parsed = createTemplateSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await createTemplate(guard.userId, parsed.data);
		return json(toTemplateDto(row), { status: 201 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
