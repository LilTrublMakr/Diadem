<script lang="ts">
	import { onMount } from 'svelte';
	import { getMasterPokemon, loadMasterFile } from '$lib/services/masterfile';
	import { getIconPokemon, initAllIconSets } from '$lib/services/uicons.svelte';
	import { getUserDetails } from '$lib/services/user/userDetails.svelte';
	import { getTrackers, isTrackerLoaded, setTrackerEntry, trackerKey } from '$lib/features/trackerState.svelte';
	import TrackedPokemonImg from '@/components/custom/TrackedPokemonImg.svelte';

	let ready = $state(false);
	let saving = $state<Set<string>>(new Set());

	let loggedIn = $derived(!!getUserDetails().details);
	let trackerLoaded = $derived(isTrackerLoaded());

	function sortEntries<T extends { pokemonId: number; form: number }>(arr: T[]): T[] {
		return arr.sort((a, b) => a.pokemonId !== b.pokemonId ? a.pokemonId - b.pokemonId : a.form - b.form);
	}

	let shinies = $derived(sortEntries(Object.values(getTrackers()).filter(v => v.shiny)));
	let hundos   = $derived(sortEntries(Object.values(getTrackers()).filter(v => v.hundo)));
	let nundos   = $derived(sortEntries(Object.values(getTrackers()).filter(v => v.nundo)));
	let shundos  = $derived(sortEntries(Object.values(getTrackers()).filter(v => v.shundo)));

	onMount(() => {
		Promise.all([loadMasterFile(), initAllIconSets()]).then(() => {
			ready = true;
		});
	});

	async function toggleTracker(pokemonId: number, form: number, field: 'shiny' | 'hundo' | 'nundo' | 'shundo', value: boolean) {
		const key = trackerKey(pokemonId, form);
		const prev = getTrackers()[key] ?? { shiny: false, hundo: false, nundo: false, shundo: false };
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

	function pogoFallbackUrl(id: number): string {
		return `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/pokemon_icon_${String(id).padStart(3, '0')}_00.png`;
	}

	function sprite(pokemonId: number, form: number): string {
		try {
			return getIconPokemon({ pokemon_id: pokemonId, form }) || pogoFallbackUrl(pokemonId);
		} catch {
			return pogoFallbackUrl(pokemonId);
		}
	}

	function formLabel(pokemonId: number, form: number): string {
		if (form === 0) return '';
		const poke = getMasterPokemon(pokemonId);
		return poke?.forms[String(form)]?.name ?? `Form ${form}`;
	}

	function formHref(pokemonId: number, form: number): string {
		return form === 0 ? `/pokedex/${pokemonId}` : `/pokedex/${pokemonId}#${form}`;
	}
</script>

<svelte:head>
	<title>Profile — PoGo Map VT</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">My Collection</h1>

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
		{#if shinies.length === 0 && hundos.length === 0 && nundos.length === 0 && shundos.length === 0}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
				<p class="text-zinc-500 dark:text-zinc-400">No Pokémon tracked yet.</p>
				<p class="text-sm text-zinc-400 dark:text-zinc-600 mt-1">
					Visit a <a href="/pokedex/1" class="underline hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Pokémon page</a> and check the boxes.
				</p>
			</div>
		{/if}

		<!-- Shundos -->
		{#if shundos.length > 0}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
				<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
					<span class="text-lg">🌟</span>
					<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Shundos</h2>
					<span class="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{shundos.length}</span>
				</div>
				<div class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each shundos as row}
						{@const poke = getMasterPokemon(row.pokemonId)}
						{@const fl = formLabel(row.pokemonId, row.form)}
						<div class="flex items-center gap-3 px-5 py-3">
							<TrackedPokemonImg pokemonId={row.pokemonId} form={row.form} src={sprite(row.pokemonId, row.form)} class="w-10 h-10 object-contain" />
							<a href={formHref(row.pokemonId, row.form)} class="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
								{poke?.name ?? `#${row.pokemonId}`}{#if fl}<span class="ml-1 text-zinc-500 dark:text-zinc-400">({fl})</span>{/if}
								<span class="ml-1 text-xs text-zinc-400 dark:text-zinc-600">#{String(row.pokemonId).padStart(4, '0')}</span>
							</a>
							<div class="flex items-center gap-4 flex-shrink-0">
								<label class="flex items-center gap-1.5 cursor-pointer select-none">
									<input
										type="checkbox"
										checked={row.shundo}
										onchange={(e) => toggleTracker(row.pokemonId, row.form, 'shundo', e.currentTarget.checked)}
										disabled={saving.has(trackerKey(row.pokemonId, row.form))}
										class="w-4 h-4 rounded accent-amber-400 cursor-pointer"
									/>
									<span class="text-xs text-zinc-500 dark:text-zinc-400">Shundo</span>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Hundos -->
		{#if hundos.length > 0}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
				<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
					<span class="text-lg">💯</span>
					<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hundos</h2>
					<span class="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{hundos.length}</span>
				</div>
				<div class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each hundos as row}
						{@const poke = getMasterPokemon(row.pokemonId)}
						{@const fl = formLabel(row.pokemonId, row.form)}
						<div class="flex items-center gap-3 px-5 py-3">
							<TrackedPokemonImg pokemonId={row.pokemonId} form={row.form} src={sprite(row.pokemonId, row.form)} class="w-10 h-10 object-contain" />
							<a href={formHref(row.pokemonId, row.form)} class="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
								{poke?.name ?? `#${row.pokemonId}`}{#if fl}<span class="ml-1 text-zinc-500 dark:text-zinc-400">({fl})</span>{/if}
								<span class="ml-1 text-xs text-zinc-400 dark:text-zinc-600">#{String(row.pokemonId).padStart(4, '0')}</span>
							</a>
							<div class="flex items-center gap-4 flex-shrink-0">
								<label class="flex items-center gap-1.5 cursor-pointer select-none">
									<input
										type="checkbox"
										checked={row.hundo}
										onchange={(e) => toggleTracker(row.pokemonId, row.form, 'hundo', e.currentTarget.checked)}
										disabled={saving.has(trackerKey(row.pokemonId, row.form))}
										class="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
									/>
									<span class="text-xs text-zinc-500 dark:text-zinc-400">Hundo</span>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Shinies -->
		{#if shinies.length > 0}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
				<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
					<span class="text-lg">✨</span>
					<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Shinies</h2>
					<span class="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{shinies.length}</span>
				</div>
				<div class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each shinies as row}
						{@const poke = getMasterPokemon(row.pokemonId)}
						{@const fl = formLabel(row.pokemonId, row.form)}
						<div class="flex items-center gap-3 px-5 py-3">
							<TrackedPokemonImg pokemonId={row.pokemonId} form={row.form} src={sprite(row.pokemonId, row.form)} class="w-10 h-10 object-contain" />
							<a href={formHref(row.pokemonId, row.form)} class="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
								{poke?.name ?? `#${row.pokemonId}`}{#if fl}<span class="ml-1 text-zinc-500 dark:text-zinc-400">({fl})</span>{/if}
								<span class="ml-1 text-xs text-zinc-400 dark:text-zinc-600">#{String(row.pokemonId).padStart(4, '0')}</span>
							</a>
							<div class="flex items-center gap-4 flex-shrink-0">
								<label class="flex items-center gap-1.5 cursor-pointer select-none">
									<input
										type="checkbox"
										checked={row.shiny}
										onchange={(e) => toggleTracker(row.pokemonId, row.form, 'shiny', e.currentTarget.checked)}
										disabled={saving.has(trackerKey(row.pokemonId, row.form))}
										class="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
									/>
									<span class="text-xs text-zinc-500 dark:text-zinc-400">Shiny</span>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Nundos -->
		{#if nundos.length > 0}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
				<div class="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
					<span class="text-lg">0️⃣</span>
					<h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nundos</h2>
					<span class="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{nundos.length}</span>
				</div>
				<div class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each nundos as row}
						{@const poke = getMasterPokemon(row.pokemonId)}
						{@const fl = formLabel(row.pokemonId, row.form)}
						<div class="flex items-center gap-3 px-5 py-3">
							<TrackedPokemonImg pokemonId={row.pokemonId} form={row.form} src={sprite(row.pokemonId, row.form)} class="w-10 h-10 object-contain" />
							<a href={formHref(row.pokemonId, row.form)} class="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
								{poke?.name ?? `#${row.pokemonId}`}{#if fl}<span class="ml-1 text-zinc-500 dark:text-zinc-400">({fl})</span>{/if}
								<span class="ml-1 text-xs text-zinc-400 dark:text-zinc-600">#{String(row.pokemonId).padStart(4, '0')}</span>
							</a>
							<div class="flex items-center gap-4 flex-shrink-0">
								<label class="flex items-center gap-1.5 cursor-pointer select-none">
									<input
										type="checkbox"
										checked={row.nundo}
										onchange={(e) => toggleTracker(row.pokemonId, row.form, 'nundo', e.currentTarget.checked)}
										disabled={saving.has(trackerKey(row.pokemonId, row.form))}
										class="w-4 h-4 rounded accent-red-500 cursor-pointer"
									/>
									<span class="text-xs text-zinc-500 dark:text-zinc-400">Nundo</span>
								</label>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

	{/if}
</div>
