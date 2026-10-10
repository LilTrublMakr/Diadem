import {
	deleteChannelSubscriptionRow,
	getChannelSubscription,
	getChannelSubscriptions,
	getNotificationTemplate,
	insertChannelSubscription,
	updateChannelSubscriptionRow
} from "@/lib/server/db/internal/repository";
import type { NotificationChannelSubscription } from "@/lib/server/db/internal/schema";
import { invalidateSubscriptionCache } from "@/lib/server/notifications/matchCache";
import { filtersSchemaForType } from "@/lib/server/notifications/validation";
import { NotificationError } from "@/lib/server/notifications/service";
import type { AnySubscriptionFilters, NotificationType } from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";

// Admin-configured channel subscriptions, parallel to service.ts's per-user subscription CRUD -
// scoped by guildId (the resource) instead of userId (the recipient), since many admins could in
// principle manage the same guild's channel subscriptions. Authorization (is the caller actually
// an admin of this guildId) is the API route's job, not this file's - same trust boundary as
// every other service in this app.

function parseFilters(type: NotificationType, filters: unknown): AnySubscriptionFilters {
	const result = filtersSchemaForType(type).safeParse(filters);
	if (!result.success) {
		throw new NotificationError(
			"invalid_filters",
			400,
			result.error.issues[0]?.message ?? "Invalid filters"
		);
	}
	return result.data as AnySubscriptionFilters;
}

function isDuplicateKeyError(error: unknown): boolean {
	const candidates = [error, (error as { cause?: unknown })?.cause];
	return candidates.some(
		(e) =>
			(e as { code?: string })?.code === "ER_DUP_ENTRY" || (e as { errno?: number })?.errno === 1062
	);
}

// Per-guild mutation lock, same shape as service.ts's per-user one.
const guildLocks = new Map<string, Promise<unknown>>();

async function withGuildLock<T>(guildId: string, fn: () => Promise<T>): Promise<T> {
	const previous = guildLocks.get(guildId) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(fn);
	guildLocks.set(guildId, next);
	try {
		return await next;
	} finally {
		if (guildLocks.get(guildId) === next) guildLocks.delete(guildId);
	}
}

async function requireTemplateOwnership(createdByUserId: string, templateId: number | null | undefined) {
	if (templateId == null) return;
	const template = await getNotificationTemplate(createdByUserId, templateId);
	if (!template) {
		throw new NotificationError("invalid_template", 400, "Template not found");
	}
}

export async function listChannelSubscriptions(
	guildId: string
): Promise<NotificationChannelSubscription[]> {
	return getChannelSubscriptions(guildId);
}

export async function createChannelSubscription(
	createdByUserId: string,
	guildId: string,
	input: {
		name: string;
		type: NotificationType;
		channelId: string;
		templateId?: number | null;
		enabled?: boolean;
		filters: unknown;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationChannelSubscription> {
	return withGuildLock(guildId, async () => {
		await requireTemplateOwnership(createdByUserId, input.templateId);
		const filters = parseFilters(input.type, input.filters);

		try {
			return await insertChannelSubscription({
				createdByUserId,
				guildId,
				channelId: input.channelId,
				type: input.type,
				templateId: input.templateId ?? null,
				name: input.name,
				enabled: input.enabled ?? true,
				filters,
				mode: input.mode ?? "manual",
				schedule: input.schedule ?? null
			});
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError(
					"name_taken",
					409,
					"This server already has a channel subscription with that name for this type"
				);
			}
			throw error;
		} finally {
			invalidateSubscriptionCache();
		}
	});
}

export async function updateChannelSubscription(
	createdByUserId: string,
	guildId: string,
	id: number,
	patch: {
		name?: string;
		channelId?: string;
		templateId?: number | null;
		enabled?: boolean;
		filters?: unknown;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationChannelSubscription> {
	return withGuildLock(guildId, async () => {
		const row = await getChannelSubscription(guildId, id);
		if (!row) throw new NotificationError("not_found", 404, "Channel subscription not found");

		await requireTemplateOwnership(createdByUserId, patch.templateId);
		const filters = patch.filters !== undefined ? parseFilters(row.type, patch.filters) : undefined;

		try {
			await updateChannelSubscriptionRow(guildId, id, { ...patch, filters });
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError(
					"name_taken",
					409,
					"This server already has a channel subscription with that name for this type"
				);
			}
			throw error;
		}
		invalidateSubscriptionCache();
		return (await getChannelSubscription(guildId, id))!;
	});
}

export async function deleteChannelSubscription(guildId: string, id: number): Promise<void> {
	await withGuildLock(guildId, async () => {
		const row = await getChannelSubscription(guildId, id);
		if (!row) throw new NotificationError("not_found", 404, "Channel subscription not found");
		await deleteChannelSubscriptionRow(guildId, id);
		invalidateSubscriptionCache();
	});
}
