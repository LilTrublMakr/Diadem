<script lang="ts">
	import { loadMasterFile } from "@/lib/services/masterfile";
	import { buildMoveNameMap, buildPokeGenieCsv, buildCalcyIvCsv } from "@/lib/utils/collectionExportUtils";
	import type { RawExportFile, RawExportPokemon } from "@/lib/types/collectionExport";
	import { Upload, Download, FileJson } from "@lucide/svelte";

	let fileInput: HTMLInputElement | undefined = $state();
	let fileName = $state<string | null>(null);
	let pokemon = $state<RawExportPokemon[] | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let masterFileLoaded = false;

	function parseExport(text: string): RawExportPokemon[] {
		const data = JSON.parse(text) as RawExportFile;
		const list = data?.payload?.pokemon;
		if (!Array.isArray(list)) throw new Error("This doesn't look like a Pokemon collection export");
		return list;
	}

	async function onFileChosen(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		error = null;
		pokemon = null;
		fileName = file.name;
		loading = true;

		try {
			const list = parseExport(await file.text());
			if (!masterFileLoaded) {
				await loadMasterFile();
				masterFileLoaded = true;
			}
			pokemon = list;
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to read that file";
		} finally {
			loading = false;
		}
	}

	function downloadCsv(filename: string, csv: string) {
		const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function downloadPokeGenie() {
		if (!pokemon) return;
		downloadCsv("poke_genie_export.csv", buildPokeGenieCsv(pokemon, buildMoveNameMap()));
	}

	function downloadCalcyIv() {
		if (!pokemon) return;
		downloadCsv("calcy_iv_history.csv", buildCalcyIvCsv(pokemon, buildMoveNameMap()));
	}
</script>

<svelte:head>
	<title>Collection CSV Export — PoGo Map VT</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Collection CSV Export</h1>
	<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
		Upload a Pokemon collection export (<code class="text-zinc-600 dark:text-zinc-300">export.json</code>)
		to generate CSVs formatted for PokeGenie and CalcyIV. Not every column those tools use exists
		in the source export - unavailable columns are left blank rather than guessed at.
	</p>

	<div
		class="rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center"
	>
		<input
			bind:this={fileInput}
			type="file"
			accept="application/json,.json"
			class="hidden"
			onchange={onFileChosen}
		/>
		<button
			onclick={() => fileInput?.click()}
			class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
		>
			<Upload size={16} />
			Choose export.json
		</button>
		{#if fileName}
			<div class="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
				<FileJson size={14} />
				{fileName}
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Reading file…</div>
	{/if}

	{#if error}
		<div
			class="mt-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-4 py-3 text-sm"
		>
			{error}
		</div>
	{/if}

	{#if pokemon && !loading}
		<div
			class="mt-6 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5"
		>
			<div class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
				Parsed <span class="font-semibold text-zinc-900 dark:text-zinc-100">{pokemon.length}</span>
				Pokemon.
			</div>
			<div class="flex flex-wrap gap-3">
				<button
					onclick={downloadPokeGenie}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<Download size={16} />
					Download PokeGenie CSV
				</button>
				<button
					onclick={downloadCalcyIv}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<Download size={16} />
					Download CalcyIV CSV
				</button>
			</div>
		</div>
	{/if}
</div>
