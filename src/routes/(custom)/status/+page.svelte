<script lang="ts">
	import type { RotomStatus, RotomWorker } from '$lib/server/api/rotomStatus';

	const REFRESH_INTERVAL = 7;

	interface ApiResponse {
		status: RotomStatus | null;
	}

	let data = $state<ApiResponse | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let countdown = $state(REFRESH_INTERVAL);

	let allWorkers = $derived<RotomWorker[]>(
		data?.status?.devices.flatMap((d) => d.workers) ?? []
	);
	let totalWorkers = $derived(
		data?.status?.devices.reduce((sum, d) => sum + (d.worker_count ?? 0), 0) ?? 0
	);
	let inUseCount = $derived(allWorkers.filter((w) => w.is_in_use).length);
	let availableCount = $derived(allWorkers.filter((w) => w.can_be_used && !w.is_in_use).length);

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
			Failed to reach Rotom API: {fetchError}
		</div>
	{/if}

	<!-- Summary cards -->
	<div class="grid grid-cols-3 gap-4 mb-8">
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Total Workers</div>
			<div class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{totalWorkers}{/if}
			</div>
		</div>
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">In Use</div>
			<div class="text-3xl font-bold text-green-600 dark:text-green-400">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{inUseCount}{/if}
			</div>
		</div>
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
			<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Available</div>
			<div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
				{#if loading}<span class="text-zinc-300 dark:text-zinc-700">—</span>{:else}{availableCount}{/if}
			</div>
		</div>
	</div>

</div>
