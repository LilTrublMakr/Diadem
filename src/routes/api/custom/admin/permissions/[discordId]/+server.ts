import { getUserByDiscordId } from "@/lib/server/auth/auth";
import { permissionCache } from "@/lib/server/auth/permissionCache";
import { hasFeatureAnywhereServer } from "@/lib/server/auth/checkIfAuthed";
import { Features } from "@/lib/utils/features";
import { error, json } from "@sveltejs/kit";

function requireAdmin(locals: App.Locals) {
	if (!hasFeatureAnywhereServer(locals.perms, Features.ALL, locals.user)) error(403);
}

// View a user's last-computed permissions (cached, up to PERMISSION_UPDATE_INTERVAL stale).
export async function GET({ params, locals }) {
	requireAdmin(locals);

	const targetUser = await getUserByDiscordId(params.discordId);
	if (!targetUser) error(404, "User not found");

	const cached = permissionCache.get(targetUser.id);
	return json({
		userId: targetUser.id,
		discordId: targetUser.discordId,
		isCached: cached !== undefined,
		permissions: cached ?? null
	});
}

// Force the role check to re-run on the user's next request, instead of waiting out the TTL.
export async function DELETE({ params, locals }) {
	requireAdmin(locals);

	const targetUser = await getUserByDiscordId(params.discordId);
	if (!targetUser) error(404, "User not found");

	const hadCachedEntry = permissionCache.delete(targetUser.id);
	return json({ refreshed: true, hadCachedEntry });
}
