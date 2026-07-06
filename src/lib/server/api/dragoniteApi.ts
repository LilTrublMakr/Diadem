import { getServerConfig } from "@/lib/services/config/config.server";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("dragonite");

function getHeaders() {
	const headers: HeadersInit = {
		"Content-Type": "application/json"
	};
	if (getServerConfig().dragonite.secret) {
		headers["X-Dragonite-Admin-Secret"] = getServerConfig().dragonite.secret ?? "";
	}
	if (getServerConfig().dragonite.basicAuth) {
		headers["Authorization"] = `Basic ${btoa(getServerConfig().dragonite.basicAuth ?? "")}`;
	}
	return headers;
}

function getBaseUrl() {
	const { url, adminUrl } = getServerConfig().dragonite;
	return adminUrl ?? url;
}

export async function addScoutEntries(username: string, locations: number[][]) {
	const url = new URL("scout/v2", getBaseUrl());

	const requestData = {
		username,
		locations,
		options: {
			routes: true,
			showcases: true,
			pokemon: true,
			gmf: true
		}
	};

	const response = await fetch(url, {
		headers: { ...getHeaders(), "Content-Type": "application/json" },
		method: "POST",
		body: JSON.stringify(requestData)
	});

	if (!response.ok) {
		log.error("Error while queueing scout entry [%d] %s", response.status, await response.text());
	}

	return response.ok;
}

export async function getScoutQueue(): Promise<number | undefined> {
	const url = new URL("scout/queue", getBaseUrl());
	const response = await fetch(url, { headers: getHeaders() });

	if (response.ok) {
		const data = await response.json();
		return data?.queue ?? undefined;
	} else {
		log.error(
			"Error while getting scout queue size [%d] %s",
			response.status,
			await response.text()
		);
	}
}
