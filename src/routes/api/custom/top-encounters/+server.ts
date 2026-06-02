import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { query } from '@/lib/server/db/external/internalQuery';
import { masterfileProvider } from '@/lib/server/provider/masterfileProvider';
import { getMasterPokemon } from '@/lib/services/masterfile';
import { getNormalizedForm } from '@/lib/utils/pokemonUtils';

type EncounterRow = {
	pokemon_id: number;
	form: number;
	count: string;
	last_seen?: number;
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
	rarest7d: TopEncounter[];
};

async function fetchTop(intervalSecs: number, asc = false): Promise<EncounterRow[]> {
	if (asc) {
		return query<EncounterRow[]>(`
			SELECT * FROM (
				SELECT pokemon_id, form, COUNT(*) AS \`count\`, MAX(expire_timestamp) AS last_seen
				FROM pokemon
				WHERE expire_timestamp > UNIX_TIMESTAMP() - ?
				GROUP BY pokemon_id, form
				ORDER BY COUNT(*) ASC
				LIMIT 10
			) sub
			ORDER BY last_seen DESC
		`, [intervalSecs]);
	}
	return query<EncounterRow[]>(`
		SELECT pokemon_id, form, COUNT(*) AS \`count\`
		FROM pokemon
		WHERE expire_timestamp > UNIX_TIMESTAMP() - ?
		GROUP BY pokemon_id, form
		ORDER BY COUNT(*) DESC
		LIMIT 10
	`, [intervalSecs]);
}

function buildList(rows: EncounterRow[]): TopEncounter[] {
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
		return {
			pokemon_id: row.pokemon_id,
			form,
			name,
			count: Number(row.count),
			...(row.last_seen !== undefined ? { last_seen: row.last_seen } : {})
		};
	});
}

export const GET: RequestHandler = async () => {
	let rows24h: EncounterRow[], rows7d: EncounterRow[];
	try {
		[rows24h, rows7d] = await Promise.all([
			fetchTop(86400),
			fetchTop(604800, true)
		]);
	} catch (e) {
		console.error('[top-encounters API] Query failed:', e);
		throw error(500, 'Failed to query top encounters');
	}

	await masterfileProvider.get();

	return json({
		h24: buildList(rows24h),
		rarest7d: buildList(rows7d)
	} satisfies TopEncountersResponse);
};
