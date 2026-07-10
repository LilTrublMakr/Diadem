<script lang="ts">
	import AllotmentMeter from "@/components/custom/scanAreas/AllotmentMeter.svelte";
	import ScanAreaCard from "@/components/custom/scanAreas/ScanAreaCard.svelte";
	import ScanAreaMap from "@/components/custom/scanAreas/ScanAreaMap.svelte";
	import ScheduleEditor from "@/components/custom/scanAreas/ScheduleEditor.svelte";
	import {
		createArea,
		getScanAreasState,
		isApiError,
		loadScanAreas,
		patchArea
	} from "@/lib/features/scanAreas/scanAreasState.svelte";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import type { Polygon } from "geojson";
	import { Loader2, MapPinPlus, X } from "@lucide/svelte";

	const scanState = getScanAreasState();

	let mapComponent = $state<ReturnType<typeof ScanAreaMap>>();
	let selectedId = $state<number | null>(null);
	let scheduleEditingId = $state<number | null>(null);

	// draw / edit orchestration
	let mode = $state<"idle" | "drawing" | "saving" | "editing">("idle");
	let liveAreaSqM = $state<number | null>(null);
	let drawnPolygon = $state<Polygon | null>(null);
	let editingArea = $state<ScanAreaDto | null>(null);

	// save form
	let newName = $state("");
	let newWorkers = $state(1);
	let saving = $state(false);

	let errorMessage = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | undefined;

	let loggedIn = $derived(!!getUserDetails().details);

	let maxKm2 = $derived((scanState.limits.maxAreaSqM / 1_000_000).toFixed(1));
	let recommendedKm2 = $derived((scanState.limits.recommendedAreaSqM / 1_000_000).toFixed(1));
	let liveKm2 = $derived(liveAreaSqM === null ? null : (liveAreaSqM / 1_000_000).toFixed(2));
	let liveOversized = $derived(liveAreaSqM !== null && liveAreaSqM > scanState.limits.maxAreaSqM);
	let liveSizeClass = $derived(
		liveAreaSqM === null
			? ""
			: liveOversized
				? "text-red-500"
				: liveAreaSqM > scanState.limits.recommendedAreaSqM
					? "text-amber-500"
					: "text-emerald-500"
	);

	$effect(() => {
		void loadScanAreas();
	});

	function showError(message: string) {
		errorMessage = message;
		clearTimeout(errorTimer);
		errorTimer = setTimeout(() => (errorMessage = null), 6000);
	}

	function startDraw() {
		selectedId = null;
		drawnPolygon = null;
		liveAreaSqM = null;
		mode = "drawing";
		mapComponent?.startDraw();
	}

	function onDrawFinish(polygon: Polygon) {
		drawnPolygon = polygon;
		newName = "";
		newWorkers = 1;
		mode = "saving";
	}

	function cancelDrawing() {
		mapComponent?.cancelDrawing();
		drawnPolygon = null;
		liveAreaSqM = null;
		mode = "idle";
	}

	async function saveNewArea() {
		if (!drawnPolygon || saving || liveOversized) return;
		const name = newName.trim();
		if (!name) {
			showError("Give the area a name first");
			return;
		}
		saving = true;
		try {
			const result = await createArea({ name, geofence: drawnPolygon, workers: newWorkers });
			if (isApiError(result)) {
				showError(result.message);
				return;
			}
			cancelDrawing();
			selectedId = result.id;
		} finally {
			saving = false;
		}
	}

	function startEditGeometry(area: ScanAreaDto) {
		selectedId = area.id;
		editingArea = area;
		mode = "editing";
		mapComponent?.startEdit(area);
		mapComponent?.fitToArea(area);
	}

	async function saveEditedGeometry() {
		if (!editingArea || saving || liveOversized) return;
		const polygon = mapComponent?.getEditedPolygon();
		if (!polygon) {
			cancelEditing();
			return;
		}
		saving = true;
		try {
			const result = await patchArea(editingArea.id, { geofence: polygon });
			if (isApiError(result)) {
				showError(result.message);
				return;
			}
			cancelEditing();
		} finally {
			saving = false;
		}
	}

	function cancelEditing() {
		mapComponent?.cancelDrawing();
		editingArea = null;
		liveAreaSqM = null;
		mode = "idle";
	}

	function selectArea(area: ScanAreaDto) {
		if (mode !== "idle") return;
		selectedId = area.id;
		mapComponent?.fitToArea(area);
	}
</script>

