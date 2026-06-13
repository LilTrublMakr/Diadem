export type Generation = {
	gen: number;
	name: string;
	min: number;
	max: number;
};

export const GENERATIONS: Generation[] = [
	{ gen: 1, name: 'Kanto',  min: 1,   max: 151  },
	{ gen: 2, name: 'Johto',  min: 152,  max: 251  },
	{ gen: 3, name: 'Hoenn',  min: 252,  max: 386  },
	{ gen: 4, name: 'Sinnoh', min: 387,  max: 493  },
	{ gen: 5, name: 'Unova',  min: 494,  max: 649  },
	{ gen: 6, name: 'Kalos',  min: 650,  max: 721  },
	{ gen: 7, name: 'Alola',  min: 722,  max: 809  },
	{ gen: 8, name: 'Galar',  min: 810,  max: 905  },
	{ gen: 9, name: 'Paldea', min: 906,  max: 1025 },
];

export function getGeneration(pokemonId: number): Generation | undefined {
	return GENERATIONS.find((g) => pokemonId >= g.min && pokemonId <= g.max);
}
