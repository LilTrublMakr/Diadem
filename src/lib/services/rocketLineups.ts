import type { RocketLineup } from "@/lib/types/rocketLineups";

let rocketLineups: RocketLineup[] = [];

export function overwriteRocketLineups(data: RocketLineup[]) {
	rocketLineups = data;
}

export function getRocketLineups(): RocketLineup[] {
	return rocketLineups;
}
