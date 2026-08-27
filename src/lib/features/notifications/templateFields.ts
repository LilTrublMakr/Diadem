import { DISCORD_EMOJI_IDS, discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import type { TemplateField } from "@/lib/features/notifications/types";

/**
 * Field registry for the "pokemon" notification type. Drives both the client-side
 * TagPicker palette and documents the shape buildPokemonContext() (render.ts) produces.
 * Each notification type gets its own registry (see RAID_TEMPLATE_FIELDS below) so the tag
 * picker only ever offers tags that exist for the type being edited.
 */
export const POKEMON_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "pokemonName", label: "Pokemon Name", category: "Identity", sample: "Dratini ✨" },
	{ tag: "pokemonId", label: "Pokemon ID", category: "Identity", sample: "147" },
	{ tag: "form", label: "Form ID", category: "Identity", sample: "0" },
	{ tag: "formName", label: "Form Name", category: "Identity", sample: "Alolan" },
	{ tag: "costume", label: "Costume ID", category: "Identity", sample: "0" },
	{ tag: "gender", label: "Gender", category: "Identity", sample: "Male" },
	{ tag: "shiny", label: "Shiny (true/false)", category: "Identity", sample: "true" },
	{ tag: "size", label: "Size", category: "Identity", sample: "XXL" },
	{ tag: "type1", label: "Primary Type", category: "Identity", sample: "Dragon" },
	{ tag: "type2", label: "Secondary Type", category: "Identity", sample: "" },
	{
		tag: "type1Emoji",
		label: "Primary Type Emoji",
		category: "Identity",
		sample: "<:type_dragon:...>",
		unescaped: true
	},
	{
		tag: "type2Emoji",
		label: "Secondary Type Emoji",
		category: "Identity",
		sample: "",
		unescaped: true
	},

	{
		tag: "trackedShiny",
		label: "Shiny (true/false)",
		category: "Your Collection",
		sample: "false"
	},
	{ tag: "trackedShinyYesNo", label: "Shiny (Yes/No)", category: "Your Collection", sample: "No" },
	{ tag: "trackedShinyEmoji", label: "Shiny Emoji", category: "Your Collection", sample: "✨" },
	{
		tag: "trackedHundo",
		label: "Hundo (true/false)",
		category: "Your Collection",
		sample: "false"
	},
	{
		tag: "trackedHundoYesNo",
		label: "Hundo (Yes/No)",
		category: "Your Collection",
		sample: "No"
	},
	{ tag: "trackedHundoEmoji", label: "Hundo Emoji", category: "Your Collection", sample: "💯" },
	{
		tag: "trackedNundo",
		label: "Nundo (true/false)",
		category: "Your Collection",
		sample: "false"
	},
	{
		tag: "trackedNundoYesNo",
		label: "Nundo (Yes/No)",
		category: "Your Collection",
		sample: "No"
	},
	{ tag: "trackedNundoEmoji", label: "Nundo Emoji", category: "Your Collection", sample: "0️⃣" },
	{
		tag: "trackedShundo",
		label: "Shundo (true/false)",
		category: "Your Collection",
		sample: "false"
	},
	{
		tag: "trackedShundoYesNo",
		label: "Shundo (Yes/No)",
		category: "Your Collection",
		sample: "No"
	},
	{ tag: "trackedShundoEmoji", label: "Shundo Emoji", category: "Your Collection", sample: "🌟" },

	{
		tag: "shinyRatePercent",
		label: "All-Time Shiny Rate (%)",
		category: "Shiny Stats",
		sample: "4.8%"
	},
	{
		tag: "shinyRateFraction",
		label: "All-Time Shiny Rate (full fraction)",
		category: "Shiny Stats",
		sample: "8/166"
	},
	{
		tag: "shinyRateReduced",
		label: "All-Time Shiny Rate (reduced, ~1 in N)",
		category: "Shiny Stats",
		sample: "~1 in 21"
	},

	{ tag: "iv", label: "IV %", category: "Stats", sample: "100" },
	{ tag: "atk", label: "Attack IV", category: "Stats", sample: "15" },
	{ tag: "def", label: "Defense IV", category: "Stats", sample: "15" },
	{ tag: "sta", label: "Stamina IV", category: "Stats", sample: "15" },
	{ tag: "cp", label: "CP", category: "Stats", sample: "2648" },
	{ tag: "level", label: "Level", category: "Stats", sample: "35" },
	{ tag: "weight", label: "Weight (kg)", category: "Stats", sample: "3.5" },
	{ tag: "height", label: "Height (m)", category: "Stats", sample: "1.8" },
	{ tag: "weather", label: "Weather Boost", category: "Stats", sample: "Windy" },
	{
		tag: "weatherEmoji",
		label: "Weather Boost Emoji",
		category: "Stats",
		sample: "<:weather_windy:...>",
		unescaped: true
	},

	{ tag: "quickMove", label: "Quick Move", category: "Moves", sample: "Dragon Breath" },
	{ tag: "chargeMove", label: "Charge Move", category: "Moves", sample: "Dragon Claw" },
	{
		tag: "quickMoveEmoji",
		label: "Quick Move Type Emoji",
		category: "Moves",
		sample: "<:type_dragon:...>",
		unescaped: true
	},
	{
		tag: "chargeMoveEmoji",
		label: "Charge Move Type Emoji",
		category: "Moves",
		sample: "<:type_dragon:...>",
		unescaped: true
	},
	{
		tag: "hasFeaturedAttack",
		label: "Featured Attack Active (true/false)",
		category: "Moves",
		sample: "false"
	},
	{
		tag: "featuredAttackMoveName",
		label: "Featured Attack Move Name",
		category: "Moves",
		sample: "Icy Wind"
	},
	{
		tag: "featuredAttackMoveCategory",
		label: "Featured Attack Move Category (fast/charged)",
		category: "Moves",
		sample: "charged"
	},
	{
		tag: "featuredAttackEvolvesTo",
		label: "Featured Attack Result Species",
		category: "Moves",
		sample: "Thievul"
	},

	{ tag: "pvpGreatRank", label: "Great League Rank", category: "PVP", sample: "1" },
	{ tag: "pvpUltraRank", label: "Ultra League Rank", category: "PVP", sample: "1" },
	{ tag: "pvpLittleRank", label: "Little Cup Rank", category: "PVP", sample: "3" },

	{ tag: "despawnTime", label: "Despawn Time", category: "Time", sample: "3:45:12 PM" },
	{
		tag: "despawnUnix",
		label: "Despawn Unix Time",
		category: "Time",
		sample: "1700000000"
	},
	{ tag: "minutesLeft", label: "Minutes Left", category: "Time", sample: "12" },
	{ tag: "firstSeenTime", label: "First Seen Time", category: "Time", sample: "3:33:12 PM" },

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	},
	{
		tag: "mapImageUrl",
		label: "Map Image (use in Image or Thumbnail field)",
		category: "Location",
		sample: "attachment://map.png",
		unescaped: true
	},
	{
		tag: "pokemonImageUrl",
		label: "Pokemon Sprite (use in Thumbnail or Image field)",
		category: "Location",
		sample: "https://pogovt.com/assets/DEFAULT/pokemon/147.png",
		unescaped: true
	},
	{
		tag: "diademUrl",
		label: "View on Map (this site)",
		category: "Location",
		sample: "https://pogovt.com/pokemon/abc123",
		unescaped: true
	},

	{ tag: "spawnpointId", label: "Spawnpoint ID", category: "Meta", sample: "8d4f2a1b3c" },
	{ tag: "pokestopId", label: "Pokestop ID (lure spawns)", category: "Meta", sample: "" },
	{ tag: "pokestopName", label: "Pokestop Name (lure spawns)", category: "Meta", sample: "" },
	{ tag: "username", label: "Scanner Account", category: "Meta", sample: "" }
];

