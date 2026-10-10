import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import type { EmbedTemplate } from "@/lib/features/notifications/types";

const log = getLogger("discordNotifications");

const DISCORD_API = "https://discord.com/api/v10";

const dmChannelCache = new Map<string, string>();

function botToken(): string | null {
	return getServerConfig().auth.discord?.botToken ?? null;
}

function parseColor(color: string): number | undefined {
	const trimmed = color.trim();
	if (!trimmed) return undefined;
	const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
	const value = Number.parseInt(hex, 16);
	return Number.isFinite(value) ? value : undefined;
}

function buildDiscordEmbed(embed: EmbedTemplate): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	if (embed.title) result.title = embed.title;
	if (embed.description) result.description = embed.description;
	const color = parseColor(embed.color);
	if (color !== undefined) result.color = color;
	if (embed.url) result.url = embed.url;
	if (embed.thumbnailUrl) result.thumbnail = { url: embed.thumbnailUrl };
	if (embed.imageUrl) result.image = { url: embed.imageUrl };
	if (embed.footerText) result.footer = { text: embed.footerText };
	const fields = (embed.fields ?? []).filter((f) => f.name && f.value);
	if (fields.length > 0) {
		result.fields = fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline }));
	}
	return result;
}

// Sequential queue: Discord's global bot rate limit is easily exceeded by bursty
// sends; a simple chain respecting Retry-After keeps us well under it without
// needing a full rate-limit-bucket implementation for this volume.
let sendQueue: Promise<void> = Promise.resolve();

async function discordFetch(path: string, init: RequestInit): Promise<Response> {
	const token = botToken();
	if (!token) throw new Error("server.auth.discord.botToken is not configured");

	// FormData bodies (multipart file uploads) must set their own boundary
	// Content-Type — forcing application/json here would break the upload.
	const isFormData = init.body instanceof FormData;
	const response = await fetch(`${DISCORD_API}${path}`, {
		...init,
		headers: {
			...init.headers,
			Authorization: `Bot ${token}`,
			...(isFormData ? {} : { "Content-Type": "application/json" })
		}
	});

	if (response.status === 429) {
		const body = await response.json().catch(() => ({}) as { retry_after?: number });
		const retryAfterMs = Math.ceil((body.retry_after ?? 1) * 1000);
		await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
		return discordFetch(path, init);
	}

	return response;
}

let applicationEmojiIds: Set<string> | null = null;

/**
 * Fetches the emoji ids owned by the Discord Application behind our bot token. Referenced
 * emoji ids that aren't in this set will render as raw fallback text in Discord, not an icon —
 * usually because they were uploaded to a different Application than this bot token belongs to.
 */
export async function getApplicationEmojiIds(): Promise<Set<string> | null> {
	if (applicationEmojiIds) return applicationEmojiIds;
	try {
		const appResponse = await discordFetch("/oauth2/applications/@me", { method: "GET" });
		if (!appResponse.ok) return null;
		const app = (await appResponse.json()) as { id: string };

		const emojiResponse = await discordFetch(`/applications/${app.id}/emojis`, { method: "GET" });
		if (!emojiResponse.ok) return null;
		const data = (await emojiResponse.json()) as { items: { id: string }[] };

		applicationEmojiIds = new Set(data.items.map((e) => e.id));
		return applicationEmojiIds;
	} catch (error) {
		log.warning(`Could not fetch application emoji list: ${error}`);
		return null;
	}
}

async function getDmChannelId(discordId: string): Promise<string | null> {
	const cached = dmChannelCache.get(discordId);
	if (cached) return cached;

	const response = await discordFetch("/users/@me/channels", {
		method: "POST",
		body: JSON.stringify({ recipient_id: discordId })
	});
	if (!response.ok) {
		log.warning(`Could not open DM channel for Discord user ${discordId}: ${response.status}`);
		return null;
	}
	const data = (await response.json()) as { id: string };
	dmChannelCache.set(discordId, data.id);
	return data.id;
}

export type DiscordAttachment = { filename: string; data: Buffer };
export type DiscordMessagePayload = {
	content?: string;
	embed?: EmbedTemplate;
	attachments?: (DiscordAttachment | null)[];
};

