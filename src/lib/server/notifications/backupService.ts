import { getScanAreas } from "@/lib/server/db/internal/repository";
import {
	NotificationError,
	createNotificationArea,
	createSubscription,
	createTemplate,
	listNotificationAreas,
	listSubscriptions,
	listTemplates
} from "@/lib/server/notifications/service";
import type {
	BackupAreaRef,
	BackupImportSummary,
	NotificationsBackup
} from "@/lib/features/notifications/backupTypes";
import type { PokemonSubscriptionFilters } from "@/lib/features/notifications/types";

export type BackupInclude = { areas: boolean; templates: boolean; subscriptions: boolean };

function isNameTaken(error: unknown): boolean {
	return error instanceof NotificationError && error.code === "name_taken";
}

/**
 * Builds a portable export of the requested sections. Subscriptions always resolve their
 * area/template references to NAMES (not the raw ids) — see backupTypes.ts for why.
 */
export async function exportBackup(
	userId: string,
	include: BackupInclude
): Promise<NotificationsBackup> {
	const [notificationAreas, scanAreas, templates, subscriptions] = await Promise.all([
		listNotificationAreas(userId),
		include.subscriptions ? getScanAreas(userId) : Promise.resolve([]),
		listTemplates(userId),
		include.subscriptions ? listSubscriptions(userId) : Promise.resolve([])
	]);

	const notificationAreaNameById = new Map(notificationAreas.map((a) => [a.id, a.name]));
	const scanAreaNameById = new Map(scanAreas.map((a) => [a.id, a.name]));
	const templateNameById = new Map(templates.map((t) => [t.id, t.name]));

	const backup: NotificationsBackup = {
		kind: "diadem-notifications-backup",
		version: 1,
		exportedAt: new Date().toISOString()
	};

	if (include.areas) {
		backup.areas = notificationAreas.map((a) => ({ name: a.name, geofence: a.geofence }));
	}
	if (include.templates) {
		backup.templates = templates.map((t) => ({ name: t.name, embed: t.embed }));
	}
	if (include.subscriptions) {
		backup.subscriptions = subscriptions.map((s) => {
			const { areaId, areaSource, ...restFilters } = s.filters;

			let areaRef: BackupAreaRef | undefined;
			if (areaId && areaSource === "koji") {
				areaRef = { source: "koji", id: areaId };
			} else if (areaId && areaSource === "notificationArea") {
				const name = notificationAreaNameById.get(areaId);
				if (name) areaRef = { source: "notificationArea", name };
			} else if (areaId) {
				// areaSource undefined or "own" — a scan_area reference
				const name = scanAreaNameById.get(areaId);
				if (name) areaRef = { source: "own", name };
			}

			return {
				name: s.name,
				enabled: s.enabled,
				mode: s.mode,
				schedule: s.schedule,
				templateRef: s.templateId ? (templateNameById.get(s.templateId) ?? null) : null,
				filters: { ...restFilters, areaRef }
			};
		});
	}

	return backup;
}

/**
 * Imports whatever sections are present in `backup` for `userId`. Never overwrites existing
 * rows — a name collision is counted as skipped, not replaced, so a restore can't clobber
 * changes made since the export. Areas and templates import first so subscriptions (which may
 * reference either by name) can resolve against them.
 */
export async function importBackup(
	userId: string,
	backup: NotificationsBackup
): Promise<BackupImportSummary> {
	const summary: BackupImportSummary = {
		areas: { created: 0, skipped: 0 },
		templates: { created: 0, skipped: 0 },
		subscriptions: { created: 0, skipped: 0, unresolvedRefs: 0 }
	};

	for (const area of backup.areas ?? []) {
		try {
			await createNotificationArea(userId, { name: area.name, geofence: area.geofence });
			summary.areas.created++;
		} catch (error) {
			if (isNameTaken(error)) summary.areas.skipped++;
			else throw error;
		}
	}

	for (const template of backup.templates ?? []) {
		try {
			await createTemplate(userId, { name: template.name, embed: template.embed });
			summary.templates.created++;
		} catch (error) {
			if (isNameTaken(error)) summary.templates.skipped++;
			else throw error;
		}
	}

	if (backup.subscriptions && backup.subscriptions.length > 0) {
		// Resolved fresh after the imports above, so refs pointing at areas/templates that were
		// just created (or already existed) both resolve correctly.
		const [notificationAreas, scanAreas, templates] = await Promise.all([
			listNotificationAreas(userId),
			getScanAreas(userId),
			listTemplates(userId)
		]);
		const notificationAreaIdByName = new Map(notificationAreas.map((a) => [a.name, a.id]));
		const scanAreaIdByName = new Map(scanAreas.map((a) => [a.name, a.id]));
		const templateIdByName = new Map(templates.map((t) => [t.name, t.id]));

		for (const sub of backup.subscriptions) {
			const { areaRef, ...restFilters } = sub.filters;
			let hadRefButUnresolved = false;

			let areaId: number | undefined;
			let areaSource: PokemonSubscriptionFilters["areaSource"];
			if (areaRef?.source === "koji") {
				areaId = areaRef.id;
				areaSource = "koji";
			} else if (areaRef?.source === "notificationArea") {
				areaId = notificationAreaIdByName.get(areaRef.name);
				areaSource = "notificationArea";
				hadRefButUnresolved = areaId === undefined;
			} else if (areaRef?.source === "own") {
				areaId = scanAreaIdByName.get(areaRef.name);
				areaSource = "own";
				hadRefButUnresolved = areaId === undefined;
			}

			const templateId = sub.templateRef ? (templateIdByName.get(sub.templateRef) ?? null) : null;
			if (sub.templateRef && templateId === null) hadRefButUnresolved = true;

			const filters: PokemonSubscriptionFilters = { ...restFilters };
			if (areaId !== undefined) {
				filters.areaId = areaId;
				filters.areaSource = areaSource;
			}

			try {
				await createSubscription(userId, {
					name: sub.name,
					templateId,
					enabled: sub.enabled,
					filters,
					mode: sub.mode,
					schedule: sub.schedule
				});
				summary.subscriptions.created++;
				if (hadRefButUnresolved) summary.subscriptions.unresolvedRefs++;
			} catch (error) {
				if (isNameTaken(error)) summary.subscriptions.skipped++;
				else throw error;
			}
		}
	}

	return summary;
}
