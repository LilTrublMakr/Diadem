import { REFRESH_RAMPARDOS_STYLES } from "@/lib/constants";
import { guardNotificationRequest } from "@/lib/server/notifications/endpointUtils";
import { generateMapStylePreview } from "@/lib/server/notifications/mapImage";
import { rampardosStylesProvider } from "@/lib/server/provider/rampardosStylesProvider";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Module-level cache with a real TTL (matching REFRESH_RAMPARDOS_STYLES) rather than "forever" —
// an operator can edit a style's own rendering (as happened during development: a template that
// wasn't honoring the requested style at all) without needing a server restart to see it reflected
// here. Same reasoning applies to the browser Cache-Control below — no "immutable"/long max-age,
// so a re-visit within the hour still revalidates instead of trusting a stale cached PNG forever.
const previewCache = new Map<string, { buffer: Buffer; cachedAt: number }>();

export const GET: RequestHandler = async ({ locals, params, fetch }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const style = params.style;
	const styles = await rampardosStylesProvider.get();
	if (!style || !styles.some((s) => s.id === style)) {
		return json({ error: "invalid_style" }, { status: 400 });
	}

	const cached = previewCache.get(style);
	const cacheHeaders = {
		"Content-Type": "image/png",
		"Cache-Control": `public, max-age=${REFRESH_RAMPARDOS_STYLES}`
	};
	if (cached && Date.now() - cached.cachedAt < REFRESH_RAMPARDOS_STYLES * 1000) {
		return new Response(cached.buffer, { headers: cacheHeaders });
	}

	const buffer = await generateMapStylePreview(style, fetch);
	if (!buffer) {
		return json({ error: "preview_failed" }, { status: 502 });
	}

	previewCache.set(style, { buffer, cachedAt: Date.now() });
	return new Response(buffer, { headers: cacheHeaders });
};
