import "./core-D7mi2qmR.js";
import { t as createPluginRuntimeStore } from "./runtime-store-Cwr8GGg4.js";
import "./status-helpers-ChR3_7qO.js";
import "./inbound-reply-dispatch-rMXU9cNH.js";
//#region extensions/qa-channel/src/runtime.ts
const { setRuntime: setQaChannelRuntime, getRuntime: getQaChannelRuntime } = createPluginRuntimeStore("QA channel runtime not initialized");
//#endregion
export { setQaChannelRuntime as n, getQaChannelRuntime as t };
