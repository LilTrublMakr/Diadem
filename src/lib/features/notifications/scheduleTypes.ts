// Same shape as scan-areas' AreaSchedule (src/lib/features/scanAreas/scheduleTypes.ts) but kept
// as its own copy — notifications have no allotment to protect, so schedules here are allowed to
// overlap freely (see scheduleActive.ts), unlike scan-areas' conflict-checked schedules.
export const DAY_TOKENS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayToken = (typeof DAY_TOKENS)[number];

// "HH:MM" times; end <= start means the window wraps past midnight; "24:00" allowed as end
export type WeeklyWindow = { days: DayToken[]; start: string; end: string };
// One-off calendar date ("YYYY-MM-DD") with a time window on that date
export type DatedWindow = { date: string; start: string; end: string };

export type NotificationSchedule = {
	tz: string; // IANA timezone the times were entered in (from the user's browser)
	weekly: WeeklyWindow[];
	dated: DatedWindow[];
	// false/undefined (default): active only inside these windows.
	// true: active everywhere EXCEPT these windows (e.g. "off M-F 9-6, on otherwise").
	invert?: boolean;
};

export type SubscriptionMode = "manual" | "scheduled";
