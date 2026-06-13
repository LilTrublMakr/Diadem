<script lang="ts">
	import { onMount } from 'svelte';
	import { getUserDetails, updateUserDetails } from '@/lib/services/user/userDetails.svelte';

	let sessionExpired = $state(false);
	let dismissed = $state(false);

	// plain var to track previous state without creating a reactive dep loop
	let wasLoggedIn = false;

	$effect(() => {
		const loggedIn = !!getUserDetails().details;
		if (loggedIn) {
			wasLoggedIn = true;
		} else if (wasLoggedIn) {
			sessionExpired = true;
		}
	});

	onMount(() => {
		const interval = setInterval(updateUserDetails, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});
</script>

{#if sessionExpired && !dismissed}
	<div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-max max-w-[calc(100vw-2rem)]">
		<div
			class="bg-card/95 backdrop-blur-sm rounded-lg border border-border shadow-lg flex items-center gap-3 pl-4 pr-2 py-2.5"
		>
			<span class="text-sm">Your session has expired.</span>
			<a
				href="/login/discord?redir=/map"
				class="inline-flex items-center text-xs font-medium px-2.5 h-7 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
			>
				Log in again
			</a>
			<button
				onclick={() => (dismissed = true)}
				class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
				aria-label="Dismiss"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"/><path d="m6 6 12 12"/>
				</svg>
			</button>
		</div>
	</div>
{/if}
