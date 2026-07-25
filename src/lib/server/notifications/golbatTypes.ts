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

export type GolbatWebhookEnvelope = {
	type: string;
	message: unknown;
};
