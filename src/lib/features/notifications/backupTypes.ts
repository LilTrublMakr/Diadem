import type { EmbedTemplate, PokemonSubscriptionFilters } from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";
import type { Polygon } from "geojson";

// Portable export/import format for a user's own notification areas/templates/subscriptions.
// IDs never survive a round-trip (they're autoincrement, and a restore may land on a different
// account or after other rows were created/deleted) — templates and areas are re-linked by NAME
// on import instead. Koji areas aren't user-owned data, so their numeric feature id is kept as-is.

export type BackupArea = {
	name: string;
	geofence: Polygon;
};

export type BackupTemplate = {
	name: string;
	embed: EmbedTemplate;
};

export type BackupAreaRef =
	| { source: "own" | "notificationArea"; name: string }
	| { source: "koji"; id: number };

// Same shape as PokemonSubscriptionFilters but with the raw areaId/areaSource replaced by a
// name-based reference that can be re-resolved against whatever the target account currently has.
export type BackupSubscriptionFilters = Omit<
	PokemonSubscriptionFilters,
	"areaSource" | "areaId"
> & {
	areaRef?: BackupAreaRef;
};

export type BackupSubscription = {
	name: string;
	enabled: boolean;
	mode: SubscriptionMode;
	schedule: NotificationSchedule | null;
	templateRef: string | null; // template name, or null for "no template" (uses the default embed)
	filters: BackupSubscriptionFilters;
};

export type NotificationsBackup = {
	kind: "diadem-notifications-backup";
	version: 1;
	exportedAt: string;
	areas?: BackupArea[];
	templates?: BackupTemplate[];
	subscriptions?: BackupSubscription[];
};

export type BackupImportSummary = {
	areas: { created: number; skipped: number };
	templates: { created: number; skipped: number };
	subscriptions: { created: number; skipped: number; unresolvedRefs: number };
};
