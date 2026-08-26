import { REFRESH_FEATURED_ATTACKS } from "@/lib/constants";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getMasterFile } from "@/lib/services/masterfile";
import type { FeaturedAttackEntry } from "@/lib/types/featuredAttack";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("featuredAttacks");

const EVENTS_URL =
	"https://raw.githubusercontent.com/bigfoott/ScrapedDuck/refs/heads/data/events.json";

type ScrapedDuckEvent = {
	eventID: string;
	name: string;
	eventType: string;
	link: string;
	start: string;
	end: string;
};

const HOUR_WORDS: Record<string, number> = {
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10,
	eleven: 11,
	twelve: 12
};

function parseHours(raw: string): number {
	const digits = Number(raw);
	if (Number.isFinite(digits)) return digits;
	return HOUR_WORDS[raw.toLowerCase()] ?? 0;
}

function decodeEntities(text: string): string {
	return text
		.replace(/&#8217;|&rsquo;/g, "'")
		.replace(/&#8216;|&lsquo;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&nbsp;/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function stripTags(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, ""));
}

function normalizeName(name: string): string {
	return name.normalize("NFKC").replace(/[‘’']/g, "'").toLowerCase().replace(/\s+/g, " ").trim();
}

// Only base species names — regional/costume form names (e.g. "Alolan Sandslash") aren't indexed
// here. A featured attack naming a form falls through to the "couldn't resolve" skip path below,
// same as any other unparseable case. Low-cost to add later if it turns out to matter in practice.
function buildSpeciesNameIndex(): Map<string, { pokemonId: number; form: number }> {
	const index = new Map<string, { pokemonId: number; form: number }>();
	const mf = getMasterFile();
	if (!mf) return index;
	for (const [idStr, pokemon] of Object.entries(mf.pokemon)) {
		if (!pokemon.name) continue;
		index.set(normalizeName(pokemon.name), { pokemonId: Number(idStr), form: 0 });
	}
	return index;
}

const FEATURED_ATTACK_SENTENCE =
	/Evolve\s+([A-Za-zÀ-ÿ' -]+?)(?:\s*\([^)]*\))?\s+during the event or up to\s+(\w+)\s+hours?\s+afterwards to get an?\s+([A-Za-zÀ-ÿ' -]+?)\s+that knows the (Fast|Charged) Attack\s+([A-Za-zÀ-ÿ' -]+?)\./i;

function parseCommunityDayBlock(html: string): {
	triggerName: string;
	resultName: string;
	category: "fast" | "charged";
	moveName: string;
	graceHours: number;
} | null {
	const blockMatch = html.match(
		/<h2[^>]*id=["']featured-attack["'][^>]*>[\s\S]*?<\/h2>\s*<p>([\s\S]*?)<\/p>/i
	);
	if (!blockMatch) return null;

	const sentence = stripTags(blockMatch[1]);
	const m = sentence.match(FEATURED_ATTACK_SENTENCE);
	if (!m) return null;

	return {
		triggerName: m[1].trim(),
		graceHours: parseHours(m[2]),
		resultName: m[3].trim(),
		category: m[4].toLowerCase() as "fast" | "charged",
		moveName: m[5].trim()
	};
}

function parseGenericEventBlocks(html: string): {
	name: string;
	category: "fast" | "charged";
	moveName: string;
}[] {
	const sectionMatch = html.match(
		/<h2[^>]*id=["']featured-attacks["'][^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2|$)/i
	);
	if (!sectionMatch) return [];

	const results: { name: string; category: "fast" | "charged"; moveName: string }[] = [];
	const blockRe =
		/<p><strong>([^<]+)<\/strong><\/p>\s*<p>[^<]*?will know the (Fast|Charged) Attack <strong>([^<]+)<\/strong>\.<\/p>/gi;
	let m: RegExpExecArray | null;
	while ((m = blockRe.exec(sectionMatch[1])) !== null) {
		results.push({
			name: decodeEntities(m[1]),
			category: m[2].toLowerCase() as "fast" | "charged",
			moveName: decodeEntities(m[3])
		});
	}
	return results;
}

export class FeaturedAttackProvider extends BaseDataProvider<FeaturedAttackEntry[]> {
	constructor() {
		super(REFRESH_FEATURED_ATTACKS);
	}

	protected async query(): Promise<FeaturedAttackEntry[]> {
		const nameIndex = buildSpeciesNameIndex();
		if (nameIndex.size === 0) {
			log.info("Masterfile not loaded yet — skipping this refresh, will retry next cycle");
			return this.cachedData ?? [];
		}

		let events: ScrapedDuckEvent[];
		try {
			const response = await fetch(EVENTS_URL, { signal: AbortSignal.timeout(10_000) });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			events = await response.json();
		} catch (error) {
			log.warning(`Failed to fetch ScrapedDuck events: ${error}`);
			return this.cachedData ?? [];
		}

		const now = Date.now();
		const oneDayMs = 24 * 60 * 60 * 1000;
		const candidates = events.filter((e) => {
			if (!e.link || !e.start || !e.end) return false;
			const end = new Date(e.end).getTime();
			const start = new Date(e.start).getTime();
			// Bound how many pages get fetched per refresh — events long over (no grace period
			// realistically extends a week) or too far out aren't worth scraping yet.
			return end + oneDayMs * 7 >= now && start - oneDayMs * 30 <= now;
		});

		const entries: FeaturedAttackEntry[] = [];
		for (const event of candidates) {
			let html: string;
			try {
				const response = await fetch(event.link, { signal: AbortSignal.timeout(10_000) });
				if (!response.ok) continue;
				html = await response.text();
			} catch (error) {
				log.info(`Failed to fetch event page ${event.link}: ${error}`);
				continue;
			}

			const cd = parseCommunityDayBlock(html);
			if (cd) {
				const trigger = nameIndex.get(normalizeName(cd.triggerName));
				if (!trigger) {
					log.info(`Couldn't resolve trigger species "${cd.triggerName}" for ${event.eventID}`);
					continue;
				}
				entries.push({
					pokemonId: trigger.pokemonId,
					form: trigger.form,
					trigger: "evolve",
					resultName: cd.resultName,
					moveName: cd.moveName,
					moveCategory: cd.category,
					activeFrom: event.start,
					activeUntil: new Date(
						new Date(event.end).getTime() + cd.graceHours * 60 * 60 * 1000
					).toISOString(),
					eventName: decodeEntities(event.name),
					sourceUrl: event.link
				});
				continue;
			}

			const generic = parseGenericEventBlocks(html);
			for (const block of generic) {
				const species = nameIndex.get(normalizeName(block.name));
				if (!species) {
					log.info(`Couldn't resolve species "${block.name}" for ${event.eventID}`);
					continue;
				}
				entries.push({
					pokemonId: species.pokemonId,
					form: species.form,
					trigger: "catchOrEvolve",
					resultName: block.name,
					moveName: block.moveName,
					moveCategory: block.category,
					activeFrom: event.start,
					activeUntil: event.end,
					eventName: decodeEntities(event.name),
					sourceUrl: event.link
				});
			}
		}

		return entries;
	}
}

export const featuredAttackProvider = new FeaturedAttackProvider();
