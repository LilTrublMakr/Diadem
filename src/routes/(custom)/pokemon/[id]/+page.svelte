<script lang="ts">
	import { page } from '$app/state';
	import { getMasterPokemon, getMasterFile, loadMasterFile } from '$lib/services/masterfile';
	import { getIconPokemon, initAllIconSets } from '$lib/services/uicons.svelte';
	import type { MasterEvolution, MasterPokemon } from '$lib/types/masterfile';
	import type { PokemonDetailResponse } from '../../api/custom/pokemon/[id]/+server';

	type PeriodKey = '1d' | '1w' | '1m' | '3m' | 'all';
	const PERIODS: { key: PeriodKey; label: string }[] = [
		{ key: '1d',  label: '24h'      },
		{ key: '1w',  label: '7d'       },
		{ key: '1m',  label: '1 Month'  },
		{ key: '3m',  label: '3 Month'  },
		{ key: 'all', label: 'All Time' },
	];

	const TYPE_NAMES: Record<number, string> = {
		1:'Normal', 2:'Fighting', 3:'Flying', 4:'Poison', 5:'Ground',
		6:'Rock', 7:'Bug', 8:'Ghost', 9:'Steel', 10:'Fire', 11:'Water',
		12:'Grass', 13:'Electric', 14:'Psychic', 15:'Ice', 16:'Dragon',
		17:'Dark', 18:'Fairy'
	};
	const TYPE_COLORS: Record<number, string> = {
		1:'#9099a1', 2:'#ce4069', 3:'#89aae3', 4:'#b563ce',
		5:'#d97845', 6:'#c8b686', 7:'#91c12f', 8:'#5269ac',
		9:'#5a8ea2', 10:'#ff9c54', 11:'#4d90d5', 12:'#63bb5b',
		13:'#f3d23b', 14:'#fa7179', 15:'#74cec0', 16:'#0a6dc4',
		17:'#5a5465', 18:'#ec8fe6'
	};

	const TEMP_EVO_LABELS: Record<number, string> = { 1: 'Mega', 2: 'Mega X', 3: 'Mega Y', 4: 'Primal' };
	const SIZE_LABELS: Record<number, string> = { 1:'XXS', 2:'XS', 3:'M', 4:'XL', 5:'XXL' };
	const GENDER_LABELS: Record<number, string> = { 1:'Male', 2:'Female', 3:'Genderless' };

	const pokemonId = $derived(parseInt(page.params.id));

	let masterReady = $state(false);
	let statsData = $state<PokemonDetailResponse | null>(null);
	let statsError = $state<string | null>(null);
	let statsLoading = $state(true);

	let activePeriod = $state<PeriodKey>('1d');
	let activeForm = $state(0);
	let showShadow = $state(false);

	$effect(() => {
		Promise.all([loadMasterFile(), initAllIconSets()]).then(() => { masterReady = true; });
	});

	$effect(() => {
		const id = pokemonId;
		statsLoading = true;
		statsError = null;
		fetch(`/api/custom/pokemon/${id}`)
			.then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
			.then((d) => { statsData = d; })
			.catch((e) => { statsError = e.message; })
			.finally(() => { statsLoading = false; });
	});

	let pokemon = $derived.by(() => {
		if (!masterReady) return null;
		return getMasterPokemon(pokemonId) ?? null;
	});

	let formOptions = $derived.by(() => {
		if (!pokemon) return [];
		const options: { form: number; label: string }[] = [{ form: 0, label: pokemon.name }];
		for (const [fid, f] of Object.entries(pokemon.forms)) {
			const num = parseInt(fid);
			if (num === 0 || num === (pokemon.defaultFormId ?? -1) || f.isCostume) continue;
			options.push({ form: num, label: f.name || `Form ${num}` });
		}
		for (const [tid, t] of Object.entries(pokemon.tempEvos ?? {})) {
			const num = parseInt(tid);
			options.push({ form: num, label: t.name || TEMP_EVO_LABELS[num] || `Mega ${num}` });
		}
		return options;
	});

	let activePokemon = $derived.by((): MasterPokemon | null => {
		if (!pokemon) return null;
		if (activeForm === 0) return pokemon;
		return pokemon.forms[activeForm.toString()] ?? pokemon.tempEvos[activeForm.toString()] ?? pokemon;
	});

	type EvoTreeNode = { id: number; evo: MasterEvolution | null; children: EvoTreeNode[] };

	let evoTreeRoot = $derived.by((): EvoTreeNode | null => {
		if (!pokemon || !masterReady) return null;
		const mf = getMasterFile();
		if (!mf) return null;

		const familyId = pokemon.family;
		const members = new Map<number, MasterPokemon>();
		for (const [idStr, p] of Object.entries(mf.pokemon)) {
			if (p.family === familyId) members.set(parseInt(idStr), p);
		}
		if (members.size <= 1) return null;

		const allEvoTargets = new Set<number>();
		for (const p of members.values()) {
			for (const evo of (p.evolutions ?? [])) allEvoTargets.add(evo.pokemonId);
		}
		const rootId = [...members.keys()].find(id => !allEvoTargets.has(id));
		if (rootId === undefined) return null;

		function buildNode(id: number, evo: MasterEvolution | null): EvoTreeNode {
			const p = members.get(id);
			const children = (p?.evolutions ?? [])
				.filter(e => members.has(e.pokemonId))
				.map(e => buildNode(e.pokemonId, e));
			return { id, evo, children };
		}

		const root = buildNode(rootId, null);
		return root.children.length > 0 ? root : null;
	});

	function evoSprite(id: number): string {
		try { return getIconPokemon({ pokemon_id: id, form: 0 }); } catch { return ''; }
	}

	function buildReqLabel(evo: MasterEvolution): string {
		const parts: string[] = [`${evo.candyCost} candy`];
		if (evo.itemRequirement) parts.push(evo.itemRequirement);
		if (evo.mustBeBuddy) parts.push('Must be buddy');
		if (evo.onlyDaytime) parts.push('Must be day');
		else if (evo.onlyNighttime) parts.push('Must be night');
		if (evo.questRequirement) parts.push(evo.questRequirement);
		return parts.join(' · ');
	}

	let isDark = $state(false);
	$effect(() => {
		const update = () => { isDark = document.documentElement.classList.contains('dark'); };
		update();
		const obs = new MutationObserver(update);
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => obs.disconnect();
	});
	let connColor = $derived(isDark ? '#52525b' : '#d4d4d8');

	function sprite(form: number, shadow = false): string {
		try {
			const isTempEvo = form !== 0 && !!pokemon?.tempEvos[form.toString()];
			return getIconPokemon({
				pokemon_id: pokemonId,
				form: isTempEvo ? 0 : form,
				temp_evolution_id: isTempEvo ? form : undefined,
				alignment: shadow ? 1 : undefined,
			});
		} catch { return ''; }
	}

	// --- Top card derived stats (fixed periods for overview) ---
	let lastSeen = $derived.by(() => {
		if (!statsData) return '—';
		const checks: [PeriodKey, string][] = [
			['1d', 'Today'], ['1w', 'This week'], ['1m', 'This month'],
			['3m', 'Last 3 months'], ['all', 'Over 3 months ago'],
		];
		for (const [p, label] of checks) {
			const s = statsData.summary.find((r) => r.form === activeForm && r.time_slot === p);
			if (s && Number(s.total_count) > 0) return label;
		}
		return 'Never';
	});

	let totalSeen = $derived.by(() => {
		const s = statsData?.summary.find((r) => r.form === activeForm && r.time_slot === 'all');
		return s ? Number(s.total_count).toLocaleString() : '—';
	});

	let seenToday = $derived.by(() => {
		const s = statsData?.summary.find((r) => r.form === activeForm && r.time_slot === '1d');
		return s ? Number(s.total_count).toLocaleString() : '0';
	});

	let shinySummary = $derived.by(() => {
		const s = statsData?.summary.find((r) => r.form === activeForm && r.time_slot === 'all');
		return shinyRate(s);
	});

	// --- Stats helpers ---
	function summaryFor(form: number, period: PeriodKey) {
		return statsData?.summary.find((r) => r.form === form && r.time_slot === period);
	}

	function ivDistFor(form: number, period: PeriodKey) {
		return (statsData?.ivDist ?? [])
			.filter((r) => r.form === form && r.time_slot === period)
			.sort((a, b) => b.iv - a.iv);
	}

	function moveStatsFor(form: number, period: PeriodKey) {
		return (statsData?.moveStats ?? [])
			.filter((r) => r.form === form && r.time_slot === period)
			.slice(0, 10);
	}

	function sizeStatsFor(form: number, period: PeriodKey) {
		return (statsData?.sizeStats ?? [])
			.filter((r) => r.form === form && r.time_slot === period)
			.sort((a, b) => a.size - b.size);
	}

	function genderStatsFor(form: number, period: PeriodKey) {
		return (statsData?.genderStats ?? [])
			.filter((r) => r.form === form && r.time_slot === period)
			.sort((a, b) => a.gender - b.gender);
	}

	function moveName(id: number, quick: boolean): string {
		if (!activePokemon) return `#${id}`;
		const moves = quick ? (activePokemon.quickMoves ?? []) : (activePokemon.chargedMoves ?? []);
		return moves.find((m) => m.id === id)?.name ?? `#${id}`;
	}

	function shinyRate(s: { shiny_count: string; total_count: string } | undefined) {
		if (!s) return null;
		const sh = Number(s.shiny_count), total = Number(s.total_count);
		if (total === 0 || sh === 0) return null;
		return { rate: Math.round(total / sh), pct: ((sh / total) * 100).toFixed(2), sh, total };
	}

	// Max stat for bar scaling
	const MAX_STAT = 300;
	function statPct(val: number) { return Math.min(100, (val / MAX_STAT) * 100); }
