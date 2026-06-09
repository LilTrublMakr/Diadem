import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryStats } from '@/lib/server/db/stats';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type SummaryRow = {
	time_slot: '1d' | '1w' | '1m' | '3m' | 'all';
	pokemon_id: number;
	form: number;
	total_count: string;
};

export type SeenStat = {
	pokemon_id: number;
	form: number;
	name: string;
	total_1d: number;
	total_1w: number;
	total_1m: number;
	total_3m: number;
	total_all: number;
};

export const GET: RequestHandler = async () => {
	let rows: SummaryRow[];
	try {
		rows = await queryStats<SummaryRow[]>(`
			SELECT time_slot, pokemon_id, form, total_count
			FROM pokemon_summary
			WHERE time_slot IN ('1d', '1w', '1m', '3m', 'all')
			  AND total_count > 0
			ORDER BY pokemon_id, form
		`);
	} catch (e) {
		console.error('[seen-species API] Query failed:', e);
		throw error(500, 'Failed to query seen species');
	}

	await masterfileProvider.get();

	const byKey = new Map<string, SeenStat>();

	for (const row of rows) {
		const form = getNormalizedForm(row.pokemon_id, row.form);
		const key = `${row.pokemon_id}-${form}`;

		if (!byKey.has(key)) {
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
			byKey.set(key, {
				pokemon_id: row.pokemon_id,
				form,
				name,
				total_1d: 0,
				total_1w: 0,
				total_1m: 0,
				total_3m: 0,
				total_all: 0,
			});
		}

		const stat = byKey.get(key)!;
		const total = Number(row.total_count);
		switch (row.time_slot) {
			case '1d':  stat.total_1d  = total; break;
			case '1w':  stat.total_1w  = total; break;
			case '1m':  stat.total_1m  = total; break;
			case '3m':  stat.total_3m  = total; break;
			case 'all': stat.total_all = total; break;
		}
	}

	return json([...byKey.values()]);
};
