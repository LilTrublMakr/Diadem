<script lang="ts">
	import { page } from '$app/state';
	import { getUserDetails, updateUserDetails } from '$lib/services/user/userDetails.svelte';
	import { getUserSettings } from '$lib/services/userSettings.svelte';
	import { setThemeMode } from '$lib/services/themeMode';
	import { Sun, Moon, Menu, X, ChevronDown } from 'lucide-svelte';

	const navLinks = [
		{ href: '/map', label: 'Map' },
		{ href: '/events', label: 'Events' },
		{ href: '/shiny', label: 'Shiny Stats' },
		{ href: '/seen', label: 'Seen Stats' },
		{ href: '/status', label: 'Worker Status' }
	];

	let user = $derived(getUserDetails().details);
	let isDark = $derived(getUserSettings().themeMode !== 'light');
	let menuOpen = $state(false);
	let dropdownOpen = $state(false);

	async function logout() {
		dropdownOpen = false;
		await fetch('/logout');
		await updateUserDetails();
	}

	function toggleTheme() {
		setThemeMode(isDark ? 'light' : 'dark');
	}

	function closeMenu() {
		menuOpen = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-user-menu]')) {
			dropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<nav class="border-b-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-950/50 shadow-zinc-200/80 sticky top-0 z-10">
	<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
		<a href="/" class="font-bold text-zinc-900 dark:text-zinc-100 text-lg tracking-tight">PoGo Map VT</a>

		<!-- Desktop nav -->
		<div class="hidden md:flex items-center gap-6 text-sm">
			{#each navLinks as link}
				<a
					href={link.href}
					class="transition-colors {page.url.pathname === link.href
						? 'text-zinc-900 dark:text-white'
						: 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					{link.label}
				</a>
			{/each}
			<span class="w-px h-4 bg-zinc-200 dark:bg-zinc-800"></span>
			<button
				onclick={toggleTheme}
				class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
				title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if isDark}
					<Sun size={16} />
				{:else}
					<Moon size={16} />
				{/if}
			</button>
			<span class="w-px h-4 bg-zinc-200 dark:bg-zinc-800"></span>
			{#if user}
				<div class="relative" data-user-menu>
					<button
						onclick={() => (dropdownOpen = !dropdownOpen)}
						class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
					>
						<img
							src={user.avatarUrl}
							alt={user.displayName}
							class="w-7 h-7 rounded-full object-cover"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
						/>
						<span class="text-sm">{user.displayName}</span>
						<ChevronDown size={14} class="transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
					</button>
					{#if dropdownOpen}
						<div class="absolute right-0 top-full mt-2 w-40 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden z-20">
							<a
								href="/profile"
								onclick={() => (dropdownOpen = false)}
								class="block px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
							>
								Profile
							</a>
							<button
								onclick={logout}
								class="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
							>
								Logout
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login/discord" class="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">Login</a>
			{/if}
		</div>

		<!-- Mobile controls -->
		<div class="flex md:hidden items-center gap-3">
			<button
				onclick={toggleTheme}
				class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
				title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if isDark}
					<Sun size={18} />
				{:else}
					<Moon size={18} />
				{/if}
			</button>
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			>
				{#if menuOpen}
					<X size={22} />
				{:else}
					<Menu size={22} />
				{/if}
			</button>
		</div>
	</div>

	<!-- Mobile dropdown -->
	{#if menuOpen}
		<div class="md:hidden border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-3 flex flex-col gap-1">
			{#each navLinks as link}
				<a
					href={link.href}
					onclick={closeMenu}
					class="py-2 text-sm transition-colors {page.url.pathname === link.href
						? 'text-zinc-900 dark:text-white font-medium'
						: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
				>
					{link.label}
				</a>
			{/each}
			<div class="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2 text-sm">
				{#if user}
					<div class="flex items-center gap-2 py-1">
						<img
							src={user.avatarUrl}
							alt={user.displayName}
							class="w-7 h-7 rounded-full object-cover"
							onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
						/>
						<span class="text-zinc-500 dark:text-zinc-400">{user.displayName}</span>
					</div>
					<a
						href="/profile"
						onclick={closeMenu}
						class="py-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
					>
						Profile
					</a>
					<button
						onclick={() => { logout(); closeMenu(); }}
						class="text-left py-1.5 text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
					>
						Logout
					</button>
				{:else}
					<a href="/login/discord" onclick={closeMenu} class="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">Login with Discord</a>
				{/if}
			</div>
		</div>
	{/if}
</nav>
