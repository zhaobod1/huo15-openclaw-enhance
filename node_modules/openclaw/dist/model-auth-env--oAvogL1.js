import { i as normalizeProviderIdForAuth } from "./provider-id-CUjr7KCR.js";
import { t as getShellEnvAppliedKeys } from "./shell-env-C1EhQ2Cz.js";
import { n as resolvePluginSetupProvider } from "./setup-registry-CLKO_jQP.js";
import { t as normalizeOptionalSecretInput } from "./normalize-secret-input-DUjA3r3_.js";
import { _ as resolveProviderEnvApiKeyCandidates } from "./model-auth-markers-DBBQxeVp.js";
import { getEnvApiKey } from "@mariozechner/pi-ai";
//#region src/agents/model-auth-env.ts
function resolveEnvApiKey(provider, env = process.env) {
	const normalized = normalizeProviderIdForAuth(provider);
	const candidateMap = resolveProviderEnvApiKeyCandidates();
	const applied = new Set(getShellEnvAppliedKeys());
	const pick = (envVar) => {
		const value = normalizeOptionalSecretInput(env[envVar]);
		if (!value) return null;
		return {
			apiKey: value,
			source: applied.has(envVar) ? `shell env: ${envVar}` : `env: ${envVar}`
		};
	};
	const candidates = Object.hasOwn(candidateMap, normalized) ? candidateMap[normalized] : void 0;
	if (Array.isArray(candidates)) for (const envVar of candidates) {
		const resolved = pick(envVar);
		if (resolved) return resolved;
	}
	if (normalized === "google-vertex") {
		const envKey = getEnvApiKey(normalized);
		if (!envKey) return null;
		return {
			apiKey: envKey,
			source: "gcloud adc"
		};
	}
	const setupProvider = resolvePluginSetupProvider({
		provider: normalized,
		env
	});
	if (setupProvider?.resolveConfigApiKey) {
		const resolved = setupProvider.resolveConfigApiKey({
			provider: normalized,
			env
		});
		if (resolved?.trim()) return {
			apiKey: resolved,
			source: resolved === "gcp-vertex-credentials" ? "gcloud adc" : "env"
		};
	}
	return null;
}
//#endregion
export { resolveEnvApiKey as t };
