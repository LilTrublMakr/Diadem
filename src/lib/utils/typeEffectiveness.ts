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

// Types each defending type resists (not very effective) and is immune to (no effect) -
// same source/extraction as TYPE_STRENGTHS above.
export const TYPE_RESISTS: Record<string, string[]> = {
	normal: [],
	fighting: ["rock", "bug", "dark"],
	flying: ["fighting", "bug", "grass"],
	poison: ["fighting", "poison", "bug", "grass", "fairy"],
	ground: ["poison", "rock"],
	rock: ["normal", "flying", "poison", "fire"],
	bug: ["fighting", "ground", "grass"],
	ghost: ["poison", "bug"],
	steel: ["normal", "flying", "rock", "bug", "steel", "grass", "psychic", "ice", "dragon", "fairy"],
	fire: ["bug", "steel", "fire", "grass", "ice", "fairy"],
	water: ["steel", "fire", "water", "ice"],
	grass: ["ground", "water", "grass", "electric"],
	electric: ["flying", "steel", "electric"],
	psychic: ["fighting", "psychic"],
	ice: ["ice"],
	dragon: ["fire", "water", "grass", "electric"],
	dark: ["ghost", "dark"],
	fairy: ["fighting", "bug", "dark"]
};

export const TYPE_IMMUNE: Record<string, string[]> = {
	normal: ["ghost"],
	fighting: [],
	flying: ["ground"],
	poison: [],
	ground: ["electric"],
	rock: [],
	bug: [],
	ghost: ["normal", "fighting"],
	steel: ["poison"],
	fire: [],
	water: [],
	grass: [],
	electric: [],
	psychic: [],
	ice: [],
	dragon: [],
	dark: ["psychic"],
	fairy: ["dragon"]
};

export type TypeWeakness = { type: string; multiplier: 2 | 4 };

/** Real combined multiplier of one attacking type against a 1-2 type defender (0, 0.25, 0.5, 1, 2, or 4). */
export function getMultiplier(attackType: string, defenderTypes: string[]): number {
	const types = defenderTypes.map((t) => t.toLowerCase());
	let multiplier = 1;
	for (const defType of types) {
		if (TYPE_IMMUNE[defType]?.includes(attackType)) return 0;
		if (TYPE_STRENGTHS[attackType]?.includes(defType)) multiplier *= 2;
		else if (TYPE_RESISTS[defType]?.includes(attackType)) multiplier *= 0.5;
	}
	return multiplier;
}

/**
 * Every attacking type that lands super-effective against a 1-2 type defender, with the real
 * combined multiplier (4x when it's super-effective against both defending types at once - e.g.
 * Steel vs Ice/Fairy Alolan Ninetales).
 */
export function getWeaknesses(defenderTypes: string[]): TypeWeakness[] {
	const hits: TypeWeakness[] = [];
	for (const attackType of Object.keys(TYPE_STRENGTHS)) {
		const multiplier = getMultiplier(attackType, defenderTypes);
		if (multiplier > 1) hits.push({ type: attackType, multiplier: multiplier as 2 | 4 });
	}
	return hits.sort((a, b) => b.multiplier - a.multiplier || a.type.localeCompare(b.type));
}

/** True if this attacking type is actually resisted (or outright immune) by the defender - not
 * just "merely not super-effective" - used to flag a currently-taught move as a liability, not
 * just unhelpful (e.g. Dialga's Roar of Time against this grunt's Fairy-type half). */
export function isResisted(attackType: string, defenderTypes: string[]): boolean {
	return getMultiplier(attackType, defenderTypes) < 1;
}
