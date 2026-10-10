import {
	updateChannelSubscription,
	deleteChannelSubscription
} from "@/lib/server/notifications/channelService";
import {
	guardChannelRequest,
	notificationErrorResponse,
	parseNotificationId,
	toChannelSubscriptionDto
} from "@/lib/server/notifications/endpointUtils";
import { patchChannelSubscriptionSchema } from "@/lib/server/notifications/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async (event) => {
	const guildId = event.url.searchParams.get("guildId");
	if (!guildId)
		return json({ error: "invalid_request", message: "guildId is required" }, { status: 400 });

	const guard = await guardChannelRequest(event, guildId);
	if (!guard.ok) return guard.response;

	const id = parseNotificationId(event.params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	const parsed = patchChannelSubscriptionSchema.safeParse(
		await event.request.json().catch(() => null)
	);
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await updateChannelSubscription(guard.userId, guildId, id, parsed.data);
		return json(toChannelSubscriptionDto(row));
	} catch (error) {
		return notificationErrorResponse(error);
	}
};

export const DELETE: RequestHandler = async (event) => {
	const guildId = event.url.searchParams.get("guildId");
	if (!guildId)
		return json({ error: "invalid_request", message: "guildId is required" }, { status: 400 });

	const guard = await guardChannelRequest(event, guildId);
	if (!guard.ok) return guard.response;

	const id = parseNotificationId(event.params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	try {
		await deleteChannelSubscription(guildId, id);
		return new Response(null, { status: 204 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
