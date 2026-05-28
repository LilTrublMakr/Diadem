<script lang="ts">
	import type { DragoniteStatus, AccountStats, DragoniteWorker } from '../../api/custom/workers/+server';

	const REFRESH_INTERVAL = 7;

	interface ApiResponse {
		status: DragoniteStatus | null;
		accounts: AccountStats | null;
	}

	let data = $state<ApiResponse | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let countdown = $state(REFRESH_INTERVAL);

	// Flatten all workers across all areas
	let allWorkers = $derived<DragoniteWorker[]>(
		data?.status?.areas.flatMap((a) => a.workers) ?? []
	);
	let connectedCount = $derived(allWorkers.filter((w) => w.connected).length);
	let disconnectedCount = $derived(allWorkers.length - connectedCount);
	let scoutQueue = $derived(data?.status?.scout_queue ?? 0);

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

	function routeProgress(worker: DragoniteWorker): string | null {
		const ms = worker.mode_status;
		if (!ms || ms.route_points == null || ms.current_point == null) return null;
		const pct = Math.round((ms.current_point / ms.route_points) * 100);
		return `${ms.current_point} / ${ms.route_points} (${pct}%)`;
	}

	function sinceLastData(worker: DragoniteWorker): string {
		if (!worker.last_data) return '—';
		const secs = Math.floor(Date.now() / 1000) - worker.last_data;
		if (secs < 60) return `${secs}s ago`;
		if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
		return `${Math.floor(secs / 3600)}h ago`;
	}
</script>

