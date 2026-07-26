import {
	getNotificationArea,
	getScanArea,
	getTracker,
	getUserDiscordId
} from "@/lib/server/db/internal/repository";
import type { NotificationSubscription } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import { sendDirectMessage } from "@/lib/server/notifications/bot";
import {
	getPokemonSubscriptionCandidates,
	getSubscriptionsByType
} from "@/lib/server/notifications/matchCache";
import { isScheduleActiveNow } from "@/lib/features/notifications/scheduleActive";
import { getKojiAreaById } from "@/lib/server/notifications/kojiAreaCache";
import {
	generatePokemonMapImage,
	generatePokemonSpriteImage
} from "@/lib/server/notifications/mapImage";
import {
	applyTrackedBadges,
	buildGymContext,
	buildInvasionContext,
	buildLureContext,
	buildMaxBattleContext,
	buildPokemonContext,
	buildQuestContext,
	buildRaidContext,
	renderEmbed
} from "@/lib/server/notifications/render";
import { getNotificationTemplate } from "@/lib/server/db/internal/repository";
import type {
	GolbatGymMessage,
	GolbatInvasionMessage,
	GolbatLureMessage,
	GolbatMaxBattleMessage,
	GolbatPokemonMessage,
	GolbatQuestMessage,
	GolbatRaidMessage,
	GolbatWebhookEnvelope
} from "@/lib/server/notifications/golbatTypes";
import type {
	GymSubscriptionFilters,
	GymTemplateContext,
	InvasionSubscriptionFilters,
	InvasionTemplateContext,
	LureSubscriptionFilters,
	LureTemplateContext,
	MaxBattleSubscriptionFilters,
	MaxBattleTemplateContext,
	PokemonSubscriptionFilters,
	PokemonTemplateContext,
	QuestSubscriptionFilters,
	QuestTemplateContext,
	RaidSubscriptionFilters,
	RaidTemplateContext,
	RaidTeam
} from "@/lib/features/notifications/types";
import { getLogger } from "@/lib/utils/logger";
import { booleanPointInPolygon, point } from "@turf/turf";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const log = getLogger("golbatWebhook");

// Golbat re-fires "pokemon" events as more data arrives (seen_type escalates
// nearby_cell -> wild -> encounter etc). Dedupe on encounter_id + a fingerprint
// of the fields templates actually use, so the first (IV-less) fire doesn't
// suppress the later, more complete one. Entries are evicted once the
// pokemon despawns.
const seen = new Map<string, { fingerprint: string; expiresAt: number }>();

function fingerprint(message: GolbatPokemonMessage): string {
	return [
		message.cp,
		message.individual_attack,
		message.individual_defense,
		message.individual_stamina,
		message.pokemon_id
	].join(":");
}

function isDuplicate(message: GolbatPokemonMessage): boolean {
	const now = Date.now();
	// opportunistic cleanup of expired entries
	if (seen.size > 5000) {
		for (const [key, entry] of seen) {
			if (entry.expiresAt < now) seen.delete(key);
		}
	}

	const fp = fingerprint(message);
	const existing = seen.get(message.encounter_id);
	seen.set(message.encounter_id, { fingerprint: fp, expiresAt: message.disappear_time * 1000 });
	return existing?.fingerprint === fp;
}

// Same idea as pokemon's dedup above, keyed on gym instead of encounter. Fingerprinting on
// isEgg+pokemonId+level+end means the egg->boss transition (same raid lifecycle, same gym)
// fires a fresh notification once the boss is known.
const seenRaids = new Map<string, { fingerprint: string; expiresAt: number }>();

function raidFingerprint(message: GolbatRaidMessage): string {
	const isEgg = !message.pokemon_id;
	return [isEgg, message.pokemon_id, message.level, message.end].join(":");
}

function isDuplicateRaid(message: GolbatRaidMessage): boolean {
	const now = Date.now();
	if (seenRaids.size > 5000) {
		for (const [key, entry] of seenRaids) {
			if (entry.expiresAt < now) seenRaids.delete(key);
		}
	}

	const fp = raidFingerprint(message);
	const existing = seenRaids.get(message.gym_id);
	seenRaids.set(message.gym_id, { fingerprint: fp, expiresAt: message.end * 1000 });
	return existing?.fingerprint === fp;
}

// Same idea again, keyed on station instead. Fingerprinting on pokemonId+level+battleEnd
// mirrors PoracleNG's own dedup (station id, battle end, boss pokemon id).
const seenMaxBattles = new Map<string, { fingerprint: string; expiresAt: number }>();

function maxBattleFingerprint(message: GolbatMaxBattleMessage): string {
	return [message.battle_pokemon_id, message.battle_level, message.battle_end].join(":");
}

