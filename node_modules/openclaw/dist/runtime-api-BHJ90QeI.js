import "./json-store-DmPegdww.js";
import "./routing-DdBDhOmH.js";
import "./channel-policy-DIVRdPsQ.js";
import "./channel-targets-BmwNqxOt.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import "./setup-Dp8bIdbL.js";
import "./config-runtime-OuR9WVXH.js";
import "./inbound-reply-dispatch-rMXU9cNH.js";
import "./outbound-media-55sTJsgk.js";
import "./outbound-runtime-BSC4z6CP.js";
import "./ssrf-runtime-DGIvmaoK.js";
import "./media-runtime-BfmVsgHe.js";
import "./conversation-runtime-D-TUyzoB.js";
import "./acp-binding-runtime-B98TaVOl.js";
import "./channel-config-primitives-DiYud7LO.js";
import "./channel-actions-DLDrCW4b.js";
import "./channel-feedback-CG9vt7uF.js";
import "./channel-inbound-bc7z3_ut.js";
import "./channel-status-45SWZx-g.js";
//#region extensions/matrix/src/runtime-api.ts
function buildTimeoutAbortSignal(params) {
	const { timeoutMs, signal } = params;
	if (!timeoutMs && !signal) return {
		signal: void 0,
		cleanup: () => {}
	};
	if (!timeoutMs) return {
		signal,
		cleanup: () => {}
	};
	const controller = new AbortController();
	const timeoutId = setTimeout(controller.abort.bind(controller), timeoutMs);
	const onAbort = () => controller.abort();
	if (signal) if (signal.aborted) controller.abort();
	else signal.addEventListener("abort", onAbort, { once: true });
	return {
		signal: controller.signal,
		cleanup: () => {
			clearTimeout(timeoutId);
			signal?.removeEventListener("abort", onAbort);
		}
	};
}
//#endregion
export { buildTimeoutAbortSignal as t };
