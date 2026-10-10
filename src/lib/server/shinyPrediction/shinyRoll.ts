import { createHash } from "node:crypto";

const MULTIPLIER = 0x5deece66dn;
const ADDEND = 0xbn;
const MASK = (1n << 48n) - 1n;

/**
 * Port of `new java.util.Random(seed).nextInt(bound)` — the full algorithm, not just the
 * power-of-two shortcut, because non-power-of-two shiny odds (e.g. Community Day's 1/25) take
 * Java's modulo + rejection-loop path instead.
 */
function javaNextInt(seed: bigint, bound: number): number {
	let state = (seed ^ MULTIPLIER) & MASK;
	const next31 = () => {
		state = (state * MULTIPLIER + ADDEND) & MASK;
		return Number(state >> 17n); // next(31): top 31 of the 48 state bits, always non-negative
	};

	let r = next31();
	const m = bound - 1;
	if ((bound & m) === 0) return Number((BigInt(bound) * BigInt(r)) >> 31n);

	// Java's `u - (r = u % bound) + m < 0` relies on 32-bit int overflow — `| 0` reproduces it
	for (let u = r; ((u - (r = u % bound) + m) | 0) < 0; u = next31());
	return r;
}

/**
 * The per-account wild shiny roll: SHA1(encounter id as uint64 LE ‖ player id as latin1), first
 * 8 bytes LE as the Java Random seed, then nextInt(odds). 0 = shiny for that account at 1/odds.
 *
 * encounterId must be the decimal string Golbat sends — never a JS Number (64-bit ids lose
 * precision past 2^53). playerId is the raw "invited_player_ids" value (case-sensitive).
 */
export function rollShinyDie(encounterId: string, playerId: string, odds: number): number {
	const id = Buffer.alloc(8);
	id.writeBigUInt64LE(BigInt.asUintN(64, BigInt(encounterId)));
	const hash = createHash("sha1").update(id).update(playerId, "latin1").digest();
	return javaNextInt(hash.readBigUInt64LE(0), odds);
}