/**
 * Field registry for the "raid" notification type — covers both the egg and hatched-boss
 * phases (see buildRaidContext in render.ts). Deliberately has no IV/CP/atk/def/sta/weather
 * tags — raid bosses don't have rollable IVs the way wild spawns do, so those don't exist here.
 */
export const RAID_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "isEgg", label: "Is Egg (true/false)", category: "Raid", sample: "false" },
	{ tag: "level", label: "Raid Level", category: "Raid", sample: "5" },
	{ tag: "levelName", label: "Raid Level Name", category: "Raid", sample: "Level 5" },
	{
		tag: "exRaidEligible",
		label: "EX Raid Eligible (true/false)",
		category: "Raid",
		sample: "false"
	},
	{ tag: "hatchTime", label: "Hatch Time (egg phase)", category: "Raid", sample: "3:45:12 PM" },
	{
		tag: "raidEndTime",
		label: "Raid End Time (boss phase)",
		category: "Raid",
		sample: "4:45:12 PM"
	},

	{ tag: "gymId", label: "Gym ID", category: "Gym", sample: "abc123.16" },
	{ tag: "gymName", label: "Gym Name", category: "Gym", sample: "City Hall" },
	{ tag: "gymUrl", label: "Gym Photo URL", category: "Gym", sample: "", unescaped: true },
	{ tag: "teamName", label: "Controlling Team", category: "Gym", sample: "Instinct" },
	{
		tag: "teamEmoji",
		label: "Controlling Team Emoji",
		category: "Gym",
		sample: "<:team_instinct:...>",
		unescaped: true
	},

	{
		tag: "pokemonName",
		label: "Boss Name (empty during egg phase)",
		category: "Boss",
		sample: "Tyranitar"
	},
	{ tag: "pokemonId", label: "Boss Pokemon ID", category: "Boss", sample: "248" },
	{ tag: "form", label: "Boss Form ID", category: "Boss", sample: "0" },
	{ tag: "formName", label: "Boss Form Name", category: "Boss", sample: "" },
	{ tag: "gender", label: "Boss Gender", category: "Boss", sample: "Male" },
	{ tag: "type1", label: "Boss Primary Type", category: "Boss", sample: "Rock" },
	{ tag: "type2", label: "Boss Secondary Type", category: "Boss", sample: "Dark" },
	{
		tag: "type1Emoji",
		label: "Boss Primary Type Emoji",
		category: "Boss",
		sample: "<:type_rock:...>",
		unescaped: true
	},
	{
		tag: "type2Emoji",
		label: "Boss Secondary Type Emoji",
		category: "Boss",
		sample: "<:type_dark:...>",
		unescaped: true
	},
	{ tag: "quickMove", label: "Boss Quick Move", category: "Boss", sample: "Bite" },
	{ tag: "chargeMove", label: "Boss Charge Move", category: "Boss", sample: "Stone Edge" },
	{
		tag: "quickMoveEmoji",
		label: "Boss Quick Move Type Emoji",
		category: "Boss",
		sample: "<:type_dark:...>",
		unescaped: true
	},
	{
		tag: "chargeMoveEmoji",
		label: "Boss Charge Move Type Emoji",
		category: "Boss",
		sample: "<:type_rock:...>",
		unescaped: true
	},
	{
		tag: "shinyRatePercent",
		label: "Boss All-Time Shiny Rate (%)",
		category: "Boss",
		sample: "1.2%"
	},
	{
		tag: "shinyRateFraction",
		label: "Boss All-Time Shiny Rate (full fraction)",
		category: "Boss",
		sample: "3/250"
	},
	{
		tag: "shinyRateReduced",
		label: "Boss All-Time Shiny Rate (reduced, ~1 in N)",
		category: "Boss",
		sample: "~1 in 83"
	},

	{
		tag: "despawnUnix",
		label: "Countdown Unix Time",
		category: "Time",
		sample: "1700000000"
	},
	{ tag: "minutesLeft", label: "Minutes Left", category: "Time", sample: "42" },

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	},
	{
		tag: "pokemonImageUrl",
		label: "Boss Sprite (use in Thumbnail or Image field, empty during egg phase)",
		category: "Location",
		sample: "attachment://pokemon.png",
		unescaped: true
	}
];

