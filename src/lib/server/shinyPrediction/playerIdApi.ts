import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

// Client for the PlayerID service (https://playerid.mew.is), which resolves a friend code to the
// player id the shiny roll needs — so users don't have to dig it out with a modified client.
// Adapted from ccev/diadem#200. Its limits (10 requests/min, 100 tickets/day) are per API key,
// i.e. shared by the whole map, hence the caching and global backoff below.

const log = getLogger("playerid");

// A ticket is read from the service at most this often, however often clients poll. Known
// trainers resolve within seconds, so new tickets are re-read faster for their first minute.
const FAST_RECHECK_MS = 5_000;
const FAST_RECHECK_FOR_MS = 60_000;
const RECHECK_MS = 60_000;
const DEFAULT_BACKOFF_MS = 60_000; // after a 429 without Retry-After

export type PlayerIdTicket = {
	id: string;
	// queued / pending / delayed while running; complete (PlayerID's "done"); invalid_code /
	// failed / expired when it ended without a player id
	status: string;
	playerId?: string;
	trainerName?: string;
};

export type PlayerIdResult =
	| { ok: true; ticket: PlayerIdTicket }
	| { ok: false; error: "rate_limited" | "not_found" | "unavailable" };

const PENDING_STATUSES = new Set(["queued", "pending", "delayed"]);
export const isTicketPending = (status: string) => PENDING_STATUSES.has(status);

const ticketCache = new Map<string, { at: number; firstSeen: number; ticket: PlayerIdTicket }>();
let backoffUntil = 0;

export function isPlayerIdEnabled() {
	const playerId = getServerConfig().playerId;
	return Boolean(playerId?.url && playerId?.apiKey);
}

async function callPlayerId(path: string, method: "GET" | "POST", body?: unknown) {
	const config = getServerConfig().playerId;
	if (!config?.url || !config.apiKey) return { ok: false, error: "unavailable" } as const;
	if (Date.now() < backoffUntil) return { ok: false, error: "rate_limited" } as const;

	let response: Response;
	try {
		response = await fetch(new URL(path, config.url), {
			method,
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				Accept: "application/json",
				...(body === undefined ? {} : { "Content-Type": "application/json" })
			},
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(10_000)
		});
	} catch (err) {
		log.error("[%s %s] PlayerID request failed: %s", method, path, err);
		return { ok: false, error: "unavailable" } as const;
	}

	if (response.status === 429) {
		const retryAfter = Number(response.headers.get("Retry-After"));
		backoffUntil = Date.now() + (retryAfter > 0 ? retryAfter * 1000 : DEFAULT_BACKOFF_MS);
		log.warning("[%s %s] PlayerID rate limit hit, pausing lookups", method, path);
		return { ok: false, error: "rate_limited" } as const;
	}
	if (response.status === 404) return { ok: false, error: "not_found" } as const;
	if (!response.ok) {
		log.error(
			"[%s %s] PlayerID returned %d: %s",
			method,
			path,
			response.status,
			await response.text()
		);
		return { ok: false, error: "unavailable" } as const;
	}

	const json = (await response.json()) as {
		data?: { id: string | number; status: string; player_id?: string | null; name?: string | null };
	};
	if (!json.data) return { ok: false, error: "unavailable" } as const;
	const ticket: PlayerIdTicket = {
		id: String(json.data.id),
		status: json.data.status === "done" ? "complete" : json.data.status,
		playerId: json.data.player_id ?? undefined,
		trainerName: json.data.name ?? undefined
	};

	const now = Date.now();
	if (ticketCache.size > 1000) {
		for (const [id, entry] of ticketCache) if (now - entry.at >= RECHECK_MS) ticketCache.delete(id);
	}
	ticketCache.set(ticket.id, {
		at: now,
		firstSeen: ticketCache.get(ticket.id)?.firstSeen ?? now,
		ticket
	});
	return { ok: true, ticket } as const;
}

/**
 * Starts (or resumes) the lookup for a friend code. Tickets are keyed by the code, so a code
 * anyone on this map looked up before comes back from its existing ticket without using up the
 * daily quota.
 */
export function createPlayerIdTicket(friendCode: string): Promise<PlayerIdResult> {
	return callPlayerId("/api/v1/tickets", "POST", {
		friend_code: friendCode,
		unique_id: `fc-${friendCode}`
	});
}

export async function getPlayerIdTicket(ticketId: string): Promise<PlayerIdResult> {
	const cached = ticketCache.get(ticketId);
	const interval =
		cached && Date.now() - cached.firstSeen < FAST_RECHECK_FOR_MS ? FAST_RECHECK_MS : RECHECK_MS;
	if (cached && Date.now() - cached.at < interval) return { ok: true, ticket: cached.ticket };
	return callPlayerId(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, "GET");
}
