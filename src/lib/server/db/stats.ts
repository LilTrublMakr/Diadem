import mysql from 'mysql2/promise';
import {
	STATS_DB_HOST,
	STATS_DB_PORT,
	STATS_DB_USER,
	STATS_DB_PASSWORD,
	STATS_DB_NAME
} from '$env/static/private';

const pool = mysql.createPool({
	host: STATS_DB_HOST ?? '127.0.0.1',
	port: Number(STATS_DB_PORT ?? 3306),
	user: STATS_DB_USER ?? '',
	password: STATS_DB_PASSWORD ?? '',
	database: STATS_DB_NAME ?? 'pokemon_stats',
	waitForConnections: true,
	connectionLimit: 5
});

export async function queryStats<T = unknown[]>(sql: string, values?: unknown[]): Promise<T> {
	const [rows] = await pool.execute(sql, values);
	return rows as T;
}