/**
 * Field registry for the "maxbattle" notification type — a Dynamax/Gigantamax battle station
 * (see buildMaxBattleContext in render.ts). No egg-phase equivalent and no IV/CP tags, same
 * reasoning as raids.
 */
export const MAXBATTLE_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "stationId", label: "Station ID", category: "Battle", sample: "abc123.16" },
	{ tag: "stationName", label: "Station Name", category: "Battle", sample: "City Hall" },
	{ tag: "level", label: "Battle Level", category: "Battle", sample: "6" },
	{ tag: "gmax", label: "Is Gigantamax (true/false)", category: "Battle", sample: "true" },
	{ tag: "gmaxYesNo", label: "Is Gigantamax (Yes/No)", category: "Battle", sample: "Yes" },

	{
		tag: "pokemonName",
		label: "Boss Name (empty until a battle is active)",
		category: "Boss",
		sample: "Gigantamax Butterfree"
	},
	{ tag: "pokemonId", label: "Boss Pokemon ID", category: "Boss", sample: "12" },
	{ tag: "form", label: "Boss Form ID", category: "Boss", sample: "0" },
	{ tag: "formName", label: "Boss Form Name", category: "Boss", sample: "" },
	{ tag: "type1", label: "Boss Primary Type", category: "Boss", sample: "Bug" },
	{ tag: "type2", label: "Boss Secondary Type", category: "Boss", sample: "Flying" },
	{
		tag: "type1Emoji",
		label: "Boss Primary Type Emoji",
		category: "Boss",
		sample: "<:type_bug:...>",
		unescaped: true
	},
	{
		tag: "type2Emoji",
		label: "Boss Secondary Type Emoji",
		category: "Boss",
		sample: "<:type_flying:...>",
		unescaped: true
	},
	{ tag: "quickMove", label: "Boss Quick Move", category: "Boss", sample: "Bug Bite" },
	{ tag: "chargeMove", label: "Boss Charge Move", category: "Boss", sample: "Bug Buzz" },
	{
		tag: "quickMoveEmoji",
		label: "Boss Quick Move Type Emoji",
		category: "Boss",
		sample: "<:type_bug:...>",
		unescaped: true
	},
	{
		tag: "chargeMoveEmoji",
		label: "Boss Charge Move Type Emoji",
		category: "Boss",
		sample: "<:type_bug:...>",
		unescaped: true
	},
	{
		tag: "shinyRatePercent",
		label: "Boss All-Time Shiny Rate (%)",
		category: "Boss",
		sample: "2.5%"
	},
	{
		tag: "shinyRateFraction",
		label: "Boss All-Time Shiny Rate (full fraction)",
		category: "Boss",
		sample: "5/200"
	},
	{
		tag: "shinyRateReduced",
		label: "Boss All-Time Shiny Rate (reduced, ~1 in N)",
		category: "Boss",
		sample: "~1 in 40"
	},

	{ tag: "battleEndTime", label: "Battle End Time", category: "Time", sample: "4:45:12 PM" },
	{
		tag: "despawnUnix",
		label: "Countdown Unix Time",
		category: "Time",
		sample: "1700000000"
	},
	{ tag: "minutesLeft", label: "Minutes Left", category: "Time", sample: "42" },

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	},
	{
		tag: "pokemonImageUrl",
		label: "Boss Sprite (use in Thumbnail or Image field, empty until a battle is active)",
		category: "Location",
		sample: "attachment://pokemon.png",
		unescaped: true
	}
];

