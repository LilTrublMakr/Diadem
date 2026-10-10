<script lang="ts">
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import PokemonFormPicker from "@/components/custom/notifications/PokemonFormPicker.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import type {
		NotificationAreaDto,
		PokemonSubscriptionFilters
	} from "@/lib/features/notifications/types";
	import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
	import type { KojiFeatures } from "@/lib/features/koji";
	import { PLAYER_ID_PATTERN, type ShinyAccountDto } from "@/lib/features/shinyPrediction";

	type NumericFilterKey =
		| "minIv"
		| "maxIv"
		| "minCp"
		| "maxCp"
		| "minLevel"
		| "maxLevel"
		| "minAtk"
		| "maxAtk"
		| "minDef"
		| "maxDef"
		| "minSta"
		| "maxSta"
		| "minSize"
		| "maxSize";

	let {
		filters = $bindable(),
		ownAreas,
		kojiAreas,
		notificationAreas,
		showPredictedShiny = true,
		// Passing this switches the predicted-shiny section from the personal page's simple "my
		// linked accounts" checkbox to an explicit account picker — a channel post has no single
		// implicit recipient, so the admin must name which account (or a manually-typed player id)
		// to check against. Omit entirely to hide the section (feature disabled).
		shinyAccounts
	}: {
		filters: PokemonSubscriptionFilters;
		ownAreas: ScanAreaDto[];
		kojiAreas: KojiFeatures;
		notificationAreas: NotificationAreaDto[];
		showPredictedShiny?: boolean;
		shinyAccounts?: ShinyAccountDto[];
	} = $props();

	type ShinyTarget = "none" | "custom" | number;
	let shinyTarget = $derived<ShinyTarget>(
		filters.predictedShinyPlayerId ? "custom" : (filters.predictedShinyAccountId ?? "none")
	);

	function onShinyTargetChange(value: string) {
		if (value === "none") {
			filters.predictedShinyAccountId = undefined;
			filters.predictedShinyPlayerId = undefined;
		} else if (value === "custom") {
			filters.predictedShinyAccountId = undefined;
			filters.predictedShinyPlayerId ??= "";
		} else {
			filters.predictedShinyAccountId = Number(value);
			filters.predictedShinyPlayerId = undefined;
		}
	}

	function togglePvpLeague(league: "little" | "great" | "ultra", checked: boolean) {
		const leagues = new Set(filters.pvpLeagues ?? []);
		if (checked) leagues.add(league);
		else leagues.delete(league);
		filters.pvpLeagues = leagues.size > 0 ? [...leagues] : undefined;
		if (leagues.size > 0) filters.pvpMaxRank ??= 25;
		else filters.pvpMaxRank = undefined;
	}
</script>

{#snippet minMax(label: string, minKey: NumericFilterKey, maxKey: NumericFilterKey)}
	<div class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">{label}</span>
		<div class="flex items-center gap-1">
			<input
				type="number"
				placeholder="Min"
				value={filters[minKey] ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters[minKey] = v ? Number(v) : undefined;
				}}
				class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
			/>
			<span class="text-xs text-zinc-400 shrink-0">–</span>
			<input
				type="number"
				placeholder="Max"
				value={filters[maxKey] ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters[maxKey] = v ? Number(v) : undefined;
				}}
				class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</div>
	</div>
{/snippet}

<label class="flex flex-col gap-1 text-sm">
	<span class="text-zinc-500 dark:text-zinc-400">Species (optional, pick any number)</span>
	<PokemonPicker bind:selected={filters.pokemonIds} />
</label>

