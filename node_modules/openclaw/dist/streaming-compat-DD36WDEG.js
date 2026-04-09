//#region extensions/slack/src/streaming-compat.ts
function normalizeStreamingMode(value) {
	if (typeof value !== "string") return null;
	return value.trim().toLowerCase() || null;
}
function parseStreamingMode(value) {
	const normalized = normalizeStreamingMode(value);
	if (normalized === "off" || normalized === "partial" || normalized === "block" || normalized === "progress") return normalized;
	return null;
}
function parseSlackLegacyDraftStreamMode(value) {
	const normalized = normalizeStreamingMode(value);
	if (normalized === "replace" || normalized === "status_final" || normalized === "append") return normalized;
	return null;
}
function mapSlackLegacyDraftStreamModeToStreaming(mode) {
	if (mode === "append") return "block";
	if (mode === "status_final") return "progress";
	return "partial";
}
function mapStreamingModeToSlackLegacyDraftStreamMode(mode) {
	if (mode === "block") return "append";
	if (mode === "progress") return "status_final";
	return "replace";
}
function resolveSlackStreamingMode(params = {}) {
	const parsedStreaming = parseStreamingMode(params.streaming);
	if (parsedStreaming) return parsedStreaming;
	const legacyStreamMode = parseSlackLegacyDraftStreamMode(params.streamMode);
	if (legacyStreamMode) return mapSlackLegacyDraftStreamModeToStreaming(legacyStreamMode);
	if (typeof params.streaming === "boolean") return params.streaming ? "partial" : "off";
	return "partial";
}
function resolveSlackNativeStreaming(params = {}) {
	if (typeof params.nativeStreaming === "boolean") return params.nativeStreaming;
	if (typeof params.streaming === "boolean") return params.streaming;
	return true;
}
function formatSlackStreamModeMigrationMessage(pathPrefix, resolvedStreaming) {
	return `Moved ${pathPrefix}.streamMode → ${pathPrefix}.streaming (${resolvedStreaming}).`;
}
function formatSlackStreamingBooleanMigrationMessage(pathPrefix, resolvedNativeStreaming) {
	return `Moved ${pathPrefix}.streaming (boolean) → ${pathPrefix}.nativeStreaming (${resolvedNativeStreaming}).`;
}
//#endregion
export { resolveSlackStreamingMode as a, resolveSlackNativeStreaming as i, formatSlackStreamingBooleanMigrationMessage as n, mapStreamingModeToSlackLegacyDraftStreamMode as r, formatSlackStreamModeMigrationMessage as t };
