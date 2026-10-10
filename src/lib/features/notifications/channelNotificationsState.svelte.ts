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
	if (!guildId) return;

	state.channelsLoading = true;
	state.subscriptionsLoading = true;
	state.error = null;
	try {
		const [channelsRes, subsRes] = await Promise.all([
			fetch(`/api/custom/notifications/channels/${guildId}`),
			fetch(`/api/custom/notifications/channel-subscriptions?guildId=${guildId}`)
		]);

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
