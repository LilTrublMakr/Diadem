import { DAY_TOKENS } from "@/lib/features/scanAreas/scheduleTypes";
import { area as turfArea, kinks } from "@turf/turf";
import type { Polygon } from "geojson";
import { z } from "zod";

const positionSchema = z.tuple([
	z.number().min(-180).max(180), // lon
	z.number().min(-90).max(90) // lat
]);

export const polygonSchema = z
	.object({
		type: z.literal("Polygon"),
		// single outer ring, no holes
		coordinates: z.array(z.array(positionSchema).min(4)).length(1)
	})
	.refine(
		(polygon) => {
			const ring = polygon.coordinates[0];
			const first = ring[0];
			const last = ring[ring.length - 1];
			return first[0] === last[0] && first[1] === last[1];
		},
		{ message: "Polygon ring must be closed (first and last position identical)" }
	);

export const scanAreaNameSchema = z.string().trim().min(1).max(64);
export const workersSchema = z.number().int().min(1).max(100);

export const createScanAreaSchema = z.object({
	name: scanAreaNameSchema,
	geofence: polygonSchema,
	workers: workersSchema
});

export const patchScanAreaSchema = z
	.object({
		name: scanAreaNameSchema.optional(),
		geofence: polygonSchema.optional(),
		workers: workersSchema.optional()
	})
	.refine((patch) => Object.values(patch).some((v) => v !== undefined), {
		message: "At least one field must be provided"
	});

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const endTimeSchema = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/);
const dayTokenSchema = z.enum(DAY_TOKENS);

export const areaScheduleSchema = z.object({
	tz: z.string().min(1).max(64),
	weekly: z
		.array(
			z
				.object({
					days: z.array(dayTokenSchema).min(1).max(7),
					start: timeSchema,
					end: endTimeSchema
				})
				.refine((w) => w.start !== w.end, { message: "Start and end must differ" })
		)
		.max(20),
	dated: z
		.array(
			z
				.object({
					date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
					start: timeSchema,
					end: endTimeSchema
				})
				.refine((w) => w.start !== w.end, { message: "Start and end must differ" })
		)
		.max(50)
});

export const setModeSchema = z.object({ mode: z.enum(["manual", "scheduled"]) });

export function validatePolygonGeometry(
	polygon: Polygon,
	maxAreaSqM: number
):
	| { ok: true; areaSqM: number }
	| { ok: false; code: "too_large" | "invalid_polygon"; error: string } {
	if (kinks(polygon).features.length > 0) {
		return { ok: false, code: "invalid_polygon", error: "Polygon must not self-intersect" };
	}
	const areaSqM = Math.round(turfArea(polygon));
	if (areaSqM <= 0) {
		return { ok: false, code: "invalid_polygon", error: "Polygon has no area" };
	}
	if (areaSqM > maxAreaSqM) {
		return {
			ok: false,
			code: "too_large",
			error: `Area is ${(areaSqM / 1_000_000).toFixed(2)} km², the limit is ${(maxAreaSqM / 1_000_000).toFixed(2)} km²`
		};
	}
	return { ok: true, areaSqM };
}