/**
 * Field registry for the "quest" notification type — a Field Research task at a pokestop. Only
 * the FIRST reward is modeled (see buildQuestContext in render.ts) since quests almost always
 * carry exactly one. No IV/CP/stats — same "only tags that make sense" reasoning as raid/maxbattle.
 * No despawn/countdown tags either — Golbat's quest webhook carries no expiry timestamp.
 */
export const QUEST_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "questTitle", label: "Quest Title", category: "Quest", sample: "Catch 5 Pokémon" },
	{ tag: "target", label: "Quest Target Count", category: "Quest", sample: "5" },
	{ tag: "withAr", label: "Requires AR (true/false)", category: "Quest", sample: "false" },
	{
		tag: "rewardType",
		label: "Reward Type (pokemon/item/stardust/candy/megaEnergy)",
		category: "Quest",
		sample: "pokemon"
	},
	{
		tag: "rewardString",
		label: "Reward Summary (all rewards)",
		category: "Quest",
		sample: "Bulbasaur"
	},

	{
		tag: "pokemonName",
		label: "Reward Pokemon Name (pokemon/candy/mega energy rewards)",
		category: "Reward",
		sample: "Bulbasaur"
	},
	{ tag: "pokemonId", label: "Reward Pokemon ID", category: "Reward", sample: "1" },
	{ tag: "form", label: "Reward Form ID (pokemon reward only)", category: "Reward", sample: "0" },
	{
		tag: "formName",
		label: "Reward Form Name (pokemon reward only)",
		category: "Reward",
		sample: ""
	},
	{
		tag: "shiny",
		label: "Reward Shiny (true/false, pokemon reward only)",
		category: "Reward",
		sample: "false"
	},
	{
		tag: "itemName",
		label: "Reward Item Name (item reward only)",
		category: "Reward",
		sample: "Poke Ball"
	},
	{ tag: "itemId", label: "Reward Item ID (item reward only)", category: "Reward", sample: "1" },
	{
		tag: "amount",
		label: "Reward Amount (item/stardust/candy/mega energy)",
		category: "Reward",
		sample: "3"
	},
	{
		tag: "pokemonImageUrl",
		label: "Reward Sprite (pokemon reward only, use in Thumbnail or Image field)",
		category: "Reward",
		sample: "attachment://pokemon.png",
		unescaped: true
	},

	{ tag: "pokestopId", label: "Pokestop ID", category: "Pokestop", sample: "abc123.16" },
	{ tag: "pokestopName", label: "Pokestop Name", category: "Pokestop", sample: "City Hall" },
	{
		tag: "pokestopUrl",
		label: "Pokestop Photo URL",
		category: "Pokestop",
		sample: "",
		unescaped: true
	},

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	}
];

