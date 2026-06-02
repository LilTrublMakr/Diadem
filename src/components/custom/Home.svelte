<script lang="ts">
	import type { ShinyStat } from '../../routes/api/custom/shiny/+server';
	import type { RecentShiny } from '../../routes/api/custom/recent-shinies/+server';
	import type { RecentHundo } from '../../routes/api/custom/hundos/+server';
	import type { SeenStats } from '../../routes/api/custom/seen/+server';
	import type { TopEncounter, TopEncountersResponse } from '../../routes/api/custom/top-encounters/+server';
	import { getIconPokemon } from '$lib/services/uicons.svelte';
	import { getUserDetails } from '$lib/services/user/userDetails.svelte';
	import NavBar from './NavBar.svelte';
	import Footer from './Footer.svelte';

	function shinySprite(pokemonId: number, form: number): string {
		try { return getIconPokemon({ pokemon_id: pokemonId, form, shiny: true }); } catch { return ''; }
	}
	function normalSprite(pokemonId: number, form: number): string {
		try { return getIconPokemon({ pokemon_id: pokemonId, form }); } catch { return ''; }
	}
	function timeAgo(ts: number): string {
		const secs = Math.floor(Date.now() / 1000) - ts;
		if (secs < 60) return `${secs}s ago`;
		if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
		if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
		return `${Math.floor(secs / 86400)}d ago`;
	}

	let user = $derived(getUserDetails().details);

	function isPageActive(): boolean {
		return document.visibilityState === 'visible' && document.hasFocus();
	}

	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => { if (isPageActive()) now = Date.now(); }, 5_000);
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
		fetch('/api/custom/shiny').then((r) => r.json()).then((d: ShinyStat[]) => (shinyStats = d)).catch(() => {});
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
				seenTotal = d.total; seenError = false; seenLastUpdated = Date.now();
			} catch { seenError = true; }
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
				recentShinies = await r.json(); recentError = false; recentLastUpdated = Date.now();
			} catch { recentError = true; }
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
				recentHundos = await r.json(); hundosError = false; hundosLastUpdated = Date.now();
			} catch { hundosError = true; }
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
	$effect(() => {
		fetch('/api/custom/top-encounters')
			.then((r) => r.json())
			.then((d: TopEncountersResponse) => (topEncounters = d))
			.catch(() => (topError = true));
	});

	let best7d = $derived(
		(shinyStats ?? [])
			.filter((s) => s.shiny_7d > 0 && s.total_7d >= 100)
			.sort((a, b) => a.total_7d / a.shiny_7d - b.total_7d / b.shiny_7d)[0] ?? null
	);
</script>

