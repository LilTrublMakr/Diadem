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

function normAndAggregate<T extends { form: number }>(
	rows: T[],
	pokemonId: number,
	groupKey: (r: T) => string,
	merge: (a: T, b: T) => T
): T[] {
	const map = new Map<string, T>();
	for (const r of norm(rows, pokemonId)) {
		const k = groupKey(r);
		const existing = map.get(k);
		map.set(k, existing ? merge(existing, r) : r);
	}
	return [...map.values()];
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
			summary: normAndAggregate(summary, pokemonId,
				r => `${r.form}-${r.time_slot}`,
				(a, b) => ({
					...a,
					total_count: (Number(a.total_count) + Number(b.total_count)).toString(),
					shiny_count: (Number(a.shiny_count) + Number(b.shiny_count)).toString(),
					event_count: (Number(a.event_count) + Number(b.event_count)).toString(),
					ditto_count: (Number(a.ditto_count) + Number(b.ditto_count)).toString(),
				})
			),
			ivDist: normAndAggregate(ivDist, pokemonId,
				r => `${r.form}-${r.time_slot}-${r.iv}`,
				(a, b) => ({ ...a, count: (Number(a.count) + Number(b.count)).toString() })
			),
			moveStats: normAndAggregate(moveStats, pokemonId,
				r => `${r.form}-${r.time_slot}-${r.move_1}-${r.move_2}`,
				(a, b) => ({ ...a, count: (Number(a.count) + Number(b.count)).toString() })
			),
			sizeStats: normAndAggregate(sizeStats, pokemonId,
				r => `${r.form}-${r.time_slot}-${r.size}`,
				(a, b) => ({ ...a, count: (Number(a.count) + Number(b.count)).toString() })
			),
			genderStats: normAndAggregate(genderStats, pokemonId,
				r => `${r.form}-${r.time_slot}-${r.gender}`,
				(a, b) => ({ ...a, count: (Number(a.count) + Number(b.count)).toString() })
			),
		} satisfies PokemonDetailResponse);
	} catch (e) {
		console.error(`[pokedex API] Query failed for id=${pokemonId}:`, e);
		throw error(500, 'Failed to query pokemon stats');
	}
};
