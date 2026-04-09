import { r as listSpeechProviders } from "./provider-registry-CHP3aTWp.js";
//#region src/tts/directives.ts
function buildProviderOrder(left, right) {
	const leftOrder = left.autoSelectOrder ?? Number.MAX_SAFE_INTEGER;
	const rightOrder = right.autoSelectOrder ?? Number.MAX_SAFE_INTEGER;
	if (leftOrder !== rightOrder) return leftOrder - rightOrder;
	return left.id.localeCompare(right.id);
}
function resolveDirectiveProviders(options) {
	if (options?.providers) return [...options.providers].toSorted(buildProviderOrder);
	return listSpeechProviders(options?.cfg).toSorted(buildProviderOrder);
}
function resolveDirectiveProviderConfig(provider, options) {
	return options?.providerConfigs?.[provider.id];
}
function parseTtsDirectives(text, policy, options) {
	if (!policy.enabled) return {
		cleanedText: text,
		overrides: {},
		warnings: [],
		hasDirective: false
	};
	const providers = resolveDirectiveProviders(options);
	const overrides = {};
	const warnings = [];
	let cleanedText = text;
	let hasDirective = false;
	cleanedText = cleanedText.replace(/\[\[tts:text\]\]([\s\S]*?)\[\[\/tts:text\]\]/gi, (_match, inner) => {
		hasDirective = true;
		if (policy.allowText && overrides.ttsText == null) overrides.ttsText = inner.trim();
		return "";
	});
	cleanedText = cleanedText.replace(/\[\[tts:([^\]]+)\]\]/gi, (_match, body) => {
		hasDirective = true;
		const tokens = body.split(/\s+/).filter(Boolean);
		for (const token of tokens) {
			const eqIndex = token.indexOf("=");
			if (eqIndex === -1) continue;
			const rawKey = token.slice(0, eqIndex).trim();
			const rawValue = token.slice(eqIndex + 1).trim();
			if (!rawKey || !rawValue) continue;
			const key = rawKey.toLowerCase();
			if (key === "provider") {
				if (policy.allowProvider) {
					const providerId = rawValue.trim().toLowerCase();
					if (providerId) overrides.provider = providerId;
					else warnings.push("invalid provider id");
				}
				continue;
			}
			let handled = false;
			for (const provider of providers) {
				const parsed = provider.parseDirectiveToken?.({
					key,
					value: rawValue,
					policy,
					providerConfig: resolveDirectiveProviderConfig(provider, options),
					currentOverrides: overrides.providerOverrides?.[provider.id]
				});
				if (!parsed?.handled) continue;
				handled = true;
				if (parsed.overrides) overrides.providerOverrides = {
					...overrides.providerOverrides,
					[provider.id]: {
						...overrides.providerOverrides?.[provider.id],
						...parsed.overrides
					}
				};
				if (parsed.warnings?.length) warnings.push(...parsed.warnings);
				break;
			}
			if (!handled) continue;
		}
		return "";
	});
	return {
		cleanedText,
		ttsText: overrides.ttsText,
		hasDirective,
		overrides,
		warnings
	};
}
//#endregion
export { parseTtsDirectives as t };
