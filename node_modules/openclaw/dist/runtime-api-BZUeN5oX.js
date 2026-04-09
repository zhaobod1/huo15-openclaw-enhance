import "./runtime-C9er17zX.js";
import "./core-D7mi2qmR.js";
import "./secret-input-D5U3kuko.js";
import { t as createPluginRuntimeStore } from "./runtime-store-Cwr8GGg4.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import "./channel-pairing-DrJTvhRN.js";
import "./status-helpers-ChR3_7qO.js";
import "./webhook-ingress-BwX4VVop.js";
import "./setup-Dp8bIdbL.js";
import "./config-runtime-OuR9WVXH.js";
import "./command-auth-Bpii4TsA.js";
import "./channel-feedback-CG9vt7uF.js";
import "./channel-status-45SWZx-g.js";
//#region extensions/zalo/src/runtime.ts
const { setRuntime: setZaloRuntime, getRuntime: getZaloRuntime } = createPluginRuntimeStore("Zalo runtime not initialized");
//#endregion
export { setZaloRuntime as n, getZaloRuntime as t };
