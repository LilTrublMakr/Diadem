import { polygonSchema } from "@/lib/server/scanAreas/validation";
import { z } from "zod";

// Reuses scan-areas' generic polygon geometry validation (ring closed, ≥4 points, no holes) —
// that's pure geometry, not scan-area business logic, so sharing it is safe.
export { polygonSchema };

export const notificationAreaNameSchema = z.string().trim().min(1).max(64);

export const createNotificationAreaSchema = z.object({
	name: notificationAreaNameSchema,
	geofence: polygonSchema
});

export const patchNotificationAreaSchema = z
	.object({
		name: notificationAreaNameSchema.optional(),
		geofence: polygonSchema.optional()
	})
	.refine((patch) => Object.values(patch).some((v) => v !== undefined), {
		message: "At least one field must be provided"
	});
