import type {
	NotificationAreaDto,
	NotificationErrorResponse
} from "@/lib/features/notifications/types";
import type { Polygon } from "geojson";

export type NotificationAreasData = {
	areas: NotificationAreaDto[];
	loading: boolean;
	loaded: boolean;
	forbidden: boolean;
	error: string | null;
};

export type NotificationAreaApiError = { code: string; message: string };

let state = $state<NotificationAreasData>({
	areas: [],
	loading: false,
	loaded: false,
	forbidden: false,
	error: null
});

export function getNotificationAreasState(): NotificationAreasData {
	return state;
}

async function parseError(res: Response): Promise<NotificationAreaApiError> {
	try {
		const body = (await res.json()) as NotificationErrorResponse;
		return { code: body.error ?? "unknown", message: body.message ?? "Something went wrong" };
	} catch {
		return { code: "unknown", message: `Request failed (${res.status})` };
	}
}

export function isApiError(result: unknown): result is NotificationAreaApiError {
	return typeof result === "object" && result !== null && "code" in result && "message" in result;
}

export async function loadNotificationAreas(): Promise<void> {
	state.loading = true;
	state.error = null;
	try {
		const res = await fetch("/api/custom/notifications/areas");
		if (res.status === 401 || res.status === 403) {
			state.forbidden = true;
			return;
		}
		if (!res.ok) {
			state.error = `Failed to load notification areas (${res.status})`;
			return;
		}
		state.areas = (await res.json()) as NotificationAreaDto[];
		state.forbidden = false;
		state.loaded = true;
	} catch {
		state.error = "Failed to load notification areas";
	} finally {
		state.loading = false;
	}
}

export async function createNotificationArea(input: {
	name: string;
	geofence: Polygon;
}): Promise<NotificationAreaDto | NotificationAreaApiError> {
	const res = await fetch("/api/custom/notifications/areas", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationAreaDto;
	state.areas = [...state.areas, dto];
	return dto;
}

export async function patchNotificationArea(
	id: number,
	patch: { name?: string; geofence?: Polygon }
): Promise<NotificationAreaDto | NotificationAreaApiError> {
	const res = await fetch(`/api/custom/notifications/areas/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationAreaDto;
	state.areas = state.areas.map((a) => (a.id === id ? dto : a));
	return dto;
}

export async function removeNotificationArea(id: number): Promise<NotificationAreaApiError | null> {
	const res = await fetch(`/api/custom/notifications/areas/${id}`, { method: "DELETE" });
	if (!res.ok && res.status !== 404) return parseError(res);
	state.areas = state.areas.filter((a) => a.id !== id);
	return null;
}
