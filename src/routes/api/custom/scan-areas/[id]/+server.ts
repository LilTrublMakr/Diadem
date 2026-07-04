import {
	guardScanAreaRequest,
	parseAreaId,
	scanAreaErrorResponse,
	toScanAreaDto
} from "@/lib/server/scanAreas/endpointUtils";
import { deleteScanArea, updateScanArea } from "@/lib/server/scanAreas/service";
import { patchScanAreaSchema } from "@/lib/server/scanAreas/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	const parsed = patchScanAreaSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await updateScanArea(guard.userId, id, parsed.data, guard.allotment);
		return json(toScanAreaDto(row));
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	try {
		await deleteScanArea(guard.userId, id);
		return new Response(null, { status: 204 });
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
