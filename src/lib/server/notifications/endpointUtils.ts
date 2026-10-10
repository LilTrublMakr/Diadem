import type {
	NotificationArea,
	NotificationChannelSubscription,
	NotificationSubscription,
	NotificationTemplate
} from "@/lib/server/db/internal/schema";
import { hasNotificationAccess } from "@/lib/server/notifications/access";
import { NotificationError } from "@/lib/server/notifications/service";
import { getDiscordAccessToken } from "@/lib/server/auth/betterAuth";
import { isGuildManageableByUser } from "@/lib/server/notifications/channelAccess";
import type {
	NotificationAreaDto,
	NotificationChannelSubscriptionDto,
	NotificationSubscriptionDto,
	NotificationTemplateDto
} from "@/lib/features/notifications/types";
import { json } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

/**
 * Shared guard for notification endpoints. Returns the caller's user id,
 * or a ready-to-return error response when access is denied.
 */
export function guardNotificationRequest(
	locals: App.Locals
): { ok: true; userId: string } | { ok: false; response: Response } {
	if (!locals.user) {
		return { ok: false, response: json({ error: "unauthorized" }, { status: 401 }) };
	}
	if (!hasNotificationAccess(locals.perms, locals.user)) {
		return { ok: false, response: json({ error: "forbidden" }, { status: 403 }) };
	}
	return { ok: true, userId: locals.user.id };
}

/**
 * Guard for channel-notification endpoints - needs the full RequestEvent (not just locals)
 * to resolve the caller's Discord access token, then re-verifies live Manage Server/Administrator
 * permission on guildId. Never trust a client-supplied guildId without this re-check.
 */
export async function guardChannelRequest(
	event: RequestEvent,
	guildId: string
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
	const base = guardNotificationRequest(event.locals);
	if (!base.ok) return base;

	const accessToken = await getDiscordAccessToken(event);
	if (!accessToken) {
		return { ok: false, response: json({ error: "missing_discord_token" }, { status: 401 }) };
	}
	const manageable = await isGuildManageableByUser(accessToken, guildId);
	if (!manageable) {
		return { ok: false, response: json({ error: "forbidden" }, { status: 403 }) };
	}
	return { ok: true, userId: base.userId };
}

export function notificationErrorResponse(error: unknown): Response {
	if (error instanceof NotificationError) {
		return json({ error: error.code, message: error.message }, { status: error.status });
	}
	throw error;
}

function toIso(value: Date | string | null | undefined): string {
	if (!value) return new Date(0).toISOString();
	return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function toTemplateDto(row: NotificationTemplate): NotificationTemplateDto {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
		embed: row.embed,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt)
	};
}

export function toSubscriptionDto(row: NotificationSubscription): NotificationSubscriptionDto {
	return {
		id: row.id,
		type: row.type,
		templateId: row.templateId,
		name: row.name,
		enabled: row.enabled,
		filters: row.filters,
		mode: row.mode,
		schedule: row.schedule,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt)
	};
}

export function toChannelSubscriptionDto(
	row: NotificationChannelSubscription
): NotificationChannelSubscriptionDto {
	return {
		id: row.id,
		channelId: row.channelId,
		type: row.type,
		templateId: row.templateId,
		name: row.name,
		enabled: row.enabled,
		filters: row.filters,
		mode: row.mode,
		schedule: row.schedule,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt)
	};
}

export function toAreaDto(row: NotificationArea): NotificationAreaDto {
	return {
		id: row.id,
		name: row.name,
		geofence: row.geofence,
		areaSqM: row.areaSqM,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt)
	};
}

export function parseNotificationId(param: string | undefined): number | null {
	const id = Number(param);
	return Number.isInteger(id) && id > 0 ? id : null;
}
