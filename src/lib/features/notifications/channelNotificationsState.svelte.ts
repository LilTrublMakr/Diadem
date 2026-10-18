import type {
	AnySubscriptionFilters,
	NotificationChannelSubscriptionDto,
	NotificationErrorResponse,
	NotificationType
} from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";

// Admin-configured channel subscriptions, parallel to notificationsState.svelte.ts's per-user
// subscription CRUD — scoped by guildId (set via selectGuild) instead of implicitly by the
// logged-in user, since a guild's subscriptions can in principle be managed by multiple admins.

export type DiscordGuildOption = { id: string; name: string };
export type DiscordChannelOption = { id: string; name: string; type: number };

export type ChannelNotificationsData = {
	guilds: DiscordGuildOption[];
	guildsLoading: boolean;
	guildsLoaded: boolean;
	missingScope: boolean;
	selectedGuildId: string | null;
	channels: DiscordChannelOption[];
	channelsLoading: boolean;
	botNotInGuild: boolean;
	subscriptions: NotificationChannelSubscriptionDto[];
	subscriptionsLoading: boolean;
	error: string | null;
};

export type ChannelApiError = { code: string; message: string };

const LAST_GUILD_STORAGE_KEY = "channelNotifications.lastGuildId";

function getStoredGuildId(): string | null {
	try {
		return localStorage.getItem(LAST_GUILD_STORAGE_KEY);
	} catch {
		return null;
	}
}

function storeGuildId(guildId: string | null) {
	try {
		if (guildId) localStorage.setItem(LAST_GUILD_STORAGE_KEY, guildId);
		else localStorage.removeItem(LAST_GUILD_STORAGE_KEY);
	} catch {
		// ignore - private browsing / blocked storage just means no remembered guild next visit
	}
}

let state = $state<ChannelNotificationsData>({
	guilds: [],
	guildsLoading: false,
	guildsLoaded: false,
	missingScope: false,
	selectedGuildId: null,
	channels: [],
	channelsLoading: false,
	botNotInGuild: false,
	subscriptions: [],
	subscriptionsLoading: false,
	error: null
});

export function getChannelNotificationsState(): ChannelNotificationsData {
	return state;
}

async function parseError(res: Response): Promise<ChannelApiError> {
	try {
		const body = (await res.json()) as NotificationErrorResponse;
		return { code: body.error ?? "unknown", message: body.message ?? "Something went wrong" };
	} catch {
		return { code: "unknown", message: `Request failed (${res.status})` };
	}
}

export function isChannelApiError(result: unknown): result is ChannelApiError {
	return typeof result === "object" && result !== null && "code" in result && "message" in result;
}

export async function loadManageableGuilds(): Promise<void> {
	state.guildsLoading = true;
	state.error = null;
	try {
		const res = await fetch("/api/custom/notifications/channel-guilds");
		if (res.status === 403) {
			const body = (await res.json().catch(() => null)) as { error?: string } | null;
			state.missingScope = body?.error === "missing_scope";
			state.guilds = [];
			return;
		}
		if (!res.ok) {
			state.error = "Failed to load your Discord servers";
			return;
		}
		state.missingScope = false;
		state.guilds = (await res.json()) as DiscordGuildOption[];

		// Re-select whatever guild was picked last time (page refresh otherwise lands back on
		// "Select a server…" with an empty subscriptions list even though the data is all still there).
		const remembered = getStoredGuildId();
		if (!state.selectedGuildId && remembered && state.guilds.some((g) => g.id === remembered)) {
			await selectGuild(remembered);
		}
	} catch {
		state.error = "Failed to load your Discord servers";
	} finally {
		state.guildsLoading = false;
		state.guildsLoaded = true;
	}
}

export async function selectGuild(guildId: string | null): Promise<void> {
	state.selectedGuildId = guildId;
	state.channels = [];
	state.botNotInGuild = false;
	state.subscriptions = [];
	storeGuildId(guildId);
	if (!guildId) return;

	state.channelsLoading = true;
	state.subscriptionsLoading = true;
	state.error = null;
	try {
		// Sequential, not Promise.all — each of these independently re-verifies live Discord admin
		// permission via a fresh /users/@me/guilds call. Firing them concurrently let two token
		// refreshes race (Discord rotates refresh tokens), occasionally making the loser's guild
		// check fail with a transient 403 even though the admin really does have access.
		const channelsRes = await fetch(`/api/custom/notifications/channels/${guildId}`);
		const subsRes = await fetch(
			`/api/custom/notifications/channel-subscriptions?guildId=${guildId}`
		);

		if (channelsRes.status === 403) {
			const body = (await channelsRes.json().catch(() => null)) as { error?: string } | null;
			state.botNotInGuild = body?.error === "bot_not_in_guild";
			if (!state.botNotInGuild) state.error = "Failed to load this server's channels";
		} else if (channelsRes.ok) {
			state.channels = (await channelsRes.json()) as DiscordChannelOption[];
		} else {
			state.error = "Failed to load this server's channels";
		}

		if (subsRes.ok) {
			state.subscriptions = (await subsRes.json()) as NotificationChannelSubscriptionDto[];
		} else {
			const body = (await subsRes.json().catch(() => null)) as { message?: string } | null;
			state.error =
				body?.message ?? `Failed to load this server's subscriptions (${subsRes.status})`;
		}
	} catch {
		state.error = "Failed to load this server's channels";
	} finally {
		state.channelsLoading = false;
		state.subscriptionsLoading = false;
	}
}

export async function createChannelSubscription(input: {
	guildId: string;
	channelId: string;
	name: string;
	type: NotificationType;
	templateId?: number | null;
	enabled?: boolean;
	filters: AnySubscriptionFilters;
	mode?: SubscriptionMode;
	schedule?: NotificationSchedule | null;
}): Promise<NotificationChannelSubscriptionDto | ChannelApiError> {
	const res = await fetch("/api/custom/notifications/channel-subscriptions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationChannelSubscriptionDto;
	state.subscriptions = [...state.subscriptions, dto];
	return dto;
}

export async function patchChannelSubscription(
	guildId: string,
	id: number,
	patch: {
		name?: string;
		channelId?: string;
		templateId?: number | null;
		enabled?: boolean;
		filters?: AnySubscriptionFilters;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationChannelSubscriptionDto | ChannelApiError> {
	const res = await fetch(
		`/api/custom/notifications/channel-subscriptions/${id}?guildId=${guildId}`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch)
		}
	);
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationChannelSubscriptionDto;
	state.subscriptions = state.subscriptions.map((s) => (s.id === id ? dto : s));
	return dto;
}

export async function removeChannelSubscription(
	guildId: string,
	id: number
): Promise<ChannelApiError | null> {
	const res = await fetch(
		`/api/custom/notifications/channel-subscriptions/${id}?guildId=${guildId}`,
		{
			method: "DELETE"
		}
	);
	if (!res.ok && res.status !== 404) return parseError(res);
	state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
	return null;
}
