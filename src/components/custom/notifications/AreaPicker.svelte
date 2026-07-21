<script lang="ts">
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import type { KojiFeatures } from "@/lib/features/koji";
	import type { NotificationAreaDto } from "@/lib/features/notifications/types";
	import { ChevronDown } from "@lucide/svelte";

	type AreaSource = "own" | "koji" | "notificationArea";
	type Option = { source: AreaSource; id: number; name: string; group: string };

	let {
		ownAreas,
		kojiAreas,
		notificationAreas,
		areaSource = $bindable(),
		areaId = $bindable()
	}: {
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
		areaSource: AreaSource | undefined;
		areaId: number | undefined;
	} = $props();

	let open = $state(false);
	let query = $state("");

	let options = $derived<Option[]>([
		...notificationAreas.map((a) => ({
			source: "notificationArea" as const,
			id: a.id,
			name: a.name || "Unnamed area",
			group: "My Notification Areas"
		})),
		...ownAreas.map((a) => ({
			source: "own" as const,
			id: a.id,
			name: a.name || "Unnamed area",
			group: "My Areas"
		})),
		...kojiAreas.map((a) => ({
			source: "koji" as const,
			id: a.properties.id,
			name: a.properties.name || "Unnamed area",
			group: "Coverage Map Areas"
		}))
	]);

	let filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((o) => o.name.toLowerCase().includes(q));
	});

	let grouped = $derived.by(() => {
		const map = new Map<string, Option[]>();
		for (const option of filtered) {
			const bucket = map.get(option.group) ?? [];
			bucket.push(option);
			map.set(option.group, bucket);
		}
		return [...map.entries()];
	});

	let selectedLabel = $derived.by(() => {
		if (!areaId) return "Anywhere";
		const match = options.find((o) => o.source === areaSource && o.id === areaId);
		return match ? match.name : "Unknown area";
	});

	function select(option: Option | null) {
		if (option) {
			areaSource = option.source;
			areaId = option.id;
		} else {
			areaSource = undefined;
			areaId = undefined;
		}
		open = false;
		query = "";
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest("[data-area-picker]")) open = false;
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative" data-area-picker>
	<button
		type="button"
		class="w-full flex items-center justify-between gap-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
		onclick={() => (open = !open)}
	>
		<span class="truncate">{selectedLabel}</span>
		<ChevronDown
			size={14}
			class="shrink-0 text-zinc-400 transition-transform {open ? 'rotate-180' : ''}"
		/>
	</button>

	{#if open}
		<div
			class="absolute z-20 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-lg max-h-64 overflow-y-auto p-2 flex flex-col gap-1"
		>
			<input
				type="text"
				bind:value={query}
				placeholder="Search areas…"
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 mb-1"
			/>
			<button
				type="button"
				class="text-left text-xs px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
				onclick={() => select(null)}
			>
				Anywhere
			</button>
			{#if grouped.length === 0}
				<p class="text-xs text-zinc-400 text-center py-2">No areas match "{query}"</p>
			{/if}
			{#each grouped as [group, groupOptions] (group)}
				<div>
					<p
						class="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 px-2 pt-1"
					>
						{group}
					</p>
					{#each groupOptions as option (`${option.source}:${option.id}`)}
						<button
							type="button"
							class="w-full text-left text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 {areaSource ===
								option.source && areaId === option.id
								? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
								: 'text-zinc-700 dark:text-zinc-300'}"
							onclick={() => select(option)}
						>
							{option.name}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	{/if}
</div>
