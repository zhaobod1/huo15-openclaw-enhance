import { a as loadAuthProfileStoreForSecretsRuntime } from "./store-HF_Z-jKz.js";
import "./auth-profiles-gRFfbuWd.js";
import { Ft as collectDurableServiceEnvVars, l as readConfigFileSnapshot } from "./io-CS2J_l4V.js";
import { i as normalizeEnvVarKey, n as isDangerousHostEnvOverrideVarName, r as isDangerousHostEnvVarName } from "./host-env-security-D-6e61X4.js";
import { a as hasConfiguredSecretInput, d as resolveSecretInputRef } from "./types.secrets-BZdSA8i7.js";
import { u as secretRefKey } from "./ref-contract-ho6SSF_R.js";
import { r as replaceConfigFile } from "./config-dzPpvDz6.js";
import { o as resolveSecretRefValues } from "./resolve-D4yyG1J7.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { d as resolveGatewayLaunchAgentLabel } from "./paths-DRWfIhrn.js";
import { i as resolveGatewayProgramArguments, n as resolveDaemonInstallRuntimeInputs, r as resolveDaemonNodeBinDir, t as emitDaemonInstallRuntimeWarning } from "./daemon-install-plan.shared-BwkS3bFW.js";
import { c as buildServiceEnvironment } from "./runtime-paths-CgEfWJeV.js";
import { n as hasAmbiguousGatewayAuthModeConfig } from "./auth-mode-policy-ClDXr0JP.js";
import { a as readGatewayTokenEnv } from "./credential-planner-DVhLNnc0.js";
import "./credentials-pGvqXsM2.js";
import { o as resolveGatewayAuth } from "./auth-D6Uk4TMd.js";
import { d as randomToken } from "./onboard-helpers-BWSZmief.js";
//#region src/commands/daemon-install-helpers.ts
function collectAuthProfileServiceEnvVars(params) {
	const authStore = params.authStore ?? loadAuthProfileStoreForSecretsRuntime();
	const entries = {};
	for (const credential of Object.values(authStore.profiles)) {
		const ref = credential.type === "api_key" ? credential.keyRef : credential.type === "token" ? credential.tokenRef : void 0;
		if (!ref || ref.source !== "env") continue;
		const key = normalizeEnvVarKey(ref.id, { portable: true });
		if (!key) continue;
		if (isDangerousHostEnvVarName(key) || isDangerousHostEnvOverrideVarName(key)) {
			params.warn?.(`Auth profile env ref "${key}" blocked by host-env security policy`, "Auth profile");
			continue;
		}
		const value = params.env[key]?.trim();
		if (!value) continue;
		entries[key] = value;
	}
	return entries;
}
function buildGatewayInstallEnvironment(params) {
	const environment = {
		...collectDurableServiceEnvVars({
			env: params.env,
			config: params.config
		}),
		...collectAuthProfileServiceEnvVars({
			env: params.env,
			authStore: params.authStore,
			warn: params.warn
		})
	};
	Object.assign(environment, params.serviceEnvironment);
	return environment;
}
async function buildGatewayInstallPlan(params) {
	const { devMode, nodePath } = await resolveDaemonInstallRuntimeInputs({
		env: params.env,
		runtime: params.runtime,
		devMode: params.devMode,
		nodePath: params.nodePath
	});
	const { programArguments, workingDirectory } = await resolveGatewayProgramArguments({
		port: params.port,
		dev: devMode,
		runtime: params.runtime,
		nodePath
	});
	await emitDaemonInstallRuntimeWarning({
		env: params.env,
		runtime: params.runtime,
		programArguments,
		warn: params.warn,
		title: "Gateway runtime"
	});
	const serviceEnvironment = buildServiceEnvironment({
		env: params.env,
		port: params.port,
		launchdLabel: process.platform === "darwin" ? resolveGatewayLaunchAgentLabel(params.env.OPENCLAW_PROFILE) : void 0,
		extraPathDirs: resolveDaemonNodeBinDir(nodePath)
	});
	return {
		programArguments,
		workingDirectory,
		environment: buildGatewayInstallEnvironment({
			env: params.env,
			config: params.config,
			authStore: params.authStore,
			warn: params.warn,
			serviceEnvironment
		})
	};
}
function gatewayInstallErrorHint(platform = process.platform) {
	return platform === "win32" ? "Tip: native Windows now falls back to a per-user Startup-folder login item when Scheduled Task creation is denied; if install still fails, rerun from an elevated PowerShell or skip service install." : `Tip: rerun \`${formatCliCommand("openclaw gateway install")}\` after fixing the error.`;
}
//#endregion
//#region src/gateway/auth-install-policy.ts
function hasExplicitGatewayInstallAuthMode(mode) {
	if (mode === "token") return true;
	if (mode === "password" || mode === "none" || mode === "trusted-proxy") return false;
}
function hasConfiguredGatewayPasswordForInstall(cfg) {
	return hasConfiguredSecretInput(cfg.gateway?.auth?.password, cfg.secrets?.defaults);
}
function hasDurableGatewayPasswordEnvForInstall(cfg, env) {
	const durableServiceEnv = collectDurableServiceEnvVars({
		env,
		config: cfg
	});
	return Boolean(durableServiceEnv.OPENCLAW_GATEWAY_PASSWORD?.trim() || durableServiceEnv.CLAWDBOT_GATEWAY_PASSWORD?.trim());
}
function shouldRequireGatewayTokenForInstall(cfg, env) {
	const explicitModeDecision = hasExplicitGatewayInstallAuthMode(cfg.gateway?.auth?.mode);
	if (explicitModeDecision !== void 0) return explicitModeDecision;
	if (hasConfiguredGatewayPasswordForInstall(cfg)) return false;
	if (hasDurableGatewayPasswordEnvForInstall(cfg, env)) return false;
	return true;
}
//#endregion
//#region src/commands/gateway-install-token.ts
function resolveConfiguredGatewayInstallToken(params) {
	const configToken = params.tokenRef || typeof params.config.gateway?.auth?.token !== "string" ? void 0 : params.config.gateway.auth.token.trim() || void 0;
	const explicitToken = params.explicitToken?.trim() || void 0;
	const envToken = readGatewayTokenEnv(params.env);
	return explicitToken || configToken || (params.tokenRef ? void 0 : envToken);
}
async function validateGatewayInstallTokenSecretRef(params) {
	try {
		const value = (await resolveSecretRefValues([params.tokenRef], {
			config: params.config,
			env: params.env
		})).get(secretRefKey(params.tokenRef));
		if (typeof value !== "string" || value.trim().length === 0) throw new Error("gateway.auth.token resolved to an empty or non-string value.");
		return;
	} catch (err) {
		return `gateway.auth.token SecretRef is configured but unresolved (${String(err)}).`;
	}
}
async function maybePersistAutoGeneratedGatewayInstallToken(params) {
	try {
		const snapshot = await readConfigFileSnapshot();
		if (snapshot.exists && !snapshot.valid) {
			params.warnings.push("Warning: config file exists but is invalid; skipping token persistence.");
			return params.token;
		}
		const baseConfig = snapshot.exists ? snapshot.sourceConfig ?? snapshot.config : {};
		const existingTokenRef = resolveSecretInputRef({
			value: baseConfig.gateway?.auth?.token,
			defaults: baseConfig.secrets?.defaults
		}).ref;
		const baseConfigToken = existingTokenRef || typeof baseConfig.gateway?.auth?.token !== "string" ? void 0 : baseConfig.gateway.auth.token.trim() || void 0;
		if (!existingTokenRef && !baseConfigToken) {
			await replaceConfigFile({
				baseHash: snapshot.hash,
				nextConfig: {
					...baseConfig,
					gateway: {
						...baseConfig.gateway,
						auth: {
							...baseConfig.gateway?.auth,
							mode: baseConfig.gateway?.auth?.mode ?? "token",
							token: params.token
						}
					}
				}
			});
			return params.token;
		}
		if (baseConfigToken) return baseConfigToken;
		params.warnings.push("Warning: gateway.auth.token is SecretRef-managed; skipping plaintext token persistence.");
		return;
	} catch (err) {
		params.warnings.push(`Warning: could not persist token to config: ${String(err)}`);
		return params.token;
	}
}
function formatAmbiguousGatewayAuthModeReason() {
	return ["gateway.auth.token and gateway.auth.password are both configured while gateway.auth.mode is unset.", `Set ${formatCliCommand("openclaw config set gateway.auth.mode token")} or ${formatCliCommand("openclaw config set gateway.auth.mode password")}.`].join(" ");
}
async function resolveGatewayInstallToken(options) {
	const cfg = options.config;
	const warnings = [];
	const tokenRef = resolveSecretInputRef({
		value: cfg.gateway?.auth?.token,
		defaults: cfg.secrets?.defaults
	}).ref;
	const tokenRefConfigured = Boolean(tokenRef);
	if (hasAmbiguousGatewayAuthModeConfig(cfg)) return {
		token: void 0,
		tokenRefConfigured,
		unavailableReason: formatAmbiguousGatewayAuthModeReason(),
		warnings
	};
	const resolvedAuth = resolveGatewayAuth({
		authConfig: cfg.gateway?.auth,
		env: options.env,
		tailscaleMode: cfg.gateway?.tailscale?.mode ?? "off"
	});
	const needsToken = shouldRequireGatewayTokenForInstall(cfg, options.env) && !resolvedAuth.allowTailscale;
	let token = resolveConfiguredGatewayInstallToken({
		config: cfg,
		env: options.env,
		explicitToken: options.explicitToken,
		tokenRef
	});
	let unavailableReason;
	if (tokenRef && !token && needsToken) {
		unavailableReason = await validateGatewayInstallTokenSecretRef({
			tokenRef,
			config: cfg,
			env: options.env
		});
		if (!unavailableReason) warnings.push("gateway.auth.token is SecretRef-managed; install will not persist a resolved token in service environment. Ensure the SecretRef is resolvable in the daemon runtime context.");
	}
	const allowAutoGenerate = options.autoGenerateWhenMissing ?? false;
	const persistGeneratedToken = options.persistGeneratedToken ?? false;
	if (!token && needsToken && !tokenRef && allowAutoGenerate) {
		token = randomToken();
		warnings.push(persistGeneratedToken ? "No gateway token found. Auto-generated one and saving to config." : "No gateway token found. Auto-generated one for this run without saving to config.");
		if (persistGeneratedToken) token = await maybePersistAutoGeneratedGatewayInstallToken({
			token,
			config: cfg,
			warnings
		});
	}
	return {
		token,
		tokenRefConfigured,
		unavailableReason,
		warnings
	};
}
//#endregion
export { buildGatewayInstallPlan as n, gatewayInstallErrorHint as r, resolveGatewayInstallToken as t };
