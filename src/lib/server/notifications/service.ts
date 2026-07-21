import {
	deleteNotificationAreaRow,
	deleteNotificationSubscriptionRow,
	deleteNotificationTemplateRow,
	getNotificationArea,
	getNotificationAreas,
	getNotificationSubscription,
	getNotificationSubscriptions,
	getNotificationTemplate,
	getNotificationTemplates,
	insertNotificationArea,
	insertNotificationSubscription,
	insertNotificationTemplate,
	updateNotificationAreaRow,
	updateNotificationSubscriptionRow,
	updateNotificationTemplateRow
} from "@/lib/server/db/internal/repository";
import type {
	NotificationArea,
	NotificationSubscription,
	NotificationTemplate
} from "@/lib/server/db/internal/schema";
import { invalidateSubscriptionCache } from "@/lib/server/notifications/matchCache";
import { validatePolygonGeometry } from "@/lib/server/scanAreas/validation";
import type { EmbedTemplate, PokemonSubscriptionFilters } from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";
import type { Polygon } from "geojson";

export type NotificationErrorCode =
	| "not_found"
	| "name_taken"
	| "invalid_template"
	| "too_large"
	| "invalid_polygon";

// Generous — notification areas carry no scanning cost, so there's no worker-allotment reason
// to cap them as tightly as scan_area's 5km² default. Still bounded so a mis-drawn polygon
// (e.g. accidentally tracing a whole state) doesn't silently become a permanent everywhere-match.
const NOTIFICATION_AREA_MAX_SQM = 500_000_000; // 500 km²

export class NotificationError extends Error {
	constructor(
		public code: NotificationErrorCode,
		public status: number,
		message: string
	) {
		super(message);
		this.name = "NotificationError";
	}
}

function isDuplicateKeyError(error: unknown): boolean {
	const candidates = [error, (error as { cause?: unknown })?.cause];
	return candidates.some(
		(e) =>
			(e as { code?: string })?.code === "ER_DUP_ENTRY" || (e as { errno?: number })?.errno === 1062
	);
}

// Per-user mutation lock: chains mutations per userId so concurrent requests
// from the same user serialize (same pattern as scanAreas' service)
const userLocks = new Map<string, Promise<unknown>>();

async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
	const previous = userLocks.get(userId) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(fn);
	userLocks.set(userId, next);
	try {
		return await next;
	} finally {
		if (userLocks.get(userId) === next) userLocks.delete(userId);
	}
}

// --- Templates ---

export async function listTemplates(userId: string): Promise<NotificationTemplate[]> {
	return getNotificationTemplates(userId);
}

export async function createTemplate(
	userId: string,
	input: { name: string; embed: EmbedTemplate }
): Promise<NotificationTemplate> {
	try {
		return await insertNotificationTemplate({
			userId,
			name: input.name,
			type: "pokemon",
			embed: input.embed
		});
	} catch (error) {
		if (isDuplicateKeyError(error)) {
			throw new NotificationError("name_taken", 409, "You already have a template with that name");
		}
		throw error;
	}
}

export async function updateTemplate(
	userId: string,
	id: number,
	patch: { name?: string; embed?: EmbedTemplate }
): Promise<NotificationTemplate> {
	const row = await getNotificationTemplate(userId, id);
	if (!row) throw new NotificationError("not_found", 404, "Template not found");

	try {
		await updateNotificationTemplateRow(userId, id, patch);
	} catch (error) {
		if (isDuplicateKeyError(error)) {
			throw new NotificationError("name_taken", 409, "You already have a template with that name");
		}
		throw error;
	}
	invalidateSubscriptionCache();
	return (await getNotificationTemplate(userId, id))!;
}

export async function deleteTemplate(userId: string, id: number): Promise<void> {
	const row = await getNotificationTemplate(userId, id);
	if (!row) throw new NotificationError("not_found", 404, "Template not found");
	await deleteNotificationTemplateRow(userId, id);
	invalidateSubscriptionCache();
}

// --- Subscriptions ---

export async function listSubscriptions(userId: string): Promise<NotificationSubscription[]> {
	return getNotificationSubscriptions(userId);
}

async function requireTemplateOwnership(userId: string, templateId: number | null | undefined) {
	if (templateId == null) return;
	const template = await getNotificationTemplate(userId, templateId);
	if (!template) {
		throw new NotificationError("invalid_template", 400, "Template not found");
	}
}