/**
 * Field registry for the "invasion" notification type — a Team GO Rocket grunt takeover OR a
 * Kecleon/Showcase/Gold-Stop event incident (see buildInvasionContext in render.ts). No IV/CP/
 * stats — same "only tags that make sense" reasoning as raid/maxbattle/quest.
 */
export const INVASION_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "kind",
		label: "Kind (grunt/kecleon/showcase/goldStop)",
		category: "Invasion",
		sample: "grunt"
	},
	{
		tag: "characterName",
		label: "Grunt Name (empty for event incidents)",
		category: "Invasion",
		sample: "Grunt (Electric)"
	},
	{ tag: "character", label: "Grunt Character ID", category: "Invasion", sample: "8" },
	{
		tag: "confirmed",
		label: "Grunt Confirmed (true/false, vs unconfirmed placeholder)",
		category: "Invasion",
		sample: "true"
	},

	{ tag: "pokestopId", label: "Pokestop ID", category: "Pokestop", sample: "abc123.16" },
	{ tag: "pokestopName", label: "Pokestop Name", category: "Pokestop", sample: "City Hall" },
	{
		tag: "pokestopUrl",
		label: "Pokestop Photo URL",
		category: "Pokestop",
		sample: "",
		unescaped: true
	},

	{
		tag: "expireUnix",
		label: "Countdown Unix Time",
		category: "Time",
		sample: "1700000000"
	},
	{ tag: "minutesLeft", label: "Minutes Left", category: "Time", sample: "42" },

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	}
];

/**
 * Field registry for the "lure" notification type — a lured pokestop (see buildLureContext in
 * render.ts). No IV/CP/stats, same "only tags that make sense" reasoning as the other event
 * categories.
 */
