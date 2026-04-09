import { u as normalizeE164 } from "./utils-ms6h9yny.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import "./config-dzPpvDz6.js";
import { o as saveSessionStore } from "./store-Cx4GsUxp.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { n as resolveSessionKey, t as deriveSessionKey } from "./session-key-DqCyICpO.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { i as handlePortError, n as describePortOwner, r as ensurePortAvailable, t as PortInUseError } from "./ports-FcFHBNq5.js";
import { t as applyTemplate } from "./templating-BUvdbX8v.js";
import { t as createDefaultDeps } from "./deps-sT-6fEgQ.js";
import { t as waitForever } from "./wait-DRSTB0tA.js";
//#region src/library.ts
let replyRuntimePromise = null;
let promptRuntimePromise = null;
let binariesRuntimePromise = null;
let execRuntimePromise = null;
let webChannelRuntimePromise = null;
function loadReplyRuntime() {
	replyRuntimePromise ??= import("./reply.runtime-Bcrd5JK-.js");
	return replyRuntimePromise;
}
function loadPromptRuntime() {
	promptRuntimePromise ??= import("./prompt-BGerSdrM.js");
	return promptRuntimePromise;
}
function loadBinariesRuntime() {
	binariesRuntimePromise ??= import("./binaries-cVOPCsDt.js");
	return binariesRuntimePromise;
}
function loadExecRuntime() {
	execRuntimePromise ??= import("./exec-CJa1KGw0.js");
	return execRuntimePromise;
}
function loadWebChannelRuntime() {
	webChannelRuntimePromise ??= import("./runtime-web-channel-plugin-Q5RXB5RI.js");
	return webChannelRuntimePromise;
}
const getReplyFromConfig = async (...args) => (await loadReplyRuntime()).getReplyFromConfig(...args);
const promptYesNo = async (...args) => (await loadPromptRuntime()).promptYesNo(...args);
const ensureBinary = async (...args) => (await loadBinariesRuntime()).ensureBinary(...args);
const runExec = async (...args) => (await loadExecRuntime()).runExec(...args);
const runCommandWithTimeout = async (...args) => (await loadExecRuntime()).runCommandWithTimeout(...args);
const monitorWebChannel = async (...args) => (await loadWebChannelRuntime()).monitorWebChannel(...args);
//#endregion
export { PortInUseError, applyTemplate, createDefaultDeps, deriveSessionKey, describePortOwner, ensureBinary, ensurePortAvailable, getReplyFromConfig, handlePortError, loadConfig, loadSessionStore, monitorWebChannel, normalizeE164, promptYesNo, resolveSessionKey, resolveStorePath, runCommandWithTimeout, runExec, saveSessionStore, waitForever };
