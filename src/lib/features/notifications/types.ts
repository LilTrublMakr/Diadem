import type { NotificationSchedule, SubscriptionMode } from "./scheduleTypes";
import type { Polygon } from "geojson";

// A user-drawn polygon scoped to notifications only — separate from scan_area (scanning/
// allotment). Referenced by a subscription's filters.areaId when areaSource === "notificationArea".
export type NotificationAreaDto = {
	id: number;
	name: string;
	geofence: Polygon;
	areaSqM: number;
	createdAt: string;
	updatedAt: string;
};

// Phase 1 shipped "pokemon". Phase 2 adds the rest one at a time — "raid" and "maxbattle" are
// done; quest, invasion, lure, gym, and fort follow the same pattern (nests are deferred
// indefinitely, Golbat has no live "nest changed" event to key off).
export type NotificationType = "pokemon" | "raid" | "maxbattle";

export type EmbedFieldTemplate = {
	name: string;
	value: string;
	inline: boolean;
};

export type EmbedTemplate = {
	// Plain message text, sent OUTSIDE the embed (Discord's top-level `content`). Mobile push
	// notifications show this instead of a generic "N images" placeholder when it's non-empty.
	content: string;
	title: string;
	description: string;
	color: string;
	thumbnailUrl: string;
	imageUrl: string;
	footerText: string;
	url: string;
	fields: EmbedFieldTemplate[];
};

export type PvpLeagueFilter = "little" | "great" | "ultra";

export type PvpEntryContext = {
	fullName: string;
	rank: number;
	cp: number;
	levelWithCap: string;
};

// Shared by every notification type's filter shape — geofence scoping is a type-agnostic
// concept (lat/lng in, polygon test), unlike the rest of a type's filters.
export type BaseSubscriptionFilters = {
	// Optional area scope: "own" (default) = one of the user's own scan_area rows;
	// "koji" = a named Koji geofence ("coverage map" area); "notificationArea" = one of the
	// user's own notification-only areas (separate from scan_area). areaId is a scan_area.id,
	// Koji feature id, or notification_area.id depending on areaSource — three unrelated id spaces.
	areaSource?: "own" | "koji" | "notificationArea";
	areaId?: number;
};

export type PokemonSubscriptionFilters = BaseSubscriptionFilters & {
	// Empty/absent = any species. Multiple ids = OR match (notify for any of these species).
	pokemonIds?: number[];
	form?: number;
	minIv?: number;
	maxIv?: number;
	minCp?: number;
	maxCp?: number;
	minLevel?: number;
	maxLevel?: number;
	minAtk?: number;
	maxAtk?: number;
	minDef?: number;
	maxDef?: number;
	minSta?: number;
	maxSta?: number;
	minSize?: number; // 1-5, matches getPokemonSize()'s XXS..XXL scale
	maxSize?: number;
	gender?: 1 | 2 | 3; // Male, Female, Genderless (matches PokemonData.gender)
	// No shinyOnly filter — shiny is per scanner-account, not the same catch for every player,
	// so it's not a valid "notify me" signal (unlike hundo, which is universal).
	// Empty/absent = no PVP filter. Multiple leagues = OR match (notify if it ranks within
	// pvpMaxRank in ANY of these leagues) — one shared rank threshold across all of them.
	pvpLeagues?: PvpLeagueFilter[];
	pvpMaxRank?: number;
};

export type RaidTeam = 0 | 1 | 2 | 3; // 0=neutral/uncontested, 1=Mystic, 2=Valor, 3=Instinct

export type RaidSubscriptionFilters = BaseSubscriptionFilters & {
	// Empty/absent = any boss species. Only applies once the raid has hatched (isEgg===false) —
	// an egg's eventual boss is unknown, so this can't gate egg-phase notifications.
	bossPokemonIds?: number[];
	form?: number;
	minLevel?: number; // 1-6, applies to both egg level and hatched-boss level (same wire field)
	maxLevel?: number;
	// Gym's current controlling team, empty/absent = any. Known even during egg phase.
	teams?: RaidTeam[];
	exRaidOnly?: boolean;
	notifyOnEgg?: boolean; // default true
	notifyOnBoss?: boolean; // default true
};

