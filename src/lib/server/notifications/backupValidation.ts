import { polygonSchema } from "@/lib/server/scanAreas/validation";
import {
	embedTemplateSchema,
	notificationNameSchema,
	notificationScheduleSchema,
	notificationTypeSchema
} from "@/lib/server/notifications/validation";
import { z } from "zod";

export const backupAreaSchema = z.object({
	name: notificationNameSchema,
	geofence: polygonSchema
});

export const backupTemplateSchema = z.object({
	name: notificationNameSchema,
	type: notificationTypeSchema,
	embed: embedTemplateSchema
});

const backupAreaRefSchema = z.union([
	z.object({ source: z.enum(["own", "notificationArea"]), name: notificationNameSchema }),
	z.object({ source: z.literal("koji"), id: z.number().int().positive() })
]);

// Intentionally loose here (validated for real against the type-specific schema — see
// filtersSchemaForType — inside service.ts, once the subscription's `type` is known), same
// reasoning as createSubscriptionSchema's own `filters` field. `areaRef` replaces the raw
// areaId/areaSource (see backupTypes.ts) — IDs don't survive an export/import round-trip.
const backupFiltersSchema = z.object({ areaRef: backupAreaRefSchema.optional() }).passthrough();

export const backupSubscriptionSchema = z.object({
	name: notificationNameSchema,
	type: notificationTypeSchema,
	enabled: z.boolean(),
	mode: z.enum(["manual", "scheduled"]),
	schedule: notificationScheduleSchema.nullable(),
	templateRef: notificationNameSchema.nullable(),
	filters: backupFiltersSchema
});

export const notificationsBackupSchema = z.object({
	kind: z.literal("diadem-notifications-backup"),
	version: z.literal(1),
	exportedAt: z.string(),
	areas: z.array(backupAreaSchema).max(200).optional(),
	templates: z.array(backupTemplateSchema).max(200).optional(),
	subscriptions: z.array(backupSubscriptionSchema).max(500).optional()
});
