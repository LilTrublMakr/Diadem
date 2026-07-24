import { REFRESH_SHINY_RATE } from "@/lib/constants";
import type { ShinyRate } from "@/lib/features/notifications/shinyRateFormat";
import { queryStats } from "@/lib/server/db/stats";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getLogger } from "@/lib/utils/logger";
import { getNormalizedForm } from "@/lib/utils/pokemonUtils";

const log = getLogger("q:shinyrate");

type SummaryRow = {
	pokemon_id: number;
	form: number;
	shiny_count: string;
	total_count: string;
};

class ShinyRateProvider extends BaseDataProvider<Map<string, ShinyRate>> {
	constructor() {
		super(REFRESH_SHINY_RATE);
	}

	protected async query(): Promise<Map<string, ShinyRate>> {
		log.info("Updating all-time shiny rates");
		const rows = await queryStats<SummaryRow[]>(
			"SELECT pokemon_id, form, shiny_count, total_count FROM pokemon_summary WHERE time_slot = 'all'"
		);

		const rates = new Map<string, ShinyRate>();
		for (const row of rows) {
			const form = getNormalizedForm(row.pokemon_id, row.form);
			rates.set(`${row.pokemon_id}-${form}`, {
				shiny: Number(row.shiny_count),
				total: Number(row.total_count)
			});
		}

		log.info("Updated all-time shiny rates");
		return rates;
	}
}

export const shinyRateProvider = new ShinyRateProvider();

export async function getShinyRate(pokemonId: number, form: number): Promise<ShinyRate | null> {
	const rates = await shinyRateProvider.get();
	return rates.get(`${pokemonId}-${form}`) ?? null;
}
