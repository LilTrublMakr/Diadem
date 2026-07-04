<script lang="ts">
	import {
		isApiError,
		patchArea,
		removeArea,
		setActive,
		setMode,
		triggerQuestScan
	} from "@/lib/features/scanAreas/scanAreasState.svelte";
	import type { ScanAreaMode } from "@/lib/features/scanAreas/scheduleTypes";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import {
		CalendarClock,
		Check,
		Loader2,
		Minus,
		Pencil,
		Plus,
		ScrollText,
		Trash2,
		X
	} from "lucide-svelte";

	let {
		area,
		selected,
		allotment,
		recommendedAreaSqM,
		editingGeometry,
		editingSchedule,
		onSelect,
		onEditGeometry,
		onEditSchedule,
		onError
	}: {
		area: ScanAreaDto;
		selected: boolean;
		allotment: { total: number; used: number };
		recommendedAreaSqM: number;
		editingGeometry: boolean;
		editingSchedule: boolean;
		onSelect: () => void;
		onEditGeometry: () => void;
		onEditSchedule: () => void;
		onError: (message: string) => void;
	} = $props();

	let busy = $state(false);
	let renaming = $state(false);
	let renameValue = $state("");
	let confirmingDelete = $state(false);
	let questStarted = $state(false);

	let sizeKm2 = $derived((area.areaSqM / 1_000_000).toFixed(2));
	let oversized = $derived(area.areaSqM > recommendedAreaSqM);
	let canIncreaseWorkers = $derived(
		!area.active || allotment.total === -1 || allotment.used < allotment.total
	);

	async function run<T>(action: () => Promise<T | { code: string; message: string }>) {
		if (busy) return;
		busy = true;
		try {
			const result = await action();
			if (isApiError(result)) onError(result.message);
		} finally {
			busy = false;
		}
	}

	function changeWorkers(delta: number) {
		const workers = area.workers + delta;
		if (workers < 1 || workers > 100) return;
		void run(() => patchArea(area.id, { workers }));
	}

	function toggleActive() {
		void run(() => setActive(area.id, !area.active));
	}

	function changeMode(mode: ScanAreaMode) {
		if (mode === area.mode) return;
		void run(() => setMode(area.id, mode));
	}

	let scheduleSummary = $derived.by(() => {
		if (!area.schedule) return null;
		const parts: string[] = [];
		if (area.schedule.weekly.length > 0) {
			parts.push(
				`${area.schedule.weekly.length} weekly ${area.schedule.weekly.length === 1 ? "window" : "windows"}`
			);
		}
		if (area.schedule.dated.length > 0) {
			parts.push(
				`${area.schedule.dated.length} ${area.schedule.dated.length === 1 ? "date" : "dates"}`
			);
		}
		return parts.length > 0 ? parts.join(" · ") : null;
	});

	function startRename() {
		renameValue = area.name;
		renaming = true;
	}

	function submitRename() {
		renaming = false;
		const name = renameValue.trim();
		if (!name || name === area.name) return;
		void run(() => patchArea(area.id, { name }));
	}

	function deleteArea() {
		confirmingDelete = false;
		void run(async () => {
			const error = await removeArea(area.id);
			return error ?? area;
		});
	}

	function questScan() {
		void run(async () => {
			const error = await triggerQuestScan(area.id);
			if (!error) {
				questStarted = true;
				setTimeout(() => (questStarted = false), 4000);
			}
			return error ?? area;
		});
	}
</script>

