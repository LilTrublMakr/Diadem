import { buildMoveNameMap, buildMoveTypeMap } from "@/lib/utils/collectionExportUtils";
import { getWeaknesses, isResisted } from "@/lib/utils/typeEffectiveness";
import type { RawExportPokemon } from "@/lib/types/collectionExport";
import type { RocketLineup, RocketPokemon } from "@/lib/types/rocketLineups";

export type RankedMove = { name: string; type: string };

export type RankedCounter = {
	individual: RawExportPokemon;
	score: number;
	totalDefenders: number;
	coveredNames: string[];
	// The actual owned move(s) that land super-effective against at least one defender here -
	// what makes this individual a real counter, not just a good species pick.
	qualifyingMoves: RankedMove[];
	// Owned moves that are actively resisted (not just unhelpful) by at least one defender in this
	// lineup - a liability, not merely a wasted slot (e.g. Dialga's Roar of Time vs this grunt's
	// Fairy-type half). Ranked individuals with fewer of these are preferred when tied on coverage,
	// since "every move helps" beats "one move helps, the other works against you."
	resistedMoves: RankedMove[];
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
	const defenderTypesList = [...defenders.values()].map((p) => p.types);

	const moveTypes = buildMoveTypeMap();
	const moveNames = buildMoveNameMap();
	const results: RankedCounter[] = [];

	for (const individual of pokemon) {
		const ownedMoves = [...new Map(
			[individual.move1, individual.move2, individual.move3]
				.filter((id) => id)
				.map((id) => [id, moveTypes.get(id)] as const)
				.filter((entry): entry is [number, string] => !!entry[1])
		).entries()].map(([id, type]) => ({ id, type, name: moveNames.get(id) ?? `Move ${id}` }));
		if (!ownedMoves.length) continue;

		const coveredNames: string[] = [];
		for (const [name, weaknesses] of weaknessesByDefender) {
			if (ownedMoves.some((m) => weaknesses.has(m.type))) coveredNames.push(name);
		}
		if (!coveredNames.length) continue;

		const qualifyingMoves = ownedMoves
			.filter((m) => [...weaknessesByDefender.values()].some((w) => w.has(m.type)))
			.map((m) => ({ name: m.name, type: m.type }));
		const resistedMoves = ownedMoves
			.filter((m) => defenderTypesList.some((defTypes) => isResisted(m.type, defTypes)))
			.map((m) => ({ name: m.name, type: m.type }));

		results.push({
			individual,
			score: coveredNames.length,
			totalDefenders: defenders.size,
			coveredNames,
			qualifyingMoves,
			resistedMoves
		});
	}

	results.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (a.resistedMoves.length !== b.resistedMoves.length) {
			return a.resistedMoves.length - b.resistedMoves.length;
		}
		const ivA = a.individual.atk + a.individual.def + a.individual.sta;
		const ivB = b.individual.atk + b.individual.def + b.individual.sta;
		if (ivB !== ivA) return ivB - ivA;
		return b.individual.cp - a.individual.cp;
	});

	return results.slice(0, limit);
}
