import { browser } from "$app/environment";
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
import {
	FiltersetGymPlainSchema,
	FiltersetInvasionSchema,
	FiltersetLureSchema,
	FiltersetMaxBattleSchema,
	FiltersetPokemonSchema,
	FiltersetPokestopPlainSchema,
	FiltersetQuestSchema,
	FiltersetRaidSchema,
	FiltersetStationPlainSchema
} from "@/lib/features/filters/filtersetSchemas";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getConfig } from "@/lib/services/config/config";
import type { DefaultFilters } from "@/lib/services/config/configTypes";
import type { AnySearchEntry } from "@/lib/services/search.svelte";
import { getDefaultMapStyle } from "@/lib/services/themeMode";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte.js";
import { getDefaultGymFilter } from "@/lib/utils/gymUtils";
import { getDefaultPokestopFilter } from "@/lib/utils/pokestopUtils";
import { getDefaultStationFilter } from "@/lib/utils/stationUtils";

export type UiconSetUS = {
	id: string;
	url: string;
};

export enum ExternalMapProvider {
	GOOGLE = "google",
	APPLE = "apple"
}

type ActionState = {
	expanded: boolean;
	dimmed: {
		mapIds: string[];
	};
	radius: {
		mapIds: string[];
		all: boolean;
		extraRadius: boolean;
	};
	timer: {
		mapIds: string[];
		all: boolean;
	};
};

type LegacyUserSettings = Partial<UserSettings> & {
	expandedMapObjects?: MapObjectType[];
};

export type UserSettings = {
	mapPosition: {
		center: {
			lat: number;
			lng: number;
		};
		zoom: number;
	};
	mapStyle: {
		id: string;
		url: string;
	};
	uiconSet: {
		pokemon: UiconSetUS;
		pokestop: UiconSetUS;
		gym: UiconSetUS;
		station: UiconSetUS;
		tappable: UiconSetUS;
	};
	isLeftHanded: boolean;
	themeMode: "dark" | "light" | "system";
	loadMapObjectsWhileMoving: boolean;
	loadMapObjectsPadding: number;
	showDebugMenu: boolean;
	enableRotatePitch: boolean;
	mapIconSize: number;
	externalMapProvider: ExternalMapProvider;
	filters: {
		pokemon: FilterPokemon;
		pokestop: FilterPokestop;
		gym: FilterGym;
		station: FilterStation;
		s2cell: FilterS2Cell;
		nest: FilterNest;
		spawnpoint: FilterSpawnpoint;
		route: FilterRoute;
		tappable: FilterTappable;
	};
	actions: Record<MapObjectType, ActionState>;
	recentSearches: AnySearchEntry[];
};

function defaultActionState(): ActionState {
	return {
		expanded: false,
		dimmed: {
			mapIds: []
		},
		radius: {
			mapIds: [],
			all: false,
			extraRadius: false
		},
		timer: {
			mapIds: [],
			all: false
		}
	};
}

export function getDefaultUserSettings(): UserSettings {
	const general = getConfig().general;
	const defaultMapStyle = getDefaultMapStyle();

	const baseFilters: UserSettings["filters"] = {
		pokemon: { category: "pokemon", ...defaultFilter() },
		pokestop: getDefaultPokestopFilter(),
		gym: getDefaultGymFilter(),
		station: getDefaultStationFilter(),
		s2cell: {
			category: "s2cell",
			enabled: false,
			level: 14,
			wayfarerMode: false
		},
		nest: { category: "nest", ...defaultFilter() },
		spawnpoint: { category: "spawnpoint", ...defaultFilter() },
		route: { category: "route", ...defaultFilter() },
		tappable: { category: "tappable", ...defaultFilter() }
	};

	const configFilters = getConfig().defaultFilters;
	const filters = configFilters
		? (deepMerge(baseFilters, normalizeConfigFilters(configFilters)) as UserSettings["filters"])
		: baseFilters;

	return {
		mapPosition: {
			center: {
				lat: general.defaultLat ?? 51.516855,
				lng: general.defaultLon ?? -0.0805
			},
			zoom: general.defaultZoom ?? 15
		},
		mapStyle: {
			id: defaultMapStyle.id,
			url: defaultMapStyle.url
		},
		uiconSet: {
			pokemon: getDefaultIconSet(MapObjectType.POKEMON),
			pokestop: getDefaultIconSet(MapObjectType.POKESTOP),
			gym: getDefaultIconSet(MapObjectType.GYM),
			station: getDefaultIconSet(MapObjectType.STATION),
			tappable: getDefaultIconSet(MapObjectType.TAPPABLE)
		},
		isLeftHanded: false,
		themeMode: "system",
		loadMapObjectsWhileMoving: false,
		loadMapObjectsPadding: 20,
		showDebugMenu: false,
		enableRotatePitch: true,
		mapIconSize: 1,
		externalMapProvider: ExternalMapProvider.GOOGLE,
		filters,
		actions: Object.fromEntries(
			Object.values(MapObjectType).map((type) => [type, defaultActionState()])
		) as UserSettings["actions"],
		recentSearches: []
	};
}

export function defaultFilter(enabled: boolean = false) {
	return {
		enabled,
		filters: []
	};
}

