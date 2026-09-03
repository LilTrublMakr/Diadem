export type RawExportPokemon = {
	alignment: number;
	atk: number;
	buddy_level: number;
	caught_ms: number;
	costume: number;
	cp: number;
	cpm: number;
	def: number;
	dex: number;
	favorite: boolean;
	form: number;
	gender: number;
	hatched: boolean;
	id: string;
	lucky: boolean;
	mega_level: number;
	move1: number;
	move2: number;
	move3: number;
	nickname: string;
	shiny: boolean;
	size: string;
	sta: number;
	// Ids into the export tool's own tag catalog (e.g. "Hundo", "Legacy Move", "Mega Evolve") -
	// resolve display names via resolveTagNames() in collectionTags.ts, not stored here.
	tags: string[];
	traded: boolean;
};

export type RawExportFile = {
	payload: {
		ok: boolean;
		pokemon: RawExportPokemon[];
	};
	type: string;
};
