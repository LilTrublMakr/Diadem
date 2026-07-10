import { browser } from "$app/environment";

/**
 * Base origin for building absolute share links. Web-only build (no Capacitor
 * native runtime) — always the current page origin.
 */
export function getRootOrigin(): string {
	return browser ? window.location.origin : "";
}
