<script lang="ts">
	import type { ShinyStat } from '../../routes/api/custom/shiny/+server';
	import type { RecentShiny } from '../../routes/api/custom/recent-shinies/+server';
	import type { RecentHundo } from '../../routes/api/custom/hundos/+server';
	import type { SeenStats } from '../../routes/api/custom/seen/+server';
	import type { TopEncounter, TopEncountersResponse } from '../../routes/api/custom/top-encounters/+server';
	import { getIconPokemon } from '$lib/services/uicons.svelte';

	function shinySprite(pokemonId: number, form: number): string {
		try {
			return getIconPokemon({ pokemon_id: pokemonId, form, shiny: true });
		} catch {
			return '';
		}
	}

	function normalSprite(pokemonId: number, form: number): string {
		try {
			return getIconPokemon({ pokemon_id: pokemonId, form });
		} catch {
			return '';
		}
	}

	function timeAgo(ts: number): string {
		const secs = Math.floor(Date.now() / 1000) - ts;
		if (secs < 60) return `${secs}s ago`;
		if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
		if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
		return `${Math.floor(secs / 86400)}d ago`;
	}

	const navLinks = [
		{ href: '/map', label: 'Map' },
		{ href: '/shiny', label: 'Shiny Stats' },
		{ href: '/status', label: 'Worker Status' }
	];

	function isPageActive(): boolean {
		return document.visibilityState === 'visible' && document.hasFocus();
	}

	// Ticker — refreshes every 5s while active so live/stale indicators stay accurate
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => {
			if (isPageActive()) now = Date.now();
		}, 5_000);
		return () => clearInterval(timer);
	});

	function isLive(lastUpdated: number): boolean {
		return lastUpdated > 0 && now - lastUpdated < 30_000;
	}

	function updatedAgo(lastUpdated: number): string {
		const secs = Math.floor((now - lastUpdated) / 1000);
		if (secs < 60) return `${secs}s ago`;
		if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
		return `${Math.floor(secs / 3600)}h ago`;
	}

	let shinyStats = $state<ShinyStat[] | null>(null);

	$effect(() => {
		fetch('/api/custom/shiny')
			.then((r) => r.json())
			.then((d: ShinyStat[]) => (shinyStats = d))
			.catch(() => {});
	});

	let seenTotal = $state<number | null>(null);
	let seenError = $state(false);
	let seenLastUpdated = $state(0);

	$effect(() => {
		async function fetchSeen() {
			if (!isPageActive()) return;
			try {
				const r = await fetch('/api/custom/seen');
				if (!r.ok) throw new Error();
				const d: SeenStats = await r.json();
				seenTotal = d.total;
				seenError = false;
				seenLastUpdated = Date.now();
			} catch {
				seenError = true;
			}
		}

		const onActive = () => fetchSeen();
		document.addEventListener('visibilitychange', onActive);
		window.addEventListener('focus', onActive);
		fetchSeen();
		const timer = setInterval(fetchSeen, 10_000);
		return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onActive); window.removeEventListener('focus', onActive); };
	});

	let recentShinies = $state<RecentShiny[] | null>(null);
	let recentError = $state(false);
	let recentLastUpdated = $state(0);

	$effect(() => {
		async function fetchRecent() {
			if (!isPageActive()) return;
			try {
				const r = await fetch('/api/custom/recent-shinies');
				if (!r.ok) throw new Error();
				recentShinies = await r.json();
				recentError = false;
				recentLastUpdated = Date.now();
			} catch {
				recentError = true;
			}
		}

		const onActive = () => fetchRecent();
		document.addEventListener('visibilitychange', onActive);
		window.addEventListener('focus', onActive);
		fetchRecent();
		const timer = setInterval(fetchRecent, 10_000);
		return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onActive); window.removeEventListener('focus', onActive); };
	});

	let recentHundos = $state<RecentHundo[] | null>(null);
	let hundosError = $state(false);
	let hundosLastUpdated = $state(0);

	$effect(() => {
		async function fetchHundos() {
			if (!isPageActive()) return;
			try {
				const r = await fetch('/api/custom/hundos');
				if (!r.ok) throw new Error();
				recentHundos = await r.json();
				hundosError = false;
				hundosLastUpdated = Date.now();
			} catch {
				hundosError = true;
			}
		}

		const onActive = () => fetchHundos();
		document.addEventListener('visibilitychange', onActive);
		window.addEventListener('focus', onActive);
		fetchHundos();
		const timer = setInterval(fetchHundos, 10_000);
		return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onActive); window.removeEventListener('focus', onActive); };
	});

	let topEncounters = $state<TopEncountersResponse | null>(null);
	let topError = $state(false);
	let topLastUpdated = $state(0);

	$effect(() => {
		async function fetchTop() {
			if (!isPageActive()) return;
			try {
				const r = await fetch('/api/custom/top-encounters');
				if (!r.ok) throw new Error();
				topEncounters = await r.json();
				topError = false;
				topLastUpdated = Date.now();
			} catch {
				topError = true;
			}
		}

		const onActive = () => fetchTop();
		document.addEventListener('visibilitychange', onActive);
		window.addEventListener('focus', onActive);
		fetchTop();
		const timer = setInterval(fetchTop, 60_000);
		return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onActive); window.removeEventListener('focus', onActive); };
	});

	let best7d = $derived(
		(shinyStats ?? [])
			.filter((s) => s.shiny_7d > 0 && s.total_7d >= 100)
			.sort((a, b) => a.total_7d / a.shiny_7d - b.total_7d / b.shiny_7d)[0] ?? null
	);
