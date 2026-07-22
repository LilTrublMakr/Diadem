import type { BackupImportSummary } from "@/lib/features/notifications/backupTypes";
import type { NotificationErrorResponse } from "@/lib/features/notifications/types";

export type BackupSection = "areas" | "templates" | "subscriptions";
export type BackupApiError = { code: string; message: string };

export function isBackupApiError(result: unknown): result is BackupApiError {
	return typeof result === "object" && result !== null && "code" in result && "message" in result;
}

async function parseError(res: Response): Promise<BackupApiError> {
	try {
		const body = (await res.json()) as NotificationErrorResponse;
		return { code: body.error ?? "unknown", message: body.message ?? "Something went wrong" };
	} catch {
		return { code: "unknown", message: `Request failed (${res.status})` };
	}
}

/**
 * Downloads a backup file for the requested sections (omit for "everything in one shot").
 * Triggers a real browser download rather than returning the data.
 */
export async function exportNotificationsBackup(
	sections?: BackupSection[]
): Promise<BackupApiError | null> {
	const query = sections && sections.length > 0 ? `?include=${sections.join(",")}` : "";
	const res = await fetch(`/api/custom/notifications/backup${query}`);
	if (!res.ok) return parseError(res);

	const blob = await res.blob();
	const disposition = res.headers.get("Content-Disposition") ?? "";
	const filename =
		disposition.match(/filename="([^"]+)"/)?.[1] ?? "diadem-notifications-backup.json";

	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
	return null;
}

/**
 * Restores whichever sections are present in the uploaded file. Never overwrites existing
 * rows — name collisions are reported as "skipped", not replaced. Callers should reload
 * whichever of notificationsState/notificationAreasState they display after a successful call.
 */
export async function importNotificationsBackup(
	file: File
): Promise<BackupImportSummary | BackupApiError> {
	let body: unknown;
	try {
		body = JSON.parse(await file.text());
	} catch {
		return { code: "invalid_request", message: "That file isn't valid JSON" };
	}

	const res = await fetch("/api/custom/notifications/backup", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
	if (!res.ok) return parseError(res);
	return (await res.json()) as BackupImportSummary;
}
