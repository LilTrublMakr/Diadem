import {
	getUserGuildsWithPermissions,
	hasManageGuildPermission,
	type DiscordUserGuild
} from "@/lib/server/auth/discordDetails";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("channelNotifications");

export type ManageableGuildsResult =
	| { ok: true; guilds: DiscordUserGuild[] }
	| { ok: false; missingScope: true }
	| { ok: false; missingScope: false; status: number };

// Discord's GET /users/@me/guilds is tightly rate-limited, and every channel-notifications
// request (list guilds, list channels, list/create/edit/delete subscriptions) independently
// re-verifies admin permission by calling it - a handful of requests in quick succession 429s.
// A short cache, keyed by access token and storing the in-flight promise itself (so concurrent
// callers within the window share one outbound call instead of racing separate ones), fixes both
// the rate-limiting and the token-refresh race the promise-sharing incidentally also closes.
const GUILDS_CACHE_TTL_MS = 60_000;
const guildsCache = new Map<
	string,
	{ promise: Promise<ManageableGuildsResult>; expiresAt: number }
>();

async function fetchManageableGuilds(accessToken: string): Promise<ManageableGuildsResult> {
	const result = await getUserGuildsWithPermissions(accessToken);
	if (!result.ok) {
		// missingScope:true can also mean Discord rejected the token for a reason OTHER than a
		// stale OAuth scope (e.g. a transient 401 from a just-rotated/expired token) - and a non-401/
		// 403 status here (429 rate limit, 5xx) gets treated the same as "not an admin" by every
		// caller. Logging the real status is the only way to tell those apart from the server log.
		if (result.missingScope) {
			log.warning(
				"Discord rejected /users/@me/guilds with 401/403 - stale OAuth scope, or token issue"
			);
		} else {
			log.warning(`Discord /users/@me/guilds returned ${result.status}`);
		}
		return result;
	}
	return { ok: true, guilds: result.guilds.filter((g) => hasManageGuildPermission(g.permissions)) };
}

/** The current user's Discord guilds, filtered to ones where their live permissions include
 * Administrator or Manage Server - the set they're allowed to configure channel notifications for. */
export function getManageableGuilds(accessToken: string): Promise<ManageableGuildsResult> {
	const cached = guildsCache.get(accessToken);
	if (cached && cached.expiresAt > Date.now()) return cached.promise;

	const promise = fetchManageableGuilds(accessToken);
	guildsCache.set(accessToken, { promise, expiresAt: Date.now() + GUILDS_CACHE_TTL_MS });
	// A failure (429, transient outage) shouldn't pin the cache for the full TTL - only a success
	// is worth not re-fetching; let the very next call after a failure retry against Discord fresh.
	void promise.then((result) => {
		if (!result.ok) guildsCache.delete(accessToken);
	});
	return promise;
}

/** Re-checks that the caller is actually an admin of guildId - never trust a client-supplied
 * guild id without this, since the guild list itself is also client-influenced input. */
export async function isGuildManageableByUser(
	accessToken: string,
	guildId: string
): Promise<boolean> {
	const result = await getManageableGuilds(accessToken);
	if (!result.ok) return false;
	const manageable = result.guilds.some((g) => g.id === guildId);
	if (!manageable) {
		log.warning(
			`guildId ${guildId} not in caller's manageable guilds (has: ${result.guilds.map((g) => g.id).join(", ") || "none"})`
		);
	}
	return manageable;
}
