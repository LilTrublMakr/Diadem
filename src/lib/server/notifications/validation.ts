import { DAY_TOKENS } from "@/lib/features/notifications/scheduleTypes";
import type { NotificationType } from "@/lib/features/notifications/types";
import { z } from "zod";

export const notificationNameSchema = z.string().trim().min(1).max(64);

// Shared by every place a subscription/template's category needs validating (createTemplateSchema,
// createSubscriptionSchema, backupValidation.ts) — one list to keep in sync as categories are added.
export const notificationTypeSchema = z.enum([
	"pokemon",
	"raid",
	"maxbattle",
	"quest",
	"invasion",
	"lure",
	"gym"
]);

const timeSchema = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Expected HH:MM (24h)");

export const weeklyWindowSchema = z.object({
	days: z.array(z.enum(DAY_TOKENS)).min(1),
	start: timeSchema,
	end: timeSchema
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const datedWindowSchema = z
	.object({
		date: dateSchema,
		endDate: dateSchema.optional(),
		start: timeSchema,
		end: timeSchema
	})
	.refine((w) => !w.endDate || w.endDate >= w.date, {
		message: "End date must be on or after the start date",
		path: ["endDate"]
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
	content: z.string().max(2000),
	title: z.string().max(256),
	description: z.string().max(4096),
	color: z.string().max(16),
	thumbnailUrl: z.string().max(512),
	imageUrl: z.string().max(512),
	// Not validated against a fixed list — the set of installed Rampardos styles is dynamic (see
	// rampardosStylesProvider.ts) and operator-specific. A bogus value just fails gracefully at
	// render time (generateMapStylePreview/generatePokemonMapImage return null, never throw).
	mapStyle: z.string().min(1).max(64).optional(),
	footerText: z.string().max(2048),
	url: z.string().max(512),
	fields: z.array(embedFieldTemplateSchema).max(25)
});

export const createTemplateSchema = z.object({
	name: notificationNameSchema,
	type: notificationTypeSchema,
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

// Shared by every type's filters schema — see BaseSubscriptionFilters in types.ts.
const baseFiltersShape = {
	areaSource: z.enum(["own", "koji", "notificationArea"]).optional(),
	areaId: z.number().int().positive().optional()
};

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
	pvpLeagues: z
		.array(z.enum(["little", "great", "ultra"]))
		.max(3)
		.optional(),
	pvpMaxRank: z.number().int().min(1).max(4096).optional(),
	// true = only notify when this exact species+form currently grants a Featured Attack move on
	// evolution/catch (see featuredAttackProvider) — absent/false = no filtering on this.
	featuredAttackOnly: z.boolean().optional(),
	...baseFiltersShape
});

export const raidFiltersSchema = z.object({
	bossPokemonIds: z.array(z.number().int().positive()).max(50).optional(),
	form: z.number().int().min(0).optional(),
	minLevel: z.number().int().min(1).max(6).optional(),
	maxLevel: z.number().int().min(1).max(6).optional(),
	teams: z
		.array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
		.max(4)
		.optional(),
	exRaidOnly: z.boolean().optional(),
	notifyOnEgg: z.boolean().optional(),
	notifyOnBoss: z.boolean().optional(),
	...baseFiltersShape
});

export const maxBattleFiltersSchema = z.object({
	bossPokemonIds: z.array(z.number().int().positive()).max(50).optional(),
	form: z.number().int().min(0).optional(),
	minLevel: z.number().int().min(1).max(8).optional(),
	maxLevel: z.number().int().min(1).max(8).optional(),
	gmaxOnly: z.boolean().optional(),
	...baseFiltersShape
});

export const questFiltersSchema = z.object({
	rewardType: z.enum(["pokemon", "item", "stardust", "candy", "megaEnergy"]).optional(),
	rewardPokemonIds: z.array(z.number().int().positive()).max(50).optional(),
	rewardItemIds: z.array(z.number().int().positive()).max(50).optional(),
	minAmount: z.number().int().positive().optional(),
	shinyOnly: z.boolean().optional(),
	withAr: z.boolean().optional(),
	...baseFiltersShape
});

export const invasionFiltersSchema = z.object({
	kinds: z
		.array(z.enum(["grunt", "kecleon", "showcase", "goldStop"]))
		.max(4)
		.optional(),
	characters: z.array(z.number().int().positive()).max(50).optional(),
	confirmedOnly: z.boolean().optional(),
	...baseFiltersShape
});

export const lureFiltersSchema = z.object({
	lureIds: z.array(z.number().int().positive()).max(10).optional(),
	...baseFiltersShape
});

export const gymFiltersSchema = z.object({
	teams: z
		.array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]))
		.max(4)
		.optional(),
	slotChanges: z.boolean().optional(),
	battleChanges: z.boolean().optional(),
	...baseFiltersShape
});

/** Picks the right filters schema for a subscription's type — used for both create and patch. */
export function filtersSchemaForType(type: NotificationType) {
	if (type === "raid") return raidFiltersSchema;
	if (type === "maxbattle") return maxBattleFiltersSchema;
	if (type === "quest") return questFiltersSchema;
	if (type === "invasion") return invasionFiltersSchema;
	if (type === "lure") return lureFiltersSchema;
	if (type === "gym") return gymFiltersSchema;
	return pokemonFiltersSchema;
}

// `filters` is intentionally loose here (validated for real against the type-specific schema —
// see filtersSchemaForType — inside service.ts, once the subscription's `type` is known) so this
// one schema works for every notification type without a discriminated union at the API boundary.
export const createSubscriptionSchema = z.object({
	name: notificationNameSchema,
	type: notificationTypeSchema,
	templateId: z.number().int().positive().nullable().optional(),
	enabled: z.boolean().optional(),
	filters: z.record(z.string(), z.unknown()),
	mode: z.enum(["manual", "scheduled"]).optional(),
	schedule: notificationScheduleSchema.nullable().optional()
});

// No `type` — a subscription's type is immutable after creation (each type has different
// filters/context, so "changing type" isn't a meaningful patch operation).
export const patchSubscriptionSchema = z
	.object({
		name: notificationNameSchema.optional(),
		templateId: z.number().int().positive().nullable().optional(),
		enabled: z.boolean().optional(),
		filters: z.record(z.string(), z.unknown()).optional(),
		mode: z.enum(["manual", "scheduled"]).optional(),
		schedule: notificationScheduleSchema.nullable().optional()
	})
	.refine((patch) => Object.values(patch).some((v) => v !== undefined), {
		message: "At least one field must be provided"
	});
