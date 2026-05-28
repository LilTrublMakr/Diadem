import { getServerConfig } from '$lib/services/config/config.server';

export interface DragoniteWorker {
	worker_name: string;
	device_id?: string;
	last_data?: number;
	account_name?: string;
	current_mode?: string;
	mode_status?: {
		route_points?: number;
		current_point?: number;
		[key: string]: unknown;
	};
	connected?: boolean;
}

export interface DragoniteArea {
	name: string;
	enabled: boolean;
	workers: DragoniteWorker[];
}

export interface UnboundWorker {
	mode: string;
	expected: number;
	active: number;
}

export interface DragoniteStatus {
	areas: DragoniteArea[];
	unbound_workers?: UnboundWorker[];
	scout_queue?: number;
}

export interface AccountStats {
	total?: number;
	in_use?: number;
	cooldown?: number;
	banned?: number;
	invalid?: number;
	[key: string]: number | undefined;
}

function getHeaders(): HeadersInit {
	const headers: HeadersInit = {};
	const config = getServerConfig().dragonite;
	if (config.secret) {
		headers['X-Dragonite-Admin-Secret'] = config.secret;
	}
	if (config.basicAuth) {
		headers['Authorization'] = `Basic ${btoa(config.basicAuth)}`;
	}
	return headers;
}

export async function getWorkerStatus(): Promise<DragoniteStatus> {
	const { url } = getServerConfig().dragonite;
	const res = await fetch(new URL('status/', url), { headers: getHeaders() });
	if (!res.ok) throw new Error(`Dragonite /status/ returned ${res.status}`);
	return res.json();
}

export async function getAccountStats(): Promise<AccountStats> {
	const { url } = getServerConfig().dragonite;
	const res = await fetch(new URL('accounts/stats', url), { headers: getHeaders() });
	if (!res.ok) throw new Error(`Dragonite /accounts/stats returned ${res.status}`);
	return res.json();
}