function isDuplicateMaxBattle(message: GolbatMaxBattleMessage): boolean {
	const now = Date.now();
	if (seenMaxBattles.size > 5000) {
		for (const [key, entry] of seenMaxBattles) {
			if (entry.expiresAt < now) seenMaxBattles.delete(key);
		}
	}

	const fp = maxBattleFingerprint(message);
	const existing = seenMaxBattles.get(message.id);
	seenMaxBattles.set(message.id, { fingerprint: fp, expiresAt: message.battle_end * 1000 });
	return existing?.fingerprint === fp;
}

// Same idea again, keyed on pokestop+AR-flag (a stop can host an AR and a standard quest
// simultaneously — separate objectives/rewards, so they need independent dedup slots rather than
// sharing one like PoracleNG's own single-slot-per-stop CheckQuest does). Fingerprinting on the
// reward list means a reward change (Niantic sometimes swaps quest rewards) fires a fresh alert.
const seenQuests = new Map<string, { fingerprint: string; expiresAt: number }>();

function questFingerprint(message: GolbatQuestMessage): string {
	return message.rewards
		.map((r) => {
			const info = r.info;
			const p = info.pokemon_id != null ? `p${info.pokemon_id}` : "";
			const i = info.item_id != null ? `i${info.item_id}` : "";
			const a = info.amount != null ? `a${info.amount}` : "";
			return `${r.type}:${p}${i}${a}`;
		})
		.join(";");
}

function isDuplicateQuest(message: GolbatQuestMessage): boolean {
	const now = Date.now();
	if (seenQuests.size > 5000) {
		for (const [key, entry] of seenQuests) {
			if (entry.expiresAt < now) seenQuests.delete(key);
		}
	}

	const key = `${message.pokestop_id}:${message.with_ar ? "ar" : "std"}`;
	const fp = questFingerprint(message);
	const existing = seenQuests.get(key);
	// Quests carry no wire-level expiry (they reset once daily) — a fixed 24h TTL is plenty.
	seenQuests.set(key, { fingerprint: fp, expiresAt: now + 24 * 60 * 60 * 1000 });
	return existing?.fingerprint === fp;
}

// Keyed on pokestop alone (unlike quest, only one invasion can be active on a stop at once).
// Fingerprinting on expiration+character+displayType+confirmed means an unconfirmed->confirmed
// reveal (Niantic later confirms the specific grunt) fires a fresh notification.
const seenInvasions = new Map<string, { fingerprint: string; expiresAt: number }>();

function invasionFingerprint(message: GolbatInvasionMessage): string {
	return [
		message.incident_expiration,
		message.incident_grunt_type ?? message.grunt_type ?? 0,
		message.incident_display_type ?? message.display_type ?? 0,
		message.confirmed
	].join(":");
}

function isDuplicateInvasion(message: GolbatInvasionMessage): boolean {
	const now = Date.now();
	if (seenInvasions.size > 5000) {
		for (const [key, entry] of seenInvasions) {
			if (entry.expiresAt < now) seenInvasions.delete(key);
		}
	}

	const fp = invasionFingerprint(message);
	const existing = seenInvasions.get(message.pokestop_id);
	seenInvasions.set(message.pokestop_id, {
		fingerprint: fp,
		expiresAt: message.incident_expiration * 1000
	});
	return existing?.fingerprint === fp;
}

// Keyed on pokestop alone — a lure module is edit-in-place (a new one replaces the old at the
// same stop). Fingerprinting on lureId+expiration means a renewed/changed lure re-notifies.
const seenLures = new Map<string, { fingerprint: string; expiresAt: number }>();

function isDuplicateLure(message: GolbatLureMessage): boolean {
	const now = Date.now();
	if (seenLures.size > 5000) {
		for (const [key, entry] of seenLures) {
			if (entry.expiresAt < now) seenLures.delete(key);
		}
	}

	const fp = `${message.lure_id}:${message.lure_expiration}`;
	const existing = seenLures.get(message.pokestop_id);
	seenLures.set(message.pokestop_id, {
		fingerprint: fp,
		expiresAt: message.lure_expiration * 1000
	});
	return existing?.fingerprint === fp;
}

// Gym is the one category with genuine cross-webhook state instead of a stateless
// context-builder — team/slot/battle CHANGES only exist as a delta between successive webhooks
// for the same gym. Mirrors PoracleNG's GymStateTracker, in-memory only (no disk persistence —
// unlike Golbat, this app doesn't already have a cache-directory convention to persist into, and
// losing this cache on a restart just means one cold-start burst of "first sighting" gym updates,
// not a correctness issue).
type GymState = {
	teamId: number;
	slotsAvailable: number;
	inBattle: boolean;
	lastControllerId: number; // most recent non-neutral team, carried through neutral gaps; -1 = never controlled
	lastSeen: number;
	battleCooldownUntil: number;
};

const gymStates = new Map<string, GymState>();

/** Updates gym state and returns the previous state (null on first sighting), the just-written
 * current state, and whether the gym was already inside its 5-minute post-battle cooldown before
 * this webhook. */
