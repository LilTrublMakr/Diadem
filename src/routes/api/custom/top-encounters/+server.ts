import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryStats } from '@/lib/server/db/stats';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type SummaryRow = {
	pokemon_id: number;
	form: number;
	total_count: string;
};

export type TopEncounter = {
	pokemon_id: number;
	form: number;
	name: string;
	count: number;
	last_seen?: number;
};

export type TopEncountersResponse = {
	h24: TopEncounter[];
	rarest24h: TopEncounter[];
};

function buildList(rows: SummaryRow[]): TopEncounter[] {
	return rows.map((row) => {
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
		return { pokemon_id: row.pokemon_id, form, name, count: Number(row.total_count) };
	});
}

export const GET: RequestHandler = async () => {
	let rows24h: SummaryRow[], rows7d: SummaryRow[];
	try {
		[rows24h, rows7d] = await Promise.all([
			queryStats<SummaryRow[]>(`
				SELECT pokemon_id, form, total_count
				FROM pokemon_summary
				WHERE time_slot = '1d'
				ORDER BY total_count DESC
				LIMIT 10
			`),
			queryStats<SummaryRow[]>(`
				SELECT pokemon_id, form, total_count
				FROM pokemon_summary
				WHERE time_slot = '1d' AND total_count > 0
				ORDER BY total_count ASC
				LIMIT 10
			`)
		]);
	} catch (e) {
		console.error('[top-encounters API] Query failed:', e);
		throw error(500, 'Failed to query top encounters');
	}

	await masterfileProvider.get();

	return json({
		h24: buildList(rows24h),
		rarest24h: buildList(rows7d)
	} satisfies TopEncountersResponse);
};
