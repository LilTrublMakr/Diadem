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
