import { getApplicationEmojiIds, sendDirectMessage } from "@/lib/server/notifications/bot";
import {
	generatePokemonMapImage,
	generatePokemonSpriteImage
} from "@/lib/server/notifications/mapImage";
import { renderEmbed } from "@/lib/server/notifications/render";
import { guardNotificationRequest } from "@/lib/server/notifications/endpointUtils";
import { embedTemplateSchema } from "@/lib/server/notifications/validation";
import type { GolbatPokemonMessage } from "@/lib/server/notifications/golbatTypes";
import type { PokemonTemplateContext } from "@/lib/features/notifications/types";
import { extractEmojiTags } from "@/lib/features/notifications/discordEmoji";
import { getLogger } from "@/lib/utils/logger";
import { json } from "@sveltejs/kit";
import { z } from "zod";
import type { RequestHandler } from "./$types";

const log = getLogger("discordNotifications");

const MAP_IMAGE_TAG = "attachment://map.png";
const POKEMON_IMAGE_TAG = "attachment://pokemon.png";

// Loosely validated — this only ever renders into a DM sent back to the requesting
// user's own Discord account, so a malformed/adversarial context can't affect anyone else.
const testSendSchema = z.object({
	embed: embedTemplateSchema,
	context: z.record(z.string(), z.unknown())
});

function genderToNumber(gender: unknown): number {
	if (gender === "Male") return 1;
	if (gender === "Female") return 2;
	return 3;
}

export const POST: RequestHandler = async ({ locals, request, fetch }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const discordId = locals.user?.discordId;
	if (!discordId) return json({ error: "no_discord_id" }, { status: 400 });

	const parsed = testSendSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const context = parsed.data.context as unknown as PokemonTemplateContext;
		const rendered = renderEmbed(parsed.data.embed, context);
		rendered.title = `🧪 TEST — ${rendered.title}`.trim();

		const usesMapImage =
			rendered.imageUrl === MAP_IMAGE_TAG || rendered.thumbnailUrl === MAP_IMAGE_TAG;
		const usesSpriteImage =
			rendered.imageUrl === POKEMON_IMAGE_TAG || rendered.thumbnailUrl === POKEMON_IMAGE_TAG;

		let mapImage: Buffer | null = null;
		let spriteImage: Buffer | null = null;
		if (usesMapImage || usesSpriteImage) {
			const nowSeconds = Math.floor(Date.now() / 1000);
			const syntheticMessage: GolbatPokemonMessage = {
				encounter_id: `test-${nowSeconds}`,
				pokemon_id: context.pokemonId,
				latitude: context.latitude,
				longitude: context.longitude,
				disappear_time: context.despawnUnix,
				disappear_time_verified: true,
				first_seen: nowSeconds,
				last_modified_time: nowSeconds,
				form: context.form,
				costume: context.costume,
				gender: genderToNumber(context.gender),
				shiny: context.shiny,
				seen_type: "test"
			};
			[mapImage, spriteImage] = await Promise.all([
				usesMapImage ? generatePokemonMapImage(syntheticMessage, fetch) : Promise.resolve(null),
				usesSpriteImage
					? generatePokemonSpriteImage(syntheticMessage, fetch)
					: Promise.resolve(null)
			]);
		}

		await sendDirectMessage(discordId, {
			embed: rendered,
			attachments: [
				mapImage ? { filename: "map.png", data: mapImage } : null,
				spriteImage ? { filename: "pokemon.png", data: spriteImage } : null
			]
		});

		const emojiText = [
			rendered.title,
			rendered.description,
			rendered.footerText,
			...rendered.fields.flatMap((f) => [f.name, f.value])
		].join("\n");
		const referencedEmojis = extractEmojiTags(emojiText);
		let emojiWarnings: string[] = [];
		if (referencedEmojis.length > 0) {
			const ownedIds = await getApplicationEmojiIds();
			if (ownedIds) {
				const unresolved = referencedEmojis.filter((e) => !ownedIds.has(e.id));
				if (unresolved.length > 0) {
					emojiWarnings = unresolved.map((e) => `${e.name} (id ${e.id})`);
					log.warning(
						`Test send used emoji ids this bot's Application doesn't own — they'll render as raw text, not icons: ${emojiWarnings.join(", ")}. Re-upload them under this bot's own Discord Application (Developer Portal → Emojis) and update DISCORD_EMOJI_IDS.`
					);
				}
			}
		}

		return json({ ok: true, emojiWarnings });
	} catch (error) {
		log.warning(`Test send failed: ${error}`);
		return json(
			{ error: "send_failed", message: "Could not send the test message" },
			{ status: 500 }
		);
	}
};
