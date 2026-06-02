<script lang="ts">
	import type { DragoniteStatus, ScoutStats, DragoniteWorker } from '$lib/server/api/dragoniteStatus';

	const REFRESH_INTERVAL = 7;
	const MAX_WORKERS = 16;

	interface ApiResponse {
		status: DragoniteStatus | null;
		scout: ScoutStats | null;
	}

	let data = $state<ApiResponse | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let countdown = $state(REFRESH_INTERVAL);

	let allWorkers = $derived<DragoniteWorker[]>(
		data?.status?.areas.flatMap((a) => a.worker_managers.flatMap((wm) => wm.workers)) ?? []
	);
	let connectedCount = $derived(allWorkers.filter((w) => w.connection_status === 'Executing Worker').length);
	let disconnectedCount = $derived(allWorkers.length - connectedCount);
	let scoutQueue = $derived(
		data?.status?.queues?.find((q) => q.name === 'Scout')?.queue ?? data?.scout?.queue ?? 0
	);

	async function fetchWorkers() {
		countdown = REFRESH_INTERVAL;
		try {
			const res = await fetch('/api/custom/workers');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			data = await res.json();
			lastUpdated = new Date();
			fetchError = null;
		} catch (e) {
			fetchError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchWorkers();
		const fetchTimer = setInterval(fetchWorkers, REFRESH_INTERVAL * 1000);
		const tickTimer = setInterval(() => {
			countdown = Math.max(0, countdown - 1);
		}, 1000);
		return () => {
			clearInterval(fetchTimer);
			clearInterval(tickTimer);
		};
	});
</script>

<svelte:head>
	<title>Worker Status — PoGo Map VT</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">

	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Worker Status</h1>
		<div class="text-right text-sm text-zinc-500">
			{#if lastUpdated}
				<div>Updated {lastUpdated.toLocaleTimeString()}</div>
			{/if}
			<div class="flex items-center justify-end gap-1.5 mt-0.5">
				<span class="inline-block w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
				<span>Refreshing in {countdown}s</span>
			</div>
		</div>
	</div>

	<!-- Error banner -->
	{#if fetchError}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
			Failed to reach Dragonite API: {fetchError}
		</div>
	{/if}

	<!-- Summary cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Workers Allowed</div>
			<div class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{MAX_WORKERS}</div>
		</div>
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Connected</div>
			<div class="text-3xl font-bold text-green-600 dark:text-green-400">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{connectedCount}{/if}
			</div>
		</div>
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Disconnected</div>
			<div class="text-3xl font-bold text-red-600 dark:text-red-400">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{disconnectedCount}{/if}
			</div>
		</div>
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Scout Queue</div>
			<div class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{scoutQueue}{/if}
			</div>
		</div>
	</div>

</div>
