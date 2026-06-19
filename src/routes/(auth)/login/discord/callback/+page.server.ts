import type { PageServerLoad } from "./$types";
import { getClientConfig } from "@/lib/services/config/config.server";
import { getMapPath } from "@/lib/utils/getMapPath";
import { isAuthRequired } from "@/lib/server/auth/betterAuth";
import { sanitizeRedirectPath } from "@/lib/server/auth/auth";
import { getServerLogger } from "@/lib/server/logging";

const log = getServerLogger("auth");

export const load: PageServerLoad = async (event) => {
	const redirectLink = sanitizeRedirectPath(
		event.url.searchParams.get("redir"),
		isAuthRequired() ? "/" : getMapPath(getClientConfig())
	);

	const response: { error: string | undefined; redir: string; name: string } = {
		error: undefined,
		redir: redirectLink,
		name: ""
	};

	if (event.locals.user) {
		response.name = event.locals.user.name || "";
		return response;
	}

	const hasError = event.url.searchParams.get("error");
	if (hasError) {
		response.error = "Discord Login: Authentication failed";
		return response;
	}

	log.warning("Callback reached without user in locals and no error param");
	response.error = "Discord Login: No session found";
	return response;
};
