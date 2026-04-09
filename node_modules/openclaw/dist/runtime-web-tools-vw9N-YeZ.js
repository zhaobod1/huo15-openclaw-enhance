import { o as getActivePluginRegistryWorkspaceDir } from "./runtime-Dji2WXDE.js";
import { l as isRecord$1 } from "./utils-ms6h9yny.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { i as resolveManifestContractPluginIds, n as loadPluginManifestRegistry, r as resolveManifestContractOwnerPluginId } from "./manifest-registry-Cqdpf6fh.js";
import { n as iterateBootstrapChannelPlugins } from "./bootstrap-registry-DSG7nIY1.js";
import { a as normalizePluginsConfig, c as resolveEnableState } from "./config-state-CKMpUUgI.js";
import { r as withActivatedPluginIds, t as resolveBundledPluginCompatibleActivationInputs } from "./activation-context-EoQ_S75w.js";
import { n as loadOpenClawPlugins, r as resolveCompatibleRuntimePluginRegistry } from "./loader-BkajlJCF.js";
import { t as createPluginLoaderLogger } from "./logger-B9Q6R6gm.js";
import { d as resolveSecretInputRef, i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { u as secretRefKey } from "./ref-contract-ho6SSF_R.js";
import { i as isRecord$2 } from "./shared-BTjsck-6.js";
import { o as resolveSecretRefValues } from "./resolve-D4yyG1J7.js";
import { n as normalizeSecretInput } from "./normalize-secret-input-DUjA3r3_.js";
import { t as createGatewayCredentialPlan } from "./credential-planner-DVhLNnc0.js";
import { n as getPath } from "./path-utils-BIxqlTpH.js";
import { l as pushInactiveSurfaceWarning, p as isExpectedResolvedSecretValue, r as collectSecretInputAssignment, t as collectTtsApiKeyAssignments, u as pushWarning } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { r as discoverConfigSecretTargetsByIds } from "./target-registry-4ZVRjB-K.js";
import { i as resolveEffectiveMediaEntryCapabilities, r as resolveConfiguredMediaEntryCapabilities, t as buildMediaUnderstandingRegistry } from "./provider-registry-Qp9sisqM.js";
import { a as buildPluginSnapshotCacheEnvKey, i as sortWebSearchProvidersForAutoDetect, o as resolvePluginSnapshotCacheTtlMs, s as shouldUsePluginSnapshotCache, t as resolvePluginWebSearchProviders } from "./web-search-providers.runtime-BlIzURx3.js";
//#region src/secrets/command-config.ts
function analyzeCommandSecretAssignmentsFromSnapshot(params) {
	const defaults = params.sourceConfig.secrets?.defaults;
	const assignments = [];
	const diagnostics = [];
	const unresolved = [];
	const inactive = [];
	for (const target of discoverConfigSecretTargetsByIds(params.sourceConfig, params.targetIds)) {
		if (params.allowedPaths && !params.allowedPaths.has(target.path)) continue;
		const { explicitRef, ref } = resolveSecretInputRef({
			value: target.value,
			refValue: target.refValue,
			defaults
		});
		const inlineCandidateRef = explicitRef ? coerceSecretRef(target.value, defaults) : null;
		if (!ref) continue;
		const resolved = getPath(params.resolvedConfig, target.pathSegments);
		if (!isExpectedResolvedSecretValue(resolved, target.entry.expectedResolvedValue)) {
			if (params.inactiveRefPaths?.has(target.path)) {
				diagnostics.push(`${target.path}: secret ref is configured on an inactive surface; skipping command-time assignment.`);
				inactive.push({
					path: target.path,
					pathSegments: [...target.pathSegments]
				});
				continue;
			}
			unresolved.push({
				path: target.path,
				pathSegments: [...target.pathSegments]
			});
			continue;
		}
		assignments.push({
			path: target.path,
			pathSegments: [...target.pathSegments],
			value: resolved
		});
		if (target.entry.secretShape === "sibling_ref" && explicitRef && inlineCandidateRef) diagnostics.push(`${target.path}: both inline and sibling ref were present; sibling ref took precedence.`);
	}
	return {
		assignments,
		diagnostics,
		unresolved,
		inactive
	};
}
function collectCommandSecretAssignmentsFromSnapshot(params) {
	const analyzed = analyzeCommandSecretAssignmentsFromSnapshot({
		sourceConfig: params.sourceConfig,
		resolvedConfig: params.resolvedConfig,
		targetIds: params.targetIds,
		inactiveRefPaths: params.inactiveRefPaths,
		allowedPaths: params.allowedPaths
	});
	if (analyzed.unresolved.length > 0) throw new Error(`${params.commandName}: ${analyzed.unresolved[0]?.path ?? "target"} is unresolved in the active runtime snapshot.`);
	return {
		assignments: analyzed.assignments,
		diagnostics: analyzed.diagnostics
	};
}
//#endregion
//#region src/secrets/runtime-config-collectors-channels.ts
function collectChannelConfigAssignments(params) {
	for (const plugin of iterateBootstrapChannelPlugins()) plugin.secrets?.collectRuntimeConfigAssignments?.(params);
}
//#endregion
//#region src/secrets/runtime-gateway-auth-surfaces.ts
const GATEWAY_AUTH_SURFACE_PATHS = [
	"gateway.auth.token",
	"gateway.auth.password",
	"gateway.remote.token",
	"gateway.remote.password"
];
function formatAuthMode(mode) {
	return mode ?? "unset";
}
function describeRemoteConfiguredSurface(parts) {
	const reasons = [];
	if (parts.remoteMode) reasons.push("gateway.mode is \"remote\"");
	if (parts.remoteUrlConfigured) reasons.push("gateway.remote.url is configured");
	if (parts.tailscaleRemoteExposure) reasons.push("gateway.tailscale.mode is \"serve\" or \"funnel\"");
	return reasons.join("; ");
}
function createState(params) {
	return {
		path: params.path,
		active: params.active,
		reason: params.reason,
		hasSecretRef: params.hasSecretRef
	};
}
function evaluateGatewayAuthSurfaceStates(params) {
	const gateway = params.config.gateway;
	if (!isRecord$2(gateway)) return {
		"gateway.auth.token": createState({
			path: "gateway.auth.token",
			active: false,
			reason: "gateway configuration is not set.",
			hasSecretRef: false
		}),
		"gateway.auth.password": createState({
			path: "gateway.auth.password",
			active: false,
			reason: "gateway configuration is not set.",
			hasSecretRef: false
		}),
		"gateway.remote.token": createState({
			path: "gateway.remote.token",
			active: false,
			reason: "gateway configuration is not set.",
			hasSecretRef: false
		}),
		"gateway.remote.password": createState({
			path: "gateway.remote.password",
			active: false,
			reason: "gateway configuration is not set.",
			hasSecretRef: false
		})
	};
	const auth = isRecord$2(gateway?.auth) ? gateway.auth : void 0;
	const remote = isRecord$2(gateway?.remote) ? gateway.remote : void 0;
	const plan = createGatewayCredentialPlan({
		config: params.config,
		env: params.env,
		defaults: params.defaults
	});
	const authPasswordReason = (() => {
		if (!auth) return "gateway.auth is not configured.";
		if (plan.passwordCanWin) return plan.authMode === "password" ? "gateway.auth.mode is \"password\"." : "no token source can win, so password auth can win.";
		if (plan.authMode === "token" || plan.authMode === "none" || plan.authMode === "trusted-proxy") return `gateway.auth.mode is "${plan.authMode}".`;
		if (plan.envToken) return "gateway token env var is configured.";
		if (plan.localToken.configured) return "gateway.auth.token is configured.";
		if (plan.remoteToken.configured) return "gateway.remote.token is configured.";
		return "token auth can win.";
	})();
	const authTokenReason = (() => {
		if (!auth) return "gateway.auth is not configured.";
		if (plan.authMode === "token") return plan.envToken ? "gateway token env var is configured." : "gateway.auth.mode is \"token\".";
		if (plan.authMode === "password" || plan.authMode === "none" || plan.authMode === "trusted-proxy") return `gateway.auth.mode is "${plan.authMode}".`;
		if (plan.envToken) return "gateway token env var is configured.";
		if (plan.envPassword) return "gateway password env var is configured.";
		if (plan.localPassword.configured) return "gateway.auth.password is configured.";
		return "token auth can win (mode is unset and no password source is configured).";
	})();
	const remoteSurfaceReason = describeRemoteConfiguredSurface({
		remoteMode: plan.remoteMode,
		remoteUrlConfigured: plan.remoteUrlConfigured,
		tailscaleRemoteExposure: plan.tailscaleRemoteExposure
	});
	const remoteTokenReason = (() => {
		if (!remote) return "gateway.remote is not configured.";
		if (plan.remoteConfiguredSurface) return `remote surface is active: ${remoteSurfaceReason}.`;
		if (plan.remoteTokenFallbackActive) return "local token auth can win and no env/auth token is configured.";
		if (!plan.localTokenCanWin) return `token auth cannot win with gateway.auth.mode="${formatAuthMode(plan.authMode)}".`;
		if (plan.envToken) return "gateway token env var is configured.";
		if (plan.localToken.configured) return "gateway.auth.token is configured.";
		return "remote token fallback is not active.";
	})();
	const remotePasswordReason = (() => {
		if (!remote) return "gateway.remote is not configured.";
		if (plan.remoteConfiguredSurface) return `remote surface is active: ${remoteSurfaceReason}.`;
		if (plan.remotePasswordFallbackActive) return "password auth can win and no env/auth password is configured.";
		if (!plan.passwordCanWin) {
			if (plan.authMode === "token" || plan.authMode === "none" || plan.authMode === "trusted-proxy") return `password auth cannot win with gateway.auth.mode="${plan.authMode}".`;
			return "a token source can win, so password auth cannot win.";
		}
		if (plan.envPassword) return "gateway password env var is configured.";
		if (plan.localPassword.configured) return "gateway.auth.password is configured.";
		return "remote password fallback is not active.";
	})();
	return {
		"gateway.auth.token": createState({
			path: "gateway.auth.token",
			active: plan.localTokenSurfaceActive,
			reason: authTokenReason,
			hasSecretRef: plan.localToken.hasSecretRef
		}),
		"gateway.auth.password": createState({
			path: "gateway.auth.password",
			active: plan.passwordCanWin,
			reason: authPasswordReason,
			hasSecretRef: plan.localPassword.hasSecretRef
		}),
		"gateway.remote.token": createState({
			path: "gateway.remote.token",
			active: plan.remoteTokenActive,
			reason: remoteTokenReason,
			hasSecretRef: plan.remoteToken.hasSecretRef
		}),
		"gateway.remote.password": createState({
			path: "gateway.remote.password",
			active: plan.remotePasswordActive,
			reason: remotePasswordReason,
			hasSecretRef: plan.remotePassword.hasSecretRef
		})
	};
}
//#endregion
//#region src/secrets/runtime-config-collectors-core.ts
function collectModelProviderAssignments(params) {
	for (const [providerId, provider] of Object.entries(params.providers)) {
		const providerIsActive = provider.enabled !== false;
		collectSecretInputAssignment({
			value: provider.apiKey,
			path: `models.providers.${providerId}.apiKey`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: providerIsActive,
			inactiveReason: "provider is disabled.",
			apply: (value) => {
				provider.apiKey = value;
			}
		});
		const headers = isRecord$2(provider.headers) ? provider.headers : void 0;
		if (headers) for (const [headerKey, headerValue] of Object.entries(headers)) collectSecretInputAssignment({
			value: headerValue,
			path: `models.providers.${providerId}.headers.${headerKey}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: providerIsActive,
			inactiveReason: "provider is disabled.",
			apply: (value) => {
				headers[headerKey] = value;
			}
		});
		const request = isRecord$2(provider.request) ? provider.request : void 0;
		if (request) collectProviderRequestAssignments({
			request,
			pathPrefix: `models.providers.${providerId}.request`,
			defaults: params.defaults,
			context: params.context,
			active: providerIsActive,
			inactiveReason: "provider is disabled.",
			collectTransportSecrets: true
		});
	}
}
function collectSkillAssignments(params) {
	for (const [skillKey, entry] of Object.entries(params.entries)) collectSecretInputAssignment({
		value: entry.apiKey,
		path: `skills.entries.${skillKey}.apiKey`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: entry.enabled !== false,
		inactiveReason: "skill entry is disabled.",
		apply: (value) => {
			entry.apiKey = value;
		}
	});
}
function collectAgentMemorySearchAssignments(params) {
	const agents = params.config.agents;
	if (!isRecord$2(agents)) return;
	const defaultsConfig = isRecord$2(agents.defaults) ? agents.defaults : void 0;
	const defaultsMemorySearch = isRecord$2(defaultsConfig?.memorySearch) ? defaultsConfig.memorySearch : void 0;
	const defaultsEnabled = defaultsMemorySearch?.enabled !== false;
	const list = Array.isArray(agents.list) ? agents.list : [];
	let hasEnabledAgentWithoutOverride = false;
	for (const rawAgent of list) {
		if (!isRecord$2(rawAgent)) continue;
		if (rawAgent.enabled === false) continue;
		const memorySearch = isRecord$2(rawAgent.memorySearch) ? rawAgent.memorySearch : void 0;
		if (memorySearch?.enabled === false) continue;
		if (!memorySearch || !Object.prototype.hasOwnProperty.call(memorySearch, "remote")) {
			hasEnabledAgentWithoutOverride = true;
			continue;
		}
		const remote = isRecord$2(memorySearch.remote) ? memorySearch.remote : void 0;
		if (!remote || !Object.prototype.hasOwnProperty.call(remote, "apiKey")) {
			hasEnabledAgentWithoutOverride = true;
			continue;
		}
	}
	if (defaultsMemorySearch && isRecord$2(defaultsMemorySearch.remote)) {
		const remote = defaultsMemorySearch.remote;
		collectSecretInputAssignment({
			value: remote.apiKey,
			path: "agents.defaults.memorySearch.remote.apiKey",
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: defaultsEnabled && (hasEnabledAgentWithoutOverride || list.length === 0),
			inactiveReason: hasEnabledAgentWithoutOverride ? void 0 : "all enabled agents override memorySearch.remote.apiKey.",
			apply: (value) => {
				remote.apiKey = value;
			}
		});
	}
	list.forEach((rawAgent, index) => {
		if (!isRecord$2(rawAgent)) return;
		const memorySearch = isRecord$2(rawAgent.memorySearch) ? rawAgent.memorySearch : void 0;
		if (!memorySearch) return;
		const remote = isRecord$2(memorySearch.remote) ? memorySearch.remote : void 0;
		if (!remote || !Object.prototype.hasOwnProperty.call(remote, "apiKey")) return;
		const enabled = rawAgent.enabled !== false && memorySearch.enabled !== false;
		collectSecretInputAssignment({
			value: remote.apiKey,
			path: `agents.list.${index}.memorySearch.remote.apiKey`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: enabled,
			inactiveReason: "agent or memorySearch override is disabled.",
			apply: (value) => {
				remote.apiKey = value;
			}
		});
	});
}
function collectTalkAssignments(params) {
	const talk = params.config.talk;
	if (!isRecord$2(talk)) return;
	collectSecretInputAssignment({
		value: talk.apiKey,
		path: "talk.apiKey",
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		apply: (value) => {
			talk.apiKey = value;
		}
	});
	const providers = talk.providers;
	if (!isRecord$2(providers)) return;
	for (const [providerId, providerConfig] of Object.entries(providers)) {
		if (!isRecord$2(providerConfig)) continue;
		collectSecretInputAssignment({
			value: providerConfig.apiKey,
			path: `talk.providers.${providerId}.apiKey`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			apply: (value) => {
				providerConfig.apiKey = value;
			}
		});
	}
}
function collectGatewayAssignments(params) {
	const gateway = params.config.gateway;
	if (!isRecord$2(gateway)) return;
	const auth = isRecord$2(gateway.auth) ? gateway.auth : void 0;
	const remote = isRecord$2(gateway.remote) ? gateway.remote : void 0;
	const gatewaySurfaceStates = evaluateGatewayAuthSurfaceStates({
		config: params.config,
		env: params.context.env,
		defaults: params.defaults
	});
	if (auth) {
		collectSecretInputAssignment({
			value: auth.token,
			path: "gateway.auth.token",
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: gatewaySurfaceStates["gateway.auth.token"].active,
			inactiveReason: gatewaySurfaceStates["gateway.auth.token"].reason,
			apply: (value) => {
				auth.token = value;
			}
		});
		collectSecretInputAssignment({
			value: auth.password,
			path: "gateway.auth.password",
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: gatewaySurfaceStates["gateway.auth.password"].active,
			inactiveReason: gatewaySurfaceStates["gateway.auth.password"].reason,
			apply: (value) => {
				auth.password = value;
			}
		});
	}
	if (remote) {
		collectSecretInputAssignment({
			value: remote.token,
			path: "gateway.remote.token",
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: gatewaySurfaceStates["gateway.remote.token"].active,
			inactiveReason: gatewaySurfaceStates["gateway.remote.token"].reason,
			apply: (value) => {
				remote.token = value;
			}
		});
		collectSecretInputAssignment({
			value: remote.password,
			path: "gateway.remote.password",
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: gatewaySurfaceStates["gateway.remote.password"].active,
			inactiveReason: gatewaySurfaceStates["gateway.remote.password"].reason,
			apply: (value) => {
				remote.password = value;
			}
		});
	}
}
function collectProviderRequestAssignments(params) {
	const headers = isRecord$2(params.request.headers) ? params.request.headers : void 0;
	if (headers) for (const [headerKey, headerValue] of Object.entries(headers)) collectSecretInputAssignment({
		value: headerValue,
		path: `${params.pathPrefix}.headers.${headerKey}`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: params.active,
		inactiveReason: params.inactiveReason,
		apply: (value) => {
			headers[headerKey] = value;
		}
	});
	const auth = isRecord$2(params.request.auth) ? params.request.auth : void 0;
	if (auth) {
		collectSecretInputAssignment({
			value: auth.token,
			path: `${params.pathPrefix}.auth.token`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.active,
			inactiveReason: params.inactiveReason,
			apply: (value) => {
				auth.token = value;
			}
		});
		collectSecretInputAssignment({
			value: auth.value,
			path: `${params.pathPrefix}.auth.value`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.active,
			inactiveReason: params.inactiveReason,
			apply: (value) => {
				auth.value = value;
			}
		});
	}
	const collectTlsAssignments = (tls, pathPrefix) => {
		if (!tls) return;
		for (const key of [
			"ca",
			"cert",
			"key",
			"passphrase"
		]) collectSecretInputAssignment({
			value: tls[key],
			path: `${pathPrefix}.${key}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.active,
			inactiveReason: params.inactiveReason,
			apply: (value) => {
				tls[key] = value;
			}
		});
	};
	if (params.collectTransportSecrets !== false) {
		collectTlsAssignments(isRecord$2(params.request.tls) ? params.request.tls : void 0, `${params.pathPrefix}.tls`);
		const proxy = isRecord$2(params.request.proxy) ? params.request.proxy : void 0;
		collectTlsAssignments(isRecord$2(proxy?.tls) ? proxy.tls : void 0, `${params.pathPrefix}.proxy.tls`);
	}
}
function collectMediaRequestAssignments(params) {
	const tools = isRecord$2(params.config.tools) ? params.config.tools : void 0;
	const media = isRecord$2(tools?.media) ? tools.media : void 0;
	if (!media) return;
	let providerRegistry;
	const getProviderRegistry = () => {
		providerRegistry ??= buildMediaUnderstandingRegistry(void 0, params.config);
		return providerRegistry;
	};
	const capabilityKeys = [
		"audio",
		"image",
		"video"
	];
	const isCapabilityEnabled = (capability) => (isRecord$2(media[capability]) ? media[capability] : void 0)?.enabled !== false;
	const collectModelAssignments = (models, pathPrefix, resolveActivity) => {
		if (!Array.isArray(models)) return;
		models.forEach((rawModel, index) => {
			if (!isRecord$2(rawModel) || !isRecord$2(rawModel.request)) return;
			const { active, inactiveReason } = resolveActivity(rawModel);
			collectProviderRequestAssignments({
				request: rawModel.request,
				pathPrefix: `${pathPrefix}.${index}.request`,
				defaults: params.defaults,
				context: params.context,
				active,
				inactiveReason
			});
		});
	};
	collectModelAssignments(media.models, "tools.media.models", (rawModel) => {
		const entry = rawModel;
		const capabilities = resolveConfiguredMediaEntryCapabilities(entry) ?? resolveEffectiveMediaEntryCapabilities({
			entry,
			source: "shared",
			providerRegistry: getProviderRegistry()
		});
		if (!capabilities || capabilities.length === 0) return {
			active: false,
			inactiveReason: "shared media model does not declare capabilities and none could be inferred from its provider."
		};
		return {
			active: capabilities.some((capability) => isCapabilityEnabled(capability)),
			inactiveReason: `all configured media capabilities for this shared model are disabled: ${capabilities.join(", ")}.`
		};
	});
	for (const capability of capabilityKeys) {
		const section = isRecord$2(media[capability]) ? media[capability] : void 0;
		const active = isCapabilityEnabled(capability);
		const inactiveReason = `${capability} media understanding is disabled.`;
		if (section && isRecord$2(section.request)) collectProviderRequestAssignments({
			request: section.request,
			pathPrefix: `tools.media.${capability}.request`,
			defaults: params.defaults,
			context: params.context,
			active,
			inactiveReason
		});
		collectModelAssignments(section?.models, `tools.media.${capability}.models`, (rawModel) => ({
			active: active && (() => {
				const configuredCapabilities = resolveConfiguredMediaEntryCapabilities(rawModel);
				return configuredCapabilities ? configuredCapabilities.includes(capability) : true;
			})(),
			inactiveReason: active ? `${capability} media model is filtered out by its configured capabilities.` : inactiveReason
		}));
	}
}
function collectMessagesTtsAssignments(params) {
	const messages = params.config.messages;
	if (!isRecord$2(messages) || !isRecord$2(messages.tts)) return;
	collectTtsApiKeyAssignments({
		tts: messages.tts,
		pathPrefix: "messages.tts",
		defaults: params.defaults,
		context: params.context
	});
}
function collectCronAssignments(params) {
	const cron = params.config.cron;
	if (!isRecord$2(cron)) return;
	collectSecretInputAssignment({
		value: cron.webhookToken,
		path: "cron.webhookToken",
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		apply: (value) => {
			cron.webhookToken = value;
		}
	});
}
function collectSandboxSshAssignments(params) {
	const agents = isRecord$2(params.config.agents) ? params.config.agents : void 0;
	if (!agents) return;
	const defaultsAgent = isRecord$2(agents.defaults) ? agents.defaults : void 0;
	const defaultsSandbox = isRecord$2(defaultsAgent?.sandbox) ? defaultsAgent.sandbox : void 0;
	const defaultsSsh = isRecord$2(defaultsSandbox?.ssh) ? defaultsSandbox.ssh : void 0;
	const defaultsBackend = typeof defaultsSandbox?.backend === "string" ? defaultsSandbox.backend : void 0;
	const defaultsMode = typeof defaultsSandbox?.mode === "string" ? defaultsSandbox.mode : void 0;
	const inheritedDefaultsUsage = {
		identityData: false,
		certificateData: false,
		knownHostsData: false
	};
	(Array.isArray(agents.list) ? agents.list : []).forEach((rawAgent, index) => {
		const agentRecord = isRecord$2(rawAgent) ? rawAgent : null;
		if (!agentRecord || agentRecord.enabled === false) return;
		const sandbox = isRecord$2(agentRecord.sandbox) ? agentRecord.sandbox : void 0;
		const ssh = isRecord$2(sandbox?.ssh) ? sandbox.ssh : void 0;
		const effectiveBackend = (typeof sandbox?.backend === "string" ? sandbox.backend : void 0) ?? defaultsBackend ?? "docker";
		const effectiveMode = (typeof sandbox?.mode === "string" ? sandbox.mode : void 0) ?? defaultsMode ?? "off";
		const active = effectiveBackend.trim().toLowerCase() === "ssh" && effectiveMode !== "off";
		for (const key of [
			"identityData",
			"certificateData",
			"knownHostsData"
		]) if (ssh && Object.prototype.hasOwnProperty.call(ssh, key)) collectSecretInputAssignment({
			value: ssh[key],
			path: `agents.list.${index}.sandbox.ssh.${key}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active,
			inactiveReason: "sandbox SSH backend is not active for this agent.",
			apply: (value) => {
				ssh[key] = value;
			}
		});
		else if (active) inheritedDefaultsUsage[key] = true;
	});
	if (!defaultsSsh) return;
	const defaultsActive = defaultsBackend?.trim().toLowerCase() === "ssh" && defaultsMode !== "off" || inheritedDefaultsUsage.identityData || inheritedDefaultsUsage.certificateData || inheritedDefaultsUsage.knownHostsData;
	for (const key of [
		"identityData",
		"certificateData",
		"knownHostsData"
	]) collectSecretInputAssignment({
		value: defaultsSsh[key],
		path: `agents.defaults.sandbox.ssh.${key}`,
		expected: "string",
		defaults: params.defaults,
		context: params.context,
		active: defaultsActive || inheritedDefaultsUsage[key],
		inactiveReason: "sandbox SSH backend is not active.",
		apply: (value) => {
			defaultsSsh[key] = value;
		}
	});
}
function collectCoreConfigAssignments(params) {
	const providers = params.config.models?.providers;
	if (providers) collectModelProviderAssignments({
		providers,
		defaults: params.defaults,
		context: params.context
	});
	const skillEntries = params.config.skills?.entries;
	if (skillEntries) collectSkillAssignments({
		entries: skillEntries,
		defaults: params.defaults,
		context: params.context
	});
	collectAgentMemorySearchAssignments(params);
	collectTalkAssignments(params);
	collectGatewayAssignments(params);
	collectSandboxSshAssignments(params);
	collectMessagesTtsAssignments(params);
	collectCronAssignments(params);
	collectMediaRequestAssignments(params);
}
//#endregion
//#region src/secrets/runtime-config-collectors-plugins.ts
const ACPX_PLUGIN_ID = "acpx";
const ACPX_ENABLED_BY_DEFAULT = false;
/**
* Walk plugin config entries and collect SecretRef assignments for MCP server
* env vars. Without this, SecretRefs in paths like
* `plugins.entries.acpx.config.mcpServers.*.env.*` are never resolved and
* remain as raw objects at runtime.
*
* This surface is intentionally scoped to ACPX. Third-party plugins may define
* their own `mcpServers`-shaped config, but that is not a documented SecretRef
* surface and should not be rewritten here.
*
* When `loadablePluginOrigins` is provided, entries whose ID is not in the map
* are treated as inactive (stale config entries for plugins that are no longer
* installed). This prevents resolution failures for SecretRefs belonging to
* non-loadable plugins from blocking startup or preflight validation.
*/
function collectPluginConfigAssignments(params) {
	const entries = params.config.plugins?.entries;
	if (!isRecord$2(entries)) return;
	const normalizedConfig = normalizePluginsConfig(params.config.plugins);
	for (const [pluginId, entry] of Object.entries(entries)) {
		if (pluginId !== ACPX_PLUGIN_ID) continue;
		if (!isRecord$2(entry)) continue;
		const pluginConfig = entry.config;
		if (!isRecord$2(pluginConfig)) continue;
		const pluginOrigin = params.loadablePluginOrigins?.get(pluginId);
		if (params.loadablePluginOrigins && !pluginOrigin) {
			collectMcpServerEnvAssignments({
				pluginId,
				pluginConfig,
				active: false,
				inactiveReason: "plugin is not loadable (stale config entry).",
				defaults: params.defaults,
				context: params.context
			});
			continue;
		}
		const enableState = resolveEnableState(pluginId, pluginOrigin ?? "config", normalizedConfig, pluginId === ACPX_PLUGIN_ID && pluginOrigin === "bundled" ? ACPX_ENABLED_BY_DEFAULT : void 0);
		collectMcpServerEnvAssignments({
			pluginId,
			pluginConfig,
			active: enableState.enabled,
			inactiveReason: enableState.reason ?? "plugin is disabled.",
			defaults: params.defaults,
			context: params.context
		});
	}
}
function collectMcpServerEnvAssignments(params) {
	const mcpServers = params.pluginConfig.mcpServers;
	if (!isRecord$2(mcpServers)) return;
	for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
		if (!isRecord$2(serverConfig)) continue;
		const env = serverConfig.env;
		if (!isRecord$2(env)) continue;
		for (const [envKey, envValue] of Object.entries(env)) collectSecretInputAssignment({
			value: envValue,
			path: `plugins.entries.${params.pluginId}.config.mcpServers.${serverName}.env.${envKey}`,
			expected: "string",
			defaults: params.defaults,
			context: params.context,
			active: params.active,
			inactiveReason: `plugin "${params.pluginId}": ${params.inactiveReason}`,
			apply: (value) => {
				env[envKey] = value;
			}
		});
	}
}
//#endregion
//#region src/secrets/runtime-config-collectors.ts
function collectConfigAssignments(params) {
	const defaults = params.context.sourceConfig.secrets?.defaults;
	collectCoreConfigAssignments({
		config: params.config,
		defaults,
		context: params.context
	});
	collectChannelConfigAssignments({
		config: params.config,
		defaults,
		context: params.context
	});
	collectPluginConfigAssignments({
		config: params.config,
		defaults,
		context: params.context,
		loadablePluginOrigins: params.loadablePluginOrigins
	});
}
//#endregion
//#region src/plugins/web-fetch-providers.shared.ts
function resolveBundledWebFetchCompatPluginIds(params) {
	return resolveManifestContractPluginIds({
		contract: "webFetchProviders",
		origin: "bundled",
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	});
}
function compareWebFetchProvidersAlphabetically(left, right) {
	return left.id.localeCompare(right.id) || left.pluginId.localeCompare(right.pluginId);
}
function sortWebFetchProviders(providers) {
	return providers.toSorted(compareWebFetchProvidersAlphabetically);
}
function sortWebFetchProvidersForAutoDetect(providers) {
	return providers.toSorted((left, right) => {
		const leftOrder = left.autoDetectOrder ?? Number.MAX_SAFE_INTEGER;
		const rightOrder = right.autoDetectOrder ?? Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) return leftOrder - rightOrder;
		return compareWebFetchProvidersAlphabetically(left, right);
	});
}
function resolveBundledWebFetchResolutionConfig(params) {
	const activation = resolveBundledPluginCompatibleActivationInputs({
		rawConfig: params.config,
		env: params.env,
		workspaceDir: params.workspaceDir,
		applyAutoEnable: true,
		compatMode: {
			allowlist: params.bundledAllowlistCompat,
			enablement: "always",
			vitest: true
		},
		resolveCompatPluginIds: resolveBundledWebFetchCompatPluginIds
	});
	return {
		config: activation.config,
		normalized: activation.normalized,
		activationSourceConfig: activation.activationSourceConfig,
		autoEnabledReasons: activation.autoEnabledReasons
	};
}
//#endregion
//#region src/plugins/web-fetch-providers.runtime.ts
const log = createSubsystemLogger("plugins");
let webFetchProviderSnapshotCache = /* @__PURE__ */ new WeakMap();
function buildWebFetchSnapshotCacheKey(params) {
	return JSON.stringify({
		workspaceDir: params.workspaceDir ?? "",
		bundledAllowlistCompat: params.bundledAllowlistCompat === true,
		origin: params.origin ?? "",
		onlyPluginIds: [...new Set(params.onlyPluginIds ?? [])].toSorted((left, right) => left.localeCompare(right)),
		env: buildPluginSnapshotCacheEnvKey(params.env)
	});
}
function pluginManifestDeclaresWebFetch(record) {
	if ((record.contracts?.webFetchProviders?.length ?? 0) > 0) return true;
	if (Object.keys(record.configUiHints ?? {}).some((key) => key === "webFetch" || key.startsWith("webFetch."))) return true;
	if (!isRecord$1(record.configSchema)) return false;
	const properties = record.configSchema.properties;
	return isRecord$1(properties) && "webFetch" in properties;
}
function resolveWebFetchCandidatePluginIds(params) {
	const contractIds = new Set(resolveManifestContractPluginIds({
		contract: "webFetchProviders",
		origin: params.origin,
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env,
		onlyPluginIds: params.onlyPluginIds
	}));
	const onlyPluginIdSet = params.onlyPluginIds && params.onlyPluginIds.length > 0 ? new Set(params.onlyPluginIds) : null;
	const ids = loadPluginManifestRegistry({
		config: params.config,
		workspaceDir: params.workspaceDir,
		env: params.env
	}).plugins.filter((plugin) => (!params.origin || plugin.origin === params.origin) && (!onlyPluginIdSet || onlyPluginIdSet.has(plugin.id)) && (contractIds.has(plugin.id) || pluginManifestDeclaresWebFetch(plugin))).map((plugin) => plugin.id).toSorted((left, right) => left.localeCompare(right));
	return ids.length > 0 ? ids : void 0;
}
function resolveWebFetchLoadOptions(params) {
	const env = params.env ?? process.env;
	const workspaceDir = params.workspaceDir ?? getActivePluginRegistryWorkspaceDir();
	const { config, activationSourceConfig, autoEnabledReasons } = resolveBundledWebFetchResolutionConfig({
		...params,
		workspaceDir,
		env
	});
	const onlyPluginIds = resolveWebFetchCandidatePluginIds({
		config,
		workspaceDir,
		env,
		onlyPluginIds: params.onlyPluginIds,
		origin: params.origin
	});
	return {
		env,
		config,
		activationSourceConfig,
		autoEnabledReasons,
		workspaceDir,
		cache: params.cache ?? false,
		activate: params.activate ?? false,
		...onlyPluginIds ? { onlyPluginIds } : {},
		logger: createPluginLoaderLogger(log)
	};
}
function mapRegistryWebFetchProviders(params) {
	const onlyPluginIdSet = params.onlyPluginIds && params.onlyPluginIds.length > 0 ? new Set(params.onlyPluginIds) : null;
	return sortWebFetchProviders(params.registry.webFetchProviders.filter((entry) => !onlyPluginIdSet || onlyPluginIdSet.has(entry.pluginId)).map((entry) => ({
		...entry.provider,
		pluginId: entry.pluginId
	})));
}
function resolvePluginWebFetchProviders(params) {
	const env = params.env ?? process.env;
	const workspaceDir = params.workspaceDir ?? getActivePluginRegistryWorkspaceDir();
	if (params.mode === "setup") {
		const pluginIds = resolveWebFetchCandidatePluginIds({
			config: params.config,
			workspaceDir,
			env,
			onlyPluginIds: params.onlyPluginIds,
			origin: params.origin
		}) ?? [];
		if (pluginIds.length === 0) return [];
		return mapRegistryWebFetchProviders({
			registry: loadOpenClawPlugins({
				config: withActivatedPluginIds({
					config: params.config,
					pluginIds
				}),
				activationSourceConfig: params.config,
				autoEnabledReasons: {},
				workspaceDir,
				env,
				onlyPluginIds: pluginIds,
				cache: params.cache ?? false,
				activate: params.activate ?? false,
				logger: createPluginLoaderLogger(log)
			}),
			onlyPluginIds: pluginIds
		});
	}
	const cacheOwnerConfig = params.config;
	const shouldMemoizeSnapshot = params.activate !== true && params.cache !== true && shouldUsePluginSnapshotCache(env);
	const cacheKey = buildWebFetchSnapshotCacheKey({
		config: cacheOwnerConfig,
		workspaceDir,
		bundledAllowlistCompat: params.bundledAllowlistCompat,
		onlyPluginIds: params.onlyPluginIds,
		origin: params.origin,
		env
	});
	if (cacheOwnerConfig && shouldMemoizeSnapshot) {
		const cached = (webFetchProviderSnapshotCache.get(cacheOwnerConfig)?.get(env))?.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) return cached.providers;
	}
	const loadOptions = resolveWebFetchLoadOptions({
		...params,
		workspaceDir
	});
	const resolved = mapRegistryWebFetchProviders({ registry: resolveCompatibleRuntimePluginRegistry(loadOptions) ?? loadOpenClawPlugins(loadOptions) });
	if (cacheOwnerConfig && shouldMemoizeSnapshot) {
		const ttlMs = resolvePluginSnapshotCacheTtlMs(env);
		let configCache = webFetchProviderSnapshotCache.get(cacheOwnerConfig);
		if (!configCache) {
			configCache = /* @__PURE__ */ new WeakMap();
			webFetchProviderSnapshotCache.set(cacheOwnerConfig, configCache);
		}
		let envCache = configCache.get(env);
		if (!envCache) {
			envCache = /* @__PURE__ */ new Map();
			configCache.set(env, envCache);
		}
		envCache.set(cacheKey, {
			expiresAt: Date.now() + ttlMs,
			providers: resolved
		});
	}
	return resolved;
}
//#endregion
//#region src/secrets/runtime-web-tools.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeProvider(value, providers) {
	if (typeof value !== "string") return;
	const normalized = value.trim().toLowerCase();
	if (providers.some((provider) => provider.id === normalized)) return normalized;
}
function normalizeFetchProvider(value, providers) {
	if (typeof value !== "string") return;
	const normalized = value.trim().toLowerCase();
	if (providers.some((provider) => provider.id === normalized)) return normalized;
}
function hasCustomWebSearchPluginRisk(config) {
	const plugins = config.plugins;
	if (!plugins) return false;
	if (Array.isArray(plugins.load?.paths) && plugins.load.paths.length > 0) return true;
	if (plugins.installs && Object.keys(plugins.installs).length > 0) return true;
	const bundledPluginIds = new Set(resolveManifestContractPluginIds({
		contract: "webSearchProviders",
		origin: "bundled",
		config,
		env: process.env
	}));
	const hasNonBundledPluginId = (pluginId) => !bundledPluginIds.has(pluginId.trim());
	if (Array.isArray(plugins.allow) && plugins.allow.some(hasNonBundledPluginId)) return true;
	if (Array.isArray(plugins.deny) && plugins.deny.some(hasNonBundledPluginId)) return true;
	if (plugins.entries && Object.keys(plugins.entries).some(hasNonBundledPluginId)) return true;
	return false;
}
function readNonEmptyEnvValue(env, names) {
	for (const envVar of names) {
		const value = normalizeSecretInput(env[envVar]);
		if (value) return {
			value,
			envVar
		};
	}
	return {};
}
function buildUnresolvedReason(params) {
	if (params.kind === "non-string") return `${params.path} SecretRef resolved to a non-string value.`;
	if (params.kind === "empty") return `${params.path} SecretRef resolved to an empty value.`;
	return `${params.path} SecretRef is unresolved (${params.refLabel}).`;
}
async function resolveSecretInputWithEnvFallback(params) {
	const { ref } = resolveSecretInputRef({
		value: params.value,
		defaults: params.defaults
	});
	if (!ref) {
		const configValue = normalizeSecretInput(params.value);
		if (configValue) return {
			value: configValue,
			source: "config",
			secretRefConfigured: false,
			fallbackUsedAfterRefFailure: false
		};
		const fallback = readNonEmptyEnvValue(params.context.env, params.envVars);
		if (fallback.value) return {
			value: fallback.value,
			source: "env",
			fallbackEnvVar: fallback.envVar,
			secretRefConfigured: false,
			fallbackUsedAfterRefFailure: false
		};
		return {
			source: "missing",
			secretRefConfigured: false,
			fallbackUsedAfterRefFailure: false
		};
	}
	const refLabel = `${ref.source}:${ref.provider}:${ref.id}`;
	let resolvedFromRef;
	let unresolvedRefReason;
	if (params.restrictEnvRefsToEnvVars === true && ref.source === "env" && !params.envVars.includes(ref.id)) unresolvedRefReason = `${params.path} SecretRef env var "${ref.id}" is not allowed.`;
	else try {
		const resolvedValue = (await resolveSecretRefValues([ref], {
			config: params.sourceConfig,
			env: params.context.env,
			cache: params.context.cache
		})).get(secretRefKey(ref));
		if (typeof resolvedValue !== "string") unresolvedRefReason = buildUnresolvedReason({
			path: params.path,
			kind: "non-string",
			refLabel
		});
		else {
			resolvedFromRef = normalizeSecretInput(resolvedValue);
			if (!resolvedFromRef) unresolvedRefReason = buildUnresolvedReason({
				path: params.path,
				kind: "empty",
				refLabel
			});
		}
	} catch {
		unresolvedRefReason = buildUnresolvedReason({
			path: params.path,
			kind: "unresolved",
			refLabel
		});
	}
	if (resolvedFromRef) return {
		value: resolvedFromRef,
		source: "secretRef",
		secretRefConfigured: true,
		fallbackUsedAfterRefFailure: false
	};
	const fallback = readNonEmptyEnvValue(params.context.env, params.envVars);
	if (fallback.value) return {
		value: fallback.value,
		source: "env",
		fallbackEnvVar: fallback.envVar,
		unresolvedRefReason,
		secretRefConfigured: true,
		fallbackUsedAfterRefFailure: true
	};
	return {
		source: "missing",
		unresolvedRefReason,
		secretRefConfigured: true,
		fallbackUsedAfterRefFailure: false
	};
}
function ensureObject(target, key) {
	const current = target[key];
	if (isRecord(current)) return current;
	const next = {};
	target[key] = next;
	return next;
}
function setResolvedWebSearchApiKey(params) {
	const search = ensureObject(ensureObject(ensureObject(params.resolvedConfig, "tools"), "web"), "search");
	if (params.provider.setConfiguredCredentialValue) {
		params.provider.setConfiguredCredentialValue(params.resolvedConfig, params.value);
		if (params.provider.id !== "brave") return;
	}
	params.provider.setCredentialValue(search, params.value);
}
function keyPathForProvider(provider) {
	return provider.credentialPath;
}
function readConfiguredProviderCredential(params) {
	return params.provider.getConfiguredCredentialValue?.(params.config) ?? params.provider.getCredentialValue(params.search);
}
function inactivePathsForProvider(provider) {
	if (provider.requiresCredential === false) return [];
	return provider.inactiveSecretPaths?.length ? provider.inactiveSecretPaths : [provider.credentialPath];
}
function setResolvedWebFetchApiKey(params) {
	const fetch = ensureObject(ensureObject(ensureObject(params.resolvedConfig, "tools"), "web"), "fetch");
	if (params.provider.setConfiguredCredentialValue) {
		params.provider.setConfiguredCredentialValue(params.resolvedConfig, params.value);
		return;
	}
	params.provider.setCredentialValue(fetch, params.value);
}
function keyPathForFetchProvider(provider) {
	return provider.credentialPath;
}
function readConfiguredFetchProviderCredential(params) {
	return params.provider.getConfiguredCredentialValue?.(params.config) ?? params.provider.getCredentialValue(params.fetch);
}
function inactivePathsForFetchProvider(provider) {
	if (provider.requiresCredential === false) return [];
	return provider.inactiveSecretPaths?.length ? provider.inactiveSecretPaths : [provider.credentialPath];
}
function hasConfiguredSecretRef(value, defaults) {
	return Boolean(resolveSecretInputRef({
		value,
		defaults
	}).ref);
}
async function resolveRuntimeWebTools(params) {
	const defaults = params.sourceConfig.secrets?.defaults;
	const diagnostics = [];
	const tools = isRecord(params.sourceConfig.tools) ? params.sourceConfig.tools : void 0;
	const web = isRecord(tools?.web) ? tools.web : void 0;
	const search = isRecord(web?.search) ? web.search : void 0;
	const rawProvider = typeof search?.provider === "string" ? search.provider.trim().toLowerCase() : "";
	const configuredBundledPluginId = resolveManifestContractOwnerPluginId({
		contract: "webSearchProviders",
		value: rawProvider,
		origin: "bundled",
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		}
	});
	const searchMetadata = {
		providerSource: "none",
		diagnostics: []
	};
	const searchProviders = sortWebSearchProvidersForAutoDetect(configuredBundledPluginId ? resolvePluginWebSearchProviders({
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		},
		bundledAllowlistCompat: true,
		onlyPluginIds: [configuredBundledPluginId],
		origin: "bundled"
	}) : !hasCustomWebSearchPluginRisk(params.sourceConfig) ? resolvePluginWebSearchProviders({
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		},
		bundledAllowlistCompat: true,
		origin: "bundled"
	}) : resolvePluginWebSearchProviders({
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		},
		bundledAllowlistCompat: true
	}));
	const hasConfiguredSearchSurface = Boolean(search) || searchProviders.some((provider) => {
		if (provider.requiresCredential === false) return false;
		return readConfiguredProviderCredential({
			provider,
			config: params.sourceConfig,
			search
		}) !== void 0;
	});
	const searchEnabled = hasConfiguredSearchSurface && search?.enabled !== false;
	const providers = hasConfiguredSearchSurface ? searchProviders : [];
	const configuredProvider = normalizeProvider(rawProvider, providers);
	if (rawProvider && !configuredProvider) {
		const diagnostic = {
			code: "WEB_SEARCH_PROVIDER_INVALID_AUTODETECT",
			message: `tools.web.search.provider is "${rawProvider}". Falling back to auto-detect precedence.`,
			path: "tools.web.search.provider"
		};
		diagnostics.push(diagnostic);
		searchMetadata.diagnostics.push(diagnostic);
		pushWarning(params.context, {
			code: "WEB_SEARCH_PROVIDER_INVALID_AUTODETECT",
			path: "tools.web.search.provider",
			message: diagnostic.message
		});
	}
	if (configuredProvider) {
		searchMetadata.providerConfigured = configuredProvider;
		searchMetadata.providerSource = "configured";
	}
	if (searchEnabled) {
		const candidates = configuredProvider ? providers.filter((provider) => provider.id === configuredProvider) : providers;
		const unresolvedWithoutFallback = [];
		let selectedProvider;
		let selectedResolution;
		let keylessFallbackProvider;
		for (const provider of candidates) {
			if (provider.requiresCredential === false) {
				if (!keylessFallbackProvider) keylessFallbackProvider = provider;
				if (configuredProvider) {
					selectedProvider = provider.id;
					break;
				}
				continue;
			}
			const path = keyPathForProvider(provider);
			const value = readConfiguredProviderCredential({
				provider,
				config: params.sourceConfig,
				search
			});
			const resolution = await resolveSecretInputWithEnvFallback({
				sourceConfig: params.sourceConfig,
				context: params.context,
				defaults,
				value,
				path,
				envVars: provider.envVars
			});
			if (resolution.secretRefConfigured && resolution.fallbackUsedAfterRefFailure) {
				const diagnostic = {
					code: "WEB_SEARCH_KEY_UNRESOLVED_FALLBACK_USED",
					message: `${path} SecretRef could not be resolved; using ${resolution.fallbackEnvVar ?? "env fallback"}. ` + (resolution.unresolvedRefReason ?? "").trim(),
					path
				};
				diagnostics.push(diagnostic);
				searchMetadata.diagnostics.push(diagnostic);
				pushWarning(params.context, {
					code: "WEB_SEARCH_KEY_UNRESOLVED_FALLBACK_USED",
					path,
					message: diagnostic.message
				});
			}
			if (resolution.secretRefConfigured && !resolution.value && resolution.unresolvedRefReason) unresolvedWithoutFallback.push({
				provider: provider.id,
				path,
				reason: resolution.unresolvedRefReason
			});
			if (configuredProvider) {
				selectedProvider = provider.id;
				selectedResolution = resolution;
				if (resolution.value) setResolvedWebSearchApiKey({
					resolvedConfig: params.resolvedConfig,
					provider,
					value: resolution.value
				});
				break;
			}
			if (resolution.value) {
				selectedProvider = provider.id;
				selectedResolution = resolution;
				setResolvedWebSearchApiKey({
					resolvedConfig: params.resolvedConfig,
					provider,
					value: resolution.value
				});
				break;
			}
		}
		if (!selectedProvider && keylessFallbackProvider) {
			selectedProvider = keylessFallbackProvider.id;
			selectedResolution = {
				source: "missing",
				secretRefConfigured: false,
				fallbackUsedAfterRefFailure: false
			};
		}
		const failUnresolvedSearchNoFallback = (unresolved) => {
			const diagnostic = {
				code: "WEB_SEARCH_KEY_UNRESOLVED_NO_FALLBACK",
				message: unresolved.reason,
				path: unresolved.path
			};
			diagnostics.push(diagnostic);
			searchMetadata.diagnostics.push(diagnostic);
			pushWarning(params.context, {
				code: "WEB_SEARCH_KEY_UNRESOLVED_NO_FALLBACK",
				path: unresolved.path,
				message: unresolved.reason
			});
			throw new Error(`[WEB_SEARCH_KEY_UNRESOLVED_NO_FALLBACK] ${unresolved.reason}`);
		};
		if (configuredProvider) {
			const unresolved = unresolvedWithoutFallback[0];
			if (unresolved) failUnresolvedSearchNoFallback(unresolved);
		} else {
			if (!selectedProvider && unresolvedWithoutFallback.length > 0) failUnresolvedSearchNoFallback(unresolvedWithoutFallback[0]);
			if (selectedProvider) {
				const diagnostic = {
					code: "WEB_SEARCH_AUTODETECT_SELECTED",
					message: providers.find((entry) => entry.id === selectedProvider)?.requiresCredential === false ? `tools.web.search auto-detected keyless provider "${selectedProvider}" as the default fallback.` : `tools.web.search auto-detected provider "${selectedProvider}" from available credentials.`,
					path: "tools.web.search.provider"
				};
				diagnostics.push(diagnostic);
				searchMetadata.diagnostics.push(diagnostic);
			}
		}
		if (selectedProvider) {
			searchMetadata.selectedProvider = selectedProvider;
			searchMetadata.selectedProviderKeySource = selectedResolution?.source;
			if (!configuredProvider) searchMetadata.providerSource = "auto-detect";
			const provider = providers.find((entry) => entry.id === selectedProvider);
			if (provider?.resolveRuntimeMetadata) Object.assign(searchMetadata, await provider.resolveRuntimeMetadata({
				config: params.sourceConfig,
				searchConfig: search,
				runtimeMetadata: searchMetadata,
				resolvedCredential: selectedResolution ? {
					value: selectedResolution.value,
					source: selectedResolution.source,
					fallbackEnvVar: selectedResolution.fallbackEnvVar
				} : void 0
			}));
		}
	}
	if (searchEnabled && !configuredProvider && searchMetadata.selectedProvider) for (const provider of providers) {
		if (provider.id === searchMetadata.selectedProvider) continue;
		if (!hasConfiguredSecretRef(readConfiguredProviderCredential({
			provider,
			config: params.sourceConfig,
			search
		}), defaults)) continue;
		for (const path of inactivePathsForProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: `tools.web.search auto-detected provider is "${searchMetadata.selectedProvider}".`
		});
	}
	else if (search && !searchEnabled) for (const provider of providers) {
		if (!hasConfiguredSecretRef(readConfiguredProviderCredential({
			provider,
			config: params.sourceConfig,
			search
		}), defaults)) continue;
		for (const path of inactivePathsForProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: "tools.web.search is disabled."
		});
	}
	if (searchEnabled && search && configuredProvider) for (const provider of providers) {
		if (provider.id === configuredProvider) continue;
		if (!hasConfiguredSecretRef(readConfiguredProviderCredential({
			provider,
			config: params.sourceConfig,
			search
		}), defaults)) continue;
		for (const path of inactivePathsForProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: `tools.web.search.provider is "${configuredProvider}".`
		});
	}
	const fetch = isRecord(web?.fetch) ? web.fetch : void 0;
	const rawFetchProvider = typeof fetch?.provider === "string" ? fetch.provider.trim().toLowerCase() : "";
	const configuredBundledFetchPluginId = resolveManifestContractOwnerPluginId({
		contract: "webFetchProviders",
		value: rawFetchProvider,
		origin: "bundled",
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		}
	});
	const fetchMetadata = {
		providerSource: "none",
		diagnostics: []
	};
	const fetchProviders = sortWebFetchProvidersForAutoDetect(configuredBundledFetchPluginId ? resolvePluginWebFetchProviders({
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		},
		bundledAllowlistCompat: true,
		onlyPluginIds: [configuredBundledFetchPluginId],
		origin: "bundled"
	}) : resolvePluginWebFetchProviders({
		config: params.sourceConfig,
		env: {
			...process.env,
			...params.context.env
		},
		bundledAllowlistCompat: true,
		origin: "bundled"
	}));
	const fetchEnabled = (Boolean(fetch) || fetchProviders.some((provider) => {
		return readConfiguredFetchProviderCredential({
			provider,
			config: params.sourceConfig,
			fetch
		}) !== void 0;
	})) && fetch?.enabled !== false;
	const configuredFetchProvider = normalizeFetchProvider(rawFetchProvider, fetchProviders);
	if (rawFetchProvider && !configuredFetchProvider) {
		const diagnostic = {
			code: "WEB_FETCH_PROVIDER_INVALID_AUTODETECT",
			message: `tools.web.fetch.provider is "${rawFetchProvider}". Falling back to auto-detect precedence.`,
			path: "tools.web.fetch.provider"
		};
		diagnostics.push(diagnostic);
		fetchMetadata.diagnostics.push(diagnostic);
		pushWarning(params.context, {
			code: "WEB_FETCH_PROVIDER_INVALID_AUTODETECT",
			path: "tools.web.fetch.provider",
			message: diagnostic.message
		});
	}
	if (configuredFetchProvider) {
		fetchMetadata.providerConfigured = configuredFetchProvider;
		fetchMetadata.providerSource = "configured";
	}
	if (fetchEnabled) {
		const candidates = configuredFetchProvider ? fetchProviders.filter((provider) => provider.id === configuredFetchProvider) : fetchProviders;
		const unresolvedWithoutFallback = [];
		let selectedProvider;
		let selectedResolution;
		for (const provider of candidates) {
			if (provider.requiresCredential === false) {
				selectedProvider = provider.id;
				selectedResolution = {
					source: "missing",
					secretRefConfigured: false,
					fallbackUsedAfterRefFailure: false
				};
				break;
			}
			const path = keyPathForFetchProvider(provider);
			const value = readConfiguredFetchProviderCredential({
				provider,
				config: params.sourceConfig,
				fetch
			});
			const resolution = await resolveSecretInputWithEnvFallback({
				sourceConfig: params.sourceConfig,
				context: params.context,
				defaults,
				value,
				path,
				envVars: provider.envVars,
				restrictEnvRefsToEnvVars: true
			});
			if (resolution.secretRefConfigured && resolution.fallbackUsedAfterRefFailure) {
				const diagnostic = {
					code: "WEB_FETCH_PROVIDER_KEY_UNRESOLVED_FALLBACK_USED",
					message: `${path} SecretRef could not be resolved; using ${resolution.fallbackEnvVar ?? "env fallback"}. ` + (resolution.unresolvedRefReason ?? "").trim(),
					path
				};
				diagnostics.push(diagnostic);
				fetchMetadata.diagnostics.push(diagnostic);
				pushWarning(params.context, {
					code: "WEB_FETCH_PROVIDER_KEY_UNRESOLVED_FALLBACK_USED",
					path,
					message: diagnostic.message
				});
			}
			if (resolution.secretRefConfigured && !resolution.value && resolution.unresolvedRefReason) unresolvedWithoutFallback.push({
				provider: provider.id,
				path,
				reason: resolution.unresolvedRefReason
			});
			if (configuredFetchProvider) {
				selectedProvider = provider.id;
				selectedResolution = resolution;
				if (resolution.value) setResolvedWebFetchApiKey({
					resolvedConfig: params.resolvedConfig,
					provider,
					value: resolution.value
				});
				break;
			}
			if (resolution.value) {
				selectedProvider = provider.id;
				selectedResolution = resolution;
				setResolvedWebFetchApiKey({
					resolvedConfig: params.resolvedConfig,
					provider,
					value: resolution.value
				});
				break;
			}
		}
		const failUnresolvedFetchNoFallback = (unresolved) => {
			const diagnostic = {
				code: "WEB_FETCH_PROVIDER_KEY_UNRESOLVED_NO_FALLBACK",
				message: unresolved.reason,
				path: unresolved.path
			};
			diagnostics.push(diagnostic);
			fetchMetadata.diagnostics.push(diagnostic);
			pushWarning(params.context, {
				code: "WEB_FETCH_PROVIDER_KEY_UNRESOLVED_NO_FALLBACK",
				path: unresolved.path,
				message: unresolved.reason
			});
			throw new Error(`[WEB_FETCH_PROVIDER_KEY_UNRESOLVED_NO_FALLBACK] ${unresolved.reason}`);
		};
		if (configuredFetchProvider) {
			const unresolved = unresolvedWithoutFallback[0];
			if (unresolved) failUnresolvedFetchNoFallback(unresolved);
		} else {
			if (!selectedProvider && unresolvedWithoutFallback.length > 0) failUnresolvedFetchNoFallback(unresolvedWithoutFallback[0]);
			if (selectedProvider) {
				const diagnostic = {
					code: "WEB_FETCH_AUTODETECT_SELECTED",
					message: fetchProviders.find((entry) => entry.id === selectedProvider)?.requiresCredential === false ? `tools.web.fetch auto-detected keyless provider "${selectedProvider}" as the default fallback.` : `tools.web.fetch auto-detected provider "${selectedProvider}" from available credentials.`,
					path: "tools.web.fetch.provider"
				};
				diagnostics.push(diagnostic);
				fetchMetadata.diagnostics.push(diagnostic);
			}
		}
		if (selectedProvider) {
			fetchMetadata.selectedProvider = selectedProvider;
			fetchMetadata.selectedProviderKeySource = selectedResolution?.source;
			if (!configuredFetchProvider) fetchMetadata.providerSource = "auto-detect";
			const provider = fetchProviders.find((entry) => entry.id === selectedProvider);
			if (provider?.resolveRuntimeMetadata) Object.assign(fetchMetadata, await provider.resolveRuntimeMetadata({
				config: params.sourceConfig,
				fetchConfig: fetch,
				runtimeMetadata: fetchMetadata,
				resolvedCredential: selectedResolution ? {
					value: selectedResolution.value,
					source: selectedResolution.source,
					fallbackEnvVar: selectedResolution.fallbackEnvVar
				} : void 0
			}));
		}
	}
	if (fetchEnabled && !configuredFetchProvider && fetchMetadata.selectedProvider) for (const provider of fetchProviders) {
		if (provider.id === fetchMetadata.selectedProvider) continue;
		if (!hasConfiguredSecretRef(readConfiguredFetchProviderCredential({
			provider,
			config: params.sourceConfig,
			fetch
		}), defaults)) continue;
		for (const path of inactivePathsForFetchProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: `tools.web.fetch auto-detected provider is "${fetchMetadata.selectedProvider}".`
		});
	}
	else if (fetch && !fetchEnabled) for (const provider of fetchProviders) {
		if (!hasConfiguredSecretRef(readConfiguredFetchProviderCredential({
			provider,
			config: params.sourceConfig,
			fetch
		}), defaults)) continue;
		for (const path of inactivePathsForFetchProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: "tools.web.fetch is disabled."
		});
	}
	if (fetchEnabled && fetch && configuredFetchProvider) for (const provider of fetchProviders) {
		if (provider.id === configuredFetchProvider) continue;
		if (!hasConfiguredSecretRef(readConfiguredFetchProviderCredential({
			provider,
			config: params.sourceConfig,
			fetch
		}), defaults)) continue;
		for (const path of inactivePathsForFetchProvider(provider)) pushInactiveSurfaceWarning({
			context: params.context,
			path,
			details: `tools.web.fetch.provider is "${configuredFetchProvider}".`
		});
	}
	return {
		search: searchMetadata,
		fetch: fetchMetadata,
		diagnostics
	};
}
//#endregion
export { GATEWAY_AUTH_SURFACE_PATHS as a, collectCommandSecretAssignmentsFromSnapshot as c, collectConfigAssignments as i, resolvePluginWebFetchProviders as n, evaluateGatewayAuthSurfaceStates as o, sortWebFetchProvidersForAutoDetect as r, analyzeCommandSecretAssignmentsFromSnapshot as s, resolveRuntimeWebTools as t };
