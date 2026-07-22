import {
	getNotificationArea,
	getScanArea,
	getUserDiscordId
} from "@/lib/server/db/internal/repository";
import type { NotificationSubscription } from "@/lib/server/db/internal/schema";
import { getServerConfig } from "@/lib/services/config/config.server";
import { sendDirectMessage } from "@/lib/server/notifications/bot";
import { getPokemonSubscriptionCandidates } from "@/lib/server/notifications/matchCache";
import { isScheduleActiveNow } from "@/lib/features/notifications/scheduleActive";
import { getKojiAreaById } from "@/lib/server/notifications/kojiAreaCache";
import {
	generatePokemonMapImage,
	generatePokemonSpriteImage
} from "@/lib/server/notifications/mapImage";
import { buildPokemonContext, renderEmbed } from "@/lib/server/notifications/render";
import { getNotificationTemplate } from "@/lib/server/db/internal/repository";
import type {
	GolbatPokemonMessage,
	GolbatWebhookEnvelope
} from "@/lib/server/notifications/golbatTypes";
import type {
	PokemonSubscriptionFilters,
	PokemonTemplateContext
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

	if (filters.pvpLeague) {
		const rank =
			filters.pvpLeague === "great"
				? context.pvpGreatRank
				: filters.pvpLeague === "ultra"
					? context.pvpUltraRank
					: context.pvpLittleRank;
		if (rank === null) return false;
		if (filters.pvpMaxRank !== undefined && rank > filters.pvpMaxRank) return false;
	}

	return true;
}

function isSubscriptionActiveNow(subscription: NotificationSubscription): boolean {
	if (subscription.mode !== "scheduled") return true;
	return !!subscription.schedule && isScheduleActiveNow(subscription.schedule);
}

async function matchesArea(
	subscription: NotificationSubscription,
	context: PokemonTemplateContext,
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

	const template = subscription.templateId
		? await getNotificationTemplate(subscription.userId, subscription.templateId)
		: null;
	if (!template && subscription.templateId) return; // template was deleted, skip silently

	const embed = template
		? renderEmbed(template.embed, context)
		: renderEmbed(
				{
					title: "{{pokemonName}}",
					description: "IV: {{iv}}% CP: {{cp}} Level: {{level}}",
					color: "3447003",
					thumbnailUrl: "{{{pokemonImageUrl}}}",
					imageUrl: "{{{mapImageUrl}}}",
					footerText: "Despawns at {{despawnTime}} ({{minutesLeft}}m left)",
					url: "{{{googleMapsUrl}}}",
					fields: []
				},
				context
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
		(sub) => isSubscriptionActiveNow(sub) && matchesFilters(context, sub.filters)
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
		if (envelope.type !== "pokemon") continue; // Phase 2: other Golbat event types
		try {
			await handlePokemon(envelope.message as GolbatPokemonMessage, fetch);
		} catch (error) {
			log.warning(`Failed to process pokemon webhook event: ${error}`);
		}
	}

	return json({ ok: true });
};
