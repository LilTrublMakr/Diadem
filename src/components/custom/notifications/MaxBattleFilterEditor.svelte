<script lang="ts">
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		MaxBattleSubscriptionFilters,
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
		filters: MaxBattleSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
	} = $props();
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Boss species (optional, pick any number)</span>
		<PokemonPicker bind:selected={filters.bossPokemonIds} />
	</label>

	<div class="grid grid-cols-2 gap-3">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Min level</span>
			<input
				type="number"
				min="1"
				max="8"
				value={filters.minLevel ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.minLevel = v ? Number(v) : undefined;
				}}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Max level</span>
			<input
				type="number"
				min="1"
				max="8"
				value={filters.maxLevel ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.maxLevel = v ? Number(v) : undefined;
				}}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
	</div>

	<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
		<input
			type="checkbox"
			checked={filters.gmaxOnly ?? false}
			onchange={(e) => (filters.gmaxOnly = e.currentTarget.checked || undefined)}
		/>
		Gigantamax battles only
	</label>

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
