// Shape of a single Golbat webhook envelope's `message` for type "pokemon".
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

export type GolbatWebhookEnvelope = {
	type: string;
	message: unknown;
};