function updateGymState(
	gymId: string,
	teamId: number,
	slotsAvailable: number,
	inBattle: boolean,
	now: number
): { old: GymState | null; current: GymState; wasInCooldown: boolean } {
	if (gymStates.size > 5000) {
		const cutoff = now - 24 * 60 * 60 * 1000;
		for (const [key, entry] of gymStates) {
			if (entry.lastSeen < cutoff) gymStates.delete(key);
		}
	}

	const old = gymStates.get(gymId) ?? null;
	const wasInCooldown = !!old && old.battleCooldownUntil > now;
	const lastControllerId = teamId > 0 ? teamId : (old?.lastControllerId ?? -1);

	const current: GymState = {
		teamId,
		slotsAvailable,
		inBattle,
		lastControllerId,
		lastSeen: now,
		battleCooldownUntil: inBattle ? now + 5 * 60 * 1000 : (old?.battleCooldownUntil ?? 0)
	};
	gymStates.set(gymId, current);

	return { old, current, wasInCooldown };
}

function matchesFilters(context: PokemonTemplateContext, filters: PokemonSubscriptionFilters) {
	if (
		filters.pokemonIds &&
		filters.pokemonIds.length > 0 &&
		!filters.pokemonIds.includes(context.pokemonId)
	)
		return false;
	if (filters.form !== undefined && filters.form !== context.form) return false;
	if (filters.minIv !== undefined && (context.iv === null || context.iv < filters.minIv))
		return false;
	if (filters.maxIv !== undefined && (context.iv === null || context.iv > filters.maxIv))
		return false;
	if (filters.minCp !== undefined && (context.cp === null || context.cp < filters.minCp))
		return false;
	if (filters.maxCp !== undefined && (context.cp === null || context.cp > filters.maxCp))
		return false;
	if (
		filters.minLevel !== undefined &&
		(context.level === null || context.level < filters.minLevel)
	)
		return false;
	if (
		filters.maxLevel !== undefined &&
		(context.level === null || context.level > filters.maxLevel)
	)
		return false;
	if (filters.minAtk !== undefined && (context.atk === null || context.atk < filters.minAtk))
		return false;
	if (filters.maxAtk !== undefined && (context.atk === null || context.atk > filters.maxAtk))
		return false;
	if (filters.minDef !== undefined && (context.def === null || context.def < filters.minDef))
		return false;
	if (filters.maxDef !== undefined && (context.def === null || context.def > filters.maxDef))
		return false;
	if (filters.minSta !== undefined && (context.sta === null || context.sta < filters.minSta))
		return false;
	if (filters.maxSta !== undefined && (context.sta === null || context.sta > filters.maxSta))
		return false;
	if (
		filters.minSize !== undefined &&
		(context.sizeValue === null || context.sizeValue < filters.minSize)
	)
		return false;
	if (
		filters.maxSize !== undefined &&
		(context.sizeValue === null || context.sizeValue > filters.maxSize)
	)
		return false;
	if (filters.gender !== undefined && context.genderValue !== filters.gender) return false;

	if (filters.pvpLeagues && filters.pvpLeagues.length > 0) {
		const qualifies = filters.pvpLeagues.some((league) => {
			const rank =
				league === "great"
					? context.pvpGreatRank
					: league === "ultra"
						? context.pvpUltraRank
						: context.pvpLittleRank;
			if (rank === null) return false;
			return filters.pvpMaxRank === undefined || rank <= filters.pvpMaxRank;
		});
		if (!qualifies) return false;
	}

	return true;
}

function matchesRaidFilters(
	context: RaidTemplateContext,
	filters: RaidSubscriptionFilters
): boolean {
	if (context.isEgg && filters.notifyOnEgg === false) return false;
	if (!context.isEgg && filters.notifyOnBoss === false) return false;

	if (filters.minLevel !== undefined && context.level < filters.minLevel) return false;
	if (filters.maxLevel !== undefined && context.level > filters.maxLevel) return false;
	if (filters.teams && filters.teams.length > 0 && !filters.teams.includes(context.teamId))
		return false;

	// Boss-only filters — an egg's eventual species/form isn't known yet, so these can't apply.
	if (!context.isEgg) {
		if (
			filters.bossPokemonIds &&
			filters.bossPokemonIds.length > 0 &&
			!filters.bossPokemonIds.includes(context.pokemonId)
		)
			return false;
		if (filters.form !== undefined && filters.form !== context.form) return false;
		if (filters.exRaidOnly && !context.exRaidEligible) return false;
	}

	return true;
}