const filtersetSchemas: Record<string, { safeParse: (v: unknown) => { success: boolean } }> = {
	pokemon: FiltersetPokemonSchema,
	pokestopPlain: FiltersetPokestopPlainSchema,
	quest: FiltersetQuestSchema,
	invasion: FiltersetInvasionSchema,
	lure: FiltersetLureSchema,
	gymPlain: FiltersetGymPlainSchema,
	raid: FiltersetRaidSchema,
	stationPlain: FiltersetStationPlainSchema,
	maxBattle: FiltersetMaxBattleSchema
};

function normalizeFilterset(
	category: string,
	index: number,
	raw: Record<string, any>
): Record<string, any> | undefined {
	const { title, emoji, uicon, id, icon, enabled, ...rest } = raw;

	const normalized: Record<string, any> = {
		id: id ?? `default-${category}-${index}`,
		enabled: enabled ?? true,
		title: typeof title === "string" ? { message: title } : (title ?? { message: "" }),
		icon: icon ? { ...icon } : { isUserSelected: false },
		...rest
	};
	if (emoji) normalized.icon.emoji = emoji;
	if (uicon) normalized.icon.uicon = uicon;

	const schema = filtersetSchemas[category];
	if (schema && !schema.safeParse(normalized).success) {
		console.warn(`Ignoring invalid default filter in category "${category}":`, raw);
		return undefined;
	}

	return normalized;
}

function normalizeConfigFilters(configFilters: DefaultFilters): Record<string, any> {
	function walk(node: Record<string, any>, category: string): Record<string, any> {
		const result: Record<string, any> = {};
		for (const key in node) {
			const value = node[key];
			if (key === "filters" && Array.isArray(value)) {
				result[key] = value
					.map((entry, index) => normalizeFilterset(category, index, entry))
					.filter((entry): entry is Record<string, any> => entry !== undefined);
			} else if (value && typeof value === "object" && !Array.isArray(value)) {
				result[key] = walk(value, key);
			} else {
				result[key] = value;
			}
		}
		return result;
	}

	return walk(configFilters as Record<string, any>, "");
}

export function getDefaultIconSet(type: MapObjectType) {
	let iconSet = getConfig().uiconSets.find((s) => typeof s[type] === "object" && s[type]?.default);

	if (!iconSet) {
		iconSet = getConfig().uiconSets.find((s) => s.base?.default);
	}
	if (!iconSet) {
		iconSet = getConfig().uiconSets[0];
	}

	return {
		id: iconSet.id,
		url: iconSet.url
	};
}

// @ts-ignore
let userSettings: UserSettings = $state({});

export async function getUserSettingsFromServer() {
	const response = await fetch("/api/user/settings");
	const dbUserSettings: { error?: string; result: UserSettings } = await response.json();

	// User has existing user settings, merge with defaults, then update
	if (!dbUserSettings.error && Object.keys(dbUserSettings.result).length > 0) {
		// TODO: only overwrite map position if current position is default
		setUserSettings(dbUserSettings.result);
		updateUserSettings();
	}
}

export function setUserSettings(newUserSettings: LegacyUserSettings) {
	const mergedUserSettings = deepMerge(getDefaultUserSettings(), newUserSettings);
	userSettings = migrateUserSettings(mergedUserSettings);
}

export function getUserSettings() {
	return userSettings;
}

export function updateUserSettings() {
	const overrides = computeOverrides(getDefaultUserSettings(), userSettings) ?? {};
	const serializedUserSettings = JSON.stringify(overrides);

	if (browser && window.localStorage) {
		localStorage.setItem("userSettings", serializedUserSettings);
	}

	if (getUserDetails().details) {
		fetch("/api/user/settings", { method: "POST", body: serializedUserSettings }).then();
	}
}

function deepMerge(defaultObj: { [key: string]: any }, newObj: { [key: string]: any }) {
	const result = { ...defaultObj };
	for (const key in newObj) {
		if (newObj[key] instanceof Object && !(newObj[key] instanceof Array) && key in defaultObj) {
			result[key] = deepMerge(defaultObj[key], newObj[key]);
		} else {
			result[key] = newObj[key];
		}
	}
	return result;
}

function isPlainObject(value: unknown): value is Record<string, any> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const key of keys) {
			if (!deepEqual(a[key], b[key])) return false;
		}
		return true;
	}
	return false;
}

function computeOverrides(defaults: any, current: any): any {
	if (isPlainObject(defaults) && isPlainObject(current)) {
		const result: Record<string, any> = {};
		for (const key in current) {
			const override = computeOverrides(defaults[key], current[key]);
			if (override !== undefined) result[key] = override;
		}
		return Object.keys(result).length > 0 ? result : undefined;
	}
	return deepEqual(defaults, current) ? undefined : current;
}

function migrateUserSettings(settings: LegacyUserSettings): UserSettings {
	if (settings.expandedMapObjects) {
		for (const objectType of settings.expandedMapObjects) {
			if (settings?.actions?.[objectType]) {
				settings.actions[objectType].expanded = true;
			}
		}
		delete settings.expandedMapObjects;
	}

	return settings as UserSettings;
}