{#snippet liveTag(lastUpdated: number)}
	{#if isLive(lastUpdated)}
		<span class="inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-600">
			<span class="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
			Live
		</span>
	{:else if lastUpdated > 0}
		<span class="text-xs text-zinc-400 dark:text-zinc-600">Updated {updatedAgo(lastUpdated)}</span>
	{/if}
{/snippet}

{#snippet emptyCard(msg: string)}
	<div class="px-5 py-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">{msg}</div>
{/snippet}

<svelte:head>
	<title>PoGo Map VT</title>
</svelte:head>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">

	<NavBar />

	<!-- Hero -->
	<section class="max-w-6xl mx-auto px-6 pt-16 pb-12 w-full">
		<h1 class="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Vermont Pokémon GO Map</h1>
		<p class="text-zinc-500 dark:text-zinc-500 text-lg mb-8 max-w-xl">
			Live Pokémon GO tracking for Vermont — shiny rates, encounter stats, and real-time spawn data.
		</p>
		<div class="flex gap-3">
			<a href="/map" class="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-white text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium transition-colors">
				Open Map
			</a>
			<a href="/status" class="inline-flex items-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors">
				Worker Status
			</a>
		</div>
	</section>

	<!-- Stats grid -->
	<section class="max-w-6xl mx-auto px-6 pb-12 w-full">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">

			<!-- Best shiny rate -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
				<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Best Shiny Rate (7d)</div>
				{#if best7d}
					<div class="flex items-center gap-2 mt-1">
						<img src={shinySprite(best7d.pokemon_id, best7d.form)} alt={best7d.name} class="w-8 h-8 object-contain" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
						<div>
							<div class="text-xl font-bold text-yellow-600 dark:text-yellow-400">
								1 in {Math.round(best7d.total_7d / best7d.shiny_7d).toLocaleString()}
								<span class="text-sm font-normal text-yellow-600/70 dark:text-yellow-600 ml-1">({((best7d.shiny_7d / best7d.total_7d) * 100).toFixed(2)}%)</span>
							</div>
							<div class="text-xs text-zinc-400 dark:text-zinc-600">{best7d.name}</div>
						</div>
					</div>
				{:else}
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{shinyStats ? '—' : '…'}</div>
					<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Shiny encounter rates per species</p>
				{/if}
			</div>

			<!-- Seen (24h) -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
				<div class="flex items-center justify-between mb-1">
					<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Seen (24h)</div>
					{@render liveTag(seenLastUpdated)}
				</div>
				<div class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">
					{seenError ? '—' : seenTotal === null ? '…' : seenTotal.toLocaleString()}
				</div>
				<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-2">Total Pokémon sightings in the last 24 hours</p>
			</div>

			<!-- Top encounter -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
				<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Top Encounter (24h)</div>
				{#if topEncounters?.h24[0]}
					{@const top = topEncounters.h24[0]}
					<div class="flex items-center gap-2 mt-1">
						<img src={normalSprite(top.pokemon_id, top.form)} alt={top.name} class="w-8 h-8 object-contain" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
						<div>
							<div class="text-xl font-bold text-zinc-800 dark:text-zinc-200">{top.count.toLocaleString()}</div>
							<div class="text-xs text-zinc-400 dark:text-zinc-600">{top.name}</div>
						</div>
					</div>
				{:else}
					<div class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">{topEncounters ? '—' : '…'}</div>
					<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Most frequently seen species today</p>
				{/if}
			</div>
		</div>

		<!-- Recent Shinies + Recent Hundos -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

			<!-- Recent Shinies -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Recent Shinies</h2>
					{@render liveTag(recentLastUpdated)}
				</div>
				{#if recentError}
					{@render emptyCard('Unable to load recent shinies.')}
				{:else if recentShinies === null}
					{@render emptyCard('Loading…')}
				{:else if recentShinies.length === 0}
					{@render emptyCard('No shinies seen in the last 24 hours.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each recentShinies as s}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<img src={shinySprite(s.pokemon_id, s.form)} alt={s.name} class="w-7 h-7 object-contain shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{s.name}</span>
								<span class="text-zinc-400 dark:text-zinc-600 text-xs">{timeAgo(s.first_seen_timestamp)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Hundos -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Recent Hundos</h2>
					{@render liveTag(hundosLastUpdated)}
				</div>
				{#if hundosError}
					{@render emptyCard('Unable to load recent hundos.')}
				{:else if recentHundos === null}
					{@render emptyCard('Loading…')}
				{:else if recentHundos.length === 0}
					{@render emptyCard('No hundos seen in the last 24 hours.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each recentHundos as h}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<img src={normalSprite(h.pokemon_id, h.form)} alt={h.name} class="w-7 h-7 object-contain shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{h.name}</span>
								<span class="text-zinc-400 dark:text-zinc-600 text-xs">{timeAgo(h.first_seen_timestamp)}</span>
								{#if user}
									<a href="/pokemon/{h.id}" class="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs transition-colors" title="View on map">→ Map</a>
								{/if}
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
					{@render emptyCard('Unable to load encounters.')}
				{:else if list === null}
					{@render emptyCard('Loading…')}
				{:else if list.length === 0}
					{@render emptyCard('No data yet.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each list as p, i}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<span class="text-zinc-300 dark:text-zinc-700 text-xs w-4 text-right shrink-0">{i + 1}</span>
								<img src={normalSprite(p.pokemon_id, p.form)} alt={p.name} class="w-7 h-7 object-contain shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{p.name}</span>
								<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">{p.count.toLocaleString()}</span>
							</div>
						{/each}
					</div>
				{/if}
			{/snippet}

			{#snippet rarestList(list: TopEncounter[] | null, error: boolean)}
				{#if error}
					{@render emptyCard('Unable to load encounters.')}
				{:else if list === null}
					{@render emptyCard('Loading…')}
				{:else if list.length === 0}
					{@render emptyCard('No data yet.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each list as p}
							<div class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<img src={normalSprite(p.pokemon_id, p.form)} alt={p.name} class="w-7 h-7 object-contain shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{p.name}</span>
								<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">{p.count.toLocaleString()}</span>
								{#if p.last_seen}
									<span class="text-zinc-400 dark:text-zinc-600 text-xs">{timeAgo(p.last_seen)}</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/snippet}

			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Top Encounters <span class="text-zinc-400 dark:text-zinc-600 font-normal text-sm">24h</span></h2>
				</div>
				{@render encounterList(topEncounters?.h24 ?? null, topError)}
			</div>

			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Rarest Encounters <span class="text-zinc-400 dark:text-zinc-600 font-normal text-sm">7d</span></h2>
				</div>
				{@render rarestList(topEncounters?.rarest7d ?? null, topError)}
			</div>

		</div>
	</section>

	<Footer />

</div>
