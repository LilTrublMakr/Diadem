import { createHash } from "node:crypto";

const MULTIPLIER = 0x5deece66dn;
const ADDEND = 0xbn;
const MASK = (1n << 48n) - 1n;

/**
 * The per-account wild shiny roll: SHA1(encounter id as uint64 LE ‖ player id as latin1), first
 * 8 bytes LE seed a `java.util.Random`, and the first `next(31)` is scaled to the odds with
 * Java's power-of-two fast path — `(odds * next(31)) >> 31` — for EVERY odds, not just powers
 * of two. That's not what `nextInt(odds)` does for e.g. 25 (Java switches to modulo there), but
 * it's what the game does: confirmed against real Community Day 1/25 shinies. 0 = shiny for
 * that account at 1/odds. Since it's one threshold on one value, shiny at 1/512 implies shiny
 * at every better odds.
 *
 * encounterId must be the decimal string Golbat sends — never a JS Number (64-bit ids lose
 * precision past 2^53). playerId is the raw "invited_player_ids" value (case-sensitive).
 */
export function rollShinyDie(encounterId: string, playerId: string, odds: number): number {
	const id = Buffer.alloc(8);
	id.writeBigUInt64LE(BigInt.asUintN(64, BigInt(encounterId)));
	const seed = createHash("sha1").update(id).update(playerId, "latin1").digest().readBigUInt64LE(0);

	const state = (((seed ^ MULTIPLIER) & MASK) * MULTIPLIER + ADDEND) & MASK;
	const next31 = state >> 17n; // top 31 of the 48 state bits
	return Number((BigInt(odds) * next31) >> 31n);
}
