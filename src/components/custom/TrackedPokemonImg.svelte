<script lang="ts">
	import { getTrackers } from '$lib/features/trackerState.svelte';

	let {
		pokemonId,
		src,
		alt = '',
		class: className = 'w-8 h-8 object-contain'
	}: {
		pokemonId: number;
		src: string;
		alt?: string;
		class?: string;
	} = $props();

	let visible = $state(true);
	let hasShiny = $derived((getTrackers()[pokemonId]?.shiny) ?? false);
	let hasHundo = $derived((getTrackers()[pokemonId]?.hundo) ?? false);
</script>

{#if visible}
	<div class="relative inline-flex flex-shrink-0">
		<img
			{src}
			{alt}
			class={className}
			onerror={() => { visible = false; }}
			onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
		/>
		{#if hasShiny}
			<span class="absolute -top-0.5 -right-0.5 text-[10px] leading-none select-none pointer-events-none">✨</span>
		{/if}
		{#if hasHundo}
			<span class="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none select-none pointer-events-none">💯</span>
		{/if}
	</div>
{/if}
