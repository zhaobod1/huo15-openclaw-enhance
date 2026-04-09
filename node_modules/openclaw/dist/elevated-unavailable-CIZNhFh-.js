import { r as normalizeChannelId, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
//#region src/auto-reply/reply/group-id.ts
function extractExplicitGroupId(raw) {
	const trimmed = (raw ?? "").trim();
	if (!trimmed) return;
	const parts = trimmed.split(":").filter(Boolean);
	if (parts.length >= 3 && (parts[1] === "group" || parts[1] === "channel")) return parts.slice(2).join(":").replace(/:topic:.*$/, "") || void 0;
	if (parts.length >= 2 && (parts[0] === "group" || parts[0] === "channel")) return parts.slice(1).join(":").replace(/:topic:.*$/, "") || void 0;
	const channelId = normalizeChannelId(parts[0] ?? "") ?? parts[0]?.trim().toLowerCase();
	const parsed = channelId ? getChannelPlugin(channelId)?.messaging?.parseExplicitTarget?.({ raw: trimmed }) : null;
	if (parsed && parsed.chatType && parsed.chatType !== "direct") return parsed.to.replace(/:topic:.*$/, "") || void 0;
}
//#endregion
//#region src/auto-reply/reply/elevated-unavailable.ts
function formatElevatedUnavailableMessage(params) {
	const lines = [];
	lines.push(`elevated is not available right now (runtime=${params.runtimeSandboxed ? "sandboxed" : "direct"}).`);
	if (params.failures.length > 0) lines.push(`Failing gates: ${params.failures.map((f) => `${f.gate} (${f.key})`).join(", ")}`);
	else lines.push("Failing gates: enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled), allowFrom (tools.elevated.allowFrom.<provider>).");
	lines.push("Fix-it keys:");
	lines.push("- tools.elevated.enabled");
	lines.push("- tools.elevated.allowFrom.<provider>");
	lines.push("- agents.list[].tools.elevated.enabled");
	lines.push("- agents.list[].tools.elevated.allowFrom.<provider>");
	if (params.sessionKey) lines.push(`See: ${formatCliCommand(`openclaw sandbox explain --session ${params.sessionKey}`)}`);
	return lines.join("\n");
}
//#endregion
export { extractExplicitGroupId as n, formatElevatedUnavailableMessage as t };
