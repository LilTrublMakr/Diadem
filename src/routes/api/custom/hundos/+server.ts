import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryStats } from '@/lib/server/db/stats';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type HundoRow = {
	pokemon_id: number;
	form: number;
	count: string;
};

export type RecentHundo = {
	pokemon_id: number;
	form: number;
	name: string;
	count: number;
};

export const GET: RequestHandler = async () => {
	let rows: HundoRow[];
	try {
		rows = await queryStats<HundoRow[]>(`
			SELECT pokemon_id, form, \`count\`
			FROM pokemon_iv_distribution
			WHERE time_slot = '1d' AND iv = 100.0
			ORDER BY \`count\` DESC
			LIMIT 10
		`);
	} catch (e) {
		console.error('[hundos API] Query failed:', e);
		throw error(500, 'Failed to query hundos');
	}

	await masterfileProvider.get();

	const hundos: RecentHundo[] = rows.map((row) => {
		const form = getNormalizedForm(row.pokemon_id, row.form);
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
		return { pokemon_id: row.pokemon_id, form, name, count: Number(row.count) };
	});

	return json(hundos);
};
