import { type AreaSchedule, DAY_TOKENS, type DayToken } from "./scheduleTypes";

export const AREA_TZ = "America/New_York";

const WEEK_MINUTES = 7 * 1440;

export type OccupancySource =
	| { areaId: number; name: string; workers: number; kind: "always" }
	| { areaId: number; name: string; workers: number; kind: "scheduled"; schedule: AreaSchedule }
	| { areaId: number; name: string; workers: number; kind: "none" };

export type OverlapConflict = {
	load: number;
	allotment: number;
	at:
		| { type: "weekly"; day: DayToken; time: string }
		| { type: "dated"; date: string; time: string };
	areas: string[];
};

type Interval = { start: number; end: number }; // half-open [start, end)
type WeightedInterval = Interval & { areaId: number; name: string; workers: number };

/** Minutes east of UTC for `tz` at instant `at`. */
export function tzOffsetMinutes(tz: string, at: Date): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit"
	}).formatToParts(at);
	const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	// Intl formats midnight as hour "24" in some environments with hour12:false
	const hour = get("hour") % 24;
	const asUtc = Date.UTC(
		get("year"),
		get("month") - 1,
		get("day"),
		hour,
		get("minute"),
		get("second")
	);
	return Math.round((asUtc - at.getTime()) / 60000);
}

function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

/** Window duration in minutes; end <= start wraps past midnight; "24:00" = 1440. */
function windowDuration(start: string, end: string): number {
	const s = toMinutes(start);
	const e = toMinutes(end);
	return e <= s ? e - s + 1440 : e - s;
}

function minutesToTime(minutes: number): string {
	const m = ((minutes % 1440) + 1440) % 1440;
	return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Merge a single area's intervals so its own overlapping windows count once. */
function unionIntervals(intervals: Interval[]): Interval[] {
	if (intervals.length <= 1) return intervals;
	const sorted = [...intervals].sort((a, b) => a.start - b.start);
	const merged: Interval[] = [{ ...sorted[0] }];
	for (let i = 1; i < sorted.length; i++) {
		const last = merged[merged.length - 1];
		if (sorted[i].start <= last.end) last.end = Math.max(last.end, sorted[i].end);
		else merged.push({ ...sorted[i] });
	}
	return merged;
}

/** Normalize an interval into [0, span) with wrap-around splitting. */
function normalizeWrap(start: number, end: number, span: number): Interval[] {
	const s = ((start % span) + span) % span;
	const e = s + (end - start);
	if (e <= span) return [{ start: s, end: e }];
	return [
		{ start: s, end: span },
		{ start: 0, end: e - span }
	];
}

/**
 * Weighted sweep-line over half-open intervals. Returns the first instant where
 * the summed weight exceeds `allotment`, or null.
 */
function sweep(
	intervals: WeightedInterval[],
	allotment: number
): { at: number; load: number; areas: string[] } | null {
	const events: { t: number; delta: number }[] = [];
	for (const iv of intervals) {
		if (iv.end <= iv.start) continue;
		events.push({ t: iv.start, delta: iv.workers });
		events.push({ t: iv.end, delta: -iv.workers });
	}
	// removals before additions at equal t => back-to-back windows never double-count
	events.sort((a, b) => a.t - b.t || a.delta - b.delta);

	let load = 0;
	for (const event of events) {
		load += event.delta;
		if (event.delta > 0 && load > allotment) {
			const areas = intervals
				.filter((iv) => iv.start <= event.t && event.t < iv.end)
				.map((iv) => iv.name);
			return { at: event.t, load, areas: [...new Set(areas)] };
		}
	}
	return null;
}

/**
 * Weekly-timeline intervals (minutes since Monday 00:00 in AREA_TZ) for one source.
 * `tzDelta` = source-tz offset minus AREA_TZ offset, in minutes.
 */
function weeklyIntervals(source: OccupancySource, tzDelta: number): Interval[] {
	if (source.kind === "always") return [{ start: 0, end: WEEK_MINUTES }];
	if (source.kind !== "scheduled") return [];
	const intervals: Interval[] = [];
	for (const window of source.schedule.weekly) {
		const duration = windowDuration(window.start, window.end);
		for (const day of window.days) {
			const startLocal = DAY_TOKENS.indexOf(day) * 1440 + toMinutes(window.start);
			intervals.push(
				...normalizeWrap(startLocal - tzDelta, startLocal - tzDelta + duration, WEEK_MINUTES)
			);
		}
	}
	return unionIntervals(intervals);
}

function sourceTzDelta(source: OccupancySource, at: Date): number {
	if (source.kind !== "scheduled") return 0;
	return tzOffsetMinutes(source.schedule.tz, at) - tzOffsetMinutes(AREA_TZ, at);
}

/** Local calendar date + weekday of `dateStr` shifted by `dayOffset` days. */
function shiftDate(dateStr: string, dayOffset: number): { date: string; day: DayToken } {
	const [y, m, d] = dateStr.split("-").map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + dayOffset, 12));
	const day = DAY_TOKENS[(dt.getUTCDay() + 6) % 7]; // JS: 0=Sun → our 0=Mon
	const iso = dt.toISOString().slice(0, 10);
	return { date: iso, day };
}

