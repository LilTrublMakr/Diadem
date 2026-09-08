import { browser } from "$app/environment";
import { setConfig } from "@/lib/services/config/config";
import {
	getDefaultUserSettings,
	setUserSettings,
	updateUserSettings
} from "@/lib/services/userSettings.svelte";
import type { LayoutLoad } from "./$types";
import type { ClientConfig } from "@/lib/services/config/configTypes";
import { getHeaders, parseResponse } from "@/lib/utils/requests";

export const ssr = false;

export const load: LayoutLoad = async ({ fetch }) => {
	const configResponse = await fetch("/api/config", { headers: getHeaders() });
	setConfig(await parseResponse<ClientConfig>(configResponse));

	let rawUserSettings: string | null = null;
	if (browser && window.localStorage) {
		rawUserSettings = localStorage.getItem("userSettings");
	}

	if (rawUserSettings) {
		setUserSettings(JSON.parse(rawUserSettings));
	} else {
		setUserSettings(getDefaultUserSettings());
	}

	updateUserSettings();
};
