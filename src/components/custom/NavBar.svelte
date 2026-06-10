<script lang="ts">
	import { page } from '$app/state';
	import { getUserDetails, updateUserDetails } from '$lib/services/user/userDetails.svelte';
	import { getUserSettings } from '$lib/services/userSettings.svelte';
	import { setThemeMode } from '$lib/services/themeMode';
	import { Sun, Moon } from 'lucide-svelte';

	const navLinks = [
		{ href: '/map', label: 'Map' },
		{ href: '/shiny', label: 'Shiny Stats' },
		{ href: '/seen', label: 'Seen Stats' },
		{ href: '/status', label: 'Worker Status' }
	];

	let user = $derived(getUserDetails().details);
	let isDark = $derived(getUserSettings().themeMode !== 'light');

	async function logout() {
		await fetch('/logout');
		await updateUserDetails();
	}

	function toggleTheme() {
		setThemeMode(isDark ? 'light' : 'dark');
	}
</script>

<nav class="border-b-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-950/50 shadow-zinc-200/80 sticky top-0 z-10">
	<div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
		<a href="/" class="font-bold text-zinc-900 dark:text-zinc-100 text-lg tracking-tight">PoGo Map VT</a>
		<div class="flex items-center gap-6 text-sm">
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
	</div>
</nav>
