<script lang="ts">
	import TemplateEditor from "@/components/custom/notifications/TemplateEditor.svelte";
	import NotificationScheduleEditor from "@/components/custom/notifications/NotificationScheduleEditor.svelte";
	import NotificationAreaMap from "@/components/custom/notifications/NotificationAreaMap.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import PokemonFormPicker from "@/components/custom/notifications/PokemonFormPicker.svelte";
	import type {
		NotificationSchedule,
		SubscriptionMode
	} from "@/lib/features/notifications/scheduleTypes";
	import {
		createSubscription,
		createTemplate,
		getNotificationsState,
		isApiError,
		loadNotifications,
		patchSubscription,
		patchTemplate,
		removeSubscription,
		removeTemplate
	} from "@/lib/features/notifications/notificationsState.svelte";
	import type {
		EmbedTemplate,
		NotificationSubscriptionDto,
		NotificationTemplateDto,
		PokemonSubscriptionFilters
	} from "@/lib/features/notifications/types";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { getScanAreasState, loadScanAreas } from "@/lib/features/scanAreas/scanAreasState.svelte";
	import { getKojiGeofences, loadKojiGeofences, type KojiFeatures } from "@/lib/features/koji";
	import {
		createNotificationArea,
		getNotificationAreasState,
		loadNotificationAreas,
		patchNotificationArea,
		removeNotificationArea
	} from "@/lib/features/notifications/notificationAreasState.svelte";
	import type { NotificationAreaDto } from "@/lib/features/notifications/types";
	import type { Polygon } from "geojson";
	import {
		exportNotificationsBackup,
		importNotificationsBackup,
		isBackupApiError,
		type BackupSection
	} from "@/lib/features/notifications/backupState";
	import type { BackupImportSummary } from "@/lib/features/notifications/backupTypes";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { Dialog } from "bits-ui";
	import { Download, Loader2, Pencil, Plus, Trash2, Upload, X } from "@lucide/svelte";

	type NumericFilterKey =
		| "minIv"
		| "maxIv"
		| "minCp"
		| "maxCp"
		| "minLevel"
		| "maxLevel"
		| "minAtk"
		| "maxAtk"
		| "minDef"
		| "maxDef"
		| "minSta"
		| "maxSta"
		| "minSize"
		| "maxSize";

	const notifState = getNotificationsState();
	const scanAreasState = getScanAreasState();
	const notificationAreasState = getNotificationAreasState();
	// getKojiGeofences() reads a plain (non-reactive) module variable — snapshot it into
	// local state once loadKojiGeofences() resolves so the picker actually re-renders.
	let kojiGeofences = $state<KojiFeatures>([]);

	let loggedIn = $derived(!!getUserDetails().details);

	$effect(() => {
		void loadNotifications();
		// Best-effort — a user without scan-area/Koji access just sees an area picker
		// with one or both groups empty; neither failure should block this page.
		void loadScanAreas();
		void loadNotificationAreas();
		void loadKojiGeofences().then(() => (kojiGeofences = getKojiGeofences()));
	});

	let errorMessage = $state<string | null>(null);
	let errorTimer: ReturnType<typeof setTimeout> | undefined;
	function showError(message: string) {
		errorMessage = message;
		clearTimeout(errorTimer);
		errorTimer = setTimeout(() => (errorMessage = null), 6000);
	}

	$effect(() => {
		if (notifState.error) showError(notifState.error);
	});

	function defaultEmbed(): EmbedTemplate {
		return {
			title: "{{pokemonName}}",
			description: "IV: {{iv}}% • CP: {{cp}} • Level: {{level}}",
			color: "#5865F2",
			thumbnailUrl: "{{{pokemonImageUrl}}}",
			imageUrl: "{{{mapImageUrl}}}",
			footerText: "Despawns at {{despawnTime}} ({{minutesLeft}}m left)",
			url: "{{{googleMapsUrl}}}",
			fields: []
		};
	}

	function defaultFilters(): PokemonSubscriptionFilters {
		return { pokemonIds: [] };
	}

	const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	function defaultSchedule(): NotificationSchedule {
		return { tz: browserTz, weekly: [], dated: [] };
	}

	// --- Notification area editing ---
	let areaMode = $state<"idle" | "creating" | number>("idle");
	let areaMapComponent = $state<ReturnType<typeof NotificationAreaMap>>();
	let areaName = $state("");
	let areaDrawnPolygon = $state<Polygon | null>(null);
	let editingAreaRow = $state<NotificationAreaDto | null>(null);
	let liveAreaSqM = $state<number | null>(null);
	let savingArea = $state(false);

	let liveAreaKm2 = $derived(liveAreaSqM === null ? null : (liveAreaSqM / 1_000_000).toFixed(2));
	let canSaveArea = $derived(!savingArea && (areaMode !== "creating" || areaDrawnPolygon !== null));

	function startCreateArea() {
		areaMode = "creating";
		areaName = "";
		areaDrawnPolygon = null;
		editingAreaRow = null;
		liveAreaSqM = null;
	}

	function startEditArea(area: NotificationAreaDto) {
		areaMode = area.id;
		areaName = area.name;
		editingAreaRow = area;
		areaDrawnPolygon = null;
		liveAreaSqM = null;
	}

	function cancelAreaEdit() {
		areaMapComponent?.cancelDrawing();
		areaMode = "idle";
		editingAreaRow = null;
		areaDrawnPolygon = null;
		liveAreaSqM = null;
	}

	// The map mounts fresh each time the dialog opens, so drawing/editing can only be
	// kicked off once it reports it's actually ready — not synchronously on open.
	function onAreaMapReady() {
		if (areaMode === "creating") {
			areaMapComponent?.startDraw();
		} else if (editingAreaRow) {
			areaMapComponent?.startEdit(editingAreaRow);
			areaMapComponent?.fitToArea(editingAreaRow);
		}
	}

	async function saveArea() {
		const name = areaName.trim();
		if (!name) {
			showError("Give the area a name first");
			return;
		}
		savingArea = true;
		try {
			const result =
				areaMode === "creating"
					? await createNotificationArea({ name, geofence: areaDrawnPolygon! })
					: await patchNotificationArea(areaMode as number, {
							name,
							geofence: areaMapComponent?.getEditedPolygon() ?? undefined
						});
			if (isApiError(result)) {
				showError(result.message);
				return;
			}
			areaMode = "idle";
			editingAreaRow = null;
			areaDrawnPolygon = null;
		} finally {
			savingArea = false;
		}
	}

	async function deleteAreaById(id: number) {
		const result = await removeNotificationArea(id);
		if (result) showError(result.message);
	}

	// --- Template editing ---
	let templateMode = $state<"idle" | "creating" | number>("idle");
	let templateName = $state("");
	let templateEmbed = $state<EmbedTemplate>(defaultEmbed());
	let savingTemplate = $state(false);

	function startCreateTemplate() {
		templateMode = "creating";
		templateName = "";
		templateEmbed = defaultEmbed();
	}

	function startEditTemplate(template: NotificationTemplateDto) {
		templateMode = template.id;
		templateName = template.name;
		// `fields` predates existing saved templates — default it if the saved row lacks it
		templateEmbed = { ...template.embed, fields: template.embed.fields ?? [] };
	}

	function cancelTemplateEdit() {
		templateMode = "idle";
	}

	async function saveTemplate() {
		const name = templateName.trim();
		if (!name) {
			showError("Give the template a name first");
			return;
		}
		savingTemplate = true;
		try {
			const result =
				templateMode === "creating"
					? await createTemplate({ name, embed: templateEmbed })
					: await patchTemplate(templateMode as number, { name, embed: templateEmbed });
			if (isApiError(result)) {
				showError(result.message);
				return;
			}
			templateMode = "idle";
		} finally {
			savingTemplate = false;
		}
	}

	async function deleteTemplateById(id: number) {
		const result = await removeTemplate(id);
		if (result) showError(result.message);
	}

	// --- Subscription editing ---
	let subscriptionMode = $state<"idle" | "creating" | number>("idle");
	let subName = $state("");
	let subEnabled = $state(true);
	let subTemplateId = $state<number | null>(null);
	let subFilters = $state<PokemonSubscriptionFilters>(defaultFilters());
	let subMode = $state<SubscriptionMode>("manual");
	let subSchedule = $state<NotificationSchedule>(defaultSchedule());
	let savingSubscription = $state(false);

	function startCreateSubscription() {
		subscriptionMode = "creating";
		subName = "";
		subEnabled = true;
		subTemplateId = null;
		subFilters = defaultFilters();
		subMode = "manual";
		subSchedule = defaultSchedule();
	}

	function startEditSubscription(sub: NotificationSubscriptionDto) {
		subscriptionMode = sub.id;
		subName = sub.name;
		subEnabled = sub.enabled;
		subTemplateId = sub.templateId;
		subFilters = { ...sub.filters, pokemonIds: sub.filters.pokemonIds ?? [] };
		subMode = sub.mode;
		subSchedule = sub.schedule ? JSON.parse(JSON.stringify(sub.schedule)) : defaultSchedule();
	}

	function cancelSubscriptionEdit() {
		subscriptionMode = "idle";
	}

	async function saveSubscription() {
		const name = subName.trim();
		if (!name) {
			showError("Give the subscription a name first");
			return;
		}
		savingSubscription = true;
		try {
			const input = {
				name,
				enabled: subEnabled,
				templateId: subTemplateId,
				filters: subFilters,
				mode: subMode,
				schedule: subMode === "scheduled" ? { ...subSchedule, tz: browserTz } : null
			};
			const result =
				subscriptionMode === "creating"
					? await createSubscription(input)
					: await patchSubscription(subscriptionMode as number, input);
			if (isApiError(result)) {
				showError(result.message);
				return;
			}
			subscriptionMode = "idle";
		} finally {
			savingSubscription = false;
		}
	}

	async function deleteSubscriptionById(id: number) {
		const result = await removeSubscription(id);
		if (result) showError(result.message);
	}

	async function toggleEnabled(sub: NotificationSubscriptionDto) {
		const result = await patchSubscription(sub.id, { enabled: !sub.enabled });
		if (isApiError(result)) showError(result.message);
	}

	function templateName_(id: number | null): string {
		if (id === null) return "Default template";
		return notifState.templates.find((t) => t.id === id)?.name ?? "Unknown template";
	}

	function areaLabel(filters: PokemonSubscriptionFilters): string | null {
		if (!filters.areaId) return null;
		if (filters.areaSource === "koji") {
			const area = kojiGeofences.find((a) => a.properties.id === filters.areaId);
			return area ? area.properties.name : "Unknown area";
		}
		if (filters.areaSource === "notificationArea") {
			const area = notificationAreasState.areas.find((a) => a.id === filters.areaId);
			return area ? area.name : "Unknown area";
		}
		const area = scanAreasState.areas.find((a) => a.id === filters.areaId);
		return area ? area.name : "Unknown area";
	}

	function filterSummary(filters: PokemonSubscriptionFilters): string {
		const parts: string[] = [];
		if (!filters.pokemonIds || filters.pokemonIds.length === 0) {
			parts.push("Any species");
		} else if (filters.pokemonIds.length === 1) {
			parts.push(`Pokemon #${filters.pokemonIds[0]}`);
		} else {
			parts.push(`${filters.pokemonIds.length} species`);
		}
		if (filters.minIv !== undefined || filters.maxIv !== undefined) {
			parts.push(`IV ${filters.minIv ?? 0}–${filters.maxIv ?? 100}%`);
		}
		if (filters.minCp !== undefined || filters.maxCp !== undefined) {
			parts.push(`CP ${filters.minCp ?? 0}–${filters.maxCp ?? "∞"}`);
		}
		if (filters.pvpLeague) parts.push(`${filters.pvpLeague} rank ≤ ${filters.pvpMaxRank ?? "?"}`);
		const area = areaLabel(filters);
		if (area) parts.push(`in ${area}`);
		return parts.join(" · ");
	}

	// --- Backup / restore ---
	let exportingSection = $state<BackupSection | "all" | null>(null);
	let importing = $state(false);
	let importSummary = $state<BackupImportSummary | null>(null);
	let importFileInput = $state<HTMLInputElement>();

	async function runExport(section: BackupSection | "all") {
		exportingSection = section;
		try {
			const result = await exportNotificationsBackup(section === "all" ? undefined : [section]);
			if (result) showError(result.message);
		} finally {
			exportingSection = null;
		}
	}

	async function onImportFileChosen(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		importing = true;
		importSummary = null;
		try {
			const result = await importNotificationsBackup(file);
			if (isBackupApiError(result)) {
				showError(result.message);
				return;
			}
			importSummary = result;
			// Refresh whatever the import may have created.
			await Promise.all([loadNotifications(), loadNotificationAreas()]);
		} finally {
			importing = false;
			if (importFileInput) importFileInput.value = "";
		}
	}
