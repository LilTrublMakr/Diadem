<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import type { RouteData } from "$lib/types/mapObjectData/route";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import { formatDecimal } from "$lib/utils/numberFormat";
	import { Clock, Route as RouteIcon } from "@lucide/svelte";

	export { image, main };

	export function getPopupPropsRoute(data: MapData) {
		data = data as RouteData;
		return {
			type: m.pogo_route(),
			title: data.name || m.pogo_route(),
			image,
			main
		} as MapObjectPopupProps;
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as RouteData}
	<div class="size-14 shrink-0">
		<ImagePopup alt={data.name || m.pogo_route()} src={data.image} class="size-14" />
	</div>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as RouteData}

	{#if data.description}
		<BasicMainCard>
			{data.description}
		</BasicMainCard>
	{/if}

	<TitledMainSection Icon={RouteIcon} title={m.pogo_route()}>
		<StatsMainCard>
			<StatsMainCardEntry
				Icon={RouteIcon}
				name={m.distance()}
				value="{formatDecimal(data.distance_meters / 1000, 1)} km"
			/>
			<StatsMainCardEntry Icon={Clock} name={m.duration()}>
				{#snippet value()}
					{Math.round((data.duration_seconds ?? 0) / 60)} min
				{/snippet}
			</StatsMainCardEntry>
		</StatsMainCard>
	</TitledMainSection>
{/snippet}
