<script lang="ts">
	import { getTrackers, trackerKey } from '$lib/features/trackerState.svelte';

	let {
		pokemonId,
		form = 0,
		src,
		alt = '',
		class: className = 'w-8 h-8 object-contain',
		badgeClass = 'text-[10px]',
		onerror: onErrorProp = undefined
	}: {
		pokemonId: number;
		form?: number;
		src: string;
		alt?: string;
		class?: string;
		badgeClass?: string;
		onerror?: () => void;
	} = $props();

	let visible = $state(true);

	$effect(() => {
		src;
		visible = true;
	});

	let entry = $derived(getTrackers()[trackerKey(pokemonId, form)]);
	let hasShiny = $derived(entry?.shiny ?? false);
	let hasHundo = $derived(entry?.hundo ?? false);
	let hasNundo = $derived(entry?.nundo ?? false);
	let hasShundo = $derived(entry?.shundo ?? false);
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
