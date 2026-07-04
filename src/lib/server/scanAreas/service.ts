import {
	type ApiAreaV2,
	createDragoniteArea,
	deleteDragoniteArea,
	listDragoniteAreasByPrefix,
	patchDragoniteArea,
	recalculatePokemonRoute,
	reloadDragonite,
	startDragoniteQuestScan
} from "@/lib/server/api/dragoniteAreas";
import {
	type DragoniteScheduleDoc,
	createDragoniteSchedule,
	deleteDragoniteSchedule,
	listDragoniteSchedulesByPrefix
} from "@/lib/server/api/dragoniteScheduler";
import {
	deleteScanAreaRow,
	getAllScanAreas,
	getScanArea,
	getScanAreas,
	insertScanArea,
	updateScanAreaRow
} from "@/lib/server/db/internal/repository";
import type { ScanArea } from "@/lib/server/db/internal/schema";
import {
	SCAN_AREA_PREFIX,
	SCHEDULE_PREFIX,
	getScanAreaLimits
} from "@/lib/server/scanAreas/constants";
import { validatePolygonGeometry } from "@/lib/server/scanAreas/validation";
import {
	findIntraAreaOverlap,
	toOccupancySources,
	validateAllotment
} from "@/lib/features/scanAreas/scheduleOverlap";
import type { AreaSchedule, ScanAreaMode } from "@/lib/features/scanAreas/scheduleTypes";
import { getLogger } from "@/lib/utils/logger";
import type { Polygon } from "geojson";

const log = getLogger("scanAreas");

export type ScanAreaErrorCode =
	| "not_found"
	| "name_taken"
	| "too_large"
	| "invalid_polygon"
	| "allotment_exceeded"
	| "schedule_overlap"
	| "invalid_mode"
	| "invalid_schedule"
	| "not_active"
	| "dragonite_unavailable";

export class ScanAreaError extends Error {
	constructor(
		public code: ScanAreaErrorCode,
		public status: number,
		message: string,
		public extra: Record<string, unknown> = {}
	) {
		super(message);
		this.name = "ScanAreaError";
	}
}

// Per-user mutation lock: chains mutations per userId so two concurrent
// mutations cannot both pass the allotment check (same pattern as permissionCache)
const userLocks = new Map<string, Promise<unknown>>();

async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
	const previous = userLocks.get(userId) ?? Promise.resolve();
	const next = previous.catch(() => {}).then(fn);
	userLocks.set(userId, next);
	try {
		return await next;
	} finally {
		if (userLocks.get(userId) === next) userLocks.delete(userId);
	}
}

