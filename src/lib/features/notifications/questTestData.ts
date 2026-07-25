import type { QuestTemplateContext } from "@/lib/features/notifications/types";

export type QuestTestScenario = {
	id: string;
	label: string;
	context: QuestTemplateContext;
};

const pokemonReward: QuestTemplateContext = {
	pokestopId: "abc123.16",
	pokestopName: "City Hall",
	pokestopUrl: "",
	questTitle: "Catch 5 Pokémon",
	target: 5,
	withAr: false,
	rewardType: "pokemon",
	rewardString: "Bulbasaur",
	pokemonName: "Bulbasaur",
	pokemonId: 1,
	form: 0,
	formName: "",
	shiny: false,
	itemId: 0,
	itemName: "",
	amount: 0,
	pokemonImageUrl: "attachment://pokemon.png",
	latitude: 44.4759,
	longitude: -73.2121,
	googleMapsUrl: "https://maps.google.com/maps?q=44.4759,-73.2121",
	appleMapsUrl: "https://maps.apple.com/?ll=44.4759,-73.2121",
	wazeMapUrl: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
	mapImageUrl: "",
	diademUrl: ""
};

const itemReward: QuestTemplateContext = {
	...pokemonReward,
	questTitle: "Spin 3 Pokéstops",
	target: 3,
	rewardType: "item",
	rewardString: "10 Poke Balls",
	pokemonName: "",
	pokemonId: 0,
	itemId: 1,
	itemName: "Poke Ball",
	amount: 10,
	pokemonImageUrl: ""
};

const stardustReward: QuestTemplateContext = {
	...pokemonReward,
	questTitle: "Make 3 Great Throws",
	target: 3,
	rewardType: "stardust",
	rewardString: "1000 Stardust",
	pokemonName: "",
	pokemonId: 0,
	amount: 1000,
	pokemonImageUrl: ""
};

const candyReward: QuestTemplateContext = {
	...pokemonReward,
	questTitle: "Trade a Pokémon",
	target: 1,
	rewardType: "candy",
	rewardString: "3 Dratini Candy",
	pokemonName: "Dratini",
	pokemonId: 147,
	amount: 3,
	pokemonImageUrl: ""
};

const megaEnergyReward: QuestTemplateContext = {
	...pokemonReward,
	questTitle: "Win a Gym Battle",
	target: 1,
	rewardType: "megaEnergy",
	rewardString: "50 Charizard Mega Energy",
	pokemonName: "Charizard",
	pokemonId: 6,
	amount: 50,
	pokemonImageUrl: ""
};

const arQuest: QuestTemplateContext = {
	...pokemonReward,
	questTitle: "Take a Snapshot of a Wild Pokémon",
	target: 1,
	withAr: true
};

export const QUEST_TEST_SCENARIOS: QuestTestScenario[] = [
	{ id: "pokemon", label: "Pokemon Reward (Bulbasaur)", context: pokemonReward },
	{ id: "item", label: "Item Reward (10 Poke Balls)", context: itemReward },
	{ id: "stardust", label: "Stardust Reward (1000)", context: stardustReward },
	{ id: "candy", label: "Candy Reward (Dratini)", context: candyReward },
	{ id: "mega-energy", label: "Mega Energy Reward (Charizard)", context: megaEnergyReward },
	{ id: "ar", label: "AR Quest", context: arQuest }
];

const RANDOM_POKEMON = [
	{ id: 1, name: "Bulbasaur" },
	{ id: 4, name: "Charmander" },
	{ id: 7, name: "Squirtle" },
	{ id: 147, name: "Dratini" },
	{ id: 246, name: "Larvitar" }
];

const RANDOM_ITEMS = [
	{ id: 1, name: "Poke Ball" },
	{ id: 2, name: "Great Ball" },
	{ id: 3, name: "Ultra Ball" },
	{ id: 701, name: "Razz Berry" },
	{ id: 705, name: "Golden Razz Berry" }
];

/** Generates a plausible-but-random quest context for previewing a template. */
export function randomizeQuestContext(): QuestTemplateContext {
	const bases = [pokemonReward, itemReward, stardustReward, candyReward, megaEnergyReward];
	const base = bases[Math.floor(Math.random() * bases.length)];
	const withAr = Math.random() < 0.3;

	if (base.rewardType === "pokemon") {
		const mon = RANDOM_POKEMON[Math.floor(Math.random() * RANDOM_POKEMON.length)];
		return { ...base, withAr, pokemonId: mon.id, pokemonName: mon.name, rewardString: mon.name };
	}
	if (base.rewardType === "item") {
		const item = RANDOM_ITEMS[Math.floor(Math.random() * RANDOM_ITEMS.length)];
		const amount = 1 + Math.floor(Math.random() * 15);
		return {
			...base,
			withAr,
			itemId: item.id,
			itemName: item.name,
			amount,
			rewardString: `${amount} ${item.name}`
		};
	}
	return { ...base, withAr };
}
