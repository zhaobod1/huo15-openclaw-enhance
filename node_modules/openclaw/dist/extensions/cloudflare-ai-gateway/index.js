import { n as ensureAuthProfileStore } from "../../store-HF_Z-jKz.js";
import { t as normalizeOptionalSecretInput } from "../../normalize-secret-input-DUjA3r3_.js";
import { a as upsertAuthProfile, n as listProfilesForProvider } from "../../profiles-DKQdaSwr.js";
import { t as definePluginEntry } from "../../plugin-entry-9sXOq4uc.js";
import { n as buildApiKeyCredential, t as applyAuthProfileConfig } from "../../provider-auth-helpers-BNggjuMu.js";
import { i as normalizeApiKeyInput, n as ensureApiKeyFromOptionEnvOrPrompt, s as validateApiKeyInput } from "../../provider-auth-input-Cg2BMbzx.js";
import "../../provider-auth-BI9t-Krp.js";
import { n as CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF } from "../../models-CPHOQqea.js";
import { t as buildCloudflareAiGatewayCatalogProvider } from "../../catalog-provider-C3X8rZVp.js";
import { r as buildCloudflareAiGatewayConfigPatch, t as applyCloudflareAiGatewayConfig } from "../../onboard-82Z8vkuG.js";
//#region extensions/cloudflare-ai-gateway/index.ts
const PROVIDER_ID = "cloudflare-ai-gateway";
const PROVIDER_ENV_VAR = "CLOUDFLARE_AI_GATEWAY_API_KEY";
const PROFILE_ID = "cloudflare-ai-gateway:default";
async function resolveCloudflareGatewayMetadataInteractive(ctx) {
	let accountId = ctx.accountId?.trim() ?? "";
	let gatewayId = ctx.gatewayId?.trim() ?? "";
	if (!accountId) {
		const value = await ctx.prompter.text({
			message: "Enter Cloudflare Account ID",
			validate: (val) => String(val ?? "").trim() ? void 0 : "Account ID is required"
		});
		accountId = String(value ?? "").trim();
	}
	if (!gatewayId) {
		const value = await ctx.prompter.text({
			message: "Enter Cloudflare AI Gateway ID",
			validate: (val) => String(val ?? "").trim() ? void 0 : "Gateway ID is required"
		});
		gatewayId = String(value ?? "").trim();
	}
	return {
		accountId,
		gatewayId
	};
}
var cloudflare_ai_gateway_default = definePluginEntry({
	id: PROVIDER_ID,
	name: "Cloudflare AI Gateway Provider",
	description: "Bundled Cloudflare AI Gateway provider plugin",
	register(api) {
		api.registerProvider({
			id: PROVIDER_ID,
			label: "Cloudflare AI Gateway",
			docsPath: "/providers/cloudflare-ai-gateway",
			envVars: ["CLOUDFLARE_AI_GATEWAY_API_KEY"],
			auth: [{
				id: "api-key",
				label: "Cloudflare AI Gateway",
				hint: "Account ID + Gateway ID + API key",
				kind: "api_key",
				wizard: {
					choiceId: "cloudflare-ai-gateway-api-key",
					choiceLabel: "Cloudflare AI Gateway",
					choiceHint: "Account ID + Gateway ID + API key",
					groupId: "cloudflare-ai-gateway",
					groupLabel: "Cloudflare AI Gateway",
					groupHint: "Account ID + Gateway ID + API key"
				},
				run: async (ctx) => {
					const metadata = await resolveCloudflareGatewayMetadataInteractive({
						accountId: normalizeOptionalSecretInput(ctx.opts?.cloudflareAiGatewayAccountId),
						gatewayId: normalizeOptionalSecretInput(ctx.opts?.cloudflareAiGatewayGatewayId),
						prompter: ctx.prompter
					});
					let capturedSecretInput;
					let capturedCredential = false;
					let capturedMode;
					await ensureApiKeyFromOptionEnvOrPrompt({
						token: normalizeOptionalSecretInput(ctx.opts?.cloudflareAiGatewayApiKey),
						tokenProvider: "cloudflare-ai-gateway",
						secretInputMode: ctx.allowSecretRefPrompt === false ? ctx.secretInputMode ?? "plaintext" : ctx.secretInputMode,
						config: ctx.config,
						expectedProviders: [PROVIDER_ID],
						provider: PROVIDER_ID,
						envLabel: PROVIDER_ENV_VAR,
						promptMessage: "Enter Cloudflare AI Gateway API key",
						normalize: normalizeApiKeyInput,
						validate: validateApiKeyInput,
						prompter: ctx.prompter,
						setCredential: async (apiKey, mode) => {
							capturedSecretInput = apiKey;
							capturedCredential = true;
							capturedMode = mode;
						}
					});
					if (!capturedCredential) throw new Error("Missing Cloudflare AI Gateway API key.");
					return {
						profiles: [{
							profileId: PROFILE_ID,
							credential: buildApiKeyCredential(PROVIDER_ID, capturedSecretInput ?? "", {
								accountId: metadata.accountId,
								gatewayId: metadata.gatewayId
							}, capturedMode ? { secretInputMode: capturedMode } : void 0)
						}],
						configPatch: buildCloudflareAiGatewayConfigPatch(metadata),
						defaultModel: CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF
					};
				},
				runNonInteractive: async (ctx) => {
					const authStore = ensureAuthProfileStore(ctx.agentDir, { allowKeychainPrompt: false });
					const storedMetadata = authStore.profiles[PROFILE_ID]?.type === "api_key" ? {
						accountId: authStore.profiles[PROFILE_ID]?.metadata?.accountId?.trim() || void 0,
						gatewayId: authStore.profiles[PROFILE_ID]?.metadata?.gatewayId?.trim() || void 0
					} : {};
					const accountId = normalizeOptionalSecretInput(ctx.opts.cloudflareAiGatewayAccountId) ?? storedMetadata.accountId;
					const gatewayId = normalizeOptionalSecretInput(ctx.opts.cloudflareAiGatewayGatewayId) ?? storedMetadata.gatewayId;
					if (!accountId || !gatewayId) {
						ctx.runtime.error("Cloudflare AI Gateway setup requires --cloudflare-ai-gateway-account-id and --cloudflare-ai-gateway-gateway-id.");
						ctx.runtime.exit(1);
						return null;
					}
					const resolved = await ctx.resolveApiKey({
						provider: PROVIDER_ID,
						flagValue: normalizeOptionalSecretInput(ctx.opts.cloudflareAiGatewayApiKey),
						flagName: "--cloudflare-ai-gateway-api-key",
						envVar: PROVIDER_ENV_VAR
					});
					if (!resolved) return null;
					if (resolved.source !== "profile") {
						const credential = ctx.toApiKeyCredential({
							provider: PROVIDER_ID,
							resolved,
							metadata: {
								accountId,
								gatewayId
							}
						});
						if (!credential) return null;
						upsertAuthProfile({
							profileId: PROFILE_ID,
							credential,
							agentDir: ctx.agentDir
						});
					}
					return applyCloudflareAiGatewayConfig(applyAuthProfileConfig(ctx.config, {
						profileId: PROFILE_ID,
						provider: PROVIDER_ID,
						mode: "api_key"
					}), {
						accountId,
						gatewayId
					});
				}
			}],
			catalog: {
				order: "late",
				run: async (ctx) => {
					const authStore = ensureAuthProfileStore(ctx.agentDir, { allowKeychainPrompt: false });
					const envManagedApiKey = ctx.env[PROVIDER_ENV_VAR]?.trim() ? PROVIDER_ENV_VAR : void 0;
					for (const profileId of listProfilesForProvider(authStore, PROVIDER_ID)) {
						const provider = buildCloudflareAiGatewayCatalogProvider({
							credential: authStore.profiles[profileId],
							envApiKey: envManagedApiKey
						});
						if (!provider) continue;
						return { provider };
					}
					return null;
				}
			},
			classifyFailoverReason: ({ errorMessage }) => /\bworkers?_ai\b.*\b(?:rate|limit|quota)\b/i.test(errorMessage) ? "rate_limit" : void 0
		});
	}
});
//#endregion
export { cloudflare_ai_gateway_default as default };
