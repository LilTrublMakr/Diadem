import { db } from "@/lib/server/db/internal/index";
import * as table from "@/lib/server/db/internal/schema";
import { and, eq } from "drizzle-orm";

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

export async function getTracker(userId: string, pokemonId: number) {
	const [result] = await db
		.select()
		.from(table.pokemonTracker)
		.where(
			and(eq(table.pokemonTracker.userId, userId), eq(table.pokemonTracker.pokemonId, pokemonId))
		);
	return result ?? null;
}

export async function getAllTrackers(userId: string) {
	return db
		.select()
		.from(table.pokemonTracker)
		.where(eq(table.pokemonTracker.userId, userId));
}

export async function upsertTracker(
	userId: string,
	pokemonId: number,
	data: { shiny?: boolean; hundo?: boolean }
) {
	await db
		.insert(table.pokemonTracker)
		.values({ userId, pokemonId, shiny: data.shiny ?? false, hundo: data.hundo ?? false })
		.onDuplicateKeyUpdate({ set: data });
	return getTracker(userId, pokemonId);
}
