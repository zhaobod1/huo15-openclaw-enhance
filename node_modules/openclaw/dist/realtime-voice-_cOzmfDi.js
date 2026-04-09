import { t as resolvePluginCapabilityProviders } from "./capability-provider-runtime-CMlMeixn.js";
//#region src/realtime-voice/provider-registry.ts
function trimToUndefined(value) {
	const trimmed = value?.trim().toLowerCase();
	return trimmed ? trimmed : void 0;
}
function normalizeRealtimeVoiceProviderId(providerId) {
	return trimToUndefined(providerId);
}
function resolveRealtimeVoiceProviderEntries(cfg) {
	return resolvePluginCapabilityProviders({
		key: "realtimeVoiceProviders",
		cfg
	});
}
function buildProviderMaps(cfg) {
	const canonical = /* @__PURE__ */ new Map();
	const aliases = /* @__PURE__ */ new Map();
	const register = (provider) => {
		const id = normalizeRealtimeVoiceProviderId(provider.id);
		if (!id) return;
		canonical.set(id, provider);
		aliases.set(id, provider);
		for (const alias of provider.aliases ?? []) {
			const normalizedAlias = normalizeRealtimeVoiceProviderId(alias);
			if (normalizedAlias) aliases.set(normalizedAlias, provider);
		}
	};
	for (const provider of resolveRealtimeVoiceProviderEntries(cfg)) register(provider);
	return {
		canonical,
		aliases
	};
}
function listRealtimeVoiceProviders(cfg) {
	return [...buildProviderMaps(cfg).canonical.values()];
}
function getRealtimeVoiceProvider(providerId, cfg) {
	const normalized = normalizeRealtimeVoiceProviderId(providerId);
	if (!normalized) return;
	return buildProviderMaps(cfg).aliases.get(normalized);
}
function canonicalizeRealtimeVoiceProviderId(providerId, cfg) {
	const normalized = normalizeRealtimeVoiceProviderId(providerId);
	if (!normalized) return;
	return getRealtimeVoiceProvider(normalized, cfg)?.id ?? normalized;
}
//#endregion
export { normalizeRealtimeVoiceProviderId as i, getRealtimeVoiceProvider as n, listRealtimeVoiceProviders as r, canonicalizeRealtimeVoiceProviderId as t };
