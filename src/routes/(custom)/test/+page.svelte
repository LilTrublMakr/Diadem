<script lang="ts">
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

	let activeTab = $state('1d');
	let activeButton = $state(0);
	let toggleOn = $state(false);
</script>

<svelte:head><title>Style Guide — PoGo Map VT</title></svelte:head>

<div class="max-w-6xl mx-auto p-6 space-y-10">

	<div>
		<h1 class="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">Style Guide</h1>
		<p class="text-sm text-zinc-400 dark:text-zinc-500">Design tokens, components, and patterns used across the app.</p>
	</div>

	<!-- Typography -->
	<section>
		<h2 class="section-title">Typography</h2>
		<div class="card p-5 space-y-3">
			<h1 class="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Heading 1 — text-3xl font-bold</h1>
			<h2 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Heading 2 — text-2xl font-bold</h2>
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Heading 3 — text-lg font-semibold</h3>
			<p class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Section label — text-xs uppercase tracking-wider</p>
			<p class="text-sm text-zinc-700 dark:text-zinc-300">Body text — text-sm zinc-700/300</p>
			<p class="text-sm text-zinc-500 dark:text-zinc-400">Muted body — text-sm zinc-500/400</p>
			<p class="text-xs text-zinc-400 dark:text-zinc-600">Hint / caption — text-xs zinc-400/600</p>
			<p class="text-sm font-mono text-zinc-700 dark:text-zinc-300">Mono value — font-mono</p>
			<p class="text-xs text-amber-600 dark:text-amber-400">Warning / legacy label — amber</p>
			<p class="text-xs text-blue-600 dark:text-blue-400">Info label — blue</p>
			<p class="text-xs text-red-500">Error text — red-500</p>
		</div>
	</section>

	<!-- Cards -->
	<section>
		<h2 class="section-title">Cards</h2>
		<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
			<div class="card p-5">
				<p class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Standard Card</p>
				<p class="text-sm text-zinc-700 dark:text-zinc-300">bg-white dark:bg-zinc-900 with border and rounded-xl.</p>
			</div>
			<div class="rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-3">
				<p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Stat Sub-card</p>
				<p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">1,234</p>
			</div>
			<div class="card overflow-hidden">
				<div class="px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
					<p class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Card with header divider</p>
				</div>
				<div class="p-4 text-sm text-zinc-700 dark:text-zinc-300">Content below divider.</div>
			</div>
		</div>
	</section>

	<!-- Buttons -->
	<section>
		<h2 class="section-title">Buttons & Tabs</h2>
		<div class="card p-5 space-y-4">
			<!-- Period tabs -->
			<div>
				<p class="label mb-2">Period tabs</p>
				<div class="flex flex-wrap gap-1">
					{#each ['1d', '7d', '1 Month', '3 Month', 'All Time'] as tab}
						<button
							onclick={() => (activeTab = tab)}
							class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors {activeTab === tab
								? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
								: 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
						>{tab}</button>
					{/each}
				</div>
			</div>
			<!-- Form / icon buttons -->
			<div>
				<p class="label mb-2">Selection buttons (pokemon forms, evolutions)</p>
				<div class="flex gap-2">
					{#each [0, 1, 2] as i}
						<button
							onclick={() => (activeButton = i)}
							class="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors {activeButton === i
								? 'bg-zinc-900 dark:bg-zinc-100'
								: 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
						>
							<div class="w-14 h-14 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">img</div>
							<span class="text-xs font-medium {activeButton === i ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'}">
								Option {i + 1}
							</span>
						</button>
					{/each}
				</div>
			</div>
			<!-- Toggle -->
			<div>
				<p class="label mb-2">Toggle button (shadow)</p>
				<button
					onclick={() => (toggleOn = !toggleOn)}
					class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors {toggleOn
						? 'bg-purple-900/40 text-purple-300 ring-1 ring-purple-700'
						: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
				>
					<div class="w-5 h-5 rounded bg-zinc-300 dark:bg-zinc-600"></div>
					Shadow
				</button>
			</div>
			<!-- Nav link states -->
			<div>
				<p class="label mb-2">Nav links</p>
				<div class="flex gap-4 text-sm">
					<a href="/test" class="text-zinc-900 dark:text-white transition-colors">Active link</a>
					<a href="/test" class="text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">Inactive link</a>
					<a href="/test" class="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">Action link</a>
					<a href="/test" class="text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Subtle link</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Type badges -->
	<section>
		<h2 class="section-title">Type Badges</h2>
		<div class="card p-5">
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(TYPE_NAMES) as [id, name]}
					<span
						class="type-badge text-white text-xs font-semibold px-3 py-1 rounded-full"
						style="background-color:{TYPE_COLORS[parseInt(id)]}"
					>{name}</span>
				{/each}
				<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#f8b500">Legendary</span>
				<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#9b59b6">Mythical</span>
				<span class="type-badge text-xs font-semibold px-3 py-1 rounded-full text-white" style="background-color:#16a085">Ultra Beast</span>
			</div>
		</div>
	</section>

	<!-- Move type badges (small) -->
	<section>
		<h2 class="section-title">Move Type Badges (small)</h2>
		<div class="card p-5">
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(TYPE_NAMES) as [id, name]}
					<span
						class="type-badge text-white text-xs px-1.5 py-0.5 rounded"
						style="background-color:{TYPE_COLORS[parseInt(id)]}"
					>{name}</span>
				{/each}
			</div>
		</div>
	</section>

	<!-- Stat bars -->
	<section>
		<h2 class="section-title">Stat Bars</h2>
		<div class="card p-5">
			{#each [
				{ label: 'Attack',  val: 263, max: 300, hex: '#f97316' },
				{ label: 'Defense', val: 198, max: 300, hex: '#3b82f6' },
				{ label: 'Stamina', val: 230, max: 300, hex: '#22c55e' },
			] as stat}
				<div class="flex items-center gap-3 mb-2">
					<span class="w-16 text-xs text-zinc-500 dark:text-zinc-400 text-right">{stat.label}</span>
					<div class="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-3">
						<div class="h-3 rounded-full transition-all" style="width:{Math.min(100,(stat.val/stat.max)*100)}%; background-color:{stat.hex}"></div>
					</div>
					<span class="w-8 text-xs font-mono text-zinc-700 dark:text-zinc-300 text-right">{stat.val}</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Progress bar (encounter %) -->
	<section>
		<h2 class="section-title">Progress Bar (percentage)</h2>
		<div class="card p-5 space-y-2">
			{#each [
				{ label: 'Dragon Breath / Outrage', pct: 42.3 },
				{ label: 'Steel Wing / Hurricane', pct: 28.1 },
				{ label: 'Dragon Tail / Dragon Claw', pct: 18.6 },
			] as row}
				<div class="flex items-center gap-2 text-xs">
					<div class="flex-1 min-w-0">
						<div class="text-zinc-700 dark:text-zinc-300 truncate">{row.label}</div>
						<div class="mt-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
							<div class="bg-indigo-500 h-1 rounded-full" style="width:{row.pct}%"></div>
						</div>
					</div>
					<span class="text-zinc-400 dark:text-zinc-600 w-12 text-right flex-shrink-0">{row.pct}%</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- Move list -->
	<section>
		<h2 class="section-title">Move List</h2>
		<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
			<div class="card p-4">
				<h3 class="label mb-3">Quick Moves</h3>
				<div class="flex flex-col gap-2">
					{#each [
						{ name: 'Dragon Breath', type: 16, power: 4, isLegacy: false },
						{ name: 'Steel Wing', type: 9, power: 7, isLegacy: false },
						{ name: 'Dragon Tail', type: 16, power: 9, isLegacy: true },
					] as move}
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-1.5 min-w-0">
								<span class="text-sm text-zinc-800 dark:text-zinc-200">{move.name}</span>
								{#if move.isLegacy}
									<span class="text-xs text-zinc-400 dark:text-zinc-500">Legacy</span>
								{/if}
							</div>
							<div class="flex items-center gap-2 flex-shrink-0">
								<span class="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{move.power}</span>
								<span class="type-badge text-white text-xs px-1.5 py-0.5 rounded" style="background-color:{TYPE_COLORS[move.type]}">{TYPE_NAMES[move.type]}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="card p-4">
				<h3 class="label mb-3">Charged Moves</h3>
				<div class="flex flex-col gap-2">
					{#each [
						{ name: 'Outrage', type: 16, power: 110, isLegacy: false },
						{ name: 'Hurricane', type: 3, power: 110, isLegacy: false },
						{ name: 'Draco Meteor', type: 16, power: 150, isLegacy: true },
						{ name: 'Dragon Pulse', type: 16, power: 90, isLegacy: true },
					] as move}
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-1.5 min-w-0">
								<span class="text-sm text-zinc-800 dark:text-zinc-200">{move.name}</span>
								{#if move.isLegacy}
									<span class="text-xs text-zinc-400 dark:text-zinc-500">Legacy</span>
								{/if}
							</div>
							<div class="flex items-center gap-2 flex-shrink-0">
								<span class="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{move.power}</span>
								<span class="type-badge text-white text-xs px-1.5 py-0.5 rounded" style="background-color:{TYPE_COLORS[move.type]}">{TYPE_NAMES[move.type]}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Evolution chain -->
	<section>
		<h2 class="section-title">Evolution Chain</h2>
		<div class="card p-5">
			<div class="flex flex-wrap items-start gap-1">
				{#each [
					{ name: 'Dratini', current: false },
					{ arrow: { candy: 25, req: null }, name: 'Dragonair', current: false },
					{ arrow: { candy: 100, req: 'Walk 20 km' }, name: 'Dragonite', current: true },
				] as item, i}
					{#if 'arrow' in item}
						<div class="flex flex-col items-center justify-center gap-1 px-1 self-center">
							<div class="text-zinc-400 dark:text-zinc-600 text-lg leading-none">›</div>
							<div class="flex flex-col items-center gap-0.5 text-center">
								<span class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{item.arrow!.candy} candy</span>
								{#if item.arrow!.req}
									<span class="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap max-w-20 leading-tight">{item.arrow!.req}</span>
								{/if}
							</div>
						</div>
					{/if}
					<div class="flex flex-col items-center gap-1.5 p-2 rounded-lg {item.current ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800'}">
						<div class="w-14 h-14 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">img</div>
						<span class="text-xs font-medium {item.current ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'}">{item.name}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Shiny rate display -->
	<section>
		<h2 class="section-title">Shiny Rate</h2>
		<div class="card p-5">
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
				<div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Seen</div>
					<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">12,847</div>
				</div>
				<div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Shiny Rate</div>
					<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">~1 in 247</div>
					<div class="text-xs text-zinc-400 dark:text-zinc-600">0.40% · 52/12,847</div>
				</div>
				<div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Event</div>
					<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">843</div>
				</div>
				<div>
					<div class="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Ditto Disguise</div>
					<div class="text-xl font-bold text-zinc-900 dark:text-zinc-100">—</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Size distribution -->
	<section>
		<h2 class="section-title">Size Distribution</h2>
		<div class="card p-5">
			<div class="flex gap-1 items-end h-10">
				{#each [
					{ label: 'XXS', pct: 5 },
					{ label: 'XS',  pct: 20 },
					{ label: 'M',   pct: 50 },
					{ label: 'XL',  pct: 18 },
					{ label: 'XXL', pct: 7 },
				] as row}
					<div class="flex flex-col items-center flex-1 gap-0.5">
						<div class="w-full bg-zinc-200 dark:bg-zinc-700 rounded-sm flex items-end" style="height:32px">
							<div class="w-full bg-blue-500 rounded-sm" style="height:{row.pct}%"></div>
						</div>
						<span class="text-zinc-400 dark:text-zinc-600 text-xs">{row.label}</span>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Loading / empty states -->
	<section>
		<h2 class="section-title">Loading & Empty States</h2>
		<div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
			<div class="card p-8 text-center text-zinc-400 dark:text-zinc-600">Loading…</div>
			<div class="card p-8 text-center text-zinc-400 dark:text-zinc-600">No data available for this period.</div>
		</div>
	</section>

	<!-- Error state -->
	<section>
		<h2 class="section-title">Error State</h2>
		<div class="card p-4 text-sm text-red-500">Failed to load data: Server returned 500</div>
	</section>

	<!-- Footer note -->
	<section>
		<p class="text-xs text-zinc-400 dark:text-zinc-600">Stats updated every 5 minutes. Moves from game data.</p>
	</section>

</div>

<style>
	.section-title {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: rgb(113 113 122);
		margin-bottom: 0.5rem;
	}
	.card {
		border-radius: 0.75rem;
		background: white;
		border: 1px solid rgb(228 228 231);
	}
	:global(.dark) .card {
		background: rgb(24 24 27);
		border-color: rgb(39 39 42);
	}
	.label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgb(161 161 170);
	}
</style>
