import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '@/lib/server/db/external/internalQuery';

export type SeenStats = {
	total: number;
};

export const GET: RequestHandler = async () => {
	let rows: { total: string }[];
	try {
		rows = await query<{ total: string }[]>(`
			SELECT SUM(CASE WHEN expire_timestamp > UNIX_TIMESTAMP() - 86400 THEN 1 ELSE 0 END) AS total
			FROM pokemon
		`);
	} catch (e) {
		console.error('[seen API] Query failed:', e);
		throw error(500, 'Failed to query seen stats');
	}

	return json({ total: Number(rows[0]?.total ?? 0) } satisfies SeenStats);
};
