import { n as resolveAgentModelPrimaryValue, t as resolveAgentModelFallbackValues } from "./model-input-BvHDuFyu.js";
import { t as getProviderEnvVars } from "./provider-env-vars-DtNkBToj.js";
//#region src/media-generation/runtime-shared.ts
function resolveCapabilityModelCandidates(params) {
	const candidates = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (raw) => {
		const parsed = params.parseModelRef(raw);
		if (!parsed) return;
		const key = `${parsed.provider}/${parsed.model}`;
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push(parsed);
	};
	add(params.modelOverride);
	add(resolveAgentModelPrimaryValue(params.modelConfig));
	for (const fallback of resolveAgentModelFallbackValues(params.modelConfig)) add(fallback);
	return candidates;
}
function throwCapabilityGenerationFailure(params) {
	if (params.attempts.length <= 1 && params.lastError) throw params.lastError;
	const summary = params.attempts.length > 0 ? params.attempts.map((attempt) => `${attempt.provider}/${attempt.model}: ${attempt.error}`).join(" | ") : "unknown";
	throw new Error(`All ${params.capabilityLabel} models failed (${params.attempts.length}): ${summary}`, { cause: params.lastError instanceof Error ? params.lastError : void 0 });
}
function buildNoCapabilityModelConfiguredMessage(params) {
	const sampleModel = params.providers.find((provider) => provider.id.trim().length > 0 && provider.defaultModel?.trim());
	const sampleRef = sampleModel ? `${sampleModel.id}/${sampleModel.defaultModel}` : params.fallbackSampleRef ?? "<provider>/<model>";
	const authHints = params.providers.flatMap((provider) => {
		const envVars = getProviderEnvVars(provider.id);
		if (envVars.length === 0) return [];
		return [`${provider.id}: ${envVars.join(" / ")}`];
	}).slice(0, 3);
	return [`No ${params.capabilityLabel} model configured. Set agents.defaults.${params.modelConfigKey}.primary to a provider/model like "${sampleRef}".`, authHints.length > 0 ? `If you want a specific provider, also configure that provider's auth/API key first (${authHints.join("; ")}).` : "If you want a specific provider, also configure that provider's auth/API key first."].join(" ");
}
//#endregion
export { resolveCapabilityModelCandidates as n, throwCapabilityGenerationFailure as r, buildNoCapabilityModelConfiguredMessage as t };
