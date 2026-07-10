<script lang="ts">
	import { isApiError, saveSchedule } from "@/lib/features/scanAreas/scanAreasState.svelte";
	import {
		findIntraAreaOverlap,
		toOccupancySources,
		validateAllotment
	} from "@/lib/features/scanAreas/scheduleOverlap";
	import {
		type AreaSchedule,
		DAY_TOKENS,
		type DayToken,
		type ScanAreaMode
	} from "@/lib/features/scanAreas/scheduleTypes";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import { CalendarPlus, Plus, X } from "@lucide/svelte";

	let {
		area,
		allAreas,
		allotment,
		onClose,
		onError
	}: {
		area: ScanAreaDto;
		allAreas: ScanAreaDto[];
		allotment: { total: number; used: number };
		onClose: () => void;
		onError: (message: string) => void;
	} = $props();

	const DAY_LABELS: Record<DayToken, string> = {
		mon: "M",
		tue: "T",
		wed: "W",
		thu: "T",
		fri: "F",
		sat: "S",
		sun: "S"
	};

	const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const today = new Date().toISOString().slice(0, 10);

	// deep local draft — deliberate snapshot; the editor remounts per area
	// svelte-ignore state_referenced_locally
	let draft = $state<AreaSchedule>(
		area.schedule
			? JSON.parse(JSON.stringify(area.schedule))
			: { tz: browserTz, weekly: [], dated: [] }
	);
	let saving = $state(false);

	let selfOverlap = $derived(findIntraAreaOverlap(draft));
	let allotmentConflict = $derived.by(() => {
		if (allotment.total === -1) return null;
		const draftArea: {
			id: number;
			name: string;
			workers: number;
			active: boolean;
			mode: ScanAreaMode;
			schedule: AreaSchedule | null;
		}[] = allAreas.map((a) => ({
			id: a.id,
			name: a.name,
			workers: a.workers,
			active: a.active,
			mode: a.mode,
			schedule: a.schedule
		}));
		const result = validateAllotment(
			toOccupancySources(draftArea, area.id, {
				mode: "scheduled",
				active: false,
				schedule: draft
			}),
			allotment.total
		);
		return result.ok ? null : result.conflict;
	});
	let hasWindows = $derived(draft.weekly.length > 0 || draft.dated.length > 0);
	let canSave = $derived(!saving && !selfOverlap && !allotmentConflict);

	function addWeekly() {
		draft.weekly.push({ days: ["mon"], start: "09:00", end: "17:00" });
	}

	function toggleDay(windowIndex: number, day: DayToken) {
		const days = draft.weekly[windowIndex].days;
		if (days.includes(day)) {
			if (days.length > 1) draft.weekly[windowIndex].days = days.filter((d) => d !== day);
		} else {
			draft.weekly[windowIndex].days = DAY_TOKENS.filter((d) => d === day || days.includes(d));
		}
	}

	function addDated() {
		draft.dated.push({ date: today, start: "09:00", end: "17:00" });
	}

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			draft.tz = browserTz;
			const result = await saveSchedule(area.id, JSON.parse(JSON.stringify(draft)));
			if (isApiError(result)) {
				onError(result.message);
				return;
			}
			onClose();
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col gap-3"
>
	<div class="flex items-center justify-between">
		<span class="font-medium text-zinc-900 dark:text-zinc-100">Schedule — {area.name}</span>
		<button
			class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
			onclick={onClose}
			title="Close"
		>
			<X size={16} />
		</button>
	</div>
	<p class="text-xs text-zinc-500 dark:text-zinc-400 -mt-2">
		Times in {browserTz}. The area scans with {area.workers}
		{area.workers === 1 ? "worker" : "workers"} during these windows.
	</p>

	<!-- Weekly windows -->
	<div class="flex flex-col gap-2">
		<span class="text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide"
			>Weekly</span
		>
		{#each draft.weekly as window, i (i)}
			<div class="flex flex-wrap items-center gap-2">
				<div class="flex gap-0.5">
					{#each DAY_TOKENS as day (day)}
						<button
							class="w-6 h-6 rounded text-xs font-medium transition-colors {window.days.includes(
								day
							)
								? 'bg-blue-600 text-white'
								: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'}"
							onclick={() => toggleDay(i, day)}
							title={day}
						>
							{DAY_LABELS[day]}
						</button>
					{/each}
				</div>
				<input
					type="time"
					bind:value={window.start}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
				<span class="text-xs text-zinc-400">to</span>
				<input
					type="time"
					bind:value={window.end}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
				<button
					class="text-zinc-400 hover:text-red-500"
					onclick={() => (draft.weekly = draft.weekly.filter((_, idx) => idx !== i))}
					title="Remove window"
				>
					<X size={14} />
				</button>
			</div>
			{#if window.end <= window.start}
				<p class="text-xs text-zinc-400 -mt-1">Ends next day (overnight window)</p>
			{/if}
		{/each}
		{#if draft.weekly.length < 20}
			<button
				class="self-start flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
				onclick={addWeekly}
			>
				<Plus size={12} /> Add weekly window
			</button>
		{/if}
	</div>

	<!-- Dated windows -->
	<div class="flex flex-col gap-2">
		<span class="text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide"
			>Specific dates</span
		>
		{#each draft.dated as window, i (i)}
			<div class="flex flex-wrap items-center gap-2">
				<input
					type="date"
					bind:value={window.date}
					min={today}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
				<input
					type="time"
					bind:value={window.start}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
				<span class="text-xs text-zinc-400">to</span>
				<input
					type="time"
					bind:value={window.end}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
				<button
					class="text-zinc-400 hover:text-red-500"
					onclick={() => (draft.dated = draft.dated.filter((_, idx) => idx !== i))}
					title="Remove date"
				>
					<X size={14} />
				</button>
			</div>
		{/each}
		{#if draft.dated.length < 50}
			<button
				class="self-start flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
				onclick={addDated}
			>
				<CalendarPlus size={12} /> Add date
			</button>
		{/if}
	</div>

	{#if selfOverlap}
		<div
			class="rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400"
		>
			This area's own windows overlap: {selfOverlap.a} and {selfOverlap.b}
		</div>
	{:else if allotmentConflict}
		<div
			class="rounded border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-400"
		>
			Needs {allotmentConflict.load} workers on
			{allotmentConflict.at.type === "weekly"
				? allotmentConflict.at.day
				: allotmentConflict.at.date}
			at {allotmentConflict.at.time} (ET) but your allotment is {allotmentConflict.allotment} — overlapping:
			{allotmentConflict.areas.join(", ")}
		</div>
	{:else if !hasWindows}
		<div
			class="rounded border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-500"
		>
			No windows yet — the area won't scan until you add one.
		</div>
	{/if}

	<div class="flex gap-2">
		<button
			class="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={save}
			disabled={!canSave}
		>
			{saving ? "Saving…" : "Save schedule"}
		</button>
		<button
			class="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
			onclick={onClose}
		>
			Cancel
		</button>
	</div>
</div>
