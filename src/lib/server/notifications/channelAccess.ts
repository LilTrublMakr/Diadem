import {
	getUserGuildsWithPermissions,
	hasManageGuildPermission,
	type DiscordUserGuild
} from "@/lib/server/auth/discordDetails";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("channelNotifications");

export type ManageableGuildsResult =
	| { ok: true; guilds: DiscordUserGuild[] }
	| { ok: false; missingScope: true }
	| { ok: false; missingScope: false; status: number };

/** The current user's Discord guilds, filtered to ones where their live permissions include
 * Administrator or Manage Server - the set they're allowed to configure channel notifications for. */
export async function getManageableGuilds(accessToken: string): Promise<ManageableGuildsResult> {
	const result = await getUserGuildsWithPermissions(accessToken);
	if (!result.ok) {
		// missingScope:true can also mean Discord rejected the token for a reason OTHER than a
		// stale OAuth scope (e.g. a transient 401 from a just-rotated/expired token) - and a non-401/
		// 403 status here (429 rate limit, 5xx) gets treated the same as "not an admin" by every
		// caller. Logging the real status is the only way to tell those apart from the server log.
		if (result.missingScope) {
			log.warning(
				"Discord rejected /users/@me/guilds with 401/403 - stale OAuth scope, or token issue"
			);
		} else {
			log.warning(`Discord /users/@me/guilds returned ${result.status}`);
		}
		return result;
	}
	return { ok: true, guilds: result.guilds.filter((g) => hasManageGuildPermission(g.permissions)) };
}

/** Re-checks that the caller is actually an admin of guildId - never trust a client-supplied
 * guild id without this, since the guild list itself is also client-influenced input. */
export async function isGuildManageableByUser(
	accessToken: string,
	guildId: string
): Promise<boolean> {
	const result = await getManageableGuilds(accessToken);
	if (!result.ok) return false;
	const manageable = result.guilds.some((g) => g.id === guildId);
	if (!manageable) {
		log.warning(
			`guildId ${guildId} not in caller's manageable guilds (has: ${result.guilds.map((g) => g.id).join(", ") || "none"})`
		);
	}
	return manageable;
}
