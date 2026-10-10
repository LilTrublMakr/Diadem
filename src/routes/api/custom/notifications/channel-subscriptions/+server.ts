import {
	listChannelSubscriptions,
	createChannelSubscription
} from "@/lib/server/notifications/channelService";
import {
	guardChannelRequest,
	notificationErrorResponse,
	toChannelSubscriptionDto
} from "@/lib/server/notifications/endpointUtils";
import { createChannelSubscriptionSchema } from "@/lib/server/notifications/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	const guildId = event.url.searchParams.get("guildId");
	if (!guildId)
		return json({ error: "invalid_request", message: "guildId is required" }, { status: 400 });

	const guard = await guardChannelRequest(event, guildId);
	if (!guard.ok) return guard.response;

	const subscriptions = await listChannelSubscriptions(guildId);
	return json(subscriptions.map(toChannelSubscriptionDto));
};

export const POST: RequestHandler = async (event) => {
	const parsed = createChannelSubscriptionSchema.safeParse(
		await event.request.json().catch(() => null)
	);
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	const guard = await guardChannelRequest(event, parsed.data.guildId);
	if (!guard.ok) return guard.response;

	try {
		const row = await createChannelSubscription(guard.userId, parsed.data.guildId, parsed.data);
		return json(toChannelSubscriptionDto(row), { status: 201 });
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
