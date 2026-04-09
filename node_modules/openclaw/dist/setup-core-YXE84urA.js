import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { a as createSetupInputPresenceValidator, i as createPatchedAccountSetupAdapter } from "./setup-helpers-BiAtGxsL.js";
import { t as addWildcardAllowFrom } from "./setup-wizard-helpers-ecC16ic3.js";
import { a as createDelegatedSetupWizardProxy } from "./setup-wizard-proxy-CnO9z2dq.js";
import "./setup-Dp8bIdbL.js";
import { i as resolveZaloAccount, r as resolveDefaultZaloAccountId } from "./accounts-Bez10r8d.js";
//#region extensions/zalo/src/setup-core.ts
const channel = "zalo";
const zaloSetupAdapter = createPatchedAccountSetupAdapter({
	channelKey: channel,
	validateInput: createSetupInputPresenceValidator({
		defaultAccountOnlyEnvError: "ZALO_BOT_TOKEN can only be used for the default account.",
		whenNotUseEnv: [{
			someOf: ["token", "tokenFile"],
			message: "Zalo requires token or --token-file (or --use-env)."
		}]
	}),
	buildPatch: (input) => input.useEnv ? {} : input.tokenFile ? { tokenFile: input.tokenFile } : input.token ? { botToken: input.token } : {}
});
const zaloDmPolicy = {
	label: "Zalo",
	channel,
	policyKey: "channels.zalo.dmPolicy",
	allowFromKey: "channels.zalo.allowFrom",
	resolveConfigKeys: (cfg, accountId) => (accountId ?? resolveDefaultZaloAccountId(cfg)) !== "default" ? {
		policyKey: `channels.zalo.accounts.${accountId ?? resolveDefaultZaloAccountId(cfg)}.dmPolicy`,
		allowFromKey: `channels.zalo.accounts.${accountId ?? resolveDefaultZaloAccountId(cfg)}.allowFrom`
	} : {
		policyKey: "channels.zalo.dmPolicy",
		allowFromKey: "channels.zalo.allowFrom"
	},
	getCurrent: (cfg, accountId) => resolveZaloAccount({
		cfg,
		accountId: accountId ?? resolveDefaultZaloAccountId(cfg)
	}).config.dmPolicy ?? "pairing",
	setPolicy: (cfg, policy, accountId) => {
		const resolvedAccountId = accountId && normalizeAccountId(accountId) ? normalizeAccountId(accountId) ?? "default" : resolveDefaultZaloAccountId(cfg);
		const resolved = resolveZaloAccount({
			cfg,
			accountId: resolvedAccountId
		});
		if (resolvedAccountId === "default") return {
			...cfg,
			channels: {
				...cfg.channels,
				zalo: {
					...cfg.channels?.zalo,
					enabled: true,
					dmPolicy: policy,
					...policy === "open" ? { allowFrom: addWildcardAllowFrom(resolved.config.allowFrom) } : {}
				}
			}
		};
		return {
			...cfg,
			channels: {
				...cfg.channels,
				zalo: {
					...cfg.channels?.zalo,
					enabled: true,
					accounts: {
						...cfg.channels?.zalo?.accounts,
						[resolvedAccountId]: {
							...cfg.channels?.zalo?.accounts?.[resolvedAccountId],
							enabled: cfg.channels?.zalo?.accounts?.[resolvedAccountId]?.enabled ?? true,
							dmPolicy: policy,
							...policy === "open" ? { allowFrom: addWildcardAllowFrom(resolved.config.allowFrom) } : {}
						}
					}
				}
			}
		};
	},
	promptAllowFrom: async (params) => (await loadZaloSetupWizard()).dmPolicy?.promptAllowFrom?.(params) ?? params.cfg
};
async function loadZaloSetupWizard() {
	return (await import("./setup-surface-CUYo4xKg.js")).zaloSetupWizard;
}
function createZaloSetupWizardProxy(loadWizard) {
	return createDelegatedSetupWizardProxy({
		channel,
		loadWizard,
		status: {
			configuredLabel: "configured",
			unconfiguredLabel: "needs token",
			configuredHint: "recommended · configured",
			unconfiguredHint: "recommended · newcomer-friendly",
			configuredScore: 1,
			unconfiguredScore: 10
		},
		credentials: [],
		delegateFinalize: true,
		dmPolicy: zaloDmPolicy,
		disable: (cfg) => ({
			...cfg,
			channels: {
				...cfg.channels,
				zalo: {
					...cfg.channels?.zalo,
					enabled: false
				}
			}
		})
	});
}
//#endregion
export { zaloDmPolicy as n, zaloSetupAdapter as r, createZaloSetupWizardProxy as t };
