import { checkIfAuthed } from "@/lib/server/auth/checkIfAuthed";
import type { User } from "@/lib/server/db/internal/schema";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { Features, type Perms } from "@/lib/utils/features";

/**
 * Personal Discord notification access — a plain role feature grant (`features = ["notifications"]`
 * in `[[server.permissions]]`), not a per-user quota.
 */
export function hasNotificationAccess(perms: Perms, user: User | null): boolean {
	// Subscriptions are per-user rows, so a real user is required even when auth is optional
	if (!user || !checkIfAuthed(user)) return false;
	// hasFeatureAnywhere already treats Features.ALL as a wildcard match
	return hasFeatureAnywhere(perms, Features.NOTIFICATIONS);
}
