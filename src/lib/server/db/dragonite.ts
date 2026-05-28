import mysql from 'mysql2/promise';

// Direct Dragonite DB connection — used for historical stats from `stats_workers`.
// Live worker status uses the Dragonite API instead (see $lib/server/api/dragoniteStatus.ts).
// Set DRAGONITE_DB_* in your .env file (see .env.example).
//
// stats_workers columns: datetime, drago_worker, mode, api_worker, loc_avg, loc_count,
// loc_success, mons_seen, mons_enc, stops, quests, distance, retries, timeElapsed,
// locationDelay, gmos, gmoInitialSuccess, gmo0fail–gmo8fail, gmoNoCell, gmoGivingUp, gmoDelay
const pool = mysql.createPool({
	host: process.env.DRAGONITE_DB_HOST ?? '127.0.0.1',
	port: Number(process.env.DRAGONITE_DB_PORT ?? 3306),
	user: process.env.DRAGONITE_DB_USER ?? '',
	password: process.env.DRAGONITE_DB_PASSWORD ?? '',
	database: process.env.DRAGONITE_DB_NAME ?? 'dragonite',
	waitForConnections: true,
	connectionLimit: 5
});

export async function queryDragonite<T = unknown[]>(
	sql: string,
	values?: unknown[]
): Promise<T> {
	const [rows] = await pool.execute(sql, values);
	return rows as T;
}
