import { n as containsEnvVarReference } from "./env-substitution-D66ySIYd.js";
import { a as hasConfiguredSecretInput, d as resolveSecretInputRef } from "./types.secrets-BZdSA8i7.js";
//#region src/gateway/credential-planner.ts
function trimToUndefined(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
/**
* Like trimToUndefined but also rejects unresolved env var placeholders (e.g. `${VAR}`).
* This prevents literal placeholder strings like `${OPENCLAW_GATEWAY_TOKEN}` from being
* accepted as valid credentials when the referenced env var is missing.
* Note: legitimate credential values containing literal `${UPPER_CASE}` patterns will
* also be rejected, but this is an extremely unlikely edge case.
*/
function trimCredentialToUndefined(value) {
	const trimmed = trimToUndefined(value);
	if (trimmed && containsEnvVarReference(trimmed)) return;
	return trimmed;
}
function readGatewayTokenEnv(env = process.env) {
	return trimToUndefined(env.OPENCLAW_GATEWAY_TOKEN);
}
function readGatewayPasswordEnv(env = process.env) {
	return trimToUndefined(env.OPENCLAW_GATEWAY_PASSWORD);
}
function hasGatewayTokenEnvCandidate(env = process.env) {
	return Boolean(readGatewayTokenEnv(env));
}
function hasGatewayPasswordEnvCandidate(env = process.env) {
	return Boolean(readGatewayPasswordEnv(env));
}
function resolveConfiguredGatewayCredentialInput(params) {
	const ref = resolveSecretInputRef({
		value: params.value,
		defaults: params.defaults
	}).ref;
	return {
		path: params.path,
		configured: hasConfiguredSecretInput(params.value, params.defaults),
		value: ref ? void 0 : trimToUndefined(params.value),
		refPath: ref ? params.path : void 0,
		hasSecretRef: ref !== null
	};
}
function createGatewayCredentialPlan(params) {
	const env = params.env ?? process.env;
	const gateway = params.config.gateway;
	const remote = gateway?.remote;
	const defaults = params.defaults ?? params.config.secrets?.defaults;
	const authMode = gateway?.auth?.mode;
	const envToken = readGatewayTokenEnv(env);
	const envPassword = readGatewayPasswordEnv(env);
	const localToken = resolveConfiguredGatewayCredentialInput({
		value: gateway?.auth?.token,
		defaults,
		path: "gateway.auth.token"
	});
	const localPassword = resolveConfiguredGatewayCredentialInput({
		value: gateway?.auth?.password,
		defaults,
		path: "gateway.auth.password"
	});
	const remoteToken = resolveConfiguredGatewayCredentialInput({
		value: remote?.token,
		defaults,
		path: "gateway.remote.token"
	});
	const remotePassword = resolveConfiguredGatewayCredentialInput({
		value: remote?.password,
		defaults,
		path: "gateway.remote.password"
	});
	const localTokenCanWin = authMode !== "password" && authMode !== "none" && authMode !== "trusted-proxy";
	const tokenCanWin = Boolean(envToken || localToken.configured || remoteToken.configured);
	const passwordCanWin = authMode === "password" || authMode !== "token" && authMode !== "none" && authMode !== "trusted-proxy" && !tokenCanWin;
	const localTokenSurfaceActive = localTokenCanWin && !envToken && (authMode === "token" || authMode === void 0 && !(envPassword || localPassword.configured));
	const remoteMode = gateway?.mode === "remote";
	const remoteUrlConfigured = Boolean(trimToUndefined(remote?.url));
	const tailscaleRemoteExposure = gateway?.tailscale?.mode === "serve" || gateway?.tailscale?.mode === "funnel";
	const remoteConfiguredSurface = remoteMode || remoteUrlConfigured || tailscaleRemoteExposure;
	const remoteTokenFallbackActive = localTokenCanWin && !envToken && !localToken.configured;
	const remotePasswordFallbackActive = !envPassword && !localPassword.configured && passwordCanWin;
	return {
		configuredMode: gateway?.mode === "remote" ? "remote" : "local",
		authMode,
		envToken,
		envPassword,
		localToken,
		localPassword,
		remoteToken,
		remotePassword,
		localTokenCanWin,
		localPasswordCanWin: passwordCanWin,
		localTokenSurfaceActive,
		tokenCanWin,
		passwordCanWin,
		remoteMode,
		remoteUrlConfigured,
		tailscaleRemoteExposure,
		remoteConfiguredSurface,
		remoteTokenFallbackActive,
		remoteTokenActive: remoteConfiguredSurface || remoteTokenFallbackActive,
		remotePasswordFallbackActive,
		remotePasswordActive: remoteConfiguredSurface || remotePasswordFallbackActive
	};
}
//#endregion
export { readGatewayTokenEnv as a, readGatewayPasswordEnv as i, hasGatewayPasswordEnvCandidate as n, trimCredentialToUndefined as o, hasGatewayTokenEnvCandidate as r, trimToUndefined as s, createGatewayCredentialPlan as t };
