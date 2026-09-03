<script lang="ts">
	import { loadMasterFile } from "@/lib/services/masterfile";
	import {
		buildMoveIdMap,
		detectExportFormat,
		parseCalcyIvCsv,
		parsePokeGenieCsv,
		type ExportFormat
	} from "@/lib/utils/collectionImportUtils";
	import type { RawExportFile, RawExportPokemon } from "@/lib/types/collectionExport";
	import { Upload, FileJson } from "@lucide/svelte";

	let { onParsed }: { onParsed: (pokemon: RawExportPokemon[], format: ExportFormat) => void } =
		$props();

	let fileInput: HTMLInputElement | undefined = $state();
	let fileName = $state<string | null>(null);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let dragOver = $state(false);
	let pasteText = $state("");
	let masterFileLoaded = false;

	function parseJsonExport(text: string): RawExportPokemon[] {
		const data = JSON.parse(text);
		// The export tool switched (Sept 2026) from a {payload:{ok,pokemon:[...]}} wrapper to a
		// plain top-level array — accept either shape.
		const list = Array.isArray(data) ? data : (data as RawExportFile)?.payload?.pokemon;
		if (!Array.isArray(list)) throw new Error("This doesn't look like a Pokemon collection export");
		return list;
	}

	async function handleInput(text: string, sourceName: string) {
		error = null;
		fileName = sourceName;
		loading = true;

		try {
			const format = detectExportFormat(text);
			if (format === "unknown") {
				throw new Error(
					"Unrecognized format — expected this app's own export.json, a PokeGenie CSV, or a CalcyIV CSV."
				);
			}

			if (!masterFileLoaded) {
				await loadMasterFile();
				masterFileLoaded = true;
			}

			const pokemon =
				format === "json"
					? parseJsonExport(text)
					: format === "pokegenie"
						? parsePokeGenieCsv(text, buildMoveIdMap())
						: parseCalcyIvCsv(text, buildMoveIdMap());
			onParsed(pokemon, format);
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to read that file";
		} finally {
			loading = false;
		}
	}

	async function onFileChosen(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		await handleInput(await file.text(), file.name);
	}

	async function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		await handleInput(await file.text(), file.name);
	}

	async function onPasteSubmit() {
		if (!pasteText.trim()) return;
		await handleInput(pasteText, "pasted text");
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- drop target; the "Choose a file" button above is the keyboard-accessible equivalent for the same action -->
<div
	ondragover={(e) => {
		e.preventDefault();
		dragOver = true;
	}}
	ondragleave={() => (dragOver = false)}
	ondrop={onDrop}
	class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
		? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
		: 'border-zinc-300 dark:border-zinc-700'}"
>
	<input
		bind:this={fileInput}
		type="file"
		accept="application/json,.json,text/csv,.csv"
		class="hidden"
		onchange={onFileChosen}
	/>
	<button
		onclick={() => fileInput?.click()}
		class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity"
	>
		<Upload size={16} />
		Choose a file
	</button>
	<p class="mt-2 text-xs text-zinc-400 dark:text-zinc-500">or drag and drop it here</p>
	{#if fileName}
		<div class="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
			<FileJson size={14} />
			{fileName}
		</div>
	{/if}
</div>

<div class="mt-4">
	<label for="paste-export-text" class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5"
		>Or paste export text</label
	>
	<textarea
		id="paste-export-text"
		bind:value={pasteText}
		rows="4"
		placeholder="Paste export.json / PokeGenie CSV / CalcyIV CSV contents here…"
		class="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200"
	></textarea>
	<button
		onclick={onPasteSubmit}
		disabled={!pasteText.trim()}
		class="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		Parse pasted text
	</button>
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
