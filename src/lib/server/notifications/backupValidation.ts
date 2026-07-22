import { polygonSchema } from "@/lib/server/scanAreas/validation";
import {
	embedTemplateSchema,
	notificationNameSchema,
	notificationScheduleSchema,
	pokemonFiltersSchema
} from "@/lib/server/notifications/validation";
import { z } from "zod";

export const backupAreaSchema = z.object({
	name: notificationNameSchema,
	geofence: polygonSchema
});

export const backupTemplateSchema = z.object({
	name: notificationNameSchema,
	embed: embedTemplateSchema
});

const backupAreaRefSchema = z.union([
	z.object({ source: z.enum(["own", "notificationArea"]), name: notificationNameSchema }),
	z.object({ source: z.literal("koji"), id: z.number().int().positive() })
]);

// Same as pokemonFiltersSchema but with the raw areaId/areaSource replaced by a name-based
// reference (see backupTypes.ts) — IDs don't survive an export/import round-trip.
const backupFiltersSchema = pokemonFiltersSchema.omit({ areaSource: true, areaId: true }).extend({
	areaRef: backupAreaRefSchema.optional()
});

export const backupSubscriptionSchema = z.object({
	name: notificationNameSchema,
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
