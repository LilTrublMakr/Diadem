<script lang="ts">
	import { getAllPokemon, getMasterPokemon, loadMasterFile } from "@/lib/services/masterfile";
	import { getIconPokemon, initAllIconSets } from "@/lib/services/uicons.svelte";
	import { resize } from "@/lib/services/assets";
	import { createFuzzySearch } from "@/lib/services/search.svelte";
	import { GENERATIONS, getGeneration } from "@/lib/utils/generations";
	import { typeIdToText } from "@/lib/utils/pokemonUtils";
	import { Check, X } from "@lucide/svelte";
	import { onMount } from "svelte";

	let { selected = $bindable([]) }: { selected: number[] | undefined } = $props();

	// Every Pokemon type id currently in use (matches the hardcoded typeNames map in pokemonUtils.ts).
	const TYPE_IDS = Array.from({ length: 18 }, (_, i) => i + 1);

	type SpeciesOption = { id: number; name: string; types: number[] };

	let ready = $state(false);
	let allSpecies = $state<SpeciesOption[]>([]);

	onMount(async () => {
		await Promise.all([loadMasterFile(), initAllIconSets()]);
		const seen = new Set<number>();
		const list: SpeciesOption[] = [];
		for (const { pokemon_id } of getAllPokemon(false)) {
			if (seen.has(pokemon_id)) continue;
			seen.add(pokemon_id);
			const master = getMasterPokemon(pokemon_id);
			if (master) list.push({ id: pokemon_id, name: master.name, types: master.types ?? [] });
		}
		list.sort((a, b) => a.id - b.id);
		allSpecies = list;
		ready = true;
	});

	let query = $state("");
	let selectedGen = $state<number | null>(null);
	let selectedType = $state<number | null>(null);

	let genFiltered = $derived(
		selectedGen === null
			? allSpecies
			: allSpecies.filter((s) => getGeneration(s.id)?.gen === selectedGen)
	);
	let typeFiltered = $derived(
		selectedType === null ? genFiltered : genFiltered.filter((s) => s.types.includes(selectedType!))
	);

	const searcher = $derived(
		createFuzzySearch(typeFiltered, { getText: (s: SpeciesOption) => [s.name] })
	);

	let visibleList = $derived.by(() => {
		const q = query.trim();
		if (!q) return typeFiltered;
		const fuzzyMatches = searcher(q).map((r) => r.item);
		if (!/^\d+$/.test(q)) return fuzzyMatches;
		// Numeric query also matches by id (name search alone won't find "#25" style lookups)
		const merged = new Map<number, SpeciesOption>();
		for (const s of typeFiltered) if (String(s.id).includes(q)) merged.set(s.id, s);
		for (const s of fuzzyMatches) merged.set(s.id, s);
		return [...merged.values()];
	});

	let selectedIds = $derived(selected ?? []);

	function toggle(id: number) {
		selected = selectedIds.includes(id)
			? selectedIds.filter((x) => x !== id)
			: [...selectedIds, id];
	}

	function speciesName(id: number): string {
		return allSpecies.find((s) => s.id === id)?.name ?? `#${id}`;
	}
</script>

<div class="flex flex-col gap-2">
	{#if selectedIds.length > 0}
		<div class="flex flex-wrap items-center gap-1">
			{#each selectedIds as id (id)}
				<button
					type="button"
					class="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 pl-2 pr-1 py-0.5 text-xs"
					onclick={() => toggle(id)}
					title="Remove"
				>
					{speciesName(id)}
					<X size={11} />
				</button>
			{/each}
			<button
				type="button"
				class="text-xs text-zinc-400 hover:text-red-500"
				onclick={() => (selected = [])}
			>
				Clear all
			</button>
		</div>
	{/if}

	<div class="flex flex-wrap gap-1">
		<button
			type="button"
			class="px-2 py-0.5 rounded text-xs font-medium border {selectedGen === null
				? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
				: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
			onclick={() => (selectedGen = null)}
		>
			All gens
		</button>
		{#each GENERATIONS as gen (gen.gen)}
			<button
				type="button"
				class="px-2 py-0.5 rounded text-xs font-medium border {selectedGen === gen.gen
					? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
					: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
				onclick={() => (selectedGen = selectedGen === gen.gen ? null : gen.gen)}
			>
				{gen.name}
			</button>
		{/each}
	</div>

	<div class="flex flex-wrap gap-1">
		<button
			type="button"
			class="px-2 py-0.5 rounded text-xs font-medium border {selectedType === null
				? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
				: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
			onclick={() => (selectedType = null)}
		>
			All types
		</button>
		{#each TYPE_IDS as typeId (typeId)}
			<button
				type="button"
				class="px-2 py-0.5 rounded text-xs font-medium border capitalize {selectedType === typeId
					? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
					: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
				onclick={() => (selectedType = selectedType === typeId ? null : typeId)}
			>
				{typeIdToText(typeId)}
			</button>
		{/each}
	</div>

	<input
		type="text"
		bind:value={query}
		placeholder="Search by name or ID…"
		class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
	/>

	<div
		class="max-h-72 overflow-y-auto rounded border border-zinc-200 dark:border-zinc-700 flex flex-col"
	>
		{#if !ready}
			<p class="text-xs text-zinc-400 text-center py-4">Loading species…</p>
		{:else if visibleList.length === 0}
			<p class="text-xs text-zinc-400 text-center py-4">No species match</p>
		{:else}
			{#each visibleList as species (species.id)}
				{@const isSelected = selectedIds.includes(species.id)}
				<button
					type="button"
					class="w-full flex items-center gap-2 px-2 py-1 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 {isSelected
						? 'bg-blue-50 dark:bg-blue-950/30'
						: ''}"
					onclick={() => toggle(species.id)}
				>
					<img
						src={resize(getIconPokemon({ pokemon_id: species.id, form: 0 }), { width: 64 })}
						alt=""
						class="size-6 shrink-0"
						loading="lazy"
					/>
					<span class="flex-1 min-w-0 truncate text-zinc-900 dark:text-zinc-100">
						{species.name}
					</span>
					<span class="text-xs text-zinc-400 font-mono shrink-0">
						#{String(species.id).padStart(3, "0")}
					</span>
					{#if isSelected}
						<Check size={14} class="text-blue-600 dark:text-blue-400 shrink-0" />
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