function matchesMaxBattleFilters(
	context: MaxBattleTemplateContext,
	filters: MaxBattleSubscriptionFilters
): boolean {
	if (filters.minLevel !== undefined && context.level < filters.minLevel) return false;
	if (filters.maxLevel !== undefined && context.level > filters.maxLevel) return false;
	if (filters.gmaxOnly && !context.gmax) return false;
	if (
		filters.bossPokemonIds &&
		filters.bossPokemonIds.length > 0 &&
		!filters.bossPokemonIds.includes(context.pokemonId)
	)
		return false;
	if (filters.form !== undefined && filters.form !== context.form) return false;
	return true;
}

// Only the FIRST reward is matched against (see buildQuestContext's doc comment) — quests almost
// always carry exactly one.
function matchesQuestFilters(
	context: QuestTemplateContext,
	filters: QuestSubscriptionFilters
): boolean {
	if (filters.withAr !== undefined && context.withAr !== filters.withAr) return false;
	if (!filters.rewardType) return true;
	if (filters.rewardType !== context.rewardType) return false;

	if (filters.rewardType === "pokemon") {
		if (
			filters.rewardPokemonIds &&
			filters.rewardPokemonIds.length > 0 &&
			!filters.rewardPokemonIds.includes(context.pokemonId)
		)
			return false;
		if (filters.shinyOnly && !context.shiny) return false;
	} else if (filters.rewardType === "item") {
		if (
			filters.rewardItemIds &&
			filters.rewardItemIds.length > 0 &&
			!filters.rewardItemIds.includes(context.itemId)
		)
			return false;
		if (filters.minAmount !== undefined && context.amount < filters.minAmount) return false;
	} else if (filters.rewardType === "stardust") {
		if (filters.minAmount !== undefined && context.amount < filters.minAmount) return false;
	} else if (filters.rewardType === "candy" || filters.rewardType === "megaEnergy") {
		if (
			filters.rewardPokemonIds &&
			filters.rewardPokemonIds.length > 0 &&
			!filters.rewardPokemonIds.includes(context.pokemonId)
		)
			return false;
		if (filters.minAmount !== undefined && context.amount < filters.minAmount) return false;
	}

	return true;
}

function matchesInvasionFilters(
	context: InvasionTemplateContext,
	filters: InvasionSubscriptionFilters
): boolean {
	if (filters.kinds && filters.kinds.length > 0 && !filters.kinds.includes(context.kind))
		return false;
	if (context.kind === "grunt") {
		if (
			filters.characters &&
			filters.characters.length > 0 &&
			!filters.characters.includes(context.character)
		)
			return false;
		if (filters.confirmedOnly && !context.confirmed) return false;
	}
	return true;
}

function matchesLureFilters(
	context: LureTemplateContext,
	filters: LureSubscriptionFilters
): boolean {
	if (filters.lureIds && filters.lureIds.length > 0 && !filters.lureIds.includes(context.lureId))
		return false;
	return true;
}

// Mirrors PoracleNG's own gym matcher: a team change (to one of `teams`) always matches; when the
// team hasn't changed, only slot/battle changes the subscription opted into can trigger a match.
function matchesGymFilters(context: GymTemplateContext, filters: GymSubscriptionFilters): boolean {
	if (filters.teams && filters.teams.length > 0 && !filters.teams.includes(context.teamId))
		return false;

	if (!context.teamChanged) {
		const wantsSlotChange = context.slotsChanged && filters.slotChanges;
		const wantsBattleChange = context.inBattle && filters.battleChanges;
		if (!wantsSlotChange && !wantsBattleChange) return false;
	}

	return true;
}

function isSubscriptionActiveNow(subscription: NotificationSubscription): boolean {
	if (subscription.mode !== "scheduled") return true;
	return !!subscription.schedule && isScheduleActiveNow(subscription.schedule);
}

async function matchesArea(
	subscription: NotificationSubscription,
	// Structural — only latitude/longitude are ever read, so any type's context satisfies this.
	context: { latitude: number; longitude: number },
	thisFetch: typeof fetch
) {
	const { areaId, areaSource } = subscription.filters;
	if (!areaId) return true;
	const pt = point([context.longitude, context.latitude]);

	if (areaSource === "koji") {
		const area = await getKojiAreaById(areaId, thisFetch);
		if (!area) return false;
		return booleanPointInPolygon(pt, area.geometry);
	}

	if (areaSource === "notificationArea") {
		const area = await getNotificationArea(subscription.userId, areaId);
		if (!area) return false;
		return booleanPointInPolygon(pt, area.geofence);
	}

	const area = await getScanArea(subscription.userId, areaId);
	if (!area) return false;
	return booleanPointInPolygon(pt, area.geofence);
}

const MAP_IMAGE_TAG = "attachment://map.png";
const POKEMON_IMAGE_TAG = "attachment://pokemon.png";

