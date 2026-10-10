<script lang="ts">
	import TemplateEditor from "@/components/custom/notifications/TemplateEditor.svelte";
	import NotificationScheduleEditor from "@/components/custom/notifications/NotificationScheduleEditor.svelte";
	import PokemonFilterEditor from "@/components/custom/notifications/PokemonFilterEditor.svelte";
	import RaidFilterEditor from "@/components/custom/notifications/RaidFilterEditor.svelte";
	import MaxBattleFilterEditor from "@/components/custom/notifications/MaxBattleFilterEditor.svelte";
	import QuestFilterEditor from "@/components/custom/notifications/QuestFilterEditor.svelte";
	import InvasionFilterEditor from "@/components/custom/notifications/InvasionFilterEditor.svelte";
	import LureFilterEditor from "@/components/custom/notifications/LureFilterEditor.svelte";
	import GymFilterEditor from "@/components/custom/notifications/GymFilterEditor.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";
	import { Dialog } from "bits-ui";
	import { Loader2, Pencil, Plus, Trash2 } from "@lucide/svelte";
	import type {
		NotificationSchedule,
		SubscriptionMode
	} from "@/lib/features/notifications/scheduleTypes";
	import {
		getNotificationsState,
		loadNotifications
	} from "@/lib/features/notifications/notificationsState.svelte";
	import {
		createChannelSubscription,
		getChannelNotificationsState,
		isChannelApiError,
		loadManageableGuilds,
		patchChannelSubscription,
		removeChannelSubscription,
		selectGuild
	} from "@/lib/features/notifications/channelNotificationsState.svelte";
	import { getScanAreasState, loadScanAreas } from "@/lib/features/scanAreas/scanAreasState.svelte";
	import { getKojiGeofences, loadKojiGeofences, type KojiFeatures } from "@/lib/features/koji";
	import {
		getNotificationAreasState,
		loadNotificationAreas
	} from "@/lib/features/notifications/notificationAreasState.svelte";
	import type {
		AnySubscriptionFilters,
		GymSubscriptionFilters,
		InvasionSubscriptionFilters,
		LureSubscriptionFilters,
		MaxBattleSubscriptionFilters,
		NotificationChannelSubscriptionDto,
		NotificationType,
		PokemonSubscriptionFilters,
		QuestSubscriptionFilters,
		RaidSubscriptionFilters
	} from "@/lib/features/notifications/types";

	const notifState = getNotificationsState();
	const channelState = getChannelNotificationsState();
	const scanAreasState = getScanAreasState();
	const notificationAreasState = getNotificationAreasState();
	let kojiGeofences = $state<KojiFeatures>([]);

	$effect(() => {
		void loadManageableGuilds();
		void loadNotifications(); // only its `templates` list is used here
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
		if (channelState.error) showError(channelState.error);
	});

	const CATEGORY_LABELS: Record<NotificationType, string> = {
		pokemon: "Pokemon",
		raid: "Raid",
		maxbattle: "Max Battle",
		quest: "Quest",
		invasion: "Invasion",
		lure: "Lure",
		gym: "Gym"
	};

	let categoryFilter = $state<NotificationType>("pokemon");
	let visibleSubscriptions = $derived(
		channelState.subscriptions.filter((s) => s.type === categoryFilter)
	);

	function defaultFiltersForType(type: NotificationType): AnySubscriptionFilters {
		if (type === "pokemon") return { pokemonIds: [] } satisfies PokemonSubscriptionFilters;
		return {};
	}

	const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	function defaultSchedule(): NotificationSchedule {
		return { tz: browserTz, weekly: [], dated: [] };
	}

	let subscriptionMode = $state<"idle" | "creating" | number>("idle");
	let subType = $state<NotificationType>("pokemon");
	let subName = $state("");
	let subChannelId = $state("");
	let subEnabled = $state(true);
	let subTemplateId = $state<number | null>(null);
	let subFilters = $state<AnySubscriptionFilters>(defaultFiltersForType("pokemon"));
	let subMode = $state<SubscriptionMode>("manual");
	let subSchedule = $state<NotificationSchedule>(defaultSchedule());
	let savingSubscription = $state(false);

	function startCreateSubscription() {
		subscriptionMode = "creating";
		subType = categoryFilter;
		subName = "";
		subChannelId = channelState.channels[0]?.id ?? "";
		subEnabled = true;
		subTemplateId = null;
		subFilters = defaultFiltersForType(subType);
		subMode = "manual";
		subSchedule = defaultSchedule();
	}

	function startEditSubscription(sub: NotificationChannelSubscriptionDto) {
		subscriptionMode = sub.id;
		subType = sub.type;
		subName = sub.name;
		subChannelId = sub.channelId;
		subEnabled = sub.enabled;
		subTemplateId = sub.templateId;
		subFilters =
			sub.type === "pokemon"
				? {
						...(sub.filters as PokemonSubscriptionFilters),
						pokemonIds: (sub.filters as PokemonSubscriptionFilters).pokemonIds ?? []
					}
				: { ...sub.filters };
		subMode = sub.mode;
		subSchedule = sub.schedule ? JSON.parse(JSON.stringify(sub.schedule)) : defaultSchedule();
	}

	function cancelSubscriptionEdit() {
		subscriptionMode = "idle";
	}

	async function saveSubscription() {
		const guildId = channelState.selectedGuildId;
		if (!guildId) return;
		const name = subName.trim();
		if (!name) {
			showError("Give the subscription a name first");
			return;
		}
		if (!subChannelId) {
			showError("Pick a channel first");
			return;
		}
		savingSubscription = true;
		try {
			const input = {
				guildId,
				channelId: subChannelId,
				name,
				type: subType,
				enabled: subEnabled,
				templateId: subTemplateId,
				filters: subFilters,
				mode: subMode,
				schedule: subMode === "scheduled" ? { ...subSchedule, tz: browserTz } : null
			};
			const result =
				subscriptionMode === "creating"
					? await createChannelSubscription(input)
					: await patchChannelSubscription(guildId, subscriptionMode as number, input);
			if (isChannelApiError(result)) {
				showError(result.message);
				return;
			}
			subscriptionMode = "idle";
		} finally {
			savingSubscription = false;
		}
	}

	async function deleteSubscriptionById(id: number) {
		const guildId = channelState.selectedGuildId;
		if (!guildId) return;
		const result = await removeChannelSubscription(guildId, id);
		if (result) showError(result.message);
	}

	async function toggleEnabled(sub: NotificationChannelSubscriptionDto) {
		const guildId = channelState.selectedGuildId;
		if (!guildId) return;
		const result = await patchChannelSubscription(guildId, sub.id, { enabled: !sub.enabled });
		if (isChannelApiError(result)) showError(result.message);
	}

	function templateName_(id: number | null): string {
		if (id === null) return "Default template";
		return notifState.templates.find((t) => t.id === id)?.name ?? "Unknown template";
	}

	function channelName(id: string): string {
		return channelState.channels.find((c) => c.id === id)?.name ?? "unknown-channel";
	}