function isDuplicateKeyError(error: unknown): boolean {
	const candidates = [error, (error as { cause?: unknown })?.cause];
	return candidates.some(
		(e) =>
			(e as { code?: string })?.code === "ER_DUP_ENTRY" || (e as { errno?: number })?.errno === 1062
	);
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function dragoniteName(dbId: number, name: string): string {
	return `${SCAN_AREA_PREFIX}${dbId}_${slugify(name).slice(0, 40)}`;
}

/**
 * Occupancy baseline pushed to Dragonite's pokemon_mode.workers.
 * Manual-active = N; everything else (manual-inactive, scheduled) = 0 —
 * scheduled areas get their workers from vtsched_ scale docs during windows.
 */
function baselineWorkers(row: ScanArea): number {
	return row.mode === "manual" && row.active ? row.workers : 0;
}

/**
 * quest workers stay at N permanently: quest_mode.workers is a CAP on how many
 * pokemon/fort workers run quests (not a scalable pool — Dragonite rejects
 * scale:quest actions), so it only takes effect while pokemon workers exist.
 */
function buildModes(
	pokemonWorkers: number,
	questCap: number
): Pick<ApiAreaV2, "pokemon_mode" | "quest_mode"> {
	return {
		pokemon_mode: { workers: pokemonWorkers, invasion: false, enable_scout: false },
		quest_mode: { workers: questCap, hours: [] }
	};
}

function buildApiArea(row: ScanArea): ApiAreaV2 {
	return {
		name: dragoniteName(row.id, row.name),
		enabled: true,
		enable_pokemon: true,
		enable_quests: true,
		enable_forts: false,
		enable_rare_pokemon: false,
		geofence: { type: "Feature", properties: {}, geometry: row.geofence },
		...buildModes(baselineWorkers(row), row.workers)
	};
}

function dragoniteUnavailable(error: unknown): ScanAreaError {
	log.warning(`Dragonite call failed: ${error}`);
	return new ScanAreaError(
		"dragonite_unavailable",
		502,
		"The scanner could not be reached, please try again later"
	);
}

async function requireScanArea(userId: string, id: number): Promise<ScanArea> {
	const row = await getScanArea(userId, id);
	if (!row) throw new ScanAreaError("not_found", 404, "Scan area not found");
	return row;
}

function bestEffortReload() {
	reloadDragonite().catch((error) => log.warning(`Dragonite reload failed: ${error}`));
}

/**
 * Mirror-all lifecycle: every scan-area row keeps a permanent Dragonite area.
 * Returns the existing id or creates the area (with route bootstrap). The
 * second reload registers the freshly calculated route with the scheduler.
 */
async function ensureDragoniteArea(row: ScanArea): Promise<number> {
	if (row.dragoniteAreaId != null) return row.dragoniteAreaId;

	const dragoniteAreaId = await createDragoniteArea(buildApiArea(row));
	await updateScanAreaRow(row.userId, row.id, { dragoniteAreaId });
	row.dragoniteAreaId = dragoniteAreaId;

	try {
		await reloadDragonite();
		await recalculatePokemonRoute(dragoniteAreaId, true);
		await reloadDragonite();
	} catch (error) {
		log.warning(`Route bootstrap failed for area ${row.id}: ${error}`);
	}
	return dragoniteAreaId;
}

function goDuration(start: string, end: string): string {
	const toMin = (t: string) => {
		const [h, m] = t.split(":").map(Number);
		return h * 60 + m;
	};
	let minutes = toMin(end) - toMin(start);
	if (minutes <= 0) minutes += 1440; // overnight wrap; "24:00" end handled by toMin
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? (h > 0 ? `${h}h${m}m` : `${m}m`) : `${h}h`;
}

/**
 * Dragonite docs for a scheduled area: one recurring doc with all weekly
 * windows, plus one dated doc per distinct (start,end) time group. Every doc
 * gets a distinct priority — Dragonite rejects equal-priority same-target
 * docs even when their dates can never coincide.
 */
function buildScheduleDocs(row: ScanArea): DragoniteScheduleDoc[] {
	const schedule = row.schedule;
	if (!schedule) return [];
	const target = dragoniteName(row.id, row.name);
	const actions: DragoniteScheduleDoc["actions"] = [
		{ kind: "state", op: "scale", type: "pokemon", set: row.workers }
	];
	const docs: DragoniteScheduleDoc[] = [];

	if (schedule.weekly.length > 0) {
		docs.push({
			name: `${SCHEDULE_PREFIX}${row.id}_r`,
			schedule_kind: "recurring",
			priority: 100,
			tz: schedule.tz,
			windows: schedule.weekly.map((w) => ({
				at: w.start,
				days: w.days,
				for: goDuration(w.start, w.end)
			})),
			actions,
			targets: { areas: [target] },
			enabled: true
		});
	}

	const datedGroups = new Map<string, { start: string; end: string; dates: string[] }>();
	for (const window of schedule.dated) {
		const key = `${window.start}-${window.end}`;
		const group = datedGroups.get(key) ?? { start: window.start, end: window.end, dates: [] };
		group.dates.push(window.date);
		datedGroups.set(key, group);
	}
	let datedIndex = 0;
	for (const key of [...datedGroups.keys()].sort()) {
		const group = datedGroups.get(key)!;
		docs.push({
			name: `${SCHEDULE_PREFIX}${row.id}_d${datedIndex}`,
			schedule_kind: "dated",
			priority: 501 + datedIndex,
			tz: schedule.tz,
			dates: [...group.dates].sort(),
			windows: [{ at: group.start, for: goDuration(group.start, group.end) }],
			actions,
			targets: { areas: [target] },
			enabled: true
		});
		datedIndex += 1;
	}
	return docs;
}

/**
 * Delete-and-recreate the area's Dragonite schedule docs. Returns the new doc
 * ids (empty when the area isn't scheduled or has no schedule).
 */
async function rebuildDragoniteSchedules(row: ScanArea): Promise<number[]> {
	for (const id of row.dragoniteScheduleIds ?? []) {
		await deleteDragoniteSchedule(id); // 404-tolerated
	}
	if (row.mode !== "scheduled") return [];
	const docs = buildScheduleDocs(row);
	const ids: number[] = [];
	for (const doc of docs) {
		try {
			ids.push(await createDragoniteSchedule(doc));
		} catch (error) {
			if (String(error).includes(" 409") || String(error).includes("already exists")) {
				// stale doc with our name from a crashed run — sweep and retry once
				const stale = await listDragoniteSchedulesByPrefix(`${SCHEDULE_PREFIX}${row.id}_`);
				for (const s of stale) await deleteDragoniteSchedule(s.id);
				ids.push(await createDragoniteSchedule(doc));
			} else {
				throw error;
			}
		}
	}
	return ids;
}

/** Occupancy check across all the user's areas with one area's pending state overridden. */
async function assertAllotment(
	userId: string,
	allotment: number,
	overrideId: number,
	override: Partial<{
		workers: number;
		active: boolean;
		mode: ScanAreaMode;
		schedule: AreaSchedule | null;
	}>
): Promise<void> {
	if (allotment === -1) return;
	const areas = await getScanAreas(userId);
	const result = validateAllotment(toOccupancySources(areas, overrideId, override), allotment);
	if (!result.ok) {
		const { conflict } = result;
		const when =
			conflict.at.type === "weekly"
				? `${conflict.at.day} ${conflict.at.time}`
				: `${conflict.at.date} ${conflict.at.time}`;
		throw new ScanAreaError(
			"schedule_overlap",
			409,
			`Needs ${conflict.load} workers at ${when} (ET) but your allotment is ${conflict.allotment} — overlapping: ${conflict.areas.join(", ")}`,
			{ ...conflict.at, load: conflict.load, total: conflict.allotment, areas: conflict.areas }
		);
	}
}

export async function createScanArea(
	userId: string,
	input: { name: string; geofence: Polygon; workers: number }
): Promise<ScanArea> {
	const { maxAreaSqM } = getScanAreaLimits();
	const geometry = validatePolygonGeometry(input.geofence, maxAreaSqM);
	if (!geometry.ok) throw new ScanAreaError(geometry.code, 400, geometry.error);

	let row: ScanArea;
	try {
		row = await insertScanArea({
			userId,
			name: input.name,
			geofence: input.geofence,
			areaSqM: geometry.areaSqM,
			workers: input.workers
		});
	} catch (error) {
		if (isDuplicateKeyError(error)) {
			throw new ScanAreaError("name_taken", 409, "You already have a scan area with that name");
		}
		throw error;
	}

	// mirror-all: create the permanent Dragonite area now (0 workers); on
	// failure the row survives with a null id and reconciliation heals it
	try {
		await ensureDragoniteArea(row);
	} catch (error) {
		log.warning(`Dragonite area creation deferred for scan area ${row.id}: ${error}`);
	}
	return (await getScanArea(userId, row.id))!;
}

export async function activateScanArea(
	userId: string,
	id: number,
	allotment: number
): Promise<ScanArea> {
	return withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);
		if (row.mode !== "manual") {
			throw new ScanAreaError(
				"invalid_mode",
				409,
				"This area is schedule-controlled — switch it to manual mode to toggle it"
			);
		}
		if (row.active) return row;

		await assertAllotment(userId, allotment, id, { active: true });

		try {
			const areaId = await ensureDragoniteArea(row);
			await patchDragoniteArea(areaId, buildModes(row.workers, row.workers));
			bestEffortReload();
		} catch (error) {
			throw dragoniteUnavailable(error);
		}

		await updateScanAreaRow(userId, id, { active: true });
		return { ...row, active: true };
	});
}

