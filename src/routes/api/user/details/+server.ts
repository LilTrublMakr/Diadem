import { getUserInfoResult, isGuildMember } from "@/lib/server/auth/discordDetails";
import { getDiscordAccessToken } from "@/lib/server/auth/betterAuth";
import { getEveryonePerms } from "@/lib/server/auth/permissions";
import { getClientConfig } from "@/lib/services/config/config.server";
import type { UserData } from "@/lib/services/user/userDetails.svelte";
import { json } from "@sveltejs/kit";

export async function GET(event) {
	const user = event.locals.user;

	if (!user)
		return json({
			permissions: await getEveryonePerms(event.fetch)
		} as UserData);

	const accessToken = await getDiscordAccessToken(event);
	const result = accessToken ? await getUserInfoResult(accessToken) : undefined;

	if (!result?.data) {
		return json({
			permissions: await getEveryonePerms(event.fetch)
		} as UserData);
	}

	let isMember = false;
	if (accessToken) {
		try {
			isMember = !!(await isGuildMember(getClientConfig().discord.serverId, accessToken));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "";
			if (!msg.startsWith("RATE_LIMITED:")) {
				console.error("[user/details] guild member check failed:", e);
			}
		}
	}

	return json({
		details: result.data,
		permissions: event.locals.perms,
		isGuildMember: isMember
	} as UserData);
}
