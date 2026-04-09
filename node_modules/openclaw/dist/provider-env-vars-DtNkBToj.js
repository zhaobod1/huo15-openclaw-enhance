import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
//#region src/secrets/provider-env-vars.ts
const CORE_PROVIDER_AUTH_ENV_VAR_CANDIDATES = {
	voyage: ["VOYAGE_API_KEY"],
	cerebras: ["CEREBRAS_API_KEY"],
	"anthropic-openai": ["ANTHROPIC_API_KEY"],
	"qwen-dashscope": ["DASHSCOPE_API_KEY"]
};
const CORE_PROVIDER_SETUP_ENV_VAR_OVERRIDES = { "minimax-cn": ["MINIMAX_API_KEY"] };
function appendUniqueEnvVarCandidates(target, providerId, keys) {
	const normalizedProviderId = providerId.trim();
	if (!normalizedProviderId || keys.length === 0) return;
	const bucket = target[normalizedProviderId] ??= [];
	const seen = new Set(bucket);
	for (const key of keys) {
		const normalizedKey = key.trim();
		if (!normalizedKey || seen.has(normalizedKey)) continue;
		seen.add(normalizedKey);
		bucket.push(normalizedKey);
	}
}
function resolveManifestProviderAuthEnvVarCandidates(params) {
	const registry = loadPluginManifestRegistry({
		config: params?.config,
		workspaceDir: params?.workspaceDir,
		env: params?.env
	});
	const candidates = Object.create(null);
	for (const plugin of registry.plugins) {
		if (!plugin.providerAuthEnvVars) continue;
		for (const [providerId, keys] of Object.entries(plugin.providerAuthEnvVars).toSorted(([left], [right]) => left.localeCompare(right))) appendUniqueEnvVarCandidates(candidates, providerId, keys);
	}
	return candidates;
}
function resolveProviderAuthEnvVarCandidates(params) {
	return {
		...resolveManifestProviderAuthEnvVarCandidates(params),
		...CORE_PROVIDER_AUTH_ENV_VAR_CANDIDATES
	};
}
function resolveProviderEnvVars(params) {
	return {
		...resolveProviderAuthEnvVarCandidates(params),
		...CORE_PROVIDER_SETUP_ENV_VAR_OVERRIDES
	};
}
({ ...resolveProviderAuthEnvVarCandidates() });
({ ...resolveProviderEnvVars() });
function getProviderEnvVars(providerId, params) {
	const providerEnvVars = resolveProviderEnvVars(params);
	const envVars = Object.hasOwn(providerEnvVars, providerId) ? providerEnvVars[providerId] : void 0;
	return Array.isArray(envVars) ? [...envVars] : [];
}
const EXTRA_PROVIDER_AUTH_ENV_VARS = ["MINIMAX_CODE_PLAN_KEY", "MINIMAX_CODING_API_KEY"];
function listKnownProviderAuthEnvVarNames(params) {
	return [...new Set([
		...Object.values(resolveProviderAuthEnvVarCandidates(params)).flatMap((keys) => keys),
		...Object.values(resolveProviderEnvVars(params)).flatMap((keys) => keys),
		...EXTRA_PROVIDER_AUTH_ENV_VARS
	])];
}
function listKnownSecretEnvVarNames(params) {
	return [...new Set(Object.values(resolveProviderEnvVars(params)).flatMap((keys) => keys))];
}
function omitEnvKeysCaseInsensitive(baseEnv, keys) {
	const env = { ...baseEnv };
	const denied = /* @__PURE__ */ new Set();
	for (const key of keys) {
		const normalizedKey = key.trim();
		if (normalizedKey) denied.add(normalizedKey.toUpperCase());
	}
	if (denied.size === 0) return env;
	for (const actualKey of Object.keys(env)) if (denied.has(actualKey.toUpperCase())) delete env[actualKey];
	return env;
}
//#endregion
export { resolveProviderAuthEnvVarCandidates as a, omitEnvKeysCaseInsensitive as i, listKnownProviderAuthEnvVarNames as n, listKnownSecretEnvVarNames as r, getProviderEnvVars as t };
