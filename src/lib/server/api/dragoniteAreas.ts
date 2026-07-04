import { getServerConfig } from "$lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import type { Polygon } from "geojson";

const log = getLogger("dragoniteAreas");

export interface DragonitePokemonMode {
	workers: number;
	invasion: boolean;
	enable_scout: boolean;
}

export interface DragoniteQuestMode {
	workers: number;
	hours: number[];
}

export interface ApiAreaV2 {
	id?: number; // readOnly, present in responses
	name?: string;
	enabled?: boolean;
	enable_pokemon?: boolean;
	enable_quests?: boolean;
	enable_forts?: boolean;
	enable_rare_pokemon?: boolean;
	geofence?: GeoJSON.Feature<Polygon> | Polygon;
	pokemon_mode?: DragonitePokemonMode;
	quest_mode?: DragoniteQuestMode;
}

function getHeaders(json = false): HeadersInit {
	const headers: HeadersInit = {};
	const config = getServerConfig().dragonite;
	if (config.secret) {
		headers["X-Dragonite-Admin-Secret"] = config.secret;
	}
	if (config.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(config.basicAuth)}`;
	}
	if (json) {
		headers["Content-Type"] = "application/json";
	}
	return headers;
}

function getBaseUrl(): string {
	const { url, adminUrl } = getServerConfig().dragonite;
	return adminUrl ?? url;
}

// /recalculate, /reload and /quest aren't mounted under the admin proxy's /api
// prefix (only /v2/areas, /status, /accounts, /scheduler are) — they only exist
// on the core service.
function getCoreUrl(): string {
	return getServerConfig().dragonite.url;
}

export async function dragoniteFetch(
	path: string,
	init: { method: string; body?: unknown; base?: string } = { method: "GET" },
	timeoutMs = 10000
): Promise<Response> {
	const res = await fetch(new URL(path, init.base ?? getBaseUrl()), {
		method: init.method,
		headers: getHeaders(init.body !== undefined),
		body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
		signal: AbortSignal.timeout(timeoutMs)
	});
	return res;
}

export async function throwProblem(
	res: Response,
	context: string,
	sentBody?: unknown
): Promise<never> {
	let detail = "";
	try {
		const problem = await res.json();
		const fieldErrors = (problem?.errors as { location?: string; message?: string }[] | undefined)
			?.map((e) => `${e.location ?? "?"}: ${e.message ?? ""}`)
			.join("; ");
		detail = fieldErrors || problem?.detail || problem?.title || "";
	} catch {
		// not problem+json, status alone will have to do
	}
	if (sentBody !== undefined) {
		log.warning(
			`Dragonite ${context} rejected payload: ${JSON.stringify(sentBody).slice(0, 4000)}`
		);
	}
	throw new Error(`Dragonite ${context} returned ${res.status}${detail ? `: ${detail}` : ""}`);
}

export async function createDragoniteArea(area: ApiAreaV2): Promise<number> {
	const res = await dragoniteFetch("v2/areas/", { method: "POST", body: area });
	if (res.status !== 201) await throwProblem(res, "create area", area);

	try {
		const body = (await res.json()) as ApiAreaV2;
		if (typeof body.id === "number" && body.id > 0) return body.id;
	} catch {
		// fall through to Location header
	}
	const location = res.headers.get("Location") ?? "";
	const id = Number(location.replace(/\/+$/, "").split("/").pop());
	if (!Number.isInteger(id) || id <= 0) {
		throw new Error("Dragonite create area succeeded but no area id could be determined");
	}
	return id;
}

export async function patchDragoniteArea(id: number, patch: ApiAreaV2): Promise<void> {
	const res = await dragoniteFetch(`v2/areas/${id}`, { method: "PATCH", body: patch });
	if (!res.ok) await throwProblem(res, `patch area ${id}`, patch);
}

export async function deleteDragoniteArea(id: number): Promise<"deleted" | "not_found"> {
	const res = await dragoniteFetch(`v2/areas/${id}`, { method: "DELETE" });
	if (res.status === 204) return "deleted";
	if (res.status === 404) return "not_found";
	await throwProblem(res, `delete area ${id}`);
	return "not_found"; // unreachable
}

export async function listDragoniteAreasByPrefix(
	prefix: string
): Promise<{ id: number; name: string }[]> {
	const results: { id: number; name: string }[] = [];
	let page = 0;
	let totalPages = 1;
	while (page < totalPages) {
		const res = await dragoniteFetch(
			`v2/areas/?q=${encodeURIComponent(prefix)}&page=${page}&per_page=200`
		);
		if (!res.ok) await throwProblem(res, "list areas");
		const areas = ((await res.json()) as ApiAreaV2[] | null) ?? [];
		for (const area of areas) {
			if (typeof area.id === "number" && area.name?.startsWith(prefix)) {
				results.push({ id: area.id, name: area.name });
			}
		}
		totalPages = Number(res.headers.get("X-Total-Pages") ?? 1);
		page += 1;
	}
	return results;
}

export async function startDragoniteQuestScan(areaId: number): Promise<void> {
	const res = await dragoniteFetch(`quest/${areaId}/start`, {
		method: "POST",
		base: getCoreUrl()
	});
	if (!res.ok) await throwProblem(res, `start quest scan for area ${areaId}`);
}

export async function stopDragoniteQuestScan(areaId: number): Promise<void> {
	const res = await dragoniteFetch(`quest/${areaId}/stop`, { method: "POST", base: getCoreUrl() });
	if (!res.ok) await throwProblem(res, `stop quest scan for area ${areaId}`);
}

export async function reloadDragonite(): Promise<void> {
	const res = await dragoniteFetch("reload", { method: "POST", base: getCoreUrl() });
	if (!res.ok) await throwProblem(res, "reload");
}

export async function recalculatePokemonRoute(areaId: number, bootstrap = false): Promise<void> {
	const res = await dragoniteFetch(`recalculate/${areaId}/pokemon?bootstrap=${bootstrap}`, {
		method: "POST",
		base: getCoreUrl()
	});
	if (!res.ok) await throwProblem(res, `recalculate pokemon route for area ${areaId}`);
}
