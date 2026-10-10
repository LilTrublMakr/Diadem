import type { Bounds } from "@/lib/mapObjects/mapBounds";
import { getMultiplePokemon } from "@/lib/server/api/golbatApi";
import type { GolbatPokemonMessage } from "@/lib/server/notifications/golbatTypes";
import { getLogger } from "@/lib/utils/logger";

export type IndexedSpawn = {
	encounterId: string;
	lat: number;
	lon: number;
	pokemonId: number;
	form: number; // raw Golbat form — normalize before odds lookups
	expire: number; // unix seconds
};

type Box = { minLat: number; minLon: number; maxLat: number; maxLon: number };

// Live spawns, so map queries can find which species are predicted shiny for a viewer in view
// *before* asking Golbat — instead of pulling every spawn and post-filtering, which hits
// Golbat's ~3000-match cap when zoomed out. Fed by the Golbat "pokemon" webhook; when that isn't
// arriving (e.g. a dev box Golbat doesn't send to) or is still warming up, filled on demand by
// polling Golbat's scan API instead.
const spawns = new Map<string, IndexedSpawn>();
let firstRecordAt = 0;
let lastRecordAt = 0;
let lastPruneAt = 0;
let lastPollAt = 0; // last successful poll
let lastPollAttemptAt = 0;
let pollInFlight: Promise<void> | null = null;
let pollArea: Box | null = null; // bbox of the last poll's spawns, so later polls skip the world

const log = getLogger("shinyindex");

// Spawns last up to an hour, but most of the live set is re-sent well within this — after it,
// the webhook-fed index is trusted to be complete. Webhooks quiet this long = stale.
const WARM_AFTER_MS = 10 * 60 * 1000;
const STALE_AFTER_MS = 5 * 60 * 1000;
// Polling only runs while someone's map needs it: refresh at most this often, and trust a poll
// snapshot for this long
const POLL_INTERVAL_MS = 90 * 1000;
const POLL_FRESH_MS = 3 * 60 * 1000;
const POLL_MAX_DEPTH = 14;
const POLL_WAIT_MS = 15 * 1000;
const WORLD: Box = { minLat: -85, minLon: -180, maxLat: 85, maxLon: 180 };

function prune(now: number) {
	if (now - lastPruneAt < 60_000) return;
	lastPruneAt = now;
	const nowSeconds = now / 1000;
	for (const [id, spawn] of spawns) {
		if (spawn.expire < nowSeconds) spawns.delete(id);
	}
}

export function recordSpawn(message: GolbatPokemonMessage) {
	const now = Date.now();
	if (!firstRecordAt) {
		firstRecordAt = now;
		log.info("Receiving pokemon webhooks — polling Golbat until the index is warm (10 min)");
	}
	lastRecordAt = now;

	spawns.set(message.encounter_id, {
		encounterId: message.encounter_id,
		lat: message.latitude,
		lon: message.longitude,
		pokemonId: message.pokemon_id,
		form: message.form ?? 0,
		expire: message.disappear_time
	});
	prune(now);
}

// Golbat caps matches per scan, so split any box that hits the cap into quadrants
async function scanBox(box: Box, depth: number, found: IndexedSpawn[]): Promise<void> {
	const result = await getMultiplePokemon({
		min: { latitude: box.minLat, longitude: box.minLon },
		max: { latitude: box.maxLat, longitude: box.maxLon },
		limit: 10_000,
		filters: [{ pokemon: [] }]
	});
	if (!result) throw new Error("Golbat scan failed");

	if (result.limit_reached && depth < POLL_MAX_DEPTH) {
		const midLat = (box.minLat + box.maxLat) / 2;
		const midLon = (box.minLon + box.maxLon) / 2;
		for (const quadrant of [
			{ minLat: box.minLat, minLon: box.minLon, maxLat: midLat, maxLon: midLon },
			{ minLat: box.minLat, minLon: midLon, maxLat: midLat, maxLon: box.maxLon },
			{ minLat: midLat, minLon: box.minLon, maxLat: box.maxLat, maxLon: midLon },
			{ minLat: midLat, minLon: midLon, maxLat: box.maxLat, maxLon: box.maxLon }
		])
			await scanBox(quadrant, depth + 1, found);
		return;
	}

	for (const p of result.pokemon) {
		found.push({
			encounterId: String(p.id),
			lat: p.lat,
			lon: p.lon,
			pokemonId: p.pokemon_id,
			form: p.form ?? 0,
			expire: p.expire_timestamp ?? 0
		});
	}
}

function startPoll() {
	if (pollInFlight || Date.now() - lastPollAttemptAt < POLL_INTERVAL_MS) return;
	lastPollAttemptAt = Date.now();

	pollInFlight = (async () => {
		const start = performance.now();
		const found: IndexedSpawn[] = [];
		try {
			// Pad the known area so spawns just outside last time's bbox still get found
			const area = pollArea
				? {
						minLat: pollArea.minLat - 0.5,
						minLon: pollArea.minLon - 0.5,
						maxLat: pollArea.maxLat + 0.5,
						maxLon: pollArea.maxLon + 0.5
					}
				: WORLD;
			await scanBox(area, 0, found);
		} catch (e) {
			log.error("Shiny spawn index poll failed: %s", e);
			return;
		} finally {
			pollInFlight = null;
		}

		for (const spawn of found) spawns.set(spawn.encounterId, spawn);
		if (found.length) {
			pollArea = {
				minLat: Math.min(...found.map((s) => s.lat)),
				minLon: Math.min(...found.map((s) => s.lon)),
				maxLat: Math.max(...found.map((s) => s.lat)),
				maxLon: Math.max(...found.map((s) => s.lon))
			};
		}
		lastPollAt = Date.now();
		prune(lastPollAt);
		log.info(
			"Polled Golbat for the shiny spawn index: %d spawns in %fms",
			found.length,
			(performance.now() - start).toFixed(0)
		);
	})();
}

/** Live indexed spawns in bounds, or null while the index can't be trusted to be complete. */
export async function getIndexedSpawns(bounds: Bounds): Promise<IndexedSpawn[] | null> {
	let now = Date.now();
	const webhookReady =
		firstRecordAt && now - firstRecordAt >= WARM_AFTER_MS && now - lastRecordAt <= STALE_AFTER_MS;

	if (!webhookReady) {
		startPoll();
		// No usable snapshot yet: wait for the poll rather than falling back to an unnarrowed
		// Golbat query, which is what hits the result limit. Capped so a slow Golbat can't hang
		// the map request — past the cap, the caller falls back.
		if ((!lastPollAt || now - lastPollAt > POLL_FRESH_MS) && pollInFlight) {
			await Promise.race([pollInFlight, new Promise((r) => setTimeout(r, POLL_WAIT_MS))]);
			now = Date.now();
		}
		if (!lastPollAt || now - lastPollAt > POLL_FRESH_MS) return null;
	}

	const nowSeconds = now / 1000;
	const result: IndexedSpawn[] = [];
	for (const spawn of spawns.values()) {
		if (
			spawn.expire >= nowSeconds &&
			spawn.lat >= bounds.minLat &&
			spawn.lat <= bounds.maxLat &&
			spawn.lon >= bounds.minLon &&
			spawn.lon <= bounds.maxLon
		)
			result.push(spawn);
	}
	return result;
}