export const LURE_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "lureTypeName", label: "Lure Type Name", category: "Lure", sample: "Golden Lure" },
	{ tag: "lureId", label: "Lure Type ID", category: "Lure", sample: "506" },
	{
		tag: "lureTypeEmoji",
		label: "Lure Type Emoji",
		category: "Lure",
		sample: "<:pstop_lure_golden:...>",
		unescaped: true
	},

	{ tag: "pokestopId", label: "Pokestop ID", category: "Pokestop", sample: "abc123.16" },
	{ tag: "pokestopName", label: "Pokestop Name", category: "Pokestop", sample: "City Hall" },
	{
		tag: "pokestopUrl",
		label: "Pokestop Photo URL",
		category: "Pokestop",
		sample: "",
		unescaped: true
	},

	{
		tag: "expireUnix",
		label: "Countdown Unix Time",
		category: "Time",
		sample: "1700000000"
	},
	{ tag: "minutesLeft", label: "Minutes Left", category: "Time", sample: "27" },

	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	}
];

/**
 * Field registry for the "gym" notification type — a team/slot/battle-state delta (see
 * buildGymContext in render.ts). No IV/CP/stats, same "only tags that make sense" reasoning as
 * the other event categories. -1 values (oldTeamId, oldSlotsAvailable, oldTrainerCount,
 * lastControllerId) mean "unknown" — see the type's own doc comment.
 */
export const GYM_TEMPLATE_FIELDS: TemplateField[] = [
	{ tag: "teamName", label: "New Controlling Team", category: "Gym", sample: "Instinct" },
	{
		tag: "teamEmoji",
		label: "New Controlling Team Emoji",
		category: "Gym",
		sample: "<:team_instinct:...>",
		unescaped: true
	},
	{
		tag: "oldTeamName",
		label: "Previous Controlling Team (Unknown on first sighting)",
		category: "Gym",
		sample: "Mystic"
	},
	{
		tag: "oldTeamEmoji",
		label: "Previous Controlling Team Emoji",
		category: "Gym",
		sample: "<:team_mystic:...>",
		unescaped: true
	},
	{
		tag: "lastControllerName",
		label: "Last Non-Neutral Controller (survives Uncontested gaps)",
		category: "Gym",
		sample: "Valor"
	},
	{ tag: "teamChanged", label: "Team Changed (true/false)", category: "Gym", sample: "true" },
	{ tag: "slotsChanged", label: "Slots Changed (true/false)", category: "Gym", sample: "false" },
	{ tag: "slotsAvailable", label: "Open Slots", category: "Gym", sample: "4" },
	{ tag: "oldSlotsAvailable", label: "Previous Open Slots", category: "Gym", sample: "6" },
	{
		tag: "trainerCount",
		label: "Trainers Stationed (6 - open slots)",
		category: "Gym",
		sample: "2"
	},
	{ tag: "oldTrainerCount", label: "Previous Trainers Stationed", category: "Gym", sample: "0" },
	{ tag: "inBattle", label: "In Battle (true/false)", category: "Gym", sample: "false" },

	{ tag: "gymId", label: "Gym ID", category: "Location", sample: "abc123.16" },
	{ tag: "gymName", label: "Gym Name", category: "Location", sample: "City Hall" },
	{ tag: "gymUrl", label: "Gym Photo URL", category: "Location", sample: "", unescaped: true },
	{ tag: "latitude", label: "Latitude", category: "Location", sample: "44.4759" },
	{ tag: "longitude", label: "Longitude", category: "Location", sample: "-73.2121" },
	{
		tag: "googleMapsUrl",
		label: "Google Maps Link",
		category: "Location",
		sample: "https://maps.google.com/maps?q=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "appleMapsUrl",
		label: "Apple Maps Link",
		category: "Location",
		sample: "https://maps.apple.com/?ll=44.4759,-73.2121",
		unescaped: true
	},
	{
		tag: "wazeMapUrl",
		label: "Waze Link",
		category: "Location",
		sample: "https://waze.com/ul?ll=44.4759,-73.2121&navigate=yes",
		unescaped: true
	}
];

