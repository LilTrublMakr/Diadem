<script lang="ts">
	import { Drawer } from "$lib/drawer";
	import {
		getOpenedMenu,
		Menu,
		onMenuDrawerOpenChangeComplete,
		resetJustChangedMenus
	} from "@/lib/ui/menus.svelte";
	import MenuContainer from "@/components/menus/MenuContainer.svelte";
	import MobileTitle from "@/components/menus/mobile/MobileTitle.svelte";
	import { onMount } from "svelte";

	let {
		menus
	}: {
		menus: (Menu | null)[];
	} = $props();

	onMount(() => {
		resetJustChangedMenus();
	});
</script>

<Drawer.Root
	open={menus.includes(getOpenedMenu())}
	onOpenChangeComplete={onMenuDrawerOpenChangeComplete}
	modal={false}
	disablePointerDismissal
>
	<Drawer.Portal>
		<Drawer.Viewport class="drawer-viewport flex items-end z-0!">
			<Drawer.Popup
				class="drawer-popup flex flex-col w-full h-fit rounded-t-xl pb-[env(safe-area-inset-bottom)]"
			>
				<MobileTitle />
				<Drawer.Content class="pb-20 content px-2 bg-card/60 backdrop-blur-sm pt-3">
					<MenuContainer />
				</Drawer.Content>
			</Drawer.Popup>
		</Drawer.Viewport>
	</Drawer.Portal>
</Drawer.Root>
