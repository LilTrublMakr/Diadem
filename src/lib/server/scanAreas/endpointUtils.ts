import type { ScanArea } from "@/lib/server/db/internal/schema";
import { getScanWorkerAllotment } from "@/lib/server/scanAreas/allotment";
import { ScanAreaError } from "@/lib/server/scanAreas/service";
import type { ScanAreaDto } from "@/lib/features/scanAreas/types";
import { json } from "@sveltejs/kit";

/**
 * Shared guard for scan-area endpoints. Returns the caller's allotment,
 * or a ready-to-return error response when access is denied.
 */
export function guardScanAreaRequest(
	locals: App.Locals
): { ok: true; userId: string; allotment: number } | { ok: false; response: Response } {
	if (!locals.user) {
		return { ok: false, response: json({ error: "unauthorized" }, { status: 401 }) };
	}
	const allotment = getScanWorkerAllotment(locals.perms, locals.user);
	if (allotment === 0) {
		return { ok: false, response: json({ error: "forbidden" }, { status: 403 }) };
	}
	return { ok: true, userId: locals.user.id, allotment };
}

export function scanAreaErrorResponse(error: unknown): Response {
	if (error instanceof ScanAreaError) {
		return json(
			{ error: error.code, message: error.message, ...error.extra },
			{ status: error.status }
		);
	}
	throw error;
}

export function toScanAreaDto(row: ScanArea): ScanAreaDto {
	return {
		id: row.id,
		name: row.name,
		geofence: row.geofence,
		areaSqM: row.areaSqM,
		workers: row.workers,
		active: row.active,
		mode: row.mode,
		schedule: row.schedule ?? null,
		createdAt: (row.createdAt instanceof Date
			? row.createdAt
			: new Date(row.createdAt)
		).toISOString(),
		updatedAt: row.updatedAt
			? (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString()
			: new Date(0).toISOString()
	};
}

export function parseAreaId(param: string | undefined): number | null {
	const id = Number(param);
	return Number.isInteger(id) && id > 0 ? id : null;
}
