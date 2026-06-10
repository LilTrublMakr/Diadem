<script lang="ts">
	import type { ShinyStat } from '../../api/custom/shiny/+server';
	import { getIconPokemon } from '$lib/services/uicons.svelte';

	type PeriodKey = '1d' | '1w' | '1m' | '3m' | 'all';

	const PERIODS: { key: PeriodKey; label: string; min: number }[] = [
		{ key: '1d',  label: '1d',       min: 25  },
		{ key: '1w',  label: '7d',       min: 100 },
		{ key: '1m',  label: '1 Month',  min: 200 },
		{ key: '3m',  label: '3 Month',  min: 500 },
		{ key: 'all', label: 'All Time', min: 100 },
	];

	function shinies(s: ShinyStat, k: PeriodKey): number {
		return k === '1d'  ? s.shiny_1d
			: k === '1w'  ? s.shiny_1w
			: k === '1m'  ? s.shiny_1m
			: k === '3m'  ? s.shiny_3m
			: s.shiny_all;
	}
	function encounters(s: ShinyStat, k: PeriodKey): number {
		return k === '1d'  ? s.total_1d
			: k === '1w'  ? s.total_1w
			: k === '1m'  ? s.total_1m
			: k === '3m'  ? s.total_3m
			: s.total_all;
	}
	function periodMin(k: PeriodKey): number {
		return PERIODS.find((p) => p.key === k)?.min ?? 25;
	}
	function rate(s: ShinyStat, k: PeriodKey): number {
		const sh = shinies(s, k);
		const t = encounters(s, k);
		return t >= periodMin(k) && sh > 0 ? t / sh : Infinity;
	}

	function wilsonLowerBound(sh: number, total: number): number {
		if (total === 0 || sh === 0) return 0;
		const p = sh / total;
		const z = 1.96;
		const n = total;
		return (p + z * z / (2 * n) - z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n)) / (1 + z * z / n);
	}

	function shinySprite(pokemonId: number, form: number): string {
		try {
			return getIconPokemon({ pokemon_id: pokemonId, form, shiny: true });
		} catch {
			return '';
		}
	}

	type SortMode = 'weighted' | 'rate' | 'name';

	let stats = $state<ShinyStat[] | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let activePeriod = $state<PeriodKey>('1d');
	let sortMode = $state<SortMode>('weighted');
	let search = $state('');

	async function fetchStats() {
		loading = true;
		fetchError = null;
		try {
			const res = await fetch('/api/custom/shiny');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			stats = await res.json();
		} catch (e) {
			fetchError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchStats(); });

	let filtered = $derived.by(() => {
		let list = (stats ?? []).filter((s) => rate(s, activePeriod) !== Infinity);
		if (search.trim()) {
			const q = search.trim().toLowerCase();
			list = list.filter((s) => s.name.toLowerCase().includes(q));
		}
		return [...list].sort((a, b) => {
			if (sortMode === 'name') return a.name.localeCompare(b.name);
			if (sortMode === 'rate') return rate(a, activePeriod) - rate(b, activePeriod);
			return wilsonLowerBound(shinies(b, activePeriod), encounters(b, activePeriod))
				- wilsonLowerBound(shinies(a, activePeriod), encounters(a, activePeriod));
		});
	});
</script>

<svelte:head>
	<title>Shiny Stats — PoGo Map VT</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">

	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Shiny Stats</h1>
		<input
			type="search"
			placeholder="Search Pokémon…"
			bind:value={search}
			class="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-48"
		/>
	</div>

	{#if fetchError}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
			Failed to load shiny stats: {fetchError}
		</div>
	{/if}

	<!-- Controls -->
	<div class="flex flex-wrap items-center gap-3 mb-3">
		<!-- Period tabs -->
		<div class="flex flex-wrap rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 gap-1">
			{#each PERIODS as p}
				<button
					class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activePeriod === p.key
						? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
						: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
					onclick={() => (activePeriod = p.key)}
				>
					{p.label}
				</button>
			{/each}
		</div>

		<!-- Sort toggle -->
		<div class="flex rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 gap-1">
			{#each ([['weighted', 'Weighted'], ['rate', 'Rate'], ['name', 'Name']] as const) as [mode, label]}
				<button
					class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {sortMode === mode
						? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
						: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
					onclick={() => (sortMode = mode)}
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Table -->
	{#if loading}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-16 text-center text-zinc-400 dark:text-zinc-600">
			Loading…
		</div>
	{:else if filtered.length === 0}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-16 text-center text-zinc-400 dark:text-zinc-600">
			No results.
		</div>
	{:else}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b-2 border-zinc-200 dark:border-zinc-700">
						<th class="text-left px-4 py-3 w-6">#</th>
						<th class="text-left px-4 py-3">Pokémon</th>
						{#each PERIODS as p}
							<th class="text-right px-3 py-3 whitespace-nowrap {activePeriod === p.key ? 'text-zinc-900 dark:text-zinc-100 font-bold' : ''}">{p.label}</th>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
					{#each filtered as s, i}
						<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
							<td class="px-4 py-2.5 text-zinc-300 dark:text-zinc-700 text-xs">{i + 1}</td>
							<td class="px-4 py-2.5">
								<a href="/pokemon/{s.pokemon_id}" class="flex items-center gap-2.5 group">
									<img
										src={shinySprite(s.pokemon_id, s.form)}
										alt={s.name}
										class="w-8 h-8 object-contain"
										onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
									/>
									<span class="text-zinc-800 dark:text-zinc-200 font-medium group-hover:underline">{s.name}</span>
								</a>
							</td>
							{#each PERIODS as p}
								{@const sh = shinies(s, p.key)}
								{@const t = encounters(s, p.key)}
								{@const active = activePeriod === p.key}
								<td class="px-3 py-2.5 text-right font-mono text-xs">
									{#if t >= p.min && sh > 0}
										<div class="{active ? 'text-yellow-600 dark:text-yellow-400' : 'text-zinc-500 dark:text-zinc-400'}">~1 in {Math.round(t / sh).toLocaleString()}</div>
										<div class="text-zinc-400 dark:text-zinc-600">{((sh / t) * 100).toFixed(2)}% <span class="text-zinc-300 dark:text-zinc-700">{sh.toLocaleString()}/{t.toLocaleString()}</span></div>
									{:else if t > 0}
										<div class="text-zinc-300 dark:text-zinc-700">— <span>{sh.toLocaleString()}/{t.toLocaleString()}</span></div>
									{:else}
										<span class="text-zinc-300 dark:text-zinc-700">—</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-3">
			{#if sortMode === 'weighted'}
				Wilson lower bound (95% CI) — rewards high rate + large sample · {filtered.length} species
			{:else}
				{filtered.length} species · rates shown for ≥ min encounters per period
			{/if}
		</p>
	{/if}

</div>
