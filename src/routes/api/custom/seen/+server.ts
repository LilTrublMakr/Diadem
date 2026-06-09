import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryStats } from '@/lib/server/db/stats';

export type SeenStats = {
	total: number;
};

export const GET: RequestHandler = async () => {
	let rows: { total: string }[];
	try {
		rows = await queryStats<{ total: string }[]>(`
			SELECT SUM(total_count) AS total
			FROM pokemon_summary
			WHERE time_slot = '1d'
		`);
	} catch (e) {
		console.error('[seen API] Query failed:', e);
		throw error(500, 'Failed to query seen stats');
	}

	return json({ total: Number(rows[0]?.total ?? 0) } satisfies SeenStats);
};
