import { DAY_TOKENS } from "@/lib/features/notifications/scheduleTypes";
import { z } from "zod";

export const notificationNameSchema = z.string().trim().min(1).max(64);

const timeSchema = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Expected HH:MM (24h)");

export const weeklyWindowSchema = z.object({
	days: z.array(z.enum(DAY_TOKENS)).min(1),
	start: timeSchema,
	end: timeSchema
});

export const datedWindowSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
	start: timeSchema,
	end: timeSchema
});

// No overlap validation here — unlike scan-area schedules, notification schedules aren't
// protecting a shared worker allotment, so overlapping windows are fine.
export const notificationScheduleSchema = z.object({
	tz: z.string().min(1).max(64),
	weekly: z.array(weeklyWindowSchema).max(20),
	dated: z.array(datedWindowSchema).max(50),
	invert: z.boolean().optional()
});

export const embedFieldTemplateSchema = z.object({
	name: z.string().max(256),
	value: z.string().max(1024),
	inline: z.boolean()
});

export const embedTemplateSchema = z.object({
	title: z.string().max(256),
	description: z.string().max(4096),
	color: z.string().max(16),
	thumbnailUrl: z.string().max(512),
	imageUrl: z.string().max(512),
	footerText: z.string().max(2048),
	url: z.string().max(512),
	fields: z.array(embedFieldTemplateSchema).max(25)
});

export const createTemplateSchema = z.object({
	name: notificationNameSchema,
	embed: embedTemplateSchema
});

export const patchTemplateSchema = z
	.object({
		name: notificationNameSchema.optional(),
		embed: embedTemplateSchema.optional()
	})
	.refine((patch) => Object.values(patch).some((v) => v !== undefined), {
		message: "At least one field must be provided"
	});

export const pokemonFiltersSchema = z.object({
	pokemonIds: z.array(z.number().int().positive()).max(50).optional(),
	form: z.number().int().min(0).optional(),
	minIv: z.number().min(0).max(100).optional(),
	maxIv: z.number().min(0).max(100).optional(),
	minCp: z.number().int().min(0).optional(),
	maxCp: z.number().int().min(0).optional(),
	minLevel: z.number().int().min(1).max(40).optional(),
	maxLevel: z.number().int().min(1).max(40).optional(),
	minAtk: z.number().int().min(0).max(15).optional(),
	maxAtk: z.number().int().min(0).max(15).optional(),
	minDef: z.number().int().min(0).max(15).optional(),
	maxDef: z.number().int().min(0).max(15).optional(),
	minSta: z.number().int().min(0).max(15).optional(),
	maxSta: z.number().int().min(0).max(15).optional(),
	minSize: z.number().int().min(1).max(5).optional(),
	maxSize: z.number().int().min(1).max(5).optional(),
	gender: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
	pvpLeague: z.enum(["little", "great", "ultra"]).optional(),
	pvpMaxRank: z.number().int().min(1).max(4096).optional(),
	areaSource: z.enum(["own", "koji"]).optional(),
	areaId: z.number().int().positive().optional()
});

export const createSubscriptionSchema = z.object({
	name: notificationNameSchema,
	templateId: z.number().int().positive().nullable().optional(),
	enabled: z.boolean().optional(),
	filters: pokemonFiltersSchema,
	mode: z.enum(["manual", "scheduled"]).optional(),
	schedule: notificationScheduleSchema.nullable().optional()
});

export const patchSubscriptionSchema = z
	.object({
		name: notificationNameSchema.optional(),
		templateId: z.number().int().positive().nullable().optional(),
		enabled: z.boolean().optional(),
		filters: pokemonFiltersSchema.optional(),
		mode: z.enum(["manual", "scheduled"]).optional(),
		schedule: notificationScheduleSchema.nullable().optional()
	})
	.refine((patch) => Object.values(patch).some((v) => v !== undefined), {
		message: "At least one field must be provided"
	});
