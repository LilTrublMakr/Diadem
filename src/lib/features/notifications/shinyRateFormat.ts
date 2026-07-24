export type ShinyRate = { shiny: number; total: number };

export type FormattedShinyRate = {
	percent: string; // "4.8%" or "?" if there's no data at all for this species
	fraction: string; // "8/166" or "?"
	reduced: string; // "~1 in 21", "—" if never shiny, or "?" if there's no data
};

/**
 * Formats a species' all-time shiny rate (pokemon_summary, time_slot='all') three ways for
 * templates. Shared between render.ts (real data) and testData.ts (preview) so both agree on
 * what "no data" vs "never shiny" actually look like.
 */
export function formatShinyRate(rate: ShinyRate | null): FormattedShinyRate {
	if (!rate || rate.total === 0) {
		return { percent: "?", fraction: "?", reduced: "?" };
	}

	const { shiny, total } = rate;
	return {
		percent: `${((shiny / total) * 100).toFixed(1)}%`,
		fraction: `${shiny}/${total}`,
		reduced: shiny > 0 ? `~1 in ${Math.round(total / shiny)}` : "—"
	};
}