/** Representative instant (noon ET) of a calendar date, for per-date DST offsets. */
function dateNoonUtc(dateStr: string): Date {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d, 16)); // ~noon ET
}

/**
 * Intervals on a 2-day timeline [0, 2880) anchored at `date` 00:00 AREA_TZ,
 * covering spill-in from the previous day and spill-out into the next.
 */
function datedDayIntervals(source: OccupancySource, date: string): Interval[] {
	if (source.kind === "always") return [{ start: 0, end: 2880 }];
	if (source.kind !== "scheduled") return [];

	const tzDelta = sourceTzDelta(source, dateNoonUtc(date));
	const intervals: Interval[] = [];

	const addWindow = (dayAnchor: number, start: string, end: string) => {
		const s = dayAnchor + toMinutes(start) - tzDelta;
		const e = s + windowDuration(start, end);
		const clippedStart = Math.max(0, s);
		const clippedEnd = Math.min(2880, e);
		if (clippedEnd > clippedStart) intervals.push({ start: clippedStart, end: clippedEnd });
	};

	const today = shiftDate(date, 0);
	const yesterday = shiftDate(date, -1);

	for (const window of source.schedule.weekly) {
		for (const day of window.days) {
			if (day === today.day) addWindow(0, window.start, window.end);
			if (day === yesterday.day) addWindow(-1440, window.start, window.end);
		}
	}
	for (const window of source.schedule.dated) {
		if (window.date === today.date) addWindow(0, window.start, window.end);
		if (window.date === yesterday.date) addWindow(-1440, window.start, window.end);
	}
	return unionIntervals(intervals);
}

function weight(intervals: Interval[], source: OccupancySource): WeightedInterval[] {
	return intervals.map((iv) => ({
		...iv,
		areaId: source.areaId,
		name: source.name,
		workers: source.workers
	}));
}

/**
 * Check that at no instant the summed workers of overlapping occupancy exceed
 * `allotment`. Callers skip this entirely for unlimited (-1) allotments.
 */
export function validateAllotment(
	sources: OccupancySource[],
	allotment: number
): { ok: true } | { ok: false; conflict: OverlapConflict } {
	const now = new Date();

	// Weekly pass
	const weeklyWeighted = sources.flatMap((source) =>
		weight(weeklyIntervals(source, sourceTzDelta(source, now)), source)
	);
	const weeklyHit = sweep(weeklyWeighted, allotment);
	if (weeklyHit) {
		return {
			ok: false,
			conflict: {
				load: weeklyHit.load,
				allotment,
				at: {
					type: "weekly",
					day: DAY_TOKENS[Math.floor(weeklyHit.at / 1440) % 7],
					time: minutesToTime(weeklyHit.at)
				},
				areas: weeklyHit.areas
			}
		};
	}

	// Dated pass: every date any source mentions, plus the following day for spill
	const dates = new Set<string>();
	for (const source of sources) {
		if (source.kind !== "scheduled") continue;
		for (const window of source.schedule.dated) {
			dates.add(window.date);
			dates.add(shiftDate(window.date, 1).date);
		}
	}
	for (const date of dates) {
		const weighted = sources.flatMap((source) => weight(datedDayIntervals(source, date), source));
		const hit = sweep(weighted, allotment);
		if (hit) {
			const dayOffset = hit.at >= 1440 ? 1 : 0;
			return {
				ok: false,
				conflict: {
					load: hit.load,
					allotment,
					at: {
						type: "dated",
						date: dayOffset ? shiftDate(date, 1).date : date,
						time: minutesToTime(hit.at)
					},
					areas: hit.areas
				}
			};
		}
	}

	return { ok: true };
}

/** Human label for a window, used in intra-area overlap errors. */
function windowLabel(
	window: { start: string; end: string } & ({ days: DayToken[] } | { date: string })
): string {
	const when = "days" in window ? window.days.join("/") : window.date;
	return `${when} ${window.start}–${window.end}`;
}

