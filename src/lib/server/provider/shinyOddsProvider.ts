import { REFRESH_SHINY_RATE } from "@/lib/constants";
import { queryStats } from "@/lib/server/db/stats";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";

const log = getLogger("q:shinyodds");

// Known wild shiny odds (1/N) with a prior weight each — 1/512 is the overwhelming default, so a
// handful of lucky scanner shinies on a small sample doesn't flip a species to "boosted".
const ODDS_PRIORS: [odds: number, logPrior: number][] = [
	[512, Math.log(0.85)],
	[128, Math.log(0.07)],
	[64, Math.log(0.04)],
	[25, Math.log(0.03)],
	[10, Math.log(0.01)]
];
export const DEFAULT_ODDS = 512;
// All-time encounters with zero shinies at/above this = treat as shiny-locked (not yet released).
const LOCKED_MIN_TOTAL = 2000;
const COMMUNITY_DAY_ODDS = 25;
const EVENTS_URL =
	"https://raw.githubusercontent.com/bigfoott/ScrapedDuck/refs/heads/data/events.json";

type SummaryRow = {
	pokemon_id: number;
	form: number;
	time_slot: string;
	shiny_count: string;
	total_count: string;
};

type Counts = { shiny: number; total: number };

// A forced 1/N for one species between two instants (epoch ms, ±Infinity = open-ended)
type OddsWindow = { pokemonId: number; odds: number; start: number; end: number };

export type ShinyOddsTable = {
	estimated: Map<string, number | null>; // `${pokemonId}-${normalizedForm}` → 1/N, null = locked
	windows: OddsWindow[]; // later entries win
};

type ScrapedDuckEvent = {
	eventType: string;
	name: string;
	start: string;
	end: string;
	extraData?: { communityday?: { spawns?: { name: string; image: string }[] } };
};

/** Epoch ms for an ISO-ish time; without an explicit offset it's wall-clock time in `timeZone`. */
function parseEventTime(value: string, timeZone: string | undefined): number {
	if (!timeZone || /(?:z|[+-]\d\d:?\d\d)$/i.test(value)) return Date.parse(value);
	const asUtc = Date.parse(value.replace(" ", "T") + "Z");
	const offsetAt = (instant: number) => {
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat("en-US", {
				timeZone,
				hourCycle: "h23",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit"
			})
				.formatToParts(instant)
				.map((p) => [p.type, Number(p.value)])
		);
		return (
			Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
			Math.floor(instant / 1000) * 1000
		);
	};
	// Two passes so a time right after a DST switch resolves with the right offset
	const guess = asUtc - offsetAt(asUtc);
	return asUtc - offsetAt(guess);
}

let lastCommunityDays: OddsWindow[] = [];

// Community Day = 1/25 for its featured spawns, straight from the ScrapedDuck feed the events
// page already uses. Its times are local wall-clock time, read in [server] shinyEventTimezone.
async function fetchCommunityDayWindows(timeZone: string | undefined): Promise<OddsWindow[]> {
	try {
		const res = await fetch(EVENTS_URL);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const events: ScrapedDuckEvent[] = await res.json();
		lastCommunityDays = events
			.filter((e) => e.eventType === "community-day")
			.flatMap((e) =>
				(e.extraData?.communityday?.spawns ?? []).flatMap((spawn) => {
					// Icons are named like pm570.icon.png / pm570.fHISUIAN.icon.png
					const pokemonId = Number(/pm(\d+)\./.exec(spawn.image)?.[1]);
					if (!pokemonId) return [];
					return [
						{
							pokemonId,
							odds: COMMUNITY_DAY_ODDS,
							start: parseEventTime(e.start, timeZone),
							end: parseEventTime(e.end, timeZone)
						}
					];
				})
			);
	} catch (e) {
		log.warning("Couldn't refresh Community Day schedule, keeping the last one: %s", e);
	}
	return lastCommunityDays;
}

