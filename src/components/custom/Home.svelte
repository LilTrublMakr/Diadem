<script lang="ts">
	// Placeholder data — replace with real API calls as features are built out.
	const navLinks = [
		{ href: '/map', label: 'Map' },
		{ href: '/status', label: 'Worker Status' }
	];
</script>

<svelte:head>
	<title>PoGo Map VT</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

	<!-- Nav -->
	<nav class="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
		<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
			<span class="font-bold text-white text-lg tracking-tight">PoGo Map VT</span>
			<div class="flex items-center gap-6 text-sm">
				{#each navLinks as link}
					<a href={link.href} class="text-gray-400 hover:text-white transition-colors">{link.label}</a>
				{/each}
			</div>
		</div>
	</nav>

	<!-- Hero -->
	<section class="max-w-6xl mx-auto px-6 pt-16 pb-12 w-full">
		<h1 class="text-4xl font-bold text-white mb-3">Vermont Pokémon GO Map</h1>
		<p class="text-gray-400 text-lg mb-8 max-w-xl">
			Live Pokémon GO tracking for Vermont — shiny rates, encounter stats, and real-time spawn data.
		</p>
		<div class="flex gap-3">
			<a href="/map" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-sm font-medium transition-colors">
				Open Map
			</a>
			<a href="/status" class="inline-flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2.5 text-sm font-medium transition-colors">
				Worker Status
			</a>
		</div>
	</section>

	<!-- Stats grid (placeholder) -->
	<section class="max-w-6xl mx-auto px-6 pb-12 w-full">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Shiny Rate (7d)</div>
				<div class="text-2xl font-bold text-yellow-400">Coming Soon</div>
				<p class="text-xs text-gray-600 mt-2">Shiny encounter rates per species</p>
			</div>
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Seen (24h)</div>
				<div class="text-2xl font-bold text-blue-400">Coming Soon</div>
				<p class="text-xs text-gray-600 mt-2">Total Pokémon sightings in the last 24 hours</p>
			</div>
			<div class="rounded-xl bg-gray-900 border border-gray-800 p-5">
				<div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Top Encounter</div>
				<div class="text-2xl font-bold text-green-400">Coming Soon</div>
				<p class="text-xs text-gray-600 mt-2">Most frequently seen species today</p>
			</div>
		</div>

		<!-- Two-column layout -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">

			<!-- Latest Seen placeholder -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Latest Seen</h2>
					<span class="text-xs text-gray-600">Coming soon</span>
				</div>
				<div class="px-5 py-10 text-center text-gray-700 text-sm">
					<p>Recent Pokémon sightings will appear here.</p>
					<p class="mt-1 text-xs">Queries: <code class="text-gray-600">golbat.pokemon</code></p>
				</div>
			</div>

			<!-- Top Encounters placeholder -->
			<div class="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
				<div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
					<h2 class="font-semibold text-gray-200">Top Encounters</h2>
					<span class="text-xs text-gray-600">Coming soon</span>
				</div>
				<div class="px-5 py-10 text-center text-gray-700 text-sm">
					<p>Most encountered species will appear here.</p>
					<p class="mt-1 text-xs">Queries: <code class="text-gray-600">golbat.pokemon_stats</code></p>
				</div>
			</div>
		</div>
	</section>

	<!-- Lorem ipsum body (placeholder) -->
	<section class="max-w-6xl mx-auto px-6 pb-16 w-full">
		<div class="rounded-xl bg-gray-900/50 border border-gray-800/50 p-8">
			<h2 class="text-lg font-semibold text-gray-300 mb-4">About This Map</h2>
			<div class="prose prose-invert prose-sm max-w-none text-gray-500 space-y-3">
				<p>
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
					labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
					laboris nisi ut aliquip ex ea commodo consequat.
				</p>
				<p>
					Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
					pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt
					mollit anim id est laborum.
				</p>
				<p>
					Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
					laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto
					beatae vitae dicta sunt explicabo.
				</p>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="mt-auto border-t border-gray-800 bg-gray-900/40">
		<div class="max-w-6xl mx-auto px-6 py-4 text-xs text-gray-700 flex items-center justify-between">
			<span>PoGo Map VT — built on <a href="https://github.com/ccev/diadem" class="hover:text-gray-500 transition-colors">Diadem</a></span>
			<a href="/status" class="hover:text-gray-500 transition-colors">Worker Status</a>
		</div>
	</footer>

</div>
