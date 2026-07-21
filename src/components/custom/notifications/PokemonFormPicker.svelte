<script lang="ts">
	import { getMasterPokemon, loadMasterFile } from "@/lib/services/masterfile";
	import { onMount } from "svelte";

	let { pokemonId, form = $bindable() }: { pokemonId: number; form: number | undefined } = $props();

	let ready = $state(false);

	onMount(async () => {
		await loadMasterFile();
		ready = true;
	});

	type FormOption = { id: number; name: string };

	let options = $derived.by<FormOption[]>(() => {
		if (!ready) return [];
		const master = getMasterPokemon(pokemonId);
		if (!master) return [];
		const opts: FormOption[] = [{ id: 0, name: "Normal" }];
		for (const [idStr, formData] of Object.entries(master.forms ?? {})) {
			const id = Number(idStr);
			if (id === 0) continue;
			opts.push({ id, name: formData.name || `Form ${id}` });
		}
		return opts;
	});
</script>

{#if options.length > 1}
	<label class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">Form</span>
		<select
			value={form ?? ""}
			onchange={(e) => (form = e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
			class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
		>
			<option value="">Any form</option>
			{#each options as opt (opt.id)}
				<option value={opt.id}>{opt.name}</option>
			{/each}
		</select>
	</label>
{/if}
