<script lang="ts">
	import { onMount } from "svelte";
	import type { ShinyAccountDto } from "@/lib/features/shinyPrediction";

	let accounts = $state<ShinyAccountDto[]>([]);
	let label = $state("");
	let playerId = $state("");
	let busy = $state(false);
	let error = $state<string | null>(null);

	async function send(url: string, init?: RequestInit) {
		busy = true;
		error = null;
		try {
			const res = await fetch(url, init);
			const body = await res.json().catch(() => null);
			if (!res.ok) throw new Error(body?.error ?? `Server returned ${res.status}`);
			accounts = body;
			return true;
		} catch (e) {
			error = e instanceof Error ? e.message : "Request failed";
			return false;
		} finally {
			busy = false;
		}
	}

	onMount(() => send("/api/custom/shiny-accounts"));
</script>

<details
	class="mb-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4"
>
	<summary
		class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none"
	>
		✨ Personal shiny prediction
	</summary>
	<div class="mt-4 flex flex-col gap-3 text-sm">
		<p class="text-xs text-zinc-500 dark:text-zinc-400">
			Link a Pokémon GO account's player id to see which wild spawns would be shiny for that account
			— in map popups and as a notification filter. The id is the <code>invited_player_ids</code> value
			(16 hex characters, or 21 digits for Google accounts), which the normal game never shows. It stays
			on the server; only the last 4 characters are shown back.
		</p>
		<p class="text-xs text-amber-600 dark:text-amber-500">
			This relies on an unofficial per-account RNG that Niantic can change at any time — treat
			predictions as a hint, not a guarantee.
		</p>

		{#if accounts.length > 0}
			<ul class="flex flex-col gap-1">
				{#each accounts as account (account.id)}
					<li
						class="flex items-center justify-between gap-2 rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5"
					>
						<span class="text-zinc-800 dark:text-zinc-200">
							{account.label}
							<span class="text-xs text-zinc-400 dark:text-zinc-500">{account.playerIdHint}</span>
						</span>
						<button
							onclick={() => send(`/api/custom/shiny-accounts/${account.id}`, { method: "DELETE" })}
							disabled={busy}
							class="text-xs text-red-500 hover:text-red-400 disabled:opacity-50">Remove</button
						>
					</li>
				{/each}
			</ul>
		{/if}

		<form
			class="flex flex-wrap items-center gap-2"
			onsubmit={async (e) => {
				e.preventDefault();
				const ok = await send("/api/custom/shiny-accounts", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ label, playerId })
				});
				if (ok) {
					label = "";
					playerId = "";
				}
			}}
		>
			<input
				bind:value={label}
				placeholder="Account name"
				maxlength="64"
				class="w-36 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-zinc-800 dark:text-zinc-200 outline-none"
			/>
			<input
				bind:value={playerId}
				placeholder="Player id"
				autocomplete="off"
				spellcheck="false"
				class="w-56 font-mono rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-zinc-800 dark:text-zinc-200 outline-none"
			/>
			<button
				type="submit"
				disabled={busy || !label.trim() || !playerId.trim()}
				class="px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
				>Link account</button
			>
		</form>
		{#if error}
			<p class="text-xs text-red-500">{error}</p>
		{/if}
	</div>
</details>