export async function deactivateScanArea(userId: string, id: number): Promise<ScanArea> {
	return withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);
		if (!row.active) return row;

		if (row.dragoniteAreaId != null) {
			try {
				await patchDragoniteArea(row.dragoniteAreaId, buildModes(0, row.workers));
				bestEffortReload();
			} catch (error) {
				if (String(error).includes(" 404")) {
					// area vanished from Dragonite — null the id, reconciliation recreates
					await updateScanAreaRow(userId, id, { dragoniteAreaId: null });
					row.dragoniteAreaId = null;
				} else {
					throw dragoniteUnavailable(error);
				}
			}
		}

		await updateScanAreaRow(userId, id, { active: false });
		return { ...row, active: false };
	});
}

export async function updateScanArea(
	userId: string,
	id: number,
	patch: { name?: string; geofence?: Polygon; workers?: number },
	allotment: number
): Promise<ScanArea> {
	return withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);
		const dbPatch: Partial<Pick<ScanArea, "name" | "geofence" | "areaSqM" | "workers">> = {};

		if (patch.geofence) {
			const { maxAreaSqM } = getScanAreaLimits();
			const geometry = validatePolygonGeometry(patch.geofence, maxAreaSqM);
			if (!geometry.ok) throw new ScanAreaError(geometry.code, 400, geometry.error);
			dbPatch.geofence = patch.geofence;
			dbPatch.areaSqM = geometry.areaSqM;
		}

		if (patch.workers !== undefined && patch.workers !== row.workers) {
			await assertAllotment(userId, allotment, id, { workers: patch.workers });
			dbPatch.workers = patch.workers;
		}

		if (patch.name !== undefined && patch.name !== row.name) {
			dbPatch.name = patch.name;
		}

		if (row.dragoniteAreaId != null && Object.keys(dbPatch).length > 0) {
			const updated = { ...row, ...dbPatch };
			const dragonitePatch: ApiAreaV2 = {};
			if (dbPatch.geofence) {
				dragonitePatch.geofence = { type: "Feature", properties: {}, geometry: dbPatch.geofence };
			}
			if (dbPatch.workers !== undefined) {
				Object.assign(dragonitePatch, buildModes(baselineWorkers(updated), updated.workers));
			}
			if (dbPatch.name) {
				dragonitePatch.name = dragoniteName(row.id, dbPatch.name);
			}

			try {
				await patchDragoniteArea(row.dragoniteAreaId, dragonitePatch);
			} catch (error) {
				if (String(error).includes(" 404")) {
					log.warning(
						`Dragonite area ${row.dragoniteAreaId} for scan area ${row.id} is gone, clearing ids`
					);
					await updateScanAreaRow(userId, id, {
						dragoniteAreaId: null,
						dragoniteScheduleIds: null,
						...(row.mode === "manual" ? { active: false } : {})
					});
					row.dragoniteAreaId = null;
					row.dragoniteScheduleIds = null;
					if (row.mode === "manual") row.active = false;
				} else {
					throw dragoniteUnavailable(error);
				}
			}

			if (dbPatch.geofence && row.dragoniteAreaId != null) {
				try {
					await recalculatePokemonRoute(row.dragoniteAreaId);
					bestEffortReload();
				} catch (error) {
					log.warning(`Route recalculation failed for area ${row.id}: ${error}`);
				}
			}
		}

		try {
			await updateScanAreaRow(userId, id, dbPatch);
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new ScanAreaError("name_taken", 409, "You already have a scan area with that name");
			}
			throw error;
		}
		const updated = { ...row, ...dbPatch };

		// rename changes the Dragonite area name that schedules target by;
		// workers change the scale value — rebuild docs in both cases
		if (row.mode === "scheduled" && (dbPatch.name !== undefined || dbPatch.workers !== undefined)) {
			try {
				const ids = await rebuildDragoniteSchedules(updated);
				await updateScanAreaRow(userId, id, { dragoniteScheduleIds: ids });
				updated.dragoniteScheduleIds = ids;
			} catch (error) {
				log.warning(`Schedule rebuild failed for area ${row.id}: ${error}`);
			}
		}
		return updated;
	});
}

