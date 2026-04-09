import { f as resolveConfigDir } from "./utils-ms6h9yny.js";
import { n as resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir-BobVQuve.js";
import { _ as resolveStateDir } from "./paths-yyDPxM31.js";
import { p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import path from "node:path";
//#region src/media/local-roots.ts
let cachedPreferredTmpDir;
function resolveCachedPreferredTmpDir() {
	if (!cachedPreferredTmpDir) cachedPreferredTmpDir = resolvePreferredOpenClawTmpDir();
	return cachedPreferredTmpDir;
}
function buildMediaLocalRoots(stateDir, configDir, options = {}) {
	const resolvedStateDir = path.resolve(stateDir);
	const resolvedConfigDir = path.resolve(configDir);
	const preferredTmpDir = options.preferredTmpDir ?? resolveCachedPreferredTmpDir();
	return Array.from(new Set([
		preferredTmpDir,
		path.join(resolvedStateDir, "media"),
		path.join(resolvedStateDir, "workspace"),
		path.join(resolvedStateDir, "sandboxes"),
		path.join(resolvedConfigDir, "media")
	]));
}
function getDefaultMediaLocalRoots() {
	return buildMediaLocalRoots(resolveStateDir(), resolveConfigDir());
}
function getAgentScopedMediaLocalRoots(cfg, agentId) {
	const roots = buildMediaLocalRoots(resolveStateDir(), resolveConfigDir());
	if (!agentId?.trim()) return roots;
	const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
	if (!workspaceDir) return roots;
	const normalizedWorkspaceDir = path.resolve(workspaceDir);
	if (!roots.includes(normalizedWorkspaceDir)) roots.push(normalizedWorkspaceDir);
	return roots;
}
/**
* @deprecated Kept for plugin-sdk compatibility. Media sources no longer widen allowed roots.
*/
function appendLocalMediaParentRoots(roots, _mediaSources) {
	return Array.from(new Set(roots.map((root) => path.resolve(root))));
}
function getAgentScopedMediaLocalRootsForSources({ cfg, agentId, mediaSources: _mediaSources }) {
	return getAgentScopedMediaLocalRoots(cfg, agentId);
}
//#endregion
export { getDefaultMediaLocalRoots as a, getAgentScopedMediaLocalRootsForSources as i, buildMediaLocalRoots as n, getAgentScopedMediaLocalRoots as r, appendLocalMediaParentRoots as t };
