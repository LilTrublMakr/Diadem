<script lang="ts">
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		GymSubscriptionFilters,
		NotificationAreaDto,
		RaidTeam
	} from "@/lib/features/notifications/types";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import type { KojiFeatures } from "@/lib/features/koji";

	let {
		filters = $bindable(),
		ownAreas,
		kojiAreas,
		notificationAreas
	}: {
		filters: GymSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
	} = $props();

	const TEAM_OPTIONS: { value: RaidTeam; label: string }[] = [
		{ value: 0, label: "Neutral" },
		{ value: 1, label: "Mystic" },
		{ value: 2, label: "Valor" },
		{ value: 3, label: "Instinct" }
	];

	function toggleTeam(team: RaidTeam, checked: boolean) {
		const teams = new Set(filters.teams ?? []);
		if (checked) teams.add(team);
		else teams.delete(team);
		filters.teams = teams.size > 0 ? [...teams] : undefined;
	}
</script>

<div class="flex flex-col gap-3">
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400"
			>New Controlling Team (optional, pick any number) — always notifies on a team change to one of
			these</span
		>
		<div class="flex items-center gap-3 flex-wrap">
			{#each TEAM_OPTIONS as opt (opt.value)}
				<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
					<input
						type="checkbox"
						checked={filters.teams?.includes(opt.value) ?? false}
						onchange={(e) => toggleTeam(opt.value, e.currentTarget.checked)}
					/>
					{opt.label}
				</label>
			{/each}
		</div>
	</label>

	<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
		<input
			type="checkbox"
			checked={filters.slotChanges ?? false}
			onchange={(e) => (filters.slotChanges = e.currentTarget.checked || undefined)}
		/>
		Also notify on open-slot changes (no team change)
	</label>

	<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
		<input
			type="checkbox"
			checked={filters.battleChanges ?? false}
			onchange={(e) => (filters.battleChanges = e.currentTarget.checked || undefined)}
		/>
		Also notify when a battle starts (no team change, at most once per 5 min per gym)
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
