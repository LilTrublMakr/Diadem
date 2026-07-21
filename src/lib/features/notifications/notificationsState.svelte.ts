import type {
	EmbedTemplate,
	NotificationErrorResponse,
	NotificationSubscriptionDto,
	NotificationTemplateDto,
	PokemonSubscriptionFilters
} from "@/lib/features/notifications/types";
import type {
	NotificationSchedule,
	SubscriptionMode
} from "@/lib/features/notifications/scheduleTypes";

export type NotificationsData = {
	templates: NotificationTemplateDto[];
	subscriptions: NotificationSubscriptionDto[];
	loading: boolean;
	loaded: boolean;
	forbidden: boolean;
	error: string | null;
};

export type NotificationApiError = { code: string; message: string };

let state = $state<NotificationsData>({
	templates: [],
	subscriptions: [],
	loading: false,
	loaded: false,
	forbidden: false,
	error: null
});

export function getNotificationsState(): NotificationsData {
	return state;
}

async function parseError(res: Response): Promise<NotificationApiError> {
	try {
		const body = (await res.json()) as NotificationErrorResponse;
		return { code: body.error ?? "unknown", message: body.message ?? "Something went wrong" };
	} catch {
		return { code: "unknown", message: `Request failed (${res.status})` };
	}
}

export function isApiError(result: unknown): result is NotificationApiError {
	return typeof result === "object" && result !== null && "code" in result && "message" in result;
}

export async function loadNotifications(): Promise<void> {
	state.loading = true;
	state.error = null;
	try {
		const [templatesRes, subscriptionsRes] = await Promise.all([
			fetch("/api/custom/notifications/templates"),
			fetch("/api/custom/notifications/subscriptions")
		]);

		if (templatesRes.status === 401 || subscriptionsRes.status === 401) {
			state.forbidden = true;
			return;
		}
		if (templatesRes.status === 403 || subscriptionsRes.status === 403) {
			state.forbidden = true;
			return;
		}

		// Load each list independently — a failure in one (e.g. a pending DB migration for
		// subscriptions) shouldn't blank out the other, which loaded fine on its own.
		let hadError = false;
		if (templatesRes.ok) {
			state.templates = (await templatesRes.json()) as NotificationTemplateDto[];
		} else {
			hadError = true;
		}
		if (subscriptionsRes.ok) {
			state.subscriptions = (await subscriptionsRes.json()) as NotificationSubscriptionDto[];
		} else {
			hadError = true;
		}

		state.forbidden = false;
		state.error = hadError ? "Failed to load some notification data" : null;
		state.loaded = true;
	} catch {
		state.error = "Failed to load notifications";
	} finally {
		state.loading = false;
	}
}

export async function createTemplate(input: {
	name: string;
	embed: EmbedTemplate;
}): Promise<NotificationTemplateDto | NotificationApiError> {
	const res = await fetch("/api/custom/notifications/templates", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationTemplateDto;
	state.templates = [...state.templates, dto];
	return dto;
}

export async function patchTemplate(
	id: number,
	patch: { name?: string; embed?: EmbedTemplate }
): Promise<NotificationTemplateDto | NotificationApiError> {
	const res = await fetch(`/api/custom/notifications/templates/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationTemplateDto;
	state.templates = state.templates.map((t) => (t.id === id ? dto : t));
	return dto;
}

export async function removeTemplate(id: number): Promise<NotificationApiError | null> {
	const res = await fetch(`/api/custom/notifications/templates/${id}`, { method: "DELETE" });
	if (!res.ok && res.status !== 404) return parseError(res);
	state.templates = state.templates.filter((t) => t.id !== id);
	return null;
}

export async function createSubscription(input: {
	name: string;
	templateId?: number | null;
	enabled?: boolean;
	filters: PokemonSubscriptionFilters;
	mode?: SubscriptionMode;
	schedule?: NotificationSchedule | null;
}): Promise<NotificationSubscriptionDto | NotificationApiError> {
	const res = await fetch("/api/custom/notifications/subscriptions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationSubscriptionDto;
	state.subscriptions = [...state.subscriptions, dto];
	return dto;
}

export async function patchSubscription(
	id: number,
	patch: {
		name?: string;
		templateId?: number | null;
		enabled?: boolean;
		filters?: PokemonSubscriptionFilters;
		mode?: SubscriptionMode;
		schedule?: NotificationSchedule | null;
	}
): Promise<NotificationSubscriptionDto | NotificationApiError> {
	const res = await fetch(`/api/custom/notifications/subscriptions/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(patch)
	});
	if (!res.ok) return parseError(res);
	const dto = (await res.json()) as NotificationSubscriptionDto;
	state.subscriptions = state.subscriptions.map((s) => (s.id === id ? dto : s));
	return dto;
}

export async function removeSubscription(id: number): Promise<NotificationApiError | null> {
	const res = await fetch(`/api/custom/notifications/subscriptions/${id}`, { method: "DELETE" });
	if (!res.ok && res.status !== 404) return parseError(res);
	state.subscriptions = state.subscriptions.filter((s) => s.id !== id);
	return null;
}
