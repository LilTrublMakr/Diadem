<script lang="ts">
	import { ChevronRight, ChevronUp, Eye, EyeClosed, FunnelPlus } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import Switch from "@/components/ui/input/Switch.svelte";
	import Button from "@/components/ui/input/Button.svelte";

	import { slide } from "svelte/transition";
	import { flip } from "svelte/animate";
	import Filterset from "@/components/menus/filters/Filterset.svelte";
	import { type ModalType, openModal } from "@/lib/ui/modal.svelte.js";
	import {
		filtersetPageNew,
		filtersetPageReset
	} from "@/lib/features/filters/filtersetPages.svelte";
	import {
		getNewFilterset,
		type SelectedFiltersetData,
		setCurrentSelectedFilterset
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import * as m from "@/lib/paraglide/messages";
	import { getMapObjectCounts } from "@/lib/mapObjects/mapObjectsState.svelte";
	import { formatNumberCompact } from "@/lib/utils/numberFormat";
	import { tick } from "svelte";
	import { deleteAllFeaturesOfType } from "@/lib/map/featuresGen.svelte";
	import { mAny } from "@/lib/utils/anyMessage";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import S2CellFilters from "@/components/menus/filters/S2CellFilters.svelte";

	let {
		majorCategory,
		subCategory = undefined,
		title,
		onEnabledChange,
		filter,
		mapObject,
		filterModal = undefined,
		isExpandable = false,
		collapsibleByFiltersets = false,
		isFilterable = true,
		filtersReorderable = false,
		expanded = $bindable(false),
	}: {
		majorCategory: SelectedFiltersetData["majorCategory"];
		subCategory?: FilterCategory;
		title: string;
		onEnabledChange: (thisCategory: FilterCategory, value: boolean) => void;
		filter: AnyFilter;
		mapObject: MapObjectType;
		filterModal?: ModalType | undefined;
		isExpandable?: boolean;
		collapsibleByFiltersets?: boolean;
		isFilterable?: boolean;
		filtersReorderable?: boolean;
		subCategories?: FilterCategory[];
		expanded?: boolean;
	} = $props();

	let draggedFiltersetId: string | null = $state(null);
	let livePreviewOrder: AnyFilterset[] | null = $state(null);

	function onFiltersetDragPointerDown(id: string) {
		draggedFiltersetId = id;
		livePreviewOrder = filtersets ? [...filtersets] : null;
		// The dragged row is repositioned in the DOM by the keyed #each block as the
		// preview reorders, which breaks element-level setPointerCapture — track the
		// drag on window instead.
		window.addEventListener("pointermove", onFiltersetDragPointerMove);
		window.addEventListener("pointerup", onFiltersetDragPointerUp);
	}

	function onFiltersetDragPointerMove(event: PointerEvent) {
		if (!draggedFiltersetId || !livePreviewOrder) return;

		const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-filterset-id]"));
		let toIndex = 0;
		for (const row of rows) {
			const rect = row.getBoundingClientRect();
			if (event.clientY > rect.top + rect.height / 2) toIndex++;
		}
		toIndex = Math.min(toIndex, livePreviewOrder.length - 1);

		const fromIndex = livePreviewOrder.findIndex((f) => f.id === draggedFiltersetId);
		if (fromIndex === -1 || fromIndex === toIndex) return;

		const next = [...livePreviewOrder];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		livePreviewOrder = next;
	}

	function onFiltersetDragPointerUp() {
		window.removeEventListener("pointermove", onFiltersetDragPointerMove);
		window.removeEventListener("pointerup", onFiltersetDragPointerUp);

		if (livePreviewOrder) {
			let target = getUserSettings().filters[majorCategory];
			// @ts-ignore
			if (subCategory) target = target[subCategory];
			// @ts-ignore
			target.filters = livePreviewOrder;
			updateUserSettings();
		}
		draggedFiltersetId = null;
		livePreviewOrder = null;
	}

	let isEnabled: boolean = $derived(filter.enabled);
	let filtersets = $derived((filter as { filters?: AnyFilterset[] }).filters);
	let displayedFiltersets = $derived(livePreviewOrder ?? filtersets ?? []);
	let hasAnyFilterset: boolean = $derived((filtersets?.length ?? 0) > 0);
	let allFiltersetsDisabled: boolean = $derived(
		hasAnyFilterset && (filtersets?.every((f) => !f.enabled) ?? false)
	);
	let effectiveExpandable: boolean = $derived(
		isExpandable ||
			(collapsibleByFiltersets && isFilterable && hasAnyFilterset && filterModal !== undefined && filter.enabled)
	);

	function onAddFilter() {
		if (!filterModal) return;
		setCurrentSelectedFilterset(majorCategory, subCategory, getNewFilterset(), false);
		filtersetPageReset();
		openModal(filterModal);
	}

	function onToggleAll() {
		const shouldEnable = allFiltersetsDisabled;
		let filter = getUserSettings().filters[majorCategory];

		// @ts-ignore
		if (subCategory) filter = filter[subCategory];
		// @ts-ignore
		filter.filters = filter.filters.map((filterset) => ({ ...filterset, enabled: shouldEnable }));

		updateUserSettings();
		deleteAllFeaturesOfType(mapObject);
		tick().then(() => updateAllMapObjects().then());
	}
