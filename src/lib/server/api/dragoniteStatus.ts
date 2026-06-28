import { getServerConfig } from '$lib/services/config/config.server';

export interface DragoniteWorker {
	worker_name: string;
	device_id?: string;
	last_data?: number;
	account_name?: string;
	current_mode?: string;
	mode_status?: {
		name?: string;
		total_route_points?: number;
		part_route_points?: number;
		route_pos?: number;
		current_route_time?: number;
		[key: string]: unknown;
	};
	connection_status?: string;
}

export interface WorkerManager {
	expected_workers: number;
	active_workers: number;
	workers: DragoniteWorker[];
}

export interface DragoniteArea {
	id: number;
	name: string;
	enabled: boolean;
	worker_managers: WorkerManager[];
}

export interface UnboundGroup {
	name: string;
	expected_workers: number;
	active_workers: number;
	workers: DragoniteWorker[];
}

export interface QueueEntry {
	name: string;
	queue: number;
}

export interface DragoniteStatus {
	areas: DragoniteArea[];
	unbounds?: UnboundGroup[];
	queues?: QueueEntry[];
}

export interface ScoutStats {
	queue?: number;
	[key: string]: unknown;
}

export interface AccountStats {
	[key: string]: unknown;
}

function fetchWithTimeout(url: URL, headers: HeadersInit, timeoutMs = 10000): Promise<Response> {
	return fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
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
	const { url, adminUrl } = getServerConfig().dragonite;
	const res = await fetchWithTimeout(new URL('status/', adminUrl ?? url), getHeaders());
	if (!res.ok) throw new Error(`Dragonite /status/ returned ${res.status}`);
	return res.json();
}

export async function getAccountStats(): Promise<AccountStats> {
	const { url, adminUrl } = getServerConfig().dragonite;
	const res = await fetchWithTimeout(new URL('accounts/stats', adminUrl ?? url), getHeaders());
	if (!res.ok) throw new Error(`Dragonite /accounts/stats returned ${res.status}`);
	return res.json();
}

export async function getScoutStats(): Promise<ScoutStats> {
	const { url, adminUrl } = getServerConfig().dragonite;
	const res = await fetchWithTimeout(new URL('scout/queue', adminUrl ?? url), getHeaders());
	if (!res.ok) throw new Error(`Dragonite /scout/queue returned ${res.status}`);
	return res.json();
}
