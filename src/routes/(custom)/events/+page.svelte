<script lang="ts">
	import type { PogoEvent } from '../../api/custom/events/+server';

	let events = $state<PogoEvent[] | null>(null);
	let loading = $state(true);
	let fetchError = $state<string | null>(null);
	let activeTypes = $state(new Set<string>());

	async function fetchEvents() {
		loading = true;
		fetchError = null;
		try {
			const res = await fetch('/api/custom/events');
			if (!res.ok) throw new Error(`Server returned ${res.status}`);
			events = await res.json();
		} catch (e) {
			fetchError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	$effect(() => { fetchEvents(); });

	let uniqueTypes = $derived.by(() => {
		if (!events) return [];
		const seen = new Map<string, string>();
		for (const e of events) {
			if (!seen.has(e.eventType)) seen.set(e.eventType, e.heading);
		}
		return [...seen.entries()]
			.map(([type, heading]) => ({ type, heading }))
			.sort((a, b) => a.heading.localeCompare(b.heading));
	});

	function toggleType(type: string) {
		const next = new Set(activeTypes);
		if (next.has(type)) next.delete(type);
		else next.add(type);
		activeTypes = next;
	}

	function parseMs(iso: string): number {
		return new Date(iso).getTime();
	}

	function typeMatch(e: PogoEvent): boolean {
		return activeTypes.size === 0 || activeTypes.has(e.eventType);
	}

	let current = $derived.by(() => {
		if (!events) return [];
		const n = Date.now();
		return events.filter(e => parseMs(e.start) <= n && parseMs(e.end) >= n && typeMatch(e));
	});

	let nearFuture = $derived.by(() => {
		if (!events) return [];
		const n = Date.now();
		const week = n + 7 * 24 * 60 * 60 * 1000;
		return events
			.filter(e => parseMs(e.start) > n && parseMs(e.start) <= week && typeMatch(e))
			.sort((a, b) => parseMs(a.start) - parseMs(b.start));
	});

	let upcoming = $derived.by(() => {
		if (!events) return [];
		const n = Date.now();
		const week = n + 7 * 24 * 60 * 60 * 1000;
		return events
			.filter(e => parseMs(e.start) > week && typeMatch(e))
			.sort((a, b) => parseMs(a.start) - parseMs(b.start));
	});

	function formatDateRange(start: string, end: string): string {
		const s = new Date(start);
		const e = new Date(end);
		const fmtDate = (d: Date) =>
			d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const fmtTime = (d: Date) =>
			d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		if (s.toDateString() === e.toDateString()) {
			return `${fmtDate(s)}, ${fmtTime(s)} – ${fmtTime(e)}`;
		}
		return `${fmtDate(s)} – ${fmtDate(e)}`;
	}

	function timeUntil(iso: string): string {
		const diff = parseMs(iso) - Date.now();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days <= 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		return `${days}d`;
	}

	const TYPE_COLOR: Record<string, string> = {
		'community-day': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		'spotlight-hour': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
		'raid-day': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
		'raid-hour': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
		'go-tour': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
		'go-fest': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
	};

	function badgeClass(eventType: string): string {
		return TYPE_COLOR[eventType] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
	}
</script>

{#snippet eventCard(event: PogoEvent)}
	<a
		href={event.link}
		target="_blank"
		rel="noopener noreferrer"
		class="group rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col"
	>
		<div class="aspect-[2/1] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
			<img
				src={event.image}
				alt={event.name}
				class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
			/>
		</div>
		<div class="p-3 flex flex-col gap-1.5 flex-1">
			<span class="self-start text-xs px-1.5 py-0.5 rounded font-medium {badgeClass(event.eventType)}">
				{event.heading}
			</span>
			<p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{event.name}</p>
			<p class="text-xs text-zinc-400 dark:text-zinc-500 mt-auto">{formatDateRange(event.start, event.end)}</p>
		</div>
	</a>
{/snippet}

<svelte:head>
	<title>Events — PoGo Map VT</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Events</h1>

	{#if events && uniqueTypes.length > 1}
		<div class="flex flex-wrap gap-2 mb-6">
			<button
				onclick={() => { activeTypes = new Set(); }}
				class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeTypes.size === 0
					? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
					: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
			>
				All
			</button>
			{#each uniqueTypes as t}
				<button
					onclick={() => toggleType(t.type)}
					class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors {activeTypes.has(t.type)
						? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
						: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					{t.heading}
				</button>
			{/each}
		</div>
	{/if}

	{#if fetchError}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
			Failed to load events: {fetchError}
		</div>
	{/if}

	{#if loading}
		<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-16 text-center text-zinc-400 dark:text-zinc-600">
			Loading…
		</div>
	{:else if events}
		{#if current.length > 0}
			<section class="mb-10">
				<div class="flex items-center gap-3 mb-4">
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Current Events</h2>
					<span class="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">
						<span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
						Live now
					</span>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each current as event}
						{@render eventCard(event)}
					{/each}
				</div>
			</section>
		{/if}

		{#if nearFuture.length > 0}
			<section class="mb-10">
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Coming Up — Next 7 Days</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each nearFuture as event}
						{@render eventCard(event)}
					{/each}
				</div>
			</section>
		{/if}

		{#if upcoming.length > 0}
			<section class="mb-10">
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Upcoming</h2>
				<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each upcoming as event}
						<a
							href={event.link}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
						>
							<img
								src={event.image}
								alt=""
								class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
							/>
							<div class="flex-1 min-w-0">
								<div class="mb-0.5">
									<span class="text-xs px-1.5 py-0.5 rounded font-medium {badgeClass(event.eventType)}">{event.heading}</span>
								</div>
								<p class="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{event.name}</p>
								<p class="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{formatDateRange(event.start, event.end)}</p>
							</div>
							<span class="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 tabular-nums">{timeUntil(event.start)}</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		{#if !current.length && !nearFuture.length && !upcoming.length}
			<div class="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-16 text-center text-zinc-400 dark:text-zinc-600">
				No upcoming events found.
			</div>
		{/if}
	{/if}

	<p class="text-xs text-zinc-400 dark:text-zinc-600 mt-4">
		Event data from <a href="https://leekduck.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-zinc-600 dark:hover:text-zinc-400">LeekDuck</a>
		via <a href="https://github.com/bigfoott/ScrapedDuck" target="_blank" rel="noopener noreferrer" class="underline hover:text-zinc-600 dark:hover:text-zinc-400">ScrapedDuck</a>.
		Not affiliated with Niantic or The Pokémon Company.
	</p>
</div>
