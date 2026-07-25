<script lang="ts">
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		LureSubscriptionFilters,
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
		filters: LureSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
	} = $props();

	// Best-effort community-known numbering — see LURE_TYPE_INFO in render.ts.
	const LURE_OPTIONS = [
		{ id: 501, label: "Normal" },
		{ id: 502, label: "Glacial" },
		{ id: 503, label: "Mossy" },
		{ id: 504, label: "Magnetic" },
		{ id: 505, label: "Rainy" },
		{ id: 506, label: "Golden" }
	];

	function toggleLure(id: number, checked: boolean) {
		const ids = new Set(filters.lureIds ?? []);
		if (checked) ids.add(id);
		else ids.delete(id);
		filters.lureIds = ids.size > 0 ? [...ids] : undefined;
	}
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Lure Type (optional, pick any number)</span>
		<div class="flex items-center gap-3 flex-wrap">
			{#each LURE_OPTIONS as opt (opt.id)}
				<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
					<input
						type="checkbox"
						checked={filters.lureIds?.includes(opt.id) ?? false}
						onchange={(e) => toggleLure(opt.id, e.currentTarget.checked)}
					/>
					{opt.label}
				</label>
			{/each}
		</div>
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
