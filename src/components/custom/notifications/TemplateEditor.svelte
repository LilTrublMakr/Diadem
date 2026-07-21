<script lang="ts">
	import DiscordEmbedPreview from "@/components/custom/notifications/DiscordEmbedPreview.svelte";
	import TagPicker from "@/components/custom/notifications/TagPicker.svelte";
	import {
		CONDITIONAL_TEMPLATE_FIELDS,
		EMOJI_TEMPLATE_FIELDS,
		POKEMON_TEMPLATE_FIELDS,
		PRESET_TEMPLATE_FIELDS
	} from "@/lib/features/notifications/templateFields";
	import {
		randomDespawnUnix,
		randomizePokemonContext,
		TEST_SCENARIOS
	} from "@/lib/features/notifications/testData";
	import type {
		EmbedTemplate,
		PokemonTemplateContext,
		TemplateField
	} from "@/lib/features/notifications/types";
	import { X } from "@lucide/svelte";
	import { tick } from "svelte";

	let { embed = $bindable() }: { embed: EmbedTemplate } = $props();

	type PreviewMode = "scenario" | "random" | "custom";
	let previewMode = $state<PreviewMode>("scenario");
	let scenarioId = $state(TEST_SCENARIOS[0].id);
	let randomContext = $state<PokemonTemplateContext>(randomizePokemonContext());
	let customContext = $state<PokemonTemplateContext>(TEST_SCENARIOS[0].context);
	let customJson = $state(JSON.stringify(TEST_SCENARIOS[0].context, null, 2));
	let customError = $state<string | null>(null);
	// Canned scenarios have a fixed despawnUnix baked in — overlay something realistic
	// (2-30 min out) instead. Random/custom modes already carry their own sensible value.
	let scenarioDespawnUnix = $state(randomDespawnUnix());

	let previewContext = $derived.by(() => {
		if (previewMode === "random") return randomContext;
		if (previewMode === "custom") return customContext;
		const scenario = TEST_SCENARIOS.find((s) => s.id === scenarioId) ?? TEST_SCENARIOS[0];
		return { ...scenario.context, despawnUnix: scenarioDespawnUnix };
	});

	function reroll() {
		randomContext = randomizePokemonContext();
		previewMode = "random";
	}

	function openCustom() {
		if (previewMode !== "custom") customJson = JSON.stringify(previewContext, null, 2);
		previewMode = "custom";
	}

	function applyCustomJson() {
		try {
			customContext = JSON.parse(customJson);
			customError = null;
		} catch {
			customError = "Invalid JSON — check for a typo or trailing comma";
		}
	}

	let sendingTest = $state(false);
	let testSendResult = $state<{ ok: boolean; message: string } | null>(null);

	async function sendTest() {
		sendingTest = true;
		testSendResult = null;
		try {
			const res = await fetch("/api/custom/notifications/test-send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ embed, context: previewContext })
			});
			if (res.ok) {
				const body = await res.json().catch(() => ({}) as { emojiWarnings?: string[] });
				const warnings = body.emojiWarnings ?? [];
				testSendResult =
					warnings.length > 0
						? {
								ok: true,
								message: `Sent, but these emoji ids aren't owned by this bot's Discord Application so they'll show as raw text, not icons: ${warnings.join(", ")}. Re-upload them under this bot's own Application (Developer Portal → Emojis) and update DISCORD_EMOJI_IDS.`
							}
						: { ok: true, message: "Sent! Check your Discord DMs." };
			} else {
				const body = await res.json().catch(() => ({}) as { message?: string });
				testSendResult = { ok: false, message: body.message ?? `Failed (${res.status})` };
			}
		} catch {
			testSendResult = { ok: false, message: "Failed to reach the server" };
		} finally {
			sendingTest = false;
		}
	}

	type FieldKey =
		| "title"
		| "description"
		| "color"
		| "thumbnailUrl"
		| "imageUrl"
		| "footerText"
		| "url";

	// embed-level keys, or "field:<index>:name"/"field:<index>:value" for an embed field row
	type ActiveKey = FieldKey | `field:${number}:${"name" | "value"}`;

	let elRefs: Record<string, HTMLInputElement | HTMLTextAreaElement> = {};
	let activeKey: ActiveKey | null = $state(null);

	function trackRef(el: HTMLInputElement | HTMLTextAreaElement, key: ActiveKey) {
		elRefs[key] = el;
		return {
			destroy() {
				if (elRefs[key] === el) delete elRefs[key];
			}
		};
	}

	function parseFieldKey(key: ActiveKey): { index: number; part: "name" | "value" } | null {
		if (!key.startsWith("field:")) return null;
		const [, indexStr, part] = key.split(":");
		return { index: Number(indexStr), part: part as "name" | "value" };
	}

	function getActiveValue(key: ActiveKey): string {
		const fieldRef = parseFieldKey(key);
		return fieldRef ? embed.fields[fieldRef.index][fieldRef.part] : embed[key as FieldKey];
	}

	function setActiveValue(key: ActiveKey, value: string) {
		const fieldRef = parseFieldKey(key);
		if (fieldRef) embed.fields[fieldRef.index][fieldRef.part] = value;
		else embed[key as FieldKey] = value;
	}

	async function insertTag(field: TemplateField) {
		if (!activeKey) return;
		const key = activeKey;
		const el = elRefs[key];
		const raw = field.raw ? field.tag : field.unescaped ? `{{{${field.tag}}}}` : `{{${field.tag}}}`;
		const cursorOffset = raw.indexOf("%CURSOR%");
		const tag = raw.replace("%CURSOR%", "");
		const current = getActiveValue(key);
		const start = el?.selectionStart ?? current.length;
		const end = el?.selectionEnd ?? current.length;

		setActiveValue(key, current.slice(0, start) + tag + current.slice(end));

		await tick();
		const updatedEl = elRefs[key];
		if (updatedEl) {
			const cursor = cursorOffset >= 0 ? start + cursorOffset : start + tag.length;
			updatedEl.focus();
			updatedEl.setSelectionRange(cursor, cursor);
		}
	}

	function addField() {
		if (embed.fields.length >= 25) return;
		embed.fields = [...embed.fields, { name: "", value: "", inline: false }];
	}

	function removeField(index: number) {
		embed.fields = embed.fields.filter((_, i) => i !== index);
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
	<div class="flex flex-col gap-3">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Title</span>
			<input
				type="text"
				bind:value={embed.title}
				use:trackRef={"title"}
				onfocus={() => (activeKey = "title")}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Description</span>
			<textarea
				bind:value={embed.description}
				use:trackRef={"description"}
				onfocus={() => (activeKey = "description")}
				rows={3}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			></textarea>
		</label>

		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">Color (hex)</span>
				<input
					type="text"
					bind:value={embed.color}
					use:trackRef={"color"}
					onfocus={() => (activeKey = "color")}
					placeholder="#5865F2"
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">Link URL</span>
				<input
					type="text"
					bind:value={embed.url}
					use:trackRef={"url"}
					onfocus={() => (activeKey = "url")}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
			</label>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">Thumbnail URL</span>
				<input
					type="text"
					bind:value={embed.thumbnailUrl}
					use:trackRef={"thumbnailUrl"}
					onfocus={() => (activeKey = "thumbnailUrl")}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">Image URL</span>
				<input
					type="text"
					bind:value={embed.imageUrl}
					use:trackRef={"imageUrl"}
					onfocus={() => (activeKey = "imageUrl")}
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
				/>
			</label>
		</div>

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Footer</span>
			<input
				type="text"
				bind:value={embed.footerText}
				use:trackRef={"footerText"}
				onfocus={() => (activeKey = "footerText")}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</label>

		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between text-sm">
				<span class="text-zinc-500 dark:text-zinc-400">Fields ({embed.fields.length}/25)</span>
				<button
					type="button"
					class="rounded border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
					onclick={addField}
					disabled={embed.fields.length >= 25}
				>
					+ Add Field
				</button>
			</div>
			{#each embed.fields as _, i (i)}
				<div class="rounded border border-zinc-200 dark:border-zinc-700 p-2 flex flex-col gap-1.5">
					<div class="flex items-center gap-2">
						<input
							type="text"
							placeholder="Name"
							bind:value={embed.fields[i].name}
							use:trackRef={`field:${i}:name`}
							onfocus={() => (activeKey = `field:${i}:name`)}
							class="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
						/>
						<label
							class="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 shrink-0"
						>
							<input type="checkbox" bind:checked={embed.fields[i].inline} />
							Inline
						</label>
						<button
							type="button"
							class="text-red-500 hover:text-red-700 shrink-0 cursor-pointer"
							title="Remove field"
							onclick={() => removeField(i)}
						>
							<X size={14} />
						</button>
					</div>
					<textarea
						placeholder="Value"
						bind:value={embed.fields[i].value}
						use:trackRef={`field:${i}:value`}
						onfocus={() => (activeKey = `field:${i}:value`)}
						rows={2}
						class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
					></textarea>
				</div>
			{/each}
		</div>

		<div class="rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
			<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
				Click a tag to insert it into the last-focused field above.
			</p>
			<TagPicker
				fields={[
					...POKEMON_TEMPLATE_FIELDS,
					...CONDITIONAL_TEMPLATE_FIELDS,
					...PRESET_TEMPLATE_FIELDS,
					...EMOJI_TEMPLATE_FIELDS
				]}
				onInsert={insertTag}
			/>
		</div>
	</div>

	<div class="flex flex-col gap-3">
		<div class="flex items-center gap-2 text-sm flex-wrap">
			<span class="text-zinc-500 dark:text-zinc-400">Preview with</span>
			<select
				bind:value={scenarioId}
				onchange={() => (previewMode = "scenario")}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
			>
				{#each TEST_SCENARIOS as s (s.id)}
					<option value={s.id}>{s.label}</option>
				{/each}
			</select>
			<button
				type="button"
				class="rounded border px-2 py-1 text-xs cursor-pointer {previewMode === 'random'
					? 'border-blue-400 text-blue-600 dark:text-blue-400'
					: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
				onclick={reroll}
				title="Generate new random test data"
			>
				🎲 Randomize
			</button>
			<button
				type="button"
				class="rounded border px-2 py-1 text-xs cursor-pointer {previewMode === 'custom'
					? 'border-blue-400 text-blue-600 dark:text-blue-400'
					: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
				onclick={openCustom}
			>
				Custom JSON
			</button>
			<button
				type="button"
				class="rounded border border-emerald-500 text-emerald-600 dark:text-emerald-400 px-2 py-1 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={sendTest}
				disabled={sendingTest}
				title="Send this template + test data as a real Discord DM to you"
			>
				{sendingTest ? "Sending…" : "📨 Send Test"}
			</button>
		</div>

		{#if testSendResult}
			<p
				class="text-xs {testSendResult.ok
					? 'text-emerald-600 dark:text-emerald-400'
					: 'text-red-500'}"
			>
				{testSendResult.message}
			</p>
		{/if}

		{#if previewMode === "custom"}
			<div class="flex flex-col gap-1">
				<textarea
					bind:value={customJson}
					rows={8}
					spellcheck="false"
					class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100"
				></textarea>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-1 text-xs text-white cursor-pointer"
						onclick={applyCustomJson}
					>
						Apply
					</button>
					{#if customError}
						<span class="text-xs text-red-500">{customError}</span>
					{/if}
				</div>
			</div>
		{/if}

		<DiscordEmbedPreview {embed} context={previewContext} />
	</div>
</div>
