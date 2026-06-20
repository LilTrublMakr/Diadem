import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export type PogoEvent = {
	eventID: string;
	name: string;
	eventType: string;
	heading: string;
	link: string;
	image: string;
	start: string;
	end: string;
	extraData: Record<string, unknown>;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: { data: PogoEvent[]; ts: number } | null = null;

export const GET: RequestHandler = async () => {
	const now = Date.now();
	if (cache && now - cache.ts < CACHE_TTL_MS) {
		return json(cache.data);
	}

	let events: PogoEvent[];
	try {
		const res = await fetch(
			'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/refs/heads/data/events.json'
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		events = await res.json();
	} catch (e) {
		console.error('[events API]', e);
		if (cache) return json(cache.data);
		throw error(502, 'Failed to fetch events from ScrapedDuck');
	}

	const filtered = events.filter(e => e.eventID !== 'example_event');
	cache = { data: filtered, ts: now };
	return json(filtered);
};
