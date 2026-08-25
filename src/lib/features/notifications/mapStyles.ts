// Rampardos static-map styles are fetched dynamically from the configured [server.staticMap]
// instance's own GET /styles endpoint (see src/lib/server/provider/rampardosStylesProvider.ts) —
// rather than hardcoded here — since the set of installed styles is operator-specific and can
// change without a code change on this app's side.
export type MapStyleOption = {
	id: string;
	label: string;
};
