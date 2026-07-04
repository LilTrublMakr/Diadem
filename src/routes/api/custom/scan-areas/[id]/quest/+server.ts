import {
	guardScanAreaRequest,
	parseAreaId,
	scanAreaErrorResponse
} from "@/lib/server/scanAreas/endpointUtils";
import { startQuestScan } from "@/lib/server/scanAreas/service";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	try {
		await startQuestScan(guard.userId, id);
		return json({ started: true }, { status: 202 });
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
