<script lang="ts">
	import type { ShinyStat } from '../../routes/api/custom/shiny/+server';
import type { RecentHundo } from '../../routes/api/custom/hundos/+server';
	import type { SeenStats } from '../../routes/api/custom/seen/+server';
	import type { TopEncounter, TopEncountersResponse } from '../../routes/api/custom/top-encounters/+server';
	import { getIconPokemon } from '$lib/services/uicons.svelte';
	import { loadTrackers } from '$lib/features/trackerState.svelte';
	import NavBar from './NavBar.svelte';
	import Footer from './Footer.svelte';
	import TrackedPokemonImg from './TrackedPokemonImg.svelte';

	function shinySprite(pokemonId: number, form: number): string {
		try { return getIconPokemon({ pokemon_id: pokemonId, form, shiny: true }); } catch { return ''; }
	}
	function normalSprite(pokemonId: number, form: number): string {
		try { return getIconPokemon({ pokemon_id: pokemonId, form }); } catch { return ''; }
	}
	$effect(() => { loadTrackers(); });

	let shinyStats = $state<ShinyStat[] | null>(null);
	$effect(() => {
		fetch('/api/custom/shiny').then((r) => r.json()).then((d: ShinyStat[]) => (shinyStats = d)).catch(() => {});
	});

	let seenTotal = $state<number | null>(null);
	let seenError = $state(false);
	$effect(() => {
		fetch('/api/custom/seen')
			.then((r) => r.json())
			.then((d: SeenStats) => (seenTotal = d.total))
			.catch(() => (seenError = true));
	});


	let recentHundos = $state<RecentHundo[] | null>(null);
	let hundosError = $state(false);
	$effect(() => {
		fetch('/api/custom/hundos')
			.then((r) => r.json())
			.then((d: RecentHundo[]) => (recentHundos = d))
			.catch(() => (hundosError = true));
	});

	let topEncounters = $state<TopEncountersResponse | null>(null);
	let topError = $state(false);
	$effect(() => {
		fetch('/api/custom/top-encounters')
			.then((r) => r.json())
			.then((d: TopEncountersResponse) => (topEncounters = d))
			.catch(() => (topError = true));
	});

	function timeAgo(ts: number): string {
		const diff = Math.floor(Date.now() / 1000) - ts;
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function wilsonLowerBound(sh: number, total: number): number {
		if (total === 0 || sh === 0) return 0;
		const p = sh / total;
		const z = 1.96;
		const n = total;
		return (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n);
	}

	let best7d = $derived(
		(shinyStats ?? [])
			.filter((s) => s.shiny_1w > 0 && s.total_1w >= 100)
			.sort((a, b) => a.total_1w / a.shiny_1w - b.total_1w / b.shiny_1w)[0] ?? null
	);

	let top10Shiny = $derived(
		(shinyStats ?? [])
			.filter((s) => s.shiny_1w > 0 && s.total_1w >= 100)
			.sort((a, b) => wilsonLowerBound(b.shiny_1w, b.total_1w) - wilsonLowerBound(a.shiny_1w, a.total_1w))
			.slice(0, 10)
	);
</script>

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
					<a href="/pokemon/{best7d.pokemon_id}" class="flex items-center gap-2 mt-1">
						<TrackedPokemonImg pokemonId={best7d.pokemon_id} src={shinySprite(best7d.pokemon_id, best7d.form)} alt={best7d.name} class="w-8 h-8 object-contain" />
						<div>
							<div class="text-xl font-bold text-yellow-600 dark:text-yellow-400">
								1 in {Math.round(best7d.total_1w / best7d.shiny_1w).toLocaleString()}
								<span class="text-sm font-normal text-yellow-600/70 dark:text-yellow-600 ml-1">({((best7d.shiny_1w / best7d.total_1w) * 100).toFixed(2)}%)</span>
							</div>
							<div class="text-xs text-zinc-400 dark:text-zinc-600">{best7d.name}</div>
						</div>
					</a>
				{:else}
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{shinyStats ? '—' : '…'}</div>
					<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Shiny encounter rates per species</p>
				{/if}
			</div>

			<!-- Seen (24h) -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
				<div class="mb-1">
					<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Seen (24h)</div>
				</div>
				<div class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">
					{seenError ? '—' : seenTotal === null ? '…' : seenTotal.toLocaleString()}
				</div>
				<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-2">Total encounters in the last 24 hours · updated every 5 minutes</p>
			</div>

			<!-- Top encounter -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
				<div class="text-xs text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-1">Top Encounter (24h)</div>
				{#if topEncounters?.h24[0]}
					{@const top = topEncounters.h24[0]}
					<a href="/pokemon/{top.pokemon_id}" class="flex items-center gap-2 mt-1">
						<TrackedPokemonImg pokemonId={top.pokemon_id} src={normalSprite(top.pokemon_id, top.form)} alt={top.name} class="w-8 h-8 object-contain" />
						<div>
							<div class="text-xl font-bold text-zinc-800 dark:text-zinc-200">{top.count.toLocaleString()}</div>
							<div class="text-xs text-zinc-400 dark:text-zinc-600">{top.name}</div>
						</div>
					</a>
				{:else}
					<div class="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">{topEncounters ? '—' : '…'}</div>
					<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Most frequently seen species today</p>
				{/if}
			</div>
		</div>

		<!-- Recent Shinies + Recent Hundos -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

			<!-- Top Shiny Rates -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Top Shiny Rates <span class="text-zinc-400 dark:text-zinc-600 font-normal text-sm">7d</span></h2>
					<a href="/shiny" class="text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">All stats →</a>
				</div>
				{#if shinyStats === null}
					{@render emptyCard('Loading…')}
				{:else if top10Shiny.length === 0}
					{@render emptyCard('No shiny data yet.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each top10Shiny as s, i}
							<a href="/pokemon/{s.pokemon_id}" class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<span class="text-zinc-300 dark:text-zinc-700 text-xs w-4 text-right shrink-0">{i + 1}</span>
								<TrackedPokemonImg pokemonId={s.pokemon_id} src={shinySprite(s.pokemon_id, s.form)} alt={s.name} class="w-7 h-7 object-contain" />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{s.name}</span>
								<div class="text-xs font-mono text-right">
									<span class="text-zinc-800 dark:text-zinc-200">~1 in {Math.round(s.total_1w / s.shiny_1w).toLocaleString()}</span>
									<span class="text-zinc-400 dark:text-zinc-600"> · {((s.shiny_1w / s.total_1w) * 100).toFixed(2)}% {s.shiny_1w}/{s.total_1w.toLocaleString()}</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent Hundos -->
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
				<div class="px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-200 dark:border-zinc-700">
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Top Hundos <span class="text-zinc-400 dark:text-zinc-600 font-normal text-sm">24h</span></h2>
				</div>
				{#if hundosError}
					{@render emptyCard('Unable to load hundos.')}
				{:else if recentHundos === null}
					{@render emptyCard('Loading…')}
				{:else if recentHundos.length === 0}
					{@render emptyCard('No hundo data yet.')}
				{:else}
					<div class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
						{#each recentHundos as h, i}
							<a href="/pokemon/{h.pokemon_id}" class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<span class="text-zinc-300 dark:text-zinc-700 text-xs w-4 text-right shrink-0">{i + 1}</span>
								<TrackedPokemonImg pokemonId={h.pokemon_id} src={normalSprite(h.pokemon_id, h.form)} alt={h.name} class="w-7 h-7 object-contain" />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{h.name}</span>
								<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">{h.count.toLocaleString()}</span>
							</a>
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
							<a href="/pokemon/{p.pokemon_id}" class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<span class="text-zinc-300 dark:text-zinc-700 text-xs w-4 text-right shrink-0">{i + 1}</span>
								<TrackedPokemonImg pokemonId={p.pokemon_id} src={normalSprite(p.pokemon_id, p.form)} alt={p.name} class="w-7 h-7 object-contain" />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{p.name}</span>
								<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">{p.count.toLocaleString()}</span>
							</a>
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
							<a href="/pokemon/{p.pokemon_id}" class="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
								<TrackedPokemonImg pokemonId={p.pokemon_id} src={normalSprite(p.pokemon_id, p.form)} alt={p.name} class="w-7 h-7 object-contain" />
								<span class="text-sm flex-1 text-zinc-800 dark:text-zinc-200">{p.name}</span>
								<span class="text-zinc-400 dark:text-zinc-500 text-xs font-mono">{p.count.toLocaleString()}</span>
								{#if p.last_seen}
									<span class="text-zinc-400 dark:text-zinc-600 text-xs">{timeAgo(p.last_seen)}</span>
								{/if}
							</a>
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
					<h2 class="font-semibold text-zinc-800 dark:text-zinc-200">Recent Rare Encounters <span class="text-zinc-400 dark:text-zinc-600 font-normal text-sm">24h</span></h2>
				</div>
				{@render rarestList(topEncounters?.rarest24h ?? null, topError)}
			</div>

		</div>
	</section>

	<Footer />

</div>
