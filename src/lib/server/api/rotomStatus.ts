import { getServerConfig } from '$lib/services/config/config.server';

export interface RotomController {
	id: string;
	uuid?: string;
	user_agent?: string;
	weight?: number;
	account_username?: string;
	account_source?: string;
	connected_at_ms?: number;
	message_last_received_at_ms?: number;
	messages_received?: number;
	bytes_received?: number;
	message_last_sent_at_ms?: number;
	messages_sent?: number;
	bytes_sent?: number;
}

export interface RotomWorkerSession {
	connected_at_ms?: number;
	message_last_received_at_ms?: number;
	messages_received?: number;
	bytes_received?: number;
	message_last_sent_at_ms?: number;
	messages_sent?: number;
	bytes_sent?: number;
	controller?: RotomController;
}

export interface RotomTimeWindowedStats {
	requests_rate_over_30_seconds?: number;
	requests_rate_over_1_min?: number;
	requests_rate_over_5_min?: number;
	requests_rate_over_15_min?: number;
	request_ms_avg_over_30_seconds?: number;
	request_ms_avg_over_1_min?: number;
	request_ms_avg_over_5_min?: number;
	request_ms_avg_over_15_min?: number;
}

export interface RotomWorker {
	id: string;
	device_id?: string;
	origin?: string;
	version_code?: number;
	version_name?: string;
	user_agent?: string;
	last_connected_at_ms?: number;
	last_seen_at_ms?: number;
	is_connected: boolean;
	is_in_use?: boolean;
	platform?: string;
	weight?: number;
	can_be_used?: boolean;
	session?: RotomWorkerSession;
	time_windowed_stats?: RotomTimeWindowedStats;
}

export interface RotomDevice {
	id: string;
	origin?: string;
	version?: string;
	public_ip?: string;
	worker_count?: number;
	worker_in_use_count?: number;
	last_connected_at_ms?: number;
	last_seen_at_ms?: number;
	enabled?: boolean;
	is_connected: boolean;
	can_be_used?: boolean;
	is_in_use?: boolean;
	workers: RotomWorker[];
}

export interface RotomStatus {
	devices: RotomDevice[];
	controllers?: RotomController[];
}

function getHeaders(): HeadersInit {
	const config = getServerConfig().rotom;
	const headers: HeadersInit = {};
	if (config?.secret) {
		headers['X-Rotom-Secret'] = config.secret;
	}
	return headers;
}

export async function getRotomStatus(): Promise<RotomStatus> {
	const config = getServerConfig().rotom;
	if (!config?.url) throw new Error('Rotom URL not configured');
	const res = await fetch(new URL('api/status', config.url), {
		headers: getHeaders(),
		signal: AbortSignal.timeout(10000)
	});
	if (!res.ok) throw new Error(`Rotom /api/status returned ${res.status}`);
	return res.json();
}
