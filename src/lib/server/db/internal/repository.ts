import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import type { ScanArea } from "@/lib/server/db/internal/schema";
import { and, eq } from "drizzle-orm";
import type { Polygon } from "geojson";

export async function setUserSettings(userId: string, userSettings: string) {
	const u = await db.update(table.user).set({ userSettings }).where(eq(table.user.id, userId));
}

export async function getUserSettings(userId: string): Promise<undefined | string> {
	const [result] = await db
		.select({ user: { userSettings: table.user.userSettings } })
		.from(table.user)
		.where(eq(table.user.id, userId));

	return result?.user?.userSettings as string | undefined;
}

export async function getTracker(userId: string, pokemonId: number, form = 0) {
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
	return result ?? null;
}

export async function getAllTrackers(userId: string) {
	return db.select().from(table.pokemonTracker).where(eq(table.pokemonTracker.userId, userId));
}

export async function upsertTracker(
	userId: string,
	pokemonId: number,
	form: number,
	data: { shiny?: boolean; hundo?: boolean; nundo?: boolean; shundo?: boolean }
) {
	await db
		.insert(table.pokemonTracker)
		.values({
			userId,
			pokemonId,
			form,
			shiny: data.shiny ?? false,
			hundo: data.hundo ?? false,
			nundo: data.nundo ?? false,
			shundo: data.shundo ?? false
		})
		.onDuplicateKeyUpdate({ set: data });
	return getTracker(userId, pokemonId, form);
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
