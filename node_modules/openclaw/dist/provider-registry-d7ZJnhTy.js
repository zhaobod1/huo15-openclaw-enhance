import { t as isBlockedObjectKey } from "./prototype-keys-DxnN-2X5.js";
import "./model-selection-BVM4eHHo.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { t as resolvePluginCapabilityProviders } from "./capability-provider-runtime-CMlMeixn.js";
//#region src/video-generation/model-ref.ts
function parseVideoGenerationModelRef(raw) {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	const slashIndex = trimmed.indexOf("/");
	if (slashIndex <= 0 || slashIndex === trimmed.length - 1) return null;
	return {
		provider: trimmed.slice(0, slashIndex).trim(),
		model: trimmed.slice(slashIndex + 1).trim()
	};
}
//#endregion
//#region src/video-generation/provider-registry.ts
const BUILTIN_VIDEO_GENERATION_PROVIDERS = [];
const UNSAFE_PROVIDER_IDS = new Set([
	"__proto__",
	"constructor",
	"prototype"
]);
function normalizeVideoGenerationProviderId(id) {
	const normalized = normalizeProviderId(id ?? "");
	if (!normalized || isBlockedObjectKey(normalized)) return;
	return normalized;
}
function isSafeVideoGenerationProviderId(id) {
	return Boolean(id && !UNSAFE_PROVIDER_IDS.has(id));
}
function resolvePluginVideoGenerationProviders(cfg) {
	return resolvePluginCapabilityProviders({
		key: "videoGenerationProviders",
		cfg
	});
}
function buildProviderMaps(cfg) {
	const canonical = /* @__PURE__ */ new Map();
	const aliases = /* @__PURE__ */ new Map();
	const register = (provider) => {
		const id = normalizeVideoGenerationProviderId(provider.id);
		if (!isSafeVideoGenerationProviderId(id)) return;
		canonical.set(id, provider);
		aliases.set(id, provider);
		for (const alias of provider.aliases ?? []) {
			const normalizedAlias = normalizeVideoGenerationProviderId(alias);
			if (isSafeVideoGenerationProviderId(normalizedAlias)) aliases.set(normalizedAlias, provider);
		}
	};
	for (const provider of BUILTIN_VIDEO_GENERATION_PROVIDERS) register(provider);
	for (const provider of resolvePluginVideoGenerationProviders(cfg)) register(provider);
	return {
		canonical,
		aliases
	};
}
function listVideoGenerationProviders(cfg) {
	return [...buildProviderMaps(cfg).canonical.values()];
}
function getVideoGenerationProvider(providerId, cfg) {
	const normalized = normalizeVideoGenerationProviderId(providerId);
	if (!normalized) return;
	return buildProviderMaps(cfg).aliases.get(normalized);
}
//#endregion
export { listVideoGenerationProviders as n, parseVideoGenerationModelRef as r, getVideoGenerationProvider as t };
