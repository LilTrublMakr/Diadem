import { REFRESH_MOVE_MECHANICS } from "@/lib/constants";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import type { MoveMechanics } from "@/lib/types/moveMechanics";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("moveMechanics");

const MOVES_URL = "https://fight.pokebattler.com/moves";

type PokebattlerMove = {
	moveId: string;
	durationMs?: number;
	energyDelta?: number;
};

export class MoveMechanicsProvider extends BaseDataProvider<Record<string, MoveMechanics>> {
	constructor() {
		super(REFRESH_MOVE_MECHANICS);
	}

	protected async query(): Promise<Record<string, MoveMechanics>> {
		try {
			const response = await fetch(MOVES_URL, {
				headers: { "User-Agent": "PoGo-Map-VT (pokedex moveset DPS feature)" },
				signal: AbortSignal.timeout(15_000)
			});
			if (!response.ok) {
				log.warning(`Pokébattler /moves request failed: ${response.status}`);
				return this.cachedData ?? {};
			}
			const body = (await response.json()) as { move: PokebattlerMove[] };
			const mechanics: Record<string, MoveMechanics> = {};
			for (const move of body.move ?? []) {
				if (move.durationMs == null || move.energyDelta == null) continue;
				mechanics[move.moveId] = { durationMs: move.durationMs, energyDelta: move.energyDelta };
			}
			return mechanics;
		} catch (error) {
			log.warning(`Failed to fetch Pokébattler move mechanics: ${error}`);
			return this.cachedData ?? {};
		}
	}
}

export const moveMechanicsProvider = new MoveMechanicsProvider();
