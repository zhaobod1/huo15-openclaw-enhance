import "./model-selection-BVM4eHHo.js";
import { i as normalizeProviderIdForAuth } from "./provider-id-CUjr7KCR.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { a as normalizePluginsConfig, o as resolveEffectiveEnableState } from "./config-state-CKMpUUgI.js";
//#region src/plugins/provider-auth-choices.ts
function resolveManifestProviderAuthChoices(params) {
	const registry = loadPluginManifestRegistry({
		config: params?.config,
		workspaceDir: params?.workspaceDir,
		env: params?.env
	});
	const normalizedConfig = normalizePluginsConfig(params?.config?.plugins);
	return registry.plugins.flatMap((plugin) => plugin.origin === "workspace" && params?.includeUntrustedWorkspacePlugins === false && !resolveEffectiveEnableState({
		id: plugin.id,
		origin: plugin.origin,
		config: normalizedConfig,
		rootConfig: params?.config
	}).enabled ? [] : (plugin.providerAuthChoices ?? []).map((choice) => ({
		pluginId: plugin.id,
		providerId: choice.provider,
		methodId: choice.method,
		choiceId: choice.choiceId,
		choiceLabel: choice.choiceLabel ?? choice.choiceId,
		...choice.choiceHint ? { choiceHint: choice.choiceHint } : {},
		...choice.assistantPriority !== void 0 ? { assistantPriority: choice.assistantPriority } : {},
		...choice.assistantVisibility ? { assistantVisibility: choice.assistantVisibility } : {},
		...choice.deprecatedChoiceIds ? { deprecatedChoiceIds: choice.deprecatedChoiceIds } : {},
		...choice.groupId ? { groupId: choice.groupId } : {},
		...choice.groupLabel ? { groupLabel: choice.groupLabel } : {},
		...choice.groupHint ? { groupHint: choice.groupHint } : {},
		...choice.optionKey ? { optionKey: choice.optionKey } : {},
		...choice.cliFlag ? { cliFlag: choice.cliFlag } : {},
		...choice.cliOption ? { cliOption: choice.cliOption } : {},
		...choice.cliDescription ? { cliDescription: choice.cliDescription } : {},
		...choice.onboardingScopes ? { onboardingScopes: choice.onboardingScopes } : {}
	})));
}
function resolveManifestProviderAuthChoice(choiceId, params) {
	const normalized = choiceId.trim();
	if (!normalized) return;
	return resolveManifestProviderAuthChoices(params).find((choice) => choice.choiceId === normalized);
}
function resolveManifestProviderApiKeyChoice(params) {
	const normalizedProviderId = normalizeProviderIdForAuth(params.providerId);
	if (!normalizedProviderId) return;
	return resolveManifestProviderAuthChoices(params).find((choice) => {
		if (!choice.optionKey) return false;
		return normalizeProviderIdForAuth(choice.providerId) === normalizedProviderId;
	});
}
function resolveManifestDeprecatedProviderAuthChoice(choiceId, params) {
	const normalized = choiceId.trim();
	if (!normalized) return;
	return resolveManifestProviderAuthChoices(params).find((choice) => choice.deprecatedChoiceIds?.includes(normalized));
}
function resolveManifestProviderOnboardAuthFlags(params) {
	const flags = [];
	const seen = /* @__PURE__ */ new Set();
	for (const choice of resolveManifestProviderAuthChoices(params)) {
		if (!choice.optionKey || !choice.cliFlag || !choice.cliOption) continue;
		const dedupeKey = `${choice.optionKey}::${choice.cliFlag}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);
		flags.push({
			optionKey: choice.optionKey,
			authChoice: choice.choiceId,
			cliFlag: choice.cliFlag,
			cliOption: choice.cliOption,
			description: choice.cliDescription ?? choice.choiceLabel
		});
	}
	return flags;
}
//#endregion
//#region src/commands/auth-choice-legacy.ts
function resolveLegacyCliBackendChoice(choice, params) {
	if (!choice.endsWith("-cli")) return;
	return resolveManifestDeprecatedProviderAuthChoice(choice, params);
}
function resolveReplacementLabel(choiceLabel) {
	return choiceLabel.trim() || "the replacement auth choice";
}
function resolveLegacyAuthChoiceAliasesForCli(params) {
	return resolveManifestProviderAuthChoices(params).flatMap((choice) => choice.deprecatedChoiceIds ?? []).filter((choice) => choice.endsWith("-cli")).toSorted((left, right) => left.localeCompare(right));
}
function normalizeLegacyOnboardAuthChoice(authChoice, params) {
	if (authChoice === "oauth") return "setup-token";
	if (typeof authChoice === "string") {
		const deprecatedChoice = resolveLegacyCliBackendChoice(authChoice, params);
		if (deprecatedChoice) return deprecatedChoice.choiceId;
	}
	return authChoice;
}
function isDeprecatedAuthChoice(authChoice, params) {
	return typeof authChoice === "string" && Boolean(resolveLegacyCliBackendChoice(authChoice, params));
}
function resolveDeprecatedAuthChoiceReplacement(authChoice, params) {
	if (typeof authChoice !== "string") return;
	const deprecatedChoice = resolveLegacyCliBackendChoice(authChoice, params);
	if (!deprecatedChoice) return;
	const replacementLabel = resolveReplacementLabel(deprecatedChoice.choiceLabel);
	return {
		normalized: deprecatedChoice.choiceId,
		message: `Auth choice "${authChoice}" is deprecated; using ${replacementLabel} setup instead.`
	};
}
function formatDeprecatedNonInteractiveAuthChoiceError(authChoice, params) {
	const replacement = resolveDeprecatedAuthChoiceReplacement(authChoice, params);
	if (!replacement) return;
	return [`Auth choice "${authChoice}" is deprecated.`, `Use "--auth-choice ${replacement.normalized}".`].join("\n");
}
//#endregion
export { resolveLegacyAuthChoiceAliasesForCli as a, resolveManifestProviderAuthChoice as c, resolveDeprecatedAuthChoiceReplacement as i, resolveManifestProviderOnboardAuthFlags as l, isDeprecatedAuthChoice as n, resolveManifestDeprecatedProviderAuthChoice as o, normalizeLegacyOnboardAuthChoice as r, resolveManifestProviderApiKeyChoice as s, formatDeprecatedNonInteractiveAuthChoiceError as t };
