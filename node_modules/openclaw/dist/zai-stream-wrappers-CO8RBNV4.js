import { r as streamWithPayloadPatch } from "./moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
import { streamSimple } from "@mariozechner/pi-ai";
//#region src/agents/pi-embedded-runner/zai-stream-wrappers.ts
/**
* Inject `tool_stream=true` so tool-call deltas stream in real time.
* Providers can disable this by setting `params.tool_stream=false`.
*/
function createToolStreamWrapper(baseStreamFn, enabled) {
	const underlying = baseStreamFn ?? streamSimple;
	return (model, context, options) => {
		if (!enabled) return underlying(model, context, options);
		return streamWithPayloadPatch(underlying, model, context, options, (payloadObj) => {
			payloadObj.tool_stream = true;
		});
	};
}
const createZaiToolStreamWrapper = createToolStreamWrapper;
//#endregion
export { createZaiToolStreamWrapper as n, createToolStreamWrapper as t };
