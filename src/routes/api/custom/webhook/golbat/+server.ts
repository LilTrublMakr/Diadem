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
	buildMaxBattleContext,
	buildPokemonContext,
	buildRaidContext,
	renderEmbed
} from "@/lib/server/notifications/render";
import { getNotificationTemplate } from "@/lib/server/db/internal/repository";
import type {
	GolbatMaxBattleMessage,
	GolbatPokemonMessage,
	GolbatRaidMessage,
	GolbatWebhookEnvelope
} from "@/lib/server/notifications/golbatTypes";
import type {
	MaxBattleSubscriptionFilters,
	MaxBattleTemplateContext,
	PokemonSubscriptionFilters,
	PokemonTemplateContext,
	RaidSubscriptionFilters,
	RaidTemplateContext
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
					content: "{{pokemonName}}",
					title: "{{pokemonName}}",
					description: "IV: {{iv}}% CP: {{cp}} Level: {{level}}",
					color: "3447003",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "{{{mapImageUrl}}}",
					footerText: "Despawns at {{despawnTime}} ({{minutesLeft}}m left)",
					url: "{{{googleMapsUrl}}}",
					fields: []
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
			}
			// else: not yet supported (quest, invasion, lure, gym, fort) — ignored for now.
		} catch (error) {
			log.warning(`Failed to process ${envelope.type} webhook event: ${error}`);
		}
	}

	return json({ ok: true });
};
