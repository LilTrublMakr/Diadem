import { getConfig } from "@/lib/services/config/config";
import type { ShinyPredictionResult } from "@/lib/features/shinyPrediction";

let results = $state<Record<string, string[]>>({});
// Plain Set, not $state — this is read and written during template render
const requested = new Set<string>();

/**
 * Labels of the viewer's linked accounts this wild spawn is shiny for ([] = none / unknown yet).
 * Safe to call from a template: the first call per encounter kicks off one fetch, and the result
 * lands reactively once it resolves.
 */
export function getPersonalShiny(encounterId: string, pokemonId: number, form: number): string[] {
	if (!getConfig().general.shinyPrediction) return [];
	if (!requested.has(encounterId)) {
		requested.add(encounterId);
		const params = new URLSearchParams({
			encounterId,
			pokemonId: String(pokemonId),
			form: String(form)
		});
		fetch(`/api/custom/shiny-predict?${params}`)
			.then((res) => (res.ok ? (res.json() as Promise<ShinyPredictionResult>) : null))
			.then((body) => {
				if (body?.accounts.length) results[encounterId] = body.accounts;
			})
			.catch(() => {});
	}
	return results[encounterId] ?? [];
}
