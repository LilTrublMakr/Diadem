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
				<div class="text-2xl">⭐</div>
				<div>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Supporter</h2>
					<p class="text-sm text-zinc-500 dark:text-zinc-400">Access premium map features</p>
				</div>
			</div>
			<ul class="space-y-2">
				{#each ['Live Pokémon map', 'Power Spots', 'Nests', 'Personalized Discord Notifications'] as feature}
					<li class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
						<span class="text-green-500">✓</span>
						{feature}
					</li>
				{/each}
			</ul>
		</div>

		<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="text-2xl">💎</div>
				<div>
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Supporter+</h2>
					<p class="text-sm text-zinc-500 dark:text-zinc-400">Everything in Supporter, plus:</p>
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

	<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
		<div class="text-3xl mb-3">☕</div>
		<h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Ko-fi — Coming Soon</h3>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
			Membership sign-up is in the works. Check back soon.
		</p>
	</div>

	<p class="text-center text-sm text-zinc-400 dark:text-zinc-600 mt-8">
		PoGo Map VT is a community map for Vermont Pokémon GO players.
	</p>
</div>
