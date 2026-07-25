<script lang="ts">
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		NotificationAreaDto,
		QuestRewardTypeFilter,
		QuestSubscriptionFilters
	} from "@/lib/features/notifications/types";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import type { KojiFeatures } from "@/lib/features/koji";

	let {
		filters = $bindable(),
		ownAreas,
		kojiAreas,
		notificationAreas
	}: {
		filters: QuestSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
	} = $props();

	function parseIdList(value: string): number[] | undefined {
		const ids = value
			.split(",")
			.map((s) => Number(s.trim()))
			.filter((n) => Number.isInteger(n) && n > 0);
		return ids.length > 0 ? ids : undefined;
	}
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Reward Type</span>
		<select
			value={filters.rewardType ?? "any"}
			onchange={(e) => {
				const v = e.currentTarget.value;
				filters.rewardType = v === "any" ? undefined : (v as QuestRewardTypeFilter);
				// Clear sub-filters that no longer apply so a stale filter doesn't linger silently
				// after switching reward type.
				filters.rewardPokemonIds = undefined;
				filters.rewardItemIds = undefined;
				filters.minAmount = undefined;
				filters.shinyOnly = undefined;
			}}
			class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
		>
			<option value="any">Any Reward</option>
			<option value="pokemon">Pokemon Encounter</option>
			<option value="item">Item</option>
			<option value="stardust">Stardust</option>
			<option value="candy">Candy</option>
			<option value="megaEnergy">Mega Energy</option>
		</select>
	</label>

	{#if filters.rewardType === "pokemon" || filters.rewardType === "candy" || filters.rewardType === "megaEnergy"}
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Species (optional, pick any number)</span>
			<PokemonPicker bind:selected={filters.rewardPokemonIds} />
		</label>
	{/if}

	{#if filters.rewardType === "item"}
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Item IDs (optional, comma-separated)</span>
			<input
				type="text"
				value={filters.rewardItemIds?.join(", ") ?? ""}
				oninput={(e) => (filters.rewardItemIds = parseIdList(e.currentTarget.value))}
				placeholder="1, 2, 3"
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
	{/if}

	{#if filters.rewardType === "item" || filters.rewardType === "stardust" || filters.rewardType === "candy" || filters.rewardType === "megaEnergy"}
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Minimum Amount (optional)</span>
			<input
				type="number"
				min="1"
				value={filters.minAmount ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.minAmount = v ? Number(v) : undefined;
				}}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
	{/if}

	{#if filters.rewardType === "pokemon"}
		<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
			<input
				type="checkbox"
				checked={filters.shinyOnly ?? false}
				onchange={(e) => (filters.shinyOnly = e.currentTarget.checked || undefined)}
			/>
			Shiny-possible encounters only
		</label>
	{/if}

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">AR Requirement</span>
		<select
			value={filters.withAr === true ? "ar" : filters.withAr === false ? "std" : "any"}
			onchange={(e) => {
				const v = e.currentTarget.value;
				filters.withAr = v === "ar" ? true : v === "std" ? false : undefined;
			}}
			class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
		>
			<option value="any">Any</option>
			<option value="ar">AR Only</option>
			<option value="std">Standard Only</option>
		</select>
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