export async function setScanAreaMode(
	userId: string,
	id: number,
	mode: ScanAreaMode,
	allotment: number
): Promise<ScanArea> {
	return withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);
		if (row.mode === mode) return row;

		if (mode === "scheduled") {
			await assertAllotment(userId, allotment, id, {
				mode: "scheduled",
				active: false,
				schedule: row.schedule ?? null
			});
			try {
				const areaId = await ensureDragoniteArea(row);
				await patchDragoniteArea(areaId, buildModes(0, row.workers));
				const ids = await rebuildDragoniteSchedules({ ...row, mode: "scheduled" });
				await updateScanAreaRow(userId, id, {
					mode: "scheduled",
					active: false,
					dragoniteScheduleIds: ids
				});
				bestEffortReload();
				return { ...row, mode: "scheduled" as const, active: false, dragoniteScheduleIds: ids };
			} catch (error) {
				if (error instanceof ScanAreaError) throw error;
				throw dragoniteUnavailable(error);
			}
		}

		// -> manual: drop all schedule docs; area stays at 0 workers until toggled on
		try {
			await rebuildDragoniteSchedules({ ...row, mode: "manual" });
		} catch (error) {
			log.warning(`Schedule cleanup failed for area ${row.id}: ${error}`);
		}
		await updateScanAreaRow(userId, id, {
			mode: "manual",
			active: false,
			dragoniteScheduleIds: []
		});
		return { ...row, mode: "manual" as const, active: false, dragoniteScheduleIds: [] };
	});
}

