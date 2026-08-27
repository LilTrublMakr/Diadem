import type { MasterMove, MasterPokemon } from "@/lib/types/masterfile";
import type { MoveMechanics } from "@/lib/types/moveMechanics";

export type MovesetDpsEntry = {
	quick: MasterMove;
	charge: MasterMove;
	dps: number;
	isLegacy: boolean;
};

function moveDamage(power: number, stab: boolean): number {
	return power * (stab ? 1.2 : 1);
}

/**
 * Raw, defender-agnostic moveset DPS — STAB only, no type effectiveness against a specific
 * raid boss. Standard community "moveset quality" loop formula: how many quick-move hits are
 * needed to charge one use of the charge move, then damage-over-time across that full cycle.
 */
export function calculateMoveDps(
	quick: MasterMove,
	quickMechanics: MoveMechanics,
	charge: MasterMove,
	chargeMechanics: MoveMechanics,
	stabQuick: boolean,
	stabCharge: boolean
): number {
	const energyPerQuick = quickMechanics.energyDelta;
	if (energyPerQuick <= 0) return 0;
	const energyCost = Math.abs(chargeMechanics.energyDelta);
	const numQuicks = Math.ceil(energyCost / energyPerQuick);

	const quickDamage = moveDamage(quick.power, stabQuick);
	const chargeDamage = moveDamage(charge.power, stabCharge);
	const totalDamage = numQuicks * quickDamage + chargeDamage;

	const totalTimeSeconds =
		(numQuicks * quickMechanics.durationMs + chargeMechanics.durationMs) / 1000;
	if (totalTimeSeconds <= 0) return 0;

	return totalDamage / totalTimeSeconds;
}

/**
 * Full quick×charge cross product for this species+form — this already includes legacy moves
 * (pokemon.quickMoves/chargedMoves carry them), so it doubles as "every possible moveset".
 * A pair missing mechanics data (Pokébattler coverage gap) is silently skipped, never crashes.
 */
export function buildMovesetMatrix(
	pokemon: MasterPokemon,
	mechanics: Record<string, MoveMechanics>
): MovesetDpsEntry[] {
	const entries: MovesetDpsEntry[] = [];

	for (const quick of pokemon.quickMoves ?? []) {
		const quickMechanics = mechanics[quick.proto];
		if (!quickMechanics) continue;
		const stabQuick = pokemon.types.includes(quick.type);

		for (const charge of pokemon.chargedMoves ?? []) {
			const chargeMechanics = mechanics[charge.proto];
			if (!chargeMechanics) continue;
			const stabCharge = pokemon.types.includes(charge.type);

			const dps = calculateMoveDps(
				quick,
				quickMechanics,
				charge,
				chargeMechanics,
				stabQuick,
				stabCharge
			);
			entries.push({ quick, charge, dps, isLegacy: !!quick.isLegacy || !!charge.isLegacy });
		}
	}

	return entries.sort((a, b) => b.dps - a.dps);
}
