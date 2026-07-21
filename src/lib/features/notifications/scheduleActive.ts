import { DAY_TOKENS, type DayToken, type NotificationSchedule } from "./scheduleTypes";

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

const WEEKDAY_TOKENS: Record<string, DayToken> = {
	Mon: "mon",
	Tue: "tue",
	Wed: "wed",
	Thu: "thu",
	Fri: "fri",
	Sat: "sat",
	Sun: "sun"
};

/** `now`'s local weekday/minute-of-day/calendar-date in `tz`. */
function localParts(tz: string, now: Date): { day: DayToken; minute: number; date: string } {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		weekday: "short"
	}).formatToParts(now);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
	// Intl formats midnight as hour "24" in some environments with hour12:false
	const hour = Number(get("hour")) % 24;
	const minute = Number(get("minute"));
	return {
		day: WEEKDAY_TOKENS[get("weekday")] ?? "mon",
		minute: hour * 60 + minute,
		date: `${get("year")}-${get("month")}-${get("day")}`
	};
}

function shiftDateString(date: string, dayOffset: number): string {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d + dayOffset)).toISOString().slice(0, 10);
}

function isInAnyWindow(schedule: NotificationSchedule, now: Date): boolean {
	const { day, minute, date } = localParts(schedule.tz, now);
	const yesterday = DAY_TOKENS[(DAY_TOKENS.indexOf(day) + 6) % 7];
	const yesterdayDate = shiftDateString(date, -1);

	for (const window of schedule.weekly) {
		const duration = windowDuration(window.start, window.end);
		if (window.days.includes(day)) {
			const start = toMinutes(window.start);
			if (minute >= start && minute < start + duration) return true;
		}
		if (window.days.includes(yesterday)) {
			const start = toMinutes(window.start) - 1440;
			if (minute >= start && minute < start + duration) return true;
		}
	}

	for (const window of schedule.dated) {
		const duration = windowDuration(window.start, window.end);
		if (window.date === date) {
			const start = toMinutes(window.start);
			if (minute >= start && minute < start + duration) return true;
		}
		if (window.date === yesterdayDate) {
			const start = toMinutes(window.start) - 1440;
			if (minute >= start && minute < start + duration) return true;
		}
	}

	return false;
}

/**
 * Whether `schedule` is active at `now`. Unlike scan-areas' schedules, notification schedules
 * are never conflict-checked against each other — overlapping windows (within one schedule, or
 * across a user's subscriptions) are fine, since there's no shared worker allotment at stake.
 *
 * `schedule.invert` flips the meaning of the windows: active everywhere EXCEPT them (e.g. "off
 * M-F 9-6, on the rest of the time") instead of active only inside them.
 */
export function isScheduleActiveNow(schedule: NotificationSchedule, now = new Date()): boolean {
	const inWindow = isInAnyWindow(schedule, now);
	return schedule.invert ? !inWindow : inWindow;
}