<svelte:head>
	<title>My Areas — PoGo Map VT</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Areas</h1>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
				Draw your own areas and assign scan workers to them. Max {maxKm2} km² per area,
				{recommendedKm2} km² recommended.
			</p>
		</div>
	</div>

	{#if errorMessage}
		<div
			class="mb-4 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center justify-between"
		>
			<span>{errorMessage}</span>
			<button onclick={() => (errorMessage = null)} title="Dismiss"><X size={14} /></button>
		</div>
	{/if}

	{#if !loggedIn}
		<div
			class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400"
		>
			<a href="/login/discord" class="text-blue-600 dark:text-blue-400 hover:underline"
				>Log in with Discord</a
			> to manage your scan areas.
		</div>
	{:else if scanState.forbidden}
		<div
			class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400"
		>
			You don't have scan-area access. Ask an admin about worker allotments for your Discord role.
		</div>
	{:else if scanState.loading && !scanState.loaded}
		<div class="flex items-center justify-center p-16 text-zinc-400">
			<Loader2 size={24} class="animate-spin" />
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Map -->
			<div class="lg:col-span-2">
				<div
					class="relative h-[60vh] lg:h-[70vh] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
				>
					<ScanAreaMap
						bind:this={mapComponent}
						areas={scanState.areas}
						bind:selectedId
						{onDrawFinish}
						onAreaChange={(sqM) => (liveAreaSqM = sqM)}
					/>

					{#if mode === "drawing"}
						<div
							class="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900/90 text-zinc-100 px-4 py-2 text-sm flex items-center gap-3"
						>
							<span>Click the map to add points, click the first point to finish</span>
							{#if liveKm2 !== null}
								<span class="font-medium tabular-nums {liveSizeClass}">{liveKm2} km²</span>
							{/if}
							<button class="text-zinc-400 hover:text-white" onclick={cancelDrawing}>Cancel</button>
						</div>
					{:else if mode === "editing"}
						<div
							class="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900/90 text-zinc-100 px-4 py-2 text-sm flex items-center gap-3"
						>
							<span>Click the shape, then drag points to reshape</span>
							{#if liveKm2 !== null}
								<span class="font-medium tabular-nums {liveSizeClass}">{liveKm2} km²</span>
							{/if}
							<button
								class="rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-white disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={saveEditedGeometry}
								disabled={saving || liveOversized}
								title={liveOversized ? `Over the ${maxKm2} km² limit` : undefined}
							>
								Save
							</button>
							<button class="text-zinc-400 hover:text-white" onclick={cancelEditing}>Cancel</button>
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar -->
			<div class="flex flex-col gap-4">
				<AllotmentMeter used={scanState.allotment.used} total={scanState.allotment.total} />

				{#if mode === "saving"}
					<div
						class="rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col gap-3"
					>
						<div class="flex items-center justify-between">
							<span class="font-medium text-zinc-900 dark:text-zinc-100">New scan area</span>
							{#if liveKm2 !== null}
								<span class="text-sm tabular-nums {liveSizeClass}">{liveKm2} km²</span>
							{/if}
						</div>
						<input
							type="text"
							bind:value={newName}
							placeholder="Area name"
							maxlength={64}
							class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
						/>
						<label
							class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300"
						>
							Workers
							<input
								type="number"
								bind:value={newWorkers}
								min={1}
								max={100}
								class="w-20 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
							/>
						</label>
						<div class="flex gap-2">
							<button
								class="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
								onclick={saveNewArea}
								disabled={saving || liveOversized}
								title={liveOversized ? `Over the ${maxKm2} km² limit` : undefined}
							>
								{liveOversized ? "Too large" : saving ? "Saving…" : "Save area"}
							</button>
							<button
								class="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
								onclick={cancelDrawing}
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<button
						class="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors disabled:opacity-40"
						onclick={startDraw}
						disabled={mode !== "idle"}
					>
						<MapPinPlus size={16} />
						Draw new area
					</button>
				{/if}

				<div class="flex flex-col gap-2 overflow-y-auto">
					{#if scanState.areas.length === 0 && mode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No scan areas yet — draw your first one.
						</p>
					{/if}
					{#each scanState.areas as area (area.id)}
						<ScanAreaCard
							{area}
							selected={selectedId === area.id}
							allotment={scanState.allotment}
							recommendedAreaSqM={scanState.limits.recommendedAreaSqM}
							editingGeometry={mode === "editing" && editingArea?.id === area.id}
							editingSchedule={scheduleEditingId === area.id}
							onSelect={() => selectArea(area)}
							onEditGeometry={() => startEditGeometry(area)}
							onEditSchedule={() => (scheduleEditingId = area.id)}
							onError={showError}
						/>
						{#if scheduleEditingId === area.id}
							<ScheduleEditor
								{area}
								allAreas={scanState.areas}
								allotment={scanState.allotment}
								onClose={() => (scheduleEditingId = null)}
								onError={showError}
							/>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