{#if filters.pokemonIds?.length === 1}
	<PokemonFormPicker pokemonId={filters.pokemonIds[0]} bind:form={filters.form} />
{/if}

<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
	{@render minMax("IV %", "minIv", "maxIv")}
	{@render minMax("CP", "minCp", "maxCp")}
	{@render minMax("Level", "minLevel", "maxLevel")}
	{@render minMax("Attack IV", "minAtk", "maxAtk")}
	{@render minMax("Defense IV", "minDef", "maxDef")}
	{@render minMax("Stamina IV", "minSta", "maxSta")}
	{@render minMax("Size (1-5, XXS-XXL)", "minSize", "maxSize")}
</div>

<label class="flex flex-col gap-1 text-sm">
	<span class="text-zinc-500 dark:text-zinc-400">Gender</span>
	<select
		value={filters.gender ?? ""}
		onchange={(e) =>
			(filters.gender = e.currentTarget.value
				? (Number(e.currentTarget.value) as 1 | 2 | 3)
				: undefined)}
		class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
	>
		<option value="">Any gender</option>
		<option value="1">Male</option>
		<option value="2">Female</option>
		<option value="3">Genderless</option>
	</select>
</label>

<label class="flex flex-col gap-1 text-sm">
	<span class="text-zinc-500 dark:text-zinc-400">PVP League (optional)</span>
	<div class="flex items-center gap-3 flex-wrap">
		{#each [["little", "Little Cup"], ["great", "Great League"], ["ultra", "Ultra League"]] as [value, label] (value)}
			<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
				<input
					type="checkbox"
					checked={filters.pvpLeagues?.includes(value as "little" | "great" | "ultra") ?? false}
					onchange={(e) =>
						togglePvpLeague(value as "little" | "great" | "ultra", e.currentTarget.checked)}
				/>
				{label}
			</label>
		{/each}
	</div>
	{#if filters.pvpLeagues && filters.pvpLeagues.length > 0}
		<div class="flex items-center gap-2 mt-1">
			<input
				type="number"
				min="1"
				placeholder="Max rank"
				value={filters.pvpMaxRank ?? 25}
				oninput={(e) => {
					const v = e.currentTarget.value;
					filters.pvpMaxRank = v ? Number(v) : undefined;
				}}
				class="w-24 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
			<span class="text-xs text-zinc-400 shrink-0">rank or better in any checked league</span>
		</div>
	{/if}
</label>

{#if showPredictedShiny}
	<label class="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
		<input
			type="checkbox"
			checked={filters.predictedShinyOnly ?? false}
			onchange={(e) => (filters.predictedShinyOnly = e.currentTarget.checked || undefined)}
		/>
		{#if shinyAccounts}
			Only when predicted shiny
		{:else}
			Only when predicted shiny for one of my linked accounts
			<a href="/profile" class="text-xs text-indigo-500 hover:underline">(manage)</a>
		{/if}
	</label>

	{#if shinyAccounts && filters.predictedShinyOnly}
		<label class="flex flex-col gap-1 text-sm pl-6">
			<span class="text-zinc-500 dark:text-zinc-400">Check against</span>
			<select
				value={shinyTarget}
				onchange={(e) => onShinyTargetChange(e.currentTarget.value)}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			>
				<option value="none">Any of my linked accounts</option>
				{#each shinyAccounts as account (account.id)}
					<option value={account.id}>{account.label} ({account.playerIdHint})</option>
				{/each}
				<option value="custom">Custom player ID…</option>
			</select>
			{#if shinyTarget === "custom"}
				{@const valid = PLAYER_ID_PATTERN.test(filters.predictedShinyPlayerId ?? "")}
				<input
					type="text"
					value={filters.predictedShinyPlayerId ?? ""}
					oninput={(e) =>
						(filters.predictedShinyPlayerId = e.currentTarget.value.trim().toLowerCase())}
					placeholder="16 hex chars, or 21 digits for Google accounts"
					class="rounded border px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 {valid ||
					!filters.predictedShinyPlayerId
						? 'border-zinc-300 dark:border-zinc-600'
						: 'border-red-400 dark:border-red-700'}"
				/>
			{/if}
		</label>
	{/if}
{/if}

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
