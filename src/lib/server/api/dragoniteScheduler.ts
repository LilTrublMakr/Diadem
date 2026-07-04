import { dragoniteFetch, throwProblem } from "@/lib/server/api/dragoniteAreas";

export interface DragoniteWindow {
	at: string; // "HH:MM"
	days?: string[]; // ["mon", "tue"] etc; empty/absent = every day
	for?: string; // Go duration, e.g. "8h", "10h30m"
}

export interface DragoniteAction {
	kind: "state";
	op: "scale";
	// quest is NOT scalable (quest_mode_workers is a cap on pokemon/fort workers,
	// not a pool) — user scan-area schedules scale pokemon only
	type: "pokemon";
	set: number;
}

export interface DragoniteScheduleDoc {
	name: string; // globally unique across all schedules
	schedule_kind: "recurring" | "dated";
	// Equal-priority same-target docs are rejected even when their dates never
	// coincide — every doc for one area must carry a distinct priority
	priority: number;
	tz?: string; // IANA override; absent = area-local (geofence-derived)
	windows?: DragoniteWindow[];
	dates?: string[]; // dated only, "YYYY-MM-DD"
	actions: DragoniteAction[];
	targets: { areas: string[] }; // by AREA NAME — renames must rebuild docs
	enabled?: boolean;
}

interface DragoniteScheduleOut {
	id?: number;
	name?: string;
}

export async function createDragoniteSchedule(doc: DragoniteScheduleDoc): Promise<number> {
	const res = await dragoniteFetch("scheduler/schedules", { method: "POST", body: doc });
	if (res.status !== 201) await throwProblem(res, "create schedule", doc);

	try {
		const body = (await res.json()) as DragoniteScheduleOut;
		if (typeof body.id === "number" && body.id > 0) return body.id;
	} catch {
		// fall through to Location header
	}
	const location = res.headers.get("Location") ?? "";
	const id = Number(location.replace(/\/+$/, "").split("/").pop());
	if (!Number.isInteger(id) || id <= 0) {
		throw new Error("Dragonite create schedule succeeded but no schedule id could be determined");
	}
	return id;
}

export async function deleteDragoniteSchedule(id: number): Promise<"deleted" | "not_found"> {
	const res = await dragoniteFetch(`scheduler/schedules/${id}`, { method: "DELETE" });
	if (res.status === 204) return "deleted";
	if (res.status === 404) return "not_found";
	await throwProblem(res, `delete schedule ${id}`);
	return "not_found"; // unreachable
}

export async function listDragoniteSchedulesByPrefix(
	prefix: string
): Promise<{ id: number; name: string }[]> {
	const results: { id: number; name: string }[] = [];
	let page = 0;
	let totalPages = 1;
	while (page < totalPages) {
		const res = await dragoniteFetch(
			`scheduler/schedules?q=${encodeURIComponent(prefix)}&page=${page}&per_page=200`
		);
		if (!res.ok) await throwProblem(res, "list schedules");
		const schedules = ((await res.json()) as DragoniteScheduleOut[] | null) ?? [];
		for (const schedule of schedules) {
			if (typeof schedule.id === "number" && schedule.name?.startsWith(prefix)) {
				results.push({ id: schedule.id, name: schedule.name });
			}
		}
		totalPages = Number(res.headers.get("X-Total-Pages") ?? 1);
		page += 1;
	}
	return results;
}