async function deliver(
	subscription: NotificationSubscription,
	context: PokemonTemplateContext,
	getMapImage: () => Promise<Buffer | null>,
	getSpriteImage: () => Promise<Buffer | null>,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	// Tracked-collection badges are per-recipient, not a fact about the event — resolve this
	// user's own pokemon_tracker row before rendering (see applyTrackedBadges' docs).
	const tracker = await getTracker(subscription.userId, context.pokemonId, context.form);
	const userContext = applyTrackedBadges(context, tracker);

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, userContext)
		: renderEmbed(
				{
					content:
						'{{pokemonName}} · {{iv}}% · {{cp}}  CP{{#if (isnt weather "None")}} {{{weatherEmoji}}}{{/if}}',
					title: "{{{type1Emoji}}}{{{type2Emoji}}} {{pokemonName}}",
					description:
						'Despawns <t:{{despawnUnix}}:R> at {{despawnTime}}\n{{#if (or trackedShundo trackedHundo trackedShiny trackedNundo)}}\nYour Collection:{{#if trackedShundoEmoji}} {{trackedShundoEmoji}}{{/if}}{{#if trackedHundoEmoji}} {{trackedHundoEmoji}}{{/if}}{{#if trackedShinyEmoji}} {{trackedShinyEmoji}}{{/if}}{{#if trackedNundoEmoji}} {{trackedNundoEmoji}}{{/if}}\n{{/if}}\n{{#if (isnt weather "None")}}\nWeather boosted: {{weather}} {{{weatherEmoji}}}\n{{/if}}\n{{#if evolutions.length}}\nCan evolve into: {{#each evolutions}}[{{fullName}}](https://pogovt.com/pokedex/{{pokemonId}}){{#unless @last}}, {{/unless}}{{/each}}\n{{/if}}\nQuick: {{{quickMoveEmoji}}} {{quickMove}}, Charge: {{{chargeMoveEmoji}}} {{chargeMove}}\nShiny Rate: {{shinyRateReduced}} ({{shinyRatePercent}})\n{{#with (filterRank pvpLittle 25) as |ranked|}}\n{{#if ranked.length}}\n**Little League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}\n{{#with (filterRank pvpGreat 25) as |ranked|}}\n{{#if ranked.length}}\n**Great League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}\n{{#with (filterRank pvpUltra 25) as |ranked|}}\n{{#if ranked.length}}\n**Ultra League:**\n{{#each ranked}} - {{fullName}} #{{rank}} @{{cp}}CP (Lvl. {{levelWithCap}})\n{{/each}}\n{{/if}}\n{{/with}}',
					color: "#FF8000",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "{{{mapImageUrl}}}",
					footerText: "",
					url: "",
					fields: [
						{
							name: "Directions",
							value:
								"[Waze]({{{wazeMapUrl}}}) | [Google]({{{googleMapsUrl}}}) | [Apple]({{{appleMapsUrl}}})",
							inline: false
						},
						{
							name: "Links",
							value:
								"[View on Map]({{{diademUrl}}}) | [Pokemon Page](https://pogovt.com/pokemon/{{pokemonId}})",
							inline: false
						}
					]
				},
				userContext
			);

	const usesMapImage = embed.imageUrl === MAP_IMAGE_TAG || embed.thumbnailUrl === MAP_IMAGE_TAG;
	const usesSpriteImage =
		embed.imageUrl === POKEMON_IMAGE_TAG || embed.thumbnailUrl === POKEMON_IMAGE_TAG;
	const [mapImage, spriteImage] = await Promise.all([
		usesMapImage ? getMapImage() : Promise.resolve(null),
		usesSpriteImage ? getSpriteImage() : Promise.resolve(null)
	]);

	// subscription.userId is our internal app user id, not a Discord snowflake —
	// sendDirectMessage needs the real Discord user id.
	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, {
		content: embed.content,
		embed,
		attachments: [
			mapImage ? { filename: "map.png", data: mapImage } : null,
			spriteImage ? { filename: "pokemon.png", data: spriteImage } : null
		]
	});
}

async function handlePokemon(message: GolbatPokemonMessage, thisFetch: typeof fetch) {
	if (isDuplicate(message)) return;

	const context = await buildPokemonContext(message, thisFetch);
	const candidates = await getPokemonSubscriptionCandidates(message.pokemon_id);
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesFilters(context, sub.filters as PokemonSubscriptionFilters)
	);

	// Generated at most once per event, regardless of how many subscriptions use it.
	let mapImage: Buffer | null | undefined;
	const getMapImage = async () => {
		if (mapImage === undefined) mapImage = await generatePokemonMapImage(message, thisFetch);
		return mapImage;
	};
	let spriteImage: Buffer | null | undefined;
	const getSpriteImage = async () => {
		if (spriteImage === undefined)
			spriteImage = await generatePokemonSpriteImage(message, thisFetch);
		return spriteImage;
	};

	await Promise.all(
		matches.map((sub) => deliver(sub, context, getMapImage, getSpriteImage, thisFetch))
	);
}

