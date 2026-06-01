import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '@/lib/server/db/external/internalQuery';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type RecentShinyRow = {
	pokemon_id: number;
	form: number;
	first_seen_timestamp: number;
	expire_timestamp: number;
};

export type RecentShiny = {
	pokemon_id: number;
	form: number;
	name: string;
	first_seen_timestamp: number;
	expire_timestamp: number;
};

export const GET: RequestHandler = async () => {
	let rows: RecentShinyRow[];
	try {
		rows = await query<RecentShinyRow[]>(`
			SELECT pokemon_id, form, first_seen_timestamp, expire_timestamp
			FROM pokemon
			WHERE shiny = 1
			  AND first_seen_timestamp > UNIX_TIMESTAMP() - 86400
			ORDER BY first_seen_timestamp DESC
			LIMIT 10
		`);
	} catch (e) {
		console.error('[recent-shinies API] Query failed:', e);
		throw error(500, 'Failed to query recent shinies');
	}

	await masterfileProvider.get();

	const shinies: RecentShiny[] = rows.map((row) => {
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
		return { pokemon_id: row.pokemon_id, form, name, first_seen_timestamp: row.first_seen_timestamp, expire_timestamp: row.expire_timestamp };
	});

	return json(shinies);
};
