import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { l as normalizeSecretInputString } from "./types.secrets-BZdSA8i7.js";
import { t as applyAccountNameToChannelSection, u as prepareScopedSetupConfig } from "./setup-helpers-BiAtGxsL.js";
import "./routing-DdBDhOmH.js";
import "./setup-Dp8bIdbL.js";
import { o as getMatrixScopedEnvVarNames } from "./account-selection-BneLmcra.js";
import { t as updateMatrixAccountConfig } from "./config-update-D6jgCQhg.js";
import { i as isSupportedMatrixAvatarSource } from "./profile-DrRaSDaF.js";
//#region extensions/matrix/src/setup-contract.ts
const matrixSingleAccountKeysToMove = [
	"deviceId",
	"avatarUrl",
	"initialSyncLimit",
	"encryption",
	"allowlistOnly",
	"allowBots",
	"blockStreaming",
	"replyToMode",
	"threadReplies",
	"textChunkLimit",
	"chunkMode",
	"responsePrefix",
	"ackReaction",
	"ackReactionScope",
	"reactionNotifications",
	"threadBindings",
	"startupVerification",
	"startupVerificationCooldownHours",
	"mediaMaxMb",
	"autoJoin",
	"autoJoinAllowlist",
	"dm",
	"groups",
	"rooms",
	"actions"
];
const matrixNamedAccountPromotionKeys = [
	"name",
	"homeserver",
	"userId",
	"accessToken",
	"password",
	"deviceId",
	"deviceName",
	"avatarUrl",
	"initialSyncLimit",
	"encryption"
];
const singleAccountKeysToMove = [...matrixSingleAccountKeysToMove];
const namedAccountPromotionKeys = [...matrixNamedAccountPromotionKeys];
function resolveSingleAccountPromotionTarget(params) {
	const accounts = typeof params.channel.accounts === "object" && params.channel.accounts ? params.channel.accounts : {};
	const normalizedDefaultAccount = typeof params.channel.defaultAccount === "string" && params.channel.defaultAccount.trim() ? normalizeAccountId(params.channel.defaultAccount) : void 0;
	const matchedAccountId = normalizedDefaultAccount ? Object.entries(accounts).find(([accountId, value]) => accountId && value && typeof value === "object" && normalizeAccountId(accountId) === normalizedDefaultAccount)?.[0] : void 0;
	if (matchedAccountId) return matchedAccountId;
	if (normalizedDefaultAccount) return DEFAULT_ACCOUNT_ID;
	const namedAccounts = Object.entries(accounts).filter(([accountId, value]) => accountId && typeof value === "object" && value);
	if (namedAccounts.length === 1) return namedAccounts[0][0];
	if (namedAccounts.length > 1 && accounts["default"] && typeof accounts["default"] === "object") return DEFAULT_ACCOUNT_ID;
	return DEFAULT_ACCOUNT_ID;
}
//#endregion
//#region extensions/matrix/src/matrix/client/env-auth.ts
function clean(value) {
	return typeof value === "string" ? value.trim() : "";
}
function resolveGlobalMatrixEnvConfig(env) {
	return {
		homeserver: clean(env.MATRIX_HOMESERVER),
		userId: clean(env.MATRIX_USER_ID),
		accessToken: clean(env.MATRIX_ACCESS_TOKEN) || void 0,
		password: clean(env.MATRIX_PASSWORD) || void 0,
		deviceId: clean(env.MATRIX_DEVICE_ID) || void 0,
		deviceName: clean(env.MATRIX_DEVICE_NAME) || void 0
	};
}
function resolveScopedMatrixEnvConfig(accountId, env = process.env) {
	const keys = getMatrixScopedEnvVarNames(accountId);
	return {
		homeserver: clean(env[keys.homeserver]),
		userId: clean(env[keys.userId]),
		accessToken: clean(env[keys.accessToken]) || void 0,
		password: clean(env[keys.password]) || void 0,
		deviceId: clean(env[keys.deviceId]) || void 0,
		deviceName: clean(env[keys.deviceName]) || void 0
	};
}
function hasReadyMatrixEnvAuth(config) {
	const homeserver = clean(config.homeserver);
	const userId = clean(config.userId);
	const accessToken = clean(config.accessToken);
	const password = clean(config.password);
	return Boolean(homeserver && (accessToken || userId && password));
}
function resolveMatrixEnvAuthReadiness(accountId, env = process.env) {
	const normalizedAccountId = normalizeAccountId(accountId);
	const scoped = resolveScopedMatrixEnvConfig(normalizedAccountId, env);
	if (normalizedAccountId !== "default") {
		const keys = getMatrixScopedEnvVarNames(normalizedAccountId);
		return {
			ready: hasReadyMatrixEnvAuth(scoped),
			homeserver: scoped.homeserver || void 0,
			userId: scoped.userId || void 0,
			sourceHint: `${keys.homeserver} (+ auth vars)`,
			missingMessage: `Set per-account env vars for "${normalizedAccountId}" (for example ${keys.homeserver} + ${keys.accessToken} or ${keys.userId} + ${keys.password}).`
		};
	}
	const defaultScoped = resolveScopedMatrixEnvConfig(DEFAULT_ACCOUNT_ID, env);
	const global = resolveGlobalMatrixEnvConfig(env);
	const defaultKeys = getMatrixScopedEnvVarNames(DEFAULT_ACCOUNT_ID);
	return {
		ready: hasReadyMatrixEnvAuth(defaultScoped) || hasReadyMatrixEnvAuth(global),
		homeserver: defaultScoped.homeserver || global.homeserver || void 0,
		userId: defaultScoped.userId || global.userId || void 0,
		sourceHint: "MATRIX_* or MATRIX_DEFAULT_*",
		missingMessage: `Set Matrix env vars for the default account (for example MATRIX_HOMESERVER + MATRIX_ACCESS_TOKEN, MATRIX_USER_ID + MATRIX_PASSWORD, or ${defaultKeys.homeserver} + ${defaultKeys.accessToken}).`
	};
}
//#endregion
//#region extensions/matrix/src/setup-config.ts
const channel$1 = "matrix";
const COMMON_SINGLE_ACCOUNT_KEYS_TO_MOVE = new Set([
	"name",
	"enabled",
	"httpPort",
	"webhookPath",
	"webhookUrl",
	"webhookSecret",
	"service",
	"region",
	"homeserver",
	"userId",
	"accessToken",
	"password",
	"deviceName",
	"url",
	"code",
	"dmPolicy",
	"allowFrom",
	"groupPolicy",
	"groupAllowFrom",
	"defaultTo"
]);
const MATRIX_SINGLE_ACCOUNT_KEYS_TO_MOVE = new Set(matrixSingleAccountKeysToMove);
const MATRIX_NAMED_ACCOUNT_PROMOTION_KEYS = new Set(matrixNamedAccountPromotionKeys);
function cloneIfObject(value) {
	if (value && typeof value === "object") return structuredClone(value);
	return value;
}
function resolveSetupAvatarUrl(input) {
	const avatarUrl = input.avatarUrl;
	if (typeof avatarUrl !== "string") return;
	return avatarUrl.trim() || void 0;
}
function resolveExistingMatrixAccountKey(accounts, targetAccountId) {
	const normalizedTargetAccountId = normalizeAccountId(targetAccountId);
	return Object.keys(accounts).find((accountId) => normalizeAccountId(accountId) === normalizedTargetAccountId) ?? targetAccountId;
}
function moveSingleMatrixAccountConfigToNamedAccount(cfg) {
	const baseConfig = cfg.channels?.[channel$1];
	const base = typeof baseConfig === "object" && baseConfig ? baseConfig : void 0;
	if (!base) return cfg;
	const accounts = typeof base.accounts === "object" && base.accounts ? base.accounts : {};
	const hasNamedAccounts = Object.keys(accounts).filter(Boolean).length > 0;
	const keysToMove = Object.entries(base).filter(([key, value]) => {
		if (key === "accounts" || key === "enabled" || value === void 0) return false;
		if (!COMMON_SINGLE_ACCOUNT_KEYS_TO_MOVE.has(key) && !MATRIX_SINGLE_ACCOUNT_KEYS_TO_MOVE.has(key)) return false;
		if (hasNamedAccounts && !MATRIX_NAMED_ACCOUNT_PROMOTION_KEYS.has(key)) return false;
		return true;
	}).map(([key]) => key);
	if (keysToMove.length === 0) return cfg;
	const resolvedTargetAccountId = resolveExistingMatrixAccountKey(accounts, resolveSingleAccountPromotionTarget({ channel: base }));
	const nextAccount = { ...accounts[resolvedTargetAccountId] ?? {} };
	for (const key of keysToMove) nextAccount[key] = cloneIfObject(base[key]);
	const nextChannel = { ...base };
	for (const key of keysToMove) delete nextChannel[key];
	return {
		...cfg,
		channels: {
			...cfg.channels,
			[channel$1]: {
				...nextChannel,
				accounts: {
					...accounts,
					[resolvedTargetAccountId]: nextAccount
				}
			}
		}
	};
}
function validateMatrixSetupInput(params) {
	const avatarUrl = resolveSetupAvatarUrl(params.input);
	if (avatarUrl && !isSupportedMatrixAvatarSource(avatarUrl)) return "Matrix avatar URL must be an mxc:// URI or an http(s) URL.";
	if (params.input.useEnv) {
		const envReadiness = resolveMatrixEnvAuthReadiness(params.accountId, process.env);
		return envReadiness.ready ? null : envReadiness.missingMessage;
	}
	if (!params.input.homeserver?.trim()) return "Matrix requires --homeserver";
	const accessToken = params.input.accessToken?.trim();
	const password = normalizeSecretInputString(params.input.password);
	const userId = params.input.userId?.trim();
	if (!accessToken && !password) return "Matrix requires --access-token or --password";
	if (!accessToken) {
		if (!userId) return "Matrix requires --user-id when using --password";
		if (!password) return "Matrix requires --password when using --user-id";
	}
	return null;
}
function applyMatrixSetupAccountConfig(params) {
	const normalizedAccountId = normalizeAccountId(params.accountId);
	const next = applyAccountNameToChannelSection({
		cfg: normalizedAccountId !== "default" ? moveSingleMatrixAccountConfigToNamedAccount(params.cfg) : params.cfg,
		channelKey: channel$1,
		accountId: normalizedAccountId,
		name: params.input.name
	});
	const avatarUrl = resolveSetupAvatarUrl(params.input);
	if (params.input.useEnv) return updateMatrixAccountConfig(next, normalizedAccountId, {
		enabled: true,
		homeserver: null,
		allowPrivateNetwork: null,
		proxy: null,
		userId: null,
		accessToken: null,
		password: null,
		deviceId: null,
		deviceName: null,
		avatarUrl
	});
	const accessToken = params.input.accessToken?.trim();
	const password = normalizeSecretInputString(params.input.password);
	const userId = params.input.userId?.trim();
	return updateMatrixAccountConfig(next, normalizedAccountId, {
		enabled: true,
		homeserver: params.input.homeserver?.trim(),
		allowPrivateNetwork: typeof params.input.dangerouslyAllowPrivateNetwork === "boolean" ? params.input.dangerouslyAllowPrivateNetwork : typeof params.input.allowPrivateNetwork === "boolean" ? params.input.allowPrivateNetwork : void 0,
		proxy: params.input.proxy?.trim() || void 0,
		userId: password && !userId ? null : userId,
		accessToken: accessToken || (password ? null : void 0),
		password: password || (accessToken ? null : void 0),
		deviceName: params.input.deviceName?.trim(),
		avatarUrl,
		initialSyncLimit: params.input.initialSyncLimit
	});
}
//#endregion
//#region extensions/matrix/src/setup-core.ts
const channel = "matrix";
function resolveMatrixSetupAccountId(params) {
	return normalizeAccountId(params.accountId?.trim() || params.name?.trim() || "default");
}
const matrixSetupAdapter = {
	resolveAccountId: ({ accountId, input }) => resolveMatrixSetupAccountId({
		accountId,
		name: input?.name
	}),
	resolveBindingAccountId: ({ accountId, agentId }) => resolveMatrixSetupAccountId({
		accountId,
		name: agentId
	}),
	applyAccountName: ({ cfg, accountId, name }) => prepareScopedSetupConfig({
		cfg,
		channelKey: channel,
		accountId,
		name
	}),
	validateInput: ({ accountId, input }) => validateMatrixSetupInput({
		accountId,
		input
	}),
	applyAccountConfig: ({ cfg, accountId, input }) => applyMatrixSetupAccountConfig({
		cfg,
		accountId,
		input
	}),
	afterAccountConfigWritten: async ({ previousCfg, cfg, accountId, runtime }) => {
		const { runMatrixSetupBootstrapAfterConfigWrite } = await import("./setup-bootstrap-CIVZT1j-.js");
		await runMatrixSetupBootstrapAfterConfigWrite({
			previousCfg,
			cfg,
			accountId,
			runtime
		});
	}
};
//#endregion
export { resolveSingleAccountPromotionTarget as a, namedAccountPromotionKeys as i, moveSingleMatrixAccountConfigToNamedAccount as n, singleAccountKeysToMove as o, resolveMatrixEnvAuthReadiness as r, matrixSetupAdapter as t };
