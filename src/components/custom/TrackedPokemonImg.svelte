<script lang="ts">
	import { getTrackers } from '$lib/features/trackerState.svelte';

	let {
		pokemonId,
		src,
		alt = '',
		class: className = 'w-8 h-8 object-contain',
		badgeClass = 'text-[10px]',
		onerror: onErrorProp = undefined
	}: {
		pokemonId: number;
		src: string;
		alt?: string;
		class?: string;
		badgeClass?: string;
		onerror?: () => void;
	} = $props();

	let visible = $state(true);
	let hasShiny = $derived((getTrackers()[pokemonId]?.shiny) ?? false);
	let hasHundo = $derived((getTrackers()[pokemonId]?.hundo) ?? false);
	let hasNundo = $derived((getTrackers()[pokemonId]?.nundo) ?? false);
	let hasShundo = $derived((getTrackers()[pokemonId]?.shundo) ?? false);
</script>

{#if visible}
	<div class="relative inline-flex flex-shrink-0">
		<img
			{src}
			{alt}
			class={className}
			onerror={() => { if (onErrorProp) { onErrorProp(); } else { visible = false; } }}
			onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
		/>
		{#if hasShiny}
			<span class="absolute -top-0.5 -left-0.5 {badgeClass} leading-none select-none pointer-events-none">✨</span>
		{/if}
		{#if hasShundo}
			<span class="absolute -top-0.5 -right-0.5 {badgeClass} leading-none select-none pointer-events-none">🌟</span>
		{/if}
		{#if hasNundo}
			<span class="absolute -bottom-0.5 -left-0.5 {badgeClass} leading-none select-none pointer-events-none">0️⃣</span>
		{/if}
		{#if hasHundo}
			<span class="absolute -bottom-0.5 -right-0.5 {badgeClass} leading-none select-none pointer-events-none">💯</span>
		{/if}
	</div>
{/if}
