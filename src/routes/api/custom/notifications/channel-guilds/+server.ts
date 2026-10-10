import { guardNotificationRequest } from "@/lib/server/notifications/endpointUtils";
import { getManageableGuilds } from "@/lib/server/notifications/channelAccess";
import { getDiscordAccessToken } from "@/lib/server/auth/betterAuth";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	const guard = guardNotificationRequest(event.locals);
	if (!guard.ok) return guard.response;

	const accessToken = await getDiscordAccessToken(event);
	if (!accessToken) {
		return json({ error: "missing_discord_token" }, { status: 401 });
	}

	const result = await getManageableGuilds(accessToken);
	if (!result.ok) {
		if (result.missingScope) {
			return json({ error: "missing_scope" }, { status: 403 });
		}
		return json({ error: "discord_error" }, { status: 502 });
	}
	return json(result.guilds.map((g) => ({ id: g.id, name: g.name })));
};
