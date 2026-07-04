import { getScanAreas } from "@/lib/server/db/internal/repository";
import { getScanAreaLimits } from "@/lib/server/scanAreas/constants";
import {
	guardScanAreaRequest,
	scanAreaErrorResponse,
	toScanAreaDto
} from "@/lib/server/scanAreas/endpointUtils";
import { createScanArea } from "@/lib/server/scanAreas/service";
import { createScanAreaSchema } from "@/lib/server/scanAreas/validation";
import { computeInstantUsage, toOccupancySources } from "@/lib/features/scanAreas/scheduleOverlap";
import type { ScanAreasResponse } from "@/lib/features/scanAreas/types";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const areas = await getScanAreas(guard.userId);
	const response: ScanAreasResponse = {
		areas: areas.map(toScanAreaDto),
		allotment: {
			total: guard.allotment,
			used: computeInstantUsage(
				toOccupancySources(areas.map((a) => ({ ...a, schedule: a.schedule ?? null }))),
				new Date()
			)
		},
		limits: getScanAreaLimits()
	};
	return json(response);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const parsed = createScanAreaSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await createScanArea(guard.userId, parsed.data);
		return json(toScanAreaDto(row), { status: 201 });
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
