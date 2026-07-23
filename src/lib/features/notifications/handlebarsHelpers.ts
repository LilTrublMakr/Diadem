import type Handlebars from "handlebars";

/**
 * Comparison/logic helpers for notification templates — vanilla Handlebars only
 * ships bare {{#if}}/{{#unless}}/{{#each}}/{{#with}}, no comparisons. Registered
 * on both the server (render.ts) and client (DiscordEmbedPreview.svelte) Handlebars
 * instances so preview and real sends behave identically.
 *
 * Usage: {{#if (gt iv 90)}}High IV!{{/if}}, {{#if (eq type1 "Dragon")}}...{{/if}}
 *
 * `if`/`else`/`unless` are built into Handlebars already — only comparison/logic
 * subexpression helpers need registering here.
 */
export function registerNotificationHelpers(handlebars: typeof Handlebars) {
	handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
	handlebars.registerHelper("ne", (a: unknown, b: unknown) => a !== b);
	handlebars.registerHelper("isnt", (a: unknown, b: unknown) => a !== b);
	handlebars.registerHelper("gt", (a: number, b: number) => a > b);
	handlebars.registerHelper("gte", (a: number, b: number) => a >= b);
	handlebars.registerHelper("lt", (a: number, b: number) => a < b);
	handlebars.registerHelper("lte", (a: number, b: number) => a <= b);
	handlebars.registerHelper("and", (...args: unknown[]) => {
		args.pop(); // trailing Handlebars options object
		return args.every(Boolean);
	});
	handlebars.registerHelper("or", (...args: unknown[]) => {
		args.pop();
		return args.some(Boolean);
	});
	handlebars.registerHelper("oneOf", (value: unknown, ...args: unknown[]) => {
		args.pop(); // trailing Handlebars options object
		return args.includes(value);
	});
	// {{#with (filterRank pvpGreat 25) as |ranked|}} — pvpLittle/pvpGreat/pvpUltra entries are
	// unfiltered (Golbat can report ranks in the thousands), so templates need a way to only
	// show the ones actually worth a Discord alert.
	handlebars.registerHelper("filterRank", (entries: unknown, maxRank: number) =>
		Array.isArray(entries)
			? entries.filter((e) => typeof e?.rank === "number" && e.rank <= maxRank)
			: []
	);
}
