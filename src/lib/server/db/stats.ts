import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';

const pool = mysql.createPool({
	host: env.STATS_DB_HOST ?? '127.0.0.1',
	port: Number(env.STATS_DB_PORT ?? 3306),
	user: env.STATS_DB_USER ?? '',
	password: env.STATS_DB_PASSWORD ?? '',
	database: env.STATS_DB_NAME ?? 'pokemon_stats',
	waitForConnections: true,
	connectionLimit: 5
});

export async function queryStats<T = unknown[]>(sql: string, values?: unknown[]): Promise<T> {
	const [rows] = await pool.execute(sql, values);
	return rows as T;
}
