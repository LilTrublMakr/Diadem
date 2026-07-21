export type IvBadges = { hundo: boolean; nundo: boolean; shundo: boolean };

/**
 * 100%/0% IV and shundo (shiny + 100%) status. Used both server-side (render.ts, from a real
 * Golbat message) and client-side (testData.ts, for template preview) so the two stay consistent.
 */
export function computeIvBadges(
	atk: number | null,
	def: number | null,
	sta: number | null,
	shiny: boolean
): IvBadges {
	const hundo = atk === 15 && def === 15 && sta === 15;
	const nundo = atk === 0 && def === 0 && sta === 0;
	return { hundo, nundo, shundo: hundo && shiny };
}
