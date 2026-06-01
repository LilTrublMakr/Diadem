import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWorkerStatus, getScoutStats } from '$lib/server/api/dragoniteStatus';

export const GET: RequestHandler = async () => {
	const [statusResult, scoutResult] = await Promise.allSettled([
		getWorkerStatus(),
		getScoutStats()
	]);

	if (statusResult.status === 'rejected') {
		console.error('[workers API] Dragonite /status/ failed:', statusResult.reason);
		throw error(500, 'Failed to fetch worker status from Dragonite');
	}

	return json({
		status: statusResult.value,
		scout: scoutResult.status === 'fulfilled' ? scoutResult.value : null
	});
};
