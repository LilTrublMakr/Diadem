import { listSubscriptions, createSubscription } from "@/lib/server/notifications/service";
import {
	guardNotificationRequest,
	notificationErrorResponse,
	toSubscriptionDto
} from "@/lib/server/notifications/endpointUtils";
import { createSubscriptionSchema } from "@/lib/server/notifications/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const subscriptions = await listSubscriptions(guard.userId);
	return json(subscriptions.map(toSubscriptionDto));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const parsed = createSubscriptionSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await createSubscription(guard.userId, parsed.data);
		return json(toSubscriptionDto(row), { status: 201 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
