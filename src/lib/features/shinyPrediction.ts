// The "invited_player_ids" value from a private raid lobby: 16 lowercase hex chars, or a 21-digit
// decimal for Google signups. Not the obfuscated "E:..." id gym defenders expose.
export const PLAYER_ID_PATTERN = /^(?:[0-9a-f]{16}|\d{21})$/;

export const MAX_SHINY_ACCOUNTS = 10;

// The player id itself never leaves the server after it's saved — the owner only sees a masked tail.
export type ShinyAccountDto = {
	id: number;
	label: string;
	playerIdHint: string;
};

export type ShinyPredictionResult = {
	odds: number | null; // null = species looks shiny-locked, nothing can be predicted
	accounts: string[]; // labels of the user's linked accounts this spawn is shiny for
};
