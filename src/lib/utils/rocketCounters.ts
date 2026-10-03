import { buildMoveTypeMap } from "@/lib/utils/collectionExportUtils";
import { getWeaknesses } from "@/lib/utils/typeEffectiveness";
import type { RawExportPokemon } from "@/lib/types/collectionExport";
import type { RocketLineup, RocketPokemon } from "@/lib/types/rocketLineups";

export type RankedCounter = {
	individual: RawExportPokemon;
	score: number;
	totalDefenders: number;
	coveredNames: string[];
};

/**
 * Ranks a parsed collection export's individuals by how many of a lineup's distinct possible
 * pokemon they counter, same approach worked out by hand earlier this session: dedupe every
 * pokemon appearing across all three phases (you only face one option per phase in a real
 * encounter, but "how universal is this attacker" is judged against the whole possible set),
 * then score an individual by how many of those it hits super-effectively with a move it
 * currently has taught - not just species reputation (an owned "great counter" species with the
 * wrong moveset scores the same as not owning it at all, matching what the manual analysis found
 * for a few real individuals this session).
 */
export function rankCountersForLineup(
	lineup: RocketLineup,
	pokemon: RawExportPokemon[],
	limit = 5
): RankedCounter[] {
	const defenders = new Map<string, RocketPokemon>();
	for (const p of [...lineup.firstPokemon, ...lineup.secondPokemon, ...lineup.thirdPokemon]) {
		if (!defenders.has(p.name)) defenders.set(p.name, p);
	}

	const weaknessesByDefender = new Map<string, Set<string>>();
	for (const [name, p] of defenders) {
		weaknessesByDefender.set(name, new Set(getWeaknesses(p.types).map((w) => w.type)));
	}

	const moveTypes = buildMoveTypeMap();
	const results: RankedCounter[] = [];

	for (const individual of pokemon) {
		const ownedMoveTypes = [individual.move1, individual.move2, individual.move3]
			.filter((id) => id)
			.map((id) => moveTypes.get(id))
			.filter((t): t is string => !!t);
		if (!ownedMoveTypes.length) continue;

		const coveredNames: string[] = [];
		for (const [name, weaknesses] of weaknessesByDefender) {
			if (ownedMoveTypes.some((t) => weaknesses.has(t))) coveredNames.push(name);
		}
		if (!coveredNames.length) continue;

		results.push({
			individual,
			score: coveredNames.length,
			totalDefenders: defenders.size,
			coveredNames
		});
	}

	results.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		const ivA = a.individual.atk + a.individual.def + a.individual.sta;
		const ivB = b.individual.atk + b.individual.def + b.individual.sta;
		if (ivB !== ivA) return ivB - ivA;
		return b.individual.cp - a.individual.cp;
	});

	return results.slice(0, limit);
}
