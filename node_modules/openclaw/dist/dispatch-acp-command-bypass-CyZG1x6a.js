import { a as isCommandEnabled, f as maybeResolveTextAlias, y as shouldHandleTextCommands } from "./commands-registry-CyAozniN.js";
//#region src/auto-reply/reply/dispatch-acp-command-bypass.ts
function resolveFirstContextText(ctx, keys) {
	for (const key of keys) {
		const value = ctx[key];
		if (typeof value === "string") return value;
	}
	return "";
}
function resolveCommandCandidateText(ctx) {
	return resolveFirstContextText(ctx, [
		"CommandBody",
		"BodyForCommands",
		"RawBody",
		"Body"
	]).trim();
}
function shouldBypassAcpDispatchForCommand(ctx, cfg) {
	const candidate = resolveCommandCandidateText(ctx);
	if (!candidate) return false;
	const normalized = candidate.trim();
	const allowTextCommands = shouldHandleTextCommands({
		cfg,
		surface: ctx.Surface ?? ctx.Provider ?? "",
		commandSource: ctx.CommandSource
	});
	if (!normalized.startsWith("/") && maybeResolveTextAlias(candidate, cfg) != null) return allowTextCommands;
	if (!normalized.startsWith("!")) return false;
	if (!ctx.CommandAuthorized) return false;
	if (!isCommandEnabled(cfg, "bash")) return false;
	return allowTextCommands;
}
//#endregion
export { shouldBypassAcpDispatchForCommand };
