<script lang="ts">
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		InvasionKindFilter,
		InvasionSubscriptionFilters,
		NotificationAreaDto
	} from "@/lib/features/notifications/types";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import type { KojiFeatures } from "@/lib/features/koji";

	let {
		filters = $bindable(),
		ownAreas,
		kojiAreas,
		notificationAreas
	}: {
		filters: InvasionSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
	} = $props();

	const KIND_OPTIONS: { value: InvasionKindFilter; label: string }[] = [
		{ value: "grunt", label: "Grunt / Team Leader" },
		{ value: "kecleon", label: "Kecleon" },
		{ value: "showcase", label: "Showcase" },
		{ value: "goldStop", label: "Gold Pokestop" }
	];

	function toggleKind(kind: InvasionKindFilter, checked: boolean) {
		const kinds = new Set(filters.kinds ?? []);
		if (checked) kinds.add(kind);
		else kinds.delete(kind);
		filters.kinds = kinds.size > 0 ? [...kinds] : undefined;
	}

	function parseIdList(value: string): number[] | undefined {
		const ids = value
			.split(",")
			.map((s) => Number(s.trim()))
			.filter((n) => Number.isInteger(n) && n > 0);
		return ids.length > 0 ? ids : undefined;
	}

	let includesGrunt = $derived(
		!filters.kinds || filters.kinds.length === 0 || filters.kinds.includes("grunt")
	);
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Kind (optional, pick any number)</span>
		<div class="flex items-center gap-3 flex-wrap">
			{#each KIND_OPTIONS as opt (opt.value)}
				<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
					<input
						type="checkbox"
						checked={filters.kinds?.includes(opt.value) ?? false}
						onchange={(e) => toggleKind(opt.value, e.currentTarget.checked)}
					/>
					{opt.label}
				</label>
			{/each}
		</div>
	</label>

	{#if includesGrunt}
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400"
				>Grunt Character IDs (optional, comma-separated — matches the map's own invasion filter
				numbering)</span
			>
			<input
				type="text"
				value={filters.characters?.join(", ") ?? ""}
				oninput={(e) => (filters.characters = parseIdList(e.currentTarget.value))}
				placeholder="44 (Giovanni), 41, 42, 43 (Team Leaders)"
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>

		<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
			<input
				type="checkbox"
				checked={filters.confirmedOnly ?? false}
				onchange={(e) => (filters.confirmedOnly = e.currentTarget.checked || undefined)}
			/>
			Confirmed grunts only (excludes the "could be Giovanni" placeholder)
		</label>
	{/if}

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Area (optional)</span>
		<AreaPicker
			{ownAreas}
			{kojiAreas}
			{notificationAreas}
			bind:areaSource={filters.areaSource}
			bind:areaId={filters.areaId}
		/>
	</label>
</div>