export type MaxBattleSubscriptionFilters = BaseSubscriptionFilters & {
	// Empty/absent = any boss species.
	bossPokemonIds?: number[];
	form?: number;
	minLevel?: number;
	maxLevel?: number;
	// true = only Gigantamax battles (see buildMaxBattleContext's gmax derivation — Golbat
	// doesn't send a plain "is this gmax" flag, it's inferred from bread_mode/battle_level).
	gmaxOnly?: boolean;
};

// Every notification type's filters, keyed loosely by NotificationType — not a TS discriminated
// union (that would need every call site to narrow via a type guard for marginal safety gain);
// callers narrow by checking subscription.type instead, matching this codebase's existing
// light-touch typing style (see schema.ts's $type<>() cast on the `filters` column).
export type AnySubscriptionFilters =
	| PokemonSubscriptionFilters
	| RaidSubscriptionFilters
	| MaxBattleSubscriptionFilters;

export type NotificationTemplateDto = {
	id: number;
	name: string;
	type: NotificationType;
	embed: EmbedTemplate;
	createdAt: string;
	updatedAt: string;
};

export type NotificationSubscriptionDto = {
	id: number;
	type: NotificationType;
	templateId: number | null;
	name: string;
	enabled: boolean;
	filters: AnySubscriptionFilters;
	// "manual" = active whenever enabled; "scheduled" = active only within schedule's windows
	mode: SubscriptionMode;
	schedule: NotificationSchedule | null;
	createdAt: string;
	updatedAt: string;
};

export type NotificationErrorResponse = {
	error: string;
	message?: string;
	used?: number;
	total?: number;
};

export type TemplateField = {
	tag: string;
	label: string;
	category: string;
	sample: string;
	unescaped?: boolean; // true = use {{{triple braces}}} (URLs, emoji)
	// true = insert `tag` literally (no {{ }} wrapping) — used for conditional
	// skeletons. `tag` may contain one %CURSOR% marker to place the caret after insert.
	raw?: boolean;
};

// Rendering context for the "pokemon" type — built server-side from a Golbat webhook
// message (src/lib/server/notifications/render.ts), also used client-side to type
// hand-authored preview test data (src/lib/features/notifications/testData.ts).
export type PokemonTemplateContext = {
	pokemonName: string;
	pokemonId: number;
	form: number;
	formName: string;
	costume: number;
	gender: string;
	genderValue: 1 | 2 | 3 | null; // raw Male/Female/Genderless value behind the `gender` label
	shiny: boolean; // this encounter's own shiny status — {{shiny}} renders "true"/"false"
	// Whether the RECEIVING user has already tracked a shiny/hundo/nundo/shundo of this species
	// in their personal collection (pokemon_tracker) — not a fact about this encounter. Resolved
	// per-recipient (see applyTrackedBadges in render.ts), not shared context.
	trackedShiny: boolean;
	trackedShinyYesNo: string;
	trackedShinyEmoji: string;
	trackedHundo: boolean;
	trackedHundoYesNo: string;
	trackedHundoEmoji: string;
	trackedNundo: boolean;
	trackedNundoYesNo: string;
	trackedNundoEmoji: string;
	trackedShundo: boolean;
	trackedShundoYesNo: string;
	trackedShundoEmoji: string;
	// This species' all-time shiny rate (pokemon_summary, time_slot='all') — public scanner
	// data, not per-user. "?" for any of these means no scan data exists yet for this species.
	shinyRatePercent: string; // "4.8%"
	shinyRateFraction: string; // "8/166"
	shinyRateReduced: string; // "~1 in 21", or "—" if never recorded shiny
	size: string;
	sizeValue: number | null; // raw 1-5 scale behind the `size` label — for filter matching
	type1: string;
	type2: string;
	type1Emoji: string;
	type2Emoji: string;
	iv: number | null;
	atk: number | null;
	def: number | null;
	sta: number | null;
	cp: number | null;
	level: number | null;
	weight: number | null;
	height: number | null;
	weather: string;
	weatherEmoji: string;
	quickMove: string;
	chargeMove: string;
	quickMoveEmoji: string;
	chargeMoveEmoji: string;
	pvpGreatRank: number | null;
	pvpUltraRank: number | null;
	pvpLittleRank: number | null;
	pvpLittle: PvpEntryContext[];
	pvpGreat: PvpEntryContext[];
	pvpUltra: PvpEntryContext[];
	despawnTime: string;
	despawnUnix: number;
	minutesLeft: number;
	firstSeenTime: string;
	latitude: number;
	longitude: number;
	googleMapsUrl: string;
	appleMapsUrl: string;
	wazeMapUrl: string;
	mapImageUrl: string;
	diademUrl: string;
	spawnpointId: string;
	pokestopId: string;
	pokestopName: string;
	username: string;
	evolutions: { fullName: string; pokemonId: number }[];
	pokemonImageUrl: string;
};

