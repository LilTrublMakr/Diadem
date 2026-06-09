import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryStats } from '@/lib/server/db/stats';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type SummaryRow    = { form: number; time_slot: string; total_count: string; shiny_count: string; event_count: string; ditto_count: string };
type IvRow         = { form: number; time_slot: string; iv: number; count: string };
type MoveRow       = { form: number; time_slot: string; move_1: number; move_2: number; count: string };
type SizeRow       = { form: number; time_slot: string; size: number; count: string };
type GenderRow     = { form: number; time_slot: string; gender: number; count: string };

export type PokemonDetailResponse = {
	summary:    SummaryRow[];
	ivDist:     IvRow[];
	moveStats:  MoveRow[];
	sizeStats:  SizeRow[];
	genderStats: GenderRow[];
};

function norm<T extends { form: number }>(rows: T[], pokemonId: number): T[] {
	return rows.map((r) => ({ ...r, form: getNormalizedForm(pokemonId, r.form) }));
}

export const GET: RequestHandler = async ({ params }) => {
	const pokemonId = parseInt(params.id);
	if (isNaN(pokemonId) || pokemonId < 1 || pokemonId > 9999) throw error(400, 'Invalid pokemon ID');

	try {
		await masterfileProvider.get();

		const [summary, ivDist, moveStats, sizeStats, genderStats] = await Promise.all([
			queryStats<SummaryRow[]>(
				`SELECT form, time_slot, total_count, shiny_count, event_count, ditto_count
				 FROM pokemon_summary WHERE pokemon_id = ?`,
				[pokemonId]
			),
			queryStats<IvRow[]>(
				`SELECT form, time_slot, iv, \`count\`
				 FROM pokemon_iv_distribution WHERE pokemon_id = ?`,
				[pokemonId]
			),
			queryStats<MoveRow[]>(
				`SELECT form, time_slot, move_1, move_2, \`count\`
				 FROM pokemon_move_stats WHERE pokemon_id = ?
				 ORDER BY \`count\` DESC`,
				[pokemonId]
			),
			queryStats<SizeRow[]>(
				`SELECT form, time_slot, size, \`count\`
				 FROM pokemon_size_stats WHERE pokemon_id = ?`,
				[pokemonId]
			),
			queryStats<GenderRow[]>(
				`SELECT form, time_slot, gender, \`count\`
				 FROM pokemon_gender_stats WHERE pokemon_id = ?`,
				[pokemonId]
			),
		]);

		return json({
			summary:    norm(summary,    pokemonId),
			ivDist:     norm(ivDist,     pokemonId),
			moveStats:  norm(moveStats,  pokemonId),
			sizeStats:  norm(sizeStats,  pokemonId),
			genderStats: norm(genderStats, pokemonId),
		} satisfies PokemonDetailResponse);
	} catch (e) {
		console.error(`[pokemon API] Query failed for id=${pokemonId}:`, e);
		throw error(500, 'Failed to query pokemon stats');
	}
};
