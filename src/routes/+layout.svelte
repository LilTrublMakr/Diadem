<script lang="ts">
	import "../app.css";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { ModeWatcher } from "mode-watcher";
	import Metadata from "@/components/utils/Metadata.svelte";
	import NavBar from "@/components/custom/NavBar.svelte";

	let { children } = $props();
</script>

<Metadata />

<ModeWatcher defaultMode={getUserSettings().themeMode} track={false} />
<NavBar />
{@render children()}