<div
	class="rounded-lg border p-4 transition-colors cursor-pointer {selected
		? 'border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
		: 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'}"
	onclick={onSelect}
	onkeydown={(e) => e.key === "Enter" && onSelect()}
	role="button"
	tabindex="0"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			{#if renaming}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex items-center gap-1"
					onclick={(e) => e.stopPropagation()}
					onkeydown={() => {}}
				>
					<input
						type="text"
						bind:value={renameValue}
						maxlength={64}
						class="w-36 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
						onkeydown={(e) => {
							if (e.key === "Enter") submitRename();
							if (e.key === "Escape") renaming = false;
						}}
					/>
					<button class="text-emerald-600" onclick={submitRename} title="Save name">
						<Check size={16} />
					</button>
					<button class="text-zinc-400" onclick={() => (renaming = false)} title="Cancel">
						<X size={16} />
					</button>
				</div>
			{:else}
				<div class="flex items-center gap-1.5">
					<span class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{area.name}</span>
					<button
						class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0"
						onclick={(e) => {
							e.stopPropagation();
							startRename();
						}}
						title="Rename"
					>
						<Pencil size={13} />
					</button>
				</div>
			{/if}
			<div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
				{sizeKm2} km²
				{#if oversized}
					<span
						class="text-amber-600 dark:text-amber-500"
						title="Larger than recommended — scans will be slower"
					>
						· above recommended size</span
					>
				{/if}
			</div>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex items-center gap-2 shrink-0"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			{#if busy}
				<Loader2 size={16} class="animate-spin text-zinc-400" />
			{/if}
			{#if area.mode === "manual"}
				<button
					class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {area.active
						? 'bg-emerald-500'
						: 'bg-zinc-300 dark:bg-zinc-700'}"
					onclick={toggleActive}
					disabled={busy}
					title={area.active ? "Deactivate" : "Activate"}
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {area.active
							? 'translate-x-4.5'
							: 'translate-x-0.5'}"
					></span>
				</button>
			{:else}
				<span
					class="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1"
					title="Controlled by schedule"
				>
					<CalendarClock size={14} />
				</span>
			{/if}
		</div>
	</div>

	<!-- Mode switch + schedule summary -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="mt-2 flex items-center justify-between gap-2"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<div class="flex rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden text-xs">
			<button
				class="px-2 py-0.5 transition-colors {area.mode === 'manual'
					? 'bg-zinc-700 dark:bg-zinc-200 text-white dark:text-zinc-900 font-medium'
					: 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
				onclick={() => changeMode("manual")}
				disabled={busy}
			>
				Manual
			</button>
			<button
				class="px-2 py-0.5 transition-colors {area.mode === 'scheduled'
					? 'bg-blue-600 text-white font-medium'
					: 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
				onclick={() => changeMode("scheduled")}
				disabled={busy}
			>
				Scheduled
			</button>
		</div>
		{#if area.mode === "scheduled"}
			<button
				class="flex items-center gap-1 text-xs {scheduleSummary
					? 'text-zinc-500 dark:text-zinc-400'
					: 'text-amber-600 dark:text-amber-500'} hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50"
				onclick={onEditSchedule}
				disabled={busy || editingSchedule}
				title="Edit schedule"
			>
				<CalendarClock size={13} />
				{scheduleSummary ?? "No schedule set"}
			</button>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="mt-3 flex items-center justify-between gap-2"
		onclick={(e) => e.stopPropagation()}
		onkeydown={() => {}}
	>
		<div class="flex items-center gap-1.5">
			<span class="text-xs text-zinc-500 dark:text-zinc-400">Workers</span>
			<div class="flex items-center rounded border border-zinc-200 dark:border-zinc-700">
				<button
					class="px-1.5 py-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
					onclick={() => changeWorkers(-1)}
					disabled={busy || area.workers <= 1}
					title="Fewer workers"
				>
					<Minus size={13} />
				</button>
				<span class="px-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
					{area.workers}
				</span>
				<button
					class="px-1.5 py-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30"
					onclick={() => changeWorkers(1)}
					disabled={busy || area.workers >= 100 || !canIncreaseWorkers}
					title="More workers"
				>
					<Plus size={13} />
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2 text-zinc-400">
			{#if (area.mode === "manual" && area.active) || area.mode === "scheduled"}
				{#if questStarted}
					<span class="text-xs text-emerald-600 dark:text-emerald-500">Quest scan started</span>
				{:else}
					<button
						class="hover:text-zinc-700 dark:hover:text-zinc-200"
						onclick={questScan}
						disabled={busy}
						title="Scan quests now"
					>
						<ScrollText size={15} />
					</button>
				{/if}
			{/if}
			<button
				class="hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-30"
				onclick={onEditGeometry}
				disabled={busy || editingGeometry}
				title="Edit area on map"
			>
				<Pencil size={15} />
			</button>
			{#if confirmingDelete}
				<button class="text-red-500 text-xs font-medium" onclick={deleteArea} disabled={busy}>
					Confirm delete
				</button>
				<button class="text-xs" onclick={() => (confirmingDelete = false)}>Cancel</button>
			{:else}
				<button
					class="hover:text-red-500"
					onclick={() => (confirmingDelete = true)}
					disabled={busy}
					title="Delete area"
				>
					<Trash2 size={15} />
				</button>
			{/if}
		</div>
	</div>
</div>
