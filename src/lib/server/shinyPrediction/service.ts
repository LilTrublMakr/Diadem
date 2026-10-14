import {
	deleteShinyAccountRow,
	getShinyAccounts,
	insertShinyAccount,
	updateShinyAccountRow
} from "@/lib/server/db/internal/repository";
import {
	createPlayerIdTicket,
	getPlayerIdTicket,
	isPlayerIdEnabled,
	isTicketPending
} from "@/lib/server/shinyPrediction/playerIdApi";
import type { ShinyAccount } from "@/lib/server/db/internal/schema";
import { getClientConfig } from "@/lib/services/config/config.server";
import {
	getShinyOdds,
	lookupShinyOdds,
	shinyOddsProvider
} from "@/lib/server/provider/shinyOddsProvider";
import { rollShinyDie } from "@/lib/server/shinyPrediction/shinyRoll";
import {
	FRIEND_CODE_PATTERN,
	MAX_SHINY_ACCOUNTS,
	PLAYER_ID_PATTERN,
	type ShinyAccountDto,
	type ShinyPredictionResult
} from "@/lib/features/shinyPrediction";

const ENCOUNTER_ID_PATTERN = /^\d{1,20}$/;

// Only accounts with a resolved player id take part in predictions (friend-code links are
// pending until PlayerID answers)
type LinkedAccount = ShinyAccount & { playerId: string };

// Every webhook delivery checks this, so keep each user's rows in memory; any write drops them.
const accountCache = new Map<string, LinkedAccount[]>();

export function isShinyPredictionEnabled(): boolean {
	return !!getClientConfig().general.shinyPrediction;
}

async function getCachedAccounts(userId: string): Promise<LinkedAccount[]> {
	let accounts = accountCache.get(userId);
	if (!accounts) {
		accounts = (await getShinyAccounts(userId)).filter(
			(a): a is LinkedAccount => a.status === "complete" && !!a.playerId
		);
		accountCache.set(userId, accounts);
	}
	return accounts;
}

const LOOKUP_DETAIL: Record<string, string> = {
	queued: "Looking up friend code…",
	pending: "Looking up friend code…",
	delayed:
		"PlayerID couldn't invite this trainer yet (usually their remote raid limit) — it retries in about 12 hours",
	invalid_code: "PlayerID says that friend code is invalid",
	failed: "PlayerID couldn't find this trainer",
	expired: "The lookup expired — remove it and try again"
};

/**
 * Lists the user's accounts, first advancing any friend-code lookups still in progress (ticket
 * reads are cached in playerIdApi, so clients polling this doesn't hammer PlayerID).
 */
export async function listShinyAccounts(userId: string): Promise<ShinyAccountDto[]> {
	const rows = await getShinyAccounts(userId);
	const linkedPlayers = new Set(rows.flatMap((r) => (r.playerId ? [r.playerId] : [])));
	let changed = false;

	const current = await Promise.all(
		rows.map(async (row) => {
			if (!row.ticketId || !isTicketPending(row.status)) return row;
			const result = await getPlayerIdTicket(row.ticketId);
			if (!result.ok) {
				if (result.error !== "not_found") return row;
				changed = true;
				await updateShinyAccountRow(userId, row.id, { status: "expired", ticketId: null });
				return { ...row, status: "expired", ticketId: null };
			}

			const { ticket } = result;
			if (ticket.status === "complete" && ticket.playerId) {
				changed = true;
				if (linkedPlayers.has(ticket.playerId)) {
					await deleteShinyAccountRow(userId, row.id); // same trainer already linked
					return null;
				}
				linkedPlayers.add(ticket.playerId);
				const values = {
					status: "complete",
					ticketId: null,
					playerId: ticket.playerId,
					label: row.label || ticket.trainerName?.slice(0, 64) || `Trainer ${row.friendCode}`
				};
				await updateShinyAccountRow(userId, row.id, values);
				return { ...row, ...values };
			}
			if (ticket.status !== row.status) {
				changed = true;
				const values = isTicketPending(ticket.status)
					? { status: ticket.status }
					: { status: ticket.status, ticketId: null };
				await updateShinyAccountRow(userId, row.id, values);
				return { ...row, ...values };
			}
			return row;
		})
	);
	if (changed) accountCache.delete(userId);

	return current.flatMap((a) => {
		if (!a) return [];
		const linked = a.status === "complete" && !!a.playerId;
		return [
			{
				id: a.id,
				label: a.label || (a.friendCode ? `Friend code ${a.friendCode}` : "Account"),
				playerIdHint: a.playerId ? `…${a.playerId.slice(-4)}` : "",
				status: linked ? "linked" : isTicketPending(a.status) ? "pending" : "failed",
				detail: linked ? undefined : (LOOKUP_DETAIL[a.status] ?? `Lookup ${a.status}`)
			}
		];
	});
}

