import { PERMISSION_UPDATE_INTERVAL } from "@/lib/constants";
import { updatePermissions } from "@/lib/server/auth/permissions";
import type { User } from "@/lib/server/db/internal/schema";
import type { Perms } from "@/lib/utils/features";
import TTLCache from "@isaacs/ttlcache";

export const permissionCache: TTLCache<string, Perms> = new TTLCache({
	ttl: PERMISSION_UPDATE_INTERVAL * 1000
});

const permissionUpdateInFlight = new Map<string, Promise<Perms>>();

export function updatePermissionsLocked(user: User, accessToken: string, thisFetch: typeof fetch) {
	let updatePromise = permissionUpdateInFlight.get(user.id);
	if (!updatePromise) {
		updatePromise = updatePermissions(user, accessToken, thisFetch).finally(() => {
			permissionUpdateInFlight.delete(user.id);
		});
		permissionUpdateInFlight.set(user.id, updatePromise);
	}
	return updatePromise;
}