/**
 * Clickable conditional-block/helper skeletons — inserted literally (not wrapped
 * in {{ }}) via TemplateField.raw. %CURSOR% marks where the caret lands after
 * insertion so the user can fill in the condition/args immediately.
 */
export const CONDITIONAL_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "{{#if %CURSOR%}}{{/if}}",
		label: "if",
		category: "Conditionals",
		sample: "",
		raw: true
	},
	{ tag: "{{else}}", label: "else", category: "Conditionals", sample: "", raw: true },
	{
		tag: "{{#unless %CURSOR%}}{{/unless}}",
		label: "unless",
		category: "Conditionals",
		sample: "",
		raw: true
	},
	{ tag: "(eq %CURSOR%)", label: "eq", category: "Conditionals", sample: "", raw: true },
	{ tag: "(isnt %CURSOR%)", label: "isnt", category: "Conditionals", sample: "", raw: true },
	{ tag: "(gt %CURSOR%)", label: "gt", category: "Conditionals", sample: "", raw: true },
	{ tag: "(lt %CURSOR%)", label: "lt", category: "Conditionals", sample: "", raw: true },
	{ tag: "(gte %CURSOR%)", label: "gte", category: "Conditionals", sample: "", raw: true },
	{ tag: "(lte %CURSOR%)", label: "lte", category: "Conditionals", sample: "", raw: true },
	{ tag: "(and %CURSOR%)", label: "and", category: "Conditionals", sample: "", raw: true },
	{ tag: "(or %CURSOR%)", label: "or", category: "Conditionals", sample: "", raw: true },
	{ tag: "(oneOf %CURSOR%)", label: "oneOf", category: "Conditionals", sample: "", raw: true }
];

/**
 * Ready-made snippets combining data + conditionals for common patterns — inserted
 * literally (whole block, no %CURSOR% placeholder needed since they're self-contained).
 */
export const PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "<t:{{despawnUnix}}:R>",
		label: 'Discord relative time (e.g. "in 12 minutes")',
		category: "Time",
		sample: "",
		raw: true
	},
	{
		tag: '{{#if (isnt weather "None")}}\n☁️ Weather boosted: {{weather}}\n{{/if}}',
		label: "Weather boost note",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if evolutions.length}}\nEvolution family: {{#each evolutions}}{{fullName}}{{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}",
		label: "Evolution family list",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		// evolvesTo is direct next-stage evolution(s) ONLY — never a pre-evolution. Use this for
		// "can evolve into" wording; the "Evolution family list" preset above lists the whole
		// family (including pre-evolutions) and is meant for a plain family listing instead.
		tag: "{{#if evolvesTo.length}}\nCan evolve into: {{#each evolvesTo}}{{fullName}}{{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}",
		label: "Can evolve into (next stage only)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		// futureEvolutions is every stage ahead (immediate AND beyond) — never a pre-evolution.
		tag: "{{#if futureEvolutions.length}}\nCan evolve into: {{#each futureEvolutions}}{{fullName}}{{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}",
		label: "Can evolve into (all future stages)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#with (filterRank pvpLittle 25) as |ranked|}}\n{{#if ranked.length}}\n**Little League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}",
		label: "Little League rankings (rank 25 or better)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#with (filterRank pvpGreat 25) as |ranked|}}\n{{#if ranked.length}}\n**Great League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}",
		label: "Great League rankings (rank 25 or better)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#with (filterRank pvpUltra 25) as |ranked|}}\n{{#if ranked.length}}\n**Ultra League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}",
		label: "Ultra League rankings (rank 25 or better)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if (or trackedShundo trackedHundo trackedShiny trackedNundo)}}\nHave:{{#if trackedShundoEmoji}} {{trackedShundoEmoji}}{{/if}}{{#if trackedHundoEmoji}} {{trackedHundoEmoji}}{{/if}}{{#if trackedShinyEmoji}} {{trackedShinyEmoji}}{{/if}}{{#if trackedNundoEmoji}} {{trackedNundoEmoji}}{{/if}}\n{{/if}}",
		label: "Have: badges (your collection)",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if hasFeaturedAttack}}\n⚔️ Evolve for a {{featuredAttackEvolvesTo}} with {{featuredAttackMoveName}}!\n{{/if}}",
		label: "Featured Attack note",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "raid" type — separate from PRESET_TEMPLATE_FIELDS since those
 * reference pokemon-only context fields (weather, evolutions, pvp, tracked badges). */
