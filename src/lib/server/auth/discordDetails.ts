type DiscordUserData = {
	id: string;
	username: string;
	global_name: string;
	avatar: string;
};

export type DiscordGuildData = {
	roles?: string[];
	user?: { id: string };
};

export type DiscordUser = {
	id: string;
	username: string;
	displayName: string;
	avatarUrl: string;
};

export type DiscordUserInfoResult = {
	status: number;
	data?: DiscordUser;
};

const endpoint = "https://discord.com/api/users/@me";

function getFetchOptions(accessToken: string): RequestInit {
	return {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	};
}

export async function getUserInfoResult(accessToken: string): Promise<DiscordUserInfoResult> {
	const response = await fetch(endpoint, getFetchOptions(accessToken));

	if (!response.ok) {
		return { status: response.status };
	}

	const user: DiscordUserData = await response.json();
	return {
		status: response.status,
		data: {
			id: user.id,
			username: "@" + user.username,
			displayName: user.global_name || user.username || "",
			avatarUrl: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
		}
	};
}

export type GuildMemberLookup =
	| { found: true; data: DiscordGuildData }
	| { found: false; status: number };

export async function getGuildMemberInfo(
	guildId: string,
	accessToken: string
): Promise<GuildMemberLookup> {
	const response = await fetch(
		`${endpoint}/guilds/${guildId}/member`,
		getFetchOptions(accessToken)
	);
	if (response.status === 404) {
		return { found: true, data: { roles: [] } };
	}
	if (!response.ok) {
		return { found: false, status: response.status };
	}
	const guildMember: DiscordGuildData = await response.json();
	return { found: true, data: guildMember };
}

export async function isGuildMember(guildId: string, accessToken: string) {
	const lookup = await getGuildMemberInfo(guildId, accessToken);
	if (!lookup.found) return;
	return !!lookup.data.user;
}

// Discord permission bit flags relevant to "is this user an admin of this guild" -
// https://discord.com/developers/docs/topics/permissions
export const DISCORD_PERMISSION_ADMINISTRATOR = 0x8;
export const DISCORD_PERMISSION_MANAGE_GUILD = 0x20;

export type DiscordUserGuild = { id: string; name: string; permissions: string };

export type UserGuildsResult =
	| { ok: true; guilds: DiscordUserGuild[] }
	// Discord returns 401/403 here if the session's OAuth token predates the "guilds" scope -
	// distinct from a generic failure so callers can tell the user to re-log-in.
	| { ok: false; missingScope: true }
	| { ok: false; missingScope: false; status: number };

/** GET /users/@me/guilds - requires the "guilds" OAuth scope (not "guilds.members.read"). */
export async function getUserGuildsWithPermissions(accessToken: string): Promise<UserGuildsResult> {
	const response = await fetch(`${endpoint}/guilds`, getFetchOptions(accessToken));
	if (response.status === 401 || response.status === 403) {
		return { ok: false, missingScope: true };
	}
	if (!response.ok) {
		return { ok: false, missingScope: false, status: response.status };
	}
	const guilds: DiscordUserGuild[] = await response.json();
	return { ok: true, guilds };
}

export function hasManageGuildPermission(permissions: string): boolean {
	const bits = BigInt(permissions);
	return (
		(bits & BigInt(DISCORD_PERMISSION_ADMINISTRATOR)) !== 0n ||
		(bits & BigInt(DISCORD_PERMISSION_MANAGE_GUILD)) !== 0n
	);
}
