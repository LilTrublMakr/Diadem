import {
	getUserGuildsWithPermissions,
	hasManageGuildPermission,
	type DiscordUserGuild
} from "@/lib/server/auth/discordDetails";

export type ManageableGuildsResult =
	| { ok: true; guilds: DiscordUserGuild[] }
	| { ok: false; missingScope: true }
	| { ok: false; missingScope: false; status: number };

/** The current user's Discord guilds, filtered to ones where their live permissions include
 * Administrator or Manage Server - the set they're allowed to configure channel notifications for. */
export async function getManageableGuilds(accessToken: string): Promise<ManageableGuildsResult> {
	const result = await getUserGuildsWithPermissions(accessToken);
	if (!result.ok) return result;
	return { ok: true, guilds: result.guilds.filter((g) => hasManageGuildPermission(g.permissions)) };
}

/** Re-checks that the caller is actually an admin of guildId - never trust a client-supplied
 * guild id without this, since the guild list itself is also client-influenced input. */
export async function isGuildManageableByUser(accessToken: string, guildId: string): Promise<boolean> {
	const result = await getManageableGuilds(accessToken);
	if (!result.ok) return false;
	return result.guilds.some((g) => g.id === guildId);
}
