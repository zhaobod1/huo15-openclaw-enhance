import { m as resolveUserPath } from "./utils-ms6h9yny.js";
import { i as resolveRuntimePluginRegistry } from "./loader-BkajlJCF.js";
import { n as registerContextEngineForOwner } from "./registry-BCBwbTTA.js";
import { t as delegateCompactionToRuntime } from "./delegate-YbaLRmDx.js";
//#region src/context-engine/legacy.ts
/**
* LegacyContextEngine wraps the existing compaction behavior behind the
* ContextEngine interface, preserving 100% backward compatibility.
*
* - ingest: no-op (SessionManager handles message persistence)
* - assemble: pass-through (existing sanitize/validate/limit pipeline in attempt.ts handles this)
* - compact: delegates to compactEmbeddedPiSessionDirect
*/
var LegacyContextEngine = class {
	constructor() {
		this.info = {
			id: "legacy",
			name: "Legacy Context Engine",
			version: "1.0.0"
		};
	}
	async ingest(_params) {
		return { ingested: false };
	}
	async assemble(params) {
		return {
			messages: params.messages,
			estimatedTokens: 0
		};
	}
	async afterTurn(_params) {}
	async compact(params) {
		return await delegateCompactionToRuntime(params);
	}
	async dispose() {}
};
function registerLegacyContextEngine() {
	registerContextEngineForOwner("legacy", () => new LegacyContextEngine(), "core", { allowSameOwnerRefresh: true });
}
//#endregion
//#region src/context-engine/init.ts
/**
* Ensures all built-in context engines are registered exactly once.
*
* The legacy engine is always registered as a safe fallback so that
* `resolveContextEngine()` can resolve the default "legacy" slot without
* callers needing to remember manual registration.
*
* Additional engines are registered by their own plugins via
* `api.registerContextEngine()` during plugin load.
*/
let initialized = false;
function ensureContextEnginesInitialized() {
	if (initialized) return;
	initialized = true;
	registerLegacyContextEngine();
}
//#endregion
//#region src/agents/runtime-plugins.ts
function ensureRuntimePluginsLoaded(params) {
	const workspaceDir = typeof params.workspaceDir === "string" && params.workspaceDir.trim() ? resolveUserPath(params.workspaceDir) : void 0;
	resolveRuntimePluginRegistry({
		config: params.config,
		workspaceDir,
		runtimeOptions: params.allowGatewaySubagentBinding ? { allowGatewaySubagentBinding: true } : void 0
	});
}
//#endregion
export { ensureContextEnginesInitialized as n, ensureRuntimePluginsLoaded as t };
