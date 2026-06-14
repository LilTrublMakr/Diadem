import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRotomStatus } from '$lib/server/api/rotomStatus';

export const GET: RequestHandler = async () => {
	try {
		const status = await getRotomStatus();
		return json({ status });
	} catch (e) {
		console.error('[workers API] Rotom /api/status failed:', e);
		throw error(500, 'Failed to fetch worker status from Rotom');
	}
};
