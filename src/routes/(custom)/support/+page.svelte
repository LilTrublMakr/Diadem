<script lang="ts">
	const KOFI_URL = 'https://ko-fi.com/pogovt';

	const cities = [
		{ name: 'Pallet Town', workers: 1 },
		{ name: 'Cinnabar Island', workers: 2 },
		{ name: 'Pewter City', workers: 3 },
		{ name: 'Lavender Town', workers: 4 },
		{ name: 'Cerulean City', workers: 5 },
		{ name: 'Viridian City', workers: 6 },
		{ name: 'Vermilion City', workers: 7 },
		{ name: 'Fuchsia City', workers: 8 },
		{ name: 'Saffron City', workers: 9 },
		{ name: 'Celadon City', workers: 10 }
	];
</script>

<svelte:head>
	<title>Support — PoGo Map VT</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6">
	<div class="text-center mb-10">
		<div class="flex justify-center mb-4">
			<img src="/vermont-pokemon-go-icon.svg" alt="PoGo Map VT" class="h-16 w-16 rounded-full ring-4 ring-zinc-200 dark:ring-zinc-700" />
		</div>
		<h1 class="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">Support PoGo Map VT</h1>
		<p class="text-zinc-500 dark:text-zinc-400 text-lg">
			Help keep the map running and unlock access to more features.
		</p>
	</div>

	<div class="grid gap-4 mb-6">
		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="text-2xl">🗺️</div>
				<div>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Map Access</h2>
					<p class="text-sm text-zinc-500 dark:text-zinc-400">Full access to the live map</p>
				</div>
			</div>
			<ul class="space-y-2">
				{#each ['Pokémon', 'Pokéstops', 'Gyms', 'Power Spots', 'Nests', 'Ground Items', 'Individualized filters for each layer'] as feature}
					<li class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
						<span class="text-green-500">✓</span>
						{feature}
					</li>
				{/each}
			</ul>
		</div>

		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="text-2xl">🔭</div>
				<div>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Scout Access</h2>
					<p class="text-sm text-zinc-500 dark:text-zinc-400">Everything in Map Access, plus:</p>
				</div>
			</div>
			<ul class="space-y-2">
				{#each ['Scouting'] as feature}
					<li class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
						<span class="text-green-500">✓</span>
						{feature}
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 mb-6">
		<div class="flex items-center gap-3 mb-4">
			<div class="text-2xl">📡</div>
			<div>
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Scan Area Tiers</h2>
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					Each city tier adds one scan worker on top of the last. Run your own
					<a href="/areas" class="underline hover:text-zinc-700 dark:hover:text-zinc-200">scan areas</a>
					with your allotted workers.
				</p>
			</div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
						<th class="py-2 pr-4 font-medium">Tier</th>
						<th class="py-2 pr-4 font-medium">Workers</th>
						<th class="py-2 font-medium">Includes</th>
					</tr>
				</thead>
				<tbody>
					{#each cities as city}
						<tr class="border-b border-zinc-100 dark:border-zinc-800/60">
							<td class="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{city.name}</td>
							<td class="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{city.workers}</td>
							<td class="py-2 text-zinc-500 dark:text-zinc-400">Map Access</td>
						</tr>
						<tr class="border-b border-zinc-100 dark:border-zinc-800/60">
							<td class="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{city.name}+</td>
							<td class="py-2 pr-4 text-zinc-700 dark:text-zinc-300">{city.workers}</td>
							<td class="py-2 text-zinc-500 dark:text-zinc-400">Map Access + Scout Access</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<a
		href={KOFI_URL}
		target="_blank"
		rel="noopener noreferrer"
		class="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
	>
		<div class="text-3xl mb-3">☕</div>
		<h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Become a Member on Ko-fi</h3>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
			ko-fi.com/pogovt
		</p>
	</a>

	<p class="text-center text-sm text-zinc-400 dark:text-zinc-600 mt-8">
		PoGo Map VT is a community map for Vermont Pokémon GO players.
	</p>
</div>