export async function setScanAreaSchedule(
	userId: string,
	id: number,
	schedule: AreaSchedule,
	allotment: number
): Promise<ScanArea> {
	return withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);

		try {
			new Intl.DateTimeFormat("en-US", { timeZone: schedule.tz });
		} catch {
			throw new ScanAreaError("invalid_schedule", 400, `Unknown timezone: ${schedule.tz}`);
		}

		const selfOverlap = findIntraAreaOverlap(schedule);
		if (selfOverlap) {
			throw new ScanAreaError(
				"invalid_schedule",
				400,
				`This area's own windows overlap: ${selfOverlap.a} and ${selfOverlap.b}`
			);
		}

		// for manual-mode rows the schedule occupies nothing until the mode switch
		// (setScanAreaMode re-validates); for scheduled rows this checks the new windows
		await assertAllotment(userId, allotment, id, { schedule });

		await updateScanAreaRow(userId, id, { schedule });
		const updated = { ...row, schedule };

		if (row.mode === "scheduled") {
			try {
				await ensureDragoniteArea(updated);
				const ids = await rebuildDragoniteSchedules(updated);
				await updateScanAreaRow(userId, id, { dragoniteScheduleIds: ids });
				updated.dragoniteScheduleIds = ids;
			} catch (error) {
				throw dragoniteUnavailable(error);
			}
		}
		return updated;
	});
}

export async function deleteScanArea(userId: string, id: number): Promise<void> {
	await withUserLock(userId, async () => {
		const row = await requireScanArea(userId, id);
		try {
			for (const scheduleId of row.dragoniteScheduleIds ?? []) {
				await deleteDragoniteSchedule(scheduleId);
			}
			if (row.dragoniteAreaId != null) {
				await deleteDragoniteArea(row.dragoniteAreaId);
			}
		} catch (error) {
			throw dragoniteUnavailable(error);
		}
		await deleteScanAreaRow(userId, id);
	});
}

