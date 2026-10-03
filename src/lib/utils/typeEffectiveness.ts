/**
 * Real Pokemon type chart (18 types), extracted from WatWowMap's masterfile `types` section -
 * this app's own masterfileProvider fetches that same raw data but never parses this part of it.
 * Type effectiveness hasn't changed in years, so this is hardcoded rather than wired into a TTL
 * provider like the rest of the masterfile.
 */
export const TYPE_STRENGTHS: Record<string, string[]> = {
	normal: [],
	fighting: ["normal", "rock", "steel", "ice", "dark"],
	flying: ["fighting", "bug", "grass"],
	poison: ["grass", "fairy"],
	ground: ["poison", "rock", "steel", "fire", "electric"],
	rock: ["flying", "bug", "fire", "ice"],
	bug: ["grass", "psychic", "dark"],
	ghost: ["ghost", "psychic"],
	steel: ["rock", "ice", "fairy"],
	fire: ["bug", "steel", "grass", "ice"],
	water: ["ground", "rock", "fire"],
	grass: ["ground", "rock", "water"],
	electric: ["flying", "water"],
	psychic: ["fighting", "poison"],
	ice: ["flying", "ground", "grass", "dragon"],
	dragon: ["dragon"],
	dark: ["ghost", "psychic"],
	fairy: ["fighting", "dragon", "dark"]
};

export type TypeWeakness = { type: string; multiplier: 2 | 4 };

/**
 * Every attacking type that lands super-effective against a 1-2 type defender, with the real
 * combined multiplier (4x when it's super-effective against both defending types at once - e.g.
 * Steel vs Ice/Fairy Alolan Ninetales).
 */
export function getWeaknesses(defenderTypes: string[]): TypeWeakness[] {
	const types = defenderTypes.map((t) => t.toLowerCase());
	const hits = new Map<string, number>();

	for (const [attackType, strengths] of Object.entries(TYPE_STRENGTHS)) {
		let multiplier = 1;
		for (const defType of types) {
			if (strengths.includes(defType)) multiplier *= 2;
		}
		if (multiplier > 1) hits.set(attackType, multiplier as 2 | 4);
	}

	return [...hits.entries()]
		.map(([type, multiplier]) => ({ type, multiplier: multiplier as 2 | 4 }))
		.sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type));
}
