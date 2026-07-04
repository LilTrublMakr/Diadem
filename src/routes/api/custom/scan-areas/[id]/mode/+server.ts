import {
	guardScanAreaRequest,
	parseAreaId,
	scanAreaErrorResponse,
	toScanAreaDto
} from "@/lib/server/scanAreas/endpointUtils";
import { setScanAreaMode } from "@/lib/server/scanAreas/service";
import { setModeSchema } from "@/lib/server/scanAreas/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const guard = guardScanAreaRequest(locals);
	if (!guard.ok) return guard.response;

	const id = parseAreaId(params.id);
	if (id === null) return json({ error: "invalid_request" }, { status: 400 });

	const parsed = setModeSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(
			{ error: "invalid_request", message: parsed.error.issues[0]?.message },
			{ status: 400 }
		);
	}

	try {
		const row = await setScanAreaMode(guard.userId, id, parsed.data.mode, guard.allotment);
		return json(toScanAreaDto(row));
	} catch (error) {
		return scanAreaErrorResponse(error);
	}
};