// Rendering context for the "raid" type (covers both egg and hatched-boss phases — see
// buildRaidContext in render.ts). No IV/CP/atk/def/sta fields — raid bosses don't have rollable
// IVs the way wild spawns do, so those tags simply don't exist here (this is the concrete case
// of "only show tags that make sense for this category").
export type RaidTemplateContext = {
	isEgg: boolean;
	gymId: string;
	gymName: string;
	gymUrl: string;
	teamId: RaidTeam;
	teamName: string;
	teamEmoji: string;
	level: number;
	levelName: string; // "Level 5", "Mega", "Legendary" etc. per known level->tier naming
	exRaidEligible: boolean;
	// Egg phase: pokemonName/type/moves/etc. are all empty/null (boss unknown yet).
	pokemonName: string;
	pokemonId: number;
	form: number;
	formName: string;
	costume: number;
	gender: string;
	genderValue: 1 | 2 | 3 | null;
	type1: string;
	type2: string;
	type1Emoji: string;
	type2Emoji: string;
	quickMove: string;
	chargeMove: string;
	quickMoveEmoji: string;
	chargeMoveEmoji: string;
	shinyRatePercent: string;
	shinyRateFraction: string;
	shinyRateReduced: string;
	evolutions: { fullName: string; pokemonId: number }[];
	pokemonImageUrl: string;
	// Egg phase counts down to `hatchTime`; boss phase counts down to `raidEndTime`. Only one of
	// the two times is meaningful per phase, but both fields are always present (empty string for
	// the inapplicable one) so a template doesn't need an {{#if isEgg}} just to pick the label.
	hatchTime: string;
	raidEndTime: string;
	despawnUnix: number; // hatch time (egg) or raid end time (boss), whichever is upcoming
	minutesLeft: number;
	latitude: number;
	longitude: number;
	googleMapsUrl: string;
	appleMapsUrl: string;
	wazeMapUrl: string;
	mapImageUrl: string;
	diademUrl: string;
};

// Rendering context for the "maxbattle" type — a Dynamax/Gigantamax battle station. No egg
// phase (the webhook always carries whatever boss info is currently known) and no IV/CP fields,
// same reasoning as raids.
export type MaxBattleTemplateContext = {
	stationId: string;
	stationName: string;
	level: number;
	gmax: boolean; // derived server-side, not a raw Golbat field — see buildMaxBattleContext
	gmaxYesNo: string;
	pokemonName: string;
	pokemonId: number;
	form: number;
	formName: string;
	type1: string;
	type2: string;
	type1Emoji: string;
	type2Emoji: string;
	quickMove: string;
	chargeMove: string;
	quickMoveEmoji: string;
	chargeMoveEmoji: string;
	shinyRatePercent: string;
	shinyRateFraction: string;
	shinyRateReduced: string;
	evolutions: { fullName: string; pokemonId: number }[];
	pokemonImageUrl: string;
	battleEndTime: string;
	despawnUnix: number;
	minutesLeft: number;
	latitude: number;
	longitude: number;
	googleMapsUrl: string;
	appleMapsUrl: string;
	wazeMapUrl: string;
	mapImageUrl: string;
	diademUrl: string;
};
