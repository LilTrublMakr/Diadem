// The "invited_player_ids" value from a private raid lobby: 16 lowercase hex chars, or a 21-digit
// decimal for Google signups. Not the obfuscated "E:..." id gym defenders expose.
export const PLAYER_ID_PATTERN = /^(?:[0-9a-f]{16}|\d{21})$/;

// A Pokémon GO friend code: 12 digits (spaces/dashes allowed in input). Looked up via PlayerID.
export const FRIEND_CODE_PATTERN = /^\d{12}$/;

export const MAX_SHINY_ACCOUNTS = 10;

// The player id itself never leaves the server after it's saved — the owner only sees a masked
// tail. Friend-code links show up as "pending" until PlayerID finds the player id; only "linked"
// accounts are used for predictions.
export type ShinyAccountDto = {
	id: number;
	label: string;
	playerIdHint: string;
	status: "linked" | "pending" | "failed";
	detail?: string; // human-readable lookup state for pending/failed friend-code links
};

export type ShinyPredictionResult = {
	odds: number | null; // null = species looks shiny-locked, nothing can be predicted
	accounts: string[]; // labels of the user's linked accounts this spawn is shiny for
};