export async function startQuestScan(userId: string, id: number): Promise<void> {
	const row = await requireScanArea(userId, id);
	const occupies = (row.mode === "manual" && row.active) || row.mode === "scheduled";
	if (!occupies || row.dragoniteAreaId == null) {
		throw new ScanAreaError(
			"not_active",
			409,
			"Scan area must be active or scheduled to scan quests"
		);
	}
	try {
		await startDragoniteQuestScan(row.dragoniteAreaId);
	} catch (error) {
		throw dragoniteUnavailable(error);
	}
}

/**
 * Repair drift between the internal DB and Dragonite (mirror-all lifecycle):
 * - vtscan_ areas in Dragonite with no matching DB row are deleted
 * - DB rows without a live Dragonite area get one created (this also migrates
 *   rows from the old create-on-activate lifecycle on first boot)
 * - vtsched_ docs with no matching scheduled row are deleted
 * - scheduled rows whose docs are missing get them rebuilt
 * Never throws — intended as fire-and-forget on server start.
 */
export async function reconcileScanAreas(): Promise<void> {
	try {
		const [remoteAreas, remoteSchedules, rows] = await Promise.all([
			listDragoniteAreasByPrefix(SCAN_AREA_PREFIX),
			listDragoniteSchedulesByPrefix(SCHEDULE_PREFIX),
			getAllScanAreas()
		]);

		const rowById = new Map(rows.map((row) => [row.id, row]));
		const linkedAreaIds = new Set(
			rows.map((row) => row.dragoniteAreaId).filter((id): id is number => id != null)
		);
		const remoteAreaIds = new Set(remoteAreas.map((area) => area.id));

		// 1. Dragonite areas with no matching row (check both the stored link and
		//    the dbId embedded in the name, so rows mid-heal aren't clobbered)
		for (const area of remoteAreas) {
			if (linkedAreaIds.has(area.id)) continue;
			const embeddedId = Number(area.name.slice(SCAN_AREA_PREFIX.length).split("_")[0]);
			if (rowById.has(embeddedId)) continue;
			log.warning(`Deleting orphaned Dragonite area ${area.id} (${area.name})`);
			await deleteDragoniteArea(area.id);
		}

		// 2. rows without a live Dragonite area → create (mirror-all migration)
		for (const row of rows) {
			if (row.dragoniteAreaId != null && remoteAreaIds.has(row.dragoniteAreaId)) continue;
			try {
				row.dragoniteAreaId = null;
				await ensureDragoniteArea(row);
				if (baselineWorkers(row) > 0 && row.dragoniteAreaId != null) {
					await patchDragoniteArea(row.dragoniteAreaId, buildModes(row.workers, row.workers));
				}
			} catch (error) {
				log.warning(`Reconciliation could not create Dragonite area for row ${row.id}: ${error}`);
			}
		}

		// 3. vtsched_ docs that shouldn't exist
		for (const schedule of remoteSchedules) {
			const embeddedId = Number(schedule.name.slice(SCHEDULE_PREFIX.length).split("_")[0]);
			const row = rowById.get(embeddedId);
			const expected =
				row?.mode === "scheduled" && (row.dragoniteScheduleIds ?? []).includes(schedule.id);
			if (!expected) {
				log.warning(`Deleting orphaned Dragonite schedule ${schedule.id} (${schedule.name})`);
				await deleteDragoniteSchedule(schedule.id);
			}
		}

		// 4. scheduled rows missing docs → rebuild
		const remoteScheduleIds = new Set(remoteSchedules.map((s) => s.id));
		for (const row of rows) {
			if (row.mode !== "scheduled" || !row.schedule) continue;
			const ids = row.dragoniteScheduleIds ?? [];
			const expectedDocs = buildScheduleDocs(row).length;
			const allPresent =
				ids.length === expectedDocs && ids.every((id) => remoteScheduleIds.has(id));
			if (allPresent) continue;
			try {
				const newIds = await rebuildDragoniteSchedules(row);
				await updateScanAreaRow(row.userId, row.id, { dragoniteScheduleIds: newIds });
			} catch (error) {
				log.warning(`Reconciliation could not rebuild schedules for row ${row.id}: ${error}`);
			}
		}
	} catch (error) {
		log.warning(`Scan area reconciliation skipped: ${error}`);
	}
}