</script>

<svelte:head>
	<title>{activePokemon?.name ?? `#${pokemonId}`} — PoGo Map VT</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">

	{#if !masterReady}
		<div class="text-center text-zinc-400 py-16">Loading…</div>
	{:else if !pokemon}
		<div class="text-center text-zinc-400 py-16">Pokémon #{pokemonId} not found.</div>
	{:else}

		<!-- Header card -->
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
			<!-- Title -->
			<div class="mb-4">
				<div class="flex items-baseline gap-2">
					<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
						{pokemon.name}
					</h1>
					{#if activeForm !== 0}
						{@const formLabel = formOptions.find(o => o.form === activeForm)?.label}
						{#if formLabel}
							<span class="text-sm font-normal text-zinc-400 dark:text-zinc-500">{formLabel}</span>
						{/if}
					{/if}
					<a
						href="/map?pokemon_id={pokemonId}&form={activeForm}"
						class="ml-1 text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
					>Find on Map</a>
				</div>
				<div class="text-sm text-zinc-400 dark:text-zinc-600">#{String(pokemonId).padStart(4, '0')}</div>
			</div>

			<!-- Body: image + stats -->
			<div class="flex items-center gap-6">
				<!-- Left: sprite + type pills (33%) -->
				<div class="flex flex-col items-center justify-center gap-3" style="width:33%; flex-shrink:0;">
					<img
						src={sprite(activeForm, showShadow)}
						alt={activePokemon?.name}
						class="w-40 h-40 object-contain"
						onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
						onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
					/>
					<button
						onclick={() => (showShadow = !showShadow)}
						class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {showShadow
							? 'bg-purple-900/40 text-purple-300 ring-1 ring-purple-700'
							: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
					>
						<img
							src={sprite(activeForm, true)}
							alt="Shadow"
							class="w-5 h-5 object-contain"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
							onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
						/>
						Shadow
					</button>
					<div class="flex flex-wrap gap-1.5 justify-center">
						{#each (activePokemon?.types ?? pokemon.types) as typeId}
							<span
								class="type-badge text-white text-xs font-semibold px-3 py-1 rounded-full"
								style="background-color:{TYPE_COLORS[typeId] ?? '#9099a1'}"
							>
								{TYPE_NAMES[typeId] ?? typeId}
							</span>
						{/each}
						{#if pokemon.legendary}
							<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#f8b500">Legendary</span>
						{/if}
						{#if pokemon.mythical}
							<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#9b59b6">Mythical</span>
						{/if}
						{#if pokemon.ultraBeast}
							<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#16a085">Ultra Beast</span>
						{/if}
					</div>
				</div>

				<!-- Right: 2×2 stat sub-cards -->
				<div class="flex-1 min-w-0" style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
					<div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-3">
						<div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Last Seen</div>
						<div class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
							{statsLoading ? '…' : lastSeen}
						</div>
					</div>
					<div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-3">
						<div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Seen</div>
						<div class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							{statsLoading ? '…' : totalSeen}
						</div>
					</div>
					<div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-3">
						<div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Seen Today</div>
						<div class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
							{statsLoading ? '…' : seenToday}
						</div>
					</div>
					<div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-3">
						<div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Shiny Rate</div>
						{#if statsLoading}
							<div class="text-sm font-bold text-zinc-900 dark:text-zinc-100">…</div>
						{:else if shinySummary}
							<div class="text-sm font-bold text-zinc-900 dark:text-zinc-100">~1 in {shinySummary.rate.toLocaleString()}</div>
							<div class="text-xs text-zinc-500 dark:text-zinc-400">{shinySummary.pct}%</div>
						{:else}
							<div class="text-sm text-zinc-500 dark:text-zinc-500">—</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Base stats -->
			<div class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
				<div class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Base Stats</div>
				{#each [
					{ label: 'Attack',  val: activePokemon?.baseAtk ?? 0, hex: '#f97316' },
					{ label: 'Defense', val: activePokemon?.baseDef ?? 0, hex: '#3b82f6' },
					{ label: 'Stamina', val: activePokemon?.baseSta ?? 0, hex: '#22c55e' },
				] as stat}
					<div class="flex items-center gap-3 mb-2">
						<span class="w-16 text-xs text-zinc-500 dark:text-zinc-400 text-right">{stat.label}</span>
						<div class="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-3">
							<div class="h-3 rounded-full transition-all" style="width:{statPct(stat.val)}%; background-color:{stat.hex}"></div>
						</div>
						<span class="w-8 text-xs font-mono text-zinc-700 dark:text-zinc-300 text-right">{stat.val}</span>
					</div>
				{/each}
				<div class="mt-2 flex items-center gap-2">
					<span class="text-xs text-zinc-500 dark:text-zinc-400">Buddy distance</span>
					<span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
						{activePokemon?.buddyDistance ?? pokemon.buddyDistance ?? '?'} km
					</span>
				</div>
			</div>

		</div>

		<!-- Forms card -->
		{#if formOptions.length > 1}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Forms</h2>
				<div class="flex flex-wrap gap-3">
					{#each formOptions as opt}
						<button
							onclick={() => (activeForm = opt.form)}
							class="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors {activeForm === opt.form
								? 'bg-zinc-900 dark:bg-zinc-100'
								: 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
						>
							<img
								src={sprite(opt.form)}
								alt={opt.label}
								class="w-14 h-14 object-contain"
								onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
								onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
							/>
							<span class="text-xs font-medium {activeForm === opt.form ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'}">
								{opt.label}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		{#snippet evoCardSnip(id: number)}
			{@const isCurrent = id === pokemonId}
			<a
				href="/pokemon/{id}"
				style="
					min-width:72px; text-decoration:none;
					display:flex; flex-direction:column; align-items:center; gap:0.25rem; padding:0.5rem;
					border-radius:0.5rem;
					background:{isCurrent ? (isDark ? '#f4f4f5' : '#18181b') : (isDark ? '#27272a' : '#f4f4f5')};
					border:1px solid {isCurrent ? (isDark ? '#d4d4d8' : '#27272a') : (isDark ? '#3f3f46' : '#e4e4e7')};
				"
			>
				<img
					src={evoSprite(id)}
					alt=""
					style="width:3rem; height:3rem; object-fit:contain;"
					onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
					onload={(e) => { (e.currentTarget as HTMLImageElement).style.display = ''; }}
				/>
				<span style="font-size:0.75rem; font-weight:500; text-align:center; line-height:1.25; color:{isCurrent ? (isDark ? '#18181b' : '#ffffff') : (isDark ? '#d4d4d8' : '#3f3f46')};">
					{getMasterPokemon(id)?.name ?? `#${id}`}
				</span>
			</a>
		{/snippet}

		{#snippet evoNode(node: EvoTreeNode)}
			{#if node.children.length === 0}
				{@render evoCardSnip(node.id)}
			{:else if node.children.length === 1}
				{@const child = node.children[0]}
				<div style="display:flex; align-items:center;">
					{@render evoCardSnip(node.id)}
					<div style="display:flex; flex-direction:column; align-items:center; padding:0 0.75rem; min-width:5rem;">
						<span style="font-size:0.7rem; color:#71717a; text-align:center; margin-bottom:0.25rem; line-height:1.3; white-space:nowrap;">
							{child.evo ? buildReqLabel(child.evo) : ''}
						</span>
						<div style="display:flex; align-items:center; width:100%;">
							<div style="flex:1; height:2px; background:{connColor};"></div>
							<div style="width:0; height:0; border-top:4px solid transparent; border-bottom:4px solid transparent; border-left:6px solid {connColor};"></div>
						</div>
					</div>
					{@render evoNode(child)}
				</div>
			{:else}
				<div style="display:flex; flex-direction:column; align-items:center;">
					{@render evoCardSnip(node.id)}
					<div style="width:2px; height:16px; background:{connColor};"></div>
					<div style="display:flex; align-items:flex-start;">
						{#each node.children as child, i}
							{@const isFirst = i === 0}
							{@const isLast = i === node.children.length - 1}
							<div style="display:flex; flex-direction:column; align-items:center; min-width:7.5rem;">
								<div style="display:flex; align-self:stretch; height:2px;">
									<div style="flex:{isFirst ? '1' : '1.03'} 1 0%; background:{isFirst ? 'transparent' : connColor};"></div>
									<div style="flex:{isLast ? '1' : '1.03'} 1 0%; background:{isLast ? 'transparent' : connColor};"></div>
								</div>
								<div style="width:2px; height:10px; background:{connColor};"></div>
								<div style="min-height:2.5rem; display:flex; align-items:flex-start; justify-content:center; text-align:center; padding:0 0.5rem;">
									<span style="font-size:0.7rem; color:#71717a; line-height:1.3;">
										{child.evo ? buildReqLabel(child.evo) : ''}
									</span>
								</div>
								<div style="width:2px; height:8px; background:{connColor};"></div>
								{@render evoNode(child)}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/snippet}

		<!-- Evolution family -->
		{#if evoTreeRoot}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 mb-6">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Evolution Family</h2>
				<div class="overflow-x-auto flex justify-center pb-2">
					{@render evoNode(evoTreeRoot)}
				</div>
			</div>
		{/if}

		<!-- Moves (from masterfile) -->
		<div class="mb-6" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
			{#each [
				{ label: 'Quick Moves', moves: activePokemon?.quickMoves ?? [] },
				{ label: 'Charged Moves', moves: activePokemon?.chargedMoves ?? [] },
			] as group}
				<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
					<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">{group.label}</h2>
					{#if group.moves.length === 0}
						<p class="text-sm text-zinc-400 dark:text-zinc-600">None</p>
					{:else}
						<div class="flex flex-col gap-2">
							{#each group.moves as move}
								<div class="flex items-center justify-between gap-2">
									<div class="flex items-center gap-1.5 min-w-0">
										<span class="text-sm text-zinc-800 dark:text-zinc-200">{move.name}</span>
										{#if move.isLegacy}
											<span class="text-xs text-zinc-400 dark:text-zinc-500">Legacy</span>
										{/if}
									</div>
									<div class="flex items-center gap-2 flex-shrink-0">
										<span class="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{move.power}</span>
										<span class="type-badge text-white text-xs px-1.5 py-0.5 rounded" style="background-color:{TYPE_COLORS[move.type] ?? '#9099a1'}">
											{TYPE_NAMES[move.type] ?? move.type}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Scanner stats -->
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
			<div class="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
				<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">Scanner Stats</h2>
				<div class="flex flex-wrap gap-1">
					{#each PERIODS as p}
						<button
							onclick={() => (activePeriod = p.key)}
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activePeriod === p.key
								? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
								: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
						>
							{p.label}
						</button>
					{/each}
				</div>
			</div>

			{#if statsLoading}
				<div class="p-8 text-center text-zinc-400 dark:text-zinc-600">Loading…</div>
			{:else if statsError}
				<div class="p-4 text-sm text-red-500">Failed to load stats: {statsError}</div>
			{:else}
				{@const summary = summaryFor(activeForm, activePeriod)}
				{@const sr = shinyRate(summary)}
				{@const ivRows = ivDistFor(activeForm, activePeriod)}
				{@const moveRows = moveStatsFor(activeForm, activePeriod)}
				{@const sizeRows = sizeStatsFor(activeForm, activePeriod)}
				{@const genderRows = genderStatsFor(activeForm, activePeriod)}

				<div class="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-zinc-100 dark:border-zinc-800">
					<div>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Seen</div>
						<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">
							{summary ? Number(summary.total_count).toLocaleString() : '—'}
						</div>
					</div>
					<div>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Shiny Rate</div>
						{#if sr}
							<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">~1 in {sr.rate.toLocaleString()}</div>
							<div class="text-xs text-zinc-400 dark:text-zinc-600">{sr.pct}% · {sr.sh}/{sr.total}</div>
						{:else}
							<div class="text-xl font-bold text-zinc-400 dark:text-zinc-600">—</div>
						{/if}
					</div>
					<div>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Event</div>
						<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">
							{summary ? Number(summary.event_count).toLocaleString() : '—'}
						</div>
					</div>
					<div>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Ditto Disguise</div>
						<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">
							{summary ? Number(summary.ditto_count).toLocaleString() : '—'}
						</div>
					</div>
				</div>

				<!-- Hundos from IV distribution -->
				{#if ivRows.length > 0}
					{@const hundo = ivRows.find((r) => r.iv === 100)}
					{@const total = ivRows.reduce((s, r) => s + Number(r.count), 0)}
					{#if hundo && total > 0}
						<div class="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
							<span class="text-xs text-zinc-500 dark:text-zinc-400">100% IV (Hundos)</span>
							<span class="font-semibold text-zinc-900 dark:text-zinc-100">{Number(hundo.count).toLocaleString()}</span>
							<span class="text-xs text-zinc-400 dark:text-zinc-600">of {total.toLocaleString()} with known IVs</span>
						</div>
					{/if}
				{/if}

				<div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">

					<!-- Observed move combos -->
					{#if moveRows.length > 0}
						{@const moveTotal = moveRows.reduce((s, r) => s + Number(r.count), 0)}
						<div>
							<h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Observed Move Sets</h3>
							<div class="flex flex-col gap-1">
								{#each moveRows.slice(0, 8) as row}
									{@const pct = moveTotal > 0 ? (Number(row.count) / moveTotal * 100) : 0}
									<div class="flex items-center gap-2 text-xs">
										<div class="flex-1 min-w-0">
											<div class="text-zinc-700 dark:text-zinc-300 truncate">
												{moveName(row.move_1, true)} / {moveName(row.move_2, false)}
											</div>
											<div class="mt-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
												<div class="bg-indigo-500 h-1 rounded-full" style="width:{pct}%"></div>
											</div>
										</div>
										<span class="text-zinc-400 dark:text-zinc-600 w-12 text-right flex-shrink-0">
											{pct.toFixed(1)}%
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Size + gender -->
					<div class="flex flex-col gap-4">
						{#if sizeRows.length > 0}
							{@const sizeTotal = sizeRows.reduce((s, r) => s + Number(r.count), 0)}
							<div>
								<h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Size Distribution</h3>
								<div class="flex gap-1 items-end h-10">
									{#each sizeRows as row}
										{@const pct = sizeTotal > 0 ? Number(row.count) / sizeTotal * 100 : 0}
										<div class="flex flex-col items-center flex-1 gap-0.5">
											<div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm flex items-end" style="height:32px">
												<div class="w-full bg-blue-500 rounded-sm" style="height:{pct}%"></div>
											</div>
											<span class="text-zinc-400 dark:text-zinc-600 text-xs">{SIZE_LABELS[row.size] ?? row.size}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
						{#if genderRows.length > 0}
							{@const genderTotal = genderRows.reduce((s, r) => s + Number(r.count), 0)}
							<div>
								<h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Gender Ratio</h3>
								<div class="flex gap-2 flex-wrap">
									{#each genderRows as row}
										<span class="text-xs text-zinc-600 dark:text-zinc-400">
											{GENDER_LABELS[row.gender] ?? row.gender}
											<span class="font-semibold text-zinc-800 dark:text-zinc-200">
												{genderTotal > 0 ? (Number(row.count) / genderTotal * 100).toFixed(1) : 0}%
											</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>

				</div>
			{/if}
		</div>
		<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-3">Stats updated every 5 minutes. Moves from game data.</p>

	{/if}
</div>
