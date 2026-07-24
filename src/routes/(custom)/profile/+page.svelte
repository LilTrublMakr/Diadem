<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterFile, getMasterPokemon, loadMasterFile } from '$lib/services/masterfile';
	import { getIconPokemon, initAllIconSets } from '$lib/services/uicons.svelte';
	import { getUserDetails } from '$lib/services/user/userDetails.svelte';
	import { getTrackers, isTrackerLoaded, setTrackerEntry, trackerKey } from '$lib/features/trackerState.svelte';
	import TrackedPokemonImg from '@/components/custom/TrackedPokemonImg.svelte';
	import type { MasterPokemon } from '$lib/types/masterfile';

	const TEMP_EVO_LABELS: Record<number, string> = { 1: 'Mega', 2: 'Mega X', 3: 'Mega Y', 4: 'Primal' };

	const TRACKER_FIELDS = [
		['shundo', '🌟', 'Shundo'],
		['hundo', '💯', 'Hundo'],
		['shiny', '✨', 'Shiny'],
		['nundo', '0️⃣', 'Nundo'],
	] as const;

	let ready = $state(false);
	let saving = $state<Set<string>>(new Set());

	let loggedIn = $derived(!!getUserDetails().details);
	let trackerLoaded = $derived(isTrackerLoaded());

	onMount(() => {
		Promise.all([loadMasterFile(), initAllIconSets()]).then(() => {
			ready = true;
		});
	});

	let search = $state('');

	let allPokemon = $derived.by((): [number, MasterPokemon][] => {
		if (!ready) return [];
		const mf = getMasterFile();
		if (!mf) return [];
		const q = search.trim().toLowerCase();
		return Object.entries(mf.pokemon)
			.map(([id, p]) => [parseInt(id), p] as [number, MasterPokemon])
			.filter(([, p]) => !q || p.name.toLowerCase().includes(q))
			.sort((a, b) => a[0] - b[0]);
	});

	let selectedForms = $state<Record<number, number>>({});

	function getFormOptions(p: MasterPokemon): { form: number; label: string }[] {
		const options: { form: number; label: string }[] = [{ form: 0, label: p.name }];
		for (const [fid, f] of Object.entries(p.forms)) {
			const num = parseInt(fid);
			if (num === 0 || num === (p.defaultFormId ?? -1) || f.isCostume) continue;
			options.push({ form: num, label: f.name || `Form ${num}` });
		}
		for (const [tid, t] of Object.entries(p.tempEvos)) {
			const num = parseInt(tid);
			options.push({ form: num, label: t.name || TEMP_EVO_LABELS[num] || `Mega ${num}` });
		}
		return options;
	}

	function legacyMoveNames(pokemonId: number, form: number, protos: string[]): string[] {
		if (!protos.length) return [];
		const base = getMasterPokemon(pokemonId);
		const p = (form !== 0 ? base?.forms[form.toString()] : null) ?? base;
		const all = [...(p?.quickMoves ?? []), ...(p?.chargedMoves ?? [])];
		return protos.map(proto => all.find(m => m.proto === proto)?.name ?? proto);
	}

	function pogoFallbackUrl(id: number): string {
		return `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/pokemon_icon_${String(id).padStart(3, '0')}_00.png`;
	}

	function sprite(id: number, form: number): string {
		const p = getMasterPokemon(id);
		const isTempEvo = form !== 0 && !!p?.tempEvos[form.toString()];
		try {
			return getIconPokemon({
				pokemon_id: id,
				form: isTempEvo ? 0 : form,
				temp_evolution_id: isTempEvo ? form : undefined,
			}) || pogoFallbackUrl(id);
		} catch { return pogoFallbackUrl(id); }
	}

	async function toggleTracker(pokemonId: number, form: number, field: 'shiny' | 'hundo' | 'nundo' | 'shundo', value: boolean) {
		const key = trackerKey(pokemonId, form);
		const prev = getTrackers()[key] ?? { shiny: false, hundo: false, nundo: false, shundo: false, legacyMoves: [] as string[] };
		setTrackerEntry(pokemonId, form, { [field]: value });
		saving = new Set([...saving, key]);
		try {
			const res = await fetch(`/api/custom/tracker/${pokemonId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ form, [field]: value })
			});
			if (res.ok) setTrackerEntry(pokemonId, form, await res.json());
			else setTrackerEntry(pokemonId, form, prev);
		} catch {
			setTrackerEntry(pokemonId, form, prev);
		} finally {
			saving = new Set([...saving].filter((k) => k !== key));
		}
	}
</script>

<svelte:head>
	<title>My Collection — PoGo Map VT</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Collection</h1>
		<input
			type="search"
			placeholder="Search Pokémon…"
			bind:value={search}
			class="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-48"
		/>
	</div>

	{#if !loggedIn}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
			<p class="text-zinc-500 dark:text-zinc-400 mb-4">Log in to track your shinies and hundos.</p>
			<a
				href="/login/discord"
				class="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
			>
				Login with Discord
			</a>
		</div>
	{:else if !ready || !trackerLoaded}
		<div class="text-center text-zinc-400 py-16">Loading…</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
			{#each allPokemon as [id, poke]}
				{@const selectedForm = selectedForms[id] ?? 0}
				{@const formOpts = getFormOptions(poke)}
				{@const entry = getTrackers()[trackerKey(id, selectedForm)] ?? { shiny: false, hundo: false, nundo: false, shundo: false, legacyMoves: [] as string[] }}
				{@const key = trackerKey(id, selectedForm)}
				{@const legacyNames = legacyMoveNames(id, selectedForm, entry.legacyMoves ?? [])}

				<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col gap-2">
					<!-- Header -->
					<div class="flex items-baseline justify-between gap-1 min-w-0">
						<a href="/pokedex/{id}" class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:underline truncate">{poke.name}</a>
						<span class="text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0">#{String(id).padStart(4, '0')}</span>
					</div>

					<!-- Form selector (always rendered for consistent height alignment) -->
					<select
						onchange={(e) => { selectedForms[id] = parseInt(e.currentTarget.value); }}
						value={selectedForm}
						disabled={formOpts.length <= 1}
						class="w-full rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] px-1.5 py-1 text-zinc-700 dark:text-zinc-300 outline-none focus:border-zinc-400 dark:focus:border-zinc-600
							   {formOpts.length <= 1 ? 'invisible' : ''}"
					>
						{#each formOpts as opt}
							<option value={opt.form}>{opt.label}</option>
						{/each}
					</select>

					<!-- Image -->
					<div class="flex justify-center py-1">
						<TrackedPokemonImg
							pokemonId={id}
							form={selectedForm}
							src={sprite(id, selectedForm)}
							class="w-16 h-16 object-contain"
							badgeClass="text-[9px]"
							loading="lazy"
						/>
					</div>

					<!-- Tracker buttons -->
					<div class="flex gap-1">
						{#each TRACKER_FIELDS as [field, emoji, label]}
							<button
								onclick={() => toggleTracker(id, selectedForm, field, !entry[field])}
								disabled={saving.has(key)}
								title={label}
								class="flex-1 py-1 rounded-lg text-sm transition-colors
									   {entry[field]
									       ? 'bg-zinc-900 dark:bg-zinc-100'
									       : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}
									   disabled:opacity-50 disabled:cursor-not-allowed"
							>{emoji}</button>
						{/each}
					</div>

					<!-- Legacy move indicator -->
					{#if legacyNames.length > 0}
						<div class="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight truncate" title={legacyNames.join(', ')}>
							⚔️ {legacyNames.join(', ')}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
