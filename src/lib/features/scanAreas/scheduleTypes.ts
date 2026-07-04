export const DAY_TOKENS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayToken = (typeof DAY_TOKENS)[number];

// "HH:MM" times; end <= start means the window wraps past midnight; "24:00" allowed as end
export type WeeklyWindow = { days: DayToken[]; start: string; end: string };
// One-off calendar date ("YYYY-MM-DD") with a time window on that date
export type DatedWindow = { date: string; start: string; end: string };

export type AreaSchedule = {
	tz: string; // IANA timezone the times were entered in (from the user's browser)
	weekly: WeeklyWindow[];
	dated: DatedWindow[];
};

export type ScanAreaMode = "manual" | "scheduled";