</script>

{#snippet minMax(label: string, minKey: NumericFilterKey, maxKey: NumericFilterKey)}
	<div class="flex flex-col gap-1 text-sm">
		<span class="text-zinc-500 dark:text-zinc-400">{label}</span>
		<div class="flex items-center gap-1">
			<input
				type="number"
				placeholder="Min"
				value={subFilters[minKey] ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					subFilters[minKey] = v ? Number(v) : undefined;
				}}
				class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
			/>
			<span class="text-xs text-zinc-400 shrink-0">–</span>
			<input
				type="number"
				placeholder="Max"
				value={subFilters[maxKey] ?? ""}
				oninput={(e) => {
					const v = e.currentTarget.value;
					subFilters[maxKey] = v ? Number(v) : undefined;
				}}
				class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100"
			/>
		</div>
	</div>
{/snippet}

<svelte:head>
	<title>My Notifications — PoGo Map VT</title>
</svelte:head>

<div class="max-w-5xl mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">My Notifications</h1>
		<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
			Get your own Discord DM alerts — pick what to be notified about and design how the embed
			looks.
		</p>
	</div>

	{#if errorMessage}
		<div
			class="mb-4 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-400 flex items-center justify-between"
		>
			<span>{errorMessage}</span>
			<button onclick={() => (errorMessage = null)} title="Dismiss"><X size={14} /></button>
		</div>
	{/if}

	{#if !loggedIn}
		<div
			class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400"
		>
			<a href="/login/discord" class="text-blue-600 dark:text-blue-400 hover:underline"
				>Log in with Discord</a
			> to manage your notifications.
		</div>
	{:else if notifState.forbidden}
		<div
			class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400"
		>
			You don't have notification access. Ask an admin to grant the "notifications" feature for your
			Discord role.
		</div>
	{:else if notifState.loading && !notifState.loaded}
		<div class="flex items-center justify-center p-16 text-zinc-400">
			<Loader2 size={24} class="animate-spin" />
		</div>
	{:else}
		<div class="flex flex-col gap-6">
			<!-- Subscriptions -->
			<section class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Subscriptions</h2>
					{#if subscriptionMode === "idle"}
						<button
							class="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white"
							onclick={startCreateSubscription}
						>
							<Plus size={14} /> New subscription
						</button>
					{/if}
				</div>

				<Dialog.Root
					open={subscriptionMode !== "idle"}
					onOpenChange={(open) => {
						if (!open) cancelSubscriptionEdit();
					}}
				>
					<Dialog.Portal>
						<Dialog.Overlay
							class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[1px] backdrop-brightness-95 transition-all"
						/>
						<Dialog.Content
							class="bg-background rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-hidden fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 border max-w-[calc(100%-1.5rem)] w-full sm:w-[min(90vw,32rem)] max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-3"
							trapFocus={false}
						>
							<Dialog.Title
								class="flex items-center justify-between text-lg font-semibold text-zinc-900 dark:text-zinc-100"
							>
								{subscriptionMode === "creating" ? "New subscription" : "Edit subscription"}
								<CloseButton onclick={cancelSubscriptionEdit} />
							</Dialog.Title>

							<input
								type="text"
								bind:value={subName}
								placeholder="Subscription name"
								maxlength={64}
								class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
							/>

							<label class="flex flex-col gap-1 text-sm">
								<span class="text-zinc-500 dark:text-zinc-400"
									>Species (optional, pick any number)</span
								>
								<PokemonPicker bind:selected={subFilters.pokemonIds} />
							</label>

							{#if subFilters.pokemonIds?.length === 1}
								<PokemonFormPicker
									pokemonId={subFilters.pokemonIds[0]}
									bind:form={subFilters.form}
								/>
							{/if}

							<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
								{@render minMax("IV %", "minIv", "maxIv")}
								{@render minMax("CP", "minCp", "maxCp")}
								{@render minMax("Level", "minLevel", "maxLevel")}
								{@render minMax("Attack IV", "minAtk", "maxAtk")}
								{@render minMax("Defense IV", "minDef", "maxDef")}
								{@render minMax("Stamina IV", "minSta", "maxSta")}
								{@render minMax("Size (1-5, XXS-XXL)", "minSize", "maxSize")}
							</div>

							<label class="flex flex-col gap-1 text-sm">
								<span class="text-zinc-500 dark:text-zinc-400">Gender</span>
								<select
									value={subFilters.gender ?? ""}
									onchange={(e) =>
										(subFilters.gender = e.currentTarget.value
											? (Number(e.currentTarget.value) as 1 | 2 | 3)
											: undefined)}
									class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
								>
									<option value="">Any gender</option>
									<option value="1">Male</option>
									<option value="2">Female</option>
									<option value="3">Genderless</option>
								</select>
							</label>

							<label class="flex flex-col gap-1 text-sm">
								<span class="text-zinc-500 dark:text-zinc-400">Area (optional)</span>
								<AreaPicker
									ownAreas={scanAreasState.areas}
									kojiAreas={kojiGeofences}
									notificationAreas={notificationAreasState.areas}
									bind:areaSource={subFilters.areaSource}
									bind:areaId={subFilters.areaId}
								/>
							</label>

							<label class="flex flex-col gap-1 text-sm">
								<span class="text-zinc-500 dark:text-zinc-400">Template</span>
								<select
									value={subTemplateId ?? ""}
									onchange={(e) =>
										(subTemplateId = e.currentTarget.value ? Number(e.currentTarget.value) : null)}
									class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
								>
									<option value="">Default template</option>
									{#each notifState.templates as t (t.id)}
										<option value={t.id}>{t.name}</option>
									{/each}
								</select>
							</label>

							<label class="flex items-center gap-2 text-sm">
								<input type="checkbox" bind:checked={subEnabled} />
								<span class="text-zinc-500 dark:text-zinc-400">Enabled</span>
							</label>

							<div class="flex flex-col gap-1.5">
								<span class="text-xs text-zinc-500 dark:text-zinc-400">When active</span>
								<div class="flex gap-1.5">
									<button
										type="button"
										class="flex-1 rounded border px-3 py-1.5 text-sm {subMode === 'manual'
											? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
											: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
										onclick={() => (subMode = "manual")}
									>
										Always (while enabled)
									</button>
									<button
										type="button"
										class="flex-1 rounded border px-3 py-1.5 text-sm {subMode === 'scheduled'
											? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
											: 'border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300'}"
										onclick={() => (subMode = "scheduled")}
									>
										On a schedule
									</button>
								</div>
							</div>

							{#if subMode === "scheduled"}
								<NotificationScheduleEditor bind:schedule={subSchedule} />
							{/if}

							<div class="flex gap-2">
								<button
									class="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={saveSubscription}
									disabled={savingSubscription}
								>
									{savingSubscription ? "Saving…" : "Save subscription"}
								</button>
								<button
									class="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
									onclick={cancelSubscriptionEdit}
								>
									Cancel
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>

				<div class="flex flex-col gap-2">
					{#if notifState.subscriptions.length === 0 && subscriptionMode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No subscriptions yet — create your first one.
						</p>
					{/if}
					{#each notifState.subscriptions as sub (sub.id)}
						<div
							class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
						>
							<div class="min-w-0">
								<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{sub.name}</p>
								<p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
									{filterSummary(sub.filters)} · {templateName_(sub.templateId)}
									{#if sub.mode === "scheduled"}
										· Scheduled
									{/if}
								</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									class="text-xs rounded border px-2 py-1 {sub.enabled
										? 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
										: 'border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400'}"
									onclick={() => toggleEnabled(sub)}
								>
									{sub.enabled ? "Enabled" : "Disabled"}
								</button>
								<button
									class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
									title="Edit"
									onclick={() => startEditSubscription(sub)}><Pencil size={16} /></button
								>
								<button
									class="text-red-500 hover:text-red-700"
									title="Delete"
									onclick={() => deleteSubscriptionById(sub.id)}><Trash2 size={16} /></button
								>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Templates -->
			<section class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Templates</h2>
					{#if templateMode === "idle"}
						<button
							class="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white"
							onclick={startCreateTemplate}
						>
							<Plus size={14} /> New template
						</button>
					{/if}
				</div>

				<Dialog.Root
					open={templateMode !== "idle"}
					onOpenChange={(open) => {
						if (!open) cancelTemplateEdit();
					}}
				>
					<Dialog.Portal>
						<Dialog.Overlay
							class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[1px] backdrop-brightness-95 transition-all"
						/>
						<Dialog.Content
							class="bg-background rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-hidden fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 border max-w-[calc(100%-1.5rem)] w-full sm:w-[min(90vw,64rem)] max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-3"
							trapFocus={false}
						>
							<Dialog.Title
								class="flex items-center justify-between text-lg font-semibold text-zinc-900 dark:text-zinc-100"
							>
								{templateMode === "creating" ? "New template" : "Edit template"}
								<CloseButton onclick={cancelTemplateEdit} />
							</Dialog.Title>

							<input
								type="text"
								bind:value={templateName}
								placeholder="Template name"
								maxlength={64}
								class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
							/>

							<TemplateEditor bind:embed={templateEmbed} />

							<div class="flex gap-2">
								<button
									class="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={saveTemplate}
									disabled={savingTemplate}
								>
									{savingTemplate ? "Saving…" : "Save template"}
								</button>
								<button
									class="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
									onclick={cancelTemplateEdit}
								>
									Cancel
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>

				<div class="flex flex-col gap-2">
					{#if notifState.templates.length === 0 && templateMode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No templates yet — subscriptions without one use a plain default embed.
						</p>
					{/if}
					{#each notifState.templates as template (template.id)}
						<div
							class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
						>
							<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{template.name}</p>
							<div class="flex items-center gap-2 shrink-0">
								<button
									class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
									title="Edit"
									onclick={() => startEditTemplate(template)}><Pencil size={16} /></button
								>
								<button
									class="text-red-500 hover:text-red-700"
									title="Delete"
									onclick={() => deleteTemplateById(template.id)}><Trash2 size={16} /></button
								>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Notification Areas -->
			<section class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notification Areas</h2>
					{#if areaMode === "idle"}
						<button
							class="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white"
							onclick={startCreateArea}
						>
							<Plus size={14} /> New area
						</button>
					{/if}
				</div>

				<Dialog.Root
					open={areaMode !== "idle"}
					onOpenChange={(open) => {
						if (!open) cancelAreaEdit();
					}}
				>
					<Dialog.Portal>
						<Dialog.Overlay
							class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[1px] backdrop-brightness-95 transition-all"
						/>
						<Dialog.Content
							class="bg-background rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-hidden fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 border max-w-[calc(100%-1.5rem)] w-full sm:w-[min(90vw,64rem)] max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-3"
							trapFocus={false}
						>
							<Dialog.Title
								class="flex items-center justify-between text-lg font-semibold text-zinc-900 dark:text-zinc-100"
							>
								{areaMode === "creating" ? "New notification area" : "Edit notification area"}
								<CloseButton onclick={cancelAreaEdit} />
							</Dialog.Title>

							<input
								type="text"
								bind:value={areaName}
								placeholder="Area name"
								maxlength={64}
								class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
							/>

							<div
								class="relative h-[50vh] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700"
							>
								<NotificationAreaMap
									bind:this={areaMapComponent}
									areas={notificationAreasState.areas}
									onDrawFinish={(polygon) => (areaDrawnPolygon = polygon)}
									onAreaChange={(sqM) => (liveAreaSqM = sqM)}
									onReady={onAreaMapReady}
								/>
								<div
									class="absolute top-3 left-1/2 -translate-x-1/2 rounded-lg bg-zinc-900/90 text-zinc-100 px-4 py-2 text-sm flex items-center gap-3"
								>
									<span>
										{areaMode === "creating"
											? "Click the map to add points, click the first point to finish"
											: "Click the shape, then drag points to reshape"}
									</span>
									{#if liveAreaKm2 !== null}
										<span class="font-medium tabular-nums text-emerald-500">{liveAreaKm2} km²</span>
									{/if}
								</div>
							</div>

							<div class="flex gap-2">
								<button
									class="flex-1 rounded bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
									onclick={saveArea}
									disabled={!canSaveArea}
								>
									{savingArea ? "Saving…" : "Save area"}
								</button>
								<button
									class="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300"
									onclick={cancelAreaEdit}
								>
									Cancel
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>

				<div class="flex flex-col gap-2">
					{#if notificationAreasState.areas.length === 0 && areaMode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No notification areas yet — create your first one.
						</p>
					{/if}
					{#each notificationAreasState.areas as area (area.id)}
						<div
							class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
						>
							<div class="min-w-0">
								<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{area.name}</p>
								<p class="text-xs text-zinc-500 dark:text-zinc-400">
									{(area.areaSqM / 1_000_000).toFixed(2)} km²
								</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
									title="Edit"
									onclick={() => startEditArea(area)}><Pencil size={16} /></button
								>
								<button
									class="text-red-500 hover:text-red-700"
									title="Delete"
									onclick={() => deleteAreaById(area.id)}><Trash2 size={16} /></button
								>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Backup & Restore -->
			<section class="flex flex-col gap-3">
				<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Backup & Restore</h2>
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					Export your areas, templates, and subscriptions to a file, or restore from one. Existing
					items are never overwritten — name collisions on import are skipped.
				</p>

				<div class="flex flex-wrap gap-2">
					<button
						class="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={exportingSection !== null}
						onclick={() => runExport("areas")}
					>
						<Download size={14} />
						{exportingSection === "areas" ? "Exporting…" : "Export areas"}
					</button>
					<button
						class="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={exportingSection !== null}
						onclick={() => runExport("templates")}
					>
						<Download size={14} />
						{exportingSection === "templates" ? "Exporting…" : "Export templates"}
					</button>
					<button
						class="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={exportingSection !== null}
						onclick={() => runExport("subscriptions")}
					>
						<Download size={14} />
						{exportingSection === "subscriptions" ? "Exporting…" : "Export subscriptions"}
					</button>
					<button
						class="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={exportingSection !== null}
						onclick={() => runExport("all")}
					>
						<Download size={14} />
						{exportingSection === "all" ? "Exporting…" : "Export everything"}
					</button>
				</div>

				<div class="flex items-center gap-2">
					<input
						bind:this={importFileInput}
						type="file"
						accept="application/json,.json"
						disabled={importing}
						onchange={onImportFileChosen}
						class="text-sm text-zinc-600 dark:text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 dark:file:bg-zinc-700 file:px-3 file:py-1.5 file:text-sm file:text-zinc-700 dark:file:text-zinc-200"
					/>
					{#if importing}
						<Loader2 size={16} class="animate-spin text-zinc-500" />
					{:else}
						<Upload size={14} class="text-zinc-500" />
					{/if}
				</div>

				{#if importSummary}
					<div
						class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-sm text-zinc-700 dark:text-zinc-200"
					>
						<p class="font-medium">Import complete</p>
						<ul class="mt-1 list-inside list-disc">
							<li>
								Areas: {importSummary.areas.created} created, {importSummary.areas.skipped} skipped (already
								existed)
							</li>
							<li>
								Templates: {importSummary.templates.created} created, {importSummary.templates
									.skipped} skipped (already existed)
							</li>
							<li>
								Subscriptions: {importSummary.subscriptions.created} created, {importSummary
									.subscriptions.skipped} skipped (already existed){#if importSummary.subscriptions.unresolvedRefs > 0},
									{importSummary.subscriptions.unresolvedRefs} with an area/template reference that couldn't
									be resolved{/if}
							</li>
						</ul>
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>
