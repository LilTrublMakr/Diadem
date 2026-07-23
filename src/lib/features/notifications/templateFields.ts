import { DISCORD_EMOJI_IDS, discordEmojiTag } from "@/lib/features/notifications/discordEmoji";
import type { TemplateField } from "@/lib/features/notifications/types";

/**
 * Field registry for the "pokemon" notification type. Drives both the client-side
 * TagPicker palette and documents the shape buildPokemonContext() (render.ts) produces.
 * Phase 2 will add a registry per additional Golbat event type.
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

	{ tag: "pvpGreatRank", label: "Great League Rank", category: "PVP", sample: "1" },
	{ tag: "pvpUltraRank", label: "Ultra League Rank", category: "PVP", sample: "1" },
	{ tag: "pvpLittleRank", label: "Little Cup Rank", category: "PVP", sample: "3" },

	{ tag: "despawnTime", label: "Despawn Time", category: "Time", sample: "3:45:12 PM" },
	{
		tag: "despawnUnix",
		label: "Despawn Unix Time (for Discord <t:...> tags)",
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
		tag: '{{#if (isnt weather "None")}}☁️ Weather boosted: {{weather}}\n{{/if}}',
		label: "Weather boost note",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if evolutions.length}}Can evolve into: {{#each evolutions}}{{fullName}}{{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}",
		label: "Evolutions list",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if pvpLittle.length}}**Little League:**\n{{#each pvpLittle}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}}",
		label: "Little League rankings",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if pvpGreat.length}}**Great League:**\n{{#each pvpGreat}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}}",
		label: "Great League rankings",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if pvpUltra.length}}**Ultra League:**\n{{#each pvpUltra}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}{{/if}}",
		label: "Ultra League rankings",
		category: "Presets",
		sample: "",
		raw: true
	},
	{
		tag: "{{#if (or trackedShundo trackedHundo trackedShiny trackedNundo)}}Have:{{#if trackedShundoEmoji}} {{trackedShundoEmoji}}{{/if}}{{#if trackedHundoEmoji}} {{trackedHundoEmoji}}{{/if}}{{#if trackedShinyEmoji}} {{trackedShinyEmoji}}{{/if}}{{#if trackedNundoEmoji}} {{trackedNundoEmoji}}{{/if}}{{/if}}",
		label: "Have: badges (your collection)",
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