function configuredWindows(timeZone: string | undefined): OddsWindow[] {
	const overrides = getServerConfig().shinyOddsOverrides;
	if (!overrides) return [];
	// Table form ({ 570 = 25 }) = always on; array form = optionally scheduled
	if (!Array.isArray(overrides)) {
		return Object.entries(overrides).map(([id, odds]) => ({
			pokemonId: Number(id),
			odds,
			start: -Infinity,
			end: Infinity
		}));
	}
	return overrides.map((o) => ({
		pokemonId: o.pokemon,
		odds: o.odds,
		start: o.start ? parseEventTime(String(o.start), timeZone) : -Infinity,
		end: o.end ? parseEventTime(String(o.end), timeZone) : Infinity
	}));
}

class ShinyOddsProvider extends BaseDataProvider<ShinyOddsTable> {
	constructor() {
		super(REFRESH_SHINY_RATE);
	}

	protected async query(): Promise<ShinyOddsTable> {
		await masterfileProvider.get();
		const rows = await queryStats<SummaryRow[]>(
			"SELECT pokemon_id, form, time_slot, shiny_count, total_count FROM pokemon_summary WHERE time_slot IN ('1d', 'all')"
		);

		// Several raw forms can normalize to one key, so sum rather than overwrite
		const recent = new Map<string, Counts>();
		const allTime = new Map<string, Counts>();
		for (const row of rows) {
			const key = `${row.pokemon_id}-${getNormalizedForm(row.pokemon_id, row.form)}`;
			const bucket = row.time_slot === "1d" ? recent : allTime;
			const counts = bucket.get(key) ?? { shiny: 0, total: 0 };
			counts.shiny += Number(row.shiny_count);
			counts.total += Number(row.total_count);
			bucket.set(key, counts);
		}

		const estimated = new Map<string, number | null>();
		for (const [key, all] of allTime) {
			if (all.shiny === 0 && all.total >= LOCKED_MIN_TOTAL) {
				estimated.set(key, null);
				continue;
			}
			// Maximum a-posteriori over the known odds, from the last 24h only — events change
			// odds for a few days at a time, so all-time counts would drown them out
			const { shiny, total } = recent.get(key) ?? { shiny: 0, total: 0 };
			let best = DEFAULT_ODDS;
			let bestScore = -Infinity;
			for (const [n, logPrior] of ODDS_PRIORS) {
				const score = shiny * Math.log(1 / n) + (total - shiny) * Math.log(1 - 1 / n) + logPrior;
				if (score > bestScore) [best, bestScore] = [n, score];
			}
			estimated.set(key, best);
		}

		const config = getServerConfig();
		const windows = [
			...(config.shinyAutoCommunityDay === false
				? []
				: await fetchCommunityDayWindows(config.shinyEventTimezone)),
			...configuredWindows(config.shinyEventTimezone) // config wins over the feed
		];

		log.info(
			"Updated shiny odds for %d species/forms, %d scheduled overrides",
			estimated.size,
			windows.length
		);
		return { estimated, windows };
	}
}

export const shinyOddsProvider = new ShinyOddsProvider();

/**
 * 1/N odds for a species+form (form already normalized) from a loaded odds table; null = looks
 * shiny-locked. An active scheduled override (Community Day feed, or [server.shinyOddsOverrides])
 * wins over the 24h-stats estimate, which lags the first hour or more of a boost.
 */
export function lookupShinyOdds(
	table: ShinyOddsTable,
	pokemonId: number,
	form: number
): number | null {
	const now = Date.now();
	const override = table.windows.findLast(
		(w) => w.pokemonId === pokemonId && w.start <= now && now < w.end
	);
	if (override) return override.odds;
	const value = table.estimated.get(`${pokemonId}-${form}`);
	return value === undefined ? DEFAULT_ODDS : value;
}

export async function getShinyOdds(pokemonId: number, form: number): Promise<number | null> {
	return lookupShinyOdds(
		await shinyOddsProvider.get(),
		pokemonId,
		getNormalizedForm(pokemonId, form)
	);
}
