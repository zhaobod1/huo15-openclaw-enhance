import "./subsystem-CVf5iEWk.js";
import "./provider-model-shared-DUTxdm38.js";
import "./provider-env-vars-DtNkBToj.js";
import "./provider-registry-W8uGvdHN.js";
import "./failover-error-Qb-CdGBo.js";
import "./provider-model-defaults-BZN98D1z.js";
//#region src/plugin-sdk/image-generation-core.ts
let imageGenerationCoreAuthRuntimePromise;
async function loadImageGenerationCoreAuthRuntime() {
	imageGenerationCoreAuthRuntimePromise ??= import("./image-generation-core.auth.runtime-5WIkip-2.js");
	return imageGenerationCoreAuthRuntimePromise;
}
async function resolveApiKeyForProvider(...args) {
	return (await loadImageGenerationCoreAuthRuntime()).resolveApiKeyForProvider(...args);
}
//#endregion
export { resolveApiKeyForProvider as t };
