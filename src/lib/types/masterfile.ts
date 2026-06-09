export type MasterMove = {
	id: number;
	name: string;
	proto: string;
	type: number;
	power: number;
	isLegacy?: boolean;
};

export type MasterEvolution = {
	pokemonId: number;
	form: number;
	candyCost: number;
	itemRequirement?: string;
	mustBeBuddy?: boolean;
	onlyDaytime?: boolean;
	onlyNighttime?: boolean;
	questRequirement?: string;
};

export type MasterPokemon = {
	name: string;
	forms: { [key: string]: MasterPokemon };
	tempEvos: { [key: string]: MasterPokemon };
	isCostume?: boolean;
	unreleased?: boolean;
	legendary: boolean;
	mythical: boolean;
	ultraBeast: boolean;
	defaultFormId?: number;
	types: [number] | [number, number];
	family: number;
	baseAtk: number;
	baseDef: number;
	baseSta: number;
	quickMoves: MasterMove[];
	chargedMoves: MasterMove[];
	evolutions: MasterEvolution[];
	buddyDistance: number;
};

export type MasterWeather = {
	types: number[];
};

export type MasterFile = {
	pokemon: { [key: string]: MasterPokemon };
	weather: { [key: string]: MasterWeather };
	items: string[];
};
