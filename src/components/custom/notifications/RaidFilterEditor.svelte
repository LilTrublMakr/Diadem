<script lang="ts">
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		NotificationAreaDto,
		RaidSubscriptionFilters,
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
		filters: RaidSubscriptionFilters;
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
		<span class="text-zinc-500 dark:text-zinc-400">Boss species (optional, pick any number)</span>
		<PokemonPicker bind:selected={filters.bossPokemonIds} />
	</label>

	<div class="grid grid-cols-2 gap-3">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Min level</span>
			<input
				type="number"
				min="1"
				max="6"
				value={filters.minLevel ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.minLevel = v ? Number(v) : undefined;
				}}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Max level</span>
			<input
				type="number"
				min="1"
				max="6"
				value={filters.maxLevel ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.maxLevel = v ? Number(v) : undefined;
				}}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>
	</div>

	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Controlling team (optional)</span>
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

	<div class="flex items-center gap-4 flex-wrap text-sm">
		<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
			<input
				type="checkbox"
				checked={filters.exRaidOnly ?? false}
				onchange={(e) => (filters.exRaidOnly = e.currentTarget.checked || undefined)}
			/>
			EX raids only
		</label>
		<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
			<input
				type="checkbox"
				checked={filters.notifyOnEgg ?? true}
				onchange={(e) => (filters.notifyOnEgg = e.currentTarget.checked)}
			/>
			Notify on eggs
		</label>
		<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
			<input
				type="checkbox"
				checked={filters.notifyOnBoss ?? true}
				onchange={(e) => (filters.notifyOnBoss = e.currentTarget.checked)}
			/>
			Notify on hatched bosses
		</label>
	</div>

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
