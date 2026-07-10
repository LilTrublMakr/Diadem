<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { createFuzzySearch } from '$lib/services/search.svelte';
	import { getAllPokemon, getMasterPokemon, loadMasterFile } from '$lib/services/masterfile';
	import { getIconPokemon, initAllIconSets } from '$lib/services/uicons.svelte';
	import type { FuzzySearcher } from '@nozbe/microfuzz';

	type Entry = { pokemon_id: number; name: string };

	let query = $state('');
	let results = $state<Entry[]>([]);
	let open = $state(false);
	let ready = $state(false);
	let activeIndex = $state(-1);
	let containerEl: HTMLDivElement | undefined = $state();
	let searcher: FuzzySearcher<Entry> | null = null;

	onMount(async () => {
		await Promise.all([loadMasterFile(), initAllIconSets()]);
		const seen = new Set<number>();
		const entries: Entry[] = [];
		for (const { pokemon_id } of getAllPokemon(false)) {
			if (seen.has(pokemon_id)) continue;
			seen.add(pokemon_id);
			const mp = getMasterPokemon(pokemon_id);
			if (mp) entries.push({ pokemon_id, name: mp.name });
		}
		searcher = createFuzzySearch(entries, { getText: (e) => [e.name] });
		ready = true;
	});

	function handleInput() {
		activeIndex = -1;
		if (!query.trim() || !searcher) { results = []; open = false; return; }
		results = searcher(query).slice(0, 8).map((r) => r.item);
		open = results.length > 0;
	}

	function select(entry: Entry) {
		query = '';
		results = [];
		open = false;
		goto(`/pokedex/${entry.pokemon_id}`);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, results.length - 1); }
		else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, -1); }
		else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); select(results[activeIndex]); }
		else if (e.key === 'Escape') { open = false; query = ''; results = []; }
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) open = false;
	}

	function spriteUrl(id: number): string {
		try { return getIconPokemon({ pokemon_id: id, form: 0 }); }
		catch { return ''; }
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" bind:this={containerEl}>
	<div class="relative">
		<Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
		<input
			bind:value={query}
			oninput={handleInput}
			onfocus={() => { if (results.length > 0) open = true; }}
			onkeydown={handleKeydown}
			placeholder={ready ? 'Search Pokédex…' : 'Loading…'}
			disabled={!ready}
			class="w-44 pl-7 pr-6 py-1 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50"
		/>
		{#if query}
			<button
				onclick={() => { query = ''; results = []; open = false; }}
				class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
			>
				<X size={12} />
			</button>
		{/if}
	</div>

	{#if open && results.length > 0}
		<div class="absolute top-full mt-1 left-0 w-60 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden z-50">
			{#each results as entry, i}
				<button
					onclick={() => select(entry)}
					class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors {activeIndex === i ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
				>
					<img src={spriteUrl(entry.pokemon_id)} alt={entry.name} class="w-8 h-8 object-contain flex-shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
					<span class="text-sm text-zinc-900 dark:text-zinc-100 flex-1 min-w-0 truncate">{entry.name}</span>
					<span class="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 font-mono">#{String(entry.pokemon_id).padStart(4, '0')}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
