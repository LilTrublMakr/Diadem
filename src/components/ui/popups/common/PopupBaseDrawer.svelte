<script module lang="ts">
	type SnapPoint = string | number;
</script>

<script lang="ts">
	import { onDestroy, tick, untrack } from "svelte";
	import { Drawer } from "$lib/drawer";
	import { watch } from "runed";
	import { closePopup } from "$lib/mapObjects/interact";
	import { bindPopupDrawerSnapPoint } from "$lib/ui/popupDrawer.svelte";
	import type { Coords } from "$lib/utils/coordinates";
	import PopupBaseStatic, {
		type MapObjectPopupProps
	} from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";
	import {
		centerRequestedMapObjectIfPopupCovers,
		getPopupVisibilityRequest,
		type PopupVisibilityRequest
	} from "$lib/mapObjects/popupVisibility.svelte";

	let {
		open = $bindable(false),
		coords,
		props,
		data
	}: {
		open: boolean;
		coords: Coords;
		data: MapData | undefined;
		props: MapObjectPopupProps | undefined;
	} = $props();

	let initialSnapPoint: SnapPoint = $state("250px");

	let snapPoints: SnapPoint[] = $derived([initialSnapPoint, 1]);
	let activeSnapPoint: SnapPoint = $state(untrack(() => initialSnapPoint));
	let pendingVisibilityRequest: PopupVisibilityRequest | undefined;
	let popupElement: HTMLDivElement | undefined = $state();

	function updateInitialSnapPoint() {
		if (!document) return;

		const endElement = popupElement?.querySelector<HTMLElement>(
			"[data-popup-initial-snap-point-end]"
		);
		if (!popupElement || !endElement) return;

		const distance =
			endElement.getBoundingClientRect().bottom - popupElement.getBoundingClientRect().top;
		if (distance <= 0) return;

		const popupHeight = Math.ceil(distance + 16);
		const nextSnapPoint = `${popupHeight}px`;
		const wasAtInitialSnapPoint = activeSnapPoint === initialSnapPoint;

		initialSnapPoint = nextSnapPoint;

		if (wasAtInitialSnapPoint || activeSnapPoint !== 1) {
			activeSnapPoint = nextSnapPoint;
		}

		if (pendingVisibilityRequest) {
			const request = pendingVisibilityRequest;
			pendingVisibilityRequest = undefined;
			centerRequestedMapObjectIfPopupCovers(request, { height: popupHeight });
		}
	}

	function updatePopupLayout() {
		tick().then(() => {
			if (open) updateInitialSnapPoint();
		});
	}

	watch(
		() => [data, props, open],
		() => {
			if (!open) return;
			updatePopupLayout();
		}
	);

	watch(
		() => getPopupVisibilityRequest(),
		(request) => {
			pendingVisibilityRequest = request;
			if (request) updatePopupLayout();
		}
	);

	function isActiveSnapPointExpanded() {
		if (activeSnapPoint === 1) return true;
		if (!document) return false;

		return Boolean(popupElement && Math.abs(popupElement.getBoundingClientRect().top) <= 1);
	}

	const unbindPopupDrawerSnapPoint = bindPopupDrawerSnapPoint({
		getActiveSnapPoint: () => activeSnapPoint,
		setActiveSnapPoint: (value) => (activeSnapPoint = value),
		getInitialSnapPoint: () => snapPoints[0],
		isExpanded: isActiveSnapPointExpanded
	});
	onDestroy(unbindPopupDrawerSnapPoint);
</script>

<Drawer.Root
	{open}
	onOpenChange={(open) => {
		if (!open) closePopup();
	}}
	modal={false}
	disablePointerDismissal
	{snapPoints}
	bind:snapPoint={activeSnapPoint}
>
	<Drawer.Portal>
		<Drawer.Viewport class="drawer-viewport z-50!">
			<Drawer.Popup
				bind:ref={popupElement}
				class="drawer-popup flex flex-col w-full h-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)] mt-safe-inset-top"
			>
				<Drawer.Handle class="my-1" />
				<Drawer.Content class="flex min-h-0 flex-1 flex-col overflow-hidden">
					<PopupBaseStatic
						{coords}
						{data}
						{props}
						onlyShowNavigationButton={activeSnapPoint === 1}
					/>
				</Drawer.Content>
			</Drawer.Popup>
		</Drawer.Viewport>
	</Drawer.Portal>
</Drawer.Root>
