import { t as resolvePluginCapabilityProviders } from "./capability-provider-runtime-CMlMeixn.js";
//#region src/realtime-transcription/provider-registry.ts
function trimToUndefined(value) {
	const trimmed = value?.trim().toLowerCase();
	return trimmed ? trimmed : void 0;
}
function normalizeRealtimeTranscriptionProviderId(providerId) {
	return trimToUndefined(providerId);
}
function resolveRealtimeTranscriptionProviderEntries(cfg) {
	return resolvePluginCapabilityProviders({
		key: "realtimeTranscriptionProviders",
		cfg
	});
}
function buildProviderMaps(cfg) {
	const canonical = /* @__PURE__ */ new Map();
	const aliases = /* @__PURE__ */ new Map();
	const register = (provider) => {
		const id = normalizeRealtimeTranscriptionProviderId(provider.id);
		if (!id) return;
		canonical.set(id, provider);
		aliases.set(id, provider);
		for (const alias of provider.aliases ?? []) {
			const normalizedAlias = normalizeRealtimeTranscriptionProviderId(alias);
			if (normalizedAlias) aliases.set(normalizedAlias, provider);
		}
	};
	for (const provider of resolveRealtimeTranscriptionProviderEntries(cfg)) register(provider);
	return {
		canonical,
		aliases
	};
}
function listRealtimeTranscriptionProviders(cfg) {
	return [...buildProviderMaps(cfg).canonical.values()];
}
function getRealtimeTranscriptionProvider(providerId, cfg) {
	const normalized = normalizeRealtimeTranscriptionProviderId(providerId);
	if (!normalized) return;
	return buildProviderMaps(cfg).aliases.get(normalized);
}
function canonicalizeRealtimeTranscriptionProviderId(providerId, cfg) {
	const normalized = normalizeRealtimeTranscriptionProviderId(providerId);
	if (!normalized) return;
	return getRealtimeTranscriptionProvider(normalized, cfg)?.id ?? normalized;
}
//#endregion
export { normalizeRealtimeTranscriptionProviderId as i, getRealtimeTranscriptionProvider as n, listRealtimeTranscriptionProviders as r, canonicalizeRealtimeTranscriptionProviderId as t };
