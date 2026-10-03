import { REFRESH_ROCKET_LINEUPS } from "@/lib/constants";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { overwriteRocketLineups } from "@/lib/services/rocketLineups";
import type { RocketLineup } from "@/lib/types/rocketLineups";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("q:rocketlineups");
const rocketLineupsUrl = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/rocketLineups.json";

export class RocketLineupsProvider extends BaseDataProvider<RocketLineup[]> {
	constructor() {
		super(REFRESH_ROCKET_LINEUPS);
	}

	protected async query(): Promise<RocketLineup[]> {
		const rawData = await this.fetchData(rocketLineupsUrl, log, "rocket lineups");
		return JSON.parse(rawData) as RocketLineup[];
	}

	protected setData(data: RocketLineup[]) {
		overwriteRocketLineups(data);
	}
}

export const rocketLineupsProvider = new RocketLineupsProvider();
