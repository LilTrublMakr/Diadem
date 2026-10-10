import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import type {
	NotificationArea,
	NotificationChannelSubscription,
	NotificationSubscription,
	NotificationTemplate,
	PokemonTracker,
	ScanArea,
	ShinyAccount,
	UserCollection
} from "@/lib/server/db/internal/schema";
import type { RawExportPokemon } from "@/lib/types/collectionExport";
import type { AnySubscriptionFilters, NotificationType } from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";
import { and, eq, sql } from "drizzle-orm";
import type { Polygon } from "geojson";
import type { UserSettings } from "$lib/services/userSettings.svelte";

export async function setUserSettings(userId: string, userSettings: unknown) {
	await db.update(table.user).set({ userSettings }).where(eq(table.user.id, userId));
}

export async function getUserDiscordId(userId: string): Promise<string | null> {
	const [result] = await db
		.select({ discordId: table.user.discordId })
		.from(table.user)
		.where(eq(table.user.id, userId));
	return result?.discordId ?? null;
}

export async function getUserSettings(userId: string): Promise<unknown> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return result?.user?.userSettings;
}

export async function setUserMapPosition(
	userId: string,
	mapPosition: UserSettings["mapPosition"]
): Promise<void> {
	await db
		.update(table.user)
		.set({
			userSettings: sql`JSON_MERGE_PATCH(
				CASE
					WHEN JSON_TYPE(${table.user.userSettings}) = 'STRING'
					THEN JSON_EXTRACT(JSON_UNQUOTE(${table.user.userSettings}), '$')
					ELSE COALESCE(${table.user.userSettings}, '{}')
				END,
				${JSON.stringify({ mapPosition })}
			)`
		})
		.where(eq(table.user.id, userId));
}

export type ParsedTracker = {
	pokemonId: number;
	form: number;
	shiny: boolean;
	hundo: boolean;
	nundo: boolean;
	shundo: boolean;
	legacyMoves: string[];
};

function parseTrackerRow(row: PokemonTracker): ParsedTracker {
	return {
		pokemonId: row.pokemonId,
		form: row.form,
		shiny: row.shiny,
		hundo: row.hundo,
		nundo: row.nundo,
		shundo: row.shundo,
		legacyMoves: typeof row.legacyMoves === "string" ? JSON.parse(row.legacyMoves || "[]") : []
	};
}

export async function getTracker(
	userId: string,
	pokemonId: number,
	form = 0
): Promise<ParsedTracker | null> {
	const [result] = await db
		.select()
		.from(table.pokemonTracker)
		.where(
			and(
				eq(table.pokemonTracker.userId, userId),
				eq(table.pokemonTracker.pokemonId, pokemonId),
				eq(table.pokemonTracker.form, form)
			)
		);
	return result ? parseTrackerRow(result) : null;
}

export async function getAllTrackers(userId: string): Promise<ParsedTracker[]> {
	const rows = await db
		.select()
		.from(table.pokemonTracker)
		.where(eq(table.pokemonTracker.userId, userId));
	return rows.map(parseTrackerRow);
}

export async function upsertTracker(
	userId: string,
	pokemonId: number,
	form: number,
	data: {
		shiny?: boolean;
		hundo?: boolean;
		nundo?: boolean;
		shundo?: boolean;
		legacyMoves?: string[];
	}
): Promise<ParsedTracker | null> {
	const updateSet: {
		shiny?: boolean;
		hundo?: boolean;
		nundo?: boolean;
		shundo?: boolean;
		legacyMoves?: string;
	} = {};
	if (data.shiny !== undefined) updateSet.shiny = data.shiny;
	if (data.hundo !== undefined) updateSet.hundo = data.hundo;
	if (data.nundo !== undefined) updateSet.nundo = data.nundo;
	if (data.shundo !== undefined) updateSet.shundo = data.shundo;
	if (data.legacyMoves !== undefined) updateSet.legacyMoves = JSON.stringify(data.legacyMoves);

	await db
		.insert(table.pokemonTracker)
		.values({
			userId,
			pokemonId,
			form,
			shiny: data.shiny ?? false,
			hundo: data.hundo ?? false,
			nundo: data.nundo ?? false,
			shundo: data.shundo ?? false,
			legacyMoves: JSON.stringify(data.legacyMoves ?? [])
		})
		.onDuplicateKeyUpdate({ set: updateSet });
	return getTracker(userId, pokemonId, form);
}

