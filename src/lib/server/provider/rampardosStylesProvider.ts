import { REFRESH_RAMPARDOS_STYLES } from "@/lib/constants";
import type { MapStyleOption } from "@/lib/features/notifications/mapStyles";
import { getServerConfig } from "@/lib/services/config/config.server";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("rampardosStyles");

// Rampardos' own GET /styles response shape (see rampardos/internal/models/style.go) —
// only `id`/`name` are read here.
type RampardosStyle = { id: string; name: string };

export class RampardosStylesProvider extends BaseDataProvider<MapStyleOption[]> {
	constructor() {
		super(REFRESH_RAMPARDOS_STYLES);
	}

	protected async query(): Promise<MapStyleOption[]> {
		const staticMap = getServerConfig().staticMap;
		if (!staticMap?.enabled || !staticMap.url) return [];

		try {
			const response = await fetch(`${staticMap.url}/styles`, {
				signal: AbortSignal.timeout(10_000)
			});
			if (!response.ok) {
				log.warning(`Rampardos /styles request failed: ${response.status}`);
				return [];
			}
			const styles = (await response.json()) as RampardosStyle[];
			return styles.map((s) => ({ id: s.id, label: s.name || s.id }));
		} catch (error) {
			log.warning(`Failed to fetch Rampardos styles: ${error}`);
			return [];
		}
	}
}

export const rampardosStylesProvider = new RampardosStylesProvider();
