import "./channel-status-45SWZx-g.js";
//#region extensions/slack/src/blocks-input.ts
const SLACK_MAX_BLOCKS = 50;
function parseBlocksJson(raw) {
	try {
		return JSON.parse(raw);
	} catch {
		throw new Error("blocks must be valid JSON");
	}
}
function assertBlocksArray(raw) {
	if (!Array.isArray(raw)) throw new Error("blocks must be an array");
	if (raw.length === 0) throw new Error("blocks must contain at least one block");
	if (raw.length > 50) throw new Error(`blocks cannot exceed 50 items`);
	for (const block of raw) {
		if (!block || typeof block !== "object" || Array.isArray(block)) throw new Error("each block must be an object");
		const type = block.type;
		if (typeof type !== "string" || type.trim().length === 0) throw new Error("each block must include a non-empty string type");
	}
}
function validateSlackBlocksArray(raw) {
	assertBlocksArray(raw);
	return raw;
}
function parseSlackBlocksInput(raw) {
	if (raw == null) return;
	return validateSlackBlocksArray(typeof raw === "string" ? parseBlocksJson(raw) : raw);
}
//#endregion
//#region extensions/slack/src/channel-api.ts
const SLACK_CHANNEL_META = {
	id: "slack",
	label: "Slack",
	selectionLabel: "Slack",
	docsPath: "/channels/slack",
	docsLabel: "slack",
	blurb: "supports bot + app tokens, channels, threads, and interactive replies.",
	systemImage: "number.square",
	markdownCapable: true
};
function getChatChannelMeta(id) {
	if (id !== SLACK_CHANNEL_META.id) throw new Error(`Unsupported Slack channel meta lookup: ${id}`);
	return SLACK_CHANNEL_META;
}
//#endregion
export { validateSlackBlocksArray as i, SLACK_MAX_BLOCKS as n, parseSlackBlocksInput as r, getChatChannelMeta as t };
