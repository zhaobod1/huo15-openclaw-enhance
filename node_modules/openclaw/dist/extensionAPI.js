import { a as resolveAgentDir, p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import { d as ensureAgentWorkspace } from "./workspace-DLW8_PFX.js";
import { S as resolveThinkingDefault } from "./model-selection-BVM4eHHo.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-I0_TmVEm.js";
import { o as saveSessionStore } from "./store-Cx4GsUxp.js";
import "./sessions-D5EF_laP.js";
import { l as resolveStorePath, r as resolveSessionFilePath } from "./paths-UazeViO92.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { n as resolveAgentIdentity } from "./identity-BnWdHPUW.js";
import { t as runEmbeddedPiAgent } from "./pi-embedded-DWASRjxE.js";
import { t as resolveAgentTimeoutMs } from "./timeout-C9RIx1qJ.js";
//#region src/extensionAPI.ts
if (process.env.VITEST !== "true" && process.env.OPENCLAW_SUPPRESS_EXTENSION_API_WARNING !== "1") process.emitWarning("openclaw/extension-api is deprecated. Migrate to api.runtime.agent.* or focused openclaw/plugin-sdk/<subpath> imports. See https://docs.openclaw.ai/plugins/sdk-migration", {
	code: "OPENCLAW_EXTENSION_API_DEPRECATED",
	detail: "This compatibility bridge is temporary. Bundled plugins should use the injected plugin runtime instead of importing host-side agent helpers directly. Migration guide: https://docs.openclaw.ai/plugins/sdk-migration"
});
//#endregion
export { DEFAULT_MODEL, DEFAULT_PROVIDER, ensureAgentWorkspace, loadSessionStore, resolveAgentDir, resolveAgentIdentity, resolveAgentTimeoutMs, resolveAgentWorkspaceDir, resolveSessionFilePath, resolveStorePath, resolveThinkingDefault, runEmbeddedPiAgent, saveSessionStore };
