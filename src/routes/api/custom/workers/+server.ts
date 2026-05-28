import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWorkerStatus, getAccountStats } from '$lib/server/api/dragoniteStatus';

export { DragoniteWorker, DragoniteArea, DragoniteStatus, AccountStats } from '$lib/server/api/dragoniteStatus';

export const GET: RequestHandler = async () => {
	const [statusResult, accountsResult] = await Promise.allSettled([
		getWorkerStatus(),
		getAccountStats()
	]);

	if (statusResult.status === 'rejected') {
		console.error('[workers API] Dragonite /status/ failed:', statusResult.reason);
		throw error(500, 'Failed to fetch worker status from Dragonite');
	}

	return json({
		status: statusResult.value,
		accounts: accountsResult.status === 'fulfilled' ? accountsResult.value : null
	});
};