</script>

{#snippet showingCount()}
	{#if mapObject && !subCategory}
		{@const { showing, examined } = getMapObjectCounts(mapObject)}
		<p class="text-sm text-muted-foreground font-semibold">
			{#if showing === examined}
				{m.showing_showing({ showing })}
			{:else}
				{m.showing_showing_of_examined({
					showing: formatNumberCompact(showing),
					examined: formatNumberCompact(examined)
				})}
			{/if}
		</p>
	{/if}
{/snippet}

<div class="py-2 pr-4 pl-0" class:py-0!={isEnabled && isFilterable && !hasAnyFilterset}>
	<div class="flex gap-2 justify-start items-center whitespace-normal">
		{#if !effectiveExpandable}
			<div class="pl-4 py-2">
				<p class="font-semibold text-base">
					{title}
				</p>
				{#if isEnabled}
					{@render showingCount()}
					{#if isFilterable && !hasAnyFilterset}
						<Button class="-ml-2" variant="ghost" size="sm" onclick={onAddFilter}>
							<FunnelPlus size="14" />
							<span>{mAny(`add_filter_${majorCategory}_${subCategory}`)}</span>
						</Button>
					{/if}
				{/if}
			</div>
		{:else}
			<Button
				class="flex-col gap-0! items-start! w-full! h-fit"
				variant="ghost"
				onclick={() => (expanded = !expanded)}
			>
				<div class="flex items-center justify-start! h-fit! gap-1 flex-1">
					<p class="font-semibold text-base">
						{title}
					</p>
					{#if getConfig().general.filterCaretStyle === "caret"}
						<ChevronUp
							size="16"
							class="transition-[rotate] mt-px"
							style="rotate: {expanded ? '180deg' : '0deg'}"
						/>
					{:else}
						<ChevronRight
							size="16"
							class="transition-[rotate] mt-px"
							style="rotate: {expanded ? '90deg' : '0deg'}"
						/>
					{/if}
				</div>

				{#if isEnabled}
					{@render showingCount()}
				{/if}
			</Button>
		{/if}
		<!--		<span class="text-sm text-muted-foreground">67</span>-->

		<div class="flex gap-1 ml-auto items-center">
			<!--		{#if isFilterable && !hasAnyFilterset && isEnabled}-->
			<!--			<Button class="" variant="outline" size="sm" onclick={placeholderAddFilter}>-->
			<!--				<FunnelPlus size="14" />-->
			<!--&lt;!&ndash;				<span>Filter</span>&ndash;&gt;-->
			<!--			</Button>-->
			<!--		{/if}-->

			<Switch
				class=""
				bind:checked={isEnabled}
				onCheckedChange={(v) => onEnabledChange(subCategory!, v)}
			/>
		</div>
	</div>

	{#if isEnabled && isFilterable}
		{#if hasAnyFilterset && filterModal && (!collapsibleByFiltersets || expanded)}
			<div class="w-full my-1 flex flex-col gap-1 pl-2" transition:slide={{ duration: 90 }}>
				{#each displayedFiltersets as filterset (filterset.id)}
					<div
						data-filterset-id={filterset.id}
						class="w-full"
						animate:flip={{ duration: 200 }}
					>
						<Filterset
							filter={filterset}
							{majorCategory}
							{subCategory}
							{filterModal}
							{mapObject}
							reorderable={filtersReorderable}
							onDragHandlePointerDown={() => onFiltersetDragPointerDown(filterset.id)}
							isDragged={draggedFiltersetId === filterset.id}
						/>
					</div>
				{/each}
			</div>

			<div class="flex justify-between ml-2" class:mb-0.5={hasAnyFilterset}>
				<Button class="" variant="ghost" size="sm" onclick={onAddFilter}>
					<FunnelPlus size="14" />
					<span>{mAny(`add_filter_${majorCategory}_${subCategory}`)}</span>
				</Button>
				{#if hasAnyFilterset}
					<Button class="" variant="ghost" size="sm" onclick={onToggleAll}>
						{#if allFiltersetsDisabled}
							<Eye size="16" />
							<span>{m.enable_filters()}</span>
						{:else}
							<EyeClosed size="16" />
							<span>{m.disable_filters()}</span>
						{/if}
					</Button>
				{/if}
			</div>
		{/if}
	{/if}

	{#if isEnabled && mapObject === MapObjectType.S2_CELL}
		<S2CellFilters />
	{/if}
</div>

<!--<div-->
<!--	class="py-2 pr-4 pl-0 w-full flex gap-2 justify-between"-->
<!--	class:flex-col={showFiltered}-->
<!--	class:pl-4={showFiltered}-->
<!--	class:items-center={!showFiltered}-->
<!--&gt;-->
<!--	{#if showFiltered}-->
<!--		<MenuTitle {title} />-->
<!--	{:else}-->
<!--		<Button class="flex items-center justify-start! gap-1 flex-1" variant="ghost" onclick={() => expanded = !expanded}>-->
<!--			<MenuTitle {title} />-->

<!--			<ChevronDown size="20" />-->
<!--		</Button>-->
<!--	{/if}-->

<!--	{#if showFiltered}-->
<!--		<RadioGroup-->
<!--			class="gap-3! w-full"-->
<!--			value={getUserSettings().filters[category].type}-->
<!--			childCount={showFiltered ? 3 : 2}-->
<!--			{onValueChange}-->
<!--		>-->
<!--			<RadioGroupItem value="all" class="py-2">-->
<!--				<Eye size="16" />-->
<!--				<span>-->
<!--			{#if showFiltered}-->
<!--				All-->
<!--			{:else}-->
<!--				Show-->
<!--			{/if}-->
<!--		</span>-->
<!--			</RadioGroupItem>-->
<!--			<RadioGroupItem value="none" class="py-2">-->
<!--				<EyeOff size="16" />-->
<!--				<span>-->
<!--			{#if showFiltered}-->
<!--				None-->
<!--			{:else}-->
<!--				Hide-->
<!--			{/if}-->
<!--		</span>-->
<!--			</RadioGroupItem>-->
<!--			{#if showFiltered}-->
<!--				<RadioGroupItem value="filtered" class="py-2">-->
<!--					<Funnel size="16" />-->
<!--					<span>Filtered</span>-->
<!--				</RadioGroupItem>-->
<!--			{/if}-->
<!--		</RadioGroup>-->

<!--	{:else}-->

<!--		<Switch />-->

<!--	{/if}-->
<!--</div>-->