<svelte:head>
	<title>Worker Status — PoGo Map VT</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 text-gray-100 p-6">
	<div class="max-w-6xl mx-auto">

		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<a href="/" class="text-sm text-gray-500 hover:text-gray-300 mb-1 inline-block">&larr; Home</a>
				<h1 class="text-2xl font-bold text-white">Worker Status</h1>
			</div>
			<div class="text-right text-sm text-gray-500">
				{#if lastUpdated}
					<div>Updated {lastUpdated.toLocaleTimeString()}</div>
				{/if}
				<div class="flex items-center justify-end gap-1.5 mt-0.5">
					<span class="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
					<span>Refreshing in {countdown}s</span>
				</div>
			</div>
		</div>

		<!-- Error banner -->
		{#if fetchError}
			<div class="mb-6 rounded-lg bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 text-sm">
				Failed to reach Dragonite API: {fetchError}
			</div>
		{/if}

		<!-- Summary cards -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Workers</div>
				<div class="text-3xl font-bold text-white">
					{#if loading}<span class="text-gray-600">—</span>{:else}{allWorkers.length}{/if}
				</div>
			</div>
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Connected</div>
				<div class="text-3xl font-bold text-green-400">
					{#if loading}<span class="text-gray-600">—</span>{:else}{connectedCount}{/if}
				</div>
			</div>
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Disconnected</div>
				<div class="text-3xl font-bold text-red-400">
					{#if loading}<span class="text-gray-600">—</span>{:else}{disconnectedCount}{/if}
				</div>
			</div>
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Scout Queue</div>
				<div class="text-3xl font-bold text-yellow-400">
					{#if loading}<span class="text-gray-600">—</span>{:else}{scoutQueue}{/if}
				</div>
			</div>
		</div>

		<!-- Account stats -->
		{#if data?.accounts}
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5 mb-6">
				<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account Stats</h2>
				<div class="flex flex-wrap gap-6">
					{#each Object.entries(data.accounts) as [key, val]}
						{#if val != null}
							<div>
								<div class="text-xs text-gray-600 capitalize mb-0.5">{key.replace(/_/g, ' ')}</div>
								<div class="text-xl font-bold
									{key === 'in_use' ? 'text-green-400' :
									key === 'cooldown' ? 'text-yellow-400' :
									key === 'banned' || key === 'invalid' ? 'text-red-400' :
									'text-gray-200'}">
									{val}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

		<!-- Areas + workers -->
		{#if loading}
			<div class="rounded-xl bg-gray-900 border border-gray-800 px-5 py-12 text-center text-gray-600">
				Loading...
			</div>
		{:else if !data?.status?.areas?.length}
			<div class="rounded-xl bg-gray-900 border border-gray-800 px-5 py-12 text-center text-gray-600">
				No areas returned from Dragonite.
			</div>
		{:else}
			<div class="space-y-5">
				{#each data.status.areas as area}
					<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">

						<!-- Area header -->
						<div class="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<span class="w-2 h-2 rounded-full {area.enabled ? 'bg-green-400' : 'bg-gray-600'}"></span>
								<h2 class="font-semibold text-gray-200">{area.name}</h2>
							</div>
							<span class="text-xs text-gray-600">
								{area.workers.filter((w) => w.connected).length} / {area.workers.length} connected
							</span>
						</div>

						{#if area.workers.length === 0}
							<div class="px-5 py-6 text-sm text-gray-700 text-center">No workers in this area.</div>
						{:else}
							<table class="w-full text-sm">
								<thead>
									<tr class="text-xs text-gray-600 uppercase tracking-wider border-b border-gray-800">
										<th class="text-left px-5 py-2.5">Worker</th>
										<th class="text-left px-5 py-2.5">Status</th>
										<th class="text-left px-5 py-2.5">Account</th>
										<th class="text-left px-5 py-2.5">Mode</th>
										<th class="text-left px-5 py-2.5">Route</th>
										<th class="text-left px-5 py-2.5">Last Data</th>
									</tr>
								</thead>
								<tbody>
									{#each area.workers as worker, i}
										<tr class="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors {i === area.workers.length - 1 ? 'border-b-0' : ''}">
											<td class="px-5 py-3 font-mono text-gray-200 text-xs">{worker.worker_name}</td>
											<td class="px-5 py-3">
												{#if worker.connected}
													<span class="inline-flex items-center gap-1.5">
														<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
														<span class="text-green-400 text-xs">Connected</span>
													</span>
												{:else}
													<span class="inline-flex items-center gap-1.5">
														<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
														<span class="text-red-400 text-xs">Offline</span>
													</span>
												{/if}
											</td>
											<td class="px-5 py-3 text-gray-400 font-mono text-xs">{worker.account_name ?? '—'}</td>
											<td class="px-5 py-3 text-gray-400 text-xs">{worker.current_mode ?? '—'}</td>
											<td class="px-5 py-3 text-gray-600 text-xs">{routeProgress(worker) ?? '—'}</td>
											<td class="px-5 py-3 text-gray-600 text-xs">{sinceLastData(worker)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				{/each}

				<!-- Unbound workers -->
				{#if data.status.unbound_workers?.length}
					<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
						<div class="px-5 py-3.5 border-b border-gray-800">
							<h2 class="font-semibold text-gray-200">Unbound Workers</h2>
						</div>
						<table class="w-full text-sm">
							<thead>
								<tr class="text-xs text-gray-600 uppercase tracking-wider border-b border-gray-800">
									<th class="text-left px-5 py-2.5">Mode</th>
									<th class="text-left px-5 py-2.5">Active</th>
									<th class="text-left px-5 py-2.5">Expected</th>
								</tr>
							</thead>
							<tbody>
								{#each data.status.unbound_workers as uw, i}
									<tr class="border-b border-gray-800/40 {i === (data.status.unbound_workers?.length ?? 0) - 1 ? 'border-b-0' : ''}">
										<td class="px-5 py-3 text-gray-300 text-xs">{uw.mode}</td>
										<td class="px-5 py-3 text-green-400 font-mono text-xs">{uw.active}</td>
										<td class="px-5 py-3 text-gray-500 font-mono text-xs">{uw.expected}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

	</div>
</div>
