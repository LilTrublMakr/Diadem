import { checkIfAuthed } from "@/lib/server/auth/checkIfAuthed";
import type { User } from "@/lib/server/db/internal/schema";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { Features, type Perms } from "@/lib/utils/features";

/**
 * Worker allotment for user scan areas.
 * -1 = unlimited (admins or explicit config), 0 = feature disabled for this user.
 */
export function getScanWorkerAllotment(perms: Perms, user: User | null): number {
	// Scan areas are per-user rows, so a real user is required even when auth is optional
	if (!user || !checkIfAuthed(user)) return 0;
	if (hasFeatureAnywhere(perms, Features.ALL)) return -1;
	return perms.scanWorkers ?? 0;
}
