import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '@/lib/server/db/external/internalQuery';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type ShinyRow = {
	pokemon_id: number;
	form_id: number;
	shiny_24h: string;
	total_24h: string;
	shiny_7d: string;
	total_7d: string;
	shiny_1m: string;
	total_1m: string;
	shiny_3m: string;
	total_3m: string;
	shiny_6m: string;
	total_6m: string;
	shiny_all: string;
	total_all: string;
	shiny_custom?: string;
	total_custom?: string;
};

export type ShinyStat = {
	pokemon_id: number;
	form: number;
	name: string;
	last_seen: number;
	shiny_24h: number;
	total_24h: number;
	shiny_7d: number;
	total_7d: number;
	shiny_1m: number;
	total_1m: number;
	shiny_3m: number;
	total_3m: number;
	shiny_6m: number;
	total_6m: number;
	shiny_all: number;
	total_all: number;
	shiny_custom?: number;
	total_custom?: number;
};

export const GET: RequestHandler = async ({ url }) => {
	const customStart = url.searchParams.get('start');
	const customEnd = url.searchParams.get('end');
	const hasCustom = !!(customStart && customEnd);

	const customCols = hasCustom
		? `,
		SUM(CASE WHEN date >= ? AND date <= ? THEN \`count\` ELSE 0 END) AS shiny_custom,
		SUM(CASE WHEN date >= ? AND date <= ? THEN total ELSE 0 END) AS total_custom`
		: '';

	const values = hasCustom ? [customStart, customEnd, customStart, customEnd] : [];

	let rows: ShinyRow[];
	try {
		rows = await query<ShinyRow[]>(
			`SELECT
				pokemon_id,
				form_id,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)   THEN \`count\` ELSE 0 END) AS shiny_24h,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)   THEN total  ELSE 0 END) AS total_24h,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)   THEN \`count\` ELSE 0 END) AS shiny_7d,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)   THEN total  ELSE 0 END) AS total_7d,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)  THEN \`count\` ELSE 0 END) AS shiny_1m,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)  THEN total  ELSE 0 END) AS total_1m,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)  THEN \`count\` ELSE 0 END) AS shiny_3m,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)  THEN total  ELSE 0 END) AS total_3m,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY) THEN \`count\` ELSE 0 END) AS shiny_6m,
				SUM(CASE WHEN date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY) THEN total  ELSE 0 END) AS total_6m,
				SUM(\`count\`) AS shiny_all,
				SUM(total)    AS total_all
				${customCols}
			FROM pokemon_shiny_stats
			WHERE fence = 'world'
			GROUP BY pokemon_id, form_id
			HAVING SUM(\`count\`) > 0
			ORDER BY (SUM(\`count\`) / SUM(total)) DESC`,
			values
		);
	} catch (e) {
		console.error('[shiny API] Query failed:', e);
		throw error(500, 'Failed to query shiny stats');
	}

	type LastSeenRow = { pokemon_id: number; form: number; last_seen: number };
	let lastSeenRows: LastSeenRow[] = [];
	try {
		lastSeenRows = await query<LastSeenRow[]>(`
			SELECT pokemon_id, form, MAX(first_seen_timestamp) AS last_seen
			FROM pokemon
			WHERE first_seen_timestamp > UNIX_TIMESTAMP() - 15552000
			GROUP BY pokemon_id, form
		`);
	} catch {
		// non-fatal — last_seen will default to 0
	}

	const lastSeenMap = new Map<string, number>();
	for (const row of lastSeenRows) {
		const form = getNormalizedForm(row.pokemon_id, row.form);
		const key = `${row.pokemon_id}-${form}`;
		const existing = lastSeenMap.get(key) ?? 0;
		if (Number(row.last_seen) > existing) lastSeenMap.set(key, Number(row.last_seen));
	}

	await masterfileProvider.get();

	const stats: ShinyStat[] = rows.map((row) => {
		const form = getNormalizedForm(row.pokemon_id, row.form_id);
		const basePokemon = getMasterPokemon(row.pokemon_id);
		const baseName = basePokemon?.name ?? `#${row.pokemon_id}`;
		let name = baseName;
		if (form !== 0) {
			const formPokemon = getMasterPokemon(row.pokemon_id, form);
			const formName = formPokemon?.name;
			if (formName && formName !== baseName) {
				const suffix = formName.toLowerCase().endsWith('form') ? '' : ' Form';
				name = `${baseName} (${formName}${suffix})`;
			}
		}
		const stat: ShinyStat = {
			pokemon_id: row.pokemon_id,
			form,
			name,
			last_seen: lastSeenMap.get(`${row.pokemon_id}-${form}`) ?? 0,
			shiny_24h: Number(row.shiny_24h),
			total_24h: Number(row.total_24h),
			shiny_7d: Number(row.shiny_7d),
			total_7d: Number(row.total_7d),
			shiny_1m: Number(row.shiny_1m),
			total_1m: Number(row.total_1m),
			shiny_3m: Number(row.shiny_3m),
			total_3m: Number(row.total_3m),
			shiny_6m: Number(row.shiny_6m),
			total_6m: Number(row.total_6m),
			shiny_all: Number(row.shiny_all),
			total_all: Number(row.total_all)
		};
		if (hasCustom) {
			stat.shiny_custom = Number(row.shiny_custom ?? 0);
			stat.total_custom = Number(row.total_custom ?? 0);
		}
		return stat;
	});

	return json(stats);
};
