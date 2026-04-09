import "./moonshot-thinking-stream-wrappers-6vUz3Gh-.js";
import "./anthropic-cache-control-payload-CF5lf1Cs.js";
import "./anthropic-payload-policy-DdUEVGSh.js";
import "./zai-stream-wrappers-CO8RBNV4.js";
import "./bedrock-stream-wrappers-DERe20oA.js";
//#region src/plugin-sdk/provider-stream-shared.ts
function composeProviderStreamWrappers(baseStreamFn, ...wrappers) {
	return wrappers.reduce((streamFn, wrapper) => wrapper ? wrapper(streamFn) : streamFn, baseStreamFn);
}
//#endregion
export { composeProviderStreamWrappers as t };
