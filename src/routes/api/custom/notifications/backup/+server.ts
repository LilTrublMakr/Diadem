import { exportBackup, importBackup } from "@/lib/server/notifications/backupService";
import { notificationsBackupSchema } from "@/lib/server/notifications/backupValidation";
import {
	guardNotificationRequest,
	notificationErrorResponse
} from "@/lib/server/notifications/endpointUtils";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const SECTIONS = ["areas", "templates", "subscriptions"] as const;
type Section = (typeof SECTIONS)[number];

export const GET: RequestHandler = async ({ locals, url }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const requested = url.searchParams.get("include");
	// No `include` param = export everything (the "one shot" option).
	const wanted: ReadonlySet<Section> = requested
		? new Set(requested.split(",").filter((s): s is Section => SECTIONS.includes(s as Section)))
		: new Set(SECTIONS);

	try {
		const backup = await exportBackup(guard.userId, {
			areas: wanted.has("areas"),
			templates: wanted.has("templates"),
			subscriptions: wanted.has("subscriptions")
		});
		return json(backup, {
			headers: {
				"Content-Disposition": `attachment; filename="diadem-notifications-backup-${Date.now()}.json"`
			}
		});
	} catch (error) {
		return notificationErrorResponse(error);
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const guard = guardNotificationRequest(locals);
	if (!guard.ok) return guard.response;

	const parsed = notificationsBackupSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const summary = await importBackup(guard.userId, parsed.data);
		return json(summary);
	} catch (error) {
		return notificationErrorResponse(error);
	}
};
