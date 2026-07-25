import {
	exportBackup,
	importBackup,
	type BackupInclude
} from "@/lib/server/notifications/backupService";
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

	// Single-item export (?areaId=/?templateId=/?subscriptionId=) takes priority over `include` —
	// they're mutually exclusive in the UI, but there's no reason to forbid combining them.
	const areaId = url.searchParams.get("areaId");
	const templateId = url.searchParams.get("templateId");
	const subscriptionId = url.searchParams.get("subscriptionId");

	let include: BackupInclude;
	if (areaId || templateId || subscriptionId) {
		include = {
			areas: areaId ? [Number(areaId)] : undefined,
			templates: templateId ? [Number(templateId)] : undefined,
			subscriptions: subscriptionId ? [Number(subscriptionId)] : undefined
		};
	} else {
		const requested = url.searchParams.get("include");
		// No `include` param = export everything (the "one shot" option).
		const wanted: ReadonlySet<Section> = requested
			? new Set(requested.split(",").filter((s): s is Section => SECTIONS.includes(s as Section)))
			: new Set(SECTIONS);
		include = {
			areas: wanted.has("areas") ? "all" : undefined,
			templates: wanted.has("templates") ? "all" : undefined,
			subscriptions: wanted.has("subscriptions") ? "all" : undefined
		};
	}

	try {
		const backup = await exportBackup(guard.userId, include);
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
