// Shapes of Golbat webhook envelopes' `message` field, one type per Golbat wire `type`.
// See https://github.com/UnownHash/Golbat/blob/main/webhooks.md
export type GolbatPvpEntry = {
	pokemon: number;
	form: number;
	evolution?: number;
	cap: number;
	value: number;
	level: number;
	cp: number;
	percentage: number;
	rank: number;
	capped?: boolean;
};

export type GolbatPvpRankings = Partial<
	Record<"little" | "great" | "ultra" | "master", GolbatPvpEntry[]>
>;

export type GolbatPokemonMessage = {
	spawnpoint_id?: string | null;
	pokestop_id?: string | null;
	pokestop_name?: string | null;
	encounter_id: string;
	pokemon_id: number;
	latitude: number;
	longitude: number;
	disappear_time: number; // unix seconds
	disappear_time_verified: boolean;
	first_seen: number;
	last_modified_time: number;
	gender?: number | null;
	cp?: number | null;
	form?: number | null;
	costume?: number | null;
	individual_attack?: number | null;
	individual_defense?: number | null;
	individual_stamina?: number | null;
	pokemon_level?: number | null;
	move_1?: number | null;
	move_2?: number | null;
	weight?: number | null;
	size?: number | null;
	height?: number | null;
	weather?: number | null;
	shiny?: boolean | null;
	username?: string | null;
	display_pokemon_id?: number | null;
	display_pokemon_form?: number | null;
	is_event?: boolean;
	seen_type: string;
	pvp?: GolbatPvpRankings | null;
};

// Shape of a Golbat webhook envelope's `message` for type "raid" — covers both the unhatched
// egg phase (pokemon_id: 0) and the hatched-boss phase (same wire type, PoracleNG's own receiver
// treats them identically — see processor/internal/webhook/types.go's RaidWebhook).
export type GolbatRaidMessage = {
	gym_id: string;
	gym_name: string;
	gym_url: string;
	latitude: number;
	longitude: number;
	pokemon_id: number; // 0 during egg phase
	form: number;
	gender: number;
	costume: number;
	evolution: number;
	alignment: number;
	level: number;
	team_id: number;
	start: number; // unix seconds — hatch time
	end: number; // unix seconds — raid end time
	move_1: number;
	move_2: number;
	ex_raid_eligible: boolean;
};

// Shape of a Golbat webhook envelope's `message` for type "max_battle" — a Dynamax/Gigantamax
// battle station. `bread_mode`/`battle_level` together determine gmax (see PoracleNG's
// processor/cmd/processor/maxbattle.go:56-63) — Golbat has no plain "is this gmax" field.
export type GolbatMaxBattleMessage = {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	start_time: number;
	end_time: number;
	is_battle_available: boolean;
	battle_level: number;
	battle_start: number;
	battle_end: number;
	battle_pokemon_id: number;
	battle_pokemon_form: number;
	battle_pokemon_costume: number;
	battle_pokemon_gender: number;
	battle_pokemon_alignment: number;
	battle_pokemon_bread_mode: number;
	battle_pokemon_move_1: number;
	battle_pokemon_move_2: number;
	total_stationed_pokemon: number;
	total_stationed_gmax: number;
	updated: number;
};

// Shape of a Golbat webhook envelope's `message` for type "quest" — verified against PoracleNG's
// QuestWebhook struct (processor/internal/webhook/types.go:250-283). `type` here is the quest
// OBJECTIVE type (e.g. "catch 5 pokemon"), unused by this app — not to be confused with a
// reward's own `type` field below (2=item, 3=stardust, 4=candy, 7=pokemon, 12=mega energy).
export type GolbatQuestReward = {
	type: number;
	info: Record<string, unknown>;
};

export type GolbatQuestCondition = {
	type: number;
	info: Record<string, unknown>;
};

export type GolbatQuestMessage = {
	pokestop_id: string;
	pokestop_name?: string;
	pokestop_url?: string;
	latitude: number;
	longitude: number;
	title?: string;
	target: number;
	type: number;
	template?: string;
	rewards: GolbatQuestReward[];
	conditions?: GolbatQuestCondition[];
	// The same pokestop can host both an AR and a standard quest simultaneously (separate
	// objectives, separate rewards) — see webhook/golbat/+server.ts's dedup key.
	with_ar: boolean;
};

export type GolbatWebhookEnvelope = {
	type: string;
	message: unknown;
};
