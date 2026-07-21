import { fetchKojiGeofences } from "@/lib/server/api/kojiApi";
import type { KojiFeature } from "@/lib/features/koji";

const REFRESH_INTERVAL_MS = 60_000;

let byId: Map<number, KojiFeature> = new Map();
let lastRefresh = 0;
let inFlight: Promise<void> | null = null;

async function ensureFresh(thisFetch: typeof fetch): Promise<void> {
	if (Date.now() - lastRefresh < REFRESH_INTERVAL_MS) return;
	if (inFlight) return inFlight;

	inFlight = (async () => {
		const features = await fetchKojiGeofences(thisFetch);
		if (features) {
			byId = new Map(features.map((f) => [f.properties.id, f]));
			lastRefresh = Date.now();
		}
	})();
	try {
		await inFlight;
	} finally {
		inFlight = null;
	}
}

/** Looks up a "coverage map" (Koji) geofence by id for area-scoped notification matching. */
export async function getKojiAreaById(
	id: number,
	thisFetch: typeof fetch = fetch
): Promise<KojiFeature | undefined> {
	await ensureFresh(thisFetch);
	return byId.get(id);
}
