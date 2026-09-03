<script lang="ts">
	import {
		buildMoveNameMap,
		buildPokeGenieCsv,
		buildCalcyIvCsv,
		buildPokeGenieBackupJson,
		buildPokeGenieMetadataJson
	} from "@/lib/utils/collectionExportUtils";
	import type { ExportFormat } from "@/lib/utils/collectionImportUtils";
	import ExportParsePanel from "@/components/custom/ExportParsePanel.svelte";
	import type { RawExportPokemon } from "@/lib/types/collectionExport";
	import { Download } from "@lucide/svelte";

	let pokemon = $state<RawExportPokemon[] | null>(null);
	let detectedFormat = $state<ExportFormat | null>(null);

	const FORMAT_LABELS: Record<ExportFormat, string> = {
		json: "this app's own",
		pokegenie: "a PokeGenie",
		calcyiv: "a CalcyIV",
		unknown: "an unrecognized"
	};

	function onParsed(parsed: RawExportPokemon[], format: ExportFormat) {
		pokemon = parsed;
		detectedFormat = format;
	}

	function downloadCsv(filename: string, csv: string) {
		// No BOM - a real CalcyIV export has none, and CalcyIV's importer appears to do a strict
		// header-name match (a BOM-prefixed "Ancestor?" header fails to match, breaking column
		// detection for the whole file - this was the actual cause of a reported "invalid IV on
		// every row" import failure, not the IV values themselves).
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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

	function downloadJson(filename: string, json: string) {
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	// PokeGenie doesn't accept a file upload - it restores from a "Backup" folder in the user's own
	// Dropbox (Apps/Poke Genie/Backup/). Verified against a real restore: scan data imports correctly
	// without the pokedex/ and scan_thumb/ image folders a real backup also has (restoring those is a
	// separate, user-toggleable option in PokeGenie's own restore dialog) - drop these two files into
	// that Backup folder (replacing the existing scan_data.json and metadata.json) and use Restore
	// from Backup.
	function downloadPokeGenieBackup() {
		if (!pokemon) return;
		const now = Date.now();
		downloadJson("scan_data.json", buildPokeGenieBackupJson(pokemon, buildMoveNameMap()));
		downloadJson("metadata.json", buildPokeGenieMetadataJson(pokemon.length, now));
	}
</script>

<svelte:head>
	<title>IV Export Converter — PoGo Map VT</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
	<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">IV Export Converter</h1>
	<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
		Convert a Pokemon collection export between <strong>PokeGenie</strong> and <strong>CalcyIV</strong>
		CSV formats — upload, drag-and-drop, or paste either one and download the other. This also accepts
		<code class="text-zinc-600 dark:text-zinc-300">export.json</code>, the format produced by a smaller,
		closed-source companion tool most people haven't heard of yet (it may see wider use down the road).
		The format is detected automatically. Not every column those tools use exists in every source
		format - unavailable columns (e.g. shiny/nickname/costume when starting from a PokeGenie CSV) are
		left blank rather than guessed at.
	</p>
	<p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
		PokeGenie itself can't import a CSV — the "PokeGenie-style CSV" download below is a plain
		spreadsheet-readable export only. To actually get data into PokeGenie, use the
		<strong>PokeGenie Backup</strong> download instead, which produces the files PokeGenie's own
		Dropbox-based Restore from Backup expects.
	</p>

	<ExportParsePanel {onParsed} />

	{#if pokemon}
		<div
			class="mt-6 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5"
		>
			<div class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
				Parsed <span class="font-semibold text-zinc-900 dark:text-zinc-100">{pokemon.length}</span>
				Pokemon from {detectedFormat ? FORMAT_LABELS[detectedFormat] : ""} export.
			</div>
			<div class="flex flex-wrap gap-3">
				<button
					onclick={downloadPokeGenie}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<Download size={16} />
					Download PokeGenie-style CSV
				</button>
				<button
					onclick={downloadCalcyIv}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<Download size={16} />
					Download CalcyIV CSV
				</button>
				<button
					onclick={downloadPokeGenieBackup}
					class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
				>
					<Download size={16} />
					Download PokeGenie Backup
				</button>
			</div>
			<p class="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
				The PokeGenie backup download produces <code>scan_data.json</code> and
				<code>metadata.json</code> (no images) — PokeGenie doesn't import a plain CSV, it restores
				from a Dropbox <code>Apps/Poke Genie/Backup/</code> folder. Replace those two files there
				and use Restore from Backup in PokeGenie.
			</p>
		</div>
	{/if}
</div>
