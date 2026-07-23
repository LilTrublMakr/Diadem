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

// Phase 1 only supports "pokemon" — remaining Golbat event types (raid, quest, invasion,
// pokestop, gym_details, weather, fort_update, max_battle) are Phase 2 follow-up work.
export type NotificationType = "pokemon";

export type EmbedFieldTemplate = {
	name: string;
	value: string;
	inline: boolean;
};

export type EmbedTemplate = {
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

export type PokemonSubscriptionFilters = {
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
	// Optional area scope: "own" (default) = one of the user's own scan_area rows;
	// "koji" = a named Koji geofence ("coverage map" area); "notificationArea" = one of the
	// user's own notification-only areas (separate from scan_area). areaId is a scan_area.id,
	// Koji feature id, or notification_area.id depending on areaSource — three unrelated id spaces.
	areaSource?: "own" | "koji" | "notificationArea";
	areaId?: number;
};

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
	filters: PokemonSubscriptionFilters;
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