export const RAID_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "<t:{{despawnUnix}}:R>",
		label: 'Discord relative time (e.g. "in 12 minutes")',
		category: "Time",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if isEgg}}Hatches {{minutesLeft}}m from now{{else}}{{pokemonName}} — despawns in {{minutesLeft}}m{{/if}}",
		label: "Egg vs boss summary",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "maxbattle" type. */
export const MAXBATTLE_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "<t:{{despawnUnix}}:R>",
		label: 'Discord relative time (e.g. "in 12 minutes")',
		category: "Time",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if gmax}}⚡ Gigantamax! {{/if}}{{pokemonName}} — ends in {{minutesLeft}}m",
		label: "Gigantamax callout summary",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "quest" type. */
export const QUEST_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "{{questTitle}} — Reward: {{rewardString}}",
		label: "Quest + reward summary",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "invasion" type. */
export const INVASION_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "<t:{{expireUnix}}:R>",
		label: 'Discord relative time (e.g. "in 12 minutes")',
		category: "Time",
		sample: "",
		raw: true
	},
	{
		tag: '{{#if (eq kind "grunt")}}{{characterName}}{{else}}{{kind}} incident{{/if}} at {{pokestopName}}',
		label: "Kind-aware summary",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if lineup.length}}\nConfirmed catches: {{#each lineup}}{{pokemonName}}{{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}",
		label: "Confirmed catches list (lineup)",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "lure" type. */
export const LURE_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "<t:{{expireUnix}}:R>",
		label: 'Discord relative time (e.g. "in 12 minutes")',
		category: "Time",
		sample: "",
		raw: true
	},
	{
		tag: "{{lureTypeEmoji}} {{lureTypeName}} at {{pokestopName}} — expires in {{minutesLeft}}m",
		label: "Lure summary",
		category: "Presets",
		sample: "",
		raw: true
	}
];

/** Preset snippets for the "gym" type. */
export const GYM_PRESET_TEMPLATE_FIELDS: TemplateField[] = [
	{
		tag: "{{#if teamChanged}}{{oldTeamName}} → {{teamName}}{{else}}{{teamName}} — {{trainerCount}}/6 trainers{{#if inBattle}}, in battle{{/if}}{{/if}}",
		label: "Team-change-aware summary",
		category: "Presets",
		sample: "",
		raw: true
	}
];

const EMOJI_CATEGORY_LABELS: Record<string, string> = {
	gym: "Emoji: Gym",
	invasion: "Emoji: Invasion",
	misc: "Emoji: Misc",
	pstop: "Emoji: Pokestop",
	raid: "Emoji: Raid Eggs",
	team: "Emoji: Team",
	type: "Emoji: Type",
	weather: "Emoji: Weather"
};

function humanize(words: string): string {
	return words
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

/**
 * One clickable literal-insert tag per uploaded Discord emoji (see discordEmoji.ts) —
 * inserts the raw `<:name:id>` text directly, not bound to any template variable.
 * Grouped by name prefix (gym/invasion/misc/pstop/team/type/weather).
 */
export const EMOJI_TEMPLATE_FIELDS: TemplateField[] = Object.keys(DISCORD_EMOJI_IDS).map((name) => {
	const [prefix, ...rest] = name.split("_");
	const tag = discordEmojiTag(name);
	return {
		tag,
		label: humanize(rest.join("_") || prefix),
		category: EMOJI_CATEGORY_LABELS[prefix] ?? `Emoji: ${humanize(prefix)}`,
		sample: tag,
		raw: true
	};
});
