<script lang="ts" generics="Data extends Record<string, any>">
	import PokemonSelect from "@/components/menus/filters/filterset/multiselect/PokemonSelect.svelte";
	import * as m from "@/lib/paraglide/messages";
	import SearchBar from "@/components/ui/input/SearchBar.svelte";
	import type { PokemonVisual } from "@/lib/types/mapObjectData/pokemon";
	import type { Pokemon } from "@/lib/features/filters/filtersets";
	import { slide } from "svelte/transition";
	import { GENERATIONS, getGeneration } from "@/lib/utils/generations";

	type PokemonKey = {
		[K in keyof Data]: Data[K] extends Pokemon[] | undefined ? K : never;
	}[keyof Data];

	let {
		data,
		attribute,
		pokemonList,
		selectedPokemonList
	}: {
		data: Data;
		attribute: PokemonKey & string;
		pokemonList: PokemonVisual[];
		selectedPokemonList?: PokemonVisual[];
	} = $props();

	let query: string = $state("");
	let selectedGen: number | null = $state(null);

	let filteredList = $derived(
		selectedGen === null
			? pokemonList
			: pokemonList.filter((p) => getGeneration(p.pokemon_id)?.gen === selectedGen)
	);
	let selected = $derived(selectedPokemonList ?? data[attribute] ?? []);

	function onselect(pokemon: PokemonVisual, isSelected: boolean) {
		if (!isSelected) {
			data[attribute] = data[attribute]?.filter(
				(p: { pokemon_id: number; form: number }) =>
					p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
			);
		} else {
			if (!data[attribute]) data[attribute] = [] as any;
			data[attribute].push({
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form ?? 0
			});
		}

		if (data[attribute]?.length === 0) delete data[attribute];
	}
</script>

<div class="flex gap-1 flex-wrap mt-1 mb-2">
	<button
		class="px-2 py-0.5 rounded-md text-xs font-medium border transition-colors {selectedGen === null
			? 'bg-primary text-primary-foreground border-primary'
			: 'bg-card border-border hover:bg-accent'}"
		onclick={() => (selectedGen = null)}
	>
		All
	</button>
	{#each GENERATIONS as gen}
		<button
			class="px-2 py-0.5 rounded-md text-xs font-medium border transition-colors {selectedGen === gen.gen
				? 'bg-primary text-primary-foreground border-primary'
				: 'bg-card border-border hover:bg-accent'}"
			onclick={() => (selectedGen = selectedGen === gen.gen ? null : gen.gen)}
		>
			{gen.name}
		</button>
	{/each}
</div>

<SearchBar placeholder={m.search_placeholder_pokemon()} class="mb-2" bind:query />

<div class="space-y-5 mt-2">
	{#if !query && data[attribute]}
		<div transition:slide={{ duration: 90 }}>
			<PokemonSelect
				pokemonList={selected}
				{selected}
				{onselect}
				title={m.pokemon_picker_selected()}
			/>
		</div>
	{/if}

	<PokemonSelect
		pokemonList={filteredList}
		{selected}
		{onselect}
		{query}
		title={m.pokemon_picker_available()}
	/>
</div>