function buildMessageRequestInit(payload: DiscordMessagePayload): RequestInit {
	const body: Record<string, unknown> = {};
	if (payload.content) body.content = payload.content;
	if (payload.embed) body.embeds = [buildDiscordEmbed(payload.embed)];

	const attachments = (payload.attachments ?? []).filter((a): a is DiscordAttachment => !!a);
	if (attachments.length > 0) {
		const form = new FormData();
		form.append("payload_json", JSON.stringify(body));
		attachments.forEach((attachment, i) => {
			form.append(
				`files[${i}]`,
				new Blob([attachment.data], { type: "image/png" }),
				attachment.filename
			);
		});
		return { method: "POST", body: form };
	}
	return { method: "POST", body: JSON.stringify(body) };
}

/** Low-level: post a message to any channel id the bot can see (DM or guild channel alike -
 * Discord's message-send endpoint doesn't distinguish). Never throws, logs and swallows. */
async function postToChannel(channelId: string, payload: DiscordMessagePayload): Promise<boolean> {
	const response = await discordFetch(
		`/channels/${channelId}/messages`,
		buildMessageRequestInit(payload)
	);
	if (!response.ok) {
		log.warning(`Failed to post Discord message to channel ${channelId}: ${response.status}`);
	}
	return response.ok;
}

/**
 * Send a Discord DM to a user. Never throws — delivery failures (DMs closed,
 * bot not sharing a guild, unknown user) are logged and swallowed.
 */
export async function sendDirectMessage(
	discordId: string,
	payload: DiscordMessagePayload
): Promise<void> {
	const task = sendQueue.then(async () => {
		try {
			const channelId = await getDmChannelId(discordId);
			if (!channelId) return;

			const ok = await postToChannel(channelId, payload);
			// channel may have gone stale (e.g. user blocked the bot) — drop the cache entry so the
			// next send re-opens a fresh DM channel instead of repeatedly hitting a dead one.
			if (!ok) dmChannelCache.delete(discordId);
		} catch (error) {
			log.warning(`Error sending Discord DM to ${discordId}: ${error}`);
		}
	});
	sendQueue = task;
	return task;
}

/**
 * Post a message directly to a guild channel (admin-configured channel notifications). Same
 * rate-limit queue and body-building as sendDirectMessage, just no DM-channel-id lookup since
 * the destination channel id is already known. Never throws.
 */
export async function sendChannelMessage(
	channelId: string,
	payload: DiscordMessagePayload
): Promise<void> {
	const task = sendQueue.then(async () => {
		try {
			await postToChannel(channelId, payload);
		} catch (error) {
			log.warning(`Error posting Discord message to channel ${channelId}: ${error}`);
		}
	});
	sendQueue = task;
	return task;
}

export type DiscordGuildChannel = { id: string; name: string; type: number };

// Channel types the bot can actually post embeds to - 0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT.
const POSTABLE_CHANNEL_TYPES = new Set([0, 5]);

export type ListGuildChannelsResult =
	| { ok: true; channels: DiscordGuildChannel[] }
	// Distinct from a generic failure so the UI can render an "invite the bot" prompt.
	| { ok: false; botNotInGuild: true }
	| { ok: false; botNotInGuild: false; status: number };

/** GET /guilds/{guild.id}/channels via the bot token - the bot must already be a member of the
 * guild (403 means it isn't). */
export async function listGuildChannels(guildId: string): Promise<ListGuildChannelsResult> {
	try {
		const response = await discordFetch(`/guilds/${guildId}/channels`, { method: "GET" });
		if (response.status === 403) return { ok: false, botNotInGuild: true };
		if (!response.ok) return { ok: false, botNotInGuild: false, status: response.status };

		const raw: DiscordGuildChannel[] = await response.json();
		return { ok: true, channels: raw.filter((c) => POSTABLE_CHANNEL_TYPES.has(c.type)) };
	} catch (error) {
		log.warning(`Error listing channels for guild ${guildId}: ${error}`);
		return { ok: false, botNotInGuild: false, status: 0 };
	}
}
