import mysql from 'mysql2/promise';

const pool = mysql.createPool({
	host: process.env.STATS_DB_HOST ?? '127.0.0.1',
	port: Number(process.env.STATS_DB_PORT ?? 3306),
	user: process.env.STATS_DB_USER ?? '',
	password: process.env.STATS_DB_PASSWORD ?? '',
	database: process.env.STATS_DB_NAME ?? 'pokemon_stats',
	waitForConnections: true,
	connectionLimit: 5
});

export async function queryStats<T = unknown[]>(sql: string, values?: unknown[]): Promise<T> {
	const [rows] = await pool.execute(sql, values);
	return rows as T;
}
