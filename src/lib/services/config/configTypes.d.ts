import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

import type { FeaturesKey } from "@/lib/utils/features";
import type {
	FilterGym,
	FilterNest,
	FilterPokemon,
	FilterPokestop,
	FilterRoute,
	FilterS2Cell,
	FilterSpawnpoint,
	FilterStation,
	FilterTappable
} from "@/lib/features/filters/filters";

type UiconSetModifiers = {
	default: boolean;
	scale?: number;
	offsetX?: number;
	offsetY?: number;
	name?: string;
	spacing?: number;
};

export type UiconSetModifierType =
	| MapObjectType
	| "quest"
	| "invasion"
	| "max_battle"
	| "raid_pokemon"
	| "raid_pokemon_6"
	| "raid_egg"
	| "raid_egg_6";

export type UiconSet = {
	id: string;
	name: string;
	url: string;
	base: UiconSetModifiers | undefined;
} & {
	[key in UiconSetModifierType]: UiconSetModifiers | boolean | undefined;
};

type General = {
	mapName: string;
	defaultLocale: string;
	customHome: boolean;
	filterCaretStyle?: "caret" | "chevron";
	defaultLat?: number;
	defaultLon?: number;
	defaultZoom?: number;
	minZoom?: number;
	maxZoom?: number;
	url?: string;
	image?: string;
	description?: string;
	allowCrawlers?: boolean;
	disallowedPaths?: string[];
};

export type DbCreds = {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
};

type Auth = {
	enabled: boolean;
	optional: boolean;
	secret?: string;
	baseUrl?: string;
	discord?: AuthDiscord;
};

type AuthDiscord = {
	clientId: string;
	clientSecret: string;
};

type ClientDiscord = {
	serverLink: string;
	serverId: string;
};

export type Permissions = {
	everyone?: boolean;
	loggedIn?: boolean;
	guildId?: string;
	roleId?: string;
	areas?: string[];
	features?: FeaturesKey[];
};

export type Log = {
	level: string;
	file?: string;
};

export type MapStyle = {
	id: string;
	name: string;
	url: string;
	default?: "dark" | "light";
	colors?: "dark" | "light";
	raster?: {
		min: number;
		max: number;
		tileSize: number;
	};
	attribution?: string;
};

type MapPositions = {
	styleLat: number;
	styleLon: number;
	styleZoom: number;
	coverageLat: number;
	coverageLon: number;
	coverageZoom: number;
	scoutLat: number;
	scoutLon: number;
	scoutZoom: number;
	coverageMapLat?: number;
	coverageMapLon?: number;
	coverageMapZoom?: number;
};

type StaticMap = {
	enabled: boolean;
	url: string;
	diademUrl: string;
	style?: string;
};

type DeepPartial<T> =
	T extends Array<infer U>
		? DeepPartial<U>[]
		: T extends object
			? { [K in keyof T]?: DeepPartial<T[K]> }
			: T;

export type DefaultFilters = DeepPartial<{
	pokemon: FilterPokemon;
	pokestop: FilterPokestop;
	gym: FilterGym;
	station: FilterStation;
	s2cell: FilterS2Cell;
	nest: FilterNest;
	spawnpoint: FilterSpawnpoint;
	route: FilterRoute;
	tappable: FilterTappable;
}>;

export type ClientConfig = {
	mapStyles: MapStyle[];
	uiconSets: UiconSet[];
	general: General;
	discord: ClientDiscord;
	mapPositions: MapPositions;
	tools: {
		showToolsMenu: boolean;
		coverageMap: boolean;
		scout: boolean;
	};
	defaultFilters?: DefaultFilters;
};

export type ServerConfig = {
	golbat: {
		url: string;
		auth?: string;
		secret?: string;
		defaultNestName?: string;
	};
	dragonite: {
		// TODO: this should be optional and scout disabled
		url: string;
		adminUrl?: string;
		secret?: string;
		basicAuth?: string;
	};
	rotom?: {
		url: string;
		secret?: string;
	};
	db: DbCreds;
	koji?: {
		url: string;
		secret: string;
		projectName: string;
	};
	nominatim?: {
		url: string;
		basicAuth?: string;
		userAgent?: string;
	};
	pelias?: {
		url: string;
		apiKey?: string;
		basicAuth?: string;
	};
	photon?: {
		url: string;
		basicAuth?: string;
		hasGeometries?: boolean;
	};
	log: Log;
	internalDb: DbCreds;
	auth: Auth;
	permissions?: Permissions[];
	staticMap?: StaticMap;
	limits?: {
		enableRateLimiting?: boolean;
		nonDeltaMultiplier?: number;
		heavyFilterMultiplier?: number;
		heavyFilterRatio?: number;
		captchaOnRateLimit?: boolean;
		captchaReward?: number;
	} & {
		[key in MapObjectType]?: {
			requestLimit?: number;
			rateLimit?: number;
			rateLimitTime?: number;
		};
	};
};

export type Config = {
	server: ServerConfig;
	client: ClientConfig;
};
