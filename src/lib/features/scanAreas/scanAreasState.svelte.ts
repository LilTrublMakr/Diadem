import { computeInstantUsage, toOccupancySources } from "@/lib/features/scanAreas/scheduleOverlap";
import type { AreaSchedule, ScanAreaMode } from "@/lib/features/scanAreas/scheduleTypes";
import type {
	ScanAreaDto,
	ScanAreaErrorResponse,
	ScanAreasResponse
} from "@/lib/features/scanAreas/types";
import type { Polygon } from "geojson";

export type ScanAreasData = {
	areas: ScanAreaDto[];
	allotment: { total: number; used: number };
	limits: { maxAreaSqM: number; recommendedAreaSqM: number };
	loading: boolean;
	loaded: boolean;
	forbidden: boolean;
	error: string | null;
};

export type ScanAreaApiError = { code: string; message: string };

let state = $state<ScanAreasData>({
	areas: [],
	allotment: { total: 0, used: 0 },
	limits: { maxAreaSqM: 5_000_000, recommendedAreaSqM: 2_500_000 },
	loading: false,
	loaded: false,
	forbidden: false,
	error: null
});

export function getScanAreasState(): ScanAreasData {
	return state;
}

function recomputeUsed() {
	state.allotment.used = computeInstantUsage(toOccupancySources(state.areas), new Date());
}

async function parseError(res: Response): Promise<ScanAreaApiError> {
	try {
		const body = (await res.json()) as ScanAreaErrorResponse;
		return { code: body.error ?? "unknown", message: body.message ?? "Something went wrong" };
	} catch {
		return { code: "unknown", message: `Request failed (${res.status})` };
	}
}

export async function loadScanAreas(): Promise<void> {
	state.loading = true;
	state.error = null;
	try {
		const res = await fetch("/api/custom/scan-areas");
		if (res.status === 401 || res.status === 403) {
			state.forbidden = true;
			return;
		}
		if (!res.ok) {
			state.error = `Failed to load scan areas (${res.status})`;
			return;
		}
		const data = (await res.json()) as ScanAreasResponse;
		state.areas = data.areas;
		state.allotment = data.allotment;
		state.limits = data.limits;
		state.forbidden = false;
		state.loaded = true;
	} catch {
		state.error = "Failed to load scan areas";
	} finally {
		state.loading = false;
	}
}

export async function createArea(input: {
	name: string;
	geofence: Polygon;
	workers: number;
}): Promise<ScanAreaDto | ScanAreaApiError> {
	const res = await fetch("/api/custom/scan-areas", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as ScanAreaDto;
	state.areas = [...state.areas, dto];
	return dto;
}

export async function patchArea(
	id: number,
	patch: { name?: string; geofence?: Polygon; workers?: number }
): Promise<ScanAreaDto | ScanAreaApiError> {
	const res = await fetch(`/api/custom/scan-areas/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as ScanAreaDto;
	state.areas = state.areas.map((a) => (a.id === id ? dto : a));
	recomputeUsed();
	return dto;
}

export async function removeArea(id: number): Promise<ScanAreaApiError | null> {
	const res = await fetch(`/api/custom/scan-areas/${id}`, { method: "DELETE" });
	if (!res.ok && res.status !== 404) return parseError(res);
	state.areas = state.areas.filter((a) => a.id !== id);
	recomputeUsed();
	return null;
}

export async function setActive(
	id: number,
	active: boolean
): Promise<ScanAreaDto | ScanAreaApiError> {
	const res = await fetch(`/api/custom/scan-areas/${id}/${active ? "activate" : "deactivate"}`, {
		method: "POST"
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as ScanAreaDto;
	state.areas = state.areas.map((a) => (a.id === id ? dto : a));
	recomputeUsed();
	return dto;
}

export async function setMode(
	id: number,
	mode: ScanAreaMode
): Promise<ScanAreaDto | ScanAreaApiError> {
	const res = await fetch(`/api/custom/scan-areas/${id}/mode`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ mode })
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as ScanAreaDto;
	state.areas = state.areas.map((a) => (a.id === id ? dto : a));
	recomputeUsed();
	return dto;
}

export async function saveSchedule(
	id: number,
	schedule: AreaSchedule
): Promise<ScanAreaDto | ScanAreaApiError> {
	const res = await fetch(`/api/custom/scan-areas/${id}/schedule`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(schedule)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as ScanAreaDto;
	state.areas = state.areas.map((a) => (a.id === id ? dto : a));
	recomputeUsed();
	return dto;
}

export async function triggerQuestScan(id: number): Promise<ScanAreaApiError | null> {
	const res = await fetch(`/api/custom/scan-areas/${id}/quest`, { method: "POST" });
	if (!res.ok) return parseError(res);
	return null;
}

export function isApiError(result: unknown): result is ScanAreaApiError {
	return (
		typeof result === "object" && result !== null && "code" in result && !("geofence" in result)
	);
}
