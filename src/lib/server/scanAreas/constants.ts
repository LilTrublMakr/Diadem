import { getServerConfig } from "$lib/services/config/config.server";

export const SCAN_AREA_PREFIX = "vtscan_";
export const SCHEDULE_PREFIX = "vtsched_";

export const DEFAULT_MAX_AREA_KM2 = 5;
export const DEFAULT_RECOMMENDED_AREA_KM2 = 2.5;

export function getScanAreaLimits(): { maxAreaSqM: number; recommendedAreaSqM: number } {
	const config = getServerConfig().scanAreas;
	return {
		maxAreaSqM: (config?.maxAreaKm2 ?? DEFAULT_MAX_AREA_KM2) * 1_000_000,
		recommendedAreaSqM: (config?.recommendedAreaKm2 ?? DEFAULT_RECOMMENDED_AREA_KM2) * 1_000_000
	};
}
