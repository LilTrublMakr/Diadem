import {
	guardScanAreaRequest,
	parseAreaId,
	scanAreaErrorResponse,
	toScanAreaDto
} from "@/lib/server/scanAreas/endpointUtils";
import { setScanAreaSchedule } from "@/lib/server/scanAreas/service";
import { areaScheduleSchema } from "@/lib/server/scanAreas/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	const parsed = areaScheduleSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await setScanAreaSchedule(guard.userId, id, parsed.data, guard.allotment);
		return json(toScanAreaDto(row));
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