// Same mysql2-doesn't-auto-parse-JSON gotcha as parseJsonColumns below.
function parseUserCollectionRow(row: UserCollection): UserCollection {
	return {
		...row,
		pokemon: typeof row.pokemon === "string" ? JSON.parse(row.pokemon) : row.pokemon
	};
}

export async function getUserCollection(userId: string): Promise<UserCollection | null> {
	const [result] = await db
		.select()
		.from(table.userCollection)
		.where(eq(table.userCollection.userId, userId));
	return result ? parseUserCollectionRow(result) : null;
}

export async function saveUserCollection(
	userId: string,
	pokemon: RawExportPokemon[],
	format: string | null
): Promise<void> {
	await db
		.insert(table.userCollection)
		.values({ userId, pokemon, format })
		.onDuplicateKeyUpdate({ set: { pokemon, format } });
}

export async function deleteUserCollection(userId: string): Promise<void> {
	await db.delete(table.userCollection).where(eq(table.userCollection.userId, userId));
}

export async function getShinyAccounts(userId: string): Promise<ShinyAccount[]> {
	return db.select().from(table.shinyAccount).where(eq(table.shinyAccount.userId, userId));
}

export async function insertShinyAccount(
	userId: string,
	label: string,
	playerId: string
): Promise<void> {
	await db.insert(table.shinyAccount).values({ userId, label, playerId });
}

export async function deleteShinyAccountRow(userId: string, id: number): Promise<void> {
	await db
		.delete(table.shinyAccount)
		.where(and(eq(table.shinyAccount.userId, userId), eq(table.shinyAccount.id, id)));
}

// mysql2 doesn't auto-parse JSON columns, so drizzle returns them as raw strings
// despite the $type<>() casts — normalize on every read.
function parseJsonColumns(row: ScanArea): ScanArea {
	const parse = <T>(value: unknown): T =>
		typeof value === "string" ? JSON.parse(value) : (value as T);
	return {
		...row,
		geofence: parse(row.geofence),
		schedule: parse(row.schedule),
		dragoniteScheduleIds: parse(row.dragoniteScheduleIds)
	};
}

export async function getScanAreas(userId: string): Promise<ScanArea[]> {
	const rows = await db.select().from(table.scanArea).where(eq(table.scanArea.userId, userId));
	return rows.map(parseJsonColumns);
}

export async function getScanArea(userId: string, id: number): Promise<ScanArea | null> {
	const [result] = await db
		.select()
		.from(table.scanArea)
		.where(and(eq(table.scanArea.id, id), eq(table.scanArea.userId, userId)));
	return result ? parseJsonColumns(result) : null;
}

export async function insertScanArea(row: {
	userId: string;
	name: string;
	geofence: Polygon;
	areaSqM: number;
	workers: number;
}): Promise<ScanArea> {
	const [result] = await db.insert(table.scanArea).values(row).$returningId();
	return (await getScanArea(row.userId, result.id))!;
}

export async function updateScanAreaRow(
	userId: string,
	id: number,
	patch: Partial<
		Pick<
			ScanArea,
			| "name"
			| "geofence"
			| "areaSqM"
			| "workers"
			| "active"
			| "dragoniteAreaId"
			| "mode"
			| "schedule"
			| "dragoniteScheduleIds"
			| "overrideActive"
		>
	>
): Promise<void> {
	await db
		.update(table.scanArea)
		.set(patch)
		.where(and(eq(table.scanArea.id, id), eq(table.scanArea.userId, userId)));
}

export async function deleteScanAreaRow(userId: string, id: number): Promise<void> {
	await db
		.delete(table.scanArea)
		.where(and(eq(table.scanArea.id, id), eq(table.scanArea.userId, userId)));
}

export async function getAllScanAreas(): Promise<ScanArea[]> {
	const rows = await db.select().from(table.scanArea);
	return rows.map(parseJsonColumns);
}

// mysql2 doesn't auto-parse JSON columns, so drizzle returns them as raw strings
// despite the $type<>() casts — normalize on every read.
function parseTemplateJson(row: NotificationTemplate): NotificationTemplate {
	return {
		...row,
		embed: typeof row.embed === "string" ? JSON.parse(row.embed) : row.embed
	};
}

function parseSubscriptionJson(row: NotificationSubscription): NotificationSubscription {
	return {
		...row,
		filters: typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters,
		schedule: typeof row.schedule === "string" ? JSON.parse(row.schedule) : (row.schedule ?? null)
	};
}