// No tracked-badges overlay (pokemon-only) and no map thumbnail yet (no verified Rampardos raid
// template — see buildRaidContext's mapImageUrl comment) — otherwise the same shape as deliver()
// above: area check, render, resolve Discord id, send. Boss sprite reuses the same
// attachment-based sprite fetch pokemon spawns use (species-only, no wild-encounter dependency).
async function deliverRaid(
	subscription: NotificationSubscription,
	context: RaidTemplateContext,
	getSpriteImage: () => Promise<Buffer | null>,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content:
						"{{#if isEgg}}Level {{level}} egg{{else}}{{pokemonName}} raid{{/if}} at {{gymName}}",
					title: "{{#if isEgg}}Level {{level}} Egg{{else}}{{pokemonName}} Raid{{/if}}",
					description:
						"{{gymName}}{{#unless isEgg}}\nCP/Moves: {{quickMove}} / {{chargeMove}}{{/unless}}",
					color: "3447003",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "",
					footerText:
						"{{#if isEgg}}Hatches at {{hatchTime}}{{else}}Despawns at {{raidEndTime}}{{/if}} ({{minutesLeft}}m left)",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const usesSpriteImage =
		embed.imageUrl === POKEMON_IMAGE_TAG || embed.thumbnailUrl === POKEMON_IMAGE_TAG;
	const spriteImage = usesSpriteImage ? await getSpriteImage() : null;

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, {
		content: embed.content,
		embed,
		attachments: [spriteImage ? { filename: "pokemon.png", data: spriteImage } : null]
	});
}

async function handleRaid(message: GolbatRaidMessage, thisFetch: typeof fetch) {
	if (isDuplicateRaid(message)) return;

	const context = await buildRaidContext(message, thisFetch);
	const candidates = await getSubscriptionsByType("raid");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesRaidFilters(context, sub.filters as RaidSubscriptionFilters)
	);

	// Generated at most once per event, regardless of how many subscriptions use it. Only
	// meaningful once the boss has hatched — an egg has no species to render a sprite for.
	let spriteImage: Buffer | null | undefined;
	const getSpriteImage = async () => {
		if (context.isEgg) return null;
		if (spriteImage === undefined) {
			spriteImage = await generatePokemonSpriteImage(
				{
					pokemon_id: context.pokemonId,
					form: context.form,
					costume: context.costume,
					gender: context.genderValue,
					shiny: false
				},
				thisFetch
			);
		}
		return spriteImage;
	};

	await Promise.all(matches.map((sub) => deliverRaid(sub, context, getSpriteImage, thisFetch)));
}

// Same shape as deliverRaid — no tracked badges, boss sprite reuses the shared species-only
// sprite fetch, no map thumbnail yet.
async function deliverMaxBattle(
	subscription: NotificationSubscription,
	context: MaxBattleTemplateContext,
	getSpriteImage: () => Promise<Buffer | null>,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content: "{{#if gmax}}Gigantamax {{/if}}{{pokemonName}} battle at {{stationName}}",
					title: "{{#if gmax}}Gigantamax {{/if}}{{pokemonName}} Max Battle",
					description: "{{stationName}} — Level {{level}}",
					color: "3447003",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "",
					footerText: "Battle ends at {{battleEndTime}} ({{minutesLeft}}m left)",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const usesSpriteImage =
		embed.imageUrl === POKEMON_IMAGE_TAG || embed.thumbnailUrl === POKEMON_IMAGE_TAG;
	const spriteImage = usesSpriteImage ? await getSpriteImage() : null;

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, {
		content: embed.content,
		embed,
		attachments: [spriteImage ? { filename: "pokemon.png", data: spriteImage } : null]
	});
}

async function handleMaxBattle(message: GolbatMaxBattleMessage, thisFetch: typeof fetch) {
	if (isDuplicateMaxBattle(message)) return;

	const context = await buildMaxBattleContext(message, thisFetch);
	const candidates = await getSubscriptionsByType("maxbattle");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesMaxBattleFilters(context, sub.filters as MaxBattleSubscriptionFilters)
	);

	// Generated at most once per event. Only meaningful once a boss is actually known.
	let spriteImage: Buffer | null | undefined;
	const getSpriteImage = async () => {
		if (!context.pokemonId) return null;
		if (spriteImage === undefined) {
			spriteImage = await generatePokemonSpriteImage(
				{ pokemon_id: context.pokemonId, form: context.form, shiny: false },
				thisFetch
			);
		}
		return spriteImage;
	};

	await Promise.all(
		matches.map((sub) => deliverMaxBattle(sub, context, getSpriteImage, thisFetch))
	);
}