export async function createSubscription(
	userId: string,
	input: {
		name: string;
		templateId?: number | null;
		enabled?: boolean;
		filters: PokemonSubscriptionFilters;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationSubscription> {
	return withUserLock(userId, async () => {
		await requireTemplateOwnership(userId, input.templateId);

		try {
			return await insertNotificationSubscription({
				userId,
				type: "pokemon",
				templateId: input.templateId ?? null,
				name: input.name,
				enabled: input.enabled ?? true,
				filters: input.filters,
				mode: input.mode ?? "manual",
				schedule: input.schedule ?? null
			});
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError(
					"name_taken",
					409,
					"You already have a subscription with that name"
				);
			}
			throw error;
		} finally {
			invalidateSubscriptionCache();
		}
	});
}

export async function updateSubscription(
	userId: string,
	id: number,
	patch: {
		name?: string;
		templateId?: number | null;
		enabled?: boolean;
		filters?: PokemonSubscriptionFilters;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationSubscription> {
	return withUserLock(userId, async () => {
		const row = await getNotificationSubscription(userId, id);
		if (!row) throw new NotificationError("not_found", 404, "Subscription not found");

		await requireTemplateOwnership(userId, patch.templateId);

		try {
			await updateNotificationSubscriptionRow(userId, id, patch);
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError(
					"name_taken",
					409,
					"You already have a subscription with that name"
				);
			}
			throw error;
		}
		invalidateSubscriptionCache();
		return (await getNotificationSubscription(userId, id))!;
	});
}

export async function deleteSubscription(userId: string, id: number): Promise<void> {
	await withUserLock(userId, async () => {
		const row = await getNotificationSubscription(userId, id);
		if (!row) throw new NotificationError("not_found", 404, "Subscription not found");
		await deleteNotificationSubscriptionRow(userId, id);
		invalidateSubscriptionCache();
	});
}

// --- Areas ---
// Separate from scan_area: these are notification-only geofences with no worker/mode/schedule/
// Dragonite mirroring — just a named polygon a subscription's areaId can point at.

export async function listNotificationAreas(userId: string): Promise<NotificationArea[]> {
	return getNotificationAreas(userId);
}

export async function createNotificationArea(
	userId: string,
	input: { name: string; geofence: Polygon }
): Promise<NotificationArea> {
	return withUserLock(userId, async () => {
		const geometry = validatePolygonGeometry(input.geofence, NOTIFICATION_AREA_MAX_SQM);
		if (!geometry.ok) throw new NotificationError(geometry.code, 400, geometry.error);

		try {
			return await insertNotificationArea({
				userId,
				name: input.name,
				geofence: input.geofence,
				areaSqM: geometry.areaSqM
			});
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError("name_taken", 409, "You already have an area with that name");
			}
			throw error;
		}
	});
}

export async function updateNotificationArea(
	userId: string,
	id: number,
	patch: { name?: string; geofence?: Polygon }
): Promise<NotificationArea> {
	return withUserLock(userId, async () => {
		const row = await getNotificationArea(userId, id);
		if (!row) throw new NotificationError("not_found", 404, "Area not found");

		const dbPatch: Partial<Pick<NotificationArea, "name" | "geofence" | "areaSqM">> = {};
		if (patch.name !== undefined) dbPatch.name = patch.name;
		if (patch.geofence) {
			const geometry = validatePolygonGeometry(patch.geofence, NOTIFICATION_AREA_MAX_SQM);
			if (!geometry.ok) throw new NotificationError(geometry.code, 400, geometry.error);
			dbPatch.geofence = patch.geofence;
			dbPatch.areaSqM = geometry.areaSqM;
		}

		try {
			await updateNotificationAreaRow(userId, id, dbPatch);
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new NotificationError("name_taken", 409, "You already have an area with that name");
			}
			throw error;
		}
		return (await getNotificationArea(userId, id))!;
	});
}

export async function deleteNotificationArea(userId: string, id: number): Promise<void> {
	await withUserLock(userId, async () => {
		const row = await getNotificationArea(userId, id);
		if (!row) throw new NotificationError("not_found", 404, "Area not found");
		await deleteNotificationAreaRow(userId, id);
	});
}