export async function getNotificationTemplates(userId: string): Promise<NotificationTemplate[]> {
	const rows = await db
		.select()
		.from(table.notificationTemplate)
		.where(eq(table.notificationTemplate.userId, userId));
	return rows.map(parseTemplateJson);
}

export async function getNotificationTemplate(
	userId: string,
	id: number
): Promise<NotificationTemplate | null> {
	const [result] = await db
		.select()
		.from(table.notificationTemplate)
		.where(
			and(eq(table.notificationTemplate.id, id), eq(table.notificationTemplate.userId, userId))
		);
	return result ? parseTemplateJson(result) : null;
}

export async function insertNotificationTemplate(row: {
	userId: string;
	name: string;
	type: NotificationType;
	embed: NotificationTemplate["embed"];
}): Promise<NotificationTemplate> {
	const [result] = await db.insert(table.notificationTemplate).values(row).$returningId();
	return (await getNotificationTemplate(row.userId, result.id))!;
}

export async function updateNotificationTemplateRow(
	userId: string,
	id: number,
	patch: Partial<Pick<NotificationTemplate, "name" | "embed">>
): Promise<void> {
	await db
		.update(table.notificationTemplate)
		.set(patch)
		.where(
			and(eq(table.notificationTemplate.id, id), eq(table.notificationTemplate.userId, userId))
		);
}

export async function deleteNotificationTemplateRow(userId: string, id: number): Promise<void> {
	await db
		.delete(table.notificationTemplate)
		.where(
			and(eq(table.notificationTemplate.id, id), eq(table.notificationTemplate.userId, userId))
		);
}

export async function getNotificationSubscriptions(
	userId: string
): Promise<NotificationSubscription[]> {
	const rows = await db
		.select()
		.from(table.notificationSubscription)
		.where(eq(table.notificationSubscription.userId, userId));
	return rows.map(parseSubscriptionJson);
}

export async function getNotificationSubscription(
	userId: string,
	id: number
): Promise<NotificationSubscription | null> {
	const [result] = await db
		.select()
		.from(table.notificationSubscription)
		.where(
			and(
				eq(table.notificationSubscription.id, id),
				eq(table.notificationSubscription.userId, userId)
			)
		);
	return result ? parseSubscriptionJson(result) : null;
}

export async function insertNotificationSubscription(row: {
	userId: string;
	type: NotificationType;
	templateId: number | null;
	name: string;
	enabled: boolean;
	filters: AnySubscriptionFilters;
	mode: SubscriptionMode;
	schedule: NotificationSchedule | null;
}): Promise<NotificationSubscription> {
	const [result] = await db.insert(table.notificationSubscription).values(row).$returningId();
	return (await getNotificationSubscription(row.userId, result.id))!;
}

export async function updateNotificationSubscriptionRow(
	userId: string,
	id: number,
	patch: Partial<
		Pick<
			NotificationSubscription,
			"name" | "enabled" | "templateId" | "filters" | "mode" | "schedule"
		>
	>
): Promise<void> {
	await db
		.update(table.notificationSubscription)
		.set(patch)
		.where(
			and(
				eq(table.notificationSubscription.id, id),
				eq(table.notificationSubscription.userId, userId)
			)
		);
}

export async function deleteNotificationSubscriptionRow(userId: string, id: number): Promise<void> {
	await db
		.delete(table.notificationSubscription)
		.where(
			and(
				eq(table.notificationSubscription.id, id),
				eq(table.notificationSubscription.userId, userId)
			)
		);
}

// Loads every enabled subscription across all users — used by the webhook matching engine
// to build/refresh its in-memory index (type -> pokemonId -> subscriptions).
export async function getAllEnabledNotificationSubscriptions(): Promise<
	NotificationSubscription[]
> {
	const rows = await db
		.select()
		.from(table.notificationSubscription)
		.where(eq(table.notificationSubscription.enabled, true));
	return rows.map(parseSubscriptionJson);
}

// --- Notification channel subscriptions (admin-configured, post to a Discord channel) ---
// Scoped by guildId, not userId - a channel subscription's "owner" for authorization purposes is
// whichever admin of that guild is editing it, not a single fixed user (createdByUserId is audit
// only - see schema.ts's comment on the table).

function parseChannelSubscriptionJson(
	row: NotificationChannelSubscription
): NotificationChannelSubscription {
	return {
		...row,
		filters: typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters,
		schedule: typeof row.schedule === "string" ? JSON.parse(row.schedule) : (row.schedule ?? null)
	};
}