// Same shape as deliverRaid/deliverMaxBattle — no tracked badges, sprite reuses the shared
// species-only sprite fetch (only meaningful for a pokemon-encounter reward), no map thumbnail.
async function deliverQuest(
	subscription: NotificationSubscription,
	context: QuestTemplateContext,
	getSpriteImage: () => Promise<Buffer | null>,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content: "{{questTitle}} at {{pokestopName}}",
					title: "Field Research",
					description: "{{pokestopName}}\nReward: {{rewardString}}",
					color: "3447003",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "",
					footerText: "{{#if withAr}}AR Quest{{else}}Standard Quest{{/if}}",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const usesSpriteImage =
		embed.imageUrl === POKEMON_IMAGE_TAG || embed.thumbnailUrl === POKEMON_IMAGE_TAG;
	const spriteImage = usesSpriteImage ? await getSpriteImage() : null;

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, {
		content: embed.content,
		embed,
		attachments: [spriteImage ? { filename: "pokemon.png", data: spriteImage } : null]
	});
}

async function handleQuest(message: GolbatQuestMessage, thisFetch: typeof fetch) {
	if (isDuplicateQuest(message)) return;

	const context = await buildQuestContext(message, thisFetch);
	const candidates = await getSubscriptionsByType("quest");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesQuestFilters(context, sub.filters as QuestSubscriptionFilters)
	);

	// Generated at most once per event. Only meaningful for a pokemon-encounter reward.
	let spriteImage: Buffer | null | undefined;
	const getSpriteImage = async () => {
		if (context.rewardType !== "pokemon" || !context.pokemonId) return null;
		if (spriteImage === undefined) {
			spriteImage = await generatePokemonSpriteImage(
				{ pokemon_id: context.pokemonId, form: context.form, shiny: context.shiny },
				thisFetch
			);
		}
		return spriteImage;
	};

	await Promise.all(matches.map((sub) => deliverQuest(sub, context, getSpriteImage, thisFetch)));
}

// No sprite/map image — an invasion isn't about one specific pokemon the way a raid/maxbattle
// boss or quest reward is (lineup is a list, not a single subject).
async function deliverInvasion(
	subscription: NotificationSubscription,
	context: InvasionTemplateContext,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content: "Pokestop invasion at {{pokestopName}}",
					title: "Pokestop Invasion",
					description:
						'{{pokestopName}}\n{{#if (eq kind "grunt")}}{{characterName}}{{else}}{{kind}}{{/if}}',
					color: "3447003",
					thumbnailUrl: "",
					imageUrl: "",
					footerText: "Ends {{minutesLeft}}m from now",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, { content: embed.content, embed, attachments: [] });
}

async function handleInvasion(message: GolbatInvasionMessage, thisFetch: typeof fetch) {
	if (isDuplicateInvasion(message)) return;

	const context = await buildInvasionContext(message, thisFetch);
	const candidates = await getSubscriptionsByType("invasion");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesInvasionFilters(context, sub.filters as InvasionSubscriptionFilters)
	);

	await Promise.all(matches.map((sub) => deliverInvasion(sub, context, thisFetch)));
}

// No sprite/map image, same reasoning as invasion — a lure isn't about one specific pokemon.
async function deliverLure(
	subscription: NotificationSubscription,
	context: LureTemplateContext,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content: "{{lureTypeName}} at {{pokestopName}}",
					title: "{{lureTypeName}}",
					description: "{{pokestopName}}",
					color: "3447003",
					thumbnailUrl: "",
					imageUrl: "",
					footerText: "Expires {{minutesLeft}}m from now",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, { content: embed.content, embed, attachments: [] });
}

async function handleLure(message: GolbatLureMessage, thisFetch: typeof fetch) {
	if (isDuplicateLure(message)) return;

	const context = await buildLureContext(message, thisFetch);
	const candidates = await getSubscriptionsByType("lure");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesLureFilters(context, sub.filters as LureSubscriptionFilters)
	);

	await Promise.all(matches.map((sub) => deliverLure(sub, context, thisFetch)));
}

// No sprite/map image, same reasoning as invasion/lure — a gym change isn't about one pokemon.
async function deliverGym(
	subscription: NotificationSubscription,
	context: GymTemplateContext,
	thisFetch: typeof fetch
) {
	if (!(await matchesArea(subscription, context, thisFetch))) return;

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					content: "{{gymName}} is now {{teamName}}",
					title: "Gym Update",
					description: "{{gymName}}\n{{oldTeamName}} → {{teamName}}",
					color: "3447003",
					thumbnailUrl: "",
					imageUrl: "",
					footerText: "{{slotsAvailable}}/6 slots open{{#if inBattle}} — In Battle!{{/if}}",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
			);

	const discordId = await getUserDiscordId(subscription.userId);
	if (!discordId) {
		log.warning(`No Discord id found for user ${subscription.userId}, skipping delivery`);
		return;
	}

	await sendDirectMessage(discordId, { content: embed.content, embed, attachments: [] });
}

