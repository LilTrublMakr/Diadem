<script lang="ts">
	import type { TemplateField } from "@/lib/features/notifications/types";

	let {
		fields,
		onInsert
	}: {
		fields: TemplateField[];
		onInsert: (field: TemplateField) => void;
	} = $props();

	let query = $state("");

	let filteredFields = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return fields;
		return fields.filter(
			(f) => f.label.toLowerCase().includes(q) || f.tag.toLowerCase().includes(q)
		);
	});

	const EMOJI_PREFIX = "Emoji: ";

	// top-level categories (Identity, Stats, Conditionals, Presets, etc) — flat, always visible
	let flatCategories = $derived.by(() => {
		const map = new Map<string, TemplateField[]>();
		for (const field of filteredFields) {
			if (field.category.startsWith(EMOJI_PREFIX)) continue;
			const bucket = map.get(field.category) ?? [];
			bucket.push(field);
			map.set(field.category, bucket);
		}
		return [...map.entries()];
	});

	// "Emoji: X" categories nest under one collapsible "Emoji" main block, each X its own sub-block
	let emojiSubCategories = $derived.by(() => {
		const map = new Map<string, TemplateField[]>();
		for (const field of filteredFields) {
			if (!field.category.startsWith(EMOJI_PREFIX)) continue;
			const sub = field.category.slice(EMOJI_PREFIX.length);
			const bucket = map.get(sub) ?? [];
			bucket.push(field);
			map.set(sub, bucket);
		}
		return [...map.entries()];
	});

	let emojiTotal = $derived(emojiSubCategories.reduce((sum, [, f]) => sum + f.length, 0));
	let hasResults = $derived(flatCategories.length > 0 || emojiTotal > 0);

	const EMOJI_TAG_RE = /^<a?:(\w+):(\d+)>$/;

	function emojiPreviewUrl(field: TemplateField): string | null {
		if (!field.raw) return null;
		const match = field.tag.match(EMOJI_TAG_RE);
		return match ? `https://cdn.discordapp.com/emojis/${match[2]}.png?size=32` : null;
	}
</script>

{#snippet tagButton(field: TemplateField)}
	{@const preview = emojiPreviewUrl(field)}
	<button
		type="button"
		class="rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1"
		title={field.raw ? `Insert ${field.tag.replace("%CURSOR%", "")}` : `Insert {{${field.tag}}}`}
		onmousedown={(e) => e.preventDefault()}
		onclick={() => onInsert(field)}
	>
		{#if preview}
			<img src={preview} alt="" class="size-4" />
		{/if}
		{field.label}
	</button>
{/snippet}

<div class="flex flex-col gap-2 text-sm">
	<input
		type="text"
		bind:value={query}
		placeholder="Search tags…"
		class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
	/>

	{#if !hasResults}
		<p class="text-xs text-zinc-500 dark:text-zinc-400 text-center py-2">No tags match "{query}"</p>
	{/if}

	{#each flatCategories as [category, categoryFields] (category)}
		<div>
			<p class="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">
				{category}
			</p>
			<div class="flex flex-wrap gap-1">
				{#each categoryFields as field (field.tag)}
					{@render tagButton(field)}
				{/each}
			</div>
			{#if category === "Conditionals"}
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
					Example: <code class="text-zinc-700 dark:text-zinc-300"
						>{"{{#if (gt iv 90)}}High IV!{{else}}...{{/if}}"}</code
					>
					— comparison helpers go inside <code>if</code>/<code>unless</code>'s parens.
				</p>
			{:else if category === "Your Collection"}
				<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
					Manage what you've tracked on your <a
						href="/profile"
						class="text-blue-600 dark:text-blue-400 hover:underline">profile page</a
					>.
				</p>
			{/if}
		</div>
	{/each}

	{#if emojiTotal > 0}
		<details open={!!query} class="border-t border-zinc-200 dark:border-zinc-700 pt-2">
			<summary
				class="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300"
			>
				Emoji ({emojiTotal})
			</summary>
			<div class="mt-2 flex flex-col gap-2 pl-2">
				{#each emojiSubCategories as [sub, subFields] (sub)}
					<details open={!!query}>
						<summary
							class="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-200"
						>
							{sub} ({subFields.length})
						</summary>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each subFields as field (field.tag)}
								{@render tagButton(field)}
							{/each}
						</div>
					</details>
				{/each}
			</div>
		</details>
	{/if}
</div>
