import {
	guardScanAreaRequest,
	parseAreaId,
	scanAreaErrorResponse,
	toScanAreaDto
} from "@/lib/server/scanAreas/endpointUtils";
import { activateScanArea } from "@/lib/server/scanAreas/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	try {
		const row = await activateScanArea(guard.userId, id, guard.allotment);
		return json(toScanAreaDto(row));
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