/**
 * Detect overlapping windows within ONE area's schedule. Required because
 * Dragonite rejects equal-priority same-target overlaps, and it keeps user
 * schedules unambiguous.
 */
export function findIntraAreaOverlap(schedule: AreaSchedule): { a: string; b: string } | null {
	// weekly vs weekly on the weekly timeline
	const weekly: (Interval & { label: string })[] = [];
	for (const window of schedule.weekly) {
		const duration = windowDuration(window.start, window.end);
		for (const day of window.days) {
			const start = DAY_TOKENS.indexOf(day) * 1440 + toMinutes(window.start);
			for (const iv of normalizeWrap(start, start + duration, WEEK_MINUTES)) {
				weekly.push({ ...iv, label: windowLabel(window) });
			}
		}
	}
	weekly.sort((a, b) => a.start - b.start);
	for (let i = 1; i < weekly.length; i++) {
		if (weekly[i].start < weekly[i - 1].end && weekly[i].label !== weekly[i - 1].label) {
			return { a: weekly[i - 1].label, b: weekly[i].label };
		}
		// same-label self overlap (duplicate days in one window) is harmless — union
	}

	// dated vs dated on absolute timelines (minutes since epoch-day * 1440)
	const dated: (Interval & { label: string })[] = [];
	for (const window of schedule.dated) {
		const [y, m, d] = window.date.split("-").map(Number);
		const dayNumber = Date.UTC(y, m - 1, d) / 86400000;
		const start = dayNumber * 1440 + toMinutes(window.start);
		dated.push({
			start,
			end: start + windowDuration(window.start, window.end),
			label: windowLabel(window)
		});
	}
	dated.sort((a, b) => a.start - b.start);
	for (let i = 1; i < dated.length; i++) {
		if (dated[i].start < dated[i - 1].end) {
			return { a: dated[i - 1].label, b: dated[i].label };
		}
	}

	return null;
}

/** Workers in use at instant `now` — powers the allotment meter. */
export function computeInstantUsage(sources: OccupancySource[], now: Date): number {
	let usage = 0;
	for (const source of sources) {
		if (source.kind === "always") {
			usage += source.workers;
			continue;
		}
		if (source.kind !== "scheduled") continue;

		const tzDelta = sourceTzDelta(source, now);
		const etOffset = tzOffsetMinutes(AREA_TZ, now);
		const etNow = new Date(now.getTime() + etOffset * 60000);
		const weekMinute =
			((etNow.getUTCDay() + 6) % 7) * 1440 + etNow.getUTCHours() * 60 + etNow.getUTCMinutes();
		const etDate = etNow.toISOString().slice(0, 10);

		const inWeekly = weeklyIntervals(source, tzDelta).some(
			(iv) => iv.start <= weekMinute && weekMinute < iv.end
		);
		let inDated = false;
		if (!inWeekly) {
			const dayMinute = etNow.getUTCHours() * 60 + etNow.getUTCMinutes();
			for (const window of source.schedule.dated) {
				if (window.date !== etDate && shiftDate(window.date, 1).date !== etDate) continue;
				const anchor = window.date === etDate ? 0 : -1440;
				const s = anchor + toMinutes(window.start) - tzDelta;
				const e = s + windowDuration(window.start, window.end);
				if (s <= dayMinute && dayMinute < e) {
					inDated = true;
					break;
				}
			}
		}
		if (inWeekly || inDated) usage += source.workers;
	}
	return usage;
}

/**
 * Map areas to occupancy sources; `override` replaces the entry for `overrideId`
 * (used to validate a pending mutation before persisting it).
 */
export function toOccupancySources(
	areas: {
		id: number;
		name: string;
		workers: number;
		active: boolean;
		mode: "manual" | "scheduled";
		schedule: AreaSchedule | null;
	}[],
	overrideId?: number,
	override?: Partial<{
		workers: number;
		active: boolean;
		mode: "manual" | "scheduled";
		schedule: AreaSchedule | null;
	}>
): OccupancySource[] {
	return areas.map((area) => {
		const a = area.id === overrideId ? { ...area, ...override } : area;
		const base = { areaId: a.id, name: a.name, workers: a.workers };
		if (a.mode === "manual" && a.active) return { ...base, kind: "always" as const };
		if (a.mode === "scheduled" && a.schedule) {
			return { ...base, kind: "scheduled" as const, schedule: a.schedule };
		}
		return { ...base, kind: "none" as const };
	});
}