</script>

{#snippet liveTag(lastUpdated: number)}
	{#if isLive(lastUpdated)}
		<span class="inline-flex items-center gap-1.5 text-xs text-gray-600">
			<span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
			Live
		</span>
	{:else if lastUpdated > 0}
		<span class="text-xs text-gray-600">Updated {updatedAgo(lastUpdated)}</span>
	{/if}
{/snippet}

<svelte:head>
	<title>PoGo Map VT</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

	<!-- Nav -->
	<nav class="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
			<span class="font-bold text-white text-lg tracking-tight">PoGo Map VT</span>
			<div class="flex items-center gap-6 text-sm">
				{#each navLinks as link}
					<a href={link.href} class="text-gray-400 hover:text-white transition-colors">{link.label}</a>
				{/each}
			</div>
		</div>
	</nav>

	<!-- Hero -->
	<section class="max-w-6xl mx-auto px-6 pt-16 pb-12 w-full">
		<h1 class="text-4xl font-bold text-white mb-3">Vermont Pokémon GO Map</h1>
		<p class="text-gray-400 text-lg mb-8 max-w-xl">
			Live Pokémon GO tracking for Vermont — shiny rates, encounter stats, and real-time spawn data.
		</p>
		<div class="flex gap-3">
			<a href="/map" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-sm font-medium transition-colors">
				Open Map
			</a>
			<a href="/status" class="inline-flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2.5 text-sm font-medium transition-colors">
				Worker Status
			</a>
		</div>
	</section>

	<!-- Stats grid -->
	<section class="max-w-6xl mx-auto px-6 pb-12 w-full">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">

			<!-- Best shiny rate -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Best Shiny Rate (7d)</div>
				{#if best7d}
					<div class="flex items-center gap-2 mt-1">
						<img
							src={shinySprite(best7d.pokemon_id, best7d.form)}
							alt={best7d.name}
							class="w-8 h-8 object-contain"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
						/>
						<div>
							<div class="text-xl font-bold text-yellow-400">
								1 in {Math.round(best7d.total_7d / best7d.shiny_7d).toLocaleString()}
								<span class="text-sm font-normal text-yellow-600 ml-1">
									({((best7d.shiny_7d / best7d.total_7d) * 100).toFixed(2)}%)
								</span>
							</div>
							<div class="text-xs text-gray-500">{best7d.name}</div>
						</div>
					</div>
				{:else}
					<div class="text-2xl font-bold text-yellow-400 mt-1">{shinyStats ? '—' : '…'}</div>
					<p class="text-xs text-gray-600 mt-1">Shiny encounter rates per species</p>
				{/if}
			</div>

			<!-- Seen (24h) -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="flex items-center justify-between mb-1">
					<div class="text-xs text-gray-500 uppercase tracking-wider">Seen (24h)</div>
					{@render liveTag(seenLastUpdated)}
				</div>
				<div class="text-2xl font-bold text-blue-400 mt-1">
					{seenError ? '—' : seenTotal === null ? '…' : seenTotal.toLocaleString()}
				</div>
				<p class="text-xs text-gray-600 mt-2">Total Pokémon sightings in the last 24 hours</p>
			</div>

			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Top Encounter (24h)</div>
				{#if topEncounters?.h24[0]}
					{@const top = topEncounters.h24[0]}
					<div class="flex items-center gap-2 mt-1">
						<img
							src={normalSprite(top.pokemon_id, top.form)}
							alt={top.name}
							class="w-8 h-8 object-contain"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
						/>
						<div>
							<div class="text-xl font-bold text-green-400">{top.count.toLocaleString()}</div>
							<div class="text-xs text-gray-500">{top.name}</div>
						</div>
					</div>
				{:else}
					<div class="text-2xl font-bold text-green-400 mt-1">{topEncounters ? '—' : '…'}</div>
					<p class="text-xs text-gray-600 mt-1">Most frequently seen species today</p>
				{/if}
			</div>
		</div>

		<!-- Recent Shinies + Recent Hundos -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

			<!-- Recent Shinies -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Recent Shinies</h2>
					{@render liveTag(recentLastUpdated)}
				</div>
				{#if recentError}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Unable to load recent shinies.</div>
				{:else if recentShinies === null}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Loading…</div>
				{:else if recentShinies.length === 0}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">No shinies seen in the last 24 hours.</div>
				{:else}
					<div class="divide-y divide-gray-800/50">
						{#each recentShinies as s}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/20 transition-colors">
								<img
									src={shinySprite(s.pokemon_id, s.form)}
									alt={s.name}
									class="w-7 h-7 object-contain shrink-0"
									onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
								/>
								<span class="text-sm flex-1 text-gray-200">{s.name}</span>
								<span class="text-gray-600 text-xs">{timeAgo(s.first_seen_timestamp)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Hundos -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Recent Hundos</h2>
					{@render liveTag(hundosLastUpdated)}
				</div>
				{#if hundosError}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Unable to load recent hundos.</div>
				{:else if recentHundos === null}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Loading…</div>
				{:else if recentHundos.length === 0}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">No hundos seen in the last 24 hours.</div>
				{:else}
					<div class="divide-y divide-gray-800/50">
						{#each recentHundos as h}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/20 transition-colors">
								<img
									src={normalSprite(h.pokemon_id, h.form)}
									alt={h.name}
									class="w-7 h-7 object-contain shrink-0"
									onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
								/>
								<span class="text-sm flex-1 text-gray-200">{h.name}</span>
								<span class="text-gray-600 text-xs">{timeAgo(h.first_seen_timestamp)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

		</div>

		<!-- Top Encounters -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">

			{#snippet encounterList(list: TopEncounter[] | null, error: boolean)}
				{#if error}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Unable to load encounters.</div>
				{:else if list === null}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">Loading…</div>
				{:else if list.length === 0}
					<div class="px-5 py-8 text-center text-gray-700 text-sm">No data yet.</div>
				{:else}
					<div class="divide-y divide-gray-800/40">
						{#each list as p, i}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/20 transition-colors">
								<span class="text-gray-700 text-xs w-4 text-right shrink-0">{i + 1}</span>
								<img
									src={normalSprite(p.pokemon_id, p.form)}
									alt={p.name}
									class="w-7 h-7 object-contain shrink-0"
									onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
								/>
								<span class="text-sm flex-1 text-gray-200">{p.name}</span>
								<span class="text-gray-500 text-xs font-mono">{p.count.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				{/if}
			{/snippet}

			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Top Encounters <span class="text-gray-600 font-normal text-sm">24h</span></h2>
					{@render liveTag(topLastUpdated)}
				</div>
				{@render encounterList(topEncounters?.h24 ?? null, topError)}
			</div>

			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Rarest Encounters <span class="text-gray-600 font-normal text-sm">7d</span></h2>
					{@render liveTag(topLastUpdated)}
				</div>
				{@render encounterList(topEncounters?.rarest7d ?? null, topError)}
			</div>

		</div>
	</section>

	<!-- Footer -->
	<footer class="mt-auto border-t border-gray-800 bg-gray-900/40">
		<div class="max-w-6xl mx-auto px-6 py-4 text-xs text-gray-700 flex items-center justify-between">
			<span>PoGo Map VT — built on <a href="https://github.com/ccev/diadem" class="hover:text-gray-500 transition-colors">Diadem</a></span>
			<div class="flex gap-4">
				<a href="/shiny" class="hover:text-gray-500 transition-colors">Shiny Stats</a>
				<a href="/status" class="hover:text-gray-500 transition-colors">Worker Status</a>
			</div>
		</div>
	</footer>

</div>
