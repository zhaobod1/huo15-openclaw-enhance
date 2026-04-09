import { m as resolveUserPath } from "./utils-ms6h9yny.js";
import { a as loadAuthProfileStoreForSecretsRuntime, o as replaceRuntimeAuthProfileStoreSnapshots, t as clearRuntimeAuthProfileStoreSnapshots } from "./store-HF_Z-jKz.js";
import { n as assertNoOAuthSecretRefPolicyViolations } from "./auth-profiles-gRFfbuWd.js";
import { a as resolveAgentDir, m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir, r as listAgentIds } from "./agent-scope-CXWTwwic.js";
import { n as loadPluginManifestRegistry } from "./manifest-registry-Cqdpf6fh.js";
import { d as resolveSecretInputRef } from "./types.secrets-BZdSA8i7.js";
import { o as setRuntimeConfigSnapshot, s as setRuntimeConfigSnapshotRefreshHandler, t as clearRuntimeConfigSnapshot } from "./runtime-snapshot-BQtdTwL2.js";
import "./config-dzPpvDz6.js";
import { r as isNonEmptyString } from "./shared-BTjsck-6.js";
import { o as resolveSecretRefValues } from "./resolve-D4yyG1J7.js";
import { t as resolveOpenClawAgentDir } from "./agent-paths-BQP0rGzW.js";
import { c as pushAssignment, i as createResolverContext, n as applyResolvedAssignments, u as pushWarning } from "./runtime-config-collectors-tts-B43VyFVH.js";
import { c as collectCommandSecretAssignmentsFromSnapshot, i as collectConfigAssignments, t as resolveRuntimeWebTools } from "./runtime-web-tools-vw9N-YeZ.js";
import { n as getActiveRuntimeWebToolsMetadata$1, r as setActiveRuntimeWebToolsMetadata, t as clearActiveRuntimeWebToolsMetadata } from "./runtime-web-tools-state-BKtRHIj3.js";
//#region src/secrets/runtime-auth-collectors.ts
function collectApiKeyProfileAssignment(params) {
	const { explicitRef: keyRef, inlineRef: inlineKeyRef, ref: resolvedKeyRef } = resolveSecretInputRef({
		value: params.profile.key,
		refValue: params.profile.keyRef,
		defaults: params.defaults
	});
	if (!resolvedKeyRef) return;
	if (!keyRef && inlineKeyRef) params.profile.keyRef = inlineKeyRef;
	if (keyRef && isNonEmptyString(params.profile.key)) pushWarning(params.context, {
		code: "SECRETS_REF_OVERRIDES_PLAINTEXT",
		path: `${params.agentDir}.auth-profiles.${params.profileId}.key`,
		message: `auth-profiles ${params.profileId}: keyRef is set; runtime will ignore plaintext key.`
	});
	pushAssignment(params.context, {
		ref: resolvedKeyRef,
		path: `${params.agentDir}.auth-profiles.${params.profileId}.key`,
		expected: "string",
		apply: (value) => {
			params.profile.key = String(value);
		}
	});
}
function collectTokenProfileAssignment(params) {
	const { explicitRef: tokenRef, inlineRef: inlineTokenRef, ref: resolvedTokenRef } = resolveSecretInputRef({
		value: params.profile.token,
		refValue: params.profile.tokenRef,
		defaults: params.defaults
	});
	if (!resolvedTokenRef) return;
	if (!tokenRef && inlineTokenRef) params.profile.tokenRef = inlineTokenRef;
	if (tokenRef && isNonEmptyString(params.profile.token)) pushWarning(params.context, {
		code: "SECRETS_REF_OVERRIDES_PLAINTEXT",
		path: `${params.agentDir}.auth-profiles.${params.profileId}.token`,
		message: `auth-profiles ${params.profileId}: tokenRef is set; runtime will ignore plaintext token.`
	});
	pushAssignment(params.context, {
		ref: resolvedTokenRef,
		path: `${params.agentDir}.auth-profiles.${params.profileId}.token`,
		expected: "string",
		apply: (value) => {
			params.profile.token = String(value);
		}
	});
}
function collectAuthStoreAssignments(params) {
	assertNoOAuthSecretRefPolicyViolations({
		store: params.store,
		cfg: params.context.sourceConfig,
		context: `auth-profiles ${params.agentDir}`
	});
	const defaults = params.context.sourceConfig.secrets?.defaults;
	for (const [profileId, profile] of Object.entries(params.store.profiles)) {
		if (profile.type === "api_key") {
			collectApiKeyProfileAssignment({
				profile,
				profileId,
				agentDir: params.agentDir,
				defaults,
				context: params.context
			});
			continue;
		}
		if (profile.type === "token") collectTokenProfileAssignment({
			profile,
			profileId,
			agentDir: params.agentDir,
			defaults,
			context: params.context
		});
	}
}
//#endregion
//#region src/secrets/runtime.ts
const RUNTIME_PATH_ENV_KEYS = [
	"HOME",
	"USERPROFILE",
	"HOMEDRIVE",
	"HOMEPATH",
	"OPENCLAW_HOME",
	"OPENCLAW_STATE_DIR",
	"OPENCLAW_CONFIG_PATH",
	"OPENCLAW_AGENT_DIR",
	"PI_CODING_AGENT_DIR",
	"OPENCLAW_TEST_FAST"
];
let activeSnapshot = null;
let activeRefreshContext = null;
const preparedSnapshotRefreshContext = /* @__PURE__ */ new WeakMap();
function cloneSnapshot(snapshot) {
	return {
		sourceConfig: structuredClone(snapshot.sourceConfig),
		config: structuredClone(snapshot.config),
		authStores: snapshot.authStores.map((entry) => ({
			agentDir: entry.agentDir,
			store: structuredClone(entry.store)
		})),
		warnings: snapshot.warnings.map((warning) => ({ ...warning })),
		webTools: structuredClone(snapshot.webTools)
	};
}
function cloneRefreshContext(context) {
	return {
		env: { ...context.env },
		explicitAgentDirs: context.explicitAgentDirs ? [...context.explicitAgentDirs] : null,
		loadAuthStore: context.loadAuthStore,
		loadablePluginOrigins: new Map(context.loadablePluginOrigins)
	};
}
function clearActiveSecretsRuntimeState() {
	activeSnapshot = null;
	activeRefreshContext = null;
	clearActiveRuntimeWebToolsMetadata();
	setRuntimeConfigSnapshotRefreshHandler(null);
	clearRuntimeConfigSnapshot();
	clearRuntimeAuthProfileStoreSnapshots();
}
function collectCandidateAgentDirs(config, env = process.env) {
	const dirs = /* @__PURE__ */ new Set();
	dirs.add(resolveUserPath(resolveOpenClawAgentDir(env), env));
	for (const agentId of listAgentIds(config)) dirs.add(resolveUserPath(resolveAgentDir(config, agentId, env), env));
	return [...dirs];
}
function resolveRefreshAgentDirs(config, context) {
	const configDerived = collectCandidateAgentDirs(config, context.env);
	if (!context.explicitAgentDirs || context.explicitAgentDirs.length === 0) return configDerived;
	return [...new Set([...context.explicitAgentDirs, ...configDerived])];
}
function resolveLoadablePluginOrigins(params) {
	const workspaceDir = resolveAgentWorkspaceDir(params.config, resolveDefaultAgentId(params.config));
	const manifestRegistry = loadPluginManifestRegistry({
		config: params.config,
		workspaceDir,
		cache: true,
		env: params.env
	});
	return new Map(manifestRegistry.plugins.map((record) => [record.id, record.origin]));
}
function mergeSecretsRuntimeEnv(env) {
	const merged = { ...env ?? process.env };
	for (const key of RUNTIME_PATH_ENV_KEYS) {
		if (merged[key] !== void 0) continue;
		const processValue = process.env[key];
		if (processValue !== void 0) merged[key] = processValue;
	}
	return merged;
}
async function prepareSecretsRuntimeSnapshot(params) {
	const runtimeEnv = mergeSecretsRuntimeEnv(params.env);
	const sourceConfig = structuredClone(params.config);
	const resolvedConfig = structuredClone(params.config);
	const loadablePluginOrigins = params.loadablePluginOrigins ?? resolveLoadablePluginOrigins({
		config: sourceConfig,
		env: runtimeEnv
	});
	const context = createResolverContext({
		sourceConfig,
		env: runtimeEnv
	});
	collectConfigAssignments({
		config: resolvedConfig,
		context,
		loadablePluginOrigins
	});
	const includeAuthStoreRefs = params.includeAuthStoreRefs ?? true;
	const authStores = [];
	const loadAuthStore = params.loadAuthStore ?? loadAuthProfileStoreForSecretsRuntime;
	const candidateDirs = params.agentDirs?.length ? [...new Set(params.agentDirs.map((entry) => resolveUserPath(entry, runtimeEnv)))] : collectCandidateAgentDirs(resolvedConfig, runtimeEnv);
	if (includeAuthStoreRefs) for (const agentDir of candidateDirs) {
		const store = structuredClone(loadAuthStore(agentDir));
		collectAuthStoreAssignments({
			store,
			context,
			agentDir
		});
		authStores.push({
			agentDir,
			store
		});
	}
	if (context.assignments.length > 0) {
		const resolved = await resolveSecretRefValues(context.assignments.map((assignment) => assignment.ref), {
			config: sourceConfig,
			env: context.env,
			cache: context.cache
		});
		applyResolvedAssignments({
			assignments: context.assignments,
			resolved
		});
	}
	const snapshot = {
		sourceConfig,
		config: resolvedConfig,
		authStores,
		warnings: context.warnings,
		webTools: await resolveRuntimeWebTools({
			sourceConfig,
			resolvedConfig,
			context
		})
	};
	preparedSnapshotRefreshContext.set(snapshot, {
		env: runtimeEnv,
		explicitAgentDirs: params.agentDirs?.length ? [...candidateDirs] : null,
		loadAuthStore,
		loadablePluginOrigins
	});
	return snapshot;
}
function activateSecretsRuntimeSnapshot(snapshot) {
	const next = cloneSnapshot(snapshot);
	const refreshContext = preparedSnapshotRefreshContext.get(snapshot) ?? activeRefreshContext ?? {
		env: { ...process.env },
		explicitAgentDirs: null,
		loadAuthStore: loadAuthProfileStoreForSecretsRuntime,
		loadablePluginOrigins: resolveLoadablePluginOrigins({
			config: next.sourceConfig,
			env: process.env
		})
	};
	setRuntimeConfigSnapshot(next.config, next.sourceConfig);
	replaceRuntimeAuthProfileStoreSnapshots(next.authStores);
	activeSnapshot = next;
	activeRefreshContext = cloneRefreshContext(refreshContext);
	setActiveRuntimeWebToolsMetadata(next.webTools);
	setRuntimeConfigSnapshotRefreshHandler({ refresh: async ({ sourceConfig }) => {
		if (!activeSnapshot || !activeRefreshContext) return false;
		activateSecretsRuntimeSnapshot(await prepareSecretsRuntimeSnapshot({
			config: sourceConfig,
			env: activeRefreshContext.env,
			agentDirs: resolveRefreshAgentDirs(sourceConfig, activeRefreshContext),
			loadAuthStore: activeRefreshContext.loadAuthStore,
			loadablePluginOrigins: activeRefreshContext.loadablePluginOrigins
		}));
		return true;
	} });
}
function getActiveSecretsRuntimeSnapshot() {
	if (!activeSnapshot) return null;
	const snapshot = cloneSnapshot(activeSnapshot);
	if (activeRefreshContext) preparedSnapshotRefreshContext.set(snapshot, cloneRefreshContext(activeRefreshContext));
	return snapshot;
}
function getActiveRuntimeWebToolsMetadata() {
	return getActiveRuntimeWebToolsMetadata$1();
}
function resolveCommandSecretsFromActiveRuntimeSnapshot(params) {
	if (!activeSnapshot) throw new Error("Secrets runtime snapshot is not active.");
	if (params.targetIds.size === 0) return {
		assignments: [],
		diagnostics: [],
		inactiveRefPaths: []
	};
	const inactiveRefPaths = [...new Set(activeSnapshot.warnings.filter((warning) => warning.code === "SECRETS_REF_IGNORED_INACTIVE_SURFACE").map((warning) => warning.path))];
	const resolved = collectCommandSecretAssignmentsFromSnapshot({
		sourceConfig: activeSnapshot.sourceConfig,
		resolvedConfig: activeSnapshot.config,
		commandName: params.commandName,
		targetIds: params.targetIds,
		inactiveRefPaths: new Set(inactiveRefPaths)
	});
	return {
		assignments: resolved.assignments,
		diagnostics: resolved.diagnostics,
		inactiveRefPaths
	};
}
function clearSecretsRuntimeSnapshot() {
	clearActiveSecretsRuntimeState();
}
//#endregion
export { prepareSecretsRuntimeSnapshot as a, getActiveSecretsRuntimeSnapshot as i, clearSecretsRuntimeSnapshot as n, resolveCommandSecretsFromActiveRuntimeSnapshot as o, getActiveRuntimeWebToolsMetadata as r, activateSecretsRuntimeSnapshot as t };
