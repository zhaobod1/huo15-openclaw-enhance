import { o as normalizeTokenProviderInput } from "./provider-auth-input-Cg2BMbzx.js";
import { c as resolveManifestProviderAuthChoice, r as normalizeLegacyOnboardAuthChoice, s as resolveManifestProviderApiKeyChoice } from "./auth-choice-legacy-DYXYTQpj.js";
import "./auth-choice.apply-helpers-DnGqB8-F.js";
//#region src/commands/auth-choice.apply.api-providers.ts
function normalizeApiKeyTokenProviderAuthChoice(params) {
	if (!params.tokenProvider) return params.authChoice;
	const normalizedTokenProvider = normalizeTokenProviderInput(params.tokenProvider);
	if (!normalizedTokenProvider) return params.authChoice;
	if ((params.authChoice === "token" || params.authChoice === "setup-token") && normalizedTokenProvider === "anthropic") return "setup-token";
	if (params.authChoice !== "apiKey") return params.authChoice;
	return resolveManifestProviderApiKeyChoice({
		providerId: normalizedTokenProvider,
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	})?.choiceId ?? params.authChoice;
}
async function applyAuthChoiceApiProviders(_params) {
	return null;
}
//#endregion
//#region src/plugins/provider-auth-choice-preference.ts
function normalizeLegacyAuthChoice(choice, env) {
	return normalizeLegacyOnboardAuthChoice(choice, { env }) ?? choice;
}
async function resolvePreferredProviderForAuthChoice(params) {
	const choice = normalizeLegacyAuthChoice(params.choice, params.env) ?? params.choice;
	const manifestResolved = resolveManifestProviderAuthChoice(choice, params);
	if (manifestResolved) return manifestResolved.providerId;
	const { resolveProviderPluginChoice, resolvePluginProviders } = await import("./provider-auth-choice.runtime-BngMur4l.js");
	const pluginResolved = resolveProviderPluginChoice({
		providers: resolvePluginProviders({
			config: params.config,
			workspaceDir: params.workspaceDir,
			env: params.env,
			mode: "setup"
		}),
		choice
	});
	if (pluginResolved) return pluginResolved.provider.id;
	if (choice === "custom-api-key") return "custom";
}
//#endregion
export { applyAuthChoiceApiProviders as n, normalizeApiKeyTokenProviderAuthChoice as r, resolvePreferredProviderForAuthChoice as t };
