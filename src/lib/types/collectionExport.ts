export type RawExportPokemon = {
	alignment: number;
	atk: number;
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
	move1: number;
	move2: number;
	move3: number;
	nickname: string;
	shiny: boolean;
	size: string;
	sta: number;
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
