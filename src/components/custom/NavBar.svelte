<script lang="ts">
	import { page } from '$app/state';
	import { getUserDetails, updateUserDetails } from '$lib/services/user/userDetails.svelte';
	import { getUserSettings } from '$lib/services/userSettings.svelte';
	import { setThemeMode } from '$lib/services/themeMode';
	import { Sun, Moon, Menu, X } from 'lucide-svelte';

	const navLinks = [
		{ href: '/map', label: 'Map' },
		{ href: '/shiny', label: 'Shiny Stats' },
		{ href: '/seen', label: 'Seen Stats' },
		{ href: '/status', label: 'Worker Status' }
	];

	let user = $derived(getUserDetails().details);
	let isDark = $derived(getUserSettings().themeMode !== 'light');
	let menuOpen = $state(false);

	async function logout() {
		await fetch('/logout');
		await updateUserDetails();
	}

	function toggleTheme() {
		setThemeMode(isDark ? 'light' : 'dark');
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

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
				<span class="text-zinc-500 dark:text-zinc-500">{user.displayName}</span>
				<button onclick={logout} class="text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Logout</button>
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
			<div class="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-sm">
				{#if user}
					<span class="text-zinc-500 dark:text-zinc-500">{user.displayName}</span>
					<button onclick={() => { logout(); closeMenu(); }} class="text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Logout</button>
				{:else}
					<a href="/login/discord" onclick={closeMenu} class="text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">Login with Discord</a>
				{/if}
			</div>
		</div>
	{/if}
</nav>
