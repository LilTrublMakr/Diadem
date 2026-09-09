<script lang="ts">
	import {
		getPopupActions,
		isPopupActionActive,
		isPopupExpanded,
		PopupAction,
		supportsPopupAction,
		togglePopupAction,
		togglePopupExpanded
	} from "@/lib/ui/popupActions.js";
	import {
		Binoculars,
		BookOpen,
		Check,
		CircleDot,
		CircleOff,
		Copy,
		Eye,
		EyeClosed,
		Focus,
		Minus,
		Navigation,
		Plus,
		Timer,
		TimerOff,
		Scan
	} from "@lucide/svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getMapsUrl } from "@/lib/utils/mapUrl";
	import { Coords } from "@/lib/utils/coordinates";
	import { getShareTitle } from "@/lib/features/shareTexts";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";
	import { ClientMapObjectType, MapObjectType, type MapData } from "$lib/mapObjects/mapObjectTypes";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import { getFocusedRouteMapId, setFocusedRouteMapId } from "$lib/features/focusedRoute.svelte.js";
	import { refreshRouteFeatures } from "$lib/map/featuresGen.svelte";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { setCurrentScoutCenter, setCurrentScoutCoords } from "$lib/features/scout.svelte";
	import { getConfig } from "$lib/services/config/config";
	import { hasFeatureAnywhere } from "$lib/services/user/checkPerm";
	import { getUserDetails } from "$lib/services/user/userDetails.svelte";
	import { Menu, openMenu } from "$lib/ui/menus.svelte";
	import { Features } from "$lib/utils/features";

	let {
		lat,
		lon,
		data
	}: {
		lat: number;
		lon: number;
		data: MapData;
	} = $props();

	let selectedType = $derived(data.type === ClientMapObjectType.LOCATION ? undefined : data.type);
	let selectedMapId = $derived(data?.mapId);
	let pokemonData = $derived(
		selectedType === MapObjectType.POKEMON ? (data as PokemonData) : undefined
	);
	let routeFocused = $derived(
		selectedType === MapObjectType.ROUTE && getFocusedRouteMapId() === selectedMapId
	);

	let copiedLat = $state(false);
	let copiedLon = $state(false);

	function copyToClipboard(value: number, setCopied: (v: boolean) => void) {
		navigator.clipboard.writeText(String(value));
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}
</script>

<div class="flex flex-col gap-2 px-4 pb-2">
	{#if pokemonData}
		<div class="flex gap-2 flex-wrap">
			<PopupButton
				compact
				Icon={BookOpen}
				label={m.popup_view_pokedex()}
				tag="a"
				href="/pokedex/{pokemonData.pokemon_id}"
				target="_blank"
			/>
		</div>
	{/if}

	<div class="flex gap-2 flex-wrap">
		<PopupButton
			variant="default"
			Icon={Navigation}
			label={m.popup_navigate()}
			tag="a"
			href={getMapsUrl(new Coords(lat, lon), getShareTitle(getCurrentSelectedData()))}
			target="_blank"
		/>
		{#if data.type === ClientMapObjectType.LOCATION && getConfig().tools.scout && hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT)}
			<PopupButton
				Icon={Binoculars}
				label={m.scout_location()}
				onclick={() => {
					const coords = new Coords(lat, lon);
					setCurrentScoutCoords([coords]);
					setCurrentScoutCenter(coords);
					openMenu(Menu.SCOUT);
				}}
			/>
		{/if}
		{#if supportsPopupAction(selectedType, PopupAction.FOCUS_ROUTE) && getUserSettings().filters.route.enabled}
			<PopupButton
				Icon={Focus}
				label={m.focus_route()}
				IconActive={Scan}
				labelActive={m.unfocus_route()}
				active={routeFocused}
				onclick={() => {
					setFocusedRouteMapId(routeFocused ? null : selectedMapId);
					refreshRouteFeatures();
				}}
			/>
		{/if}
		{#if pokemonData}
			<PopupButton
				compact
				Icon={Copy}
				label={m.popup_copy_lat()}
				IconActive={Check}
				labelActive={m.popup_copied()}
				active={copiedLat}
				onclick={() => copyToClipboard(lat, (v) => (copiedLat = v))}
			/>
			<PopupButton
				compact
				Icon={Copy}
				label={m.popup_copy_lon()}
				IconActive={Check}
				labelActive={m.popup_copied()}
				active={copiedLon}
				onclick={() => copyToClipboard(lon, (v) => (copiedLon = v))}
			/>
		{/if}
	</div>

	{#if supportsPopupAction(selectedType, PopupAction.DIMMED) || supportsPopupAction(selectedType, PopupAction.RADIUS) || supportsPopupAction(selectedType, PopupAction.TIMER)}
		<div class="flex gap-2 flex-wrap">
			{#if supportsPopupAction(selectedType, PopupAction.DIMMED)}
				<PopupButton
					compact
					Icon={EyeClosed}
					label={m.popup_action_dim()}
					IconActive={Eye}
					labelActive={m.popup_action_undim()}
					active={isPopupActionActive(selectedType, selectedMapId, PopupAction.DIMMED)}
					onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.DIMMED)}
					actions={getPopupActions(selectedType, PopupAction.DIMMED)}
				/>
			{/if}
			{#if supportsPopupAction(selectedType, PopupAction.RADIUS)}
				<PopupButton
					compact
					Icon={CircleDot}
					label={m.popup_action_show_radius()}
					IconActive={CircleOff}
					labelActive={m.popup_action_hide_radius()}
					active={isPopupActionActive(selectedType, selectedMapId, PopupAction.RADIUS)}
					onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.RADIUS)}
					actions={getPopupActions(selectedType, PopupAction.RADIUS)}
				/>
			{/if}
			{#if supportsPopupAction(selectedType, PopupAction.TIMER)}
				<PopupButton
					compact
					Icon={Timer}
					label={m.popup_action_show_timer()}
					IconActive={TimerOff}
					labelActive={m.popup_action_hide_timer()}
					active={isPopupActionActive(selectedType, selectedMapId, PopupAction.TIMER)}
					onclick={() => togglePopupAction(selectedType, selectedMapId, PopupAction.TIMER)}
					actions={getPopupActions(selectedType, PopupAction.TIMER)}
				/>
			{/if}
		</div>
	{/if}
</div>
