import { m as resolveUserPath } from "./utils-ms6h9yny.js";
import { p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import { i as isAvatarHttpUrl, o as isPathWithinRoot, r as isAvatarDataUrl, s as isSupportedLocalAvatarExtension } from "./avatar-policy-BCnKqB6F.js";
import { n as resolveAgentIdentity } from "./identity-BnWdHPUW.js";
import { n as loadAgentIdentityFromWorkspace } from "./identity-file-D-SmcuiG.js";
import fs from "node:fs";
import path from "node:path";
//#region src/agents/identity-avatar.ts
function normalizeAvatarValue(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}
function resolveAvatarSource(cfg, agentId, opts) {
	if (opts?.includeUiOverride) {
		const fromUiConfig = normalizeAvatarValue(cfg.ui?.assistant?.avatar);
		if (fromUiConfig) return fromUiConfig;
	}
	const fromConfig = normalizeAvatarValue(resolveAgentIdentity(cfg, agentId)?.avatar);
	if (fromConfig) return fromConfig;
	return normalizeAvatarValue(loadAgentIdentityFromWorkspace(resolveAgentWorkspaceDir(cfg, agentId))?.avatar);
}
function resolveExistingPath(value) {
	try {
		return fs.realpathSync(value);
	} catch {
		return path.resolve(value);
	}
}
function resolveLocalAvatarPath(params) {
	const workspaceRoot = resolveExistingPath(params.workspaceDir);
	const raw = params.raw;
	const realPath = resolveExistingPath(raw.startsWith("~") || path.isAbsolute(raw) ? resolveUserPath(raw) : path.resolve(workspaceRoot, raw));
	if (!isPathWithinRoot(workspaceRoot, realPath)) return {
		ok: false,
		reason: "outside_workspace"
	};
	if (!isSupportedLocalAvatarExtension(realPath)) return {
		ok: false,
		reason: "unsupported_extension"
	};
	try {
		const stat = fs.statSync(realPath);
		if (!stat.isFile()) return {
			ok: false,
			reason: "missing"
		};
		if (stat.size > 2097152) return {
			ok: false,
			reason: "too_large"
		};
	} catch {
		return {
			ok: false,
			reason: "missing"
		};
	}
	return {
		ok: true,
		filePath: realPath
	};
}
function resolveAgentAvatar(cfg, agentId, opts) {
	const source = resolveAvatarSource(cfg, agentId, opts);
	if (!source) return {
		kind: "none",
		reason: "missing"
	};
	if (isAvatarHttpUrl(source)) return {
		kind: "remote",
		url: source
	};
	if (isAvatarDataUrl(source)) return {
		kind: "data",
		url: source
	};
	const resolved = resolveLocalAvatarPath({
		raw: source,
		workspaceDir: resolveAgentWorkspaceDir(cfg, agentId)
	});
	if (!resolved.ok) return {
		kind: "none",
		reason: resolved.reason
	};
	return {
		kind: "local",
		filePath: resolved.filePath
	};
}
//#endregion
export { resolveAgentAvatar as t };
