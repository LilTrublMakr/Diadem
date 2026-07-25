<script lang="ts">
	import TemplateEditor from "@/components/custom/notifications/TemplateEditor.svelte";
	import NotificationScheduleEditor from "@/components/custom/notifications/NotificationScheduleEditor.svelte";
	import NotificationAreaMap from "@/components/custom/notifications/NotificationAreaMap.svelte";
	import AreaPicker from "@/components/custom/notifications/AreaPicker.svelte";
	import PokemonPicker from "@/components/custom/notifications/PokemonPicker.svelte";
	import PokemonFormPicker from "@/components/custom/notifications/PokemonFormPicker.svelte";
	import RaidFilterEditor from "@/components/custom/notifications/RaidFilterEditor.svelte";
	import MaxBattleFilterEditor from "@/components/custom/notifications/MaxBattleFilterEditor.svelte";
	import QuestFilterEditor from "@/components/custom/notifications/QuestFilterEditor.svelte";
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
		AnySubscriptionFilters,
		EmbedTemplate,
		MaxBattleSubscriptionFilters,
		NotificationSubscriptionDto,
		NotificationTemplateDto,
		NotificationType,
		PokemonSubscriptionFilters,
		QuestSubscriptionFilters,
		RaidSubscriptionFilters
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
		exportSingleNotificationItem,
		importNotificationsBackup,
		isBackupApiError,
		type BackupSection
	} from "@/lib/features/notifications/backupState";
	import type { BackupImportSummary } from "@/lib/features/notifications/backupTypes";
	import { isScheduleActiveNow } from "@/lib/features/notifications/scheduleActive";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";
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
			content: "{{pokemonName}}",
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

	function defaultRaidEmbed(): EmbedTemplate {
		return {
			content: "{{#if isEgg}}Level {{level}} egg{{else}}{{pokemonName}} raid{{/if}} at {{gymName}}",
			title: "{{#if isEgg}}Level {{level}} Egg{{else}}{{pokemonName}} Raid{{/if}}",
			description: "{{gymName}}",
			color: "#5865F2",
			thumbnailUrl: "{{{pokemonImageUrl}}}",
			imageUrl: "",
			footerText:
				"{{#if isEgg}}Hatches at {{hatchTime}}{{else}}Despawns at {{raidEndTime}}{{/if}} ({{minutesLeft}}m left)",
			url: "{{{googleMapsUrl}}}",
			fields: []
		};
	}

	function defaultMaxBattleEmbed(): EmbedTemplate {
		return {
			content: "{{#if gmax}}Gigantamax {{/if}}{{pokemonName}} battle at {{stationName}}",
			title: "{{#if gmax}}Gigantamax {{/if}}{{pokemonName}} Max Battle",
			description: "{{stationName}} — Level {{level}}",
			color: "#5865F2",
			thumbnailUrl: "{{{pokemonImageUrl}}}",
			imageUrl: "",
			footerText: "Battle ends at {{battleEndTime}} ({{minutesLeft}}m left)",
			url: "{{{googleMapsUrl}}}",
			fields: []
		};
	}

	function defaultQuestEmbed(): EmbedTemplate {
		return {
			content: "{{questTitle}} at {{pokestopName}}",
			title: "Field Research",
			description: "{{pokestopName}}\nReward: {{rewardString}}",
			color: "#5865F2",
			thumbnailUrl: "{{{pokemonImageUrl}}}",
			imageUrl: "",
			footerText: "{{#if withAr}}AR Quest{{else}}Standard Quest{{/if}}",
			url: "{{{googleMapsUrl}}}",
			fields: []
		};
	}

	function defaultFilters(): PokemonSubscriptionFilters {
		return { pokemonIds: [] };
	}

	function defaultRaidFilters(): RaidSubscriptionFilters {
		return {};
	}

	function defaultMaxBattleFilters(): MaxBattleSubscriptionFilters {
		return {};
	}

	function defaultQuestFilters(): QuestSubscriptionFilters {
		return {};
	}

	const CATEGORY_LABELS: Record<NotificationType, string> = {
		pokemon: "Pokemon",
		raid: "Raid",
		maxbattle: "Max Battle",
		quest: "Quest"
	};

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

	// Shared between Subscriptions and Templates sections — switching category in one
	// switches the other too.
	let categoryFilter = $state<NotificationType>("pokemon");

	// --- Template editing ---
	let visibleTemplates = $derived(notifState.templates.filter((t) => t.type === categoryFilter));

	let templateMode = $state<"idle" | "creating" | number>("idle");
	let templateType = $state<NotificationType>("pokemon");
	let templateName = $state("");
	let templateEmbed = $state<EmbedTemplate>(defaultEmbed());
	let savingTemplate = $state(false);

	function defaultEmbedForType(type: NotificationType): EmbedTemplate {
		if (type === "raid") return defaultRaidEmbed();
		if (type === "maxbattle") return defaultMaxBattleEmbed();
		if (type === "quest") return defaultQuestEmbed();
		return defaultEmbed();
	}

	function startCreateTemplate() {
		templateMode = "creating";
		templateType = categoryFilter;
		templateName = "";
		templateEmbed = defaultEmbedForType(templateType);
	}

	function startEditTemplate(template: NotificationTemplateDto) {
		templateMode = template.id;
		templateType = template.type;
		templateName = template.name;
		// `fields`/`content` predate existing saved templates — default them if the saved row lacks them
		templateEmbed = {
			...template.embed,
			content: template.embed.content ?? "",
			fields: template.embed.fields ?? []
		};
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
					? await createTemplate({ name, type: templateType, embed: templateEmbed })
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
	// "New subscription" always creates one in the currently-selected tab (categoryFilter,
	// shared with the Templates section above).
	let visibleSubscriptions = $derived(
		notifState.subscriptions.filter((s) => s.type === categoryFilter)
	);

	let subscriptionMode = $state<"idle" | "creating" | number>("idle");
	let subType = $state<NotificationType>("pokemon");
	let subName = $state("");
	let subEnabled = $state(true);
	let subTemplateId = $state<number | null>(null);
	let subFilters = $state<PokemonSubscriptionFilters>(defaultFilters());
	let raidFilters = $state<RaidSubscriptionFilters>(defaultRaidFilters());
	let maxBattleFilters = $state<MaxBattleSubscriptionFilters>(defaultMaxBattleFilters());
	let questFilters = $state<QuestSubscriptionFilters>(defaultQuestFilters());
	let subMode = $state<SubscriptionMode>("manual");
	let subSchedule = $state<NotificationSchedule>(defaultSchedule());
	let savingSubscription = $state(false);

	function startCreateSubscription() {
		subscriptionMode = "creating";
		subType = categoryFilter;
		subName = "";
		subEnabled = true;
		subTemplateId = null;
		subFilters = defaultFilters();
		raidFilters = defaultRaidFilters();
		maxBattleFilters = defaultMaxBattleFilters();
		questFilters = defaultQuestFilters();
		subMode = "manual";
		subSchedule = defaultSchedule();
	}

	function startEditSubscription(sub: NotificationSubscriptionDto) {
		subscriptionMode = sub.id;
		subType = sub.type;
		subName = sub.name;
		subEnabled = sub.enabled;
		subTemplateId = sub.templateId;
		if (sub.type === "raid") {
			raidFilters = { ...(sub.filters as RaidSubscriptionFilters) };
		} else if (sub.type === "maxbattle") {
			maxBattleFilters = { ...(sub.filters as MaxBattleSubscriptionFilters) };
		} else if (sub.type === "quest") {
			questFilters = { ...(sub.filters as QuestSubscriptionFilters) };
		} else {
			const filters = sub.filters as PokemonSubscriptionFilters;
			subFilters = { ...filters, pokemonIds: filters.pokemonIds ?? [] };
		}
		subMode = sub.mode;
		subSchedule = sub.schedule ? JSON.parse(JSON.stringify(sub.schedule)) : defaultSchedule();
	}

	function cancelSubscriptionEdit() {
		subscriptionMode = "idle";
	}

	function togglePvpLeague(league: "little" | "great" | "ultra", checked: boolean) {
		const leagues = new Set(subFilters.pvpLeagues ?? []);
		if (checked) leagues.add(league);
		else leagues.delete(league);
		subFilters.pvpLeagues = leagues.size > 0 ? [...leagues] : undefined;
		if (leagues.size > 0) subFilters.pvpMaxRank ??= 25;
		else subFilters.pvpMaxRank = undefined;
	}

	function activeFilters(): AnySubscriptionFilters {
		if (subType === "raid") return raidFilters;
		if (subType === "maxbattle") return maxBattleFilters;
		if (subType === "quest") return questFilters;
		return subFilters;
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
				type: subType,
				enabled: subEnabled,
				templateId: subTemplateId,
				filters: activeFilters(),
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

	async function exportSingleItem(kind: "area" | "template" | "subscription", id: number) {
		const result = await exportSingleNotificationItem(kind, id);
		if (result) showError(result.message);
	}

	// Ticks every 30s so a scheduled subscription's Active/Inactive badge updates live
	// as its windows start/end, without needing a page reload.
	let nowTick = $state(Date.now());
	$effect(() => {
		const interval = setInterval(() => (nowTick = Date.now()), 30_000);
		return () => clearInterval(interval);
	});

	// Mirrors the server's own isSubscriptionActiveNow (golbat/+server.ts) — a disabled
	// subscription is always inactive; a scheduled one is active only inside its windows.
	function isSubActive(sub: NotificationSubscriptionDto): boolean {
		if (!sub.enabled) return false;
		if (sub.mode !== "scheduled") return true;
		return !!sub.schedule && isScheduleActiveNow(sub.schedule, new Date(nowTick));
	}

	function templateName_(id: number | null): string {
		if (id === null) return "Default template";
		return notifState.templates.find((t) => t.id === id)?.name ?? "Unknown template";
	}

	function areaLabel(filters: AnySubscriptionFilters): string | null {
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

	function filterSummary(type: NotificationType, filters: AnySubscriptionFilters): string {
		const parts: string[] = [];

		if (type === "raid") {
			const f = filters as RaidSubscriptionFilters;
			if (!f.bossPokemonIds || f.bossPokemonIds.length === 0) {
				parts.push("Any boss");
			} else if (f.bossPokemonIds.length === 1) {
				parts.push(`Boss #${f.bossPokemonIds[0]}`);
			} else {
				parts.push(`${f.bossPokemonIds.length} bosses`);
			}
			if (f.minLevel !== undefined || f.maxLevel !== undefined) {
				parts.push(`Level ${f.minLevel ?? 1}–${f.maxLevel ?? 6}`);
			}
			if (f.teams && f.teams.length > 0) parts.push(`Team ${f.teams.join("/")}`);
			if (f.exRaidOnly) parts.push("EX only");
			if (f.notifyOnEgg === false) parts.push("bosses only");
			if (f.notifyOnBoss === false) parts.push("eggs only");
		} else if (type === "maxbattle") {
			const f = filters as MaxBattleSubscriptionFilters;
			if (!f.bossPokemonIds || f.bossPokemonIds.length === 0) {
				parts.push("Any boss");
			} else if (f.bossPokemonIds.length === 1) {
				parts.push(`Boss #${f.bossPokemonIds[0]}`);
			} else {
				parts.push(`${f.bossPokemonIds.length} bosses`);
			}
			if (f.minLevel !== undefined || f.maxLevel !== undefined) {
				parts.push(`Level ${f.minLevel ?? 1}–${f.maxLevel ?? 8}`);
			}
			if (f.gmaxOnly) parts.push("Gigantamax only");
		} else if (type === "quest") {
			const f = filters as QuestSubscriptionFilters;
			if (!f.rewardType) {
				parts.push("Any reward");
			} else {
				parts.push(f.rewardType);
				if (
					f.rewardType === "pokemon" ||
					f.rewardType === "candy" ||
					f.rewardType === "megaEnergy"
				) {
					if (f.rewardPokemonIds && f.rewardPokemonIds.length > 0) {
						parts.push(
							f.rewardPokemonIds.length === 1
								? `#${f.rewardPokemonIds[0]}`
								: `${f.rewardPokemonIds.length} species`
						);
					}
				}
				if (f.rewardType === "item" && f.rewardItemIds && f.rewardItemIds.length > 0) {
					parts.push(
						f.rewardItemIds.length === 1
							? `item #${f.rewardItemIds[0]}`
							: `${f.rewardItemIds.length} items`
					);
				}
				if (f.minAmount !== undefined) parts.push(`≥${f.minAmount}`);
				if (f.shinyOnly) parts.push("shiny-possible only");
			}
			if (f.withAr === true) parts.push("AR only");
			if (f.withAr === false) parts.push("standard only");
		} else {
			const f = filters as PokemonSubscriptionFilters;
			if (!f.pokemonIds || f.pokemonIds.length === 0) {
				parts.push("Any species");
			} else if (f.pokemonIds.length === 1) {
				parts.push(`Pokemon #${f.pokemonIds[0]}`);
			} else {
				parts.push(`${f.pokemonIds.length} species`);
			}
			if (f.minIv !== undefined || f.maxIv !== undefined) {
				parts.push(`IV ${f.minIv ?? 0}–${f.maxIv ?? 100}%`);
			}
			if (f.minCp !== undefined || f.maxCp !== undefined) {
				parts.push(`CP ${f.minCp ?? 0}–${f.maxCp ?? "∞"}`);
			}
			if (f.pvpLeagues && f.pvpLeagues.length > 0)
				parts.push(`${f.pvpLeagues.join("/")} rank ≤ ${f.pvpMaxRank ?? "?"}`);
		}

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

{#snippet categoryTabs(selected: NotificationType, onSelect: (t: NotificationType) => void)}
	<div class="flex gap-1">
		{#each Object.entries(CATEGORY_LABELS) as [value, label] (value)}
			<button
				type="button"
				class="rounded px-2.5 py-1 text-xs font-medium {selected === value
					? 'bg-blue-600 text-white'
					: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}"
				onclick={() => onSelect(value as NotificationType)}
			>
				{label}
			</button>
		{/each}
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
							<Plus size={14} /> New {CATEGORY_LABELS[categoryFilter]} subscription
						</button>
					{/if}
				</div>

				{@render categoryTabs(categoryFilter, (t) => (categoryFilter = t))}

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
								{subscriptionMode === "creating" ? "New" : "Edit"}
								{CATEGORY_LABELS[subType]} subscription
								<CloseButton onclick={cancelSubscriptionEdit} />
							</Dialog.Title>

							<input
								type="text"
								bind:value={subName}
								placeholder="Subscription name"
								maxlength={64}
								class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
							/>

							{#if subType === "raid"}
								<RaidFilterEditor
									bind:filters={raidFilters}
									ownAreas={scanAreasState.areas}
									kojiAreas={kojiGeofences}
									notificationAreas={notificationAreasState.areas}
								/>
							{:else if subType === "maxbattle"}
								<MaxBattleFilterEditor
									bind:filters={maxBattleFilters}
									ownAreas={scanAreasState.areas}
									kojiAreas={kojiGeofences}
									notificationAreas={notificationAreasState.areas}
								/>
							{:else if subType === "quest"}
								<QuestFilterEditor
									bind:filters={questFilters}
									ownAreas={scanAreasState.areas}
									kojiAreas={kojiGeofences}
									notificationAreas={notificationAreasState.areas}
								/>
							{:else}
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
									<span class="text-zinc-500 dark:text-zinc-400">PVP League (optional)</span>
									<div class="flex items-center gap-3 flex-wrap">
										{#each [["little", "Little Cup"], ["great", "Great League"], ["ultra", "Ultra League"]] as [value, label] (value)}
											<label class="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
												<input
													type="checkbox"
													checked={subFilters.pvpLeagues?.includes(
														value as "little" | "great" | "ultra"
													) ?? false}
													onchange={(e) =>
														togglePvpLeague(
															value as "little" | "great" | "ultra",
															e.currentTarget.checked
														)}
												/>
												{label}
											</label>
										{/each}
									</div>
									{#if subFilters.pvpLeagues && subFilters.pvpLeagues.length > 0}
										<div class="flex items-center gap-2 mt-1">
											<input
												type="number"
												min="1"
												placeholder="Max rank"
												value={subFilters.pvpMaxRank ?? 25}
												oninput={(e) => {
													const v = e.currentTarget.value;
													subFilters.pvpMaxRank = v ? Number(v) : undefined;
												}}
												class="w-24 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
											/>
											<span class="text-xs text-zinc-400 shrink-0"
												>rank or better in any checked league</span
											>
										</div>
									{/if}
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
							{/if}

							<label class="flex flex-col gap-1 text-sm">
								<span class="text-zinc-500 dark:text-zinc-400">Template</span>
								<select
									value={subTemplateId ?? ""}
									onchange={(e) =>
										(subTemplateId = e.currentTarget.value ? Number(e.currentTarget.value) : null)}
									class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
								>
									<option value="">Default template</option>
									{#each notifState.templates.filter((t) => t.type === subType) as t (t.id)}
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
					{#if visibleSubscriptions.length === 0 && subscriptionMode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No {CATEGORY_LABELS[categoryFilter]} subscriptions yet — create your first one.
						</p>
					{/if}
					{#each visibleSubscriptions as sub (sub.id)}
						<div
							class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
						>
							<div class="min-w-0">
								<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{sub.name}</p>
								<p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
									{filterSummary(sub.type, sub.filters)} · {templateName_(sub.templateId)}
									{#if sub.mode === "scheduled"}
										· Scheduled
									{/if}
								</p>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<span
									class="text-xs rounded border px-2 py-1 {isSubActive(sub)
										? 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
										: 'border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400'}"
								>
									{isSubActive(sub) ? "Active" : "Inactive"}
								</span>
								<Switch
									checked={sub.enabled}
									onCheckedChange={() => toggleEnabled(sub)}
									class="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-600"
								/>
								<button
									class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
									title="Export"
									onclick={() => exportSingleItem("subscription", sub.id)}
									><Download size={16} /></button
								>
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
							<Plus size={14} /> New {CATEGORY_LABELS[categoryFilter]} template
						</button>
					{/if}
				</div>

				{@render categoryTabs(categoryFilter, (t) => (categoryFilter = t))}

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
								{templateMode === "creating" ? "New" : "Edit"}
								{CATEGORY_LABELS[templateType]} template
								<CloseButton onclick={cancelTemplateEdit} />
							</Dialog.Title>

							<input
								type="text"
								bind:value={templateName}
								placeholder="Template name"
								maxlength={64}
								class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
							/>

							<TemplateEditor type={templateType} bind:embed={templateEmbed} />

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
					{#if visibleTemplates.length === 0 && templateMode === "idle"}
						<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">
							No {CATEGORY_LABELS[categoryFilter]} templates yet — subscriptions without one use a plain
							default embed.
						</p>
					{/if}
					{#each visibleTemplates as template (template.id)}
						<div
							class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
						>
							<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{template.name}</p>
							<div class="flex items-center gap-2 shrink-0">
								<button
									class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
									title="Export"
									onclick={() => exportSingleItem("template", template.id)}
									><Download size={16} /></button
								>
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
									title="Export"
									onclick={() => exportSingleItem("area", area.id)}><Download size={16} /></button
								>
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