</script>

<svelte:head>
	<title>Channel Notifications — PoGo Map VT</title>
</svelte:head>

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

<div class="max-w-3xl mx-auto p-4 flex flex-col gap-6">
	<div>
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Channel Notifications</h1>
		<p class="text-sm text-zinc-500 dark:text-zinc-400">
			Post matching events directly to a channel in your Discord server, for everyone to see.
		</p>
	</div>

	{#if errorMessage}
		<div
			class="rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-400"
		>
			{errorMessage}
		</div>
	{/if}

	{#if channelState.guildsLoading && !channelState.guildsLoaded}
		<div class="flex items-center justify-center p-16 text-zinc-400">
			<Loader2 size={24} class="animate-spin" />
		</div>
	{:else if channelState.missingScope}
		<div
			class="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-300"
		>
			Your login doesn't have the Discord permission needed to check which servers you admin yet.
			Log out and back in to grant it, then come back here.
		</div>
	{:else if channelState.guilds.length === 0}
		<div
			class="rounded border border-zinc-300 dark:border-zinc-600 p-4 text-sm text-zinc-600 dark:text-zinc-300"
		>
			You don't have "Manage Server" or Administrator permission in any Discord server. Channel
			notifications can only be configured by a server admin.
		</div>
	{:else}
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-zinc-500 dark:text-zinc-400">Server</span>
			<select
				value={channelState.selectedGuildId ?? ""}
				onchange={(e) => selectGuild(e.currentTarget.value || null)}
				class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
			>
				<option value="">Select a server…</option>
				{#each channelState.guilds as guild (guild.id)}
					<option value={guild.id}>{guild.name}</option>
				{/each}
			</select>
		</label>

		{#if channelState.selectedGuildId}
			{#if channelState.channelsLoading}
				<div class="flex items-center justify-center p-8 text-zinc-400">
					<Loader2 size={20} class="animate-spin" />
				</div>
			{:else if channelState.botNotInGuild}
				<div
					class="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-300"
				>
					The bot isn't in this server yet. Invite it with "Send Messages", "Embed Links", and
					"Attach Files" permissions in whichever channels it should post to, then reselect this
					server.
				</div>
			{:else if channelState.channels.length === 0}
				<div
					class="rounded border border-zinc-300 dark:border-zinc-600 p-4 text-sm text-zinc-600 dark:text-zinc-300"
				>
					No postable text channels found in this server.
				</div>
			{:else}
				<div class="flex flex-col gap-6">
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

									<label class="flex flex-col gap-1 text-sm">
										<span class="text-zinc-500 dark:text-zinc-400">Channel</span>
										<select
											bind:value={subChannelId}
											class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
										>
											{#each channelState.channels as channel (channel.id)}
												<option value={channel.id}>#{channel.name}</option>
											{/each}
										</select>
									</label>

									{#if subType === "raid"}
										<RaidFilterEditor
											bind:filters={subFilters as RaidSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else if subType === "maxbattle"}
										<MaxBattleFilterEditor
											bind:filters={subFilters as MaxBattleSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else if subType === "quest"}
										<QuestFilterEditor
											bind:filters={subFilters as QuestSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else if subType === "invasion"}
										<InvasionFilterEditor
											bind:filters={subFilters as InvasionSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else if subType === "lure"}
										<LureFilterEditor
											bind:filters={subFilters as LureSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else if subType === "gym"}
										<GymFilterEditor
											bind:filters={subFilters as GymSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
										/>
									{:else}
										<PokemonFilterEditor
											bind:filters={subFilters as PokemonSubscriptionFilters}
											ownAreas={scanAreasState.areas}
											kojiAreas={kojiGeofences}
											notificationAreas={notificationAreasState.areas}
											showPredictedShiny={false}
										/>
									{/if}

									<label class="flex flex-col gap-1 text-sm">
										<span class="text-zinc-500 dark:text-zinc-400">Template</span>
										<select
											value={subTemplateId ?? ""}
											onchange={(e) =>
												(subTemplateId = e.currentTarget.value
													? Number(e.currentTarget.value)
													: null)}
											class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
										>
											<option value="">Default template</option>
											{#each notifState.templates.filter((t) => t.type === subType) as t (t.id)}
												<option value={t.id}>{t.name}</option>
											{/each}
										</select>
										<span class="text-xs text-zinc-400"
											>Manage templates on the <a
												href="/notifications"
												class="text-indigo-500 hover:underline">personal notifications page</a
											>.</span
										>
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
									No {CATEGORY_LABELS[categoryFilter]} channel subscriptions yet — create your first
									one.
								</p>
							{/if}
							{#each visibleSubscriptions as sub (sub.id)}
								<div
									class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 flex items-center justify-between gap-3"
								>
									<div class="min-w-0">
										<p class="font-medium text-zinc-900 dark:text-zinc-100 truncate">{sub.name}</p>
										<p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
											#{channelName(sub.channelId)} · {templateName_(sub.templateId)}
											{#if sub.mode === "scheduled"}
												· Scheduled
											{/if}
										</p>
									</div>
									<div class="flex items-center gap-2 shrink-0">
										<Switch
											checked={sub.enabled}
											onCheckedChange={() => toggleEnabled(sub)}
											class="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-600"
										/>
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
				</div>
			{/if}
		{/if}
	{/if}
</div>