async function handleGym(message: GolbatGymMessage, thisFetch: typeof fetch) {
	const gymId = message.gym_id || message.id || "";
	if (!gymId) return;

	const teamId = (message.team_id || message.team || 0) as RaidTeam;
	const slotsAvailable = message.slots_available ?? 0;
	const inBattle = !!(message.is_in_battle || message.in_battle);
	const now = Date.now();

	const { old, current, wasInCooldown } = updateGymState(
		gymId,
		teamId,
		slotsAvailable,
		inBattle,
		now
	);

	const oldTeamId = old?.teamId ?? -1; // -1 = unknown previous state (first sighting)
	const oldSlotsAvailable = old?.slotsAvailable ?? -1;
	const teamChanged = oldTeamId !== teamId;
	const slotsChanged = oldSlotsAvailable !== slotsAvailable;

	// Battle cooldown: while a battle is ongoing and nothing else material changed, rate-limit to
	// once per 5 minutes per gym instead of re-notifying on every webhook tick.
	if (old && wasInCooldown && !teamChanged && !slotsChanged) return;
	// Nothing changed at all and no battle in progress — no subscription's filter could possibly
	// want this, skip the DB round-trip entirely.
	if (!teamChanged && !slotsChanged && !inBattle) return;

	const context = buildGymContext({
		gymId,
		gymName: message.name ?? "",
		gymUrl: message.url ?? "",
		latitude: message.latitude,
		longitude: message.longitude,
		teamId,
		oldTeamId,
		slotsAvailable,
		oldSlotsAvailable,
		inBattle,
		lastControllerId: current.lastControllerId
	});

	const candidates = await getSubscriptionsByType("gym");
	const matches = candidates.filter(
		(sub) =>
			isSubscriptionActiveNow(sub) &&
			matchesGymFilters(context, sub.filters as GymSubscriptionFilters)
	);

	await Promise.all(matches.map((sub) => deliverGym(sub, context, thisFetch)));
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const discordConfig = getServerConfig().auth.discord;
	if (!discordConfig?.botToken || !discordConfig?.webhookSecret) {
		return json({ error: "not_configured" }, { status: 503 });
	}

	const secret = request.headers.get("x-diadem-secret");
	if (secret !== discordConfig.webhookSecret) {
		log.warning(
			`Rejected webhook POST: X-Diadem-Secret header ${secret ? "didn't match" : "was missing"}`
		);
		return json({ error: "unauthorized" }, { status: 401 });
	}

	let envelopes: GolbatWebhookEnvelope[];
	try {
		envelopes = await request.json();
	} catch {
		log.warning("Rejected webhook POST: body wasn't valid JSON");
		return json({ error: "invalid_request" }, { status: 400 });
	}
	if (!Array.isArray(envelopes)) {
		log.warning("Rejected webhook POST: body wasn't a JSON array");
		return json({ error: "invalid_request" }, { status: 400 });
	}

	const counts = new Map<string, number>();
	for (const envelope of envelopes) {
		counts.set(envelope.type, (counts.get(envelope.type) ?? 0) + 1);
	}
	log.info(
		`Received ${envelopes.length} webhook event(s): ${[...counts.entries()].map(([type, n]) => `${type}=${n}`).join(", ") || "(empty)"}`
	);

	for (const envelope of envelopes) {
		try {
			if (envelope.type === "pokemon") {
				await handlePokemon(envelope.message as GolbatPokemonMessage, fetch);
			} else if (envelope.type === "raid") {
				await handleRaid(envelope.message as GolbatRaidMessage, fetch);
			} else if (envelope.type === "max_battle") {
				await handleMaxBattle(envelope.message as GolbatMaxBattleMessage, fetch);
			} else if (envelope.type === "quest") {
				await handleQuest(envelope.message as GolbatQuestMessage, fetch);
			} else if (envelope.type === "invasion") {
				await handleInvasion(envelope.message as GolbatInvasionMessage, fetch);
			} else if (envelope.type === "gym" || envelope.type === "gym_details") {
				await handleGym(envelope.message as GolbatGymMessage, fetch);
			} else if (envelope.type === "pokestop") {
				// A "pokestop" envelope can carry lure data, invasion data, or both (see PoracleNG's
				// own routePokestop) — both are handled independently since they're orthogonal.
				const message = envelope.message as Record<string, unknown>;
				const lureExpiration = Number(message.lure_expiration) || 0;
				const incidentExpiration = Number(message.incident_expiration) || 0;
				const incidentGruntType = Number(message.incident_grunt_type) || 0;
				if (lureExpiration > 0) {
					await handleLure(envelope.message as GolbatLureMessage, fetch);
				}
				if (incidentExpiration > 0 || incidentGruntType > 0) {
					await handleInvasion(envelope.message as GolbatInvasionMessage, fetch);
				}
			}
			// else: not yet supported (fort) — ignored for now.
		} catch (error) {
			log.warning(`Failed to process ${envelope.type} webhook event: ${error}`);
		}
	}

	return json({ ok: true });
};
