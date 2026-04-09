import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { E as resolveProviderBuiltInModelSuppression } from "./provider-runtime-SgdEL2pb.js";
//#region src/agents/model-suppression.ts
function resolveBuiltInModelSuppression(params) {
	const provider = normalizeProviderId(params.provider?.trim().toLowerCase() ?? "");
	const modelId = params.id?.trim().toLowerCase() ?? "";
	if (!provider || !modelId) return;
	return resolveProviderBuiltInModelSuppression({
		env: process.env,
		context: {
			env: process.env,
			provider,
			modelId
		}
	});
}
function shouldSuppressBuiltInModel(params) {
	return resolveBuiltInModelSuppression(params)?.suppress ?? false;
}
function buildSuppressedBuiltInModelError(params) {
	return resolveBuiltInModelSuppression(params)?.errorMessage;
}
//#endregion
export { shouldSuppressBuiltInModel as n, buildSuppressedBuiltInModelError as t };
