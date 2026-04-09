//#region extensions/telegram/src/preview-streaming.ts
function normalizeStreamingMode(value) {
	if (typeof value !== "string") return null;
	return value.trim().toLowerCase() || null;
}
function parseStreamingMode(value) {
	const normalized = normalizeStreamingMode(value);
	if (normalized === "off" || normalized === "partial" || normalized === "block" || normalized === "progress") return normalized;
	return null;
}
function parseTelegramPreviewStreamMode(value) {
	const parsed = parseStreamingMode(value);
	if (!parsed) return null;
	return parsed === "progress" ? "partial" : parsed;
}
function resolveTelegramPreviewStreamMode(params = {}) {
	const parsedStreaming = parseStreamingMode(params.streaming);
	if (parsedStreaming) {
		if (parsedStreaming === "progress") return "partial";
		return parsedStreaming;
	}
	const legacy = parseTelegramPreviewStreamMode(params.streamMode);
	if (legacy) return legacy;
	if (typeof params.streaming === "boolean") return params.streaming ? "partial" : "off";
	return "partial";
}
//#endregion
export { resolveTelegramPreviewStreamMode as t };
