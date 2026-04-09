import { f as AUTH_STORE_LOCK_OPTIONS, l as ensureAuthStoreFile, m as log, n as ensureAuthProfileStore, s as saveAuthProfileStore, u as resolveAuthStorePath } from "./store-HF_Z-jKz.js";
import { n as resolveAuthProfileMetadata } from "./identity-JX4QAtGN.js";
import { i as formatProviderAuthProfileApiKeyWithPlugin, n as buildProviderAuthDoctorHintWithPlugin, o as refreshProviderOAuthCredentialWithPlugin } from "./provider-runtime.runtime-B3guMg2J.js";
import "./model-selection-BVM4eHHo.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { d as resolveSecretInputRef, i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import "./config-dzPpvDz6.js";
import { i as withFileLock } from "./file-lock-pcxXyqiN.js";
import "./file-lock-CUt_hrsH.js";
import { i as resolveSecretRefString } from "./resolve-D4yyG1J7.js";
import { a as refreshChutesTokens } from "./chutes-oauth-mi-72iu9.js";
import { h as resolveTokenExpiryState } from "./order-CoOjbg-h.js";
import "./profiles-DKQdaSwr.js";
import { n as suggestOAuthProfileIdForLegacyDefault } from "./repair-C9rOoFG7.js";
import { getOAuthApiKey, getOAuthProviders } from "@mariozechner/pi-ai/oauth";
//#region src/agents/auth-profiles/display.ts
function resolveAuthProfileDisplayLabel(params) {
	const { displayName, email } = resolveAuthProfileMetadata(params);
	if (displayName) return `${params.profileId} (${displayName})`;
	if (email) return `${params.profileId} (${email})`;
	return params.profileId;
}
//#endregion
//#region src/agents/auth-profiles/doctor.ts
/**
* Migration hints for deprecated/removed OAuth providers.
* Users with stale credentials should be guided to migrate.
*/
const DEPRECATED_PROVIDER_MIGRATION_HINTS = { "qwen-portal": "Qwen OAuth via portal.qwen.ai has been deprecated. Please migrate to Qwen Cloud Coding Plan. Run: openclaw onboard --auth-choice qwen-api-key (or qwen-api-key-cn for the China endpoint). Legacy modelstudio auth-choice ids still work." };
async function formatAuthDoctorHint(params) {
	const normalizedProvider = normalizeProviderId(params.provider);
	const migrationHint = DEPRECATED_PROVIDER_MIGRATION_HINTS[normalizedProvider];
	if (migrationHint) return migrationHint;
	const pluginHint = await buildProviderAuthDoctorHintWithPlugin({
		provider: normalizedProvider,
		context: {
			config: params.cfg,
			store: params.store,
			provider: normalizedProvider,
			profileId: params.profileId
		}
	});
	if (typeof pluginHint === "string" && pluginHint.trim()) return pluginHint;
	return "";
}
//#endregion
//#region src/agents/auth-profiles/policy.ts
function pushViolation(violations, profileId, field, reason) {
	violations.push({
		profileId,
		path: `profiles.${profileId}.${field}`,
		reason
	});
}
function hasSecretRefInput(params) {
	return resolveSecretInputRef({
		value: params.value,
		refValue: params.refValue,
		defaults: params.defaults
	}).ref !== null;
}
function collectTypeOAuthSecretRefViolations(params) {
	if (params.credential.type !== "oauth") return;
	const reason = "SecretRef is not allowed for type=\"oauth\" auth profiles (OAuth credentials are runtime-mutable).";
	const record = params.credential;
	for (const field of [
		"access",
		"refresh",
		"token",
		"tokenRef",
		"key",
		"keyRef"
	]) {
		if (coerceSecretRef(record[field], params.defaults) === null) continue;
		pushViolation(params.violations, params.profileId, field, reason);
	}
}
function collectOAuthModeSecretRefViolations(params) {
	if (params.configuredMode !== "oauth") return;
	const reason = `SecretRef is not allowed when auth.profiles.${params.profileId}.mode is "oauth" (OAuth credentials are runtime-mutable).`;
	if (params.credential.type === "api_key") {
		if (hasSecretRefInput({
			value: params.credential.key,
			refValue: params.credential.keyRef,
			defaults: params.defaults
		})) pushViolation(params.violations, params.profileId, "key", reason);
		return;
	}
	if (params.credential.type === "token") {
		if (hasSecretRefInput({
			value: params.credential.token,
			refValue: params.credential.tokenRef,
			defaults: params.defaults
		})) pushViolation(params.violations, params.profileId, "token", reason);
	}
}
function collectOAuthSecretRefPolicyViolations(params) {
	const defaults = params.cfg?.secrets?.defaults;
	const profileFilter = params.profileIds ? new Set(params.profileIds) : null;
	const violations = [];
	for (const [profileId, credential] of Object.entries(params.store.profiles)) {
		if (profileFilter && !profileFilter.has(profileId)) continue;
		collectTypeOAuthSecretRefViolations({
			profileId,
			credential,
			defaults,
			violations
		});
		collectOAuthModeSecretRefViolations({
			profileId,
			credential,
			defaults,
			configuredMode: params.cfg?.auth?.profiles?.[profileId]?.mode,
			violations
		});
	}
	return violations;
}
function assertNoOAuthSecretRefPolicyViolations(params) {
	const violations = collectOAuthSecretRefPolicyViolations(params);
	if (violations.length === 0) return;
	const lines = [`${params.context ?? "auth-profiles"} policy validation failed: OAuth + SecretRef is not supported.`, ...violations.map((violation) => `- ${violation.path}: ${violation.reason}`)];
	throw new Error(lines.join("\n"));
}
//#endregion
//#region src/agents/auth-profiles/oauth.ts
function listOAuthProviderIds() {
	if (typeof getOAuthProviders !== "function") return [];
	const providers = getOAuthProviders();
	if (!Array.isArray(providers)) return [];
	return providers.map((provider) => provider && typeof provider === "object" && "id" in provider && typeof provider.id === "string" ? provider.id : void 0).filter((providerId) => typeof providerId === "string");
}
const OAUTH_PROVIDER_IDS = new Set(listOAuthProviderIds());
const isOAuthProvider = (provider) => OAUTH_PROVIDER_IDS.has(provider);
const resolveOAuthProvider = (provider) => isOAuthProvider(provider) ? provider : null;
/** Bearer-token auth modes that are interchangeable (oauth tokens and raw tokens). */
const BEARER_AUTH_MODES = new Set(["oauth", "token"]);
const isCompatibleModeType = (mode, type) => {
	if (!mode || !type) return false;
	if (mode === type) return true;
	return BEARER_AUTH_MODES.has(mode) && BEARER_AUTH_MODES.has(type);
};
function isProfileConfigCompatible(params) {
	const profileConfig = params.cfg?.auth?.profiles?.[params.profileId];
	if (profileConfig && profileConfig.provider !== params.provider) return false;
	if (profileConfig && !isCompatibleModeType(profileConfig.mode, params.mode)) return false;
	return true;
}
async function buildOAuthApiKey(provider, credentials) {
	const formatted = await formatProviderAuthProfileApiKeyWithPlugin({
		provider,
		context: credentials
	});
	return typeof formatted === "string" && formatted.length > 0 ? formatted : credentials.access;
}
function buildApiKeyProfileResult(params) {
	return {
		apiKey: params.apiKey,
		provider: params.provider,
		email: params.email
	};
}
async function buildOAuthProfileResult(params) {
	return buildApiKeyProfileResult({
		apiKey: await buildOAuthApiKey(params.provider, params.credentials),
		provider: params.provider,
		email: params.email
	});
}
function extractErrorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
function adoptNewerMainOAuthCredential(params) {
	if (!params.agentDir) return null;
	try {
		const mainCred = ensureAuthProfileStore(void 0).profiles[params.profileId];
		if (mainCred?.type === "oauth" && mainCred.provider === params.cred.provider && Number.isFinite(mainCred.expires) && (!Number.isFinite(params.cred.expires) || mainCred.expires > params.cred.expires)) {
			params.store.profiles[params.profileId] = { ...mainCred };
			saveAuthProfileStore(params.store, params.agentDir);
			log.info("adopted newer OAuth credentials from main agent", {
				profileId: params.profileId,
				agentDir: params.agentDir,
				expires: new Date(mainCred.expires).toISOString()
			});
			return mainCred;
		}
	} catch (err) {
		log.debug("adoptNewerMainOAuthCredential failed", {
			profileId: params.profileId,
			error: err instanceof Error ? err.message : String(err)
		});
	}
	return null;
}
async function refreshOAuthTokenWithLock(params) {
	const authPath = resolveAuthStorePath(params.agentDir);
	ensureAuthStoreFile(authPath);
	return await withFileLock(authPath, AUTH_STORE_LOCK_OPTIONS, async () => {
		const store = ensureAuthProfileStore(params.agentDir);
		const cred = store.profiles[params.profileId];
		if (!cred || cred.type !== "oauth") return null;
		if (Date.now() < cred.expires) return {
			apiKey: await buildOAuthApiKey(cred.provider, cred),
			newCredentials: cred
		};
		const pluginRefreshed = await refreshProviderOAuthCredentialWithPlugin({
			provider: cred.provider,
			context: cred
		});
		if (pluginRefreshed) {
			const refreshedCredentials = {
				...cred,
				...pluginRefreshed,
				type: "oauth"
			};
			store.profiles[params.profileId] = refreshedCredentials;
			saveAuthProfileStore(store, params.agentDir);
			return {
				apiKey: await buildOAuthApiKey(cred.provider, refreshedCredentials),
				newCredentials: refreshedCredentials
			};
		}
		const oauthCreds = { [cred.provider]: cred };
		const result = String(cred.provider) === "chutes" ? await (async () => {
			const newCredentials = await refreshChutesTokens({ credential: cred });
			return {
				apiKey: newCredentials.access,
				newCredentials
			};
		})() : await (async () => {
			const oauthProvider = resolveOAuthProvider(cred.provider);
			if (!oauthProvider) return null;
			if (typeof getOAuthApiKey !== "function") return null;
			return await getOAuthApiKey(oauthProvider, oauthCreds);
		})();
		if (!result) return null;
		store.profiles[params.profileId] = {
			...cred,
			...result.newCredentials,
			type: "oauth"
		};
		saveAuthProfileStore(store, params.agentDir);
		return result;
	});
}
async function tryResolveOAuthProfile(params) {
	const { cfg, store, profileId } = params;
	const cred = store.profiles[profileId];
	if (!cred || cred.type !== "oauth") return null;
	if (!isProfileConfigCompatible({
		cfg,
		profileId,
		provider: cred.provider,
		mode: cred.type
	})) return null;
	if (Date.now() < cred.expires) return await buildOAuthProfileResult({
		provider: cred.provider,
		credentials: cred,
		email: cred.email
	});
	const refreshed = await refreshOAuthTokenWithLock({
		profileId,
		agentDir: params.agentDir
	});
	if (!refreshed) return null;
	return buildApiKeyProfileResult({
		apiKey: refreshed.apiKey,
		provider: cred.provider,
		email: cred.email
	});
}
async function resolveProfileSecretString(params) {
	let resolvedValue = params.value?.trim();
	if (resolvedValue) {
		const inlineRef = coerceSecretRef(resolvedValue, params.refDefaults);
		if (inlineRef) try {
			resolvedValue = await resolveSecretRefString(inlineRef, {
				config: params.configForRefResolution,
				env: process.env,
				cache: params.cache
			});
		} catch (err) {
			log.debug(params.inlineFailureMessage, {
				profileId: params.profileId,
				provider: params.provider,
				error: err instanceof Error ? err.message : String(err)
			});
		}
	}
	const explicitRef = coerceSecretRef(params.valueRef, params.refDefaults);
	if (!resolvedValue && explicitRef) try {
		resolvedValue = await resolveSecretRefString(explicitRef, {
			config: params.configForRefResolution,
			env: process.env,
			cache: params.cache
		});
	} catch (err) {
		log.debug(params.refFailureMessage, {
			profileId: params.profileId,
			provider: params.provider,
			error: err instanceof Error ? err.message : String(err)
		});
	}
	return resolvedValue;
}
async function resolveApiKeyForProfile(params) {
	const { cfg, store, profileId } = params;
	const cred = store.profiles[profileId];
	if (!cred) return null;
	if (!isProfileConfigCompatible({
		cfg,
		profileId,
		provider: cred.provider,
		mode: cred.type,
		allowOAuthTokenCompatibility: true
	})) return null;
	const refResolveCache = {};
	const configForRefResolution = cfg ?? loadConfig();
	const refDefaults = configForRefResolution.secrets?.defaults;
	assertNoOAuthSecretRefPolicyViolations({
		store,
		cfg: configForRefResolution,
		profileIds: [profileId],
		context: `auth profile ${profileId}`
	});
	if (cred.type === "api_key") {
		const key = await resolveProfileSecretString({
			profileId,
			provider: cred.provider,
			value: cred.key,
			valueRef: cred.keyRef,
			refDefaults,
			configForRefResolution,
			cache: refResolveCache,
			inlineFailureMessage: "failed to resolve inline auth profile api_key ref",
			refFailureMessage: "failed to resolve auth profile api_key ref"
		});
		if (!key) return null;
		return buildApiKeyProfileResult({
			apiKey: key,
			provider: cred.provider,
			email: cred.email
		});
	}
	if (cred.type === "token") {
		const expiryState = resolveTokenExpiryState(cred.expires);
		if (expiryState === "expired" || expiryState === "invalid_expires") return null;
		const token = await resolveProfileSecretString({
			profileId,
			provider: cred.provider,
			value: cred.token,
			valueRef: cred.tokenRef,
			refDefaults,
			configForRefResolution,
			cache: refResolveCache,
			inlineFailureMessage: "failed to resolve inline auth profile token ref",
			refFailureMessage: "failed to resolve auth profile token ref"
		});
		if (!token) return null;
		return buildApiKeyProfileResult({
			apiKey: token,
			provider: cred.provider,
			email: cred.email
		});
	}
	const oauthCred = adoptNewerMainOAuthCredential({
		store,
		profileId,
		agentDir: params.agentDir,
		cred
	}) ?? cred;
	if (Date.now() < oauthCred.expires) return await buildOAuthProfileResult({
		provider: oauthCred.provider,
		credentials: oauthCred,
		email: oauthCred.email
	});
	try {
		const result = await refreshOAuthTokenWithLock({
			profileId,
			agentDir: params.agentDir
		});
		if (!result) return null;
		return buildApiKeyProfileResult({
			apiKey: result.apiKey,
			provider: cred.provider,
			email: cred.email
		});
	} catch (error) {
		const refreshedStore = ensureAuthProfileStore(params.agentDir);
		const refreshed = refreshedStore.profiles[profileId];
		if (refreshed?.type === "oauth" && Date.now() < refreshed.expires) return await buildOAuthProfileResult({
			provider: refreshed.provider,
			credentials: refreshed,
			email: refreshed.email ?? cred.email
		});
		const fallbackProfileId = suggestOAuthProfileIdForLegacyDefault({
			cfg,
			store: refreshedStore,
			provider: cred.provider,
			legacyProfileId: profileId
		});
		if (fallbackProfileId && fallbackProfileId !== profileId) try {
			const fallbackResolved = await tryResolveOAuthProfile({
				cfg,
				store: refreshedStore,
				profileId: fallbackProfileId,
				agentDir: params.agentDir
			});
			if (fallbackResolved) return fallbackResolved;
		} catch {}
		if (params.agentDir) try {
			const mainCred = ensureAuthProfileStore(void 0).profiles[profileId];
			if (mainCred?.type === "oauth" && Date.now() < mainCred.expires) {
				refreshedStore.profiles[profileId] = { ...mainCred };
				saveAuthProfileStore(refreshedStore, params.agentDir);
				log.info("inherited fresh OAuth credentials from main agent", {
					profileId,
					agentDir: params.agentDir,
					expires: new Date(mainCred.expires).toISOString()
				});
				return await buildOAuthProfileResult({
					provider: mainCred.provider,
					credentials: mainCred,
					email: mainCred.email
				});
			}
		} catch {}
		const message = extractErrorMessage(error);
		const hint = await formatAuthDoctorHint({
			cfg,
			store: refreshedStore,
			provider: cred.provider,
			profileId
		});
		throw new Error(`OAuth token refresh failed for ${cred.provider}: ${message}. Please try again or re-authenticate.` + (hint ? `\n\n${hint}` : ""), { cause: error });
	}
}
//#endregion
export { resolveAuthProfileDisplayLabel as i, assertNoOAuthSecretRefPolicyViolations as n, formatAuthDoctorHint as r, resolveApiKeyForProfile as t };
