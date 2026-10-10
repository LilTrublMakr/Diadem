import {
	deleteShinyAccountRow,
	getShinyAccounts,
	insertShinyAccount
} from "@/lib/server/db/internal/repository";
import type { ShinyAccount } from "@/lib/server/db/internal/schema";
import { getClientConfig } from "@/lib/services/config/config.server";
import {
	getShinyOdds,
	lookupShinyOdds,
	shinyOddsProvider
} from "@/lib/server/provider/shinyOddsProvider";
import { rollShinyDie } from "@/lib/server/shinyPrediction/shinyRoll";
import {
	MAX_SHINY_ACCOUNTS,
	PLAYER_ID_PATTERN,
	type ShinyAccountDto,
	type ShinyPredictionResult
} from "@/lib/features/shinyPrediction";

const ENCOUNTER_ID_PATTERN = /^\d{1,20}$/;

// Every webhook delivery checks this, so keep each user's rows in memory; any write drops them.
const accountCache = new Map<string, ShinyAccount[]>();

export function isShinyPredictionEnabled(): boolean {
	return !!getClientConfig().general.shinyPrediction;
}

async function getCachedAccounts(userId: string): Promise<ShinyAccount[]> {
	let accounts = accountCache.get(userId);
	if (!accounts) {
		accounts = await getShinyAccounts(userId);
		accountCache.set(userId, accounts);
	}
	return accounts;
}

export async function listShinyAccounts(userId: string): Promise<ShinyAccountDto[]> {
	return (await getCachedAccounts(userId)).map((a) => ({
		id: a.id,
		label: a.label,
		playerIdHint: `…${a.playerId.slice(-4)}`
	}));
}

/** Returns an error message, or null on success. */
export async function addShinyAccount(
	userId: string,
	rawLabel: unknown,
	rawPlayerId: unknown
): Promise<string | null> {
	const label = typeof rawLabel === "string" ? rawLabel.trim().slice(0, 64) : "";
	// Hex ids are lowercase in the game's data; normalizing guards against a pasted uppercase copy
	const playerId = typeof rawPlayerId === "string" ? rawPlayerId.trim().toLowerCase() : "";
	if (!label) return "Give the account a name";
	if (!PLAYER_ID_PATTERN.test(playerId))
		return "Player id must be 16 hex characters, or 21 digits for Google accounts";

	const existing = await getCachedAccounts(userId);
	if (existing.length >= MAX_SHINY_ACCOUNTS) return `At most ${MAX_SHINY_ACCOUNTS} accounts`;
	if (existing.some((a) => a.playerId === playerId)) return "That player id is already linked";

	await insertShinyAccount(userId, label, playerId);
	accountCache.delete(userId);
	return null;
}

export async function removeShinyAccount(userId: string, id: number): Promise<void> {
	await deleteShinyAccountRow(userId, id);
	accountCache.delete(userId);
}

/**
 * Bulk variant for map queries: resolves the user's accounts and the odds table once, then
 * returns a sync checker for each spawn. null = nothing to predict (feature off / no accounts).
 */
export async function getShinyPredictor(
	userId: string | undefined
): Promise<((encounterId: string, pokemonId: number, form: number) => boolean) | null> {
	if (!userId || !isShinyPredictionEnabled()) return null;
	const accounts = await getCachedAccounts(userId);
	if (accounts.length === 0) return null;
	const odds = await shinyOddsProvider.get();

	return (encounterId, pokemonId, form) => {
		if (!ENCOUNTER_ID_PATTERN.test(encounterId)) return false;
		const n = lookupShinyOdds(odds, pokemonId, form);
		if (n === null) return false; // shiny-locked
		return accounts.some((a) => rollShinyDie(encounterId, a.playerId, n) === 0);
	};
}

/** Which of this user's linked accounts would see this wild spawn as shiny. */
export async function predictShiny(
	userId: string,
	encounterId: string,
	pokemonId: number,
	form: number
): Promise<ShinyPredictionResult> {
	if (!isShinyPredictionEnabled() || !ENCOUNTER_ID_PATTERN.test(encounterId))
		return { odds: null, accounts: [] };

	const accounts = await getCachedAccounts(userId);
	if (accounts.length === 0) return { odds: null, accounts: [] };

	const odds = await getShinyOdds(pokemonId, form);
	if (odds === null) return { odds: null, accounts: [] };

	return {
		odds,
		accounts: accounts
			.filter((a) => rollShinyDie(encounterId, a.playerId, odds) === 0)
			.map((a) => a.label)
	};
}
