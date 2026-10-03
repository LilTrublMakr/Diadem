// Mirrors ScrapedDuck's rocketLineups.json shape 1:1 - no transformation needed on ingest.
export type RocketPokemon = {
	name: string;
	image: string;
	types: string[];
	isEncounter: boolean;
	canBeShiny: boolean;
};

export type RocketLineup = {
	name: string;
	title: string;
	type: string;
	firstPokemon: RocketPokemon[];
	secondPokemon: RocketPokemon[];
	thirdPokemon: RocketPokemon[];
};
