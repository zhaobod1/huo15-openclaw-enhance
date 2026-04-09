import "./model-selection-BVM4eHHo.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { t as resolvePluginCapabilityProviders } from "./capability-provider-runtime-CMlMeixn.js";
import { n as describeImagesWithModel, t as describeImageWithModel } from "./image-runtime-C6QbxTR_.js";
//#region src/media-understanding/provider-id.ts
function normalizeMediaProviderId(id) {
	const normalized = normalizeProviderId(id);
	if (normalized === "gemini") return "google";
	return normalized;
}
//#endregion
//#region src/media-understanding/entry-capabilities.ts
const MEDIA_CAPABILITIES = [
	"audio",
	"image",
	"video"
];
function isMediaCapability(value) {
	return typeof value === "string" && MEDIA_CAPABILITIES.includes(value);
}
function resolveEntryType(entry) {
	return entry.type ?? (entry.command ? "cli" : "provider");
}
function resolveConfiguredMediaEntryCapabilities(entry) {
	if (!Array.isArray(entry.capabilities)) return;
	const capabilities = entry.capabilities.filter(isMediaCapability);
	return capabilities.length > 0 ? capabilities : void 0;
}
function resolveEffectiveMediaEntryCapabilities(params) {
	const configured = resolveConfiguredMediaEntryCapabilities(params.entry);
	if (configured) return configured;
	if (params.source !== "shared") return;
	if (resolveEntryType(params.entry) === "cli") return;
	const providerId = normalizeMediaProviderId(params.entry.provider ?? "");
	if (!providerId) return;
	return params.providerRegistry.get(providerId)?.capabilities;
}
//#endregion
//#region src/media-understanding/provider-registry.ts
function mergeProviderIntoRegistry(registry, provider) {
	const normalizedKey = normalizeMediaProviderId(provider.id);
	const existing = registry.get(normalizedKey);
	const merged = existing ? {
		...existing,
		...provider,
		capabilities: provider.capabilities ?? existing.capabilities,
		defaultModels: provider.defaultModels ?? existing.defaultModels,
		autoPriority: provider.autoPriority ?? existing.autoPriority,
		nativeDocumentInputs: provider.nativeDocumentInputs ?? existing.nativeDocumentInputs
	} : provider;
	registry.set(normalizedKey, merged);
}
function buildMediaUnderstandingRegistry(overrides, cfg) {
	const registry = /* @__PURE__ */ new Map();
	for (const provider of resolvePluginCapabilityProviders({
		key: "mediaUnderstandingProviders",
		cfg
	})) mergeProviderIntoRegistry(registry, provider);
	const configProviders = cfg?.models?.providers;
	if (configProviders && typeof configProviders === "object") for (const [providerKey, providerCfg] of Object.entries(configProviders)) {
		if (!providerKey?.trim()) continue;
		const normalizedKey = normalizeMediaProviderId(providerKey);
		if (registry.has(normalizedKey)) continue;
		if ((providerCfg.models ?? []).some((m) => Array.isArray(m?.input) && m.input.includes("image"))) mergeProviderIntoRegistry(registry, {
			id: normalizedKey,
			capabilities: ["image"],
			describeImage: describeImageWithModel,
			describeImages: describeImagesWithModel
		});
	}
	if (overrides) for (const [key, provider] of Object.entries(overrides)) {
		const normalizedKey = normalizeMediaProviderId(key);
		const existing = registry.get(normalizedKey);
		const merged = existing ? {
			...existing,
			...provider,
			capabilities: provider.capabilities ?? existing.capabilities,
			defaultModels: provider.defaultModels ?? existing.defaultModels,
			autoPriority: provider.autoPriority ?? existing.autoPriority,
			nativeDocumentInputs: provider.nativeDocumentInputs ?? existing.nativeDocumentInputs
		} : provider;
		registry.set(normalizedKey, merged);
	}
	return registry;
}
function getMediaUnderstandingProvider(id, registry) {
	return registry.get(normalizeMediaProviderId(id));
}
//#endregion
export { normalizeMediaProviderId as a, resolveEffectiveMediaEntryCapabilities as i, getMediaUnderstandingProvider as n, resolveConfiguredMediaEntryCapabilities as r, buildMediaUnderstandingRegistry as t };