export async function getChannelSubscriptions(
	guildId: string
): Promise<NotificationChannelSubscription[]> {
	const rows = await db
		.select()
		.from(table.notificationChannelSubscription)
		.where(eq(table.notificationChannelSubscription.guildId, guildId));
	return rows.map(parseChannelSubscriptionJson);
}

export async function getChannelSubscription(
	guildId: string,
	id: number
): Promise<NotificationChannelSubscription | null> {
	const [result] = await db
		.select()
		.from(table.notificationChannelSubscription)
		.where(
			and(
				eq(table.notificationChannelSubscription.id, id),
				eq(table.notificationChannelSubscription.guildId, guildId)
			)
		);
	return result ? parseChannelSubscriptionJson(result) : null;
}

export async function insertChannelSubscription(row: {
	createdByUserId: string;
	guildId: string;
	channelId: string;
	type: NotificationType;
	templateId: number | null;
	name: string;
	enabled: boolean;
	filters: AnySubscriptionFilters;
	mode: SubscriptionMode;
	schedule: NotificationSchedule | null;
}): Promise<NotificationChannelSubscription> {
	const [result] = await db.insert(table.notificationChannelSubscription).values(row).$returningId();
	return (await getChannelSubscription(row.guildId, result.id))!;
}

export async function updateChannelSubscriptionRow(
	guildId: string,
	id: number,
	patch: Partial<
		Pick<
			NotificationChannelSubscription,
			"name" | "enabled" | "channelId" | "templateId" | "filters" | "mode" | "schedule"
		>
	>
): Promise<void> {
	await db
		.update(table.notificationChannelSubscription)
		.set(patch)
		.where(
			and(
				eq(table.notificationChannelSubscription.id, id),
				eq(table.notificationChannelSubscription.guildId, guildId)
			)
		);
}

export async function deleteChannelSubscriptionRow(guildId: string, id: number): Promise<void> {
	await db
		.delete(table.notificationChannelSubscription)
		.where(
			and(
				eq(table.notificationChannelSubscription.id, id),
				eq(table.notificationChannelSubscription.guildId, guildId)
			)
		);
}

// Loads every enabled channel subscription across all guilds — used by the webhook matching
// engine's channel-subscription index, same role as getAllEnabledNotificationSubscriptions.
export async function getAllEnabledChannelSubscriptions(): Promise<
	NotificationChannelSubscription[]
> {
	const rows = await db
		.select()
		.from(table.notificationChannelSubscription)
		.where(eq(table.notificationChannelSubscription.enabled, true));
	return rows.map(parseChannelSubscriptionJson);
}

// mysql2 doesn't auto-parse JSON columns, so drizzle returns them as raw strings
// despite the $type<>() casts — normalize on every read.
function parseNotificationAreaJson(row: NotificationArea): NotificationArea {
	return {
		...row,
		geofence: typeof row.geofence === "string" ? JSON.parse(row.geofence) : row.geofence
	};
}

export async function getNotificationAreas(userId: string): Promise<NotificationArea[]> {
	const rows = await db
		.select()
		.from(table.notificationArea)
		.where(eq(table.notificationArea.userId, userId));
	return rows.map(parseNotificationAreaJson);
}

export async function getNotificationArea(
	userId: string,
	id: number
): Promise<NotificationArea | null> {
	const [result] = await db
		.select()
		.from(table.notificationArea)
		.where(and(eq(table.notificationArea.id, id), eq(table.notificationArea.userId, userId)));
	return result ? parseNotificationAreaJson(result) : null;
}

export async function insertNotificationArea(row: {
	userId: string;
	name: string;
	geofence: Polygon;
	areaSqM: number;
}): Promise<NotificationArea> {
	const [result] = await db.insert(table.notificationArea).values(row).$returningId();
	return (await getNotificationArea(row.userId, result.id))!;
}

export async function updateNotificationAreaRow(
	userId: string,
	id: number,
	patch: Partial<Pick<NotificationArea, "name" | "geofence" | "areaSqM">>
): Promise<void> {
	await db
		.update(table.notificationArea)
		.set(patch)
		.where(and(eq(table.notificationArea.id, id), eq(table.notificationArea.userId, userId)));
}

export async function deleteNotificationAreaRow(userId: string, id: number): Promise<void> {
	await db
		.delete(table.notificationArea)
		.where(and(eq(table.notificationArea.id, id), eq(table.notificationArea.userId, userId)));
}
