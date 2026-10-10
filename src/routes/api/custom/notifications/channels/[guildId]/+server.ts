import { guardChannelRequest } from "@/lib/server/notifications/endpointUtils";
import { listGuildChannels } from "@/lib/server/notifications/bot";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async (event) => {
	const guildId = event.params.guildId;
	const guard = await guardChannelRequest(event, guildId);
	if (!guard.ok) return guard.response;

	const result = await listGuildChannels(guildId);
	if (!result.ok) {
		if (result.botNotInGuild) {
			return json({ error: "bot_not_in_guild" }, { status: 403 });
		}
		return json({ error: "discord_error" }, { status: 502 });
	}
	return json(result.channels);
};
