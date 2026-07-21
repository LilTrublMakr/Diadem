<script lang="ts">
	let {
		used,
		total,
		label = "Workers in use"
	}: { used: number; total: number; label?: string } = $props();

	let percent = $derived(total > 0 ? Math.min(100, (used / total) * 100) : 0);
</script>

<div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
	<div class="flex items-center justify-between text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">{label}</span>
		{#if total === -1}
			<span class="font-medium text-zinc-900 dark:text-zinc-100">{used} / Unlimited</span>
		{:else}
			<span class="font-medium text-zinc-900 dark:text-zinc-100">{used} / {total}</span>
		{/if}
	</div>
	{#if total !== -1}
		<div class="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
			<div
				class="h-full rounded-full transition-all {used >= total
					? 'bg-amber-500'
					: 'bg-emerald-500'}"
				style="width: {percent}%"
			></div>
		</div>
	{/if}
</div>
