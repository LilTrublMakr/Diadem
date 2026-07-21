<script lang="ts">
	import {
		DAY_TOKENS,
		type DayToken,
		type NotificationSchedule
	} from "@/lib/features/notifications/scheduleTypes";
	import { CalendarPlus, Plus, X } from "@lucide/svelte";

	let { schedule = $bindable() }: { schedule: NotificationSchedule } = $props();

	const DAY_LABELS: Record<DayToken, string> = {
		mon: "M",
		tue: "T",
		wed: "W",
		thu: "T",
		fri: "F",
		sat: "S",
		sun: "S"
	};

	const today = new Date().toISOString().slice(0, 10);
	let hasWindows = $derived(schedule.weekly.length > 0 || schedule.dated.length > 0);

	function addWeekly() {
		schedule.weekly.push({ days: ["mon"], start: "09:00", end: "17:00" });
	}

	function toggleDay(windowIndex: number, day: DayToken) {
		const days = schedule.weekly[windowIndex].days;
		if (days.includes(day)) {
			if (days.length > 1) schedule.weekly[windowIndex].days = days.filter((d) => d !== day);
		} else {
			schedule.weekly[windowIndex].days = DAY_TOKENS.filter((d) => d === day || days.includes(d));
		}
	}

	function addDated() {
		schedule.dated.push({ date: today, start: "09:00", end: "17:00" });
	}
</script>

<div class="flex flex-col gap-3">
	<label class="flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={schedule.invert} />
		<span class="text-zinc-500 dark:text-zinc-400">
			Invert — be active outside these windows instead of during them
		</span>
	</label>

	<!-- Weekly windows -->
	<div class="flex flex-col gap-2">
		<span class="text-xs font-medium text-zinc-600 dark:text-zinc-300 uppercase tracking-wide"
			>Weekly</span
		>
		{#each schedule.weekly as window, i (i)}
			<div class="flex flex-wrap items-center gap-2">
				<div class="flex gap-0.5">
					{#each DAY_TOKENS as day (day)}
						<button
							type="button"
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
					type="button"
					class="text-zinc-400 hover:text-red-500"
					onclick={() => (schedule.weekly = schedule.weekly.filter((_, idx) => idx !== i))}
					title="Remove window"
				>
					<X size={14} />
				</button>
			</div>
			{#if window.end <= window.start}
				<p class="text-xs text-zinc-400 -mt-1">Ends next day (overnight window)</p>
			{/if}
		{/each}
		{#if schedule.weekly.length < 20}
			<button
				type="button"
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
		{#each schedule.dated as window, i (i)}
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
					type="button"
					class="text-zinc-400 hover:text-red-500"
					onclick={() => (schedule.dated = schedule.dated.filter((_, idx) => idx !== i))}
					title="Remove date"
				>
					<X size={14} />
				</button>
			</div>
		{/each}
		{#if schedule.dated.length < 50}
			<button
				type="button"
				class="self-start flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
				onclick={addDated}
			>
				<CalendarPlus size={12} /> Add date
			</button>
		{/if}
	</div>

	{#if !hasWindows}
		<div
			class="rounded border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-500"
		>
			{schedule.invert
				? 'No windows yet — with "active outside" on and no windows, this is active all the time.'
				: "No windows yet — this subscription won't send anything until you add one."}
		</div>
	{/if}
</div>