/**
 * Links an account from either a raw player id (16 hex / 21 digits) or a 12-digit friend code,
 * which is resolved to a player id through PlayerID. Returns an error message, or null.
 */
export async function addShinyAccount(
	userId: string,
	rawLabel: unknown,
	rawIdOrCode: unknown
): Promise<string | null> {
	const label = typeof rawLabel === "string" ? rawLabel.trim().slice(0, 64) : "";
	// Hex ids are lowercase in the game's data; friend codes are often copied with spaces/dashes
	const input = typeof rawIdOrCode === "string" ? rawIdOrCode.trim().toLowerCase() : "";
	const friendCode = input.replace(/[\s-]/g, "");

	const existing = await getShinyAccounts(userId);
	if (existing.length >= MAX_SHINY_ACCOUNTS) return `At most ${MAX_SHINY_ACCOUNTS} accounts`;

	if (FRIEND_CODE_PATTERN.test(friendCode)) {
		if (!isPlayerIdEnabled())
			return "Friend code lookup isn't set up on this map — enter the player id instead";
		if (existing.some((a) => a.friendCode === friendCode))
			return "That friend code is already linked";

		const result = await createPlayerIdTicket(friendCode);
		if (!result.ok) {
			return result.error === "rate_limited"
				? "The friend code lookup service is busy — try again in a minute"
				: "The friend code lookup service is unavailable right now";
		}
		const { ticket } = result;
		// A code looked up before (by anyone on this map) can come back already resolved
		if (ticket.status === "complete" && ticket.playerId) {
			if (existing.some((a) => a.playerId === ticket.playerId))
				return "That trainer is already linked";
			await insertShinyAccount(userId, {
				label: label || ticket.trainerName?.slice(0, 64) || `Trainer ${friendCode}`,
				playerId: ticket.playerId,
				friendCode
			});
		} else {
			await insertShinyAccount(userId, {
				label,
				friendCode,
				status: isTicketPending(ticket.status) ? ticket.status : "queued",
				ticketId: ticket.id
			});
		}
		accountCache.delete(userId);
		return null;
	}

	if (!PLAYER_ID_PATTERN.test(input))
		return "Enter a 12-digit friend code, or a player id (16 hex characters, or 21 digits for Google accounts)";
	if (!label) return "Give the account a name";
	if (existing.some((a) => a.playerId === input)) return "That player id is already linked";

	await insertShinyAccount(userId, { label, playerId: input });
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

/**
 * Checks a single specific one of ownerId's own linked accounts — used by channel subscriptions,
 * which (unlike a DM subscription) have no implicit single recipient and must name an account
 * explicitly. Ownership-checked: only searches ownerId's own cached accounts, so an accountId
 * belonging to someone else's linked account always resolves to false.
 */
export async function predictShinyForAccountId(
	ownerId: string,
	accountId: number,
	encounterId: string,
	pokemonId: number,
	form: number
): Promise<boolean> {
	if (!isShinyPredictionEnabled() || !ENCOUNTER_ID_PATTERN.test(encounterId)) return false;
	const account = (await getCachedAccounts(ownerId)).find((a) => a.id === accountId);
	if (!account) return false;
	const odds = await getShinyOdds(pokemonId, form);
	if (odds === null) return false;
	return rollShinyDie(encounterId, account.playerId, odds) === 0;
}

/** Manual-override variant of the above — checks a raw player id typed directly into a channel
 * subscription's filters, rather than one of the admin's own saved shinyAccount rows. */
export async function predictShinyForPlayerId(
	playerId: string,
	encounterId: string,
	pokemonId: number,
	form: number
): Promise<boolean> {
	if (!isShinyPredictionEnabled() || !ENCOUNTER_ID_PATTERN.test(encounterId)) return false;
	const odds = await getShinyOdds(pokemonId, form);
	if (odds === null) return false;
	return rollShinyDie(encounterId, playerId, odds) === 0;
}
