import { REFRESH_SHINY_RATE } from "@/lib/constants";
import { queryStats } from "@/lib/server/db/stats";
import { masterfileProvider } from "@/lib/server/provider/masterfileProvider";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
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

type SummaryRow = {
	pokemon_id: number;
	form: number;
	time_slot: string;
	shiny_count: string;
	total_count: string;
};

type Counts = { shiny: number; total: number };

class ShinyOddsProvider extends BaseDataProvider<Map<string, number | null>> {
	constructor() {
		super(REFRESH_SHINY_RATE);
	}

	protected async query(): Promise<Map<string, number | null>> {
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

		const odds = new Map<string, number | null>();
		for (const [key, all] of allTime) {
			if (all.shiny === 0 && all.total >= LOCKED_MIN_TOTAL) {
				odds.set(key, null);
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
			odds.set(key, best);
		}

		log.info("Updated shiny odds for %d species/forms", odds.size);
		return odds;
	}
}

export const shinyOddsProvider = new ShinyOddsProvider();

/** Current 1/N shiny odds for a species+form; null = looks shiny-locked. */
export async function getShinyOdds(pokemonId: number, form: number): Promise<number | null> {
	const odds = await shinyOddsProvider.get();
	const value = odds.get(`${pokemonId}-${getNormalizedForm(pokemonId, form)}`);
	return value === undefined ? DEFAULT_ODDS : value;
}
