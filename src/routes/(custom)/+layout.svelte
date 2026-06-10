<script lang="ts">
	import { onMount } from 'svelte';
	import { updateUserDetails } from '$lib/services/user/userDetails.svelte';
	import { initAllIconSets } from '$lib/services/uicons.svelte';
	import NavBar from '@/components/custom/NavBar.svelte';
	import Footer from '@/components/custom/Footer.svelte';

	const { children } = $props();

	onMount(() => {
		updateUserDetails();
		initAllIconSets();
	});
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
	<NavBar />
	<div class="flex-1 pt-6 pb-6">
		{@render children()}
	</div>
	<Footer />
</div>
