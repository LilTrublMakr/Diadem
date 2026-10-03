<script lang="ts">
	import type { RocketLineup } from "@/lib/types/rocketLineups";
	import type { RawExportPokemon } from "@/lib/types/collectionExport";
	import { ROCKET_QUOTES } from "@/lib/utils/rocketQuotes";
	import { getWeaknesses } from "@/lib/utils/typeEffectiveness";
	import { rankCountersForLineup } from "@/lib/utils/rocketCounters";
	import { getSpeciesName, getFormName } from "@/lib/utils/collectionExportUtils";
	import ExportParsePanel from "@/components/custom/ExportParsePanel.svelte";

	let lineups = $state<RocketLineup[] | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let search = $state("");
	let myPokemon = $state<RawExportPokemon[] | null>(null);

	async function fetchLineups() {
		loading = true;
		fetchError = null;
		try {
			const res = await fetch("/api/custom/rocket");
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			lineups = await res.json();
		} catch (e) {
			fetchError = e instanceof Error ? e.message : "Unknown error";
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchLineups();
	});

	function onRosterParsed(pokemon: RawExportPokemon[]) {
		myPokemon = pokemon;
	}

	const LEADER_NAMES = ["Giovanni", "Cliff", "Arlo", "Sierra"];

	let filtered = $derived.by(() => {
		const list = lineups ?? [];
		if (!search.trim()) return list;
		const q = search.trim().toLowerCase();
		return list.filter(
			(l) =>
				l.name.toLowerCase().includes(q) ||
				[...l.firstPokemon, ...l.secondPokemon, ...l.thirdPokemon].some((p) =>
					p.name.toLowerCase().includes(q)
				)
		);
	});

	let leaders = $derived(filtered.filter((l) => LEADER_NAMES.includes(l.name)));
	let grunts = $derived(filtered.filter((l) => !LEADER_NAMES.includes(l.name)));

	const PHASES: { key: "firstPokemon" | "secondPokemon" | "thirdPokemon"; label: string }[] = [
		{ key: "firstPokemon", label: "1st" },
		{ key: "secondPokemon", label: "2nd" },
		{ key: "thirdPokemon", label: "3rd" }
	];
</script>

<svelte:head>
	<title>Team GO Rocket — PoGo Map VT</title>
</svelte:head>

<div class="max-w-5xl mx-auto p-6">
	<div class="flex items-center justify-between mb-2">
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Team GO Rocket</h1>
		<input
			type="search"
			placeholder="Search grunt or Pokémon…"
			bind:value={search}
			class="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-56"
		/>
	</div>
	<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
		Every current lineup, in encounter order. Upload a collection export below to see your own
		best counters for any lineup.
	</p>

	<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
		<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
			Optional — upload, drag-and-drop, or paste a PokeGenie/CalcyIV export to unlock "Show my
			best counters" on every lineup below.
		</p>
		<ExportParsePanel onParsed={onRosterParsed} />
		{#if myPokemon}
			<p class="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
				Parsed {myPokemon.length} Pokémon — expand "Show my best counters" on any lineup below.
			</p>
		{/if}
	</div>

	{#if fetchError}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
			Failed to load Team GO Rocket lineups: {fetchError}
		</div>
	{/if}

	{#if loading}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-16 text-center text-zinc-400 dark:text-zinc-600">
			Loading…
		</div>
	{:else}
		<div class="space-y-4">
			{#each [...leaders, ...grunts] as lineup (lineup.name)}
				<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
					<div class="flex items-baseline justify-between gap-3 mb-1">
						<h2 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{lineup.name}</h2>
						<span class="text-xs text-zinc-400 dark:text-zinc-600">{lineup.title}</span>
					</div>
					{#if ROCKET_QUOTES[lineup.name]}
						<p class="text-xs italic text-zinc-500 dark:text-zinc-400 mb-3">
							"{ROCKET_QUOTES[lineup.name]}"
						</p>
					{/if}

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{#each PHASES as phase}
							<div>
								<div class="text-xs font-medium text-zinc-400 dark:text-zinc-600 mb-1.5">
									{phase.label}
								</div>
								<div class="space-y-2">
									{#each lineup[phase.key] as p}
										{@const weaknesses = getWeaknesses(p.types)}
										<div class="flex items-start gap-2">
											<img src={p.image} alt={p.name} class="w-8 h-8 object-contain shrink-0" />
											<div class="min-w-0">
												<div class="text-sm text-zinc-800 dark:text-zinc-200 truncate">
													{p.name}
													{#if p.canBeShiny}<span title="Can be shiny">✨</span>{/if}
												</div>
												<div class="flex flex-wrap gap-1 mt-0.5">
													{#each weaknesses as w}
														<span
															class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
														>
															{w.type}{w.multiplier === 4 ? " ×4" : ""}
														</span>
													{/each}
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>

					<details class="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
						<summary class="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
							Show my best counters
						</summary>
						<div class="mt-2">
							{#if !myPokemon}
								<p class="text-xs text-zinc-400 dark:text-zinc-600">
									Upload a collection export above first.
								</p>
							{:else}
								{@const ranked = rankCountersForLineup(lineup, myPokemon)}
								{#if ranked.length === 0}
									<p class="text-xs text-zinc-400 dark:text-zinc-600">
										Nothing in your upload currently has a super-effective move against this lineup.
									</p>
								{:else}
									<ul class="space-y-1">
										{#each ranked as r}
											<li class="text-xs text-zinc-600 dark:text-zinc-400">
												<span class="font-medium text-zinc-800 dark:text-zinc-200">
													{getSpeciesName(r.individual.dex)}
													{#if getFormName(r.individual.dex, r.individual.form)}
														({getFormName(r.individual.dex, r.individual.form)})
													{/if}
												</span>
												— CP {r.individual.cp}, covers {r.score}/{r.totalDefenders}
												{#if r.individual.shiny}✨{/if}{#if r.individual.lucky}🍀{/if}
											</li>
										{/each}
									</ul>
								{/if}
							{/if}
						</div>
					</details>
				</div>
			{/each}
		</div>
	{/if}
</div>
