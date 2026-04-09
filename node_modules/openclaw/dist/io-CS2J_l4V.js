import { o as resolveRequiredHomeDir, t as expandHomePrefix } from "./home-dir-BnP38vVl.js";
import { l as isRecord$2, m as resolveUserPath, x as isPlainObject$2 } from "./utils-ms6h9yny.js";
import { o as discoverOpenClawPlugins, r as normalizeChatChannelId, s as resolvePluginCacheInputs, t as CHANNEL_IDS } from "./ids-Dm8ff2qI.js";
import { _ as resolveStateDir, n as DEFAULT_GATEWAY_PORT, o as resolveConfigPath } from "./paths-yyDPxM31.js";
import { c as normalizeAgentId } from "./session-key-BR3Z-ljs.js";
import { t as isBlockedObjectKey } from "./prototype-keys-DxnN-2X5.js";
import { m as resolveDefaultAgentId, p as resolveAgentWorkspaceDir } from "./agent-scope-CXWTwwic.js";
import "./model-selection-BVM4eHHo.js";
import { t as DEFAULT_CONTEXT_TOKENS } from "./defaults-I0_TmVEm.js";
import { n as VERSION } from "./version-Bh_RSQ5Y.js";
import { r as normalizeProviderId } from "./provider-id-CUjr7KCR.js";
import { i as normalizeEnvVarKey, n as isDangerousHostEnvOverrideVarName, r as isDangerousHostEnvVarName } from "./host-env-security-D-6e61X4.js";
import { t as loadDotEnv } from "./dotenv-B3WycJ2G.js";
import { a as shouldDeferShellEnvFallback, i as resolveShellEnvFallbackTimeoutMs, o as shouldEnableShellEnvFallback, r as loadShellEnvFallback } from "./shell-env-C1EhQ2Cz.js";
import { r as hasKind } from "./slots-C_o3k-JZ.js";
import { i as resolveManifestContractPluginIds, n as loadPluginManifestRegistry, r as resolveManifestContractOwnerPluginId } from "./manifest-registry-Cqdpf6fh.js";
import { n as buildPluginLoaderJitiOptions, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { t as sanitizeTerminalText } from "./safe-text-CZwe1QN-.js";
import { n as containsEnvVarReference, r as resolveConfigEnvVars } from "./env-substitution-D66ySIYd.js";
import { a as resolveConfigIncludes, i as readConfigIncludeFileWithGuards, n as ConfigIncludeError } from "./includes-CKXmmLvq.js";
import { n as iterateBootstrapChannelPlugins } from "./bootstrap-registry-DSG7nIY1.js";
import { t as isSafeExecutableValue } from "./exec-safety-C3Nd1_TQ.js";
import { t as withBundledPluginAllowlistCompat } from "./bundled-compat-DQFbvTG5.js";
import { a as normalizePluginsConfig, l as resolveMemorySlotDecision, s as resolveEffectivePluginActivationState } from "./config-state-CKMpUUgI.js";
import { a as validateJsonSchemaValue, o as appendAllowedValuesHint, s as summarizeAllowedValues, x as applyMergePatch } from "./loader-BkajlJCF.js";
import { O as resolveProviderConfigApiKeyWithPlugin, h as normalizeProviderConfigWithPlugin, n as applyProviderNativeStreamingUsageCompatWithPlugin, t as applyProviderConfigDefaultsWithPlugin } from "./provider-runtime-SgdEL2pb.js";
import { L as MODEL_APIS } from "./zod-schema.core-BITC5-JP.js";
import { i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { i as getRuntimeConfigSourceSnapshot, n as getRuntimeConfigSnapshot, o as setRuntimeConfigSnapshot, r as getRuntimeConfigSnapshotRefreshHandler } from "./runtime-snapshot-BQtdTwL2.js";
import { c as isWindowsAbsolutePath, i as isAvatarHttpUrl, n as hasAvatarUriScheme, o as isPathWithinRoot, r as isAvatarDataUrl } from "./avatar-policy-BCnKqB6F.js";
import { i as isCanonicalDottedDecimalIPv4, u as isLoopbackIpAddress } from "./ip-C7x9CDIB.js";
import { t as OpenClawSchema } from "./zod-schema-C3jh3SvI.js";
import { n as comparePrereleaseIdentifiers, r as normalizeLegacyDotBetaVersion } from "./semver-compare-B2R7wU49.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSON5 from "json5";
import { isDeepStrictEqual } from "node:util";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createJiti } from "jiti";
//#region src/agents/owner-display.ts
function trimToUndefined(value) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : void 0;
}
/**
* Resolve owner display settings for prompt rendering.
* Keep auth secrets decoupled from owner hash secrets.
*/
function resolveOwnerDisplaySetting(config) {
	const ownerDisplay = config?.commands?.ownerDisplay;
	if (ownerDisplay !== "hash") return {
		ownerDisplay,
		ownerDisplaySecret: void 0
	};
	return {
		ownerDisplay: "hash",
		ownerDisplaySecret: trimToUndefined(config?.commands?.ownerDisplaySecret)
	};
}
/**
* Ensure hash mode has a dedicated secret.
* Returns updated config and generated secret when autofill was needed.
*/
function ensureOwnerDisplaySecret(config, generateSecret = () => crypto.randomBytes(32).toString("hex")) {
	const settings = resolveOwnerDisplaySetting(config);
	if (settings.ownerDisplay !== "hash" || settings.ownerDisplaySecret) return { config };
	const generatedSecret = generateSecret();
	return {
		config: {
			...config,
			commands: {
				...config.commands,
				ownerDisplay: "hash",
				ownerDisplaySecret: generatedSecret
			}
		},
		generatedSecret
	};
}
//#endregion
//#region src/plugins/doctor-contract-registry.ts
const CONTRACT_API_EXTENSIONS = [
	".js",
	".mjs",
	".cjs",
	".ts",
	".mts",
	".cts"
];
const CURRENT_MODULE_PATH = fileURLToPath(import.meta.url);
const RUNNING_FROM_BUILT_ARTIFACT = CURRENT_MODULE_PATH.includes(`${path.sep}dist${path.sep}`) || CURRENT_MODULE_PATH.includes(`${path.sep}dist-runtime${path.sep}`);
const jitiLoaders = /* @__PURE__ */ new Map();
const doctorContractCache = /* @__PURE__ */ new Map();
function getJiti(modulePath) {
	const aliasMap = buildPluginLoaderAliasMap(modulePath, process.argv[1], import.meta.url);
	const cacheKey = JSON.stringify({
		tryNative: shouldPreferNativeJiti(modulePath),
		aliasMap: Object.entries(aliasMap).toSorted(([left], [right]) => left.localeCompare(right))
	});
	const cached = jitiLoaders.get(cacheKey);
	if (cached) return cached;
	const loader = createJiti(modulePath, buildPluginLoaderJitiOptions(aliasMap));
	jitiLoaders.set(cacheKey, loader);
	return loader;
}
function buildDoctorContractCacheKey(params) {
	const { roots, loadPaths } = resolvePluginCacheInputs({
		workspaceDir: params.workspaceDir,
		env: params.env
	});
	return JSON.stringify({
		roots,
		loadPaths
	});
}
function resolveContractApiPath(rootDir) {
	const orderedExtensions = RUNNING_FROM_BUILT_ARTIFACT ? CONTRACT_API_EXTENSIONS : [...CONTRACT_API_EXTENSIONS.slice(3), ...CONTRACT_API_EXTENSIONS.slice(0, 3)];
	for (const extension of orderedExtensions) {
		const candidate = path.join(rootDir, `contract-api${extension}`);
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}
function coerceLegacyConfigRules(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((entry) => {
		if (!entry || typeof entry !== "object") return false;
		const candidate = entry;
		return Array.isArray(candidate.path) && typeof candidate.message === "string";
	});
}
function resolvePluginDoctorContracts(params) {
	const env = params?.env ?? process.env;
	const cacheKey = buildDoctorContractCacheKey({
		workspaceDir: params?.workspaceDir,
		env
	});
	const cached = doctorContractCache.get(cacheKey);
	if (cached) return cached;
	const discovery = discoverOpenClawPlugins({
		workspaceDir: params?.workspaceDir,
		env,
		cache: true
	});
	const manifestRegistry = loadPluginManifestRegistry({
		workspaceDir: params?.workspaceDir,
		env,
		cache: true,
		candidates: discovery.candidates,
		diagnostics: discovery.diagnostics
	});
	const entries = [];
	for (const record of manifestRegistry.plugins) {
		const contractSource = resolveContractApiPath(record.rootDir);
		if (!contractSource) continue;
		let mod;
		try {
			mod = getJiti(contractSource)(contractSource);
		} catch {
			continue;
		}
		const rules = coerceLegacyConfigRules(mod.default?.legacyConfigRules ?? mod.legacyConfigRules);
		if (rules.length === 0) continue;
		entries.push({
			pluginId: record.id,
			rules
		});
	}
	doctorContractCache.set(cacheKey, entries);
	return entries;
}
function listPluginDoctorLegacyConfigRules(params) {
	return resolvePluginDoctorContracts(params).flatMap((entry) => entry.rules);
}
//#endregion
//#region src/config/agent-dirs.ts
var DuplicateAgentDirError = class extends Error {
	constructor(duplicates) {
		super(formatDuplicateAgentDirError(duplicates));
		this.name = "DuplicateAgentDirError";
		this.duplicates = duplicates;
	}
};
function canonicalizeAgentDir(agentDir) {
	const resolved = path.resolve(agentDir);
	if (process.platform === "darwin" || process.platform === "win32") return resolved.toLowerCase();
	return resolved;
}
function collectReferencedAgentIds(cfg) {
	const ids = /* @__PURE__ */ new Set();
	const agents = Array.isArray(cfg.agents?.list) ? cfg.agents?.list : [];
	const defaultAgentId = agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? "main";
	ids.add(normalizeAgentId(defaultAgentId));
	for (const entry of agents) if (entry?.id) ids.add(normalizeAgentId(entry.id));
	const bindings = cfg.bindings;
	if (Array.isArray(bindings)) for (const binding of bindings) {
		const id = binding?.agentId;
		if (typeof id === "string" && id.trim()) ids.add(normalizeAgentId(id));
	}
	return [...ids];
}
function resolveEffectiveAgentDir(cfg, agentId, deps) {
	const id = normalizeAgentId(agentId);
	const trimmed = (Array.isArray(cfg.agents?.list) ? cfg.agents?.list.find((agent) => normalizeAgentId(agent.id) === id)?.agentDir : void 0)?.trim();
	if (trimmed) return resolveUserPath(trimmed);
	const env = deps?.env ?? process.env;
	const root = resolveStateDir(env, deps?.homedir ?? (() => resolveRequiredHomeDir(env, os.homedir)));
	return path.join(root, "agents", id, "agent");
}
function findDuplicateAgentDirs(cfg, deps) {
	const byDir = /* @__PURE__ */ new Map();
	for (const agentId of collectReferencedAgentIds(cfg)) {
		const agentDir = resolveEffectiveAgentDir(cfg, agentId, deps);
		const key = canonicalizeAgentDir(agentDir);
		const entry = byDir.get(key);
		if (entry) entry.agentIds.push(agentId);
		else byDir.set(key, {
			agentDir,
			agentIds: [agentId]
		});
	}
	return [...byDir.values()].filter((v) => v.agentIds.length > 1);
}
function formatDuplicateAgentDirError(dups) {
	return [
		"Duplicate agentDir detected (multi-agent config).",
		"Each agent must have a unique agentDir; sharing it causes auth/session state collisions and token invalidation.",
		"",
		"Conflicts:",
		...dups.map((d) => `- ${d.agentDir}: ${d.agentIds.map((id) => `"${id}"`).join(", ")}`),
		"",
		"Fix: remove the shared agents.list[].agentDir override (or give each agent its own directory).",
		"If you want to share credentials, copy auth-profiles.json instead of sharing the entire agentDir."
	].join("\n");
}
async function rotateConfigBackups(configPath, ioFs) {
	const backupBase = `${configPath}.bak`;
	const maxIndex = 4;
	await ioFs.unlink(`${backupBase}.${maxIndex}`).catch(() => {});
	for (let index = maxIndex - 1; index >= 1; index -= 1) await ioFs.rename(`${backupBase}.${index}`, `${backupBase}.${index + 1}`).catch(() => {});
	await ioFs.rename(backupBase, `${backupBase}.1`).catch(() => {});
}
/**
* Harden file permissions on all .bak files in the rotation ring.
* copyFile does not guarantee permission preservation on all platforms
* (e.g. Windows, some NFS mounts), so we explicitly chmod each backup
* to owner-only (0o600) to match the main config file.
*/
async function hardenBackupPermissions(configPath, ioFs) {
	if (!ioFs.chmod) return;
	const backupBase = `${configPath}.bak`;
	await ioFs.chmod(backupBase, 384).catch(() => {});
	for (let i = 1; i < 5; i++) await ioFs.chmod(`${backupBase}.${i}`, 384).catch(() => {});
}
/**
* Remove orphan .bak files that fall outside the managed rotation ring.
* These can accumulate from interrupted writes, manual copies, or PID-stamped
* backups (e.g. openclaw.json.bak.1772352289, openclaw.json.bak.before-marketing).
*
* Only files matching `<configBasename>.bak.*` are considered; the primary
* `.bak` and numbered `.bak.1` through `.bak.{N-1}` are preserved.
*/
async function cleanOrphanBackups(configPath, ioFs) {
	if (!ioFs.readdir) return;
	const dir = path.dirname(configPath);
	const bakPrefix = `${path.basename(configPath)}.bak.`;
	const validSuffixes = /* @__PURE__ */ new Set();
	for (let i = 1; i < 5; i++) validSuffixes.add(String(i));
	let entries;
	try {
		entries = await ioFs.readdir(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		if (!entry.startsWith(bakPrefix)) continue;
		const suffix = entry.slice(bakPrefix.length);
		if (validSuffixes.has(suffix)) continue;
		await ioFs.unlink(path.join(dir, entry)).catch(() => {});
	}
}
/**
* Run the full backup maintenance cycle around config writes.
* Order matters: rotate ring -> create new .bak -> harden modes -> prune orphan .bak.* files.
*/
async function maintainConfigBackups(configPath, ioFs) {
	await rotateConfigBackups(configPath, ioFs);
	await ioFs.copyFile(configPath, `${configPath}.bak`).catch(() => {});
	await hardenBackupPermissions(configPath, ioFs);
	await cleanOrphanBackups(configPath, ioFs);
}
//#endregion
//#region src/config/env-preserve.ts
/**
* Preserves `${VAR}` environment variable references during config write-back.
*
* When config is read, `${VAR}` references are resolved to their values.
* When writing back, callers pass the resolved config. This module detects
* values that match what a `${VAR}` reference would resolve to and restores
* the original reference, so env var references survive config round-trips.
*
* A value is restored only if:
* 1. The pre-substitution value contained a `${VAR}` pattern
* 2. Resolving that pattern with current env vars produces the incoming value
*
* If a caller intentionally set a new value (different from what the env var
* resolves to), the new value is kept as-is.
*/
const ENV_VAR_PATTERN = /\$\{[A-Z_][A-Z0-9_]*\}/;
/**
* Check if a string contains any `${VAR}` env var references.
*/
function hasEnvVarRef(value) {
	return ENV_VAR_PATTERN.test(value);
}
/**
* Resolve `${VAR}` references in a single string using the given env.
* Returns null if any referenced var is missing (instead of throwing).
*
* Mirrors the substitution semantics of `substituteString` in env-substitution.ts:
* - `${VAR}` → env value (returns null if missing)
* - `$${VAR}` → literal `${VAR}` (escape sequence)
*/
function tryResolveString(template, env) {
	const ENV_VAR_NAME = /^[A-Z_][A-Z0-9_]*$/;
	const chunks = [];
	for (let i = 0; i < template.length; i++) {
		if (template[i] === "$") {
			if (template[i + 1] === "$" && template[i + 2] === "{") {
				const start = i + 3;
				const end = template.indexOf("}", start);
				if (end !== -1) {
					const name = template.slice(start, end);
					if (ENV_VAR_NAME.test(name)) {
						chunks.push(`\${${name}}`);
						i = end;
						continue;
					}
				}
			}
			if (template[i + 1] === "{") {
				const start = i + 2;
				const end = template.indexOf("}", start);
				if (end !== -1) {
					const name = template.slice(start, end);
					if (ENV_VAR_NAME.test(name)) {
						const val = env[name];
						if (val === void 0 || val === "") return null;
						chunks.push(val);
						i = end;
						continue;
					}
				}
			}
		}
		chunks.push(template[i]);
	}
	return chunks.join("");
}
/**
* Deep-walk the incoming config and restore `${VAR}` references from the
* pre-substitution parsed config wherever the resolved value matches.
*
* @param incoming - The resolved config about to be written
* @param parsed - The pre-substitution parsed config (from the current file on disk)
* @param env - Environment variables for verification
* @returns A new config object with env var references restored where appropriate
*/
function restoreEnvVarRefs(incoming, parsed, env = process.env) {
	if (parsed === null || parsed === void 0) return incoming;
	if (typeof incoming === "string" && typeof parsed === "string") {
		if (hasEnvVarRef(parsed)) {
			if (tryResolveString(parsed, env) === incoming) return parsed;
		}
		return incoming;
	}
	if (Array.isArray(incoming) && Array.isArray(parsed)) return incoming.map((item, i) => i < parsed.length ? restoreEnvVarRefs(item, parsed[i], env) : item);
	if (isPlainObject$2(incoming) && isPlainObject$2(parsed)) {
		const result = {};
		for (const [key, value] of Object.entries(incoming)) if (key in parsed) result[key] = restoreEnvVarRefs(value, parsed[key], env);
		else result[key] = value;
		return result;
	}
	return incoming;
}
//#endregion
//#region src/config/config-env-vars.ts
function isBlockedConfigEnvVar(key) {
	return isDangerousHostEnvVarName(key) || isDangerousHostEnvOverrideVarName(key);
}
function collectConfigEnvVarsByTarget(cfg) {
	const envConfig = cfg?.env;
	if (!envConfig) return {};
	const entries = {};
	if (envConfig.vars) for (const [rawKey, value] of Object.entries(envConfig.vars)) {
		if (!value) continue;
		const key = normalizeEnvVarKey(rawKey, { portable: true });
		if (!key) continue;
		if (isBlockedConfigEnvVar(key)) continue;
		entries[key] = value;
	}
	for (const [rawKey, value] of Object.entries(envConfig)) {
		if (rawKey === "shellEnv" || rawKey === "vars") continue;
		if (typeof value !== "string" || !value.trim()) continue;
		const key = normalizeEnvVarKey(rawKey, { portable: true });
		if (!key) continue;
		if (isBlockedConfigEnvVar(key)) continue;
		entries[key] = value;
	}
	return entries;
}
function collectConfigRuntimeEnvVars(cfg) {
	return collectConfigEnvVarsByTarget(cfg);
}
function collectConfigServiceEnvVars(cfg) {
	return collectConfigEnvVarsByTarget(cfg);
}
function createConfigRuntimeEnv(cfg, baseEnv = process.env) {
	const env = { ...baseEnv };
	applyConfigEnvVars(cfg, env);
	return env;
}
function applyConfigEnvVars(cfg, env = process.env) {
	const entries = collectConfigRuntimeEnvVars(cfg);
	for (const [key, value] of Object.entries(entries)) {
		if (env[key]?.trim()) continue;
		if (containsEnvVarReference(value)) continue;
		env[key] = value;
	}
}
//#endregion
//#region src/config/state-dir-dotenv.ts
function isBlockedServiceEnvVar(key) {
	return isDangerousHostEnvVarName(key) || isDangerousHostEnvOverrideVarName(key);
}
/**
* Read and parse `~/.openclaw/.env` (or `$OPENCLAW_STATE_DIR/.env`), returning
* a filtered record of key-value pairs suitable for embedding in a service
* environment (LaunchAgent plist, systemd unit, Scheduled Task).
*/
function readStateDirDotEnvVars(env) {
	const stateDir = resolveStateDir(env);
	const dotEnvPath = path.join(stateDir, ".env");
	let content;
	try {
		content = fs.readFileSync(dotEnvPath, "utf8");
	} catch {
		return {};
	}
	const parsed = dotenv.parse(content);
	const entries = {};
	for (const [rawKey, value] of Object.entries(parsed)) {
		if (!value?.trim()) continue;
		const key = normalizeEnvVarKey(rawKey, { portable: true });
		if (!key) continue;
		if (isBlockedServiceEnvVar(key)) continue;
		entries[key] = value;
	}
	return entries;
}
/**
* Durable service env sources survive beyond the invoking shell and are safe to
* persist into gateway install metadata.
*
* Precedence:
* 1. state-dir `.env` file vars
* 2. config service env vars
*/
function collectDurableServiceEnvVars(params) {
	return {
		...readStateDirDotEnvVars(params.env),
		...collectConfigServiceEnvVars(params.config)
	};
}
//#endregion
//#region src/channels/plugins/legacy-config.ts
function collectChannelLegacyConfigRules() {
	const rules = [];
	for (const plugin of iterateBootstrapChannelPlugins()) rules.push(...plugin.doctor?.legacyConfigRules ?? []);
	return rules;
}
//#endregion
//#region src/config/legacy.shared.ts
const getRecord = (value) => isRecord$2(value) ? value : null;
const ensureRecord$2 = (root, key) => {
	const existing = root[key];
	if (isRecord$2(existing)) return existing;
	const next = {};
	root[key] = next;
	return next;
};
const mergeMissing = (target, source) => {
	for (const [key, value] of Object.entries(source)) {
		if (value === void 0 || isBlockedObjectKey(key)) continue;
		const existing = target[key];
		if (existing === void 0) {
			target[key] = value;
			continue;
		}
		if (isRecord$2(existing) && isRecord$2(value)) mergeMissing(existing, value);
	}
};
const mapLegacyAudioTranscription = (value) => {
	const transcriber = getRecord(value);
	const command = Array.isArray(transcriber?.command) ? transcriber?.command : null;
	if (!command || command.length === 0) return null;
	if (typeof command[0] !== "string") return null;
	if (!command.every((part) => typeof part === "string")) return null;
	const rawExecutable = command[0].trim();
	if (!rawExecutable) return null;
	if (!isSafeExecutableValue(rawExecutable)) return null;
	const args = command.slice(1);
	const timeoutSeconds = typeof transcriber?.timeoutSeconds === "number" ? transcriber?.timeoutSeconds : void 0;
	const result = {
		command: rawExecutable,
		type: "cli"
	};
	if (args.length > 0) result.args = args;
	if (timeoutSeconds !== void 0) result.timeoutSeconds = timeoutSeconds;
	return result;
};
const defineLegacyConfigMigration = (migration) => migration;
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.audio.ts
function applyLegacyAudioTranscriptionModel(params) {
	const mapped = mapLegacyAudioTranscription(params.source);
	if (!mapped) {
		params.changes.push(params.invalidMessage);
		return;
	}
	const mediaAudio = ensureRecord$2(ensureRecord$2(ensureRecord$2(params.raw, "tools"), "media"), "audio");
	if ((Array.isArray(mediaAudio.models) ? mediaAudio.models : []).length === 0) {
		mediaAudio.enabled = true;
		mediaAudio.models = [mapped];
		params.changes.push(params.movedMessage);
		return;
	}
	params.changes.push(params.alreadySetMessage);
}
const LEGACY_CONFIG_MIGRATIONS_AUDIO = [defineLegacyConfigMigration({
	id: "audio.transcription-v2",
	describe: "Move audio.transcription to tools.media.audio.models",
	apply: (raw, changes) => {
		const audio = getRecord(raw.audio);
		if (audio?.transcription === void 0) return;
		applyLegacyAudioTranscriptionModel({
			raw,
			source: audio.transcription,
			changes,
			movedMessage: "Moved audio.transcription → tools.media.audio.models.",
			alreadySetMessage: "Removed audio.transcription (tools.media.audio.models already set).",
			invalidMessage: "Removed audio.transcription (invalid or empty command)."
		});
		delete audio.transcription;
		if (Object.keys(audio).length === 0) delete raw.audio;
		else raw.audio = audio;
	}
})];
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.channels.ts
function hasOwnKey$1(target, key) {
	return Object.prototype.hasOwnProperty.call(target, key);
}
function normalizeStreamingMode(value) {
	if (typeof value !== "string") return null;
	return value.trim().toLowerCase() || null;
}
function parseStreamingMode(value) {
	const normalized = normalizeStreamingMode(value);
	if (normalized === "off" || normalized === "partial" || normalized === "block" || normalized === "progress") return normalized;
	return null;
}
function parseDiscordPreviewStreamMode(value) {
	const parsed = parseStreamingMode(value);
	if (!parsed) return null;
	return parsed === "progress" ? "partial" : parsed;
}
function parseTelegramPreviewStreamMode(value) {
	const parsed = parseStreamingMode(value);
	if (!parsed) return null;
	return parsed === "progress" ? "partial" : parsed;
}
function parseSlackLegacyDraftStreamMode(value) {
	const normalized = normalizeStreamingMode(value);
	if (normalized === "replace" || normalized === "status_final" || normalized === "append") return normalized;
	return null;
}
function mapSlackLegacyDraftStreamModeToStreaming(mode) {
	if (mode === "append") return "block";
	if (mode === "status_final") return "progress";
	return "partial";
}
function resolveTelegramPreviewStreamMode(params = {}) {
	const parsedStreaming = parseStreamingMode(params.streaming);
	if (parsedStreaming) return parsedStreaming === "progress" ? "partial" : parsedStreaming;
	const legacy = parseTelegramPreviewStreamMode(params.streamMode);
	if (legacy) return legacy;
	if (typeof params.streaming === "boolean") return params.streaming ? "partial" : "off";
	return "partial";
}
function resolveDiscordPreviewStreamMode(params = {}) {
	const parsedStreaming = parseDiscordPreviewStreamMode(params.streaming);
	if (parsedStreaming) return parsedStreaming;
	const legacy = parseDiscordPreviewStreamMode(params.streamMode);
	if (legacy) return legacy;
	if (typeof params.streaming === "boolean") return params.streaming ? "partial" : "off";
	return "off";
}
function resolveSlackStreamingMode(params = {}) {
	const parsedStreaming = parseStreamingMode(params.streaming);
	if (parsedStreaming) return parsedStreaming;
	const legacyStreamMode = parseSlackLegacyDraftStreamMode(params.streamMode);
	if (legacyStreamMode) return mapSlackLegacyDraftStreamModeToStreaming(legacyStreamMode);
	if (typeof params.streaming === "boolean") return params.streaming ? "partial" : "off";
	return "partial";
}
function resolveSlackNativeStreaming(params = {}) {
	if (typeof params.nativeStreaming === "boolean") return params.nativeStreaming;
	if (typeof params.streaming === "boolean") return params.streaming;
	return true;
}
function formatSlackStreamModeMigrationMessage(pathPrefix, resolvedStreaming) {
	return `Moved ${pathPrefix}.streamMode → ${pathPrefix}.streaming (${resolvedStreaming}).`;
}
function formatSlackStreamingBooleanMigrationMessage(pathPrefix, resolvedNativeStreaming) {
	return `Moved ${pathPrefix}.streaming (boolean) → ${pathPrefix}.nativeStreaming (${resolvedNativeStreaming}).`;
}
function hasLegacyThreadBindingTtl(value) {
	const threadBindings = getRecord(value);
	return Boolean(threadBindings && hasOwnKey$1(threadBindings, "ttlHours"));
}
function hasLegacyThreadBindingTtlInAccounts(value) {
	const accounts = getRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((entry) => hasLegacyThreadBindingTtl(getRecord(entry)?.threadBindings));
}
function migrateThreadBindingsTtlHoursForPath(params) {
	const threadBindings = getRecord(params.owner.threadBindings);
	if (!threadBindings || !hasOwnKey$1(threadBindings, "ttlHours")) return false;
	const hadIdleHours = threadBindings.idleHours !== void 0;
	if (!hadIdleHours) threadBindings.idleHours = threadBindings.ttlHours;
	delete threadBindings.ttlHours;
	params.owner.threadBindings = threadBindings;
	if (hadIdleHours) params.changes.push(`Removed ${params.pathPrefix}.threadBindings.ttlHours (${params.pathPrefix}.threadBindings.idleHours already set).`);
	else params.changes.push(`Moved ${params.pathPrefix}.threadBindings.ttlHours → ${params.pathPrefix}.threadBindings.idleHours.`);
	return true;
}
function hasLegacyThreadBindingTtlInAnyChannel(value) {
	const channels = getRecord(value);
	if (!channels) return false;
	return Object.values(channels).some((entry) => {
		const channel = getRecord(entry);
		if (!channel) return false;
		return hasLegacyThreadBindingTtl(channel.threadBindings) || hasLegacyThreadBindingTtlInAccounts(channel.accounts);
	});
}
function hasLegacyTelegramStreamingKeys(value) {
	const entry = getRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0;
}
function hasLegacyDiscordStreamingKeys(value) {
	const entry = getRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean";
}
function hasLegacySlackStreamingKeys(value) {
	const entry = getRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean";
}
function hasLegacyGoogleChatStreamMode(value) {
	const entry = getRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0;
}
function hasLegacyKeysInAccounts(value, matchEntry) {
	const accounts = getRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((entry) => matchEntry(getRecord(entry) ?? {}));
}
function hasLegacyAllowAlias(entry) {
	return hasOwnKey$1(entry, "allow");
}
function migrateAllowAliasForPath(params) {
	if (!hasLegacyAllowAlias(params.entry)) return false;
	const legacyAllow = params.entry.allow;
	const hadEnabled = params.entry.enabled !== void 0;
	if (!hadEnabled) params.entry.enabled = legacyAllow;
	delete params.entry.allow;
	if (hadEnabled) params.changes.push(`Removed ${params.pathPrefix}.allow (${params.pathPrefix}.enabled already set).`);
	else params.changes.push(`Moved ${params.pathPrefix}.allow → ${params.pathPrefix}.enabled.`);
	return true;
}
function hasLegacySlackChannelAllowAlias(value) {
	const channels = getRecord(getRecord(value)?.channels);
	if (!channels) return false;
	return Object.values(channels).some((channel) => hasLegacyAllowAlias(getRecord(channel) ?? {}));
}
function hasLegacyGoogleChatGroupAllowAlias(value) {
	const groups = getRecord(getRecord(value)?.groups);
	if (!groups) return false;
	return Object.values(groups).some((group) => hasLegacyAllowAlias(getRecord(group) ?? {}));
}
function hasLegacyDiscordGuildChannelAllowAlias(value) {
	const guilds = getRecord(getRecord(value)?.guilds);
	if (!guilds) return false;
	return Object.values(guilds).some((guildValue) => {
		const channels = getRecord(getRecord(guildValue)?.channels);
		if (!channels) return false;
		return Object.values(channels).some((channel) => hasLegacyAllowAlias(getRecord(channel) ?? {}));
	});
}
const LEGACY_CONFIG_MIGRATIONS_CHANNELS = [
	defineLegacyConfigMigration({
		id: "thread-bindings.ttlHours->idleHours",
		describe: "Move legacy threadBindings.ttlHours keys to threadBindings.idleHours (session + channel configs)",
		legacyRules: [{
			path: ["session", "threadBindings"],
			message: "session.threadBindings.ttlHours was renamed to session.threadBindings.idleHours. Run \"openclaw doctor --fix\".",
			match: (value) => hasLegacyThreadBindingTtl(value)
		}, {
			path: ["channels"],
			message: "channels.<id>.threadBindings.ttlHours was renamed to channels.<id>.threadBindings.idleHours. Run \"openclaw doctor --fix\".",
			match: (value) => hasLegacyThreadBindingTtlInAnyChannel(value)
		}],
		apply: (raw, changes) => {
			const session = getRecord(raw.session);
			if (session) {
				migrateThreadBindingsTtlHoursForPath({
					owner: session,
					pathPrefix: "session",
					changes
				});
				raw.session = session;
			}
			const channels = getRecord(raw.channels);
			if (!channels) return;
			for (const [channelId, channelRaw] of Object.entries(channels)) {
				const channel = getRecord(channelRaw);
				if (!channel) continue;
				migrateThreadBindingsTtlHoursForPath({
					owner: channel,
					pathPrefix: `channels.${channelId}`,
					changes
				});
				const accounts = getRecord(channel.accounts);
				if (accounts) {
					for (const [accountId, accountRaw] of Object.entries(accounts)) {
						const account = getRecord(accountRaw);
						if (!account) continue;
						migrateThreadBindingsTtlHoursForPath({
							owner: account,
							pathPrefix: `channels.${channelId}.accounts.${accountId}`,
							changes
						});
						accounts[accountId] = account;
					}
					channel.accounts = accounts;
				}
				channels[channelId] = channel;
			}
			raw.channels = channels;
		}
	}),
	defineLegacyConfigMigration({
		id: "channels.streaming-keys->channels.streaming",
		describe: "Normalize legacy streaming keys to channels.<provider>.streaming (Telegram/Discord/Slack)",
		legacyRules: [
			{
				path: ["channels", "telegram"],
				message: "channels.telegram.streamMode is legacy; use channels.telegram.streaming instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyTelegramStreamingKeys(value)
			},
			{
				path: [
					"channels",
					"telegram",
					"accounts"
				],
				message: "channels.telegram.accounts.<id>.streamMode is legacy; use channels.telegram.accounts.<id>.streaming instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacyTelegramStreamingKeys)
			},
			{
				path: ["channels", "discord"],
				message: "channels.discord.streamMode and boolean channels.discord.streaming are legacy; use channels.discord.streaming with enum values instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyDiscordStreamingKeys(value)
			},
			{
				path: [
					"channels",
					"discord",
					"accounts"
				],
				message: "channels.discord.accounts.<id>.streamMode and boolean channels.discord.accounts.<id>.streaming are legacy; use channels.discord.accounts.<id>.streaming with enum values instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacyDiscordStreamingKeys)
			},
			{
				path: ["channels", "slack"],
				message: "channels.slack.streamMode and boolean channels.slack.streaming are legacy; use channels.slack.streaming with enum values instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacySlackStreamingKeys(value)
			},
			{
				path: [
					"channels",
					"slack",
					"accounts"
				],
				message: "channels.slack.accounts.<id>.streamMode and boolean channels.slack.accounts.<id>.streaming are legacy; use channels.slack.accounts.<id>.streaming with enum values instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacySlackStreamingKeys)
			}
		],
		apply: (raw, changes) => {
			const channels = getRecord(raw.channels);
			if (!channels) return;
			const migrateProviderEntry = (params) => {
				const migrateCommonStreamingMode = (resolveMode) => {
					const hasLegacyStreamMode = params.entry.streamMode !== void 0;
					const legacyStreaming = params.entry.streaming;
					if (!hasLegacyStreamMode && typeof legacyStreaming !== "boolean") return false;
					const resolved = resolveMode(params.entry);
					params.entry.streaming = resolved;
					if (hasLegacyStreamMode) {
						delete params.entry.streamMode;
						changes.push(`Moved ${params.pathPrefix}.streamMode → ${params.pathPrefix}.streaming (${resolved}).`);
					}
					if (typeof legacyStreaming === "boolean") changes.push(`Normalized ${params.pathPrefix}.streaming boolean → enum (${resolved}).`);
					return true;
				};
				const hasLegacyStreamMode = params.entry.streamMode !== void 0;
				const legacyStreaming = params.entry.streaming;
				const legacyNativeStreaming = params.entry.nativeStreaming;
				if (params.provider === "telegram") {
					migrateCommonStreamingMode(resolveTelegramPreviewStreamMode);
					return;
				}
				if (params.provider === "discord") {
					migrateCommonStreamingMode(resolveDiscordPreviewStreamMode);
					return;
				}
				if (!hasLegacyStreamMode && typeof legacyStreaming !== "boolean") return;
				const resolvedStreaming = resolveSlackStreamingMode(params.entry);
				const resolvedNativeStreaming = resolveSlackNativeStreaming(params.entry);
				params.entry.streaming = resolvedStreaming;
				params.entry.nativeStreaming = resolvedNativeStreaming;
				if (hasLegacyStreamMode) {
					delete params.entry.streamMode;
					changes.push(formatSlackStreamModeMigrationMessage(params.pathPrefix, resolvedStreaming));
				}
				if (typeof legacyStreaming === "boolean") changes.push(formatSlackStreamingBooleanMigrationMessage(params.pathPrefix, resolvedNativeStreaming));
				else if (typeof legacyNativeStreaming !== "boolean" && hasLegacyStreamMode) changes.push(`Set ${params.pathPrefix}.nativeStreaming → ${resolvedNativeStreaming}.`);
			};
			const migrateProvider = (provider) => {
				const providerEntry = getRecord(channels[provider]);
				if (!providerEntry) return;
				migrateProviderEntry({
					provider,
					entry: providerEntry,
					pathPrefix: `channels.${provider}`
				});
				const accounts = getRecord(providerEntry.accounts);
				if (!accounts) return;
				for (const [accountId, accountValue] of Object.entries(accounts)) {
					const account = getRecord(accountValue);
					if (!account) continue;
					migrateProviderEntry({
						provider,
						entry: account,
						pathPrefix: `channels.${provider}.accounts.${accountId}`
					});
				}
			};
			migrateProvider("telegram");
			migrateProvider("discord");
			migrateProvider("slack");
		}
	}),
	defineLegacyConfigMigration({
		id: "channels.allow->channels.enabled",
		describe: "Normalize legacy nested channel allow toggles to enabled (Slack/Google Chat/Discord)",
		legacyRules: [
			{
				path: ["channels", "slack"],
				message: "channels.slack.channels.<id>.allow is legacy; use channels.slack.channels.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacySlackChannelAllowAlias(value)
			},
			{
				path: [
					"channels",
					"slack",
					"accounts"
				],
				message: "channels.slack.accounts.<id>.channels.<id>.allow is legacy; use channels.slack.accounts.<id>.channels.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacySlackChannelAllowAlias)
			},
			{
				path: ["channels", "googlechat"],
				message: "channels.googlechat.groups.<id>.allow is legacy; use channels.googlechat.groups.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyGoogleChatGroupAllowAlias(value)
			},
			{
				path: [
					"channels",
					"googlechat",
					"accounts"
				],
				message: "channels.googlechat.accounts.<id>.groups.<id>.allow is legacy; use channels.googlechat.accounts.<id>.groups.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacyGoogleChatGroupAllowAlias)
			},
			{
				path: ["channels", "discord"],
				message: "channels.discord.guilds.<id>.channels.<id>.allow is legacy; use channels.discord.guilds.<id>.channels.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyDiscordGuildChannelAllowAlias(value)
			},
			{
				path: [
					"channels",
					"discord",
					"accounts"
				],
				message: "channels.discord.accounts.<id>.guilds.<id>.channels.<id>.allow is legacy; use channels.discord.accounts.<id>.guilds.<id>.channels.<id>.enabled instead. Run \"openclaw doctor --fix\".",
				match: (value) => hasLegacyKeysInAccounts(value, hasLegacyDiscordGuildChannelAllowAlias)
			}
		],
		apply: (raw, changes) => {
			const channels = getRecord(raw.channels);
			if (!channels) return;
			const migrateSlackEntry = (entry, pathPrefix) => {
				const channelEntries = getRecord(entry.channels);
				if (!channelEntries) return;
				for (const [channelId, channelRaw] of Object.entries(channelEntries)) {
					const channel = getRecord(channelRaw);
					if (!channel) continue;
					migrateAllowAliasForPath({
						entry: channel,
						pathPrefix: `${pathPrefix}.channels.${channelId}`,
						changes
					});
					channelEntries[channelId] = channel;
				}
				entry.channels = channelEntries;
			};
			const migrateGoogleChatEntry = (entry, pathPrefix) => {
				const groups = getRecord(entry.groups);
				if (!groups) return;
				for (const [groupId, groupRaw] of Object.entries(groups)) {
					const group = getRecord(groupRaw);
					if (!group) continue;
					migrateAllowAliasForPath({
						entry: group,
						pathPrefix: `${pathPrefix}.groups.${groupId}`,
						changes
					});
					groups[groupId] = group;
				}
				entry.groups = groups;
			};
			const migrateDiscordEntry = (entry, pathPrefix) => {
				const guilds = getRecord(entry.guilds);
				if (!guilds) return;
				for (const [guildId, guildRaw] of Object.entries(guilds)) {
					const guild = getRecord(guildRaw);
					if (!guild) continue;
					const channelEntries = getRecord(guild.channels);
					if (!channelEntries) {
						guilds[guildId] = guild;
						continue;
					}
					for (const [channelId, channelRaw] of Object.entries(channelEntries)) {
						const channel = getRecord(channelRaw);
						if (!channel) continue;
						migrateAllowAliasForPath({
							entry: channel,
							pathPrefix: `${pathPrefix}.guilds.${guildId}.channels.${channelId}`,
							changes
						});
						channelEntries[channelId] = channel;
					}
					guild.channels = channelEntries;
					guilds[guildId] = guild;
				}
				entry.guilds = guilds;
			};
			const migrateProviderAccounts = (provider, migrateEntry) => {
				const providerEntry = getRecord(channels[provider]);
				if (!providerEntry) return;
				migrateEntry(providerEntry, `channels.${provider}`);
				const accounts = getRecord(providerEntry.accounts);
				if (!accounts) {
					channels[provider] = providerEntry;
					return;
				}
				for (const [accountId, accountRaw] of Object.entries(accounts)) {
					const account = getRecord(accountRaw);
					if (!account) continue;
					migrateEntry(account, `channels.${provider}.accounts.${accountId}`);
					accounts[accountId] = account;
				}
				providerEntry.accounts = accounts;
				channels[provider] = providerEntry;
			};
			migrateProviderAccounts("slack", migrateSlackEntry);
			migrateProviderAccounts("googlechat", migrateGoogleChatEntry);
			migrateProviderAccounts("discord", migrateDiscordEntry);
			raw.channels = channels;
		}
	}),
	defineLegacyConfigMigration({
		id: "channels.googlechat.streamMode->remove",
		describe: "Remove legacy Google Chat streamMode keys that are no longer used",
		legacyRules: [{
			path: ["channels", "googlechat"],
			message: "channels.googlechat.streamMode is legacy and no longer used; it is removed on load.",
			match: (value) => hasLegacyGoogleChatStreamMode(value)
		}, {
			path: [
				"channels",
				"googlechat",
				"accounts"
			],
			message: "channels.googlechat.accounts.<id>.streamMode is legacy and no longer used; it is removed on load.",
			match: (value) => hasLegacyKeysInAccounts(value, hasLegacyGoogleChatStreamMode)
		}],
		apply: (raw, changes) => {
			const channels = getRecord(raw.channels);
			if (!channels) return;
			const migrateEntry = (entry, pathPrefix) => {
				if (entry.streamMode === void 0) return;
				delete entry.streamMode;
				changes.push(`Removed ${pathPrefix}.streamMode (legacy key no longer used).`);
			};
			const googlechat = getRecord(channels.googlechat);
			if (!googlechat) return;
			migrateEntry(googlechat, "channels.googlechat");
			const accounts = getRecord(googlechat.accounts);
			if (accounts) {
				for (const [accountId, accountValue] of Object.entries(accounts)) {
					const account = getRecord(accountValue);
					if (!account) continue;
					migrateEntry(account, `channels.googlechat.accounts.${accountId}`);
					accounts[accountId] = account;
				}
				googlechat.accounts = accounts;
			}
			channels.googlechat = googlechat;
			raw.channels = channels;
		}
	})
];
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.runtime.agents.ts
const AGENT_HEARTBEAT_KEYS = new Set([
	"every",
	"activeHours",
	"model",
	"session",
	"includeReasoning",
	"target",
	"directPolicy",
	"to",
	"accountId",
	"prompt",
	"ackMaxChars",
	"suppressToolErrorWarnings",
	"lightContext",
	"isolatedSession"
]);
const CHANNEL_HEARTBEAT_KEYS = new Set([
	"showOk",
	"showAlerts",
	"useIndicator"
]);
const MEMORY_SEARCH_RULE = {
	path: ["memorySearch"],
	message: "top-level memorySearch was moved; use agents.defaults.memorySearch instead. Run \"openclaw doctor --fix\"."
};
const HEARTBEAT_RULE = {
	path: ["heartbeat"],
	message: "top-level heartbeat is not a valid config path; use agents.defaults.heartbeat (cadence/target/model settings) or channels.defaults.heartbeat (showOk/showAlerts/useIndicator)."
};
const LEGACY_SANDBOX_SCOPE_RULES = [{
	path: [
		"agents",
		"defaults",
		"sandbox"
	],
	message: "agents.defaults.sandbox.perSession is legacy; use agents.defaults.sandbox.scope instead. Run \"openclaw doctor --fix\".",
	match: (value) => hasLegacySandboxPerSession(value)
}, {
	path: ["agents", "list"],
	message: "agents.list[].sandbox.perSession is legacy; use agents.list[].sandbox.scope instead. Run \"openclaw doctor --fix\".",
	match: (value) => hasLegacyAgentListSandboxPerSession(value)
}];
function sandboxScopeFromPerSession(perSession) {
	return perSession ? "session" : "shared";
}
function splitLegacyHeartbeat(legacyHeartbeat) {
	const agentHeartbeat = {};
	const channelHeartbeat = {};
	for (const [key, value] of Object.entries(legacyHeartbeat)) {
		if (isBlockedObjectKey(key)) continue;
		if (CHANNEL_HEARTBEAT_KEYS.has(key)) {
			channelHeartbeat[key] = value;
			continue;
		}
		if (AGENT_HEARTBEAT_KEYS.has(key)) {
			agentHeartbeat[key] = value;
			continue;
		}
		agentHeartbeat[key] = value;
	}
	return {
		agentHeartbeat: Object.keys(agentHeartbeat).length > 0 ? agentHeartbeat : null,
		channelHeartbeat: Object.keys(channelHeartbeat).length > 0 ? channelHeartbeat : null
	};
}
function mergeLegacyIntoDefaults(params) {
	const root = ensureRecord$2(params.raw, params.rootKey);
	const defaults = ensureRecord$2(root, "defaults");
	const existing = getRecord(defaults[params.fieldKey]);
	if (!existing) {
		defaults[params.fieldKey] = params.legacyValue;
		params.changes.push(params.movedMessage);
	} else {
		const merged = structuredClone(existing);
		mergeMissing(merged, params.legacyValue);
		defaults[params.fieldKey] = merged;
		params.changes.push(params.mergedMessage);
	}
	root.defaults = defaults;
	params.raw[params.rootKey] = root;
}
function hasLegacySandboxPerSession(value) {
	const sandbox = getRecord(value);
	return Boolean(sandbox && Object.prototype.hasOwnProperty.call(sandbox, "perSession"));
}
function hasLegacyAgentListSandboxPerSession(value) {
	if (!Array.isArray(value)) return false;
	return value.some((agent) => hasLegacySandboxPerSession(getRecord(agent)?.sandbox));
}
function migrateLegacySandboxPerSession(sandbox, pathLabel, changes) {
	if (!Object.prototype.hasOwnProperty.call(sandbox, "perSession")) return;
	const rawPerSession = sandbox.perSession;
	if (typeof rawPerSession !== "boolean") return;
	if (sandbox.scope === void 0) {
		sandbox.scope = sandboxScopeFromPerSession(rawPerSession);
		changes.push(`Moved ${pathLabel}.perSession → ${pathLabel}.scope (${String(sandbox.scope)}).`);
	} else changes.push(`Removed ${pathLabel}.perSession (${pathLabel}.scope already set).`);
	delete sandbox.perSession;
}
const LEGACY_CONFIG_MIGRATIONS_RUNTIME_AGENTS = [
	defineLegacyConfigMigration({
		id: "agents.sandbox.perSession->scope",
		describe: "Move legacy agent sandbox perSession aliases to sandbox.scope",
		legacyRules: LEGACY_SANDBOX_SCOPE_RULES,
		apply: (raw, changes) => {
			const agents = getRecord(raw.agents);
			const defaultSandbox = getRecord(getRecord(agents?.defaults)?.sandbox);
			if (defaultSandbox) migrateLegacySandboxPerSession(defaultSandbox, "agents.defaults.sandbox", changes);
			if (!Array.isArray(agents?.list)) return;
			for (const [index, agent] of agents.list.entries()) {
				const sandbox = getRecord(getRecord(agent)?.sandbox);
				if (!sandbox) continue;
				migrateLegacySandboxPerSession(sandbox, `agents.list.${index}.sandbox`, changes);
			}
		}
	}),
	defineLegacyConfigMigration({
		id: "memorySearch->agents.defaults.memorySearch",
		describe: "Move top-level memorySearch to agents.defaults.memorySearch",
		legacyRules: [MEMORY_SEARCH_RULE],
		apply: (raw, changes) => {
			const legacyMemorySearch = getRecord(raw.memorySearch);
			if (!legacyMemorySearch) return;
			mergeLegacyIntoDefaults({
				raw,
				rootKey: "agents",
				fieldKey: "memorySearch",
				legacyValue: legacyMemorySearch,
				changes,
				movedMessage: "Moved memorySearch → agents.defaults.memorySearch.",
				mergedMessage: "Merged memorySearch → agents.defaults.memorySearch (filled missing fields from legacy; kept explicit agents.defaults values)."
			});
			delete raw.memorySearch;
		}
	}),
	defineLegacyConfigMigration({
		id: "heartbeat->agents.defaults.heartbeat",
		describe: "Move top-level heartbeat to agents.defaults.heartbeat/channels.defaults.heartbeat",
		legacyRules: [HEARTBEAT_RULE],
		apply: (raw, changes) => {
			const legacyHeartbeat = getRecord(raw.heartbeat);
			if (!legacyHeartbeat) return;
			const { agentHeartbeat, channelHeartbeat } = splitLegacyHeartbeat(legacyHeartbeat);
			if (agentHeartbeat) mergeLegacyIntoDefaults({
				raw,
				rootKey: "agents",
				fieldKey: "heartbeat",
				legacyValue: agentHeartbeat,
				changes,
				movedMessage: "Moved heartbeat → agents.defaults.heartbeat.",
				mergedMessage: "Merged heartbeat → agents.defaults.heartbeat (filled missing fields from legacy; kept explicit agents.defaults values)."
			});
			if (channelHeartbeat) mergeLegacyIntoDefaults({
				raw,
				rootKey: "channels",
				fieldKey: "heartbeat",
				legacyValue: channelHeartbeat,
				changes,
				movedMessage: "Moved heartbeat visibility → channels.defaults.heartbeat.",
				mergedMessage: "Merged heartbeat visibility → channels.defaults.heartbeat (filled missing fields from legacy; kept explicit channels.defaults values)."
			});
			if (!agentHeartbeat && !channelHeartbeat) changes.push("Removed empty top-level heartbeat.");
			delete raw.heartbeat;
		}
	})
];
//#endregion
//#region src/config/gateway-control-ui-origins.ts
function isGatewayNonLoopbackBindMode(bind) {
	return bind === "lan" || bind === "tailnet" || bind === "custom";
}
function hasConfiguredControlUiAllowedOrigins(params) {
	if (params.dangerouslyAllowHostHeaderOriginFallback === true) return true;
	return Array.isArray(params.allowedOrigins) && params.allowedOrigins.some((origin) => typeof origin === "string" && origin.trim().length > 0);
}
function resolveGatewayPortWithDefault(port, fallback = DEFAULT_GATEWAY_PORT) {
	return typeof port === "number" && port > 0 ? port : fallback;
}
function buildDefaultControlUiAllowedOrigins(params) {
	const origins = new Set([`http://localhost:${params.port}`, `http://127.0.0.1:${params.port}`]);
	const customBindHost = params.customBindHost?.trim();
	if (params.bind === "custom" && customBindHost) origins.add(`http://${customBindHost}:${params.port}`);
	return [...origins];
}
function ensureControlUiAllowedOriginsForNonLoopbackBind(config, opts) {
	const bind = config.gateway?.bind;
	if (!isGatewayNonLoopbackBindMode(bind)) return {
		config,
		seededOrigins: null,
		bind: null
	};
	if (opts?.requireControlUiEnabled && config.gateway?.controlUi?.enabled === false) return {
		config,
		seededOrigins: null,
		bind
	};
	if (hasConfiguredControlUiAllowedOrigins({
		allowedOrigins: config.gateway?.controlUi?.allowedOrigins,
		dangerouslyAllowHostHeaderOriginFallback: config.gateway?.controlUi?.dangerouslyAllowHostHeaderOriginFallback
	})) return {
		config,
		seededOrigins: null,
		bind
	};
	const seededOrigins = buildDefaultControlUiAllowedOrigins({
		port: resolveGatewayPortWithDefault(config.gateway?.port, opts?.defaultPort),
		bind,
		customBindHost: config.gateway?.customBindHost
	});
	return {
		config: {
			...config,
			gateway: {
				...config.gateway,
				controlUi: {
					...config.gateway?.controlUi,
					allowedOrigins: seededOrigins
				}
			}
		},
		seededOrigins,
		bind
	};
}
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.runtime.gateway.ts
const GATEWAY_BIND_RULE = {
	path: ["gateway", "bind"],
	message: "gateway.bind host aliases (for example 0.0.0.0/localhost) are legacy; use bind modes (lan/loopback/custom/tailnet/auto) instead. Run \"openclaw doctor --fix\".",
	match: (value) => isLegacyGatewayBindHostAlias(value),
	requireSourceLiteral: true
};
function isLegacyGatewayBindHostAlias(value) {
	if (typeof value !== "string") return false;
	const normalized = value.trim().toLowerCase();
	if (!normalized) return false;
	if (normalized === "auto" || normalized === "loopback" || normalized === "lan" || normalized === "tailnet" || normalized === "custom") return false;
	return normalized === "0.0.0.0" || normalized === "::" || normalized === "[::]" || normalized === "*" || normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1" || normalized === "[::1]";
}
function escapeControlForLog(value) {
	return value.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}
const LEGACY_CONFIG_MIGRATIONS_RUNTIME_GATEWAY = [defineLegacyConfigMigration({
	id: "gateway.controlUi.allowedOrigins-seed-for-non-loopback",
	describe: "Seed gateway.controlUi.allowedOrigins for existing non-loopback gateway installs",
	apply: (raw, changes) => {
		const gateway = getRecord(raw.gateway);
		if (!gateway) return;
		const bind = gateway.bind;
		if (!isGatewayNonLoopbackBindMode(bind)) return;
		const controlUi = getRecord(gateway.controlUi) ?? {};
		if (hasConfiguredControlUiAllowedOrigins({
			allowedOrigins: controlUi.allowedOrigins,
			dangerouslyAllowHostHeaderOriginFallback: controlUi.dangerouslyAllowHostHeaderOriginFallback
		})) return;
		const origins = buildDefaultControlUiAllowedOrigins({
			port: resolveGatewayPortWithDefault(gateway.port, DEFAULT_GATEWAY_PORT),
			bind,
			customBindHost: typeof gateway.customBindHost === "string" ? gateway.customBindHost : void 0
		});
		gateway.controlUi = {
			...controlUi,
			allowedOrigins: origins
		};
		raw.gateway = gateway;
		changes.push(`Seeded gateway.controlUi.allowedOrigins ${JSON.stringify(origins)} for bind=${String(bind)}. Required since v2026.2.26. Add other machine origins to gateway.controlUi.allowedOrigins if needed.`);
	}
}), defineLegacyConfigMigration({
	id: "gateway.bind.host-alias->bind-mode",
	describe: "Normalize gateway.bind host aliases to supported bind modes",
	legacyRules: [GATEWAY_BIND_RULE],
	apply: (raw, changes) => {
		const gateway = getRecord(raw.gateway);
		if (!gateway) return;
		const bindRaw = gateway.bind;
		if (typeof bindRaw !== "string") return;
		const normalized = bindRaw.trim().toLowerCase();
		let mapped;
		if (normalized === "0.0.0.0" || normalized === "::" || normalized === "[::]" || normalized === "*") mapped = "lan";
		else if (normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1" || normalized === "[::1]") mapped = "loopback";
		if (!mapped || normalized === mapped) return;
		gateway.bind = mapped;
		raw.gateway = gateway;
		changes.push(`Normalized gateway.bind "${escapeControlForLog(bindRaw)}" → "${mapped}".`);
	}
})];
//#endregion
//#region src/commands/doctor/shared/legacy-x-search-migrate.ts
const XAI_PLUGIN_ID = "xai";
const X_SEARCH_LEGACY_PATH = "tools.web.x_search";
const XAI_WEB_SEARCH_PLUGIN_KEY_PATH = `plugins.entries.${XAI_PLUGIN_ID}.config.webSearch.apiKey`;
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneRecord$1(value) {
	if (!value) return value;
	return { ...value };
}
function ensureRecord$1(target, key) {
	const current = target[key];
	if (isRecord$1(current)) return current;
	const next = {};
	target[key] = next;
	return next;
}
function resolveLegacyXSearchConfig(raw) {
	if (!isRecord$1(raw)) return;
	const tools = isRecord$1(raw.tools) ? raw.tools : void 0;
	const web = isRecord$1(tools?.web) ? tools.web : void 0;
	return isRecord$1(web?.x_search) ? web.x_search : void 0;
}
function resolveLegacyXSearchAuth(legacy) {
	return legacy.apiKey;
}
function migrateLegacyXSearchConfig(raw) {
	if (!isRecord$1(raw)) return {
		config: raw,
		changes: []
	};
	const legacy = resolveLegacyXSearchConfig(raw);
	if (!legacy || !Object.prototype.hasOwnProperty.call(legacy, "apiKey")) return {
		config: raw,
		changes: []
	};
	const nextRoot = structuredClone(raw);
	const web = ensureRecord$1(ensureRecord$1(nextRoot, "tools"), "web");
	const nextLegacy = cloneRecord$1(legacy) ?? {};
	delete nextLegacy.apiKey;
	if (Object.keys(nextLegacy).length === 0) delete web.x_search;
	else web.x_search = nextLegacy;
	const entry = ensureRecord$1(ensureRecord$1(ensureRecord$1(nextRoot, "plugins"), "entries"), XAI_PLUGIN_ID);
	const hadEnabled = entry.enabled !== void 0;
	if (!hadEnabled) entry.enabled = true;
	const config = ensureRecord$1(entry, "config");
	const auth = resolveLegacyXSearchAuth(legacy);
	const changes = [];
	if (auth !== void 0) {
		const existingWebSearch = isRecord$1(config.webSearch) ? cloneRecord$1(config.webSearch) : void 0;
		if (!existingWebSearch) {
			config.webSearch = { apiKey: auth };
			changes.push(`Moved ${X_SEARCH_LEGACY_PATH}.apiKey → ${XAI_WEB_SEARCH_PLUGIN_KEY_PATH}.`);
		} else if (!Object.prototype.hasOwnProperty.call(existingWebSearch, "apiKey")) {
			existingWebSearch.apiKey = auth;
			config.webSearch = existingWebSearch;
			changes.push(`Merged ${X_SEARCH_LEGACY_PATH}.apiKey → ${XAI_WEB_SEARCH_PLUGIN_KEY_PATH} (filled missing plugin auth).`);
		} else changes.push(`Removed ${X_SEARCH_LEGACY_PATH}.apiKey (${XAI_WEB_SEARCH_PLUGIN_KEY_PATH} already set).`);
	}
	if (auth !== void 0 && Object.keys(nextLegacy).length === 0 && !hadEnabled) changes.push(`Removed empty ${X_SEARCH_LEGACY_PATH}.`);
	return {
		config: nextRoot,
		changes
	};
}
const LEGACY_CONFIG_MIGRATIONS_RUNTIME_PROVIDERS = [defineLegacyConfigMigration({
	id: "tools.web.x_search.apiKey->plugins.entries.xai.config.webSearch.apiKey",
	describe: "Move legacy x_search auth into the xAI plugin webSearch config",
	legacyRules: [{
		path: [
			"tools",
			"web",
			"x_search",
			"apiKey"
		],
		message: "tools.web.x_search.apiKey moved to the xAI plugin; use plugins.entries.xai.config.webSearch.apiKey instead. Run \"openclaw doctor --fix\"."
	}],
	apply: (raw, changes) => {
		const migrated = migrateLegacyXSearchConfig(raw);
		if (!migrated.changes.length) return;
		for (const key of Object.keys(raw)) delete raw[key];
		Object.assign(raw, migrated.config);
		changes.push(...migrated.changes);
	}
})];
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.runtime.tts.ts
const LEGACY_TTS_PROVIDER_KEYS = [
	"openai",
	"elevenlabs",
	"microsoft",
	"edge"
];
const LEGACY_TTS_PLUGIN_IDS = new Set(["voice-call"]);
function hasLegacyTtsProviderKeys(value) {
	const tts = getRecord(value);
	if (!tts) return false;
	return LEGACY_TTS_PROVIDER_KEYS.some((key) => Object.prototype.hasOwnProperty.call(tts, key));
}
function hasLegacyPluginEntryTtsProviderKeys(value) {
	const entries = getRecord(value);
	if (!entries) return false;
	return Object.entries(entries).some(([pluginId, entryValue]) => {
		if (isBlockedObjectKey(pluginId) || !LEGACY_TTS_PLUGIN_IDS.has(pluginId)) return false;
		return hasLegacyTtsProviderKeys(getRecord(getRecord(entryValue)?.config)?.tts);
	});
}
function getOrCreateTtsProviders(tts) {
	const providers = getRecord(tts.providers) ?? {};
	tts.providers = providers;
	return providers;
}
function mergeLegacyTtsProviderConfig(tts, legacyKey, providerId) {
	const legacyValue = getRecord(tts[legacyKey]);
	if (!legacyValue) return false;
	const providers = getOrCreateTtsProviders(tts);
	const existing = getRecord(providers[providerId]) ?? {};
	const merged = structuredClone(existing);
	mergeMissing(merged, legacyValue);
	providers[providerId] = merged;
	delete tts[legacyKey];
	return true;
}
function migrateLegacyTtsConfig(tts, pathLabel, changes) {
	if (!tts) return;
	const movedOpenAI = mergeLegacyTtsProviderConfig(tts, "openai", "openai");
	const movedElevenLabs = mergeLegacyTtsProviderConfig(tts, "elevenlabs", "elevenlabs");
	const movedMicrosoft = mergeLegacyTtsProviderConfig(tts, "microsoft", "microsoft");
	const movedEdge = mergeLegacyTtsProviderConfig(tts, "edge", "microsoft");
	if (movedOpenAI) changes.push(`Moved ${pathLabel}.openai → ${pathLabel}.providers.openai.`);
	if (movedElevenLabs) changes.push(`Moved ${pathLabel}.elevenlabs → ${pathLabel}.providers.elevenlabs.`);
	if (movedMicrosoft) changes.push(`Moved ${pathLabel}.microsoft → ${pathLabel}.providers.microsoft.`);
	if (movedEdge) changes.push(`Moved ${pathLabel}.edge → ${pathLabel}.providers.microsoft.`);
}
const LEGACY_CONFIG_MIGRATIONS_RUNTIME_TTS = [defineLegacyConfigMigration({
	id: "tts.providers-generic-shape",
	describe: "Move legacy bundled TTS config keys into messages.tts.providers",
	legacyRules: [{
		path: ["messages", "tts"],
		message: "messages.tts.<provider> keys (openai/elevenlabs/microsoft/edge) are legacy; use messages.tts.providers.<provider>. Run \"openclaw doctor --fix\".",
		match: (value) => hasLegacyTtsProviderKeys(value)
	}, {
		path: ["plugins", "entries"],
		message: "plugins.entries.voice-call.config.tts.<provider> keys (openai/elevenlabs/microsoft/edge) are legacy; use plugins.entries.voice-call.config.tts.providers.<provider>. Run \"openclaw doctor --fix\".",
		match: (value) => hasLegacyPluginEntryTtsProviderKeys(value)
	}],
	apply: (raw, changes) => {
		migrateLegacyTtsConfig(getRecord(getRecord(raw.messages)?.tts), "messages.tts", changes);
		const pluginEntries = getRecord(getRecord(raw.plugins)?.entries);
		if (!pluginEntries) return;
		for (const [pluginId, entryValue] of Object.entries(pluginEntries)) {
			if (isBlockedObjectKey(pluginId) || !LEGACY_TTS_PLUGIN_IDS.has(pluginId)) continue;
			migrateLegacyTtsConfig(getRecord(getRecord(getRecord(entryValue)?.config)?.tts), `plugins.entries.${pluginId}.config.tts`, changes);
		}
	}
})];
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.runtime.ts
const LEGACY_CONFIG_MIGRATIONS_RUNTIME = [
	...LEGACY_CONFIG_MIGRATIONS_RUNTIME_AGENTS,
	...LEGACY_CONFIG_MIGRATIONS_RUNTIME_GATEWAY,
	...LEGACY_CONFIG_MIGRATIONS_RUNTIME_PROVIDERS,
	...LEGACY_CONFIG_MIGRATIONS_RUNTIME_TTS
];
//#endregion
//#region src/commands/doctor/shared/legacy-web-search-migrate.ts
const MODERN_SCOPED_WEB_SEARCH_KEYS = new Set(["openaiCodex"]);
const NON_MIGRATED_LEGACY_WEB_SEARCH_PROVIDER_IDS = new Set(["tavily"]);
const LEGACY_WEB_SEARCH_PROVIDER_IDS = loadPluginManifestRegistry({ cache: true }).plugins.filter((plugin) => plugin.origin === "bundled").flatMap((plugin) => plugin.contracts?.webSearchProviders ?? []).filter((providerId) => !NON_MIGRATED_LEGACY_WEB_SEARCH_PROVIDER_IDS.has(providerId)).toSorted((left, right) => left.localeCompare(right));
const LEGACY_WEB_SEARCH_PROVIDER_ID_SET = new Set(LEGACY_WEB_SEARCH_PROVIDER_IDS);
const LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID = "brave";
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function cloneRecord(value) {
	return { ...value };
}
function ensureRecord(target, key) {
	const current = target[key];
	if (isRecord(current)) return current;
	const next = {};
	target[key] = next;
	return next;
}
function resolveLegacySearchConfig(raw) {
	if (!isRecord(raw)) return;
	const tools = isRecord(raw.tools) ? raw.tools : void 0;
	const web = isRecord(tools?.web) ? tools.web : void 0;
	return isRecord(web?.search) ? web.search : void 0;
}
function copyLegacyProviderConfig(search, providerKey) {
	const current = search[providerKey];
	return isRecord(current) ? cloneRecord(current) : void 0;
}
function hasOwnKey(target, key) {
	return Object.prototype.hasOwnProperty.call(target, key);
}
function hasMappedLegacyWebSearchConfig(raw) {
	const search = resolveLegacySearchConfig(raw);
	if (!search) return false;
	if (hasOwnKey(search, "apiKey")) return true;
	return LEGACY_WEB_SEARCH_PROVIDER_IDS.some((providerId) => isRecord(search[providerId]));
}
function resolveLegacyGlobalWebSearchMigration(search) {
	const legacyProviderConfig = copyLegacyProviderConfig(search, LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID);
	const payload = legacyProviderConfig ?? {};
	const hasLegacyApiKey = hasOwnKey(search, "apiKey");
	if (hasLegacyApiKey) payload.apiKey = search.apiKey;
	if (Object.keys(payload).length === 0) return null;
	const pluginId = resolveManifestContractOwnerPluginId({
		contract: "webSearchProviders",
		value: LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID,
		origin: "bundled"
	}) ?? LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID;
	return {
		pluginId,
		payload,
		legacyPath: hasLegacyApiKey ? "tools.web.search.apiKey" : `tools.web.search.${LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID}`,
		targetPath: hasLegacyApiKey && !legacyProviderConfig ? `plugins.entries.${pluginId}.config.webSearch.apiKey` : `plugins.entries.${pluginId}.config.webSearch`
	};
}
function migratePluginWebSearchConfig(params) {
	const entry = ensureRecord(ensureRecord(ensureRecord(params.root, "plugins"), "entries"), params.pluginId);
	const config = ensureRecord(entry, "config");
	const hadEnabled = entry.enabled !== void 0;
	const existing = isRecord(config.webSearch) ? cloneRecord(config.webSearch) : void 0;
	if (!hadEnabled) entry.enabled = true;
	if (!existing) {
		config.webSearch = cloneRecord(params.payload);
		params.changes.push(`Moved ${params.legacyPath} → ${params.targetPath}.`);
		return;
	}
	const merged = cloneRecord(existing);
	mergeMissing(merged, params.payload);
	const changed = JSON.stringify(merged) !== JSON.stringify(existing) || !hadEnabled;
	config.webSearch = merged;
	if (changed) {
		params.changes.push(`Merged ${params.legacyPath} → ${params.targetPath} (filled missing fields from legacy; kept explicit plugin config values).`);
		return;
	}
	params.changes.push(`Removed ${params.legacyPath} (${params.targetPath} already set).`);
}
function listLegacyWebSearchConfigPaths(raw) {
	const search = resolveLegacySearchConfig(raw);
	if (!search) return [];
	const paths = [];
	if ("apiKey" in search) paths.push("tools.web.search.apiKey");
	for (const providerId of LEGACY_WEB_SEARCH_PROVIDER_IDS) {
		const scoped = search[providerId];
		if (isRecord(scoped)) for (const key of Object.keys(scoped)) paths.push(`tools.web.search.${providerId}.${key}`);
	}
	return paths;
}
function migrateLegacyWebSearchConfig(raw) {
	if (!isRecord(raw)) return {
		config: raw,
		changes: []
	};
	if (!hasMappedLegacyWebSearchConfig(raw)) return {
		config: raw,
		changes: []
	};
	return normalizeLegacyWebSearchConfigRecord(raw);
}
function normalizeLegacyWebSearchConfigRecord(raw) {
	const nextRoot = cloneRecord(raw);
	const web = ensureRecord(ensureRecord(nextRoot, "tools"), "web");
	const search = resolveLegacySearchConfig(nextRoot);
	if (!search) return {
		config: raw,
		changes: []
	};
	const nextSearch = {};
	const changes = [];
	for (const [key, value] of Object.entries(search)) {
		if (key === "apiKey") continue;
		if (LEGACY_WEB_SEARCH_PROVIDER_ID_SET.has(key) && isRecord(value)) continue;
		if (MODERN_SCOPED_WEB_SEARCH_KEYS.has(key) || !isRecord(value)) nextSearch[key] = value;
	}
	web.search = nextSearch;
	const globalSearchMigration = resolveLegacyGlobalWebSearchMigration(search);
	if (globalSearchMigration) migratePluginWebSearchConfig({
		root: nextRoot,
		legacyPath: globalSearchMigration.legacyPath,
		targetPath: globalSearchMigration.targetPath,
		pluginId: globalSearchMigration.pluginId,
		payload: globalSearchMigration.payload,
		changes
	});
	for (const providerId of LEGACY_WEB_SEARCH_PROVIDER_IDS) {
		if (providerId === LEGACY_GLOBAL_WEB_SEARCH_PROVIDER_ID) continue;
		const scoped = copyLegacyProviderConfig(search, providerId);
		if (!scoped || Object.keys(scoped).length === 0) continue;
		const pluginId = resolveManifestContractOwnerPluginId({
			contract: "webSearchProviders",
			value: providerId,
			origin: "bundled"
		});
		if (!pluginId) continue;
		migratePluginWebSearchConfig({
			root: nextRoot,
			legacyPath: `tools.web.search.${providerId}`,
			targetPath: `plugins.entries.${pluginId}.config.webSearch`,
			pluginId,
			payload: scoped,
			changes
		});
	}
	return {
		config: nextRoot,
		changes
	};
}
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.web-search.ts
const LEGACY_WEB_SEARCH_RULES = [{
	path: [
		"tools",
		"web",
		"search"
	],
	message: "tools.web.search provider-owned config moved to plugins.entries.<plugin>.config.webSearch. Run \"openclaw doctor --fix\".",
	match: (_value, root) => listLegacyWebSearchConfigPaths(root).length > 0,
	requireSourceLiteral: true
}];
function replaceRootRecord(target, replacement) {
	for (const key of Object.keys(target)) delete target[key];
	Object.assign(target, replacement);
}
const LEGACY_CONFIG_MIGRATIONS_WEB_SEARCH = [defineLegacyConfigMigration({
	id: "tools.web.search-provider-config->plugins.entries",
	describe: "Move legacy tools.web.search provider-owned config into plugins.entries.<plugin>.config.webSearch",
	legacyRules: LEGACY_WEB_SEARCH_RULES,
	apply: (raw, changes) => {
		const migrated = migrateLegacyWebSearchConfig(raw);
		if (migrated.changes.length === 0) return;
		replaceRootRecord(raw, migrated.config);
		changes.push(...migrated.changes);
	}
})];
//#endregion
//#region src/commands/doctor/shared/legacy-config-migrations.ts
const LEGACY_CONFIG_MIGRATION_SPECS = [
	...LEGACY_CONFIG_MIGRATIONS_CHANNELS,
	...LEGACY_CONFIG_MIGRATIONS_AUDIO,
	...LEGACY_CONFIG_MIGRATIONS_RUNTIME,
	...LEGACY_CONFIG_MIGRATIONS_WEB_SEARCH
];
const LEGACY_CONFIG_MIGRATIONS = LEGACY_CONFIG_MIGRATION_SPECS.map(({ legacyRules: _legacyRules, ...migration }) => migration);
const LEGACY_CONFIG_MIGRATION_RULES = LEGACY_CONFIG_MIGRATION_SPECS.flatMap((migration) => migration.legacyRules ?? []);
//#endregion
//#region src/config/legacy.ts
function getPathValue(root, path) {
	let cursor = root;
	for (const key of path) {
		if (!cursor || typeof cursor !== "object") return;
		cursor = cursor[key];
	}
	return cursor;
}
function findLegacyConfigIssues(raw, sourceRaw, extraRules = []) {
	if (!raw || typeof raw !== "object") return [];
	const root = raw;
	const sourceRoot = sourceRaw && typeof sourceRaw === "object" ? sourceRaw : root;
	const issues = [];
	for (const rule of [
		...LEGACY_CONFIG_MIGRATION_RULES,
		...collectChannelLegacyConfigRules(),
		...extraRules
	]) {
		const cursor = getPathValue(root, rule.path);
		if (cursor !== void 0 && (!rule.match || rule.match(cursor, root))) {
			if (rule.requireSourceLiteral) {
				const sourceCursor = getPathValue(sourceRoot, rule.path);
				if (sourceCursor === void 0) continue;
				if (rule.match && !rule.match(sourceCursor, sourceRoot)) continue;
			}
			issues.push({
				path: rule.path.join("."),
				message: rule.message
			});
		}
	}
	return issues;
}
//#endregion
//#region src/agents/models-config.providers.policy.lookup.ts
const GENERIC_PROVIDER_APIS = new Set([
	"openai-completions",
	"openai-responses",
	"anthropic-messages",
	"google-generative-ai"
]);
function resolveProviderPluginLookupKey(providerKey, provider) {
	const api = typeof provider?.api === "string" ? provider.api.trim() : "";
	if (api && MODEL_APIS.includes(api) && !GENERIC_PROVIDER_APIS.has(api)) return api;
	return providerKey;
}
//#endregion
//#region src/agents/models-config.providers.policy.runtime.ts
function applyProviderNativeStreamingUsagePolicy(providerKey, provider) {
	return applyProviderNativeStreamingUsageCompatWithPlugin({
		provider: resolveProviderPluginLookupKey(providerKey, provider),
		context: {
			provider: providerKey,
			providerConfig: provider
		}
	}) ?? provider;
}
function normalizeProviderConfigPolicy(providerKey, provider) {
	return normalizeProviderConfigWithPlugin({
		provider: resolveProviderPluginLookupKey(providerKey, provider),
		context: {
			provider: providerKey,
			providerConfig: provider
		}
	}) ?? provider;
}
function resolveProviderConfigApiKeyPolicy(providerKey, provider) {
	const runtimeProviderKey = resolveProviderPluginLookupKey(providerKey, provider).trim();
	return (env) => resolveProviderConfigApiKeyWithPlugin({
		provider: runtimeProviderKey,
		context: {
			provider: providerKey,
			env
		}
	});
}
//#endregion
//#region src/agents/models-config.providers.policy.ts
function applyNativeStreamingUsageCompat(providers) {
	let changed = false;
	const nextProviders = {};
	for (const [providerKey, provider] of Object.entries(providers)) {
		const nextProvider = applyProviderNativeStreamingUsagePolicy(providerKey, provider);
		nextProviders[providerKey] = nextProvider;
		changed ||= nextProvider !== provider;
	}
	return changed ? nextProviders : providers;
}
function normalizeProviderSpecificConfig(providerKey, provider) {
	const normalized = normalizeProviderConfigPolicy(providerKey, provider);
	if (normalized && normalized !== provider) return normalized;
	return provider;
}
function resolveProviderConfigApiKeyResolver(providerKey, provider) {
	return resolveProviderConfigApiKeyPolicy(providerKey, provider);
}
function resolveAgentMaxConcurrent(cfg) {
	const raw = cfg?.agents?.defaults?.maxConcurrent;
	if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
	return 4;
}
function resolveSubagentMaxConcurrent(cfg) {
	const raw = cfg?.agents?.defaults?.subagents?.maxConcurrent;
	if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
	return 8;
}
//#endregion
//#region src/config/talk.ts
function isPlainObject$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeString(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeTalkSecretInput(value) {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : void 0;
	}
	return coerceSecretRef(value) ?? void 0;
}
function normalizeSilenceTimeoutMs(value) {
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return;
	return value;
}
function normalizeTalkProviderConfig(value) {
	if (!isPlainObject$1(value)) return;
	const provider = {};
	for (const [key, raw] of Object.entries(value)) {
		if (raw === void 0) continue;
		if (key === "apiKey") {
			const normalized = normalizeTalkSecretInput(raw);
			if (normalized !== void 0) provider.apiKey = normalized;
			continue;
		}
		provider[key] = raw;
	}
	return Object.keys(provider).length > 0 ? provider : void 0;
}
function normalizeTalkProviders(value) {
	if (!isPlainObject$1(value)) return;
	const providers = {};
	for (const [rawProviderId, providerConfig] of Object.entries(value)) {
		const providerId = normalizeString(rawProviderId);
		if (!providerId) continue;
		const normalizedProvider = normalizeTalkProviderConfig(providerConfig);
		if (!normalizedProvider) continue;
		providers[providerId] = normalizedProvider;
	}
	return Object.keys(providers).length > 0 ? providers : void 0;
}
function activeProviderFromTalk(talk) {
	const provider = normalizeString(talk.provider);
	const providers = talk.providers;
	if (provider) {
		if (providers && !(provider in providers)) return;
		return provider;
	}
	const providerIds = providers ? Object.keys(providers) : [];
	return providerIds.length === 1 ? providerIds[0] : void 0;
}
function normalizeTalkSection(value) {
	if (!isPlainObject$1(value)) return;
	const source = value;
	const normalized = {};
	if (typeof source.interruptOnSpeech === "boolean") normalized.interruptOnSpeech = source.interruptOnSpeech;
	const silenceTimeoutMs = normalizeSilenceTimeoutMs(source.silenceTimeoutMs);
	if (silenceTimeoutMs !== void 0) normalized.silenceTimeoutMs = silenceTimeoutMs;
	const providers = normalizeTalkProviders(source.providers);
	const provider = normalizeString(source.provider);
	if (providers) normalized.providers = providers;
	if (provider) normalized.provider = provider;
	return Object.keys(normalized).length > 0 ? normalized : void 0;
}
function normalizeTalkConfig(config) {
	if (!config.talk) return config;
	const normalizedTalk = normalizeTalkSection(config.talk);
	if (!normalizedTalk) return config;
	return {
		...config,
		talk: normalizedTalk
	};
}
function resolveActiveTalkProviderConfig(talk) {
	const normalizedTalk = normalizeTalkSection(talk);
	if (!normalizedTalk) return;
	const provider = activeProviderFromTalk(normalizedTalk);
	if (!provider) return;
	return {
		provider,
		config: normalizedTalk.providers?.[provider] ?? {}
	};
}
function buildTalkConfigResponse(value) {
	if (!isPlainObject$1(value)) return;
	const normalized = normalizeTalkSection(value);
	if (!normalized) return;
	const payload = {};
	if (typeof normalized.interruptOnSpeech === "boolean") payload.interruptOnSpeech = normalized.interruptOnSpeech;
	if (typeof normalized.silenceTimeoutMs === "number") payload.silenceTimeoutMs = normalized.silenceTimeoutMs;
	if (normalized.providers && Object.keys(normalized.providers).length > 0) payload.providers = normalized.providers;
	const resolved = resolveActiveTalkProviderConfig(normalized);
	const activeProvider = normalizeString(normalized.provider) ?? resolved?.provider;
	if (activeProvider) payload.provider = activeProvider;
	if (resolved) payload.resolved = resolved;
	return Object.keys(payload).length > 0 ? payload : void 0;
}
//#endregion
//#region src/config/defaults.ts
let defaultWarnState = { warned: false };
const DEFAULT_MODEL_ALIASES = {
	opus: "anthropic/claude-opus-4-6",
	sonnet: "anthropic/claude-sonnet-4-6",
	gpt: "openai/gpt-5.4",
	"gpt-mini": "openai/gpt-5.4-mini",
	"gpt-nano": "openai/gpt-5.4-nano",
	gemini: "google/gemini-3.1-pro-preview",
	"gemini-flash": "google/gemini-3-flash-preview",
	"gemini-flash-lite": "google/gemini-3.1-flash-lite-preview"
};
const DEFAULT_MODEL_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
const DEFAULT_MODEL_INPUT = ["text"];
const DEFAULT_MODEL_MAX_TOKENS = 8192;
const MISTRAL_SAFE_MAX_TOKENS_BY_MODEL = {
	"devstral-medium-latest": 32768,
	"magistral-small": 4e4,
	"mistral-large-latest": 16384,
	"mistral-medium-2508": 8192,
	"mistral-small-latest": 16384,
	"pixtral-large-latest": 32768
};
function isPositiveNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function resolveModelCost(raw) {
	return {
		input: typeof raw?.input === "number" ? raw.input : DEFAULT_MODEL_COST.input,
		output: typeof raw?.output === "number" ? raw.output : DEFAULT_MODEL_COST.output,
		cacheRead: typeof raw?.cacheRead === "number" ? raw.cacheRead : DEFAULT_MODEL_COST.cacheRead,
		cacheWrite: typeof raw?.cacheWrite === "number" ? raw.cacheWrite : DEFAULT_MODEL_COST.cacheWrite
	};
}
function resolveNormalizedProviderModelMaxTokens(params) {
	const clamped = Math.min(params.rawMaxTokens, params.contextWindow);
	if (normalizeProviderId(params.providerId) !== "mistral" || clamped < params.contextWindow) return clamped;
	const safeMaxTokens = MISTRAL_SAFE_MAX_TOKENS_BY_MODEL[params.modelId] ?? DEFAULT_MODEL_MAX_TOKENS;
	return Math.min(safeMaxTokens, params.contextWindow);
}
function applyMessageDefaults(cfg) {
	const messages = cfg.messages;
	if (messages?.ackReactionScope !== void 0) return cfg;
	const nextMessages = messages ? { ...messages } : {};
	nextMessages.ackReactionScope = "group-mentions";
	return {
		...cfg,
		messages: nextMessages
	};
}
function applySessionDefaults(cfg, options = {}) {
	const session = cfg.session;
	if (!session || session.mainKey === void 0) return cfg;
	const trimmed = session.mainKey.trim();
	const warn = options.warn ?? console.warn;
	const warnState = options.warnState ?? defaultWarnState;
	const next = {
		...cfg,
		session: {
			...session,
			mainKey: "main"
		}
	};
	if (trimmed && trimmed !== "main" && !warnState.warned) {
		warnState.warned = true;
		warn("session.mainKey is ignored; main session is always \"main\".");
	}
	return next;
}
function applyTalkConfigNormalization(config) {
	return normalizeTalkConfig(config);
}
function applyModelDefaults(cfg) {
	let mutated = false;
	let nextCfg = cfg;
	const providerConfig = nextCfg.models?.providers;
	if (providerConfig) {
		const nextProviders = { ...providerConfig };
		for (const [providerId, provider] of Object.entries(providerConfig)) {
			const normalizedProvider = normalizeProviderSpecificConfig(providerId, provider);
			const models = normalizedProvider.models;
			if (!Array.isArray(models) || models.length === 0) {
				if (normalizedProvider !== provider) {
					nextProviders[providerId] = normalizedProvider;
					mutated = true;
				}
				continue;
			}
			const providerApi = normalizedProvider.api;
			let nextProvider = normalizedProvider;
			if (nextProvider !== provider) mutated = true;
			let providerMutated = false;
			const nextModels = models.map((model) => {
				const raw = model;
				let modelMutated = false;
				const reasoning = typeof raw.reasoning === "boolean" ? raw.reasoning : false;
				if (raw.reasoning !== reasoning) modelMutated = true;
				const input = raw.input ?? [...DEFAULT_MODEL_INPUT];
				if (raw.input === void 0) modelMutated = true;
				const cost = resolveModelCost(raw.cost);
				if (!raw.cost || raw.cost.input !== cost.input || raw.cost.output !== cost.output || raw.cost.cacheRead !== cost.cacheRead || raw.cost.cacheWrite !== cost.cacheWrite) modelMutated = true;
				const contextWindow = isPositiveNumber(raw.contextWindow) ? raw.contextWindow : DEFAULT_CONTEXT_TOKENS;
				if (raw.contextWindow !== contextWindow) modelMutated = true;
				const defaultMaxTokens = Math.min(DEFAULT_MODEL_MAX_TOKENS, contextWindow);
				const rawMaxTokens = isPositiveNumber(raw.maxTokens) ? raw.maxTokens : defaultMaxTokens;
				const maxTokens = resolveNormalizedProviderModelMaxTokens({
					providerId,
					modelId: raw.id,
					contextWindow,
					rawMaxTokens
				});
				if (raw.maxTokens !== maxTokens) modelMutated = true;
				const api = raw.api ?? providerApi;
				if (raw.api !== api) modelMutated = true;
				if (!modelMutated) return model;
				providerMutated = true;
				return {
					...raw,
					reasoning,
					input,
					cost,
					contextWindow,
					maxTokens,
					api
				};
			});
			if (!providerMutated) {
				if (nextProvider !== provider) nextProviders[providerId] = nextProvider;
				continue;
			}
			nextProviders[providerId] = {
				...nextProvider,
				models: nextModels
			};
			mutated = true;
		}
		if (mutated) nextCfg = {
			...nextCfg,
			models: {
				...nextCfg.models,
				providers: nextProviders
			}
		};
	}
	const existingAgent = nextCfg.agents?.defaults;
	if (!existingAgent) return mutated ? nextCfg : cfg;
	const existingModels = existingAgent.models ?? {};
	if (Object.keys(existingModels).length === 0) return mutated ? nextCfg : cfg;
	const nextModels = { ...existingModels };
	for (const [alias, target] of Object.entries(DEFAULT_MODEL_ALIASES)) {
		const entry = nextModels[target];
		if (!entry) continue;
		if (entry.alias !== void 0) continue;
		nextModels[target] = {
			...entry,
			alias
		};
		mutated = true;
	}
	if (!mutated) return cfg;
	return {
		...nextCfg,
		agents: {
			...nextCfg.agents,
			defaults: {
				...existingAgent,
				models: nextModels
			}
		}
	};
}
function applyAgentDefaults(cfg) {
	const agents = cfg.agents;
	const defaults = agents?.defaults;
	const hasMax = typeof defaults?.maxConcurrent === "number" && Number.isFinite(defaults.maxConcurrent);
	const hasSubMax = typeof defaults?.subagents?.maxConcurrent === "number" && Number.isFinite(defaults.subagents.maxConcurrent);
	if (hasMax && hasSubMax) return cfg;
	let mutated = false;
	const nextDefaults = defaults ? { ...defaults } : {};
	if (!hasMax) {
		nextDefaults.maxConcurrent = 4;
		mutated = true;
	}
	const nextSubagents = defaults?.subagents ? { ...defaults.subagents } : {};
	if (!hasSubMax) {
		nextSubagents.maxConcurrent = 8;
		mutated = true;
	}
	if (!mutated) return cfg;
	return {
		...cfg,
		agents: {
			...agents,
			defaults: {
				...nextDefaults,
				subagents: nextSubagents
			}
		}
	};
}
function applyLoggingDefaults(cfg) {
	const logging = cfg.logging;
	if (!logging) return cfg;
	if (logging.redactSensitive) return cfg;
	return {
		...cfg,
		logging: {
			...logging,
			redactSensitive: "tools"
		}
	};
}
function applyContextPruningDefaults(cfg) {
	return applyProviderConfigDefaultsWithPlugin({
		provider: "anthropic",
		context: {
			provider: "anthropic",
			config: cfg,
			env: process.env
		}
	}) ?? cfg;
}
function applyCompactionDefaults(cfg) {
	const defaults = cfg.agents?.defaults;
	if (!defaults) return cfg;
	const compaction = defaults?.compaction;
	if (compaction?.mode) return cfg;
	return {
		...cfg,
		agents: {
			...cfg.agents,
			defaults: {
				...defaults,
				compaction: {
					...compaction,
					mode: "safeguard"
				}
			}
		}
	};
}
//#endregion
//#region src/infra/exec-safe-bin-policy-profiles.ts
const NO_FLAGS$1 = /* @__PURE__ */ new Set();
const DEFAULT_SAFE_BINS = [
	"cut",
	"uniq",
	"head",
	"tail",
	"tr",
	"wc"
];
const toFlagSet = (flags) => {
	if (!flags || flags.length === 0) return NO_FLAGS$1;
	return new Set(flags);
};
function collectKnownLongFlags(allowedValueFlags, deniedFlags) {
	const known = /* @__PURE__ */ new Set();
	for (const flag of allowedValueFlags) if (flag.startsWith("--")) known.add(flag);
	for (const flag of deniedFlags) if (flag.startsWith("--")) known.add(flag);
	return Array.from(known);
}
function buildLongFlagPrefixMap(knownLongFlags) {
	const prefixMap = /* @__PURE__ */ new Map();
	for (const flag of knownLongFlags) {
		if (!flag.startsWith("--") || flag.length <= 2) continue;
		for (let length = 3; length <= flag.length; length += 1) {
			const prefix = flag.slice(0, length);
			const existing = prefixMap.get(prefix);
			if (existing === void 0) {
				prefixMap.set(prefix, flag);
				continue;
			}
			if (existing !== flag) prefixMap.set(prefix, null);
		}
	}
	return prefixMap;
}
function compileSafeBinProfile(fixture) {
	const allowedValueFlags = toFlagSet(fixture.allowedValueFlags);
	const deniedFlags = toFlagSet(fixture.deniedFlags);
	const knownLongFlags = collectKnownLongFlags(allowedValueFlags, deniedFlags);
	return {
		minPositional: fixture.minPositional,
		maxPositional: fixture.maxPositional,
		allowedValueFlags,
		deniedFlags,
		knownLongFlags,
		knownLongFlagsSet: new Set(knownLongFlags),
		longFlagPrefixMap: buildLongFlagPrefixMap(knownLongFlags)
	};
}
function compileSafeBinProfiles(fixtures) {
	return Object.fromEntries(Object.entries(fixtures).map(([name, fixture]) => [name, compileSafeBinProfile(fixture)]));
}
const SAFE_BIN_PROFILES = compileSafeBinProfiles({
	jq: {
		maxPositional: 1,
		allowedValueFlags: [
			"--arg",
			"--argjson",
			"--argstr"
		],
		deniedFlags: [
			"--argfile",
			"--rawfile",
			"--slurpfile",
			"--from-file",
			"--library-path",
			"-L",
			"-f"
		]
	},
	grep: {
		maxPositional: 0,
		allowedValueFlags: [
			"--regexp",
			"--max-count",
			"--after-context",
			"--before-context",
			"--context",
			"--devices",
			"--binary-files",
			"--exclude",
			"--include",
			"--label",
			"-e",
			"-m",
			"-A",
			"-B",
			"-C",
			"-D"
		],
		deniedFlags: [
			"--file",
			"--exclude-from",
			"--dereference-recursive",
			"--directories",
			"--recursive",
			"-f",
			"-d",
			"-r",
			"-R"
		]
	},
	cut: {
		maxPositional: 0,
		allowedValueFlags: [
			"--bytes",
			"--characters",
			"--fields",
			"--delimiter",
			"--output-delimiter",
			"-b",
			"-c",
			"-f",
			"-d"
		]
	},
	sort: {
		maxPositional: 0,
		allowedValueFlags: [
			"--key",
			"--field-separator",
			"--buffer-size",
			"--parallel",
			"--batch-size",
			"-k",
			"-t",
			"-S"
		],
		deniedFlags: [
			"--compress-program",
			"--files0-from",
			"--output",
			"--random-source",
			"--temporary-directory",
			"-T",
			"-o"
		]
	},
	uniq: {
		maxPositional: 0,
		allowedValueFlags: [
			"--skip-fields",
			"--skip-chars",
			"--check-chars",
			"--group",
			"-f",
			"-s",
			"-w"
		]
	},
	head: {
		maxPositional: 0,
		allowedValueFlags: [
			"--lines",
			"--bytes",
			"-n",
			"-c"
		]
	},
	tail: {
		maxPositional: 0,
		allowedValueFlags: [
			"--lines",
			"--bytes",
			"--sleep-interval",
			"--max-unchanged-stats",
			"--pid",
			"-n",
			"-c"
		]
	},
	tr: {
		minPositional: 1,
		maxPositional: 2
	},
	wc: {
		maxPositional: 0,
		deniedFlags: ["--files0-from"]
	}
});
function normalizeSafeBinProfileName(raw) {
	const name = raw.trim().toLowerCase();
	return name.length > 0 ? name : null;
}
function normalizeFixtureLimit(raw) {
	if (typeof raw !== "number" || !Number.isFinite(raw)) return;
	const next = Math.trunc(raw);
	return next >= 0 ? next : void 0;
}
function normalizeFixtureFlags(flags) {
	if (!Array.isArray(flags) || flags.length === 0) return;
	const normalized = Array.from(new Set(flags.map((flag) => flag.trim()).filter((flag) => flag.length > 0))).toSorted((a, b) => a.localeCompare(b));
	return normalized.length > 0 ? normalized : void 0;
}
function normalizeSafeBinProfileFixture(fixture) {
	const minPositional = normalizeFixtureLimit(fixture.minPositional);
	const maxPositionalRaw = normalizeFixtureLimit(fixture.maxPositional);
	return {
		minPositional,
		maxPositional: minPositional !== void 0 && maxPositionalRaw !== void 0 && maxPositionalRaw < minPositional ? minPositional : maxPositionalRaw,
		allowedValueFlags: normalizeFixtureFlags(fixture.allowedValueFlags),
		deniedFlags: normalizeFixtureFlags(fixture.deniedFlags)
	};
}
function normalizeSafeBinProfileFixtures(fixtures) {
	const normalized = {};
	if (!fixtures) return normalized;
	for (const [rawName, fixture] of Object.entries(fixtures)) {
		const name = normalizeSafeBinProfileName(rawName);
		if (!name) continue;
		normalized[name] = normalizeSafeBinProfileFixture(fixture);
	}
	return normalized;
}
function resolveSafeBinProfiles(fixtures) {
	const normalizedFixtures = normalizeSafeBinProfileFixtures(fixtures);
	if (Object.keys(normalizedFixtures).length === 0) return SAFE_BIN_PROFILES;
	return {
		...SAFE_BIN_PROFILES,
		...compileSafeBinProfiles(normalizedFixtures)
	};
}
//#endregion
//#region src/infra/exec-allowlist-pattern.ts
const GLOB_REGEX_CACHE_LIMIT = 512;
const globRegexCache = /* @__PURE__ */ new Map();
function normalizeMatchTarget(value) {
	if (process.platform === "win32") return value.replace(/^\\\\[?.]\\/, "").replace(/\\/g, "/").toLowerCase();
	return value.replace(/\\\\/g, "/");
}
function tryRealpath(value) {
	try {
		return fs.realpathSync(value);
	} catch {
		return null;
	}
}
function escapeRegExpLiteral(input) {
	return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function compileGlobRegex(pattern) {
	const cacheKey = `${process.platform}:${pattern}`;
	const cached = globRegexCache.get(cacheKey);
	if (cached) return cached;
	let regex = "^";
	let i = 0;
	while (i < pattern.length) {
		const ch = pattern[i];
		if (ch === "*") {
			if (pattern[i + 1] === "*") {
				regex += ".*";
				i += 2;
				continue;
			}
			regex += "[^/]*";
			i += 1;
			continue;
		}
		if (ch === "?") {
			regex += "[^/]";
			i += 1;
			continue;
		}
		regex += escapeRegExpLiteral(ch);
		i += 1;
	}
	regex += "$";
	const compiled = new RegExp(regex, process.platform === "win32" ? "i" : "");
	if (globRegexCache.size >= GLOB_REGEX_CACHE_LIMIT) globRegexCache.clear();
	globRegexCache.set(cacheKey, compiled);
	return compiled;
}
function matchesExecAllowlistPattern(pattern, target) {
	const trimmed = pattern.trim();
	if (!trimmed) return false;
	const expanded = trimmed.startsWith("~") ? expandHomePrefix(trimmed) : trimmed;
	const hasWildcard = /[*?]/.test(expanded);
	let normalizedPattern = expanded;
	let normalizedTarget = target;
	if (process.platform === "win32" && !hasWildcard) {
		normalizedPattern = tryRealpath(expanded) ?? expanded;
		normalizedTarget = tryRealpath(target) ?? target;
	}
	normalizedPattern = normalizeMatchTarget(normalizedPattern);
	normalizedTarget = normalizeMatchTarget(normalizedTarget);
	return compileGlobRegex(normalizedPattern).test(normalizedTarget);
}
//#endregion
//#region src/infra/exec-wrapper-tokens.ts
const WINDOWS_EXECUTABLE_SUFFIXES = [
	".exe",
	".cmd",
	".bat",
	".com"
];
function stripWindowsExecutableSuffix(value) {
	for (const suffix of WINDOWS_EXECUTABLE_SUFFIXES) if (value.endsWith(suffix)) return value.slice(0, -suffix.length);
	return value;
}
function basenameLower(token) {
	const win = path.win32.basename(token);
	const posix = path.posix.basename(token);
	return (win.length < posix.length ? win : posix).trim().toLowerCase();
}
function normalizeExecutableToken(token) {
	return stripWindowsExecutableSuffix(basenameLower(token));
}
const ENV_OPTIONS_WITH_VALUE = new Set([
	"-u",
	"--unset",
	"-c",
	"--chdir",
	"-s",
	"--split-string",
	"--default-signal",
	"--ignore-signal",
	"--block-signal"
]);
const ENV_INLINE_VALUE_PREFIXES = [
	"-u",
	"-c",
	"-s",
	"--unset=",
	"--chdir=",
	"--split-string=",
	"--default-signal=",
	"--ignore-signal=",
	"--block-signal="
];
const ENV_FLAG_OPTIONS = new Set([
	"-i",
	"--ignore-environment",
	"-0",
	"--null"
]);
const NICE_OPTIONS_WITH_VALUE = new Set([
	"-n",
	"--adjustment",
	"--priority"
]);
const CAFFEINATE_OPTIONS_WITH_VALUE = new Set(["-t", "-w"]);
const STDBUF_OPTIONS_WITH_VALUE = new Set([
	"-i",
	"--input",
	"-o",
	"--output",
	"-e",
	"--error"
]);
const TIME_FLAG_OPTIONS = new Set([
	"-a",
	"--append",
	"-h",
	"--help",
	"-l",
	"-p",
	"-q",
	"--quiet",
	"-v",
	"--verbose",
	"-V",
	"--version"
]);
const TIME_OPTIONS_WITH_VALUE = new Set([
	"-f",
	"--format",
	"-o",
	"--output"
]);
const BSD_SCRIPT_FLAG_OPTIONS = new Set([
	"-a",
	"-d",
	"-k",
	"-p",
	"-q",
	"-r"
]);
const BSD_SCRIPT_OPTIONS_WITH_VALUE = new Set(["-F", "-t"]);
const SANDBOX_EXEC_OPTIONS_WITH_VALUE = new Set([
	"-f",
	"-p",
	"-d"
]);
const TIMEOUT_FLAG_OPTIONS = new Set([
	"--foreground",
	"--preserve-status",
	"-v",
	"--verbose"
]);
const TIMEOUT_OPTIONS_WITH_VALUE = new Set([
	"-k",
	"--kill-after",
	"-s",
	"--signal"
]);
const XCRUN_FLAG_OPTIONS = new Set([
	"-k",
	"--kill-cache",
	"-l",
	"--log",
	"-n",
	"--no-cache",
	"-r",
	"--run",
	"-v",
	"--verbose"
]);
function isArchSelectorToken(token) {
	return /^-[A-Za-z0-9_]+$/.test(token);
}
function isKnownArchSelectorToken(token) {
	return token === "-arm64" || token === "-arm64e" || token === "-i386" || token === "-x86_64" || token === "-x86_64h";
}
function isKnownArchNameToken(token) {
	return isKnownArchSelectorToken(`-${token}`);
}
function withWindowsExeAliases$1(names) {
	const expanded = /* @__PURE__ */ new Set();
	for (const name of names) {
		expanded.add(name);
		expanded.add(`${name}.exe`);
	}
	return Array.from(expanded);
}
function isEnvAssignment(token) {
	return /^[A-Za-z_][A-Za-z0-9_]*=.*/.test(token);
}
function hasEnvInlineValuePrefix(lower) {
	for (const prefix of ENV_INLINE_VALUE_PREFIXES) if (lower.startsWith(prefix)) return true;
	return false;
}
function scanWrapperInvocation(argv, params) {
	let idx = 1;
	let expectsOptionValue = false;
	while (idx < argv.length) {
		const token = argv[idx]?.trim() ?? "";
		if (!token) {
			idx += 1;
			continue;
		}
		if (expectsOptionValue) {
			expectsOptionValue = false;
			idx += 1;
			continue;
		}
		if (params.separators?.has(token)) {
			idx += 1;
			break;
		}
		const directive = params.onToken(token, token.toLowerCase());
		if (directive === "stop") break;
		if (directive === "invalid") return null;
		if (directive === "consume-next") expectsOptionValue = true;
		idx += 1;
	}
	if (expectsOptionValue) return null;
	const commandIndex = params.adjustCommandIndex ? params.adjustCommandIndex(idx, argv) : idx;
	if (commandIndex === null || commandIndex >= argv.length) return null;
	return argv.slice(commandIndex);
}
function unwrapEnvInvocation(argv) {
	return scanWrapperInvocation(argv, {
		separators: new Set(["--", "-"]),
		onToken: (token, lower) => {
			if (isEnvAssignment(token)) return "continue";
			if (!token.startsWith("-") || token === "-") return "stop";
			const [flag] = lower.split("=", 2);
			if (ENV_FLAG_OPTIONS.has(flag)) return "continue";
			if (ENV_OPTIONS_WITH_VALUE.has(flag)) return lower.includes("=") ? "continue" : "consume-next";
			if (hasEnvInlineValuePrefix(lower)) return "continue";
			return "invalid";
		}
	});
}
function envInvocationUsesModifiers(argv) {
	let idx = 1;
	let expectsOptionValue = false;
	while (idx < argv.length) {
		const token = argv[idx]?.trim() ?? "";
		if (!token) {
			idx += 1;
			continue;
		}
		if (expectsOptionValue) return true;
		if (token === "--" || token === "-") {
			idx += 1;
			break;
		}
		if (isEnvAssignment(token)) return true;
		if (!token.startsWith("-") || token === "-") break;
		const lower = token.toLowerCase();
		const [flag] = lower.split("=", 2);
		if (ENV_FLAG_OPTIONS.has(flag)) return true;
		if (ENV_OPTIONS_WITH_VALUE.has(flag)) {
			if (lower.includes("=")) return true;
			expectsOptionValue = true;
			idx += 1;
			continue;
		}
		if (hasEnvInlineValuePrefix(lower)) return true;
		return true;
	}
	return false;
}
function unwrapDashOptionInvocation(argv, params) {
	return scanWrapperInvocation(argv, {
		separators: new Set(["--"]),
		onToken: (token, lower) => {
			if (!token.startsWith("-") || token === "-") return "stop";
			const [flag] = lower.split("=", 2);
			return params.onFlag(flag, lower);
		},
		adjustCommandIndex: params.adjustCommandIndex
	});
}
function unwrapNiceInvocation(argv) {
	return unwrapDashOptionInvocation(argv, { onFlag: (flag, lower) => {
		if (/^-\d+$/.test(lower)) return "continue";
		if (NICE_OPTIONS_WITH_VALUE.has(flag)) return lower.includes("=") || lower !== flag ? "continue" : "consume-next";
		if (lower.startsWith("-n") && lower.length > 2) return "continue";
		return "invalid";
	} });
}
function unwrapCaffeinateInvocation(argv) {
	return unwrapDashOptionInvocation(argv, { onFlag: (flag, lower) => {
		if (flag === "-d" || flag === "-i" || flag === "-m" || flag === "-s" || flag === "-u") return "continue";
		if (CAFFEINATE_OPTIONS_WITH_VALUE.has(flag)) return lower !== flag || lower.includes("=") ? "continue" : "consume-next";
		return "invalid";
	} });
}
function unwrapNohupInvocation(argv) {
	return scanWrapperInvocation(argv, {
		separators: new Set(["--"]),
		onToken: (token, lower) => {
			if (!token.startsWith("-") || token === "-") return "stop";
			return lower === "--help" || lower === "--version" ? "continue" : "invalid";
		}
	});
}
function unwrapSandboxExecInvocation(argv) {
	return unwrapDashOptionInvocation(argv, { onFlag: (flag, lower) => {
		if (SANDBOX_EXEC_OPTIONS_WITH_VALUE.has(flag)) return lower !== flag || lower.includes("=") ? "continue" : "consume-next";
		return "invalid";
	} });
}
function unwrapStdbufInvocation(argv) {
	return unwrapDashOptionInvocation(argv, { onFlag: (flag, lower) => {
		if (!STDBUF_OPTIONS_WITH_VALUE.has(flag)) return "invalid";
		return lower.includes("=") ? "continue" : "consume-next";
	} });
}
function unwrapTimeInvocation(argv) {
	return unwrapDashOptionInvocation(argv, { onFlag: (flag, lower) => {
		if (TIME_FLAG_OPTIONS.has(flag)) return "continue";
		if (TIME_OPTIONS_WITH_VALUE.has(flag)) return lower.includes("=") ? "continue" : "consume-next";
		return "invalid";
	} });
}
function supportsScriptPositionalCommand(platform = process.platform) {
	return platform === "darwin" || platform === "freebsd";
}
function unwrapScriptInvocation(argv) {
	if (!supportsScriptPositionalCommand()) return null;
	return scanWrapperInvocation(argv, {
		separators: new Set(["--"]),
		onToken: (token, lower) => {
			if (!lower.startsWith("-") || lower === "-") return "stop";
			const [flag] = token.split("=", 2);
			if (BSD_SCRIPT_OPTIONS_WITH_VALUE.has(flag)) return token.includes("=") ? "continue" : "consume-next";
			if (BSD_SCRIPT_FLAG_OPTIONS.has(flag)) return "continue";
			return "invalid";
		},
		adjustCommandIndex: (commandIndex, currentArgv) => {
			let sawTranscript = false;
			for (let idx = commandIndex; idx < currentArgv.length; idx += 1) {
				if (!(currentArgv[idx]?.trim() ?? "")) continue;
				if (!sawTranscript) {
					sawTranscript = true;
					continue;
				}
				return idx;
			}
			return null;
		}
	});
}
function unwrapTimeoutInvocation(argv) {
	return unwrapDashOptionInvocation(argv, {
		onFlag: (flag, lower) => {
			if (TIMEOUT_FLAG_OPTIONS.has(flag)) return "continue";
			if (TIMEOUT_OPTIONS_WITH_VALUE.has(flag)) return lower.includes("=") ? "continue" : "consume-next";
			return "invalid";
		},
		adjustCommandIndex: (commandIndex, currentArgv) => {
			const wrappedCommandIndex = commandIndex + 1;
			return wrappedCommandIndex < currentArgv.length ? wrappedCommandIndex : null;
		}
	});
}
function unwrapArchInvocation(argv) {
	let expectsArchName = false;
	return scanWrapperInvocation(argv, { onToken: (token, lower) => {
		if (expectsArchName) {
			expectsArchName = false;
			return isKnownArchNameToken(lower) ? "continue" : "invalid";
		}
		if (!token.startsWith("-") || token === "-") return "stop";
		if (lower === "-32" || lower === "-64") return "continue";
		if (lower === "-arch") {
			expectsArchName = true;
			return "continue";
		}
		if (lower === "-c" || lower === "-d" || lower === "-e" || lower === "-h") return "invalid";
		return isArchSelectorToken(token) && isKnownArchSelectorToken(lower) ? "continue" : "invalid";
	} });
}
function supportsArchDispatchWrapper(platform = process.platform) {
	return platform === "darwin";
}
function supportsXcrunDispatchWrapper(platform = process.platform) {
	return platform === "darwin";
}
function unwrapXcrunInvocation(argv) {
	return scanWrapperInvocation(argv, { onToken: (token, lower) => {
		if (!token.startsWith("-") || token === "-") return "stop";
		if (XCRUN_FLAG_OPTIONS.has(lower)) return "continue";
		return "invalid";
	} });
}
const DISPATCH_WRAPPER_SPECS = [
	{
		name: "arch",
		unwrap: (argv, platform) => supportsArchDispatchWrapper(platform) ? unwrapArchInvocation(argv) : null,
		transparentUsage: (_argv, platform) => supportsArchDispatchWrapper(platform)
	},
	{
		name: "caffeinate",
		unwrap: unwrapCaffeinateInvocation,
		transparentUsage: true
	},
	{ name: "chrt" },
	{ name: "doas" },
	{
		name: "env",
		unwrap: unwrapEnvInvocation,
		transparentUsage: (argv) => !envInvocationUsesModifiers(argv)
	},
	{ name: "ionice" },
	{
		name: "nice",
		unwrap: unwrapNiceInvocation,
		transparentUsage: true
	},
	{
		name: "nohup",
		unwrap: unwrapNohupInvocation,
		transparentUsage: true
	},
	{
		name: "sandbox-exec",
		unwrap: unwrapSandboxExecInvocation,
		transparentUsage: true
	},
	{
		name: "script",
		unwrap: unwrapScriptInvocation,
		transparentUsage: true
	},
	{ name: "setsid" },
	{
		name: "stdbuf",
		unwrap: unwrapStdbufInvocation,
		transparentUsage: true
	},
	{ name: "sudo" },
	{ name: "taskset" },
	{
		name: "time",
		unwrap: unwrapTimeInvocation,
		transparentUsage: true
	},
	{
		name: "timeout",
		unwrap: unwrapTimeoutInvocation,
		transparentUsage: true
	},
	{
		name: "xcrun",
		unwrap: (argv, platform) => supportsXcrunDispatchWrapper(platform) ? unwrapXcrunInvocation(argv) : null,
		transparentUsage: (_argv, platform) => supportsXcrunDispatchWrapper(platform)
	}
];
const DISPATCH_WRAPPER_SPEC_BY_NAME = new Map(DISPATCH_WRAPPER_SPECS.map((spec) => [spec.name, spec]));
new Set(withWindowsExeAliases$1(DISPATCH_WRAPPER_SPECS.map((spec) => spec.name)));
function blockDispatchWrapper(wrapper) {
	return {
		kind: "blocked",
		wrapper
	};
}
function unwrapDispatchWrapper(wrapper, unwrapped) {
	return unwrapped ? {
		kind: "unwrapped",
		wrapper,
		argv: unwrapped
	} : blockDispatchWrapper(wrapper);
}
function isDispatchWrapperExecutable(token) {
	return DISPATCH_WRAPPER_SPEC_BY_NAME.has(normalizeExecutableToken(token));
}
function unwrapKnownDispatchWrapperInvocation(argv, platform = process.platform) {
	const token0 = argv[0]?.trim();
	if (!token0) return { kind: "not-wrapper" };
	const wrapper = normalizeExecutableToken(token0);
	const spec = DISPATCH_WRAPPER_SPEC_BY_NAME.get(wrapper);
	if (!spec) return { kind: "not-wrapper" };
	return spec.unwrap ? unwrapDispatchWrapper(wrapper, spec.unwrap(argv, platform)) : blockDispatchWrapper(wrapper);
}
function unwrapDispatchWrappersForResolution(argv, maxDepth = 4, platform = process.platform) {
	return resolveDispatchWrapperTrustPlan(argv, maxDepth, platform).argv;
}
function isSemanticDispatchWrapperUsage(wrapper, argv, platform = process.platform) {
	const spec = DISPATCH_WRAPPER_SPEC_BY_NAME.get(wrapper);
	if (!spec?.unwrap) return true;
	const transparentUsage = spec.transparentUsage;
	if (typeof transparentUsage === "function") return !transparentUsage(argv, platform);
	return transparentUsage !== true;
}
function blockedDispatchWrapperPlan(params) {
	return {
		argv: params.argv,
		wrappers: params.wrappers,
		policyBlocked: true,
		blockedWrapper: params.blockedWrapper
	};
}
function resolveDispatchWrapperTrustPlan(argv, maxDepth = 4, platform = process.platform) {
	let current = argv;
	const wrappers = [];
	for (let depth = 0; depth < maxDepth; depth += 1) {
		const unwrap = unwrapKnownDispatchWrapperInvocation(current, platform);
		if (unwrap.kind === "blocked") return blockedDispatchWrapperPlan({
			argv: current,
			wrappers,
			blockedWrapper: unwrap.wrapper
		});
		if (unwrap.kind !== "unwrapped" || unwrap.argv.length === 0) break;
		wrappers.push(unwrap.wrapper);
		if (isSemanticDispatchWrapperUsage(unwrap.wrapper, current, platform)) return blockedDispatchWrapperPlan({
			argv: current,
			wrappers,
			blockedWrapper: unwrap.wrapper
		});
		current = unwrap.argv;
	}
	if (wrappers.length >= maxDepth) {
		const overflow = unwrapKnownDispatchWrapperInvocation(current, platform);
		if (overflow.kind === "blocked" || overflow.kind === "unwrapped") return blockedDispatchWrapperPlan({
			argv: current,
			wrappers,
			blockedWrapper: overflow.wrapper
		});
	}
	return {
		argv: current,
		wrappers,
		policyBlocked: false
	};
}
function hasDispatchEnvManipulation(argv) {
	const unwrap = unwrapKnownDispatchWrapperInvocation(argv);
	return unwrap.kind === "unwrapped" && unwrap.wrapper === "env" && envInvocationUsesModifiers(argv);
}
//#endregion
//#region src/infra/shell-inline-command.ts
const POSIX_INLINE_COMMAND_FLAGS = new Set([
	"-lc",
	"-c",
	"--command"
]);
const POWERSHELL_INLINE_COMMAND_FLAGS = new Set([
	"-c",
	"-command",
	"--command",
	"-f",
	"-file",
	"-encodedcommand",
	"-enc",
	"-e"
]);
function resolveInlineCommandMatch(argv, flags, options = {}) {
	for (let i = 1; i < argv.length; i += 1) {
		const token = argv[i]?.trim();
		if (!token) continue;
		const lower = token.toLowerCase();
		if (lower === "--") break;
		if (flags.has(lower)) {
			const valueTokenIndex = i + 1 < argv.length ? i + 1 : null;
			const command = argv[i + 1]?.trim();
			return {
				command: command ? command : null,
				valueTokenIndex
			};
		}
		if (options.allowCombinedC && /^-[^-]*c[^-]*$/i.test(token)) {
			const commandIndex = lower.indexOf("c");
			const inline = token.slice(commandIndex + 1).trim();
			if (inline) return {
				command: inline,
				valueTokenIndex: i
			};
			const valueTokenIndex = i + 1 < argv.length ? i + 1 : null;
			const command = argv[i + 1]?.trim();
			return {
				command: command ? command : null,
				valueTokenIndex
			};
		}
	}
	return {
		command: null,
		valueTokenIndex: null
	};
}
//#endregion
//#region src/infra/shell-wrapper-resolution.ts
const POSIX_SHELL_WRAPPER_NAMES = [
	"ash",
	"bash",
	"dash",
	"fish",
	"ksh",
	"sh",
	"zsh"
];
const WINDOWS_CMD_WRAPPER_NAMES = ["cmd"];
const POWERSHELL_WRAPPER_NAMES = ["powershell", "pwsh"];
const SHELL_MULTIPLEXER_WRAPPER_NAMES = ["busybox", "toybox"];
function withWindowsExeAliases(names) {
	const expanded = /* @__PURE__ */ new Set();
	for (const name of names) {
		expanded.add(name);
		expanded.add(`${name}.exe`);
	}
	return Array.from(expanded);
}
const POSIX_SHELL_WRAPPERS = new Set(POSIX_SHELL_WRAPPER_NAMES);
new Set(withWindowsExeAliases(WINDOWS_CMD_WRAPPER_NAMES));
const POWERSHELL_WRAPPERS = new Set(withWindowsExeAliases(POWERSHELL_WRAPPER_NAMES));
const POSIX_SHELL_WRAPPER_CANONICAL = new Set(POSIX_SHELL_WRAPPER_NAMES);
const WINDOWS_CMD_WRAPPER_CANONICAL = new Set(WINDOWS_CMD_WRAPPER_NAMES);
const POWERSHELL_WRAPPER_CANONICAL = new Set(POWERSHELL_WRAPPER_NAMES);
const SHELL_MULTIPLEXER_WRAPPER_CANONICAL = new Set(SHELL_MULTIPLEXER_WRAPPER_NAMES);
const SHELL_WRAPPER_CANONICAL = new Set([
	...POSIX_SHELL_WRAPPER_NAMES,
	...WINDOWS_CMD_WRAPPER_NAMES,
	...POWERSHELL_WRAPPER_NAMES
]);
const SHELL_WRAPPER_SPECS = [
	{
		kind: "posix",
		names: POSIX_SHELL_WRAPPER_CANONICAL
	},
	{
		kind: "cmd",
		names: WINDOWS_CMD_WRAPPER_CANONICAL
	},
	{
		kind: "powershell",
		names: POWERSHELL_WRAPPER_CANONICAL
	}
];
function isWithinDispatchClassificationDepth(depth) {
	return depth <= 4;
}
function isShellWrapperExecutable(token) {
	return SHELL_WRAPPER_CANONICAL.has(normalizeExecutableToken(token));
}
function normalizeRawCommand(rawCommand) {
	const trimmed = rawCommand?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}
function findShellWrapperSpec(baseExecutable) {
	for (const spec of SHELL_WRAPPER_SPECS) if (spec.names.has(baseExecutable)) return spec;
	return null;
}
function unwrapKnownShellMultiplexerInvocation(argv) {
	const token0 = argv[0]?.trim();
	if (!token0) return { kind: "not-wrapper" };
	const wrapper = normalizeExecutableToken(token0);
	if (!SHELL_MULTIPLEXER_WRAPPER_CANONICAL.has(wrapper)) return { kind: "not-wrapper" };
	let appletIndex = 1;
	if (argv[appletIndex]?.trim() === "--") appletIndex += 1;
	const applet = argv[appletIndex]?.trim();
	if (!applet || !isShellWrapperExecutable(applet)) return {
		kind: "blocked",
		wrapper
	};
	const unwrapped = argv.slice(appletIndex);
	if (unwrapped.length === 0) return {
		kind: "blocked",
		wrapper
	};
	return {
		kind: "unwrapped",
		wrapper,
		argv: unwrapped
	};
}
function extractPosixShellInlineCommand(argv) {
	return extractInlineCommandByFlags(argv, POSIX_INLINE_COMMAND_FLAGS, { allowCombinedC: true });
}
function extractCmdInlineCommand(argv) {
	const idx = argv.findIndex((item) => {
		const token = item.trim().toLowerCase();
		return token === "/c" || token === "/k";
	});
	if (idx === -1) return null;
	const tail = argv.slice(idx + 1);
	if (tail.length === 0) return null;
	const cmd = tail.join(" ").trim();
	return cmd.length > 0 ? cmd : null;
}
function extractPowerShellInlineCommand(argv) {
	return extractInlineCommandByFlags(argv, POWERSHELL_INLINE_COMMAND_FLAGS);
}
function extractInlineCommandByFlags(argv, flags, options = {}) {
	return resolveInlineCommandMatch(argv, flags, options).command;
}
function extractShellWrapperPayload(argv, spec) {
	switch (spec.kind) {
		case "posix": return extractPosixShellInlineCommand(argv);
		case "cmd": return extractCmdInlineCommand(argv);
		case "powershell": return extractPowerShellInlineCommand(argv);
	}
}
function hasEnvManipulationBeforeShellWrapperInternal(argv, depth, envManipulationSeen) {
	if (!isWithinDispatchClassificationDepth(depth)) return false;
	const token0 = argv[0]?.trim();
	if (!token0) return false;
	const dispatchUnwrap = unwrapKnownDispatchWrapperInvocation(argv);
	if (dispatchUnwrap.kind === "blocked") return false;
	if (dispatchUnwrap.kind === "unwrapped") {
		const nextEnvManipulationSeen = envManipulationSeen || hasDispatchEnvManipulation(argv);
		return hasEnvManipulationBeforeShellWrapperInternal(dispatchUnwrap.argv, depth + 1, nextEnvManipulationSeen);
	}
	const shellMultiplexerUnwrap = unwrapKnownShellMultiplexerInvocation(argv);
	if (shellMultiplexerUnwrap.kind === "blocked") return false;
	if (shellMultiplexerUnwrap.kind === "unwrapped") return hasEnvManipulationBeforeShellWrapperInternal(shellMultiplexerUnwrap.argv, depth + 1, envManipulationSeen);
	const wrapper = findShellWrapperSpec(normalizeExecutableToken(token0));
	if (!wrapper) return false;
	if (!extractShellWrapperPayload(argv, wrapper)) return false;
	return envManipulationSeen;
}
function hasEnvManipulationBeforeShellWrapper(argv) {
	return hasEnvManipulationBeforeShellWrapperInternal(argv, 0, false);
}
function extractShellWrapperCommandInternal(argv, rawCommand, depth) {
	if (!isWithinDispatchClassificationDepth(depth)) return {
		isWrapper: false,
		command: null
	};
	const token0 = argv[0]?.trim();
	if (!token0) return {
		isWrapper: false,
		command: null
	};
	const dispatchUnwrap = unwrapKnownDispatchWrapperInvocation(argv);
	if (dispatchUnwrap.kind === "blocked") return {
		isWrapper: false,
		command: null
	};
	if (dispatchUnwrap.kind === "unwrapped") return extractShellWrapperCommandInternal(dispatchUnwrap.argv, rawCommand, depth + 1);
	const shellMultiplexerUnwrap = unwrapKnownShellMultiplexerInvocation(argv);
	if (shellMultiplexerUnwrap.kind === "blocked") return {
		isWrapper: false,
		command: null
	};
	if (shellMultiplexerUnwrap.kind === "unwrapped") return extractShellWrapperCommandInternal(shellMultiplexerUnwrap.argv, rawCommand, depth + 1);
	const wrapper = findShellWrapperSpec(normalizeExecutableToken(token0));
	if (!wrapper) return {
		isWrapper: false,
		command: null
	};
	const payload = extractShellWrapperPayload(argv, wrapper);
	if (!payload) return {
		isWrapper: false,
		command: null
	};
	return {
		isWrapper: true,
		command: rawCommand ?? payload
	};
}
function extractShellWrapperInlineCommand(argv) {
	const extracted = extractShellWrapperCommandInternal(argv, null, 0);
	return extracted.isWrapper ? extracted.command : null;
}
function extractShellWrapperCommand(argv, rawCommand) {
	return extractShellWrapperCommandInternal(argv, normalizeRawCommand(rawCommand), 0);
}
//#endregion
//#region src/infra/exec-wrapper-trust-plan.ts
function blockedExecWrapperTrustPlan(params) {
	return {
		argv: params.argv,
		policyArgv: params.policyArgv ?? params.argv,
		wrapperChain: params.wrapperChain,
		policyBlocked: true,
		blockedWrapper: params.blockedWrapper,
		shellWrapperExecutable: false,
		shellInlineCommand: null
	};
}
function finalizeExecWrapperTrustPlan(argv, policyArgv, wrapperChain, policyBlocked, blockedWrapper) {
	const rawExecutable = argv[0]?.trim() ?? "";
	const shellWrapperExecutable = !policyBlocked && rawExecutable.length > 0 && isShellWrapperExecutable(rawExecutable);
	return {
		argv,
		policyArgv,
		wrapperChain,
		policyBlocked,
		blockedWrapper,
		shellWrapperExecutable,
		shellInlineCommand: shellWrapperExecutable ? extractShellWrapperInlineCommand(argv) : null
	};
}
function resolveExecWrapperTrustPlan(argv, maxDepth = 4) {
	let current = argv;
	let policyArgv = argv;
	let sawShellMultiplexer = false;
	const wrapperChain = [];
	for (let depth = 0; depth < maxDepth; depth += 1) {
		const dispatchPlan = resolveDispatchWrapperTrustPlan(current, maxDepth - wrapperChain.length);
		if (dispatchPlan.policyBlocked) return blockedExecWrapperTrustPlan({
			argv: dispatchPlan.argv,
			policyArgv: dispatchPlan.argv,
			wrapperChain,
			blockedWrapper: dispatchPlan.blockedWrapper ?? current[0] ?? "unknown"
		});
		if (dispatchPlan.wrappers.length > 0) {
			wrapperChain.push(...dispatchPlan.wrappers);
			current = dispatchPlan.argv;
			if (!sawShellMultiplexer) policyArgv = current;
			if (wrapperChain.length >= maxDepth) break;
			continue;
		}
		const shellMultiplexerUnwrap = unwrapKnownShellMultiplexerInvocation(current);
		if (shellMultiplexerUnwrap.kind === "blocked") return blockedExecWrapperTrustPlan({
			argv: current,
			policyArgv,
			wrapperChain,
			blockedWrapper: shellMultiplexerUnwrap.wrapper
		});
		if (shellMultiplexerUnwrap.kind === "unwrapped") {
			wrapperChain.push(shellMultiplexerUnwrap.wrapper);
			if (!sawShellMultiplexer) {
				policyArgv = current;
				sawShellMultiplexer = true;
			}
			current = shellMultiplexerUnwrap.argv;
			if (wrapperChain.length >= maxDepth) break;
			continue;
		}
		break;
	}
	if (wrapperChain.length >= maxDepth) {
		const dispatchOverflow = unwrapKnownDispatchWrapperInvocation(current);
		if (dispatchOverflow.kind === "blocked" || dispatchOverflow.kind === "unwrapped") return blockedExecWrapperTrustPlan({
			argv: current,
			policyArgv,
			wrapperChain,
			blockedWrapper: dispatchOverflow.wrapper
		});
		const shellMultiplexerOverflow = unwrapKnownShellMultiplexerInvocation(current);
		if (shellMultiplexerOverflow.kind === "blocked" || shellMultiplexerOverflow.kind === "unwrapped") return blockedExecWrapperTrustPlan({
			argv: current,
			policyArgv,
			wrapperChain,
			blockedWrapper: shellMultiplexerOverflow.wrapper
		});
	}
	return finalizeExecWrapperTrustPlan(current, policyArgv, wrapperChain, false);
}
//#endregion
//#region src/infra/executable-path.ts
function isDriveLessWindowsRootedPath(value) {
	return process.platform === "win32" && /^:[\\/]/.test(value);
}
function resolveExecutablePathCandidate(rawExecutable, options) {
	const expanded = rawExecutable.startsWith("~") ? expandHomePrefix(rawExecutable, { env: options?.env }) : rawExecutable;
	if (isDriveLessWindowsRootedPath(expanded)) return;
	const hasPathSeparator = expanded.includes("/") || expanded.includes("\\");
	if (options?.requirePathSeparator && !hasPathSeparator) return;
	if (!hasPathSeparator) return expanded;
	if (path.isAbsolute(expanded)) return expanded;
	const base = options?.cwd && options.cwd.trim() ? options.cwd.trim() : process.cwd();
	return path.resolve(base, expanded);
}
function resolveWindowsExecutableExtensions(executable, env) {
	if (process.platform !== "win32") return [""];
	if (path.extname(executable).length > 0) return [""];
	return ["", ...(env?.PATHEXT ?? env?.Pathext ?? process.env.PATHEXT ?? process.env.Pathext ?? ".EXE;.CMD;.BAT;.COM").split(";").map((ext) => ext.toLowerCase())];
}
function resolveWindowsExecutableExtSet(env) {
	return new Set((env?.PATHEXT ?? env?.Pathext ?? process.env.PATHEXT ?? process.env.Pathext ?? ".EXE;.CMD;.BAT;.COM").split(";").map((ext) => ext.toLowerCase()).filter(Boolean));
}
function isExecutableFile(filePath) {
	try {
		if (!fs.statSync(filePath).isFile()) return false;
		if (process.platform === "win32") {
			const ext = path.extname(filePath).toLowerCase();
			if (!ext) return true;
			return resolveWindowsExecutableExtSet(void 0).has(ext);
		}
		fs.accessSync(filePath, fs.constants.X_OK);
		return true;
	} catch {
		return false;
	}
}
function resolveExecutableFromPathEnv(executable, pathEnv, env) {
	const entries = pathEnv.split(path.delimiter).filter(Boolean);
	const extensions = resolveWindowsExecutableExtensions(executable, env);
	for (const entry of entries) for (const ext of extensions) {
		const candidate = path.join(entry, executable + ext);
		if (isExecutableFile(candidate)) return candidate;
	}
}
function resolveExecutablePath(rawExecutable, options) {
	const candidate = resolveExecutablePathCandidate(rawExecutable, options);
	if (!candidate) return;
	if (candidate.includes("/") || candidate.includes("\\")) return isExecutableFile(candidate) ? candidate : void 0;
	return resolveExecutableFromPathEnv(candidate, options?.env?.PATH ?? options?.env?.Path ?? process.env.PATH ?? process.env.Path ?? "", options?.env);
}
//#endregion
//#region src/infra/exec-command-resolution.ts
function isCommandResolution(resolution) {
	return Boolean(resolution && "execution" in resolution && "policy" in resolution);
}
function parseFirstToken(command) {
	const trimmed = command.trim();
	if (!trimmed) return null;
	const first = trimmed[0];
	if (first === "\"" || first === "'") {
		const end = trimmed.indexOf(first, 1);
		if (end > 1) return trimmed.slice(1, end);
		return trimmed.slice(1);
	}
	const match = /^[^\s]+/.exec(trimmed);
	return match ? match[0] : null;
}
function tryResolveRealpath(filePath) {
	if (!filePath) return;
	try {
		return fs.realpathSync(filePath);
	} catch {
		return;
	}
}
function buildExecutableResolution(rawExecutable, params) {
	const resolvedPath = resolveExecutablePath(rawExecutable, {
		cwd: params.cwd,
		env: params.env
	});
	return {
		rawExecutable,
		resolvedPath,
		resolvedRealPath: tryResolveRealpath(resolvedPath),
		executableName: resolvedPath ? path.basename(resolvedPath) : rawExecutable
	};
}
function buildCommandResolution(params) {
	const execution = buildExecutableResolution(params.rawExecutable, params);
	const policy = params.policyRawExecutable ? buildExecutableResolution(params.policyRawExecutable, params) : execution;
	const resolution = {
		execution,
		policy,
		effectiveArgv: params.effectiveArgv,
		wrapperChain: params.wrapperChain,
		policyBlocked: params.policyBlocked,
		blockedWrapper: params.blockedWrapper
	};
	return Object.defineProperties(resolution, {
		rawExecutable: { get: () => execution.rawExecutable },
		resolvedPath: { get: () => execution.resolvedPath },
		resolvedRealPath: { get: () => execution.resolvedRealPath },
		executableName: { get: () => execution.executableName },
		policyResolution: { get: () => policy === execution ? void 0 : policy }
	});
}
function resolveCommandResolution(command, cwd, env) {
	const rawExecutable = parseFirstToken(command);
	if (!rawExecutable) return null;
	return buildCommandResolution({
		rawExecutable,
		effectiveArgv: [rawExecutable],
		wrapperChain: [],
		policyBlocked: false,
		cwd,
		env
	});
}
function resolveCommandResolutionFromArgv(argv, cwd, env) {
	const plan = resolveExecWrapperTrustPlan(argv);
	const effectiveArgv = plan.argv;
	const rawExecutable = effectiveArgv[0]?.trim();
	if (!rawExecutable) return null;
	return buildCommandResolution({
		rawExecutable,
		policyRawExecutable: plan.policyArgv[0]?.trim(),
		effectiveArgv,
		wrapperChain: plan.wrapperChain,
		policyBlocked: plan.policyBlocked,
		blockedWrapper: plan.blockedWrapper,
		cwd,
		env
	});
}
function resolveExecutableCandidatePathFromResolution(resolution, cwd) {
	if (!resolution) return;
	if (resolution.resolvedPath) return resolution.resolvedPath;
	const raw = resolution.rawExecutable?.trim();
	if (!raw) return;
	return resolveExecutablePathCandidate(raw, {
		cwd,
		requirePathSeparator: true
	});
}
function resolveExecutionTargetResolution(resolution) {
	if (!resolution) return null;
	return isCommandResolution(resolution) ? resolution.execution : resolution;
}
function resolvePolicyTargetResolution(resolution) {
	if (!resolution) return null;
	return isCommandResolution(resolution) ? resolution.policy : resolution;
}
function resolveExecutionTargetCandidatePath(resolution, cwd) {
	return resolveExecutableCandidatePathFromResolution(isCommandResolution(resolution) ? resolution.execution : resolution, cwd);
}
function resolvePolicyTargetCandidatePath(resolution, cwd) {
	return resolveExecutableCandidatePathFromResolution(isCommandResolution(resolution) ? resolution.policy : resolution, cwd);
}
function resolveApprovalAuditCandidatePath(resolution, cwd) {
	return resolvePolicyTargetCandidatePath(resolution, cwd);
}
function resolveAllowlistCandidatePath(resolution, cwd) {
	return resolveExecutionTargetCandidatePath(resolution, cwd);
}
function resolvePolicyAllowlistCandidatePath(resolution, cwd) {
	return resolvePolicyTargetCandidatePath(resolution, cwd);
}
const TRAILING_SHELL_REDIRECTIONS_RE = /\s+(?:[12]>&[12]|[12]>\/dev\/null)\s*$/;
function stripTrailingRedirections(value) {
	let prev = value;
	while (true) {
		const next = prev.replace(TRAILING_SHELL_REDIRECTIONS_RE, "");
		if (next === prev) return next;
		prev = next;
	}
}
function matchArgPattern(argPattern, argv, platform) {
	const sep = argPattern.includes("\0") ? "\0" : " ";
	const argsSlice = argv.slice(1);
	const argsString = sep === "\0" ? argsSlice.length === 0 ? "\0\0" : argsSlice.join(sep) + sep : argsSlice.join(sep);
	try {
		const regex = new RegExp(argPattern);
		if (regex.test(argsString)) return true;
		if (String(platform ?? process.platform).trim().toLowerCase().startsWith("win")) {
			const normalized = argsString.replace(/\//g, "\\");
			if (normalized !== argsString && regex.test(normalized)) return true;
		}
		if (sep === " ") {
			const stripped = stripTrailingRedirections(argsString);
			if (stripped !== argsString && regex.test(stripped)) return true;
		}
		return false;
	} catch {
		return false;
	}
}
function matchAllowlist(entries, resolution, argv, platform) {
	if (!entries.length) return null;
	const bareWild = entries.find((e) => e.pattern?.trim() === "*" && !e.argPattern);
	if (bareWild && resolution) return bareWild;
	if (!resolution?.resolvedPath) return null;
	const resolvedPath = resolution.resolvedPath;
	const effectivePlatform = platform ?? process.platform;
	const useArgPattern = String(effectivePlatform).trim().toLowerCase().startsWith("win");
	let pathOnlyMatch = null;
	for (const entry of entries) {
		const pattern = entry.pattern?.trim();
		if (!pattern) continue;
		if (!(pattern.includes("/") || pattern.includes("\\") || pattern.includes("~"))) continue;
		if (!matchesExecAllowlistPattern(pattern, resolvedPath)) continue;
		if (!useArgPattern) return entry;
		if (!entry.argPattern) {
			if (!pathOnlyMatch) pathOnlyMatch = entry;
			continue;
		}
		if (argv && matchArgPattern(entry.argPattern, argv, platform)) return entry;
	}
	return pathOnlyMatch;
}
/**
* Tokenizes a single argv entry into a normalized option/positional model.
* Consumers can share this model to keep argv parsing behavior consistent.
*/
function parseExecArgvToken(raw) {
	if (!raw) return {
		kind: "empty",
		raw
	};
	if (raw === "--") return {
		kind: "terminator",
		raw
	};
	if (raw === "-") return {
		kind: "stdin",
		raw
	};
	if (!raw.startsWith("-")) return {
		kind: "positional",
		raw
	};
	if (raw.startsWith("--")) {
		const eqIndex = raw.indexOf("=");
		if (eqIndex > 0) return {
			kind: "option",
			raw,
			style: "long",
			flag: raw.slice(0, eqIndex),
			inlineValue: raw.slice(eqIndex + 1)
		};
		return {
			kind: "option",
			raw,
			style: "long",
			flag: raw
		};
	}
	const cluster = raw.slice(1);
	return {
		kind: "option",
		raw,
		style: "short-cluster",
		cluster,
		flags: cluster.split("").map((entry) => `-${entry}`)
	};
}
//#endregion
//#region src/infra/exec-safe-bin-semantics.ts
const JQ_ENV_FILTER_PATTERN = /(^|[^.$A-Za-z0-9_])env([^A-Za-z0-9_]|$)/;
const JQ_ENV_VARIABLE_PATTERN = /\$ENV\b/;
const ALWAYS_DENY_SAFE_BIN_SEMANTICS = () => false;
const UNSAFE_SAFE_BIN_WARNINGS = {
	awk: "awk-family interpreters can execute commands, access ENVIRON, and write files, so prefer explicit allowlist entries or approval-gated runs instead of safeBins.",
	jq: "jq supports broad jq programs and builtins (for example `env`), so prefer explicit allowlist entries or approval-gated runs instead of safeBins.",
	sed: "sed scripts can execute commands and write files, so prefer explicit allowlist entries or approval-gated runs instead of safeBins."
};
const SAFE_BIN_SEMANTIC_RULES = {
	jq: {
		validate: ({ positional }) => !positional.some((token) => JQ_ENV_FILTER_PATTERN.test(token) || JQ_ENV_VARIABLE_PATTERN.test(token)),
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.jq
	},
	awk: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.awk
	},
	gawk: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.awk
	},
	mawk: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.awk
	},
	nawk: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.awk
	},
	sed: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.sed
	},
	gsed: {
		validate: ALWAYS_DENY_SAFE_BIN_SEMANTICS,
		configWarning: UNSAFE_SAFE_BIN_WARNINGS.sed
	}
};
function normalizeSafeBinName(raw) {
	const trimmed = raw.trim().toLowerCase();
	if (!trimmed) return "";
	return (trimmed.split(/[\\/]/).at(-1) ?? trimmed).replace(/\.(?:exe|cmd|bat|com)$/i, "");
}
function getSafeBinSemanticRule(binName) {
	const normalized = typeof binName === "string" ? normalizeSafeBinName(binName) : "";
	return normalized ? SAFE_BIN_SEMANTIC_RULES[normalized] : void 0;
}
function validateSafeBinSemantics(params) {
	return getSafeBinSemanticRule(params.binName)?.validate?.(params) ?? true;
}
function listRiskyConfiguredSafeBins(entries) {
	const hits = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		const normalized = normalizeSafeBinName(entry);
		if (!normalized || hits.has(normalized)) continue;
		const warning = getSafeBinSemanticRule(normalized)?.configWarning;
		if (!warning) continue;
		hits.set(normalized, warning);
	}
	return Array.from(hits.entries()).map(([bin, warning]) => ({
		bin,
		warning
	})).toSorted((a, b) => a.bin.localeCompare(b.bin));
}
//#endregion
//#region src/infra/exec-safe-bin-policy-validator.ts
function isPathLikeToken(value) {
	const trimmed = value.trim();
	if (!trimmed) return false;
	if (trimmed === "-") return false;
	if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("~")) return true;
	if (trimmed.startsWith("/")) return true;
	return /^[A-Za-z]:[\\/]/.test(trimmed);
}
function hasGlobToken(value) {
	return /[*?[\]]/.test(value);
}
const NO_FLAGS = /* @__PURE__ */ new Set();
function isSafeLiteralToken(value) {
	if (!value || value === "-") return true;
	return !hasGlobToken(value) && !isPathLikeToken(value);
}
function isInvalidValueToken(value) {
	return !value || !isSafeLiteralToken(value);
}
function resolveCanonicalLongFlag(params) {
	if (!params.flag.startsWith("--") || params.flag.length <= 2) return null;
	if (params.knownLongFlagsSet.has(params.flag)) return params.flag;
	return params.longFlagPrefixMap.get(params.flag) ?? null;
}
function consumeLongOptionToken(params) {
	const canonicalFlag = resolveCanonicalLongFlag({
		flag: params.flag,
		knownLongFlagsSet: params.knownLongFlagsSet,
		longFlagPrefixMap: params.longFlagPrefixMap
	});
	if (!canonicalFlag) return -1;
	if (params.deniedFlags.has(canonicalFlag)) return -1;
	const expectsValue = params.allowedValueFlags.has(canonicalFlag);
	if (params.inlineValue !== void 0) {
		if (!expectsValue) return -1;
		return isSafeLiteralToken(params.inlineValue) ? params.index + 1 : -1;
	}
	if (!expectsValue) return params.index + 1;
	return isInvalidValueToken(params.args[params.index + 1]) ? -1 : params.index + 2;
}
function consumeShortOptionClusterToken(params) {
	for (let j = 0; j < params.flags.length; j += 1) {
		const flag = params.flags[j];
		if (params.deniedFlags.has(flag)) return -1;
		if (!params.allowedValueFlags.has(flag)) continue;
		const inlineValue = params.cluster.slice(j + 1);
		if (inlineValue) return isSafeLiteralToken(inlineValue) ? params.index + 1 : -1;
		return isInvalidValueToken(params.args[params.index + 1]) ? -1 : params.index + 2;
	}
	return -1;
}
function consumePositionalToken(token, positional) {
	if (!isSafeLiteralToken(token)) return false;
	positional.push(token);
	return true;
}
function validatePositionalCount(positional, profile) {
	const minPositional = profile.minPositional ?? 0;
	if (positional.length < minPositional) return false;
	if (typeof profile.maxPositional === "number" && positional.length > profile.maxPositional) return false;
	return true;
}
function collectPositionalTokens(args, profile) {
	const allowedValueFlags = profile.allowedValueFlags ?? NO_FLAGS;
	const deniedFlags = profile.deniedFlags ?? NO_FLAGS;
	const knownLongFlags = profile.knownLongFlags ?? collectKnownLongFlags(allowedValueFlags, deniedFlags);
	const knownLongFlagsSet = profile.knownLongFlagsSet ?? new Set(knownLongFlags);
	const longFlagPrefixMap = profile.longFlagPrefixMap ?? buildLongFlagPrefixMap(knownLongFlags);
	const positional = [];
	let i = 0;
	while (i < args.length) {
		const token = parseExecArgvToken(args[i] ?? "");
		if (token.kind === "empty" || token.kind === "stdin") {
			i += 1;
			continue;
		}
		if (token.kind === "terminator") {
			for (let j = i + 1; j < args.length; j += 1) {
				const rest = args[j];
				if (!rest || rest === "-") continue;
				if (!consumePositionalToken(rest, positional)) return null;
			}
			break;
		}
		if (token.kind === "positional") {
			if (!consumePositionalToken(token.raw, positional)) return null;
			i += 1;
			continue;
		}
		if (token.style === "long") {
			const nextIndex = consumeLongOptionToken({
				args,
				index: i,
				flag: token.flag,
				inlineValue: token.inlineValue,
				allowedValueFlags,
				deniedFlags,
				knownLongFlagsSet,
				longFlagPrefixMap
			});
			if (nextIndex < 0) return null;
			i = nextIndex;
			continue;
		}
		const nextIndex = consumeShortOptionClusterToken({
			args,
			index: i,
			cluster: token.cluster,
			flags: token.flags,
			allowedValueFlags,
			deniedFlags
		});
		if (nextIndex < 0) return null;
		i = nextIndex;
	}
	return positional;
}
function validateSafeBinArgv(args, profile, options) {
	const positional = collectPositionalTokens(args, profile);
	if (!positional) return false;
	if (!validatePositionalCount(positional, profile)) return false;
	return validateSafeBinSemantics({
		binName: options?.binName,
		positional
	});
}
//#endregion
//#region src/infra/exec-safe-bin-trust.ts
const DEFAULT_SAFE_BIN_TRUSTED_DIRS = ["/bin", "/usr/bin"];
let trustedSafeBinCache = null;
function normalizeTrustedDir(value) {
	const trimmed = value.trim();
	if (!trimmed) return null;
	return path.resolve(trimmed);
}
function normalizeTrustedSafeBinDirs(entries) {
	if (!Array.isArray(entries)) return [];
	const normalized = entries.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
	return Array.from(new Set(normalized));
}
function resolveTrustedSafeBinDirs(entries) {
	const resolved = entries.map((entry) => normalizeTrustedDir(entry)).filter((entry) => Boolean(entry));
	return Array.from(new Set(resolved)).toSorted();
}
function buildTrustedSafeBinCacheKey(entries) {
	return resolveTrustedSafeBinDirs(normalizeTrustedSafeBinDirs(entries)).join("");
}
function buildTrustedSafeBinDirs(params = {}) {
	const baseDirs = params.baseDirs ?? DEFAULT_SAFE_BIN_TRUSTED_DIRS;
	const extraDirs = params.extraDirs ?? [];
	return new Set(resolveTrustedSafeBinDirs([...normalizeTrustedSafeBinDirs(baseDirs), ...normalizeTrustedSafeBinDirs(extraDirs)]));
}
function getTrustedSafeBinDirs(params = {}) {
	const baseDirs = params.baseDirs ?? DEFAULT_SAFE_BIN_TRUSTED_DIRS;
	const extraDirs = params.extraDirs ?? [];
	const key = buildTrustedSafeBinCacheKey([...baseDirs, ...extraDirs]);
	if (!params.refresh && trustedSafeBinCache?.key === key) return trustedSafeBinCache.dirs;
	const dirs = buildTrustedSafeBinDirs({
		baseDirs,
		extraDirs
	});
	trustedSafeBinCache = {
		key,
		dirs
	};
	return dirs;
}
function isTrustedSafeBinPath(params) {
	const trustedDirs = params.trustedDirs ?? getTrustedSafeBinDirs();
	const resolvedDir = path.dirname(path.resolve(params.resolvedPath));
	return trustedDirs.has(resolvedDir);
}
function listWritableExplicitTrustedSafeBinDirs(entries) {
	if (process.platform === "win32") return [];
	const resolved = resolveTrustedSafeBinDirs(normalizeTrustedSafeBinDirs(entries));
	const hits = [];
	for (const dir of resolved) {
		let stat;
		try {
			stat = fs.statSync(dir);
		} catch {
			continue;
		}
		if (!stat.isDirectory()) continue;
		const mode = stat.mode & 511;
		const groupWritable = (mode & 16) !== 0;
		const worldWritable = (mode & 2) !== 0;
		if (!groupWritable && !worldWritable) continue;
		hits.push({
			dir,
			groupWritable,
			worldWritable
		});
	}
	return hits;
}
//#endregion
//#region src/config/normalize-exec-safe-bin.ts
function normalizeExecSafeBinProfilesInConfig(cfg) {
	const normalizeExec = (exec) => {
		if (!exec || typeof exec !== "object" || Array.isArray(exec)) return;
		const typedExec = exec;
		const normalizedProfiles = normalizeSafeBinProfileFixtures(typedExec.safeBinProfiles);
		typedExec.safeBinProfiles = Object.keys(normalizedProfiles).length > 0 ? normalizedProfiles : void 0;
		const normalizedTrustedDirs = normalizeTrustedSafeBinDirs(typedExec.safeBinTrustedDirs);
		typedExec.safeBinTrustedDirs = normalizedTrustedDirs.length > 0 ? normalizedTrustedDirs : void 0;
	};
	normalizeExec(cfg.tools?.exec);
	const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
	for (const agent of agents) normalizeExec(agent?.tools?.exec);
}
//#endregion
//#region src/config/normalize-paths.ts
const PATH_VALUE_RE = /^~(?=$|[\\/])/;
const PATH_KEY_RE = /(dir|path|paths|file|root|workspace)$/i;
const PATH_LIST_KEYS = new Set(["paths", "pathPrepend"]);
function normalizeStringValue(key, value) {
	if (!PATH_VALUE_RE.test(value.trim())) return value;
	if (!key) return value;
	if (PATH_KEY_RE.test(key) || PATH_LIST_KEYS.has(key)) return resolveUserPath(value);
	return value;
}
function normalizeAny(key, value) {
	if (typeof value === "string") return normalizeStringValue(key, value);
	if (Array.isArray(value)) {
		const normalizeChildren = Boolean(key && PATH_LIST_KEYS.has(key));
		return value.map((entry) => {
			if (typeof entry === "string") return normalizeChildren ? normalizeStringValue(key, entry) : entry;
			if (Array.isArray(entry)) return normalizeAny(void 0, entry);
			if (isPlainObject$2(entry)) return normalizeAny(void 0, entry);
			return entry;
		});
	}
	if (!isPlainObject$2(value)) return value;
	for (const [childKey, childValue] of Object.entries(value)) {
		const next = normalizeAny(childKey, childValue);
		if (next !== childValue) value[childKey] = next;
	}
	return value;
}
/**
* Normalize "~" paths in path-ish config fields.
*
* Goal: accept `~/...` consistently across config file + env overrides, while
* keeping the surface area small and predictable.
*/
function normalizeConfigPaths(cfg) {
	if (!cfg || typeof cfg !== "object") return cfg;
	normalizeAny(void 0, cfg);
	return cfg;
}
//#endregion
//#region src/config/materialize.ts
const MATERIALIZATION_PROFILES = {
	load: {
		includeCompactionDefaults: true,
		includeContextPruningDefaults: true,
		includeLoggingDefaults: true,
		normalizePaths: true
	},
	missing: {
		includeCompactionDefaults: true,
		includeContextPruningDefaults: true,
		includeLoggingDefaults: false,
		normalizePaths: false
	},
	snapshot: {
		includeCompactionDefaults: false,
		includeContextPruningDefaults: false,
		includeLoggingDefaults: true,
		normalizePaths: true
	}
};
function asResolvedSourceConfig(config) {
	return config;
}
function asRuntimeConfig(config) {
	return config;
}
function materializeRuntimeConfig(config, mode) {
	const profile = MATERIALIZATION_PROFILES[mode];
	let next = applyMessageDefaults(config);
	if (profile.includeLoggingDefaults) next = applyLoggingDefaults(next);
	next = applySessionDefaults(next);
	next = applyAgentDefaults(next);
	if (profile.includeContextPruningDefaults) next = applyContextPruningDefaults(next);
	if (profile.includeCompactionDefaults) next = applyCompactionDefaults(next);
	next = applyModelDefaults(next);
	next = applyTalkConfigNormalization(next);
	if (profile.normalizePaths) normalizeConfigPaths(next);
	normalizeExecSafeBinProfilesInConfig(next);
	return asRuntimeConfig(next);
}
//#endregion
//#region src/config/config-paths.ts
function parseConfigPath(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return {
		ok: false,
		error: "Invalid path. Use dot notation (e.g. foo.bar)."
	};
	const parts = trimmed.split(".").map((part) => part.trim());
	if (parts.some((part) => !part)) return {
		ok: false,
		error: "Invalid path. Use dot notation (e.g. foo.bar)."
	};
	if (parts.some((part) => isBlockedObjectKey(part))) return {
		ok: false,
		error: "Invalid path segment."
	};
	return {
		ok: true,
		path: parts
	};
}
function setConfigValueAtPath(root, path, value) {
	let cursor = root;
	for (let idx = 0; idx < path.length - 1; idx += 1) {
		const key = path[idx];
		const next = cursor[key];
		if (!isPlainObject$2(next)) cursor[key] = {};
		cursor = cursor[key];
	}
	cursor[path[path.length - 1]] = value;
}
function unsetConfigValueAtPath(root, path) {
	const stack = [];
	let cursor = root;
	for (let idx = 0; idx < path.length - 1; idx += 1) {
		const key = path[idx];
		const next = cursor[key];
		if (!isPlainObject$2(next)) return false;
		stack.push({
			node: cursor,
			key
		});
		cursor = next;
	}
	const leafKey = path[path.length - 1];
	if (!(leafKey in cursor)) return false;
	delete cursor[leafKey];
	for (let idx = stack.length - 1; idx >= 0; idx -= 1) {
		const { node, key } = stack[idx];
		const child = node[key];
		if (isPlainObject$2(child) && Object.keys(child).length === 0) delete node[key];
		else break;
	}
	return true;
}
function getConfigValueAtPath(root, path) {
	let cursor = root;
	for (const key of path) {
		if (!isPlainObject$2(cursor)) return;
		cursor = cursor[key];
	}
	return cursor;
}
//#endregion
//#region src/config/runtime-overrides.ts
let overrides = {};
function sanitizeOverrideValue(value, seen = /* @__PURE__ */ new WeakSet()) {
	if (Array.isArray(value)) return value.map((entry) => sanitizeOverrideValue(entry, seen));
	if (!isPlainObject$2(value)) return value;
	if (seen.has(value)) return {};
	seen.add(value);
	const sanitized = {};
	for (const [key, entry] of Object.entries(value)) {
		if (entry === void 0 || isBlockedObjectKey(key)) continue;
		sanitized[key] = sanitizeOverrideValue(entry, seen);
	}
	seen.delete(value);
	return sanitized;
}
function mergeOverrides(base, override) {
	if (!isPlainObject$2(base) || !isPlainObject$2(override)) return override;
	const next = { ...base };
	for (const [key, value] of Object.entries(override)) {
		if (value === void 0 || isBlockedObjectKey(key)) continue;
		next[key] = mergeOverrides(base[key], value);
	}
	return next;
}
function getConfigOverrides() {
	return overrides;
}
function resetConfigOverrides() {
	overrides = {};
}
function setConfigOverride(pathRaw, value) {
	const parsed = parseConfigPath(pathRaw);
	if (!parsed.ok || !parsed.path) return {
		ok: false,
		error: parsed.error ?? "Invalid path."
	};
	setConfigValueAtPath(overrides, parsed.path, sanitizeOverrideValue(value));
	return { ok: true };
}
function unsetConfigOverride(pathRaw) {
	const parsed = parseConfigPath(pathRaw);
	if (!parsed.ok || !parsed.path) return {
		ok: false,
		removed: false,
		error: parsed.error ?? "Invalid path."
	};
	return {
		ok: true,
		removed: unsetConfigValueAtPath(overrides, parsed.path)
	};
}
function applyConfigOverrides(cfg) {
	if (!overrides || Object.keys(overrides).length === 0) return cfg;
	return mergeOverrides(cfg, overrides);
}
//#endregion
//#region src/secrets/unsupported-surface-policy.ts
function collectUnsupportedSecretRefConfigCandidates(raw) {
	if (!isRecord$2(raw)) return [];
	const candidates = [];
	const commands = isRecord$2(raw.commands) ? raw.commands : null;
	if (commands) candidates.push({
		path: "commands.ownerDisplaySecret",
		value: commands.ownerDisplaySecret
	});
	const hooks = isRecord$2(raw.hooks) ? raw.hooks : null;
	if (hooks) {
		candidates.push({
			path: "hooks.token",
			value: hooks.token
		});
		const gmail = isRecord$2(hooks.gmail) ? hooks.gmail : null;
		if (gmail) candidates.push({
			path: "hooks.gmail.pushToken",
			value: gmail.pushToken
		});
		const mappings = hooks.mappings;
		if (Array.isArray(mappings)) for (const [index, mapping] of mappings.entries()) {
			if (!isRecord$2(mapping)) continue;
			candidates.push({
				path: `hooks.mappings.${index}.sessionKey`,
				value: mapping.sessionKey
			});
		}
	}
	if (isRecord$2(raw.channels)) for (const plugin of iterateBootstrapChannelPlugins()) {
		const channelCandidates = plugin.secrets?.collectUnsupportedSecretRefConfigCandidates?.(raw);
		if (!channelCandidates?.length) continue;
		candidates.push(...channelCandidates);
	}
	return candidates;
}
//#endregion
//#region src/config/bundled-channel-config-metadata.generated.ts
const GENERATED_BUNDLED_CHANNEL_CONFIG_METADATA = [
	{
		pluginId: "bluebubbles",
		channelId: "bluebubbles",
		label: "BlueBubbles",
		description: "iMessage via the BlueBubbles mac app + REST API.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				actions: {
					type: "object",
					properties: {
						reactions: {
							default: true,
							type: "boolean"
						},
						edit: {
							default: true,
							type: "boolean"
						},
						unsend: {
							default: true,
							type: "boolean"
						},
						reply: {
							default: true,
							type: "boolean"
						},
						sendWithEffect: {
							default: true,
							type: "boolean"
						},
						renameGroup: {
							default: true,
							type: "boolean"
						},
						setGroupIcon: {
							default: true,
							type: "boolean"
						},
						addParticipant: {
							default: true,
							type: "boolean"
						},
						removeParticipant: {
							default: true,
							type: "boolean"
						},
						leaveGroup: {
							default: true,
							type: "boolean"
						},
						sendAttachment: {
							default: true,
							type: "boolean"
						}
					},
					required: [
						"reactions",
						"edit",
						"unsend",
						"reply",
						"sendWithEffect",
						"renameGroup",
						"setGroupIcon",
						"addParticipant",
						"removeParticipant",
						"leaveGroup",
						"sendAttachment"
					],
					additionalProperties: false
				},
				serverUrl: { type: "string" },
				password: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				webhookPath: { type: "string" },
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				enrichGroupParticipantsFromContacts: {
					default: true,
					type: "boolean"
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				mediaMaxMb: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				mediaLocalRoots: {
					type: "array",
					items: { type: "string" }
				},
				sendReadReceipts: { type: "boolean" },
				network: {
					type: "object",
					properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
					additionalProperties: false
				},
				blockStreaming: { type: "boolean" },
				groups: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							}
						},
						additionalProperties: false
					}
				},
				accounts: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							actions: {
								type: "object",
								properties: {
									reactions: {
										default: true,
										type: "boolean"
									},
									edit: {
										default: true,
										type: "boolean"
									},
									unsend: {
										default: true,
										type: "boolean"
									},
									reply: {
										default: true,
										type: "boolean"
									},
									sendWithEffect: {
										default: true,
										type: "boolean"
									},
									renameGroup: {
										default: true,
										type: "boolean"
									},
									setGroupIcon: {
										default: true,
										type: "boolean"
									},
									addParticipant: {
										default: true,
										type: "boolean"
									},
									removeParticipant: {
										default: true,
										type: "boolean"
									},
									leaveGroup: {
										default: true,
										type: "boolean"
									},
									sendAttachment: {
										default: true,
										type: "boolean"
									}
								},
								required: [
									"reactions",
									"edit",
									"unsend",
									"reply",
									"sendWithEffect",
									"renameGroup",
									"setGroupIcon",
									"addParticipant",
									"removeParticipant",
									"leaveGroup",
									"sendAttachment"
								],
								additionalProperties: false
							},
							serverUrl: { type: "string" },
							password: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							webhookPath: { type: "string" },
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							enrichGroupParticipantsFromContacts: {
								default: true,
								type: "boolean"
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							mediaMaxMb: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							mediaLocalRoots: {
								type: "array",
								items: { type: "string" }
							},
							sendReadReceipts: { type: "boolean" },
							network: {
								type: "object",
								properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
								additionalProperties: false
							},
							blockStreaming: { type: "boolean" },
							groups: {
								type: "object",
								properties: {},
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										}
									},
									additionalProperties: false
								}
							}
						},
						required: ["enrichGroupParticipantsFromContacts"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["enrichGroupParticipantsFromContacts"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "BlueBubbles",
				help: "BlueBubbles channel provider configuration used for Apple messaging bridge integrations. Keep DM policy aligned with your trusted sender model in shared deployments."
			},
			dmPolicy: {
				label: "BlueBubbles DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.bluebubbles.allowFrom=[\"*\"]."
			}
		}
	},
	{
		pluginId: "discord",
		channelId: "discord",
		label: "Discord",
		description: "very well supported right now.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				commands: {
					type: "object",
					properties: {
						native: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] },
						nativeSkills: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] }
					},
					additionalProperties: false
				},
				configWrites: { type: "boolean" },
				token: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				proxy: { type: "string" },
				allowBots: { anyOf: [{ type: "boolean" }, {
					type: "string",
					const: "mentions"
				}] },
				dangerouslyAllowNameMatching: { type: "boolean" },
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				streaming: {
					type: "string",
					enum: [
						"off",
						"partial",
						"block",
						"progress"
					]
				},
				draftChunk: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						breakPreference: { anyOf: [
							{
								type: "string",
								const: "paragraph"
							},
							{
								type: "string",
								const: "newline"
							},
							{
								type: "string",
								const: "sentence"
							}
						] }
					},
					additionalProperties: false
				},
				maxLinesPerMessage: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				retry: {
					type: "object",
					properties: {
						attempts: {
							type: "integer",
							minimum: 1,
							maximum: 9007199254740991
						},
						minDelayMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						},
						maxDelayMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						},
						jitter: {
							type: "number",
							minimum: 0,
							maximum: 1
						}
					},
					additionalProperties: false
				},
				actions: {
					type: "object",
					properties: {
						reactions: { type: "boolean" },
						stickers: { type: "boolean" },
						emojiUploads: { type: "boolean" },
						stickerUploads: { type: "boolean" },
						polls: { type: "boolean" },
						permissions: { type: "boolean" },
						messages: { type: "boolean" },
						threads: { type: "boolean" },
						pins: { type: "boolean" },
						search: { type: "boolean" },
						memberInfo: { type: "boolean" },
						roleInfo: { type: "boolean" },
						roles: { type: "boolean" },
						channelInfo: { type: "boolean" },
						voiceStatus: { type: "boolean" },
						events: { type: "boolean" },
						moderation: { type: "boolean" },
						channels: { type: "boolean" },
						presence: { type: "boolean" }
					},
					additionalProperties: false
				},
				replyToMode: { anyOf: [
					{
						type: "string",
						const: "off"
					},
					{
						type: "string",
						const: "first"
					},
					{
						type: "string",
						const: "all"
					},
					{
						type: "string",
						const: "batched"
					}
				] },
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { type: "string" }
				},
				defaultTo: { type: "string" },
				dm: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						policy: {
							type: "string",
							enum: [
								"pairing",
								"allowlist",
								"open",
								"disabled"
							]
						},
						allowFrom: {
							type: "array",
							items: { type: "string" }
						},
						groupEnabled: { type: "boolean" },
						groupChannels: {
							type: "array",
							items: { type: "string" }
						}
					},
					additionalProperties: false
				},
				guilds: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							slug: { type: "string" },
							requireMention: { type: "boolean" },
							ignoreOtherMentions: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							reactionNotifications: {
								type: "string",
								enum: [
									"off",
									"own",
									"all",
									"allowlist"
								]
							},
							users: {
								type: "array",
								items: { type: "string" }
							},
							roles: {
								type: "array",
								items: { type: "string" }
							},
							channels: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										ignoreOtherMentions: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										users: {
											type: "array",
											items: { type: "string" }
										},
										roles: {
											type: "array",
											items: { type: "string" }
										},
										systemPrompt: { type: "string" },
										includeThreadStarter: { type: "boolean" },
										autoThread: { type: "boolean" },
										autoThreadName: {
											type: "string",
											enum: ["message", "generated"]
										},
										autoArchiveDuration: { anyOf: [
											{
												type: "string",
												enum: [
													"60",
													"1440",
													"4320",
													"10080"
												]
											},
											{
												type: "number",
												const: 60
											},
											{
												type: "number",
												const: 1440
											},
											{
												type: "number",
												const: 4320
											},
											{
												type: "number",
												const: 10080
											}
										] }
									},
									additionalProperties: false
								}
							}
						},
						additionalProperties: false
					}
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				execApprovals: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						approvers: {
							type: "array",
							items: { type: "string" }
						},
						agentFilter: {
							type: "array",
							items: { type: "string" }
						},
						sessionFilter: {
							type: "array",
							items: { type: "string" }
						},
						cleanupAfterResolve: { type: "boolean" },
						target: {
							type: "string",
							enum: [
								"dm",
								"channel",
								"both"
							]
						}
					},
					additionalProperties: false
				},
				agentComponents: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				ui: {
					type: "object",
					properties: { components: {
						type: "object",
						properties: { accentColor: {
							type: "string",
							pattern: "^#?[0-9a-fA-F]{6}$"
						} },
						additionalProperties: false
					} },
					additionalProperties: false
				},
				slashCommand: {
					type: "object",
					properties: { ephemeral: { type: "boolean" } },
					additionalProperties: false
				},
				threadBindings: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						idleHours: {
							type: "number",
							minimum: 0
						},
						maxAgeHours: {
							type: "number",
							minimum: 0
						},
						spawnSubagentSessions: { type: "boolean" },
						spawnAcpSessions: { type: "boolean" }
					},
					additionalProperties: false
				},
				intents: {
					type: "object",
					properties: {
						presence: { type: "boolean" },
						guildMembers: { type: "boolean" }
					},
					additionalProperties: false
				},
				voice: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						autoJoin: {
							type: "array",
							items: {
								type: "object",
								properties: {
									guildId: {
										type: "string",
										minLength: 1
									},
									channelId: {
										type: "string",
										minLength: 1
									}
								},
								required: ["guildId", "channelId"],
								additionalProperties: false
							}
						},
						daveEncryption: { type: "boolean" },
						decryptionFailureTolerance: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						},
						tts: {
							type: "object",
							properties: {
								auto: {
									type: "string",
									enum: [
										"off",
										"always",
										"inbound",
										"tagged"
									]
								},
								enabled: { type: "boolean" },
								mode: {
									type: "string",
									enum: ["final", "all"]
								},
								provider: {
									type: "string",
									minLength: 1
								},
								summaryModel: { type: "string" },
								modelOverrides: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										allowText: { type: "boolean" },
										allowProvider: { type: "boolean" },
										allowVoice: { type: "boolean" },
										allowModelId: { type: "boolean" },
										allowVoiceSettings: { type: "boolean" },
										allowNormalization: { type: "boolean" },
										allowSeed: { type: "boolean" }
									},
									additionalProperties: false
								},
								providers: {
									type: "object",
									propertyNames: { type: "string" },
									additionalProperties: {
										type: "object",
										properties: { apiKey: { anyOf: [{ type: "string" }, { oneOf: [
											{
												type: "object",
												properties: {
													source: {
														type: "string",
														const: "env"
													},
													provider: {
														type: "string",
														pattern: "^[a-z][a-z0-9_-]{0,63}$"
													},
													id: {
														type: "string",
														pattern: "^[A-Z][A-Z0-9_]{0,127}$"
													}
												},
												required: [
													"source",
													"provider",
													"id"
												],
												additionalProperties: false
											},
											{
												type: "object",
												properties: {
													source: {
														type: "string",
														const: "file"
													},
													provider: {
														type: "string",
														pattern: "^[a-z][a-z0-9_-]{0,63}$"
													},
													id: { type: "string" }
												},
												required: [
													"source",
													"provider",
													"id"
												],
												additionalProperties: false
											},
											{
												type: "object",
												properties: {
													source: {
														type: "string",
														const: "exec"
													},
													provider: {
														type: "string",
														pattern: "^[a-z][a-z0-9_-]{0,63}$"
													},
													id: { type: "string" }
												},
												required: [
													"source",
													"provider",
													"id"
												],
												additionalProperties: false
											}
										] }] } },
										additionalProperties: { anyOf: [
											{ type: "string" },
											{ type: "number" },
											{ type: "boolean" },
											{ type: "null" },
											{
												type: "array",
												items: {}
											},
											{
												type: "object",
												propertyNames: { type: "string" },
												additionalProperties: {}
											}
										] }
									}
								},
								prefsPath: { type: "string" },
								maxTextLength: {
									type: "integer",
									minimum: 1,
									maximum: 9007199254740991
								},
								timeoutMs: {
									type: "integer",
									minimum: 1e3,
									maximum: 12e4
								}
							},
							additionalProperties: false
						}
					},
					additionalProperties: false
				},
				pluralkit: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						token: { anyOf: [{ type: "string" }, { oneOf: [
							{
								type: "object",
								properties: {
									source: {
										type: "string",
										const: "env"
									},
									provider: {
										type: "string",
										pattern: "^[a-z][a-z0-9_-]{0,63}$"
									},
									id: {
										type: "string",
										pattern: "^[A-Z][A-Z0-9_]{0,127}$"
									}
								},
								required: [
									"source",
									"provider",
									"id"
								],
								additionalProperties: false
							},
							{
								type: "object",
								properties: {
									source: {
										type: "string",
										const: "file"
									},
									provider: {
										type: "string",
										pattern: "^[a-z][a-z0-9_-]{0,63}$"
									},
									id: { type: "string" }
								},
								required: [
									"source",
									"provider",
									"id"
								],
								additionalProperties: false
							},
							{
								type: "object",
								properties: {
									source: {
										type: "string",
										const: "exec"
									},
									provider: {
										type: "string",
										pattern: "^[a-z][a-z0-9_-]{0,63}$"
									},
									id: { type: "string" }
								},
								required: [
									"source",
									"provider",
									"id"
								],
								additionalProperties: false
							}
						] }] }
					},
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				ackReaction: { type: "string" },
				ackReactionScope: {
					type: "string",
					enum: [
						"group-mentions",
						"group-all",
						"direct",
						"all",
						"off",
						"none"
					]
				},
				activity: { type: "string" },
				status: {
					type: "string",
					enum: [
						"online",
						"dnd",
						"idle",
						"invisible"
					]
				},
				autoPresence: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						intervalMs: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						minUpdateIntervalMs: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						healthyText: { type: "string" },
						degradedText: { type: "string" },
						exhaustedText: { type: "string" }
					},
					additionalProperties: false
				},
				activityType: { anyOf: [
					{
						type: "number",
						const: 0
					},
					{
						type: "number",
						const: 1
					},
					{
						type: "number",
						const: 2
					},
					{
						type: "number",
						const: 3
					},
					{
						type: "number",
						const: 4
					},
					{
						type: "number",
						const: 5
					}
				] },
				activityUrl: {
					type: "string",
					format: "uri"
				},
				inboundWorker: {
					type: "object",
					properties: { runTimeoutMs: {
						type: "integer",
						minimum: 0,
						maximum: 9007199254740991
					} },
					additionalProperties: false
				},
				eventQueue: {
					type: "object",
					properties: {
						listenerTimeout: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxQueueSize: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxConcurrency: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							commands: {
								type: "object",
								properties: {
									native: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] },
									nativeSkills: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] }
								},
								additionalProperties: false
							},
							configWrites: { type: "boolean" },
							token: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							proxy: { type: "string" },
							allowBots: { anyOf: [{ type: "boolean" }, {
								type: "string",
								const: "mentions"
							}] },
							dangerouslyAllowNameMatching: { type: "boolean" },
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							streaming: {
								type: "string",
								enum: [
									"off",
									"partial",
									"block",
									"progress"
								]
							},
							draftChunk: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									breakPreference: { anyOf: [
										{
											type: "string",
											const: "paragraph"
										},
										{
											type: "string",
											const: "newline"
										},
										{
											type: "string",
											const: "sentence"
										}
									] }
								},
								additionalProperties: false
							},
							maxLinesPerMessage: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							},
							retry: {
								type: "object",
								properties: {
									attempts: {
										type: "integer",
										minimum: 1,
										maximum: 9007199254740991
									},
									minDelayMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									},
									maxDelayMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									},
									jitter: {
										type: "number",
										minimum: 0,
										maximum: 1
									}
								},
								additionalProperties: false
							},
							actions: {
								type: "object",
								properties: {
									reactions: { type: "boolean" },
									stickers: { type: "boolean" },
									emojiUploads: { type: "boolean" },
									stickerUploads: { type: "boolean" },
									polls: { type: "boolean" },
									permissions: { type: "boolean" },
									messages: { type: "boolean" },
									threads: { type: "boolean" },
									pins: { type: "boolean" },
									search: { type: "boolean" },
									memberInfo: { type: "boolean" },
									roleInfo: { type: "boolean" },
									roles: { type: "boolean" },
									channelInfo: { type: "boolean" },
									voiceStatus: { type: "boolean" },
									events: { type: "boolean" },
									moderation: { type: "boolean" },
									channels: { type: "boolean" },
									presence: { type: "boolean" }
								},
								additionalProperties: false
							},
							replyToMode: { anyOf: [
								{
									type: "string",
									const: "off"
								},
								{
									type: "string",
									const: "first"
								},
								{
									type: "string",
									const: "all"
								},
								{
									type: "string",
									const: "batched"
								}
							] },
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { type: "string" }
							},
							defaultTo: { type: "string" },
							dm: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									policy: {
										type: "string",
										enum: [
											"pairing",
											"allowlist",
											"open",
											"disabled"
										]
									},
									allowFrom: {
										type: "array",
										items: { type: "string" }
									},
									groupEnabled: { type: "boolean" },
									groupChannels: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							guilds: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										slug: { type: "string" },
										requireMention: { type: "boolean" },
										ignoreOtherMentions: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										reactionNotifications: {
											type: "string",
											enum: [
												"off",
												"own",
												"all",
												"allowlist"
											]
										},
										users: {
											type: "array",
											items: { type: "string" }
										},
										roles: {
											type: "array",
											items: { type: "string" }
										},
										channels: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													requireMention: { type: "boolean" },
													ignoreOtherMentions: { type: "boolean" },
													tools: {
														type: "object",
														properties: {
															allow: {
																type: "array",
																items: { type: "string" }
															},
															alsoAllow: {
																type: "array",
																items: { type: "string" }
															},
															deny: {
																type: "array",
																items: { type: "string" }
															}
														},
														additionalProperties: false
													},
													toolsBySender: {
														type: "object",
														propertyNames: { type: "string" },
														additionalProperties: {
															type: "object",
															properties: {
																allow: {
																	type: "array",
																	items: { type: "string" }
																},
																alsoAllow: {
																	type: "array",
																	items: { type: "string" }
																},
																deny: {
																	type: "array",
																	items: { type: "string" }
																}
															},
															additionalProperties: false
														}
													},
													skills: {
														type: "array",
														items: { type: "string" }
													},
													enabled: { type: "boolean" },
													users: {
														type: "array",
														items: { type: "string" }
													},
													roles: {
														type: "array",
														items: { type: "string" }
													},
													systemPrompt: { type: "string" },
													includeThreadStarter: { type: "boolean" },
													autoThread: { type: "boolean" },
													autoThreadName: {
														type: "string",
														enum: ["message", "generated"]
													},
													autoArchiveDuration: { anyOf: [
														{
															type: "string",
															enum: [
																"60",
																"1440",
																"4320",
																"10080"
															]
														},
														{
															type: "number",
															const: 60
														},
														{
															type: "number",
															const: 1440
														},
														{
															type: "number",
															const: 4320
														},
														{
															type: "number",
															const: 10080
														}
													] }
												},
												additionalProperties: false
											}
										}
									},
									additionalProperties: false
								}
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							execApprovals: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									approvers: {
										type: "array",
										items: { type: "string" }
									},
									agentFilter: {
										type: "array",
										items: { type: "string" }
									},
									sessionFilter: {
										type: "array",
										items: { type: "string" }
									},
									cleanupAfterResolve: { type: "boolean" },
									target: {
										type: "string",
										enum: [
											"dm",
											"channel",
											"both"
										]
									}
								},
								additionalProperties: false
							},
							agentComponents: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							ui: {
								type: "object",
								properties: { components: {
									type: "object",
									properties: { accentColor: {
										type: "string",
										pattern: "^#?[0-9a-fA-F]{6}$"
									} },
									additionalProperties: false
								} },
								additionalProperties: false
							},
							slashCommand: {
								type: "object",
								properties: { ephemeral: { type: "boolean" } },
								additionalProperties: false
							},
							threadBindings: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									idleHours: {
										type: "number",
										minimum: 0
									},
									maxAgeHours: {
										type: "number",
										minimum: 0
									},
									spawnSubagentSessions: { type: "boolean" },
									spawnAcpSessions: { type: "boolean" }
								},
								additionalProperties: false
							},
							intents: {
								type: "object",
								properties: {
									presence: { type: "boolean" },
									guildMembers: { type: "boolean" }
								},
								additionalProperties: false
							},
							voice: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									autoJoin: {
										type: "array",
										items: {
											type: "object",
											properties: {
												guildId: {
													type: "string",
													minLength: 1
												},
												channelId: {
													type: "string",
													minLength: 1
												}
											},
											required: ["guildId", "channelId"],
											additionalProperties: false
										}
									},
									daveEncryption: { type: "boolean" },
									decryptionFailureTolerance: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									},
									tts: {
										type: "object",
										properties: {
											auto: {
												type: "string",
												enum: [
													"off",
													"always",
													"inbound",
													"tagged"
												]
											},
											enabled: { type: "boolean" },
											mode: {
												type: "string",
												enum: ["final", "all"]
											},
											provider: {
												type: "string",
												minLength: 1
											},
											summaryModel: { type: "string" },
											modelOverrides: {
												type: "object",
												properties: {
													enabled: { type: "boolean" },
													allowText: { type: "boolean" },
													allowProvider: { type: "boolean" },
													allowVoice: { type: "boolean" },
													allowModelId: { type: "boolean" },
													allowVoiceSettings: { type: "boolean" },
													allowNormalization: { type: "boolean" },
													allowSeed: { type: "boolean" }
												},
												additionalProperties: false
											},
											providers: {
												type: "object",
												propertyNames: { type: "string" },
												additionalProperties: {
													type: "object",
													properties: { apiKey: { anyOf: [{ type: "string" }, { oneOf: [
														{
															type: "object",
															properties: {
																source: {
																	type: "string",
																	const: "env"
																},
																provider: {
																	type: "string",
																	pattern: "^[a-z][a-z0-9_-]{0,63}$"
																},
																id: {
																	type: "string",
																	pattern: "^[A-Z][A-Z0-9_]{0,127}$"
																}
															},
															required: [
																"source",
																"provider",
																"id"
															],
															additionalProperties: false
														},
														{
															type: "object",
															properties: {
																source: {
																	type: "string",
																	const: "file"
																},
																provider: {
																	type: "string",
																	pattern: "^[a-z][a-z0-9_-]{0,63}$"
																},
																id: { type: "string" }
															},
															required: [
																"source",
																"provider",
																"id"
															],
															additionalProperties: false
														},
														{
															type: "object",
															properties: {
																source: {
																	type: "string",
																	const: "exec"
																},
																provider: {
																	type: "string",
																	pattern: "^[a-z][a-z0-9_-]{0,63}$"
																},
																id: { type: "string" }
															},
															required: [
																"source",
																"provider",
																"id"
															],
															additionalProperties: false
														}
													] }] } },
													additionalProperties: { anyOf: [
														{ type: "string" },
														{ type: "number" },
														{ type: "boolean" },
														{ type: "null" },
														{
															type: "array",
															items: {}
														},
														{
															type: "object",
															propertyNames: { type: "string" },
															additionalProperties: {}
														}
													] }
												}
											},
											prefsPath: { type: "string" },
											maxTextLength: {
												type: "integer",
												minimum: 1,
												maximum: 9007199254740991
											},
											timeoutMs: {
												type: "integer",
												minimum: 1e3,
												maximum: 12e4
											}
										},
										additionalProperties: false
									}
								},
								additionalProperties: false
							},
							pluralkit: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									token: { anyOf: [{ type: "string" }, { oneOf: [
										{
											type: "object",
											properties: {
												source: {
													type: "string",
													const: "env"
												},
												provider: {
													type: "string",
													pattern: "^[a-z][a-z0-9_-]{0,63}$"
												},
												id: {
													type: "string",
													pattern: "^[A-Z][A-Z0-9_]{0,127}$"
												}
											},
											required: [
												"source",
												"provider",
												"id"
											],
											additionalProperties: false
										},
										{
											type: "object",
											properties: {
												source: {
													type: "string",
													const: "file"
												},
												provider: {
													type: "string",
													pattern: "^[a-z][a-z0-9_-]{0,63}$"
												},
												id: { type: "string" }
											},
											required: [
												"source",
												"provider",
												"id"
											],
											additionalProperties: false
										},
										{
											type: "object",
											properties: {
												source: {
													type: "string",
													const: "exec"
												},
												provider: {
													type: "string",
													pattern: "^[a-z][a-z0-9_-]{0,63}$"
												},
												id: { type: "string" }
											},
											required: [
												"source",
												"provider",
												"id"
											],
											additionalProperties: false
										}
									] }] }
								},
								additionalProperties: false
							},
							responsePrefix: { type: "string" },
							ackReaction: { type: "string" },
							ackReactionScope: {
								type: "string",
								enum: [
									"group-mentions",
									"group-all",
									"direct",
									"all",
									"off",
									"none"
								]
							},
							activity: { type: "string" },
							status: {
								type: "string",
								enum: [
									"online",
									"dnd",
									"idle",
									"invisible"
								]
							},
							autoPresence: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									intervalMs: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									minUpdateIntervalMs: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									healthyText: { type: "string" },
									degradedText: { type: "string" },
									exhaustedText: { type: "string" }
								},
								additionalProperties: false
							},
							activityType: { anyOf: [
								{
									type: "number",
									const: 0
								},
								{
									type: "number",
									const: 1
								},
								{
									type: "number",
									const: 2
								},
								{
									type: "number",
									const: 3
								},
								{
									type: "number",
									const: 4
								},
								{
									type: "number",
									const: 5
								}
							] },
							activityUrl: {
								type: "string",
								format: "uri"
							},
							inboundWorker: {
								type: "object",
								properties: { runTimeoutMs: {
									type: "integer",
									minimum: 0,
									maximum: 9007199254740991
								} },
								additionalProperties: false
							},
							eventQueue: {
								type: "object",
								properties: {
									listenerTimeout: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxQueueSize: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxConcurrency: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							}
						},
						required: ["groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "Discord",
				help: "Discord channel provider configuration for bot auth, retry policy, streaming, thread bindings, and optional voice capabilities. Keep privileged intents and advanced features disabled unless needed."
			},
			dmPolicy: {
				label: "Discord DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.discord.allowFrom=[\"*\"]."
			},
			"dm.policy": {
				label: "Discord DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.discord.allowFrom=[\"*\"] (legacy: channels.discord.dm.allowFrom)."
			},
			configWrites: {
				label: "Discord Config Writes",
				help: "Allow Discord to write config in response to channel events/commands (default: true)."
			},
			proxy: {
				label: "Discord Proxy URL",
				help: "Proxy URL for Discord gateway + API requests (app-id lookup and allowlist resolution). Set per account via channels.discord.accounts.<id>.proxy."
			},
			"commands.native": {
				label: "Discord Native Commands",
				help: "Override native commands for Discord (bool or \"auto\")."
			},
			"commands.nativeSkills": {
				label: "Discord Native Skill Commands",
				help: "Override native skill commands for Discord (bool or \"auto\")."
			},
			streaming: {
				label: "Discord Streaming Mode",
				help: "Unified Discord stream preview mode: \"off\" | \"partial\" | \"block\" | \"progress\". \"progress\" maps to \"partial\" on Discord. Legacy boolean/streamMode keys are auto-mapped."
			},
			"draftChunk.minChars": {
				label: "Discord Draft Chunk Min Chars",
				help: "Minimum chars before emitting a Discord stream preview update when channels.discord.streaming=\"block\" (default: 200)."
			},
			"draftChunk.maxChars": {
				label: "Discord Draft Chunk Max Chars",
				help: "Target max size for a Discord stream preview chunk when channels.discord.streaming=\"block\" (default: 800; clamped to channels.discord.textChunkLimit)."
			},
			"draftChunk.breakPreference": {
				label: "Discord Draft Chunk Break Preference",
				help: "Preferred breakpoints for Discord draft chunks (paragraph | newline | sentence). Default: paragraph."
			},
			"retry.attempts": {
				label: "Discord Retry Attempts",
				help: "Max retry attempts for outbound Discord API calls (default: 3)."
			},
			"retry.minDelayMs": {
				label: "Discord Retry Min Delay (ms)",
				help: "Minimum retry delay in ms for Discord outbound calls."
			},
			"retry.maxDelayMs": {
				label: "Discord Retry Max Delay (ms)",
				help: "Maximum retry delay cap in ms for Discord outbound calls."
			},
			"retry.jitter": {
				label: "Discord Retry Jitter",
				help: "Jitter factor (0-1) applied to Discord retry delays."
			},
			maxLinesPerMessage: {
				label: "Discord Max Lines Per Message",
				help: "Soft max line count per Discord message (default: 17)."
			},
			"inboundWorker.runTimeoutMs": {
				label: "Discord Inbound Worker Timeout (ms)",
				help: "Optional queued Discord inbound worker timeout in ms. This is separate from Carbon listener timeouts; defaults to 1800000 and can be disabled with 0. Set per account via channels.discord.accounts.<id>.inboundWorker.runTimeoutMs."
			},
			"eventQueue.listenerTimeout": {
				label: "Discord EventQueue Listener Timeout (ms)",
				help: "Canonical Discord listener timeout control in ms for gateway normalization/enqueue handlers. Default is 120000 in OpenClaw; set per account via channels.discord.accounts.<id>.eventQueue.listenerTimeout."
			},
			"eventQueue.maxQueueSize": {
				label: "Discord EventQueue Max Queue Size",
				help: "Optional Discord EventQueue capacity override (max queued events before backpressure). Set per account via channels.discord.accounts.<id>.eventQueue.maxQueueSize."
			},
			"eventQueue.maxConcurrency": {
				label: "Discord EventQueue Max Concurrency",
				help: "Optional Discord EventQueue concurrency override (max concurrent handler executions). Set per account via channels.discord.accounts.<id>.eventQueue.maxConcurrency."
			},
			"threadBindings.enabled": {
				label: "Discord Thread Binding Enabled",
				help: "Enable Discord thread binding features (/focus, bound-thread routing/delivery, and thread-bound subagent sessions). Overrides session.threadBindings.enabled when set."
			},
			"threadBindings.idleHours": {
				label: "Discord Thread Binding Idle Timeout (hours)",
				help: "Inactivity window in hours for Discord thread-bound sessions (/focus and spawned thread sessions). Set 0 to disable idle auto-unfocus (default: 24). Overrides session.threadBindings.idleHours when set."
			},
			"threadBindings.maxAgeHours": {
				label: "Discord Thread Binding Max Age (hours)",
				help: "Optional hard max age in hours for Discord thread-bound sessions. Set 0 to disable hard cap (default: 0). Overrides session.threadBindings.maxAgeHours when set."
			},
			"threadBindings.spawnSubagentSessions": {
				label: "Discord Thread-Bound Subagent Spawn",
				help: "Allow subagent spawns with thread=true to auto-create and bind Discord threads (default: false; opt-in). Set true to enable thread-bound subagent spawns for this account/channel."
			},
			"threadBindings.spawnAcpSessions": {
				label: "Discord Thread-Bound ACP Spawn",
				help: "Allow /acp spawn to auto-create and bind Discord threads for ACP sessions (default: false; opt-in). Set true to enable thread-bound ACP spawns for this account/channel."
			},
			"ui.components.accentColor": {
				label: "Discord Component Accent Color",
				help: "Accent color for Discord component containers (hex). Set per account via channels.discord.accounts.<id>.ui.components.accentColor."
			},
			"intents.presence": {
				label: "Discord Presence Intent",
				help: "Enable the Guild Presences privileged intent. Must also be enabled in the Discord Developer Portal. Allows tracking user activities (e.g. Spotify). Default: false."
			},
			"intents.guildMembers": {
				label: "Discord Guild Members Intent",
				help: "Enable the Guild Members privileged intent. Must also be enabled in the Discord Developer Portal. Default: false."
			},
			"voice.enabled": {
				label: "Discord Voice Enabled",
				help: "Enable Discord voice channel conversations (default: true). Omit channels.discord.voice to keep voice support disabled for the account."
			},
			"voice.autoJoin": {
				label: "Discord Voice Auto-Join",
				help: "Voice channels to auto-join on startup (list of guildId/channelId entries)."
			},
			"voice.daveEncryption": {
				label: "Discord Voice DAVE Encryption",
				help: "Toggle DAVE end-to-end encryption for Discord voice joins (default: true in @discordjs/voice; Discord may require this)."
			},
			"voice.decryptionFailureTolerance": {
				label: "Discord Voice Decrypt Failure Tolerance",
				help: "Consecutive decrypt failures before DAVE attempts session recovery (passed to @discordjs/voice; default: 24)."
			},
			"voice.tts": {
				label: "Discord Voice Text-to-Speech",
				help: "Optional TTS overrides for Discord voice playback (merged with messages.tts)."
			},
			"pluralkit.enabled": {
				label: "Discord PluralKit Enabled",
				help: "Resolve PluralKit proxied messages and treat system members as distinct senders."
			},
			"pluralkit.token": {
				label: "Discord PluralKit Token",
				help: "Optional PluralKit token for resolving private systems or members."
			},
			activity: {
				label: "Discord Presence Activity",
				help: "Discord presence activity text (defaults to custom status)."
			},
			status: {
				label: "Discord Presence Status",
				help: "Discord presence status (online, dnd, idle, invisible)."
			},
			"autoPresence.enabled": {
				label: "Discord Auto Presence Enabled",
				help: "Enable automatic Discord bot presence updates based on runtime/model availability signals. When enabled: healthy=>online, degraded/unknown=>idle, exhausted/unavailable=>dnd."
			},
			"autoPresence.intervalMs": {
				label: "Discord Auto Presence Check Interval (ms)",
				help: "How often to evaluate Discord auto-presence state in milliseconds (default: 30000)."
			},
			"autoPresence.minUpdateIntervalMs": {
				label: "Discord Auto Presence Min Update Interval (ms)",
				help: "Minimum time between actual Discord presence update calls in milliseconds (default: 15000). Prevents status spam on noisy state changes."
			},
			"autoPresence.healthyText": {
				label: "Discord Auto Presence Healthy Text",
				help: "Optional custom status text while runtime is healthy (online). If omitted, falls back to static channels.discord.activity when set."
			},
			"autoPresence.degradedText": {
				label: "Discord Auto Presence Degraded Text",
				help: "Optional custom status text while runtime/model availability is degraded or unknown (idle)."
			},
			"autoPresence.exhaustedText": {
				label: "Discord Auto Presence Exhausted Text",
				help: "Optional custom status text while runtime detects exhausted/unavailable model quota (dnd). Supports {reason} template placeholder."
			},
			activityType: {
				label: "Discord Presence Activity Type",
				help: "Discord presence activity type (0=Playing,1=Streaming,2=Listening,3=Watching,4=Custom,5=Competing)."
			},
			activityUrl: {
				label: "Discord Presence Activity URL",
				help: "Discord presence streaming URL (required for activityType=1)."
			},
			allowBots: {
				label: "Discord Allow Bot Messages",
				help: "Allow bot-authored messages to trigger Discord replies (default: false). Set \"mentions\" to only accept bot messages that mention the bot."
			},
			token: {
				label: "Discord Bot Token",
				help: "Discord bot token used for gateway and REST API authentication for this provider account. Keep this secret out of committed config and rotate immediately after any leak.",
				sensitive: true
			}
		}
	},
	{
		pluginId: "feishu",
		channelId: "feishu",
		label: "Feishu",
		description: "飞书/Lark enterprise messaging with doc/wiki/drive tools.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				enabled: { type: "boolean" },
				defaultAccount: { type: "string" },
				appId: { type: "string" },
				appSecret: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				encryptKey: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				verificationToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				domain: {
					default: "feishu",
					anyOf: [{
						type: "string",
						enum: ["feishu", "lark"]
					}, {
						type: "string",
						format: "uri",
						pattern: "^https:\\/\\/.*"
					}]
				},
				connectionMode: {
					default: "websocket",
					type: "string",
					enum: ["websocket", "webhook"]
				},
				webhookPath: {
					default: "/feishu/events",
					type: "string"
				},
				webhookHost: { type: "string" },
				webhookPort: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: {
						mode: {
							type: "string",
							enum: [
								"native",
								"escape",
								"strip"
							]
						},
						tableMode: {
							type: "string",
							enum: [
								"native",
								"ascii",
								"simple"
							]
						}
					},
					additionalProperties: false
				},
				configWrites: { type: "boolean" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"open",
						"pairing",
						"allowlist"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					anyOf: [{
						type: "string",
						enum: [
							"open",
							"allowlist",
							"disabled"
						]
					}, {}]
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupSenderAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				requireMention: { type: "boolean" },
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" },
							groupSessionScope: {
								type: "string",
								enum: [
									"group",
									"group_sender",
									"group_topic",
									"group_topic_sender"
								]
							},
							topicSessionMode: {
								type: "string",
								enum: ["disabled", "enabled"]
							},
							replyInThread: {
								type: "string",
								enum: ["disabled", "enabled"]
							}
						},
						additionalProperties: false
					}
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						minDelayMs: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxDelayMs: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				httpTimeoutMs: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 3e5
				},
				heartbeat: {
					type: "object",
					properties: {
						visibility: {
							type: "string",
							enum: ["visible", "hidden"]
						},
						intervalMs: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				renderMode: {
					type: "string",
					enum: [
						"auto",
						"raw",
						"card"
					]
				},
				streaming: { type: "boolean" },
				tools: {
					type: "object",
					properties: {
						doc: { type: "boolean" },
						chat: { type: "boolean" },
						wiki: { type: "boolean" },
						drive: { type: "boolean" },
						perm: { type: "boolean" },
						scopes: { type: "boolean" }
					},
					additionalProperties: false
				},
				actions: {
					type: "object",
					properties: { reactions: { type: "boolean" } },
					additionalProperties: false
				},
				replyInThread: {
					type: "string",
					enum: ["disabled", "enabled"]
				},
				reactionNotifications: {
					default: "own",
					type: "string",
					enum: [
						"off",
						"own",
						"all"
					]
				},
				typingIndicator: {
					default: true,
					type: "boolean"
				},
				resolveSenderNames: {
					default: true,
					type: "boolean"
				},
				groupSessionScope: {
					type: "string",
					enum: [
						"group",
						"group_sender",
						"group_topic",
						"group_topic_sender"
					]
				},
				topicSessionMode: {
					type: "string",
					enum: ["disabled", "enabled"]
				},
				dynamicAgentCreation: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						workspaceTemplate: { type: "string" },
						agentDirTemplate: { type: "string" },
						maxAgents: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							name: { type: "string" },
							appId: { type: "string" },
							appSecret: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							encryptKey: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							verificationToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							domain: { anyOf: [{
								type: "string",
								enum: ["feishu", "lark"]
							}, {
								type: "string",
								format: "uri",
								pattern: "^https:\\/\\/.*"
							}] },
							connectionMode: {
								type: "string",
								enum: ["websocket", "webhook"]
							},
							webhookPath: { type: "string" },
							webhookHost: { type: "string" },
							webhookPort: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: {
									mode: {
										type: "string",
										enum: [
											"native",
											"escape",
											"strip"
										]
									},
									tableMode: {
										type: "string",
										enum: [
											"native",
											"ascii",
											"simple"
										]
									}
								},
								additionalProperties: false
							},
							configWrites: { type: "boolean" },
							dmPolicy: {
								type: "string",
								enum: [
									"open",
									"pairing",
									"allowlist"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: { anyOf: [{
								type: "string",
								enum: [
									"open",
									"allowlist",
									"disabled"
								]
							}, {}] },
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupSenderAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							requireMention: { type: "boolean" },
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" },
										groupSessionScope: {
											type: "string",
											enum: [
												"group",
												"group_sender",
												"group_topic",
												"group_topic_sender"
											]
										},
										topicSessionMode: {
											type: "string",
											enum: ["disabled", "enabled"]
										},
										replyInThread: {
											type: "string",
											enum: ["disabled", "enabled"]
										}
									},
									additionalProperties: false
								}
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										systemPrompt: { type: "string" }
									},
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									minDelayMs: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxDelayMs: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							},
							httpTimeoutMs: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 3e5
							},
							heartbeat: {
								type: "object",
								properties: {
									visibility: {
										type: "string",
										enum: ["visible", "hidden"]
									},
									intervalMs: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							renderMode: {
								type: "string",
								enum: [
									"auto",
									"raw",
									"card"
								]
							},
							streaming: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									doc: { type: "boolean" },
									chat: { type: "boolean" },
									wiki: { type: "boolean" },
									drive: { type: "boolean" },
									perm: { type: "boolean" },
									scopes: { type: "boolean" }
								},
								additionalProperties: false
							},
							actions: {
								type: "object",
								properties: { reactions: { type: "boolean" } },
								additionalProperties: false
							},
							replyInThread: {
								type: "string",
								enum: ["disabled", "enabled"]
							},
							reactionNotifications: {
								type: "string",
								enum: [
									"off",
									"own",
									"all"
								]
							},
							typingIndicator: { type: "boolean" },
							resolveSenderNames: { type: "boolean" },
							groupSessionScope: {
								type: "string",
								enum: [
									"group",
									"group_sender",
									"group_topic",
									"group_topic_sender"
								]
							},
							topicSessionMode: {
								type: "string",
								enum: ["disabled", "enabled"]
							}
						},
						additionalProperties: false
					}
				}
			},
			required: [
				"domain",
				"connectionMode",
				"webhookPath",
				"dmPolicy",
				"groupPolicy",
				"reactionNotifications",
				"typingIndicator",
				"resolveSenderNames"
			],
			additionalProperties: false
		}
	},
	{
		pluginId: "googlechat",
		channelId: "googlechat",
		label: "Google Chat",
		description: "Google Workspace Chat app with HTTP webhook.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				enabled: { type: "boolean" },
				configWrites: { type: "boolean" },
				allowBots: { type: "boolean" },
				dangerouslyAllowNameMatching: { type: "boolean" },
				requireMention: { type: "boolean" },
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							requireMention: { type: "boolean" },
							users: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				defaultTo: { type: "string" },
				serviceAccount: { anyOf: [
					{ type: "string" },
					{
						type: "object",
						propertyNames: { type: "string" },
						additionalProperties: {}
					},
					{ oneOf: [
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "env"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: {
									type: "string",
									pattern: "^[A-Z][A-Z0-9_]{0,127}$"
								}
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						},
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "file"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: { type: "string" }
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						},
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "exec"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: { type: "string" }
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						}
					] }
				] },
				serviceAccountRef: { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] },
				serviceAccountFile: { type: "string" },
				audienceType: {
					type: "string",
					enum: ["app-url", "project-number"]
				},
				audience: { type: "string" },
				appPrincipal: { type: "string" },
				webhookPath: { type: "string" },
				webhookUrl: { type: "string" },
				botUser: { type: "string" },
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				replyToMode: { anyOf: [
					{
						type: "string",
						const: "off"
					},
					{
						type: "string",
						const: "first"
					},
					{
						type: "string",
						const: "all"
					},
					{
						type: "string",
						const: "batched"
					}
				] },
				actions: {
					type: "object",
					properties: { reactions: { type: "boolean" } },
					additionalProperties: false
				},
				dm: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						policy: {
							default: "pairing",
							type: "string",
							enum: [
								"pairing",
								"allowlist",
								"open",
								"disabled"
							]
						},
						allowFrom: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						}
					},
					required: ["policy"],
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				typingIndicator: {
					type: "string",
					enum: [
						"none",
						"message",
						"reaction"
					]
				},
				responsePrefix: { type: "string" },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							configWrites: { type: "boolean" },
							allowBots: { type: "boolean" },
							dangerouslyAllowNameMatching: { type: "boolean" },
							requireMention: { type: "boolean" },
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										requireMention: { type: "boolean" },
										users: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" }
									},
									additionalProperties: false
								}
							},
							defaultTo: { type: "string" },
							serviceAccount: { anyOf: [
								{ type: "string" },
								{
									type: "object",
									propertyNames: { type: "string" },
									additionalProperties: {}
								},
								{ oneOf: [
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "env"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: {
												type: "string",
												pattern: "^[A-Z][A-Z0-9_]{0,127}$"
											}
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									},
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "file"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: { type: "string" }
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									},
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "exec"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: { type: "string" }
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									}
								] }
							] },
							serviceAccountRef: { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] },
							serviceAccountFile: { type: "string" },
							audienceType: {
								type: "string",
								enum: ["app-url", "project-number"]
							},
							audience: { type: "string" },
							appPrincipal: { type: "string" },
							webhookPath: { type: "string" },
							webhookUrl: { type: "string" },
							botUser: { type: "string" },
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							},
							replyToMode: { anyOf: [
								{
									type: "string",
									const: "off"
								},
								{
									type: "string",
									const: "first"
								},
								{
									type: "string",
									const: "all"
								},
								{
									type: "string",
									const: "batched"
								}
							] },
							actions: {
								type: "object",
								properties: { reactions: { type: "boolean" } },
								additionalProperties: false
							},
							dm: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									policy: {
										default: "pairing",
										type: "string",
										enum: [
											"pairing",
											"allowlist",
											"open",
											"disabled"
										]
									},
									allowFrom: {
										type: "array",
										items: { anyOf: [{ type: "string" }, { type: "number" }] }
									}
								},
								required: ["policy"],
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							typingIndicator: {
								type: "string",
								enum: [
									"none",
									"message",
									"reaction"
								]
							},
							responsePrefix: { type: "string" }
						},
						required: ["groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["groupPolicy"],
			additionalProperties: false
		}
	},
	{
		pluginId: "imessage",
		channelId: "imessage",
		label: "iMessage",
		description: "this is still a work in progress.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				configWrites: { type: "boolean" },
				cliPath: { type: "string" },
				dbPath: { type: "string" },
				remoteHost: { type: "string" },
				service: { anyOf: [
					{
						type: "string",
						const: "imessage"
					},
					{
						type: "string",
						const: "sms"
					},
					{
						type: "string",
						const: "auto"
					}
				] },
				region: { type: "string" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				defaultTo: { type: "string" },
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				includeAttachments: { type: "boolean" },
				attachmentRoots: {
					type: "array",
					items: { type: "string" }
				},
				remoteAttachmentRoots: {
					type: "array",
					items: { type: "string" }
				},
				mediaMaxMb: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							}
						},
						additionalProperties: false
					}
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							configWrites: { type: "boolean" },
							cliPath: { type: "string" },
							dbPath: { type: "string" },
							remoteHost: { type: "string" },
							service: { anyOf: [
								{
									type: "string",
									const: "imessage"
								},
								{
									type: "string",
									const: "sms"
								},
								{
									type: "string",
									const: "auto"
								}
							] },
							region: { type: "string" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							defaultTo: { type: "string" },
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							includeAttachments: { type: "boolean" },
							attachmentRoots: {
								type: "array",
								items: { type: "string" }
							},
							remoteAttachmentRoots: {
								type: "array",
								items: { type: "string" }
							},
							mediaMaxMb: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										}
									},
									additionalProperties: false
								}
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							responsePrefix: { type: "string" }
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "iMessage",
				help: "iMessage channel provider configuration for CLI integration and DM access policy handling. Use explicit CLI paths when runtime environments have non-standard binary locations."
			},
			dmPolicy: {
				label: "iMessage DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.imessage.allowFrom=[\"*\"]."
			},
			configWrites: {
				label: "iMessage Config Writes",
				help: "Allow iMessage to write config in response to channel events/commands (default: true)."
			},
			cliPath: {
				label: "iMessage CLI Path",
				help: "Filesystem path to the iMessage bridge CLI binary used for send/receive operations. Set explicitly when the binary is not on PATH in service runtime environments."
			}
		}
	},
	{
		pluginId: "irc",
		channelId: "irc",
		label: "IRC",
		description: "classic IRC networks with DM/channel routing and pairing controls.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				dangerouslyAllowNameMatching: { type: "boolean" },
				host: { type: "string" },
				port: {
					type: "integer",
					minimum: 1,
					maximum: 65535
				},
				tls: { type: "boolean" },
				nick: { type: "string" },
				username: { type: "string" },
				realname: { type: "string" },
				password: { type: "string" },
				passwordFile: { type: "string" },
				nickserv: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						service: { type: "string" },
						password: { type: "string" },
						passwordFile: { type: "string" },
						register: { type: "boolean" },
						registerEmail: { type: "string" }
					},
					additionalProperties: false
				},
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				channels: {
					type: "array",
					items: { type: "string" }
				},
				mentionPatterns: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							dangerouslyAllowNameMatching: { type: "boolean" },
							host: { type: "string" },
							port: {
								type: "integer",
								minimum: 1,
								maximum: 65535
							},
							tls: { type: "boolean" },
							nick: { type: "string" },
							username: { type: "string" },
							realname: { type: "string" },
							password: { type: "string" },
							passwordFile: { type: "string" },
							nickserv: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									service: { type: "string" },
									password: { type: "string" },
									passwordFile: { type: "string" },
									register: { type: "boolean" },
									registerEmail: { type: "string" }
								},
								additionalProperties: false
							},
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" }
									},
									additionalProperties: false
								}
							},
							channels: {
								type: "array",
								items: { type: "string" }
							},
							mentionPatterns: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							responsePrefix: { type: "string" },
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							}
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "IRC",
				help: "IRC channel provider configuration and compatibility settings for classic IRC transport workflows. Use this section when bridging legacy chat infrastructure into OpenClaw."
			},
			dmPolicy: {
				label: "IRC DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.irc.allowFrom=[\"*\"]."
			},
			"nickserv.enabled": {
				label: "IRC NickServ Enabled",
				help: "Enable NickServ identify/register after connect (defaults to enabled when password is configured)."
			},
			"nickserv.service": {
				label: "IRC NickServ Service",
				help: "NickServ service nick (default: NickServ)."
			},
			"nickserv.password": {
				label: "IRC NickServ Password",
				help: "NickServ password used for IDENTIFY/REGISTER (sensitive)."
			},
			"nickserv.passwordFile": {
				label: "IRC NickServ Password File",
				help: "Optional file path containing NickServ password."
			},
			"nickserv.register": {
				label: "IRC NickServ Register",
				help: "If true, send NickServ REGISTER on every connect. Use once for initial registration, then disable."
			},
			"nickserv.registerEmail": {
				label: "IRC NickServ Register Email",
				help: "Email used with NickServ REGISTER (required when register=true)."
			},
			configWrites: {
				label: "IRC Config Writes",
				help: "Allow IRC to write config in response to channel events/commands (default: true)."
			}
		}
	},
	{
		pluginId: "line",
		channelId: "line",
		label: "LINE",
		description: "LINE Messaging API webhook bot.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				enabled: { type: "boolean" },
				channelAccessToken: { type: "string" },
				channelSecret: { type: "string" },
				tokenFile: { type: "string" },
				secretFile: { type: "string" },
				name: { type: "string" },
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"open",
						"allowlist",
						"pairing",
						"disabled"
					]
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"allowlist",
						"disabled"
					]
				},
				responsePrefix: { type: "string" },
				mediaMaxMb: { type: "number" },
				webhookPath: { type: "string" },
				threadBindings: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						idleHours: { type: "number" },
						maxAgeHours: { type: "number" },
						spawnSubagentSessions: { type: "boolean" },
						spawnAcpSessions: { type: "boolean" }
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							channelAccessToken: { type: "string" },
							channelSecret: { type: "string" },
							tokenFile: { type: "string" },
							secretFile: { type: "string" },
							name: { type: "string" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"open",
									"allowlist",
									"pairing",
									"disabled"
								]
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"allowlist",
									"disabled"
								]
							},
							responsePrefix: { type: "string" },
							mediaMaxMb: { type: "number" },
							webhookPath: { type: "string" },
							threadBindings: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									idleHours: { type: "number" },
									maxAgeHours: { type: "number" },
									spawnSubagentSessions: { type: "boolean" },
									spawnAcpSessions: { type: "boolean" }
								},
								additionalProperties: false
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										requireMention: { type: "boolean" },
										systemPrompt: { type: "string" },
										skills: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							}
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" },
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							requireMention: { type: "boolean" },
							systemPrompt: { type: "string" },
							skills: {
								type: "array",
								items: { type: "string" }
							}
						},
						additionalProperties: false
					}
				}
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		}
	},
	{
		pluginId: "matrix",
		channelId: "matrix",
		label: "Matrix",
		description: "open protocol; install the plugin to enable.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				defaultAccount: { type: "string" },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {}
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				homeserver: { type: "string" },
				network: {
					type: "object",
					properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
					additionalProperties: false
				},
				proxy: { type: "string" },
				userId: { type: "string" },
				accessToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				password: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				deviceId: { type: "string" },
				deviceName: { type: "string" },
				avatarUrl: { type: "string" },
				initialSyncLimit: { type: "number" },
				encryption: { type: "boolean" },
				allowlistOnly: { type: "boolean" },
				allowBots: { anyOf: [{ type: "boolean" }, {
					type: "string",
					const: "mentions"
				}] },
				groupPolicy: {
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				blockStreaming: { type: "boolean" },
				streaming: { anyOf: [{
					type: "string",
					enum: [
						"partial",
						"quiet",
						"off"
					]
				}, { type: "boolean" }] },
				replyToMode: {
					type: "string",
					enum: [
						"off",
						"first",
						"all",
						"batched"
					]
				},
				threadReplies: {
					type: "string",
					enum: [
						"off",
						"inbound",
						"always"
					]
				},
				textChunkLimit: { type: "number" },
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				responsePrefix: { type: "string" },
				ackReaction: { type: "string" },
				ackReactionScope: {
					type: "string",
					enum: [
						"group-mentions",
						"group-all",
						"direct",
						"all",
						"none",
						"off"
					]
				},
				reactionNotifications: {
					type: "string",
					enum: ["off", "own"]
				},
				threadBindings: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						idleHours: {
							type: "number",
							minimum: 0
						},
						maxAgeHours: {
							type: "number",
							minimum: 0
						},
						spawnSubagentSessions: { type: "boolean" },
						spawnAcpSessions: { type: "boolean" }
					},
					additionalProperties: false
				},
				startupVerification: {
					type: "string",
					enum: ["off", "if-unverified"]
				},
				startupVerificationCooldownHours: { type: "number" },
				mediaMaxMb: { type: "number" },
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				autoJoin: {
					type: "string",
					enum: [
						"always",
						"allowlist",
						"off"
					]
				},
				autoJoinAllowlist: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				dm: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						policy: {
							type: "string",
							enum: [
								"pairing",
								"allowlist",
								"open",
								"disabled"
							]
						},
						allowFrom: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						sessionScope: {
							type: "string",
							enum: ["per-user", "per-room"]
						},
						threadReplies: {
							type: "string",
							enum: [
								"off",
								"inbound",
								"always"
							]
						}
					},
					additionalProperties: false
				},
				execApprovals: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						approvers: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						agentFilter: {
							type: "array",
							items: { type: "string" }
						},
						sessionFilter: {
							type: "array",
							items: { type: "string" }
						},
						target: {
							type: "string",
							enum: [
								"dm",
								"channel",
								"both"
							]
						}
					},
					additionalProperties: false
				},
				groups: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							account: { type: "string" },
							enabled: { type: "boolean" },
							requireMention: { type: "boolean" },
							allowBots: { anyOf: [{ type: "boolean" }, {
								type: "string",
								const: "mentions"
							}] },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							autoReply: { type: "boolean" },
							users: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				rooms: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							account: { type: "string" },
							enabled: { type: "boolean" },
							requireMention: { type: "boolean" },
							allowBots: { anyOf: [{ type: "boolean" }, {
								type: "string",
								const: "mentions"
							}] },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							autoReply: { type: "boolean" },
							users: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				actions: {
					type: "object",
					properties: {
						reactions: { type: "boolean" },
						messages: { type: "boolean" },
						pins: { type: "boolean" },
						profile: { type: "boolean" },
						memberInfo: { type: "boolean" },
						channelInfo: { type: "boolean" },
						verification: { type: "boolean" }
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "mattermost",
		channelId: "mattermost",
		label: "Mattermost",
		description: "self-hosted Slack-style chat; install the plugin to enable.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				dangerouslyAllowNameMatching: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				configWrites: { type: "boolean" },
				botToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				baseUrl: { type: "string" },
				chatmode: {
					type: "string",
					enum: [
						"oncall",
						"onmessage",
						"onchar"
					]
				},
				oncharPrefixes: {
					type: "array",
					items: { type: "string" }
				},
				requireMention: { type: "boolean" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				replyToMode: {
					type: "string",
					enum: [
						"off",
						"first",
						"all",
						"batched"
					]
				},
				responsePrefix: { type: "string" },
				actions: {
					type: "object",
					properties: { reactions: { type: "boolean" } },
					additionalProperties: false
				},
				commands: {
					type: "object",
					properties: {
						native: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] },
						nativeSkills: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] },
						callbackPath: { type: "string" },
						callbackUrl: { type: "string" }
					},
					additionalProperties: false
				},
				interactions: {
					type: "object",
					properties: {
						callbackBaseUrl: { type: "string" },
						allowedSourceIps: {
							type: "array",
							items: { type: "string" }
						}
					},
					additionalProperties: false
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { requireMention: { type: "boolean" } },
						additionalProperties: false
					}
				},
				network: {
					type: "object",
					properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
					additionalProperties: false
				},
				dmChannelRetry: {
					type: "object",
					properties: {
						maxRetries: {
							type: "integer",
							minimum: 0,
							maximum: 10
						},
						initialDelayMs: {
							type: "integer",
							minimum: 100,
							maximum: 6e4
						},
						maxDelayMs: {
							type: "integer",
							minimum: 1e3,
							maximum: 6e4
						},
						timeoutMs: {
							type: "integer",
							minimum: 5e3,
							maximum: 12e4
						}
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							dangerouslyAllowNameMatching: { type: "boolean" },
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							configWrites: { type: "boolean" },
							botToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							baseUrl: { type: "string" },
							chatmode: {
								type: "string",
								enum: [
									"oncall",
									"onmessage",
									"onchar"
								]
							},
							oncharPrefixes: {
								type: "array",
								items: { type: "string" }
							},
							requireMention: { type: "boolean" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							replyToMode: {
								type: "string",
								enum: [
									"off",
									"first",
									"all",
									"batched"
								]
							},
							responsePrefix: { type: "string" },
							actions: {
								type: "object",
								properties: { reactions: { type: "boolean" } },
								additionalProperties: false
							},
							commands: {
								type: "object",
								properties: {
									native: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] },
									nativeSkills: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] },
									callbackPath: { type: "string" },
									callbackUrl: { type: "string" }
								},
								additionalProperties: false
							},
							interactions: {
								type: "object",
								properties: {
									callbackBaseUrl: { type: "string" },
									allowedSourceIps: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { requireMention: { type: "boolean" } },
									additionalProperties: false
								}
							},
							network: {
								type: "object",
								properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
								additionalProperties: false
							},
							dmChannelRetry: {
								type: "object",
								properties: {
									maxRetries: {
										type: "integer",
										minimum: 0,
										maximum: 10
									},
									initialDelayMs: {
										type: "integer",
										minimum: 100,
										maximum: 6e4
									},
									maxDelayMs: {
										type: "integer",
										minimum: 1e3,
										maximum: 6e4
									},
									timeoutMs: {
										type: "integer",
										minimum: 5e3,
										maximum: 12e4
									}
								},
								additionalProperties: false
							}
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		}
	},
	{
		pluginId: "msteams",
		channelId: "msteams",
		label: "Microsoft Teams",
		description: "Teams SDK; enterprise support.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				enabled: { type: "boolean" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				dangerouslyAllowNameMatching: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				configWrites: { type: "boolean" },
				appId: { type: "string" },
				appPassword: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				tenantId: { type: "string" },
				webhook: {
					type: "object",
					properties: {
						port: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						path: { type: "string" }
					},
					additionalProperties: false
				},
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { type: "string" }
				},
				defaultTo: { type: "string" },
				groupAllowFrom: {
					type: "array",
					items: { type: "string" }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				typingIndicator: { type: "boolean" },
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				mediaAllowHosts: {
					type: "array",
					items: { type: "string" }
				},
				mediaAuthAllowHosts: {
					type: "array",
					items: { type: "string" }
				},
				requireMention: { type: "boolean" },
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				replyStyle: {
					type: "string",
					enum: ["thread", "top-level"]
				},
				teams: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							replyStyle: {
								type: "string",
								enum: ["thread", "top-level"]
							},
							channels: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										replyStyle: {
											type: "string",
											enum: ["thread", "top-level"]
										}
									},
									additionalProperties: false
								}
							}
						},
						additionalProperties: false
					}
				},
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				sharePointSiteId: { type: "string" },
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				welcomeCard: { type: "boolean" },
				promptStarters: {
					type: "array",
					items: { type: "string" }
				},
				groupWelcomeCard: { type: "boolean" },
				feedbackEnabled: { type: "boolean" },
				feedbackReflection: { type: "boolean" },
				feedbackReflectionCooldownMs: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				}
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "MS Teams",
				help: "Microsoft Teams channel provider configuration and provider-specific policy toggles. Use this section to isolate Teams behavior from other enterprise chat providers."
			},
			configWrites: {
				label: "MS Teams Config Writes",
				help: "Allow Microsoft Teams to write config in response to channel events/commands (default: true)."
			}
		}
	},
	{
		pluginId: "nextcloud-talk",
		channelId: "nextcloud-talk",
		label: "Nextcloud Talk",
		description: "Self-hosted chat via Nextcloud Talk webhook bots.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				baseUrl: { type: "string" },
				botSecret: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				botSecretFile: { type: "string" },
				apiUser: { type: "string" },
				apiPassword: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				apiPasswordFile: { type: "string" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				webhookPort: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				webhookHost: { type: "string" },
				webhookPath: { type: "string" },
				webhookPublicUrl: { type: "string" },
				allowFrom: {
					type: "array",
					items: { type: "string" }
				},
				groupAllowFrom: {
					type: "array",
					items: { type: "string" }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				rooms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { type: "string" }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				network: {
					type: "object",
					properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
					additionalProperties: false
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							baseUrl: { type: "string" },
							botSecret: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							botSecretFile: { type: "string" },
							apiUser: { type: "string" },
							apiPassword: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							apiPasswordFile: { type: "string" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							webhookPort: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							webhookHost: { type: "string" },
							webhookPath: { type: "string" },
							webhookPublicUrl: { type: "string" },
							allowFrom: {
								type: "array",
								items: { type: "string" }
							},
							groupAllowFrom: {
								type: "array",
								items: { type: "string" }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							rooms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { type: "string" }
										},
										systemPrompt: { type: "string" }
									},
									additionalProperties: false
								}
							},
							network: {
								type: "object",
								properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
								additionalProperties: false
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							responsePrefix: { type: "string" },
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							}
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		}
	},
	{
		pluginId: "nostr",
		channelId: "nostr",
		label: "Nostr",
		description: "Decentralized protocol; encrypted DMs via NIP-04.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				defaultAccount: { type: "string" },
				enabled: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				privateKey: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				relays: {
					type: "array",
					items: { type: "string" }
				},
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				profile: {
					type: "object",
					properties: {
						name: {
							type: "string",
							maxLength: 256
						},
						displayName: {
							type: "string",
							maxLength: 256
						},
						about: {
							type: "string",
							maxLength: 2e3
						},
						picture: {
							type: "string",
							format: "uri"
						},
						banner: {
							type: "string",
							format: "uri"
						},
						website: {
							type: "string",
							format: "uri"
						},
						nip05: { type: "string" },
						lud16: { type: "string" }
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "qa-channel",
		channelId: "qa-channel",
		label: "QA Channel",
		description: "Synthetic Slack-class transport for automated OpenClaw QA scenarios.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				baseUrl: {
					type: "string",
					format: "uri"
				},
				botUserId: { type: "string" },
				botDisplayName: { type: "string" },
				pollTimeoutMs: {
					type: "integer",
					minimum: 100,
					maximum: 3e4
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				defaultTo: { type: "string" },
				actions: {
					type: "object",
					properties: {
						messages: { type: "boolean" },
						reactions: { type: "boolean" },
						search: { type: "boolean" },
						threads: { type: "boolean" }
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							baseUrl: {
								type: "string",
								format: "uri"
							},
							botUserId: { type: "string" },
							botDisplayName: { type: "string" },
							pollTimeoutMs: {
								type: "integer",
								minimum: 100,
								maximum: 3e4
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							defaultTo: { type: "string" },
							actions: {
								type: "object",
								properties: {
									messages: { type: "boolean" },
									reactions: { type: "boolean" },
									search: { type: "boolean" },
									threads: { type: "boolean" }
								},
								additionalProperties: false
							}
						},
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "qqbot",
		channelId: "qqbot",
		label: "QQ Bot",
		description: "connect to QQ via official QQ Bot API with group chat and direct message support.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				enabled: { type: "boolean" },
				name: { type: "string" },
				appId: { type: "string" },
				clientSecret: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				clientSecretFile: { type: "string" },
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				systemPrompt: { type: "string" },
				markdownSupport: { type: "boolean" },
				voiceDirectUploadFormats: {
					type: "array",
					items: { type: "string" }
				},
				audioFormatPolicy: {
					type: "object",
					properties: {
						sttDirectFormats: {
							type: "array",
							items: { type: "string" }
						},
						uploadDirectFormats: {
							type: "array",
							items: { type: "string" }
						},
						transcodeEnabled: { type: "boolean" }
					},
					additionalProperties: false
				},
				urlDirectUpload: { type: "boolean" },
				upgradeUrl: { type: "string" },
				upgradeMode: {
					type: "string",
					enum: ["doc", "hot-reload"]
				},
				tts: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						provider: { type: "string" },
						baseUrl: { type: "string" },
						apiKey: { type: "string" },
						model: { type: "string" },
						voice: { type: "string" },
						authStyle: {
							type: "string",
							enum: ["bearer", "api-key"]
						},
						queryParams: {
							type: "object",
							propertyNames: { type: "string" },
							additionalProperties: { type: "string" }
						},
						speed: { type: "number" }
					},
					additionalProperties: false
				},
				stt: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						provider: { type: "string" },
						baseUrl: { type: "string" },
						apiKey: { type: "string" },
						model: { type: "string" }
					},
					additionalProperties: false
				},
				accounts: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							name: { type: "string" },
							appId: { type: "string" },
							clientSecret: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							clientSecretFile: { type: "string" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" },
							markdownSupport: { type: "boolean" },
							voiceDirectUploadFormats: {
								type: "array",
								items: { type: "string" }
							},
							audioFormatPolicy: {
								type: "object",
								properties: {
									sttDirectFormats: {
										type: "array",
										items: { type: "string" }
									},
									uploadDirectFormats: {
										type: "array",
										items: { type: "string" }
									},
									transcodeEnabled: { type: "boolean" }
								},
								additionalProperties: false
							},
							urlDirectUpload: { type: "boolean" },
							upgradeUrl: { type: "string" },
							upgradeMode: {
								type: "string",
								enum: ["doc", "hot-reload"]
							}
						},
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "signal",
		channelId: "signal",
		label: "Signal",
		description: "signal-cli linked device; more setup (David Reagans: \"Hop on Discord.\").",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				configWrites: { type: "boolean" },
				account: { type: "string" },
				accountUuid: { type: "string" },
				httpUrl: { type: "string" },
				httpHost: { type: "string" },
				httpPort: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				cliPath: { type: "string" },
				autoStart: { type: "boolean" },
				startupTimeoutMs: {
					type: "integer",
					minimum: 1e3,
					maximum: 12e4
				},
				receiveMode: { anyOf: [{
					type: "string",
					const: "on-start"
				}, {
					type: "string",
					const: "manual"
				}] },
				ignoreAttachments: { type: "boolean" },
				ignoreStories: { type: "boolean" },
				sendReadReceipts: { type: "boolean" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				defaultTo: { type: "string" },
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							ingest: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							}
						},
						additionalProperties: false
					}
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				mediaMaxMb: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				reactionNotifications: {
					type: "string",
					enum: [
						"off",
						"own",
						"all",
						"allowlist"
					]
				},
				reactionAllowlist: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				actions: {
					type: "object",
					properties: { reactions: { type: "boolean" } },
					additionalProperties: false
				},
				reactionLevel: {
					type: "string",
					enum: [
						"off",
						"ack",
						"minimal",
						"extensive"
					]
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							configWrites: { type: "boolean" },
							account: { type: "string" },
							accountUuid: { type: "string" },
							httpUrl: { type: "string" },
							httpHost: { type: "string" },
							httpPort: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							cliPath: { type: "string" },
							autoStart: { type: "boolean" },
							startupTimeoutMs: {
								type: "integer",
								minimum: 1e3,
								maximum: 12e4
							},
							receiveMode: { anyOf: [{
								type: "string",
								const: "on-start"
							}, {
								type: "string",
								const: "manual"
							}] },
							ignoreAttachments: { type: "boolean" },
							ignoreStories: { type: "boolean" },
							sendReadReceipts: { type: "boolean" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							defaultTo: { type: "string" },
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										ingest: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										}
									},
									additionalProperties: false
								}
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							mediaMaxMb: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							reactionNotifications: {
								type: "string",
								enum: [
									"off",
									"own",
									"all",
									"allowlist"
								]
							},
							reactionAllowlist: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							actions: {
								type: "object",
								properties: { reactions: { type: "boolean" } },
								additionalProperties: false
							},
							reactionLevel: {
								type: "string",
								enum: [
									"off",
									"ack",
									"minimal",
									"extensive"
								]
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							responsePrefix: { type: "string" }
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "Signal",
				help: "Signal channel provider configuration including account identity and DM policy behavior. Keep account mapping explicit so routing remains stable across multi-device setups."
			},
			dmPolicy: {
				label: "Signal DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.signal.allowFrom=[\"*\"]."
			},
			configWrites: {
				label: "Signal Config Writes",
				help: "Allow Signal to write config in response to channel events/commands (default: true)."
			},
			account: {
				label: "Signal Account",
				help: "Signal account identifier (phone/number handle) used to bind this channel config to a specific Signal identity. Keep this aligned with your linked device/session state."
			}
		}
	},
	{
		pluginId: "slack",
		channelId: "slack",
		label: "Slack",
		description: "supported (Socket Mode).",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				mode: {
					default: "socket",
					type: "string",
					enum: ["socket", "http"]
				},
				signingSecret: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				webhookPath: {
					default: "/slack/events",
					type: "string"
				},
				capabilities: { anyOf: [{
					type: "array",
					items: { type: "string" }
				}, {
					type: "object",
					properties: { interactiveReplies: { type: "boolean" } },
					additionalProperties: false
				}] },
				execApprovals: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						approvers: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						agentFilter: {
							type: "array",
							items: { type: "string" }
						},
						sessionFilter: {
							type: "array",
							items: { type: "string" }
						},
						target: {
							type: "string",
							enum: [
								"dm",
								"channel",
								"both"
							]
						}
					},
					additionalProperties: false
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				commands: {
					type: "object",
					properties: {
						native: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] },
						nativeSkills: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] }
					},
					additionalProperties: false
				},
				configWrites: { type: "boolean" },
				botToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				appToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				userToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				userTokenReadOnly: {
					default: true,
					type: "boolean"
				},
				allowBots: { type: "boolean" },
				dangerouslyAllowNameMatching: { type: "boolean" },
				requireMention: { type: "boolean" },
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				streaming: {
					type: "string",
					enum: [
						"off",
						"partial",
						"block",
						"progress"
					]
				},
				nativeStreaming: { type: "boolean" },
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				reactionNotifications: {
					type: "string",
					enum: [
						"off",
						"own",
						"all",
						"allowlist"
					]
				},
				reactionAllowlist: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				replyToMode: { anyOf: [
					{
						type: "string",
						const: "off"
					},
					{
						type: "string",
						const: "first"
					},
					{
						type: "string",
						const: "all"
					},
					{
						type: "string",
						const: "batched"
					}
				] },
				replyToModeByChatType: {
					type: "object",
					properties: {
						direct: { anyOf: [
							{
								type: "string",
								const: "off"
							},
							{
								type: "string",
								const: "first"
							},
							{
								type: "string",
								const: "all"
							},
							{
								type: "string",
								const: "batched"
							}
						] },
						group: { anyOf: [
							{
								type: "string",
								const: "off"
							},
							{
								type: "string",
								const: "first"
							},
							{
								type: "string",
								const: "all"
							},
							{
								type: "string",
								const: "batched"
							}
						] },
						channel: { anyOf: [
							{
								type: "string",
								const: "off"
							},
							{
								type: "string",
								const: "first"
							},
							{
								type: "string",
								const: "all"
							},
							{
								type: "string",
								const: "batched"
							}
						] }
					},
					additionalProperties: false
				},
				thread: {
					type: "object",
					properties: {
						historyScope: {
							type: "string",
							enum: ["thread", "channel"]
						},
						inheritParent: { type: "boolean" },
						initialHistoryLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				actions: {
					type: "object",
					properties: {
						reactions: { type: "boolean" },
						messages: { type: "boolean" },
						pins: { type: "boolean" },
						search: { type: "boolean" },
						permissions: { type: "boolean" },
						memberInfo: { type: "boolean" },
						channelInfo: { type: "boolean" },
						emojiList: { type: "boolean" }
					},
					additionalProperties: false
				},
				slashCommand: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						name: { type: "string" },
						sessionPrefix: { type: "string" },
						ephemeral: { type: "boolean" }
					},
					additionalProperties: false
				},
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				defaultTo: { type: "string" },
				dm: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						policy: {
							type: "string",
							enum: [
								"pairing",
								"allowlist",
								"open",
								"disabled"
							]
						},
						allowFrom: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						groupEnabled: { type: "boolean" },
						groupChannels: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						replyToMode: { anyOf: [
							{
								type: "string",
								const: "off"
							},
							{
								type: "string",
								const: "first"
							},
							{
								type: "string",
								const: "all"
							},
							{
								type: "string",
								const: "batched"
							}
						] }
					},
					additionalProperties: false
				},
				channels: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							allowBots: { type: "boolean" },
							users: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							systemPrompt: { type: "string" }
						},
						additionalProperties: false
					}
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				responsePrefix: { type: "string" },
				ackReaction: { type: "string" },
				typingReaction: { type: "string" },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							mode: {
								type: "string",
								enum: ["socket", "http"]
							},
							signingSecret: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							webhookPath: { type: "string" },
							capabilities: { anyOf: [{
								type: "array",
								items: { type: "string" }
							}, {
								type: "object",
								properties: { interactiveReplies: { type: "boolean" } },
								additionalProperties: false
							}] },
							execApprovals: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									approvers: {
										type: "array",
										items: { anyOf: [{ type: "string" }, { type: "number" }] }
									},
									agentFilter: {
										type: "array",
										items: { type: "string" }
									},
									sessionFilter: {
										type: "array",
										items: { type: "string" }
									},
									target: {
										type: "string",
										enum: [
											"dm",
											"channel",
											"both"
										]
									}
								},
								additionalProperties: false
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							commands: {
								type: "object",
								properties: {
									native: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] },
									nativeSkills: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] }
								},
								additionalProperties: false
							},
							configWrites: { type: "boolean" },
							botToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							appToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							userToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							userTokenReadOnly: {
								default: true,
								type: "boolean"
							},
							allowBots: { type: "boolean" },
							dangerouslyAllowNameMatching: { type: "boolean" },
							requireMention: { type: "boolean" },
							groupPolicy: {
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							streaming: {
								type: "string",
								enum: [
									"off",
									"partial",
									"block",
									"progress"
								]
							},
							nativeStreaming: { type: "boolean" },
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							},
							reactionNotifications: {
								type: "string",
								enum: [
									"off",
									"own",
									"all",
									"allowlist"
								]
							},
							reactionAllowlist: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							replyToMode: { anyOf: [
								{
									type: "string",
									const: "off"
								},
								{
									type: "string",
									const: "first"
								},
								{
									type: "string",
									const: "all"
								},
								{
									type: "string",
									const: "batched"
								}
							] },
							replyToModeByChatType: {
								type: "object",
								properties: {
									direct: { anyOf: [
										{
											type: "string",
											const: "off"
										},
										{
											type: "string",
											const: "first"
										},
										{
											type: "string",
											const: "all"
										},
										{
											type: "string",
											const: "batched"
										}
									] },
									group: { anyOf: [
										{
											type: "string",
											const: "off"
										},
										{
											type: "string",
											const: "first"
										},
										{
											type: "string",
											const: "all"
										},
										{
											type: "string",
											const: "batched"
										}
									] },
									channel: { anyOf: [
										{
											type: "string",
											const: "off"
										},
										{
											type: "string",
											const: "first"
										},
										{
											type: "string",
											const: "all"
										},
										{
											type: "string",
											const: "batched"
										}
									] }
								},
								additionalProperties: false
							},
							thread: {
								type: "object",
								properties: {
									historyScope: {
										type: "string",
										enum: ["thread", "channel"]
									},
									inheritParent: { type: "boolean" },
									initialHistoryLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							actions: {
								type: "object",
								properties: {
									reactions: { type: "boolean" },
									messages: { type: "boolean" },
									pins: { type: "boolean" },
									search: { type: "boolean" },
									permissions: { type: "boolean" },
									memberInfo: { type: "boolean" },
									channelInfo: { type: "boolean" },
									emojiList: { type: "boolean" }
								},
								additionalProperties: false
							},
							slashCommand: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									name: { type: "string" },
									sessionPrefix: { type: "string" },
									ephemeral: { type: "boolean" }
								},
								additionalProperties: false
							},
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							defaultTo: { type: "string" },
							dm: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									policy: {
										type: "string",
										enum: [
											"pairing",
											"allowlist",
											"open",
											"disabled"
										]
									},
									allowFrom: {
										type: "array",
										items: { anyOf: [{ type: "string" }, { type: "number" }] }
									},
									groupEnabled: { type: "boolean" },
									groupChannels: {
										type: "array",
										items: { anyOf: [{ type: "string" }, { type: "number" }] }
									},
									replyToMode: { anyOf: [
										{
											type: "string",
											const: "off"
										},
										{
											type: "string",
											const: "first"
										},
										{
											type: "string",
											const: "all"
										},
										{
											type: "string",
											const: "batched"
										}
									] }
								},
								additionalProperties: false
							},
							channels: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										allowBots: { type: "boolean" },
										users: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										systemPrompt: { type: "string" }
									},
									additionalProperties: false
								}
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							responsePrefix: { type: "string" },
							ackReaction: { type: "string" },
							typingReaction: { type: "string" }
						},
						required: ["userTokenReadOnly"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: [
				"mode",
				"webhookPath",
				"userTokenReadOnly",
				"groupPolicy"
			],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "Slack",
				help: "Slack channel provider configuration for bot/app tokens, streaming behavior, and DM policy controls. Keep token handling and thread behavior explicit to avoid noisy workspace interactions."
			},
			"dm.policy": {
				label: "Slack DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.slack.allowFrom=[\"*\"] (legacy: channels.slack.dm.allowFrom)."
			},
			dmPolicy: {
				label: "Slack DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.slack.allowFrom=[\"*\"]."
			},
			configWrites: {
				label: "Slack Config Writes",
				help: "Allow Slack to write config in response to channel events/commands (default: true)."
			},
			"commands.native": {
				label: "Slack Native Commands",
				help: "Override native commands for Slack (bool or \"auto\")."
			},
			"commands.nativeSkills": {
				label: "Slack Native Skill Commands",
				help: "Override native skill commands for Slack (bool or \"auto\")."
			},
			allowBots: {
				label: "Slack Allow Bot Messages",
				help: "Allow bot-authored messages to trigger Slack replies (default: false)."
			},
			botToken: {
				label: "Slack Bot Token",
				help: "Slack bot token used for standard chat actions in the configured workspace. Keep this credential scoped and rotate if workspace app permissions change."
			},
			appToken: {
				label: "Slack App Token",
				help: "Slack app-level token used for Socket Mode connections and event transport when enabled. Use least-privilege app scopes and store this token as a secret."
			},
			userToken: {
				label: "Slack User Token",
				help: "Optional Slack user token for workflows requiring user-context API access beyond bot permissions. Use sparingly and audit scopes because this token can carry broader authority."
			},
			userTokenReadOnly: {
				label: "Slack User Token Read Only",
				help: "When true, treat configured Slack user token usage as read-only helper behavior where possible. Keep enabled if you only need supplemental reads without user-context writes."
			},
			"capabilities.interactiveReplies": {
				label: "Slack Interactive Replies",
				help: "Enable agent-authored Slack interactive reply directives (`[[slack_buttons: ...]]`, `[[slack_select: ...]]`). Default: false."
			},
			execApprovals: {
				label: "Slack Exec Approvals",
				help: "Slack-native exec approval routing and approver authorization. When unset, OpenClaw auto-enables DM-first native approvals if approvers can be resolved for this workspace account."
			},
			"execApprovals.enabled": {
				label: "Slack Exec Approvals Enabled",
				help: "Controls Slack native exec approvals for this account: unset or \"auto\" enables DM-first native approvals when approvers can be resolved, true forces native approvals on, and false disables them."
			},
			"execApprovals.approvers": {
				label: "Slack Exec Approval Approvers",
				help: "Slack user IDs allowed to approve exec requests for this workspace account. Use Slack user IDs or user targets such as `U123`, `user:U123`, or `<@U123>`. If you leave this unset, OpenClaw falls back to commands.ownerAllowFrom when possible."
			},
			"execApprovals.agentFilter": {
				label: "Slack Exec Approval Agent Filter",
				help: "Optional allowlist of agent IDs eligible for Slack exec approvals, for example `[\"main\", \"ops-agent\"]`. Use this to keep approval prompts scoped to the agents you actually operate from Slack."
			},
			"execApprovals.sessionFilter": {
				label: "Slack Exec Approval Session Filter",
				help: "Optional session-key filters matched as substring or regex-style patterns before Slack approval routing is used. Use narrow patterns so Slack approvals only appear for intended sessions."
			},
			"execApprovals.target": {
				label: "Slack Exec Approval Target",
				help: "Controls where Slack approval prompts are sent: \"dm\" sends to approver DMs (default), \"channel\" sends to the originating Slack chat/thread, and \"both\" sends to both. Channel delivery exposes the command text to the chat, so only use it in trusted channels."
			},
			streaming: {
				label: "Slack Streaming Mode",
				help: "Unified Slack stream preview mode: \"off\" | \"partial\" | \"block\" | \"progress\". Legacy boolean/streamMode keys are auto-mapped."
			},
			nativeStreaming: {
				label: "Slack Native Streaming",
				help: "Enable native Slack text streaming (chat.startStream/chat.appendStream/chat.stopStream) when channels.slack.streaming is partial (default: true)."
			},
			"thread.historyScope": {
				label: "Slack Thread History Scope",
				help: "Scope for Slack thread history context (\"thread\" isolates per thread; \"channel\" reuses channel history)."
			},
			"thread.inheritParent": {
				label: "Slack Thread Parent Inheritance",
				help: "If true, Slack thread sessions inherit the parent channel transcript (default: false)."
			},
			"thread.initialHistoryLimit": {
				label: "Slack Thread Initial History Limit",
				help: "Maximum number of existing Slack thread messages to fetch when starting a new thread session (default: 20, set to 0 to disable)."
			}
		}
	},
	{
		pluginId: "synology-chat",
		channelId: "synology-chat",
		label: "Synology Chat",
		description: "Connect your Synology NAS Chat to OpenClaw with full agent capabilities.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				dangerouslyAllowNameMatching: { type: "boolean" },
				dangerouslyAllowInheritedWebhookPath: { type: "boolean" }
			},
			additionalProperties: {}
		}
	},
	{
		pluginId: "telegram",
		channelId: "telegram",
		label: "Telegram",
		description: "simplest way to get started — register a bot with @BotFather and get going.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				capabilities: { anyOf: [{
					type: "array",
					items: { type: "string" }
				}, {
					type: "object",
					properties: { inlineButtons: {
						type: "string",
						enum: [
							"off",
							"dm",
							"group",
							"all",
							"allowlist"
						]
					} },
					additionalProperties: false
				}] },
				execApprovals: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						approvers: {
							type: "array",
							items: { anyOf: [{ type: "string" }, { type: "number" }] }
						},
						agentFilter: {
							type: "array",
							items: { type: "string" }
						},
						sessionFilter: {
							type: "array",
							items: { type: "string" }
						},
						target: {
							type: "string",
							enum: [
								"dm",
								"channel",
								"both"
							]
						}
					},
					additionalProperties: false
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				enabled: { type: "boolean" },
				commands: {
					type: "object",
					properties: {
						native: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] },
						nativeSkills: { anyOf: [{ type: "boolean" }, {
							type: "string",
							const: "auto"
						}] }
					},
					additionalProperties: false
				},
				customCommands: {
					type: "array",
					items: {
						type: "object",
						properties: {
							command: { type: "string" },
							description: { type: "string" }
						},
						required: ["command", "description"],
						additionalProperties: false
					}
				},
				configWrites: { type: "boolean" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				botToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				tokenFile: { type: "string" },
				replyToMode: { anyOf: [
					{
						type: "string",
						const: "off"
					},
					{
						type: "string",
						const: "first"
					},
					{
						type: "string",
						const: "all"
					},
					{
						type: "string",
						const: "batched"
					}
				] },
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							ingest: { type: "boolean" },
							disableAudioPreflight: { type: "boolean" },
							groupPolicy: {
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" },
							topics: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										ingest: { type: "boolean" },
										disableAudioPreflight: { type: "boolean" },
										groupPolicy: {
											type: "string",
											enum: [
												"open",
												"disabled",
												"allowlist"
											]
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" },
										agentId: { type: "string" },
										errorPolicy: {
											type: "string",
											enum: [
												"always",
												"once",
												"silent"
											]
										},
										errorCooldownMs: {
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991
										}
									},
									additionalProperties: false
								}
							},
							errorPolicy: {
								type: "string",
								enum: [
									"always",
									"once",
									"silent"
								]
							},
							errorCooldownMs: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							}
						},
						additionalProperties: false
					}
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				defaultTo: { anyOf: [{ type: "string" }, { type: "number" }] },
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				direct: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							},
							skills: {
								type: "array",
								items: { type: "string" }
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							systemPrompt: { type: "string" },
							topics: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										ingest: { type: "boolean" },
										disableAudioPreflight: { type: "boolean" },
										groupPolicy: {
											type: "string",
											enum: [
												"open",
												"disabled",
												"allowlist"
											]
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" },
										agentId: { type: "string" },
										errorPolicy: {
											type: "string",
											enum: [
												"always",
												"once",
												"silent"
											]
										},
										errorCooldownMs: {
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991
										}
									},
									additionalProperties: false
								}
							},
							errorPolicy: {
								type: "string",
								enum: [
									"always",
									"once",
									"silent"
								]
							},
							errorCooldownMs: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							requireTopic: { type: "boolean" },
							autoTopicLabel: { anyOf: [{ type: "boolean" }, {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									prompt: { type: "string" }
								},
								additionalProperties: false
							}] }
						},
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				streaming: {
					type: "string",
					enum: [
						"off",
						"partial",
						"block",
						"progress"
					]
				},
				blockStreaming: { type: "boolean" },
				draftChunk: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						breakPreference: { anyOf: [
							{
								type: "string",
								const: "paragraph"
							},
							{
								type: "string",
								const: "newline"
							},
							{
								type: "string",
								const: "sentence"
							}
						] }
					},
					additionalProperties: false
				},
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				mediaMaxMb: {
					type: "number",
					exclusiveMinimum: 0
				},
				timeoutSeconds: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				retry: {
					type: "object",
					properties: {
						attempts: {
							type: "integer",
							minimum: 1,
							maximum: 9007199254740991
						},
						minDelayMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						},
						maxDelayMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						},
						jitter: {
							type: "number",
							minimum: 0,
							maximum: 1
						}
					},
					additionalProperties: false
				},
				network: {
					type: "object",
					properties: {
						autoSelectFamily: { type: "boolean" },
						dnsResultOrder: {
							type: "string",
							enum: ["ipv4first", "verbatim"]
						},
						dangerouslyAllowPrivateNetwork: {
							description: "Dangerous opt-in for trusted Telegram fake-IP or transparent-proxy environments where api.telegram.org resolves to private/internal/special-use addresses during media downloads.",
							type: "boolean"
						}
					},
					additionalProperties: false
				},
				proxy: { type: "string" },
				webhookUrl: {
					description: "Public HTTPS webhook URL registered with Telegram for inbound updates. This must be internet-reachable and requires channels.telegram.webhookSecret.",
					type: "string"
				},
				webhookSecret: {
					description: "Secret token sent to Telegram during webhook registration and verified on inbound webhook requests. Telegram returns this value for verification; this is not the gateway auth token and not the bot token.",
					anyOf: [{ type: "string" }, { oneOf: [
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "env"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: {
									type: "string",
									pattern: "^[A-Z][A-Z0-9_]{0,127}$"
								}
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						},
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "file"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: { type: "string" }
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						},
						{
							type: "object",
							properties: {
								source: {
									type: "string",
									const: "exec"
								},
								provider: {
									type: "string",
									pattern: "^[a-z][a-z0-9_-]{0,63}$"
								},
								id: { type: "string" }
							},
							required: [
								"source",
								"provider",
								"id"
							],
							additionalProperties: false
						}
					] }]
				},
				webhookPath: {
					description: "Local webhook route path served by the gateway listener. Defaults to /telegram-webhook.",
					type: "string"
				},
				webhookHost: {
					description: "Local bind host for the webhook listener. Defaults to 127.0.0.1; keep loopback unless you intentionally expose direct ingress.",
					type: "string"
				},
				webhookPort: {
					description: "Local bind port for the webhook listener. Defaults to 8787; set to 0 to let the OS assign an ephemeral port.",
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				webhookCertPath: {
					description: "Path to the self-signed certificate (PEM) to upload to Telegram during webhook registration. Required for self-signed certs (direct IP or no domain).",
					type: "string"
				},
				actions: {
					type: "object",
					properties: {
						reactions: { type: "boolean" },
						sendMessage: { type: "boolean" },
						poll: { type: "boolean" },
						deleteMessage: { type: "boolean" },
						editMessage: { type: "boolean" },
						sticker: { type: "boolean" },
						createForumTopic: { type: "boolean" },
						editForumTopic: { type: "boolean" }
					},
					additionalProperties: false
				},
				threadBindings: {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						idleHours: {
							type: "number",
							minimum: 0
						},
						maxAgeHours: {
							type: "number",
							minimum: 0
						},
						spawnSubagentSessions: { type: "boolean" },
						spawnAcpSessions: { type: "boolean" }
					},
					additionalProperties: false
				},
				reactionNotifications: {
					type: "string",
					enum: [
						"off",
						"own",
						"all"
					]
				},
				reactionLevel: {
					type: "string",
					enum: [
						"off",
						"ack",
						"minimal",
						"extensive"
					]
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				linkPreview: { type: "boolean" },
				silentErrorReplies: { type: "boolean" },
				responsePrefix: { type: "string" },
				ackReaction: { type: "string" },
				errorPolicy: {
					type: "string",
					enum: [
						"always",
						"once",
						"silent"
					]
				},
				errorCooldownMs: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				apiRoot: {
					type: "string",
					format: "uri"
				},
				trustedLocalFileRoots: {
					description: "Trusted local filesystem roots for self-hosted Telegram Bot API absolute file_path values. Only absolute paths under these roots are read directly; all other absolute paths are rejected.",
					type: "array",
					items: { type: "string" }
				},
				autoTopicLabel: { anyOf: [{ type: "boolean" }, {
					type: "object",
					properties: {
						enabled: { type: "boolean" },
						prompt: { type: "string" }
					},
					additionalProperties: false
				}] },
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							capabilities: { anyOf: [{
								type: "array",
								items: { type: "string" }
							}, {
								type: "object",
								properties: { inlineButtons: {
									type: "string",
									enum: [
										"off",
										"dm",
										"group",
										"all",
										"allowlist"
									]
								} },
								additionalProperties: false
							}] },
							execApprovals: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									approvers: {
										type: "array",
										items: { anyOf: [{ type: "string" }, { type: "number" }] }
									},
									agentFilter: {
										type: "array",
										items: { type: "string" }
									},
									sessionFilter: {
										type: "array",
										items: { type: "string" }
									},
									target: {
										type: "string",
										enum: [
											"dm",
											"channel",
											"both"
										]
									}
								},
								additionalProperties: false
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							enabled: { type: "boolean" },
							commands: {
								type: "object",
								properties: {
									native: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] },
									nativeSkills: { anyOf: [{ type: "boolean" }, {
										type: "string",
										const: "auto"
									}] }
								},
								additionalProperties: false
							},
							customCommands: {
								type: "array",
								items: {
									type: "object",
									properties: {
										command: { type: "string" },
										description: { type: "string" }
									},
									required: ["command", "description"],
									additionalProperties: false
								}
							},
							configWrites: { type: "boolean" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							botToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							tokenFile: { type: "string" },
							replyToMode: { anyOf: [
								{
									type: "string",
									const: "off"
								},
								{
									type: "string",
									const: "first"
								},
								{
									type: "string",
									const: "all"
								},
								{
									type: "string",
									const: "batched"
								}
							] },
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										ingest: { type: "boolean" },
										disableAudioPreflight: { type: "boolean" },
										groupPolicy: {
											type: "string",
											enum: [
												"open",
												"disabled",
												"allowlist"
											]
										},
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" },
										topics: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													requireMention: { type: "boolean" },
													ingest: { type: "boolean" },
													disableAudioPreflight: { type: "boolean" },
													groupPolicy: {
														type: "string",
														enum: [
															"open",
															"disabled",
															"allowlist"
														]
													},
													skills: {
														type: "array",
														items: { type: "string" }
													},
													enabled: { type: "boolean" },
													allowFrom: {
														type: "array",
														items: { anyOf: [{ type: "string" }, { type: "number" }] }
													},
													systemPrompt: { type: "string" },
													agentId: { type: "string" },
													errorPolicy: {
														type: "string",
														enum: [
															"always",
															"once",
															"silent"
														]
													},
													errorCooldownMs: {
														type: "integer",
														minimum: 0,
														maximum: 9007199254740991
													}
												},
												additionalProperties: false
											}
										},
										errorPolicy: {
											type: "string",
											enum: [
												"always",
												"once",
												"silent"
											]
										},
										errorCooldownMs: {
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991
										}
									},
									additionalProperties: false
								}
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							defaultTo: { anyOf: [{ type: "string" }, { type: "number" }] },
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							direct: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										dmPolicy: {
											type: "string",
											enum: [
												"pairing",
												"allowlist",
												"open",
												"disabled"
											]
										},
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										},
										skills: {
											type: "array",
											items: { type: "string" }
										},
										enabled: { type: "boolean" },
										allowFrom: {
											type: "array",
											items: { anyOf: [{ type: "string" }, { type: "number" }] }
										},
										systemPrompt: { type: "string" },
										topics: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													requireMention: { type: "boolean" },
													ingest: { type: "boolean" },
													disableAudioPreflight: { type: "boolean" },
													groupPolicy: {
														type: "string",
														enum: [
															"open",
															"disabled",
															"allowlist"
														]
													},
													skills: {
														type: "array",
														items: { type: "string" }
													},
													enabled: { type: "boolean" },
													allowFrom: {
														type: "array",
														items: { anyOf: [{ type: "string" }, { type: "number" }] }
													},
													systemPrompt: { type: "string" },
													agentId: { type: "string" },
													errorPolicy: {
														type: "string",
														enum: [
															"always",
															"once",
															"silent"
														]
													},
													errorCooldownMs: {
														type: "integer",
														minimum: 0,
														maximum: 9007199254740991
													}
												},
												additionalProperties: false
											}
										},
										errorPolicy: {
											type: "string",
											enum: [
												"always",
												"once",
												"silent"
											]
										},
										errorCooldownMs: {
											type: "integer",
											minimum: 0,
											maximum: 9007199254740991
										},
										requireTopic: { type: "boolean" },
										autoTopicLabel: { anyOf: [{ type: "boolean" }, {
											type: "object",
											properties: {
												enabled: { type: "boolean" },
												prompt: { type: "string" }
											},
											additionalProperties: false
										}] }
									},
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							streaming: {
								type: "string",
								enum: [
									"off",
									"partial",
									"block",
									"progress"
								]
							},
							blockStreaming: { type: "boolean" },
							draftChunk: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									breakPreference: { anyOf: [
										{
											type: "string",
											const: "paragraph"
										},
										{
											type: "string",
											const: "newline"
										},
										{
											type: "string",
											const: "sentence"
										}
									] }
								},
								additionalProperties: false
							},
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							mediaMaxMb: {
								type: "number",
								exclusiveMinimum: 0
							},
							timeoutSeconds: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							retry: {
								type: "object",
								properties: {
									attempts: {
										type: "integer",
										minimum: 1,
										maximum: 9007199254740991
									},
									minDelayMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									},
									maxDelayMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									},
									jitter: {
										type: "number",
										minimum: 0,
										maximum: 1
									}
								},
								additionalProperties: false
							},
							network: {
								type: "object",
								properties: {
									autoSelectFamily: { type: "boolean" },
									dnsResultOrder: {
										type: "string",
										enum: ["ipv4first", "verbatim"]
									},
									dangerouslyAllowPrivateNetwork: {
										description: "Dangerous opt-in for trusted Telegram fake-IP or transparent-proxy environments where api.telegram.org resolves to private/internal/special-use addresses during media downloads.",
										type: "boolean"
									}
								},
								additionalProperties: false
							},
							proxy: { type: "string" },
							webhookUrl: {
								description: "Public HTTPS webhook URL registered with Telegram for inbound updates. This must be internet-reachable and requires channels.telegram.webhookSecret.",
								type: "string"
							},
							webhookSecret: {
								description: "Secret token sent to Telegram during webhook registration and verified on inbound webhook requests. Telegram returns this value for verification; this is not the gateway auth token and not the bot token.",
								anyOf: [{ type: "string" }, { oneOf: [
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "env"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: {
												type: "string",
												pattern: "^[A-Z][A-Z0-9_]{0,127}$"
											}
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									},
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "file"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: { type: "string" }
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									},
									{
										type: "object",
										properties: {
											source: {
												type: "string",
												const: "exec"
											},
											provider: {
												type: "string",
												pattern: "^[a-z][a-z0-9_-]{0,63}$"
											},
											id: { type: "string" }
										},
										required: [
											"source",
											"provider",
											"id"
										],
										additionalProperties: false
									}
								] }]
							},
							webhookPath: {
								description: "Local webhook route path served by the gateway listener. Defaults to /telegram-webhook.",
								type: "string"
							},
							webhookHost: {
								description: "Local bind host for the webhook listener. Defaults to 127.0.0.1; keep loopback unless you intentionally expose direct ingress.",
								type: "string"
							},
							webhookPort: {
								description: "Local bind port for the webhook listener. Defaults to 8787; set to 0 to let the OS assign an ephemeral port.",
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							webhookCertPath: {
								description: "Path to the self-signed certificate (PEM) to upload to Telegram during webhook registration. Required for self-signed certs (direct IP or no domain).",
								type: "string"
							},
							actions: {
								type: "object",
								properties: {
									reactions: { type: "boolean" },
									sendMessage: { type: "boolean" },
									poll: { type: "boolean" },
									deleteMessage: { type: "boolean" },
									editMessage: { type: "boolean" },
									sticker: { type: "boolean" },
									createForumTopic: { type: "boolean" },
									editForumTopic: { type: "boolean" }
								},
								additionalProperties: false
							},
							threadBindings: {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									idleHours: {
										type: "number",
										minimum: 0
									},
									maxAgeHours: {
										type: "number",
										minimum: 0
									},
									spawnSubagentSessions: { type: "boolean" },
									spawnAcpSessions: { type: "boolean" }
								},
								additionalProperties: false
							},
							reactionNotifications: {
								type: "string",
								enum: [
									"off",
									"own",
									"all"
								]
							},
							reactionLevel: {
								type: "string",
								enum: [
									"off",
									"ack",
									"minimal",
									"extensive"
								]
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							linkPreview: { type: "boolean" },
							silentErrorReplies: { type: "boolean" },
							responsePrefix: { type: "string" },
							ackReaction: { type: "string" },
							errorPolicy: {
								type: "string",
								enum: [
									"always",
									"once",
									"silent"
								]
							},
							errorCooldownMs: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							apiRoot: {
								type: "string",
								format: "uri"
							},
							trustedLocalFileRoots: {
								description: "Trusted local filesystem roots for self-hosted Telegram Bot API absolute file_path values. Only absolute paths under these roots are read directly; all other absolute paths are rejected.",
								type: "array",
								items: { type: "string" }
							},
							autoTopicLabel: { anyOf: [{ type: "boolean" }, {
								type: "object",
								properties: {
									enabled: { type: "boolean" },
									prompt: { type: "string" }
								},
								additionalProperties: false
							}] }
						},
						required: ["dmPolicy", "groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["dmPolicy", "groupPolicy"],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "Telegram",
				help: "Telegram channel provider configuration including auth tokens, retry behavior, and message rendering controls. Use this section to tune bot behavior for Telegram-specific API semantics."
			},
			customCommands: {
				label: "Telegram Custom Commands",
				help: "Additional Telegram bot menu commands (merged with native; conflicts ignored)."
			},
			botToken: {
				label: "Telegram Bot Token",
				help: "Telegram bot token used to authenticate Bot API requests for this account/provider config. Use secret/env substitution and rotate tokens if exposure is suspected."
			},
			dmPolicy: {
				label: "Telegram DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.telegram.allowFrom=[\"*\"]."
			},
			configWrites: {
				label: "Telegram Config Writes",
				help: "Allow Telegram to write config in response to channel events/commands (default: true)."
			},
			"commands.native": {
				label: "Telegram Native Commands",
				help: "Override native commands for Telegram (bool or \"auto\")."
			},
			"commands.nativeSkills": {
				label: "Telegram Native Skill Commands",
				help: "Override native skill commands for Telegram (bool or \"auto\")."
			},
			streaming: {
				label: "Telegram Streaming Mode",
				help: "Unified Telegram stream preview mode: \"off\" | \"partial\" | \"block\" | \"progress\" (default: \"partial\"). \"progress\" maps to \"partial\" on Telegram. Legacy boolean/streamMode keys are auto-mapped."
			},
			"retry.attempts": {
				label: "Telegram Retry Attempts",
				help: "Max retry attempts for outbound Telegram API calls (default: 3)."
			},
			"retry.minDelayMs": {
				label: "Telegram Retry Min Delay (ms)",
				help: "Minimum retry delay in ms for Telegram outbound calls."
			},
			"retry.maxDelayMs": {
				label: "Telegram Retry Max Delay (ms)",
				help: "Maximum retry delay cap in ms for Telegram outbound calls."
			},
			"retry.jitter": {
				label: "Telegram Retry Jitter",
				help: "Jitter factor (0-1) applied to Telegram retry delays."
			},
			"network.autoSelectFamily": {
				label: "Telegram autoSelectFamily",
				help: "Override Node autoSelectFamily for Telegram (true=enable, false=disable)."
			},
			"network.dangerouslyAllowPrivateNetwork": {
				label: "Telegram Dangerously Allow Private Network",
				help: "Dangerous opt-in for trusted fake-IP or transparent-proxy environments where Telegram media downloads resolve api.telegram.org to private/internal/special-use addresses."
			},
			timeoutSeconds: {
				label: "Telegram API Timeout (seconds)",
				help: "Max seconds before Telegram API requests are aborted (default: 500 per grammY)."
			},
			silentErrorReplies: {
				label: "Telegram Silent Error Replies",
				help: "When true, Telegram bot replies marked as errors are sent silently (no notification sound). Default: false."
			},
			apiRoot: {
				label: "Telegram API Root URL",
				help: "Custom Telegram Bot API root URL. Use for self-hosted Bot API servers (https://github.com/tdlib/telegram-bot-api) or reverse proxies in regions where api.telegram.org is blocked."
			},
			trustedLocalFileRoots: {
				label: "Telegram Trusted Local File Roots",
				help: "Trusted local filesystem roots for self-hosted Telegram Bot API absolute file_path values. Only absolute paths inside these roots are read directly; all other absolute paths are rejected."
			},
			autoTopicLabel: {
				label: "Telegram Auto Topic Label",
				help: "Auto-rename DM forum topics on first message using LLM. Default: true. Set to false to disable, or use object form { enabled: true, prompt: '...' } for custom prompt."
			},
			"autoTopicLabel.enabled": {
				label: "Telegram Auto Topic Label Enabled",
				help: "Whether auto topic labeling is enabled. Default: true."
			},
			"autoTopicLabel.prompt": {
				label: "Telegram Auto Topic Label Prompt",
				help: "Custom prompt for LLM-based topic naming. The user message is appended after the prompt."
			},
			"capabilities.inlineButtons": {
				label: "Telegram Inline Buttons",
				help: "Enable Telegram inline button components for supported command and interaction surfaces. Disable if your deployment needs plain-text-only compatibility behavior."
			},
			execApprovals: {
				label: "Telegram Exec Approvals",
				help: "Telegram-native exec approval routing and approver authorization. When unset, OpenClaw auto-enables DM-first native approvals if approvers can be resolved for the selected bot account."
			},
			"execApprovals.enabled": {
				label: "Telegram Exec Approvals Enabled",
				help: "Controls Telegram native exec approvals for this account: unset or \"auto\" enables DM-first native approvals when approvers can be resolved, true forces native approvals on, and false disables them."
			},
			"execApprovals.approvers": {
				label: "Telegram Exec Approval Approvers",
				help: "Telegram user IDs allowed to approve exec requests for this bot account. Use numeric Telegram user IDs. If you leave this unset, OpenClaw falls back to numeric owner IDs inferred from channels.telegram.allowFrom and direct-message defaultTo when possible."
			},
			"execApprovals.agentFilter": {
				label: "Telegram Exec Approval Agent Filter",
				help: "Optional allowlist of agent IDs eligible for Telegram exec approvals, for example `[\"main\", \"ops-agent\"]`. Use this to keep approval prompts scoped to the agents you actually operate from Telegram."
			},
			"execApprovals.sessionFilter": {
				label: "Telegram Exec Approval Session Filter",
				help: "Optional session-key filters matched as substring or regex-style patterns before Telegram approval routing is used. Use narrow patterns so Telegram approvals only appear for intended sessions."
			},
			"execApprovals.target": {
				label: "Telegram Exec Approval Target",
				help: "Controls where Telegram approval prompts are sent: \"dm\" sends to approver DMs (default), \"channel\" sends to the originating Telegram chat/topic, and \"both\" sends to both. Channel delivery exposes the command text to the chat, so only use it in trusted groups/topics."
			},
			"threadBindings.enabled": {
				label: "Telegram Thread Binding Enabled",
				help: "Enable Telegram conversation binding features (/focus, /unfocus, /agents, and /session idle|max-age). Overrides session.threadBindings.enabled when set."
			},
			"threadBindings.idleHours": {
				label: "Telegram Thread Binding Idle Timeout (hours)",
				help: "Inactivity window in hours for Telegram bound sessions. Set 0 to disable idle auto-unfocus (default: 24). Overrides session.threadBindings.idleHours when set."
			},
			"threadBindings.maxAgeHours": {
				label: "Telegram Thread Binding Max Age (hours)",
				help: "Optional hard max age in hours for Telegram bound sessions. Set 0 to disable hard cap (default: 0). Overrides session.threadBindings.maxAgeHours when set."
			},
			"threadBindings.spawnSubagentSessions": {
				label: "Telegram Thread-Bound Subagent Spawn",
				help: "Allow subagent spawns with thread=true to auto-bind Telegram current conversations when supported."
			},
			"threadBindings.spawnAcpSessions": {
				label: "Telegram Thread-Bound ACP Spawn",
				help: "Allow ACP spawns with thread=true to auto-bind Telegram current conversations when supported."
			}
		}
	},
	{
		pluginId: "tlon",
		channelId: "tlon",
		label: "Tlon",
		description: "decentralized messaging on Urbit; install the plugin to enable.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				ship: {
					type: "string",
					minLength: 1
				},
				url: { type: "string" },
				code: { type: "string" },
				network: {
					type: "object",
					properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
					additionalProperties: false
				},
				groupChannels: {
					type: "array",
					items: {
						type: "string",
						minLength: 1
					}
				},
				dmAllowlist: {
					type: "array",
					items: {
						type: "string",
						minLength: 1
					}
				},
				autoDiscoverChannels: { type: "boolean" },
				showModelSignature: { type: "boolean" },
				responsePrefix: { type: "string" },
				autoAcceptDmInvites: { type: "boolean" },
				autoAcceptGroupInvites: { type: "boolean" },
				ownerShip: {
					type: "string",
					minLength: 1
				},
				authorization: {
					type: "object",
					properties: { channelRules: {
						type: "object",
						propertyNames: { type: "string" },
						additionalProperties: {
							type: "object",
							properties: {
								mode: {
									type: "string",
									enum: ["restricted", "open"]
								},
								allowedShips: {
									type: "array",
									items: {
										type: "string",
										minLength: 1
									}
								}
							},
							additionalProperties: false
						}
					} },
					additionalProperties: false
				},
				defaultAuthorizedShips: {
					type: "array",
					items: {
						type: "string",
						minLength: 1
					}
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							ship: {
								type: "string",
								minLength: 1
							},
							url: { type: "string" },
							code: { type: "string" },
							network: {
								type: "object",
								properties: { dangerouslyAllowPrivateNetwork: { type: "boolean" } },
								additionalProperties: false
							},
							groupChannels: {
								type: "array",
								items: {
									type: "string",
									minLength: 1
								}
							},
							dmAllowlist: {
								type: "array",
								items: {
									type: "string",
									minLength: 1
								}
							},
							autoDiscoverChannels: { type: "boolean" },
							showModelSignature: { type: "boolean" },
							responsePrefix: { type: "string" },
							autoAcceptDmInvites: { type: "boolean" },
							autoAcceptGroupInvites: { type: "boolean" },
							ownerShip: {
								type: "string",
								minLength: 1
							}
						},
						additionalProperties: false
					}
				}
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "twitch",
		channelId: "twitch",
		label: "Twitch",
		description: "Twitch chat integration",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			anyOf: [{ allOf: [{
				type: "object",
				properties: {
					name: { type: "string" },
					enabled: { type: "boolean" },
					markdown: {
						type: "object",
						properties: { tables: {
							type: "string",
							enum: [
								"off",
								"bullets",
								"code",
								"block"
							]
						} },
						additionalProperties: false
					}
				},
				additionalProperties: false
			}, {
				type: "object",
				properties: {
					username: { type: "string" },
					accessToken: { type: "string" },
					clientId: { type: "string" },
					channel: {
						type: "string",
						minLength: 1
					},
					enabled: { type: "boolean" },
					allowFrom: {
						type: "array",
						items: { type: "string" }
					},
					allowedRoles: {
						type: "array",
						items: {
							type: "string",
							enum: [
								"moderator",
								"owner",
								"vip",
								"subscriber",
								"all"
							]
						}
					},
					requireMention: { type: "boolean" },
					responsePrefix: { type: "string" },
					clientSecret: { type: "string" },
					refreshToken: { type: "string" },
					expiresIn: { anyOf: [{ type: "number" }, { type: "null" }] },
					obtainmentTimestamp: { type: "number" }
				},
				required: [
					"username",
					"accessToken",
					"channel"
				],
				additionalProperties: false
			}] }, { allOf: [{
				type: "object",
				properties: {
					name: { type: "string" },
					enabled: { type: "boolean" },
					markdown: {
						type: "object",
						properties: { tables: {
							type: "string",
							enum: [
								"off",
								"bullets",
								"code",
								"block"
							]
						} },
						additionalProperties: false
					}
				},
				additionalProperties: false
			}, {
				type: "object",
				properties: { accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							username: { type: "string" },
							accessToken: { type: "string" },
							clientId: { type: "string" },
							channel: {
								type: "string",
								minLength: 1
							},
							enabled: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { type: "string" }
							},
							allowedRoles: {
								type: "array",
								items: {
									type: "string",
									enum: [
										"moderator",
										"owner",
										"vip",
										"subscriber",
										"all"
									]
								}
							},
							requireMention: { type: "boolean" },
							responsePrefix: { type: "string" },
							clientSecret: { type: "string" },
							refreshToken: { type: "string" },
							expiresIn: { anyOf: [{ type: "number" }, { type: "null" }] },
							obtainmentTimestamp: { type: "number" }
						},
						required: [
							"username",
							"accessToken",
							"channel"
						],
						additionalProperties: false
					}
				} },
				required: ["accounts"],
				additionalProperties: false
			}] }]
		}
	},
	{
		pluginId: "whatsapp",
		channelId: "whatsapp",
		label: "WhatsApp",
		description: "works with your own number; recommend a separate phone + eSIM.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				enabled: { type: "boolean" },
				capabilities: {
					type: "array",
					items: { type: "string" }
				},
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				configWrites: { type: "boolean" },
				sendReadReceipts: { type: "boolean" },
				messagePrefix: { type: "string" },
				responsePrefix: { type: "string" },
				dmPolicy: {
					default: "pairing",
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				selfChatMode: { type: "boolean" },
				allowFrom: {
					type: "array",
					items: { type: "string" }
				},
				defaultTo: { type: "string" },
				groupAllowFrom: {
					type: "array",
					items: { type: "string" }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				contextVisibility: {
					type: "string",
					enum: [
						"all",
						"allowlist",
						"allowlist_quote"
					]
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dmHistoryLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				dms: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: { historyLimit: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						} },
						additionalProperties: false
					}
				},
				textChunkLimit: {
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				chunkMode: {
					type: "string",
					enum: ["length", "newline"]
				},
				blockStreaming: { type: "boolean" },
				blockStreamingCoalesce: {
					type: "object",
					properties: {
						minChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						maxChars: {
							type: "integer",
							exclusiveMinimum: 0,
							maximum: 9007199254740991
						},
						idleMs: {
							type: "integer",
							minimum: 0,
							maximum: 9007199254740991
						}
					},
					additionalProperties: false
				},
				groups: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							},
							toolsBySender: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										allow: {
											type: "array",
											items: { type: "string" }
										},
										alsoAllow: {
											type: "array",
											items: { type: "string" }
										},
										deny: {
											type: "array",
											items: { type: "string" }
										}
									},
									additionalProperties: false
								}
							}
						},
						additionalProperties: false
					}
				},
				ackReaction: {
					type: "object",
					properties: {
						emoji: { type: "string" },
						direct: {
							default: true,
							type: "boolean"
						},
						group: {
							default: "mentions",
							type: "string",
							enum: [
								"always",
								"mentions",
								"never"
							]
						}
					},
					required: ["direct", "group"],
					additionalProperties: false
				},
				reactionLevel: {
					type: "string",
					enum: [
						"off",
						"ack",
						"minimal",
						"extensive"
					]
				},
				debounceMs: {
					default: 0,
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				heartbeat: {
					type: "object",
					properties: {
						showOk: { type: "boolean" },
						showAlerts: { type: "boolean" },
						useIndicator: { type: "boolean" }
					},
					additionalProperties: false
				},
				healthMonitor: {
					type: "object",
					properties: { enabled: { type: "boolean" } },
					additionalProperties: false
				},
				accounts: {
					type: "object",
					propertyNames: { type: "string" },
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							capabilities: {
								type: "array",
								items: { type: "string" }
							},
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							configWrites: { type: "boolean" },
							sendReadReceipts: { type: "boolean" },
							messagePrefix: { type: "string" },
							responsePrefix: { type: "string" },
							dmPolicy: {
								default: "pairing",
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							selfChatMode: { type: "boolean" },
							allowFrom: {
								type: "array",
								items: { type: "string" }
							},
							defaultTo: { type: "string" },
							groupAllowFrom: {
								type: "array",
								items: { type: "string" }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							contextVisibility: {
								type: "string",
								enum: [
									"all",
									"allowlist",
									"allowlist_quote"
								]
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dmHistoryLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							dms: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: { historyLimit: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									} },
									additionalProperties: false
								}
							},
							textChunkLimit: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							},
							chunkMode: {
								type: "string",
								enum: ["length", "newline"]
							},
							blockStreaming: { type: "boolean" },
							blockStreamingCoalesce: {
								type: "object",
								properties: {
									minChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									maxChars: {
										type: "integer",
										exclusiveMinimum: 0,
										maximum: 9007199254740991
									},
									idleMs: {
										type: "integer",
										minimum: 0,
										maximum: 9007199254740991
									}
								},
								additionalProperties: false
							},
							groups: {
								type: "object",
								propertyNames: { type: "string" },
								additionalProperties: {
									type: "object",
									properties: {
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										},
										toolsBySender: {
											type: "object",
											propertyNames: { type: "string" },
											additionalProperties: {
												type: "object",
												properties: {
													allow: {
														type: "array",
														items: { type: "string" }
													},
													alsoAllow: {
														type: "array",
														items: { type: "string" }
													},
													deny: {
														type: "array",
														items: { type: "string" }
													}
												},
												additionalProperties: false
											}
										}
									},
									additionalProperties: false
								}
							},
							ackReaction: {
								type: "object",
								properties: {
									emoji: { type: "string" },
									direct: {
										default: true,
										type: "boolean"
									},
									group: {
										default: "mentions",
										type: "string",
										enum: [
											"always",
											"mentions",
											"never"
										]
									}
								},
								required: ["direct", "group"],
								additionalProperties: false
							},
							reactionLevel: {
								type: "string",
								enum: [
									"off",
									"ack",
									"minimal",
									"extensive"
								]
							},
							debounceMs: {
								default: 0,
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							heartbeat: {
								type: "object",
								properties: {
									showOk: { type: "boolean" },
									showAlerts: { type: "boolean" },
									useIndicator: { type: "boolean" }
								},
								additionalProperties: false
							},
							healthMonitor: {
								type: "object",
								properties: { enabled: { type: "boolean" } },
								additionalProperties: false
							},
							name: { type: "string" },
							authDir: { type: "string" },
							mediaMaxMb: {
								type: "integer",
								exclusiveMinimum: 0,
								maximum: 9007199254740991
							}
						},
						required: [
							"dmPolicy",
							"groupPolicy",
							"debounceMs"
						],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" },
				mediaMaxMb: {
					default: 50,
					type: "integer",
					exclusiveMinimum: 0,
					maximum: 9007199254740991
				},
				actions: {
					type: "object",
					properties: {
						reactions: { type: "boolean" },
						sendMessage: { type: "boolean" },
						polls: { type: "boolean" }
					},
					additionalProperties: false
				}
			},
			required: [
				"dmPolicy",
				"groupPolicy",
				"debounceMs",
				"mediaMaxMb"
			],
			additionalProperties: false
		},
		uiHints: {
			"": {
				label: "WhatsApp",
				help: "WhatsApp channel provider configuration for access policy and message batching behavior. Use this section to tune responsiveness and direct-message routing safety for WhatsApp chats."
			},
			dmPolicy: {
				label: "WhatsApp DM Policy",
				help: "Direct message access control (\"pairing\" recommended). \"open\" requires channels.whatsapp.allowFrom=[\"*\"]."
			},
			selfChatMode: {
				label: "WhatsApp Self-Phone Mode",
				help: "Same-phone setup (bot uses your personal WhatsApp number)."
			},
			debounceMs: {
				label: "WhatsApp Message Debounce (ms)",
				help: "Debounce window (ms) for batching rapid consecutive messages from the same sender (0 to disable)."
			},
			configWrites: {
				label: "WhatsApp Config Writes",
				help: "Allow WhatsApp to write config in response to channel events/commands (default: true)."
			}
		}
	},
	{
		pluginId: "zalo",
		channelId: "zalo",
		label: "Zalo",
		description: "Vietnam-focused messaging platform with Bot API.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				botToken: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				tokenFile: { type: "string" },
				webhookUrl: { type: "string" },
				webhookSecret: { anyOf: [{ type: "string" }, { oneOf: [
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "env"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: {
								type: "string",
								pattern: "^[A-Z][A-Z0-9_]{0,127}$"
							}
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "file"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					},
					{
						type: "object",
						properties: {
							source: {
								type: "string",
								const: "exec"
							},
							provider: {
								type: "string",
								pattern: "^[a-z][a-z0-9_-]{0,63}$"
							},
							id: { type: "string" }
						},
						required: [
							"source",
							"provider",
							"id"
						],
						additionalProperties: false
					}
				] }] },
				webhookPath: { type: "string" },
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				mediaMaxMb: { type: "number" },
				proxy: { type: "string" },
				responsePrefix: { type: "string" },
				accounts: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							botToken: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							tokenFile: { type: "string" },
							webhookUrl: { type: "string" },
							webhookSecret: { anyOf: [{ type: "string" }, { oneOf: [
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "env"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: {
											type: "string",
											pattern: "^[A-Z][A-Z0-9_]{0,127}$"
										}
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "file"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								},
								{
									type: "object",
									properties: {
										source: {
											type: "string",
											const: "exec"
										},
										provider: {
											type: "string",
											pattern: "^[a-z][a-z0-9_-]{0,63}$"
										},
										id: { type: "string" }
									},
									required: [
										"source",
										"provider",
										"id"
									],
									additionalProperties: false
								}
							] }] },
							webhookPath: { type: "string" },
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							mediaMaxMb: { type: "number" },
							proxy: { type: "string" },
							responsePrefix: { type: "string" }
						},
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			additionalProperties: false
		}
	},
	{
		pluginId: "zalouser",
		channelId: "zalouser",
		label: "Zalo Personal",
		description: "Zalo personal account via QR code login.",
		schema: {
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "object",
			properties: {
				name: { type: "string" },
				enabled: { type: "boolean" },
				markdown: {
					type: "object",
					properties: { tables: {
						type: "string",
						enum: [
							"off",
							"bullets",
							"code",
							"block"
						]
					} },
					additionalProperties: false
				},
				profile: { type: "string" },
				dangerouslyAllowNameMatching: { type: "boolean" },
				dmPolicy: {
					type: "string",
					enum: [
						"pairing",
						"allowlist",
						"open",
						"disabled"
					]
				},
				allowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				historyLimit: {
					type: "integer",
					minimum: 0,
					maximum: 9007199254740991
				},
				groupAllowFrom: {
					type: "array",
					items: { anyOf: [{ type: "string" }, { type: "number" }] }
				},
				groupPolicy: {
					default: "allowlist",
					type: "string",
					enum: [
						"open",
						"disabled",
						"allowlist"
					]
				},
				groups: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							enabled: { type: "boolean" },
							requireMention: { type: "boolean" },
							tools: {
								type: "object",
								properties: {
									allow: {
										type: "array",
										items: { type: "string" }
									},
									alsoAllow: {
										type: "array",
										items: { type: "string" }
									},
									deny: {
										type: "array",
										items: { type: "string" }
									}
								},
								additionalProperties: false
							}
						},
						additionalProperties: false
					}
				},
				messagePrefix: { type: "string" },
				responsePrefix: { type: "string" },
				accounts: {
					type: "object",
					properties: {},
					additionalProperties: {
						type: "object",
						properties: {
							name: { type: "string" },
							enabled: { type: "boolean" },
							markdown: {
								type: "object",
								properties: { tables: {
									type: "string",
									enum: [
										"off",
										"bullets",
										"code",
										"block"
									]
								} },
								additionalProperties: false
							},
							profile: { type: "string" },
							dangerouslyAllowNameMatching: { type: "boolean" },
							dmPolicy: {
								type: "string",
								enum: [
									"pairing",
									"allowlist",
									"open",
									"disabled"
								]
							},
							allowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							historyLimit: {
								type: "integer",
								minimum: 0,
								maximum: 9007199254740991
							},
							groupAllowFrom: {
								type: "array",
								items: { anyOf: [{ type: "string" }, { type: "number" }] }
							},
							groupPolicy: {
								default: "allowlist",
								type: "string",
								enum: [
									"open",
									"disabled",
									"allowlist"
								]
							},
							groups: {
								type: "object",
								properties: {},
								additionalProperties: {
									type: "object",
									properties: {
										enabled: { type: "boolean" },
										requireMention: { type: "boolean" },
										tools: {
											type: "object",
											properties: {
												allow: {
													type: "array",
													items: { type: "string" }
												},
												alsoAllow: {
													type: "array",
													items: { type: "string" }
												},
												deny: {
													type: "array",
													items: { type: "string" }
												}
											},
											additionalProperties: false
										}
									},
									additionalProperties: false
								}
							},
							messagePrefix: { type: "string" },
							responsePrefix: { type: "string" }
						},
						required: ["groupPolicy"],
						additionalProperties: false
					}
				},
				defaultAccount: { type: "string" }
			},
			required: ["groupPolicy"],
			additionalProperties: false
		}
	}
];
//#endregion
//#region src/config/channel-config-metadata.ts
const PLUGIN_ORIGIN_RANK = {
	config: 0,
	workspace: 1,
	global: 2,
	bundled: 3
};
function collectPluginSchemaMetadata(registry) {
	const deduped = /* @__PURE__ */ new Map();
	for (const record of registry.plugins) {
		const current = deduped.get(record.id);
		const nextRank = PLUGIN_ORIGIN_RANK[record.origin] ?? Number.MAX_SAFE_INTEGER;
		if (current && current.originRank <= nextRank) continue;
		deduped.set(record.id, {
			id: record.id,
			name: record.name,
			description: record.description,
			configUiHints: record.configUiHints,
			configSchema: record.configSchema,
			originRank: nextRank
		});
	}
	return [...deduped.values()].toSorted((left, right) => left.id.localeCompare(right.id)).map(({ originRank: _originRank, ...record }) => record);
}
function collectChannelSchemaMetadata(registry) {
	const byChannelId = /* @__PURE__ */ new Map();
	for (const record of registry.plugins) {
		const originRank = PLUGIN_ORIGIN_RANK[record.origin] ?? Number.MAX_SAFE_INTEGER;
		const rootLabel = record.channelCatalogMeta?.label;
		const rootDescription = record.channelCatalogMeta?.blurb;
		for (const channelId of record.channels) {
			const current = byChannelId.get(channelId);
			if (!current || originRank <= current.originRank) byChannelId.set(channelId, {
				id: channelId,
				label: rootLabel ?? current?.label,
				description: rootDescription ?? current?.description,
				configSchema: current?.configSchema,
				configUiHints: current?.configUiHints,
				originRank
			});
		}
		for (const [channelId, channelConfig] of Object.entries(record.channelConfigs ?? {})) {
			const current = byChannelId.get(channelId);
			if (current && current.originRank < originRank) continue;
			byChannelId.set(channelId, {
				id: channelId,
				label: channelConfig.label ?? rootLabel ?? current?.label,
				description: channelConfig.description ?? rootDescription ?? current?.description,
				configSchema: channelConfig.schema,
				configUiHints: channelConfig.uiHints,
				originRank
			});
		}
	}
	return [...byChannelId.values()].toSorted((left, right) => left.id.localeCompare(right.id)).map(({ originRank: _originRank, ...entry }) => entry);
}
//#endregion
//#region src/config/validation.ts
const LEGACY_REMOVED_PLUGIN_IDS = new Set(["google-antigravity-auth", "google-gemini-cli-auth"]);
const CUSTOM_EXPECTED_ONE_OF_RE = /expected one of ((?:"[^"]+"(?:\|"?[^"]+"?)*)+)/i;
const SECRETREF_POLICY_DOC_URL = "https://docs.openclaw.ai/reference/secretref-credential-surface";
const bundledChannelSchemaById = new Map(GENERATED_BUNDLED_CHANNEL_CONFIG_METADATA.map((entry) => [entry.channelId, entry.schema]));
function toIssueRecord(value) {
	if (!value || typeof value !== "object") return null;
	return value;
}
function toConfigPathSegments(path) {
	if (!Array.isArray(path)) return [];
	return path.filter((segment) => {
		const segmentType = typeof segment;
		return segmentType === "string" || segmentType === "number";
	});
}
function formatConfigPath(segments) {
	return segments.join(".");
}
function asJsonSchemaLike(value) {
	return value && typeof value === "object" ? value : null;
}
function lookupJsonSchemaNode(schema, pathSegments) {
	let current = asJsonSchemaLike(schema);
	for (const segment of pathSegments) {
		if (!current) return null;
		if (typeof segment === "number") {
			const items = current.items;
			if (Array.isArray(items)) {
				current = asJsonSchemaLike(items[segment] ?? items[0]);
				continue;
			}
			current = asJsonSchemaLike(items);
			continue;
		}
		const properties = asJsonSchemaLike(current.properties);
		current = properties && asJsonSchemaLike(properties[segment]) || asJsonSchemaLike(current.additionalProperties);
	}
	return current;
}
function collectAllowedValuesFromJsonSchemaNode(schema) {
	const node = asJsonSchemaLike(schema);
	if (!node) return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	if (Object.prototype.hasOwnProperty.call(node, "const")) return {
		values: [node.const],
		incomplete: false,
		hasValues: true
	};
	if (Array.isArray(node.enum)) return {
		values: node.enum,
		incomplete: false,
		hasValues: node.enum.length > 0
	};
	const type = node.type;
	if (type === "boolean") return {
		values: [true, false],
		incomplete: false,
		hasValues: true
	};
	if (Array.isArray(type) && type.includes("boolean")) return {
		values: [true, false],
		incomplete: false,
		hasValues: true
	};
	const unionBranches = Array.isArray(node.anyOf) ? node.anyOf : Array.isArray(node.oneOf) ? node.oneOf : null;
	if (!unionBranches) return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	const collected = [];
	for (const branch of unionBranches) {
		const branchCollected = collectAllowedValuesFromJsonSchemaNode(branch);
		if (branchCollected.incomplete || !branchCollected.hasValues) return {
			values: [],
			incomplete: true,
			hasValues: false
		};
		collected.push(...branchCollected.values);
	}
	return {
		values: collected,
		incomplete: false,
		hasValues: collected.length > 0
	};
}
function collectAllowedValuesFromBundledChannelSchemaPath(pathSegments) {
	if (pathSegments[0] !== "channels" || typeof pathSegments[1] !== "string") return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	const channelSchema = bundledChannelSchemaById.get(pathSegments[1]);
	if (!channelSchema) return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	const targetNode = lookupJsonSchemaNode(channelSchema, pathSegments.slice(2));
	if (!targetNode) return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	return collectAllowedValuesFromJsonSchemaNode(targetNode);
}
function collectAllowedValuesFromCustomIssue(record) {
	const expectedMatch = (typeof record.message === "string" ? record.message : "").match(CUSTOM_EXPECTED_ONE_OF_RE);
	if (expectedMatch?.[1]) {
		const values = [...expectedMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
		return {
			values,
			incomplete: false,
			hasValues: values.length > 0
		};
	}
	return collectAllowedValuesFromBundledChannelSchemaPath(toConfigPathSegments(record.path));
}
function collectAllowedValuesFromIssue(issue) {
	const record = toIssueRecord(issue);
	if (!record) return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	const code = typeof record.code === "string" ? record.code : "";
	if (code === "invalid_value") {
		const values = record.values;
		if (!Array.isArray(values)) return {
			values: [],
			incomplete: true,
			hasValues: false
		};
		return {
			values,
			incomplete: false,
			hasValues: values.length > 0
		};
	}
	if (code === "invalid_type") {
		if ((typeof record.expected === "string" ? record.expected : "") === "boolean") return {
			values: [true, false],
			incomplete: false,
			hasValues: true
		};
		return {
			values: [],
			incomplete: true,
			hasValues: false
		};
	}
	if (code === "custom") return collectAllowedValuesFromCustomIssue(record);
	if (code !== "invalid_union") return {
		values: [],
		incomplete: false,
		hasValues: false
	};
	const nested = record.errors;
	if (!Array.isArray(nested) || nested.length === 0) return {
		values: [],
		incomplete: true,
		hasValues: false
	};
	const collected = [];
	for (const branch of nested) {
		if (!Array.isArray(branch) || branch.length === 0) return {
			values: [],
			incomplete: true,
			hasValues: false
		};
		const branchCollected = collectAllowedValuesFromIssueList(branch);
		if (branchCollected.incomplete || !branchCollected.hasValues) return {
			values: [],
			incomplete: true,
			hasValues: false
		};
		collected.push(...branchCollected.values);
	}
	return {
		values: collected,
		incomplete: false,
		hasValues: collected.length > 0
	};
}
function collectAllowedValuesFromIssueList(issues) {
	const collected = [];
	let hasValues = false;
	for (const issue of issues) {
		const branch = collectAllowedValuesFromIssue(issue);
		if (branch.incomplete) return {
			values: [],
			incomplete: true,
			hasValues: false
		};
		if (!branch.hasValues) continue;
		hasValues = true;
		collected.push(...branch.values);
	}
	return {
		values: collected,
		incomplete: false,
		hasValues
	};
}
function collectAllowedValuesFromUnknownIssue(issue) {
	const collection = collectAllowedValuesFromIssue(issue);
	if (collection.incomplete || !collection.hasValues) return [];
	return collection.values;
}
function isObjectSecretRefCandidate(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	return coerceSecretRef(value) !== null;
}
function formatUnsupportedMutableSecretRefMessage(path) {
	return [
		`SecretRef objects are not supported at ${path}.`,
		"This credential is runtime-mutable or runtime-managed and must stay a plain string value.",
		"Use a plain string (env template strings like \"${MY_VAR}\" are allowed).",
		`See ${SECRETREF_POLICY_DOC_URL}.`
	].join(" ");
}
function pushUnsupportedMutableSecretRefIssue(issues, path, value) {
	if (!isObjectSecretRefCandidate(value)) return;
	issues.push({
		path,
		message: formatUnsupportedMutableSecretRefMessage(path)
	});
}
function collectUnsupportedMutableSecretRefIssues(raw) {
	const issues = [];
	for (const candidate of collectUnsupportedSecretRefConfigCandidates(raw)) pushUnsupportedMutableSecretRefIssue(issues, candidate.path, candidate.value);
	return issues;
}
function isUnsupportedMutableSecretRefSchemaIssue(params) {
	const { issue, policyIssue } = params;
	if (issue.path === policyIssue.path) return /expected string, received object/i.test(issue.message);
	if (!issue.path || !policyIssue.path || !policyIssue.path.startsWith(`${issue.path}.`)) return false;
	const childKey = policyIssue.path.slice(issue.path.length + 1).split(".")[0];
	if (!childKey) return false;
	if (!/Unrecognized key/i.test(issue.message)) return false;
	const unrecognizedKeys = [...issue.message.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
	if (unrecognizedKeys.length === 0) return false;
	return unrecognizedKeys.length === 1 && unrecognizedKeys[0] === childKey;
}
function mergeUnsupportedMutableSecretRefIssues(policyIssues, schemaIssues) {
	if (policyIssues.length === 0) return schemaIssues;
	const filteredSchemaIssues = schemaIssues.filter((issue) => !policyIssues.some((policyIssue) => isUnsupportedMutableSecretRefSchemaIssue({
		issue,
		policyIssue
	})));
	return [...policyIssues, ...filteredSchemaIssues];
}
function collectUnsupportedSecretRefPolicyIssues(raw) {
	return collectUnsupportedMutableSecretRefIssues(raw);
}
function mapZodIssueToConfigIssue(issue) {
	const record = toIssueRecord(issue);
	const path = formatConfigPath(toConfigPathSegments(record?.path));
	const message = typeof record?.message === "string" ? record.message : "Invalid input";
	const allowedValuesSummary = summarizeAllowedValues(collectAllowedValuesFromUnknownIssue(issue));
	if (!allowedValuesSummary) return {
		path,
		message
	};
	return {
		path,
		message: appendAllowedValuesHint(message, allowedValuesSummary),
		allowedValues: allowedValuesSummary.values,
		allowedValuesHiddenCount: allowedValuesSummary.hiddenCount
	};
}
function isWorkspaceAvatarPath(value, workspaceDir) {
	const workspaceRoot = path.resolve(workspaceDir);
	return isPathWithinRoot(workspaceRoot, path.resolve(workspaceRoot, value));
}
function validateIdentityAvatar(config) {
	const agents = config.agents?.list;
	if (!Array.isArray(agents) || agents.length === 0) return [];
	const issues = [];
	for (const [index, entry] of agents.entries()) {
		if (!entry || typeof entry !== "object") continue;
		const avatarRaw = entry.identity?.avatar;
		if (typeof avatarRaw !== "string") continue;
		const avatar = avatarRaw.trim();
		if (!avatar) continue;
		if (isAvatarDataUrl(avatar) || isAvatarHttpUrl(avatar)) continue;
		if (avatar.startsWith("~")) {
			issues.push({
				path: `agents.list.${index}.identity.avatar`,
				message: "identity.avatar must be a workspace-relative path, http(s) URL, or data URI."
			});
			continue;
		}
		if (hasAvatarUriScheme(avatar) && !isWindowsAbsolutePath(avatar)) {
			issues.push({
				path: `agents.list.${index}.identity.avatar`,
				message: "identity.avatar must be a workspace-relative path, http(s) URL, or data URI."
			});
			continue;
		}
		if (!isWorkspaceAvatarPath(avatar, resolveAgentWorkspaceDir(config, entry.id ?? resolveDefaultAgentId(config)))) issues.push({
			path: `agents.list.${index}.identity.avatar`,
			message: "identity.avatar must stay within the agent workspace."
		});
	}
	return issues;
}
function validateGatewayTailscaleBind(config) {
	const tailscaleMode = config.gateway?.tailscale?.mode ?? "off";
	if (tailscaleMode !== "serve" && tailscaleMode !== "funnel") return [];
	const bindMode = config.gateway?.bind ?? "loopback";
	if (bindMode === "loopback") return [];
	const customBindHost = config.gateway?.customBindHost;
	if (bindMode === "custom" && isCanonicalDottedDecimalIPv4(customBindHost) && isLoopbackIpAddress(customBindHost)) return [];
	return [{
		path: "gateway.bind",
		message: `gateway.bind must resolve to loopback when gateway.tailscale.mode=${tailscaleMode} (use gateway.bind="loopback" or gateway.bind="custom" with gateway.customBindHost="127.0.0.1")`
	}];
}
/**
* Validates config without applying runtime defaults.
* Use this when you need the raw validated config (e.g., for writing back to file).
*/
function validateConfigObjectRaw(raw) {
	const policyIssues = collectUnsupportedSecretRefPolicyIssues(raw);
	const legacyIssues = findLegacyConfigIssues(raw, raw, listPluginDoctorLegacyConfigRules());
	if (legacyIssues.length > 0) return {
		ok: false,
		issues: legacyIssues.map((iss) => ({
			path: iss.path,
			message: iss.message
		}))
	};
	const validated = OpenClawSchema.safeParse(raw);
	if (!validated.success) return {
		ok: false,
		issues: mergeUnsupportedMutableSecretRefIssues(policyIssues, validated.error.issues.map((issue) => mapZodIssueToConfigIssue(issue)))
	};
	if (policyIssues.length > 0) return {
		ok: false,
		issues: policyIssues
	};
	const validatedConfig = validated.data;
	const duplicates = findDuplicateAgentDirs(validatedConfig);
	if (duplicates.length > 0) return {
		ok: false,
		issues: [{
			path: "agents.list",
			message: formatDuplicateAgentDirError(duplicates)
		}]
	};
	const avatarIssues = validateIdentityAvatar(validatedConfig);
	if (avatarIssues.length > 0) return {
		ok: false,
		issues: avatarIssues
	};
	const gatewayTailscaleBindIssues = validateGatewayTailscaleBind(validatedConfig);
	if (gatewayTailscaleBindIssues.length > 0) return {
		ok: false,
		issues: gatewayTailscaleBindIssues
	};
	return {
		ok: true,
		config: validatedConfig
	};
}
function validateConfigObject(raw) {
	const result = validateConfigObjectRaw(raw);
	if (!result.ok) return result;
	return {
		ok: true,
		config: materializeRuntimeConfig(result.config, "snapshot")
	};
}
function validateConfigObjectWithPlugins(raw, params) {
	return validateConfigObjectWithPluginsBase(raw, {
		applyDefaults: true,
		env: params?.env
	});
}
function validateConfigObjectRawWithPlugins(raw, params) {
	return validateConfigObjectWithPluginsBase(raw, {
		applyDefaults: false,
		env: params?.env
	});
}
function validateConfigObjectWithPluginsBase(raw, opts) {
	const base = opts.applyDefaults ? validateConfigObject(raw) : validateConfigObjectRaw(raw);
	if (!base.ok) return {
		ok: false,
		issues: base.issues,
		warnings: []
	};
	const config = base.config;
	const issues = [];
	const warnings = [];
	const hasExplicitPluginsConfig = isRecord$2(raw) && Object.prototype.hasOwnProperty.call(raw, "plugins");
	const resolvePluginConfigIssuePath = (pluginId, errorPath) => {
		const base = `plugins.entries.${pluginId}.config`;
		if (!errorPath || errorPath === "<root>") return base;
		return `${base}.${errorPath}`;
	};
	let registryInfo = null;
	let compatConfig;
	let compatPluginIds = null;
	let compatPluginIdsResolved = false;
	const ensureCompatPluginIds = () => {
		if (compatPluginIdsResolved) return compatPluginIds ?? /* @__PURE__ */ new Set();
		compatPluginIdsResolved = true;
		const allow = config.plugins?.allow;
		if (!Array.isArray(allow) || allow.length === 0) {
			compatPluginIds = /* @__PURE__ */ new Set();
			return compatPluginIds;
		}
		const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
		compatPluginIds = new Set(resolveManifestContractPluginIds({
			contract: "webSearchProviders",
			origin: "bundled",
			config,
			workspaceDir: workspaceDir ?? void 0,
			env: opts.env
		}));
		return compatPluginIds;
	};
	const ensureCompatConfig = () => {
		if (compatConfig !== void 0) return compatConfig ?? config;
		const allow = config.plugins?.allow;
		if (!Array.isArray(allow) || allow.length === 0) {
			compatConfig = config;
			return config;
		}
		compatConfig = withBundledPluginAllowlistCompat({
			config,
			pluginIds: [...ensureCompatPluginIds()]
		});
		return compatConfig ?? config;
	};
	const ensureRegistry = () => {
		if (registryInfo) return registryInfo;
		const effectiveConfig = ensureCompatConfig();
		const registry = loadPluginManifestRegistry({
			config: effectiveConfig,
			workspaceDir: resolveAgentWorkspaceDir(effectiveConfig, resolveDefaultAgentId(effectiveConfig)) ?? void 0,
			env: opts.env
		});
		for (const diag of registry.diagnostics) {
			let path = diag.pluginId ? `plugins.entries.${diag.pluginId}` : "plugins";
			if (!diag.pluginId && diag.message.includes("plugin path not found")) path = "plugins.load.paths";
			const message = `${diag.pluginId ? `plugin ${diag.pluginId}` : "plugin"}: ${diag.message}`;
			if (diag.level === "error") issues.push({
				path,
				message
			});
			else warnings.push({
				path,
				message
			});
		}
		registryInfo = { registry };
		return registryInfo;
	};
	const ensureKnownIds = () => {
		const info = ensureRegistry();
		if (!info.knownIds) info.knownIds = new Set(info.registry.plugins.map((record) => record.id));
		return info.knownIds;
	};
	const ensureNormalizedPlugins = () => {
		const info = ensureRegistry();
		if (!info.normalizedPlugins) info.normalizedPlugins = normalizePluginsConfig(ensureCompatConfig().plugins);
		return info.normalizedPlugins;
	};
	const ensureChannelSchemas = () => {
		const info = ensureRegistry();
		if (!info.channelSchemas) info.channelSchemas = new Map(collectChannelSchemaMetadata(info.registry).map((entry) => [entry.id, { schema: entry.configSchema }]));
		return info.channelSchemas;
	};
	let mutatedConfig = config;
	let channelsCloned = false;
	let pluginsCloned = false;
	let pluginEntriesCloned = false;
	const replaceChannelConfig = (channelId, nextValue) => {
		if (!channelsCloned) {
			mutatedConfig = {
				...mutatedConfig,
				channels: { ...mutatedConfig.channels }
			};
			channelsCloned = true;
		}
		mutatedConfig.channels[channelId] = nextValue;
	};
	const replacePluginEntryConfig = (pluginId, nextValue) => {
		if (!pluginsCloned) {
			mutatedConfig = {
				...mutatedConfig,
				plugins: { ...mutatedConfig.plugins }
			};
			pluginsCloned = true;
		}
		if (!pluginEntriesCloned) {
			mutatedConfig.plugins = {
				...mutatedConfig.plugins,
				entries: { ...mutatedConfig.plugins?.entries }
			};
			pluginEntriesCloned = true;
		}
		const currentEntry = mutatedConfig.plugins?.entries?.[pluginId];
		mutatedConfig.plugins.entries[pluginId] = {
			...currentEntry,
			config: nextValue
		};
	};
	const allowedChannels = new Set([
		"defaults",
		"modelByChannel",
		...CHANNEL_IDS
	]);
	if (config.channels && isRecord$2(config.channels)) for (const key of Object.keys(config.channels)) {
		const trimmed = key.trim();
		if (!trimmed) continue;
		if (!allowedChannels.has(trimmed)) {
			const { registry } = ensureRegistry();
			for (const record of registry.plugins) for (const channelId of record.channels) allowedChannels.add(channelId);
		}
		if (!allowedChannels.has(trimmed)) {
			issues.push({
				path: `channels.${trimmed}`,
				message: `unknown channel id: ${trimmed}`
			});
			continue;
		}
		const channelSchema = ensureChannelSchemas().get(trimmed)?.schema;
		if (!channelSchema) continue;
		const result = validateJsonSchemaValue({
			schema: channelSchema,
			cacheKey: `channel:${trimmed}`,
			value: config.channels[trimmed],
			applyDefaults: opts.applyDefaults
		});
		if (!result.ok) {
			for (const error of result.errors) issues.push({
				path: error.path === "<root>" ? `channels.${trimmed}` : `channels.${trimmed}.${error.path}`,
				message: `invalid config: ${error.message}`,
				allowedValues: error.allowedValues,
				allowedValuesHiddenCount: error.allowedValuesHiddenCount
			});
			continue;
		}
		replaceChannelConfig(trimmed, result.value);
	}
	const heartbeatChannelIds = /* @__PURE__ */ new Set();
	for (const channelId of CHANNEL_IDS) heartbeatChannelIds.add(channelId.toLowerCase());
	const validateHeartbeatTarget = (target, path) => {
		if (typeof target !== "string") return;
		const trimmed = target.trim();
		if (!trimmed) {
			issues.push({
				path,
				message: "heartbeat target must not be empty"
			});
			return;
		}
		const normalized = trimmed.toLowerCase();
		if (normalized === "last" || normalized === "none") return;
		if (normalizeChatChannelId(trimmed)) return;
		if (!heartbeatChannelIds.has(normalized)) {
			const { registry } = ensureRegistry();
			for (const record of registry.plugins) for (const channelId of record.channels) {
				const pluginChannel = channelId.trim();
				if (pluginChannel) heartbeatChannelIds.add(pluginChannel.toLowerCase());
			}
		}
		if (heartbeatChannelIds.has(normalized)) return;
		issues.push({
			path,
			message: `unknown heartbeat target: ${target}`
		});
	};
	validateHeartbeatTarget(config.agents?.defaults?.heartbeat?.target, "agents.defaults.heartbeat.target");
	if (Array.isArray(config.agents?.list)) for (const [index, entry] of config.agents.list.entries()) validateHeartbeatTarget(entry?.heartbeat?.target, `agents.list.${index}.heartbeat.target`);
	if (!hasExplicitPluginsConfig) {
		if (issues.length > 0) return {
			ok: false,
			issues,
			warnings
		};
		return {
			ok: true,
			config: mutatedConfig,
			warnings
		};
	}
	const { registry } = ensureRegistry();
	const knownIds = ensureKnownIds();
	const normalizedPlugins = ensureNormalizedPlugins();
	const effectiveConfig = ensureCompatConfig();
	const pushMissingPluginIssue = (path, pluginId, opts) => {
		if (LEGACY_REMOVED_PLUGIN_IDS.has(pluginId)) {
			warnings.push({
				path,
				message: `plugin removed: ${pluginId} (stale config entry ignored; remove it from plugins config)`
			});
			return;
		}
		if (opts?.warnOnly) {
			warnings.push({
				path,
				message: `plugin not found: ${pluginId} (stale config entry ignored; remove it from plugins config)`
			});
			return;
		}
		issues.push({
			path,
			message: `plugin not found: ${pluginId}`
		});
	};
	const pluginsConfig = config.plugins;
	const entries = pluginsConfig?.entries;
	if (entries && isRecord$2(entries)) {
		for (const pluginId of Object.keys(entries)) if (!knownIds.has(pluginId)) pushMissingPluginIssue(`plugins.entries.${pluginId}`, pluginId, { warnOnly: true });
	}
	const allow = pluginsConfig?.allow ?? [];
	for (const pluginId of allow) {
		if (typeof pluginId !== "string" || !pluginId.trim()) continue;
		if (!knownIds.has(pluginId)) pushMissingPluginIssue("plugins.allow", pluginId, { warnOnly: true });
	}
	const deny = pluginsConfig?.deny ?? [];
	for (const pluginId of deny) {
		if (typeof pluginId !== "string" || !pluginId.trim()) continue;
		if (!knownIds.has(pluginId)) pushMissingPluginIssue("plugins.deny", pluginId);
	}
	const pluginSlots = pluginsConfig?.slots;
	const hasExplicitMemorySlot = pluginSlots !== void 0 && Object.prototype.hasOwnProperty.call(pluginSlots, "memory");
	const memorySlot = normalizedPlugins.slots.memory;
	if (hasExplicitMemorySlot && typeof memorySlot === "string" && memorySlot.trim() && !knownIds.has(memorySlot)) pushMissingPluginIssue("plugins.slots.memory", memorySlot);
	let selectedMemoryPluginId = null;
	const seenPlugins = /* @__PURE__ */ new Set();
	for (const record of registry.plugins) {
		const pluginId = record.id;
		if (seenPlugins.has(pluginId)) continue;
		seenPlugins.add(pluginId);
		const entry = normalizedPlugins.entries[pluginId];
		const entryHasConfig = Boolean(entry?.config);
		const activationState = resolveEffectivePluginActivationState({
			id: pluginId,
			origin: record.origin,
			config: normalizedPlugins,
			rootConfig: effectiveConfig
		});
		let enabled = activationState.activated;
		let reason = activationState.reason;
		if (enabled) {
			const memoryDecision = resolveMemorySlotDecision({
				id: pluginId,
				kind: record.kind,
				slot: memorySlot,
				selectedId: selectedMemoryPluginId
			});
			if (!memoryDecision.enabled) {
				enabled = false;
				reason = memoryDecision.reason;
			}
			if (memoryDecision.selected && hasKind(record.kind, "memory")) selectedMemoryPluginId = pluginId;
		}
		if (enabled || entryHasConfig) if (record.configSchema) {
			const res = validateJsonSchemaValue({
				schema: record.configSchema,
				cacheKey: record.schemaCacheKey ?? record.manifestPath ?? pluginId,
				value: entry?.config ?? {},
				applyDefaults: opts.applyDefaults
			});
			if (!res.ok) for (const error of res.errors) issues.push({
				path: resolvePluginConfigIssuePath(pluginId, error.path),
				message: `invalid config: ${error.message}`,
				allowedValues: error.allowedValues,
				allowedValuesHiddenCount: error.allowedValuesHiddenCount
			});
			else if (entry || entryHasConfig) replacePluginEntryConfig(pluginId, res.value);
		} else if (record.format === "bundle") {} else issues.push({
			path: `plugins.entries.${pluginId}`,
			message: `plugin schema missing for ${pluginId}`
		});
		if (!enabled && entryHasConfig && !ensureCompatPluginIds().has(pluginId)) warnings.push({
			path: `plugins.entries.${pluginId}`,
			message: `plugin disabled (${reason ?? "disabled"}) but config is present`
		});
	}
	if (issues.length > 0) return {
		ok: false,
		issues,
		warnings
	};
	return {
		ok: true,
		config: mutatedConfig,
		warnings
	};
}
//#endregion
//#region src/config/version.ts
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
function parseOpenClawVersion(raw) {
	if (!raw) return null;
	const match = normalizeLegacyDotBetaVersion(raw.trim()).match(VERSION_RE);
	if (!match) return null;
	const [, major, minor, patch, suffix] = match;
	const revision = suffix && /^[0-9]+$/.test(suffix) ? Number.parseInt(suffix, 10) : null;
	return {
		major: Number.parseInt(major, 10),
		minor: Number.parseInt(minor, 10),
		patch: Number.parseInt(patch, 10),
		revision,
		prerelease: suffix && revision == null ? suffix.split(".").filter(Boolean) : null
	};
}
function normalizeOpenClawVersionBase(raw) {
	const parsed = parseOpenClawVersion(raw);
	if (!parsed) return null;
	return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}
function isSameOpenClawStableFamily(a, b) {
	const parsedA = parseOpenClawVersion(a);
	const parsedB = parseOpenClawVersion(b);
	if (!parsedA || !parsedB) return false;
	if (parsedA.prerelease?.length || parsedB.prerelease?.length) return false;
	return parsedA.major === parsedB.major && parsedA.minor === parsedB.minor && parsedA.patch === parsedB.patch;
}
function compareOpenClawVersions(a, b) {
	const parsedA = parseOpenClawVersion(a);
	const parsedB = parseOpenClawVersion(b);
	if (!parsedA || !parsedB) return null;
	if (parsedA.major !== parsedB.major) return parsedA.major < parsedB.major ? -1 : 1;
	if (parsedA.minor !== parsedB.minor) return parsedA.minor < parsedB.minor ? -1 : 1;
	if (parsedA.patch !== parsedB.patch) return parsedA.patch < parsedB.patch ? -1 : 1;
	const rankA = releaseRank(parsedA);
	const rankB = releaseRank(parsedB);
	if (rankA !== rankB) return rankA < rankB ? -1 : 1;
	if (parsedA.revision != null && parsedB.revision != null && parsedA.revision !== parsedB.revision) return parsedA.revision < parsedB.revision ? -1 : 1;
	if (parsedA.prerelease || parsedB.prerelease) return comparePrereleaseIdentifiers(parsedA.prerelease, parsedB.prerelease);
	return 0;
}
function shouldWarnOnTouchedVersion(current, touched) {
	const parsedCurrent = parseOpenClawVersion(current);
	const parsedTouched = parseOpenClawVersion(touched);
	if (parsedCurrent && parsedTouched && parsedCurrent.major === parsedTouched.major && parsedCurrent.minor === parsedTouched.minor && parsedCurrent.patch === parsedTouched.patch && parsedTouched.revision != null) return false;
	if (isSameOpenClawStableFamily(current, touched)) return false;
	const cmp = compareOpenClawVersions(current, touched);
	return cmp !== null && cmp < 0;
}
function releaseRank(version) {
	if (version.prerelease?.length) return 0;
	if (version.revision != null) return 2;
	return 1;
}
//#endregion
//#region src/config/io.ts
const SHELL_ENV_EXPECTED_KEYS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"DEEPSEEK_API_KEY",
	"ANTHROPIC_OAUTH_TOKEN",
	"GEMINI_API_KEY",
	"ZAI_API_KEY",
	"OPENROUTER_API_KEY",
	"AI_GATEWAY_API_KEY",
	"MINIMAX_API_KEY",
	"QWEN_API_KEY",
	"MODELSTUDIO_API_KEY",
	"SYNTHETIC_API_KEY",
	"KILOCODE_API_KEY",
	"ELEVENLABS_API_KEY",
	"TELEGRAM_BOT_TOKEN",
	"DISCORD_BOT_TOKEN",
	"SLACK_BOT_TOKEN",
	"SLACK_APP_TOKEN",
	"OPENCLAW_GATEWAY_TOKEN",
	"OPENCLAW_GATEWAY_PASSWORD"
];
const OPEN_DM_POLICY_ALLOW_FROM_RE = /^(?<policyPath>[a-z0-9_.-]+)\s*=\s*"open"\s+requires\s+(?<allowPath>[a-z0-9_.-]+)(?:\s+\(or\s+[a-z0-9_.-]+\))?\s+to include "\*"$/i;
const CONFIG_AUDIT_LOG_FILENAME = "config-audit.jsonl";
const CONFIG_HEALTH_STATE_FILENAME = "config-health.json";
const loggedInvalidConfigs = /* @__PURE__ */ new Set();
var ConfigRuntimeRefreshError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "ConfigRuntimeRefreshError";
	}
};
function hashConfigRaw(raw) {
	return crypto.createHash("sha256").update(raw ?? "").digest("hex");
}
async function tightenStateDirPermissionsIfNeeded(params) {
	if (process.platform === "win32") return;
	const stateDir = resolveStateDir(params.env, params.homedir);
	const configDir = path.dirname(params.configPath);
	if (path.resolve(configDir) !== path.resolve(stateDir)) return;
	try {
		if (((await params.fsModule.promises.stat(configDir)).mode & 63) === 0) return;
		await params.fsModule.promises.chmod(configDir, 448);
	} catch {}
}
function formatConfigValidationFailure(pathLabel, issueMessage) {
	const match = issueMessage.match(OPEN_DM_POLICY_ALLOW_FROM_RE);
	const policyPath = match?.groups?.policyPath?.trim();
	const allowPath = match?.groups?.allowPath?.trim();
	if (!policyPath || !allowPath) return `Config validation failed: ${pathLabel}: ${issueMessage}`;
	return [
		`Config validation failed: ${pathLabel}`,
		"",
		`Configuration mismatch: ${policyPath} is "open", but ${allowPath} does not include "*".`,
		"",
		"Fix with:",
		`  openclaw config set ${allowPath} '["*"]'`,
		"",
		"Or switch policy:",
		`  openclaw config set ${policyPath} "pairing"`
	].join("\n");
}
function isNumericPathSegment(raw) {
	return /^[0-9]+$/.test(raw);
}
function isWritePlainObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasOwnObjectKey(value, key) {
	return Object.prototype.hasOwnProperty.call(value, key);
}
const WRITE_PRUNED_OBJECT = Symbol("write-pruned-object");
function unsetPathForWriteAt(value, pathSegments, depth) {
	if (depth >= pathSegments.length) return {
		changed: false,
		value
	};
	const segment = pathSegments[depth];
	const isLeaf = depth === pathSegments.length - 1;
	if (Array.isArray(value)) {
		if (!isNumericPathSegment(segment)) return {
			changed: false,
			value
		};
		const index = Number.parseInt(segment, 10);
		if (!Number.isFinite(index) || index < 0 || index >= value.length) return {
			changed: false,
			value
		};
		if (isLeaf) {
			const next = value.slice();
			next.splice(index, 1);
			return {
				changed: true,
				value: next
			};
		}
		const child = unsetPathForWriteAt(value[index], pathSegments, depth + 1);
		if (!child.changed) return {
			changed: false,
			value
		};
		const next = value.slice();
		if (child.value === WRITE_PRUNED_OBJECT) next.splice(index, 1);
		else next[index] = child.value;
		return {
			changed: true,
			value: next
		};
	}
	if (isBlockedObjectKey(segment) || !isWritePlainObject(value) || !hasOwnObjectKey(value, segment)) return {
		changed: false,
		value
	};
	if (isLeaf) {
		const next = { ...value };
		delete next[segment];
		return {
			changed: true,
			value: Object.keys(next).length === 0 ? WRITE_PRUNED_OBJECT : next
		};
	}
	const child = unsetPathForWriteAt(value[segment], pathSegments, depth + 1);
	if (!child.changed) return {
		changed: false,
		value
	};
	const next = { ...value };
	if (child.value === WRITE_PRUNED_OBJECT) delete next[segment];
	else next[segment] = child.value;
	return {
		changed: true,
		value: Object.keys(next).length === 0 ? WRITE_PRUNED_OBJECT : next
	};
}
function unsetPathForWrite(root, pathSegments) {
	if (pathSegments.length === 0) return {
		changed: false,
		next: root
	};
	const result = unsetPathForWriteAt(root, pathSegments, 0);
	if (!result.changed) return {
		changed: false,
		next: root
	};
	if (result.value === WRITE_PRUNED_OBJECT) return {
		changed: true,
		next: {}
	};
	if (isWritePlainObject(result.value)) return {
		changed: true,
		next: coerceConfig(result.value)
	};
	return {
		changed: false,
		next: root
	};
}
function resolveConfigSnapshotHash(snapshot) {
	if (typeof snapshot.hash === "string") {
		const trimmed = snapshot.hash.trim();
		if (trimmed) return trimmed;
	}
	if (typeof snapshot.raw !== "string") return null;
	return hashConfigRaw(snapshot.raw);
}
function coerceConfig(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value;
}
function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasConfigMeta(value) {
	if (!isPlainObject(value)) return false;
	const meta = value.meta;
	return isPlainObject(meta);
}
function resolveGatewayMode(value) {
	if (!isPlainObject(value)) return null;
	const gateway = value.gateway;
	if (!isPlainObject(gateway) || typeof gateway.mode !== "string") return null;
	const trimmed = gateway.mode.trim();
	return trimmed.length > 0 ? trimmed : null;
}
function cloneUnknown(value) {
	return structuredClone(value);
}
function createMergePatch(base, target) {
	if (!isPlainObject(base) || !isPlainObject(target)) return cloneUnknown(target);
	const patch = {};
	const keys = new Set([...Object.keys(base), ...Object.keys(target)]);
	for (const key of keys) {
		const hasBase = key in base;
		if (!(key in target)) {
			patch[key] = null;
			continue;
		}
		const targetValue = target[key];
		if (!hasBase) {
			patch[key] = cloneUnknown(targetValue);
			continue;
		}
		const baseValue = base[key];
		if (isPlainObject(baseValue) && isPlainObject(targetValue)) {
			const childPatch = createMergePatch(baseValue, targetValue);
			if (isPlainObject(childPatch) && Object.keys(childPatch).length === 0) continue;
			patch[key] = childPatch;
			continue;
		}
		if (!isDeepStrictEqual(baseValue, targetValue)) patch[key] = cloneUnknown(targetValue);
	}
	return patch;
}
function projectSourceOntoRuntimeShape(source, runtime) {
	if (!isPlainObject(source) || !isPlainObject(runtime)) return cloneUnknown(source);
	const next = {};
	for (const [key, sourceValue] of Object.entries(source)) {
		if (!(key in runtime)) continue;
		next[key] = projectSourceOntoRuntimeShape(sourceValue, runtime[key]);
	}
	return next;
}
function collectEnvRefPaths(value, path, output) {
	if (typeof value === "string") {
		if (containsEnvVarReference(value)) output.set(path, value);
		return;
	}
	if (Array.isArray(value)) {
		value.forEach((item, index) => {
			collectEnvRefPaths(item, `${path}[${index}]`, output);
		});
		return;
	}
	if (isPlainObject(value)) for (const [key, child] of Object.entries(value)) collectEnvRefPaths(child, path ? `${path}.${key}` : key, output);
}
function collectChangedPaths(base, target, path, output) {
	if (Array.isArray(base) && Array.isArray(target)) {
		const max = Math.max(base.length, target.length);
		for (let index = 0; index < max; index += 1) {
			const childPath = path ? `${path}[${index}]` : `[${index}]`;
			if (index >= base.length || index >= target.length) {
				output.add(childPath);
				continue;
			}
			collectChangedPaths(base[index], target[index], childPath, output);
		}
		return;
	}
	if (isPlainObject(base) && isPlainObject(target)) {
		const keys = new Set([...Object.keys(base), ...Object.keys(target)]);
		for (const key of keys) {
			const childPath = path ? `${path}.${key}` : key;
			const hasBase = key in base;
			if (!(key in target) || !hasBase) {
				output.add(childPath);
				continue;
			}
			collectChangedPaths(base[key], target[key], childPath, output);
		}
		return;
	}
	if (!isDeepStrictEqual(base, target)) output.add(path);
}
function parentPath(value) {
	if (!value) return "";
	if (value.endsWith("]")) {
		const index = value.lastIndexOf("[");
		return index > 0 ? value.slice(0, index) : "";
	}
	const index = value.lastIndexOf(".");
	return index >= 0 ? value.slice(0, index) : "";
}
function isPathChanged(path, changedPaths) {
	if (changedPaths.has(path)) return true;
	let current = parentPath(path);
	while (current) {
		if (changedPaths.has(current)) return true;
		current = parentPath(current);
	}
	return changedPaths.has("");
}
function restoreEnvRefsFromMap(value, path, envRefMap, changedPaths) {
	if (typeof value === "string") {
		if (!isPathChanged(path, changedPaths)) {
			const original = envRefMap.get(path);
			if (original !== void 0) return original;
		}
		return value;
	}
	if (Array.isArray(value)) {
		let changed = false;
		const next = value.map((item, index) => {
			const updated = restoreEnvRefsFromMap(item, `${path}[${index}]`, envRefMap, changedPaths);
			if (updated !== item) changed = true;
			return updated;
		});
		return changed ? next : value;
	}
	if (isPlainObject(value)) {
		let changed = false;
		const next = {};
		for (const [key, child] of Object.entries(value)) {
			const updated = restoreEnvRefsFromMap(child, path ? `${path}.${key}` : key, envRefMap, changedPaths);
			if (updated !== child) changed = true;
			next[key] = updated;
		}
		return changed ? next : value;
	}
	return value;
}
function resolveConfigAuditLogPath(env, homedir) {
	return path.join(resolveStateDir(env, homedir), "logs", CONFIG_AUDIT_LOG_FILENAME);
}
function resolveConfigHealthStatePath(env, homedir) {
	return path.join(resolveStateDir(env, homedir), "logs", CONFIG_HEALTH_STATE_FILENAME);
}
function normalizeStatNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function normalizeStatId(value) {
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return null;
}
function resolveConfigStatMetadata(stat) {
	return {
		dev: normalizeStatId(stat?.dev ?? null),
		ino: normalizeStatId(stat?.ino ?? null),
		mode: normalizeStatNumber(stat ? stat.mode & 511 : null),
		nlink: normalizeStatNumber(stat?.nlink ?? null),
		uid: normalizeStatNumber(stat?.uid ?? null),
		gid: normalizeStatNumber(stat?.gid ?? null)
	};
}
function resolveConfigWriteSuspiciousReasons(params) {
	const reasons = [];
	if (!params.existsBefore) return reasons;
	if (typeof params.previousBytes === "number" && typeof params.nextBytes === "number" && params.previousBytes >= 512 && params.nextBytes < Math.floor(params.previousBytes * .5)) reasons.push(`size-drop:${params.previousBytes}->${params.nextBytes}`);
	if (!params.hasMetaBefore) reasons.push("missing-meta-before-write");
	if (params.gatewayModeBefore && !params.gatewayModeAfter) reasons.push("gateway-mode-removed");
	return reasons;
}
async function appendConfigAuditRecord(deps, record) {
	try {
		const auditPath = resolveConfigAuditLogPath(deps.env, deps.homedir);
		await deps.fs.promises.mkdir(path.dirname(auditPath), {
			recursive: true,
			mode: 448
		});
		await deps.fs.promises.appendFile(auditPath, `${JSON.stringify(record)}\n`, {
			encoding: "utf-8",
			mode: 384
		});
	} catch {}
}
function appendConfigAuditRecordSync(deps, record) {
	try {
		const auditPath = resolveConfigAuditLogPath(deps.env, deps.homedir);
		deps.fs.mkdirSync(path.dirname(auditPath), {
			recursive: true,
			mode: 448
		});
		deps.fs.appendFileSync(auditPath, `${JSON.stringify(record)}\n`, {
			encoding: "utf-8",
			mode: 384
		});
	} catch {}
}
async function readConfigHealthState(deps) {
	try {
		const healthPath = resolveConfigHealthStatePath(deps.env, deps.homedir);
		const raw = await deps.fs.promises.readFile(healthPath, "utf-8");
		const parsed = JSON.parse(raw);
		return isPlainObject(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
function readConfigHealthStateSync(deps) {
	try {
		const healthPath = resolveConfigHealthStatePath(deps.env, deps.homedir);
		const raw = deps.fs.readFileSync(healthPath, "utf-8");
		const parsed = JSON.parse(raw);
		return isPlainObject(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
async function writeConfigHealthState(deps, state) {
	try {
		const healthPath = resolveConfigHealthStatePath(deps.env, deps.homedir);
		await deps.fs.promises.mkdir(path.dirname(healthPath), {
			recursive: true,
			mode: 448
		});
		await deps.fs.promises.writeFile(healthPath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: "utf-8",
			mode: 384
		});
	} catch {}
}
function writeConfigHealthStateSync(deps, state) {
	try {
		const healthPath = resolveConfigHealthStatePath(deps.env, deps.homedir);
		deps.fs.mkdirSync(path.dirname(healthPath), {
			recursive: true,
			mode: 448
		});
		deps.fs.writeFileSync(healthPath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: "utf-8",
			mode: 384
		});
	} catch {}
}
function getConfigHealthEntry(state, configPath) {
	const entries = state.entries;
	if (!entries || !isPlainObject(entries)) return {};
	const entry = entries[configPath];
	return entry && isPlainObject(entry) ? entry : {};
}
function setConfigHealthEntry(state, configPath, entry) {
	return {
		...state,
		entries: {
			...state.entries,
			[configPath]: entry
		}
	};
}
function isUpdateChannelOnlyRoot(value) {
	if (!isPlainObject(value)) return false;
	const keys = Object.keys(value);
	if (keys.length !== 1 || keys[0] !== "update") return false;
	const update = value.update;
	if (!isPlainObject(update)) return false;
	return Object.keys(update).length === 1 && typeof update.channel === "string";
}
function resolveConfigObserveSuspiciousReasons(params) {
	const reasons = [];
	const baseline = params.lastKnownGood;
	if (!baseline) return reasons;
	if (baseline.bytes >= 512 && params.bytes < Math.floor(baseline.bytes * .5)) reasons.push(`size-drop-vs-last-good:${baseline.bytes}->${params.bytes}`);
	if (baseline.hasMeta && !params.hasMeta) reasons.push("missing-meta-vs-last-good");
	if (baseline.gatewayMode && !params.gatewayMode) reasons.push("gateway-mode-missing-vs-last-good");
	if (baseline.gatewayMode && isUpdateChannelOnlyRoot(params.parsed)) reasons.push("update-channel-only-root");
	return reasons;
}
async function readConfigFingerprintForPath(deps, targetPath) {
	try {
		const raw = await deps.fs.promises.readFile(targetPath, "utf-8");
		const stat = await deps.fs.promises.stat(targetPath).catch(() => null);
		const parsedRes = parseConfigJson5(raw, deps.json5);
		const parsed = parsedRes.ok ? parsedRes.parsed : {};
		return {
			hash: hashConfigRaw(raw),
			bytes: Buffer.byteLength(raw, "utf-8"),
			mtimeMs: stat?.mtimeMs ?? null,
			ctimeMs: stat?.ctimeMs ?? null,
			...resolveConfigStatMetadata(stat),
			hasMeta: hasConfigMeta(parsed),
			gatewayMode: resolveGatewayMode(parsed),
			observedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	} catch {
		return null;
	}
}
function readConfigFingerprintForPathSync(deps, targetPath) {
	try {
		const raw = deps.fs.readFileSync(targetPath, "utf-8");
		const stat = deps.fs.statSync(targetPath, { throwIfNoEntry: false }) ?? null;
		const parsedRes = parseConfigJson5(raw, deps.json5);
		const parsed = parsedRes.ok ? parsedRes.parsed : {};
		return {
			hash: hashConfigRaw(raw),
			bytes: Buffer.byteLength(raw, "utf-8"),
			mtimeMs: stat?.mtimeMs ?? null,
			ctimeMs: stat?.ctimeMs ?? null,
			...resolveConfigStatMetadata(stat),
			hasMeta: hasConfigMeta(parsed),
			gatewayMode: resolveGatewayMode(parsed),
			observedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
	} catch {
		return null;
	}
}
function formatConfigArtifactTimestamp(ts) {
	return ts.replaceAll(":", "-").replaceAll(".", "-");
}
async function persistClobberedConfigSnapshot(params) {
	const targetPath = `${params.configPath}.clobbered.${formatConfigArtifactTimestamp(params.observedAt)}`;
	try {
		await params.deps.fs.promises.writeFile(targetPath, params.raw, {
			encoding: "utf-8",
			mode: 384,
			flag: "wx"
		});
		return targetPath;
	} catch {
		return null;
	}
}
function persistClobberedConfigSnapshotSync(params) {
	const targetPath = `${params.configPath}.clobbered.${formatConfigArtifactTimestamp(params.observedAt)}`;
	try {
		params.deps.fs.writeFileSync(targetPath, params.raw, {
			encoding: "utf-8",
			mode: 384,
			flag: "wx"
		});
		return targetPath;
	} catch {
		return null;
	}
}
async function maybeRecoverSuspiciousConfigRead(params) {
	const stat = await params.deps.fs.promises.stat(params.configPath).catch(() => null);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const current = {
		hash: hashConfigRaw(params.raw),
		bytes: Buffer.byteLength(params.raw, "utf-8"),
		mtimeMs: stat?.mtimeMs ?? null,
		ctimeMs: stat?.ctimeMs ?? null,
		...resolveConfigStatMetadata(stat),
		hasMeta: hasConfigMeta(params.parsed),
		gatewayMode: resolveGatewayMode(params.parsed),
		observedAt: now
	};
	let healthState = await readConfigHealthState(params.deps);
	const entry = getConfigHealthEntry(healthState, params.configPath);
	const backupPath = `${params.configPath}.bak`;
	const backupBaseline = entry.lastKnownGood ?? await readConfigFingerprintForPath(params.deps, backupPath) ?? void 0;
	const suspicious = resolveConfigObserveSuspiciousReasons({
		bytes: current.bytes,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		parsed: params.parsed,
		lastKnownGood: backupBaseline
	});
	if (!suspicious.includes("update-channel-only-root")) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const suspiciousSignature = `${current.hash}:${suspicious.join(",")}`;
	const backupRaw = await params.deps.fs.promises.readFile(backupPath, "utf-8").catch(() => null);
	if (!backupRaw) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const backupParsedRes = parseConfigJson5(backupRaw, params.deps.json5);
	if (!backupParsedRes.ok) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const backup = backupBaseline ?? await readConfigFingerprintForPath(params.deps, backupPath);
	if (!backup?.gatewayMode) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const clobberedPath = await persistClobberedConfigSnapshot({
		deps: params.deps,
		configPath: params.configPath,
		raw: params.raw,
		observedAt: now
	});
	let restoredFromBackup = false;
	try {
		await params.deps.fs.promises.copyFile(backupPath, params.configPath);
		restoredFromBackup = true;
	} catch {}
	params.deps.logger.warn(`Config auto-restored from backup: ${params.configPath} (${suspicious.join(", ")})`);
	await appendConfigAuditRecord(params.deps, {
		ts: now,
		source: "config-io",
		event: "config.observe",
		phase: "read",
		configPath: params.configPath,
		pid: process.pid,
		ppid: process.ppid,
		cwd: process.cwd(),
		argv: process.argv.slice(0, 8),
		execArgv: process.execArgv.slice(0, 8),
		exists: true,
		valid: true,
		hash: current.hash,
		bytes: current.bytes,
		mtimeMs: current.mtimeMs,
		ctimeMs: current.ctimeMs,
		dev: current.dev,
		ino: current.ino,
		mode: current.mode,
		nlink: current.nlink,
		uid: current.uid,
		gid: current.gid,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		suspicious,
		lastKnownGoodHash: entry.lastKnownGood?.hash ?? null,
		lastKnownGoodBytes: entry.lastKnownGood?.bytes ?? null,
		lastKnownGoodMtimeMs: entry.lastKnownGood?.mtimeMs ?? null,
		lastKnownGoodCtimeMs: entry.lastKnownGood?.ctimeMs ?? null,
		lastKnownGoodDev: entry.lastKnownGood?.dev ?? null,
		lastKnownGoodIno: entry.lastKnownGood?.ino ?? null,
		lastKnownGoodMode: entry.lastKnownGood?.mode ?? null,
		lastKnownGoodNlink: entry.lastKnownGood?.nlink ?? null,
		lastKnownGoodUid: entry.lastKnownGood?.uid ?? null,
		lastKnownGoodGid: entry.lastKnownGood?.gid ?? null,
		lastKnownGoodGatewayMode: entry.lastKnownGood?.gatewayMode ?? null,
		backupHash: backup?.hash ?? null,
		backupBytes: backup?.bytes ?? null,
		backupMtimeMs: backup?.mtimeMs ?? null,
		backupCtimeMs: backup?.ctimeMs ?? null,
		backupDev: backup?.dev ?? null,
		backupIno: backup?.ino ?? null,
		backupMode: backup?.mode ?? null,
		backupNlink: backup?.nlink ?? null,
		backupUid: backup?.uid ?? null,
		backupGid: backup?.gid ?? null,
		backupGatewayMode: backup?.gatewayMode ?? null,
		clobberedPath,
		restoredFromBackup,
		restoredBackupPath: backupPath
	});
	healthState = setConfigHealthEntry(healthState, params.configPath, {
		...entry,
		lastObservedSuspiciousSignature: suspiciousSignature
	});
	await writeConfigHealthState(params.deps, healthState);
	return {
		raw: backupRaw,
		parsed: backupParsedRes.parsed
	};
}
function maybeRecoverSuspiciousConfigReadSync(params) {
	const stat = params.deps.fs.statSync(params.configPath, { throwIfNoEntry: false }) ?? null;
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const current = {
		hash: hashConfigRaw(params.raw),
		bytes: Buffer.byteLength(params.raw, "utf-8"),
		mtimeMs: stat?.mtimeMs ?? null,
		ctimeMs: stat?.ctimeMs ?? null,
		...resolveConfigStatMetadata(stat),
		hasMeta: hasConfigMeta(params.parsed),
		gatewayMode: resolveGatewayMode(params.parsed),
		observedAt: now
	};
	let healthState = readConfigHealthStateSync(params.deps);
	const entry = getConfigHealthEntry(healthState, params.configPath);
	const backupPath = `${params.configPath}.bak`;
	const backupBaseline = entry.lastKnownGood ?? readConfigFingerprintForPathSync(params.deps, backupPath) ?? void 0;
	const suspicious = resolveConfigObserveSuspiciousReasons({
		bytes: current.bytes,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		parsed: params.parsed,
		lastKnownGood: backupBaseline
	});
	if (!suspicious.includes("update-channel-only-root")) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const suspiciousSignature = `${current.hash}:${suspicious.join(",")}`;
	let backupRaw;
	try {
		backupRaw = params.deps.fs.readFileSync(backupPath, "utf-8");
	} catch {
		return {
			raw: params.raw,
			parsed: params.parsed
		};
	}
	const backupParsedRes = parseConfigJson5(backupRaw, params.deps.json5);
	if (!backupParsedRes.ok) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const backup = backupBaseline ?? readConfigFingerprintForPathSync(params.deps, backupPath);
	if (!backup?.gatewayMode) return {
		raw: params.raw,
		parsed: params.parsed
	};
	const clobberedPath = persistClobberedConfigSnapshotSync({
		deps: params.deps,
		configPath: params.configPath,
		raw: params.raw,
		observedAt: now
	});
	let restoredFromBackup = false;
	try {
		params.deps.fs.copyFileSync(backupPath, params.configPath);
		restoredFromBackup = true;
	} catch {}
	params.deps.logger.warn(`Config auto-restored from backup: ${params.configPath} (${suspicious.join(", ")})`);
	appendConfigAuditRecordSync(params.deps, {
		ts: now,
		source: "config-io",
		event: "config.observe",
		phase: "read",
		configPath: params.configPath,
		pid: process.pid,
		ppid: process.ppid,
		cwd: process.cwd(),
		argv: process.argv.slice(0, 8),
		execArgv: process.execArgv.slice(0, 8),
		exists: true,
		valid: true,
		hash: current.hash,
		bytes: current.bytes,
		mtimeMs: current.mtimeMs,
		ctimeMs: current.ctimeMs,
		dev: current.dev,
		ino: current.ino,
		mode: current.mode,
		nlink: current.nlink,
		uid: current.uid,
		gid: current.gid,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		suspicious,
		lastKnownGoodHash: entry.lastKnownGood?.hash ?? null,
		lastKnownGoodBytes: entry.lastKnownGood?.bytes ?? null,
		lastKnownGoodMtimeMs: entry.lastKnownGood?.mtimeMs ?? null,
		lastKnownGoodCtimeMs: entry.lastKnownGood?.ctimeMs ?? null,
		lastKnownGoodDev: entry.lastKnownGood?.dev ?? null,
		lastKnownGoodIno: entry.lastKnownGood?.ino ?? null,
		lastKnownGoodMode: entry.lastKnownGood?.mode ?? null,
		lastKnownGoodNlink: entry.lastKnownGood?.nlink ?? null,
		lastKnownGoodUid: entry.lastKnownGood?.uid ?? null,
		lastKnownGoodGid: entry.lastKnownGood?.gid ?? null,
		lastKnownGoodGatewayMode: entry.lastKnownGood?.gatewayMode ?? null,
		backupHash: backup?.hash ?? null,
		backupBytes: backup?.bytes ?? null,
		backupMtimeMs: backup?.mtimeMs ?? null,
		backupCtimeMs: backup?.ctimeMs ?? null,
		backupDev: backup?.dev ?? null,
		backupIno: backup?.ino ?? null,
		backupMode: backup?.mode ?? null,
		backupNlink: backup?.nlink ?? null,
		backupUid: backup?.uid ?? null,
		backupGid: backup?.gid ?? null,
		backupGatewayMode: backup?.gatewayMode ?? null,
		clobberedPath,
		restoredFromBackup,
		restoredBackupPath: backupPath
	});
	healthState = setConfigHealthEntry(healthState, params.configPath, {
		...entry,
		lastObservedSuspiciousSignature: suspiciousSignature
	});
	writeConfigHealthStateSync(params.deps, healthState);
	return {
		raw: backupRaw,
		parsed: backupParsedRes.parsed
	};
}
function sameFingerprint(left, right) {
	if (!left) return false;
	return left.hash === right.hash && left.bytes === right.bytes && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs && left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.nlink === right.nlink && left.uid === right.uid && left.gid === right.gid && left.hasMeta === right.hasMeta && left.gatewayMode === right.gatewayMode;
}
async function observeConfigSnapshot(deps, snapshot) {
	if (!snapshot.exists || typeof snapshot.raw !== "string") return;
	const stat = await deps.fs.promises.stat(snapshot.path).catch(() => null);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const current = {
		hash: resolveConfigSnapshotHash(snapshot) ?? hashConfigRaw(snapshot.raw),
		bytes: Buffer.byteLength(snapshot.raw, "utf-8"),
		mtimeMs: stat?.mtimeMs ?? null,
		ctimeMs: stat?.ctimeMs ?? null,
		...resolveConfigStatMetadata(stat),
		hasMeta: hasConfigMeta(snapshot.parsed),
		gatewayMode: resolveGatewayMode(snapshot.resolved),
		observedAt: now
	};
	let healthState = await readConfigHealthState(deps);
	const entry = getConfigHealthEntry(healthState, snapshot.path);
	const backupBaseline = entry.lastKnownGood ?? await readConfigFingerprintForPath(deps, `${snapshot.path}.bak`) ?? void 0;
	const suspicious = resolveConfigObserveSuspiciousReasons({
		bytes: current.bytes,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		parsed: snapshot.parsed,
		lastKnownGood: backupBaseline
	});
	if (suspicious.length === 0) {
		if (snapshot.valid) {
			const nextEntry = {
				lastKnownGood: current,
				lastObservedSuspiciousSignature: null
			};
			if (!sameFingerprint(entry.lastKnownGood, current) || entry.lastObservedSuspiciousSignature !== null) {
				healthState = setConfigHealthEntry(healthState, snapshot.path, nextEntry);
				await writeConfigHealthState(deps, healthState);
			}
		}
		return;
	}
	const suspiciousSignature = `${current.hash}:${suspicious.join(",")}`;
	if (entry.lastObservedSuspiciousSignature === suspiciousSignature) return;
	const backup = (backupBaseline?.hash ? backupBaseline : null) ?? await readConfigFingerprintForPath(deps, `${snapshot.path}.bak`);
	const clobberedPath = await persistClobberedConfigSnapshot({
		deps,
		configPath: snapshot.path,
		raw: snapshot.raw,
		observedAt: now
	});
	deps.logger.warn(`Config observe anomaly: ${snapshot.path} (${suspicious.join(", ")})`);
	await appendConfigAuditRecord(deps, {
		ts: now,
		source: "config-io",
		event: "config.observe",
		phase: "read",
		configPath: snapshot.path,
		pid: process.pid,
		ppid: process.ppid,
		cwd: process.cwd(),
		argv: process.argv.slice(0, 8),
		execArgv: process.execArgv.slice(0, 8),
		exists: true,
		valid: snapshot.valid,
		hash: current.hash,
		bytes: current.bytes,
		mtimeMs: current.mtimeMs,
		ctimeMs: current.ctimeMs,
		dev: current.dev,
		ino: current.ino,
		mode: current.mode,
		nlink: current.nlink,
		uid: current.uid,
		gid: current.gid,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		suspicious,
		lastKnownGoodHash: entry.lastKnownGood?.hash ?? null,
		lastKnownGoodBytes: entry.lastKnownGood?.bytes ?? null,
		lastKnownGoodMtimeMs: entry.lastKnownGood?.mtimeMs ?? null,
		lastKnownGoodCtimeMs: entry.lastKnownGood?.ctimeMs ?? null,
		lastKnownGoodDev: entry.lastKnownGood?.dev ?? null,
		lastKnownGoodIno: entry.lastKnownGood?.ino ?? null,
		lastKnownGoodMode: entry.lastKnownGood?.mode ?? null,
		lastKnownGoodNlink: entry.lastKnownGood?.nlink ?? null,
		lastKnownGoodUid: entry.lastKnownGood?.uid ?? null,
		lastKnownGoodGid: entry.lastKnownGood?.gid ?? null,
		lastKnownGoodGatewayMode: entry.lastKnownGood?.gatewayMode ?? null,
		backupHash: backup?.hash ?? null,
		backupBytes: backup?.bytes ?? null,
		backupMtimeMs: backup?.mtimeMs ?? null,
		backupCtimeMs: backup?.ctimeMs ?? null,
		backupDev: backup?.dev ?? null,
		backupIno: backup?.ino ?? null,
		backupMode: backup?.mode ?? null,
		backupNlink: backup?.nlink ?? null,
		backupUid: backup?.uid ?? null,
		backupGid: backup?.gid ?? null,
		backupGatewayMode: backup?.gatewayMode ?? null,
		clobberedPath,
		restoredFromBackup: false,
		restoredBackupPath: null
	});
	healthState = setConfigHealthEntry(healthState, snapshot.path, {
		...entry,
		lastObservedSuspiciousSignature: suspiciousSignature
	});
	await writeConfigHealthState(deps, healthState);
}
function observeConfigSnapshotSync(deps, snapshot) {
	if (!snapshot.exists || typeof snapshot.raw !== "string") return;
	const stat = deps.fs.statSync(snapshot.path, { throwIfNoEntry: false }) ?? null;
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const current = {
		hash: resolveConfigSnapshotHash(snapshot) ?? hashConfigRaw(snapshot.raw),
		bytes: Buffer.byteLength(snapshot.raw, "utf-8"),
		mtimeMs: stat?.mtimeMs ?? null,
		ctimeMs: stat?.ctimeMs ?? null,
		...resolveConfigStatMetadata(stat),
		hasMeta: hasConfigMeta(snapshot.parsed),
		gatewayMode: resolveGatewayMode(snapshot.resolved),
		observedAt: now
	};
	let healthState = readConfigHealthStateSync(deps);
	const entry = getConfigHealthEntry(healthState, snapshot.path);
	const backupBaseline = entry.lastKnownGood ?? readConfigFingerprintForPathSync(deps, `${snapshot.path}.bak`) ?? void 0;
	const suspicious = resolveConfigObserveSuspiciousReasons({
		bytes: current.bytes,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		parsed: snapshot.parsed,
		lastKnownGood: backupBaseline
	});
	if (suspicious.length === 0) {
		if (snapshot.valid) {
			const nextEntry = {
				lastKnownGood: current,
				lastObservedSuspiciousSignature: null
			};
			if (!sameFingerprint(entry.lastKnownGood, current) || entry.lastObservedSuspiciousSignature !== null) {
				healthState = setConfigHealthEntry(healthState, snapshot.path, nextEntry);
				writeConfigHealthStateSync(deps, healthState);
			}
		}
		return;
	}
	const suspiciousSignature = `${current.hash}:${suspicious.join(",")}`;
	if (entry.lastObservedSuspiciousSignature === suspiciousSignature) return;
	const backup = (backupBaseline?.hash ? backupBaseline : null) ?? readConfigFingerprintForPathSync(deps, `${snapshot.path}.bak`);
	const clobberedPath = persistClobberedConfigSnapshotSync({
		deps,
		configPath: snapshot.path,
		raw: snapshot.raw,
		observedAt: now
	});
	deps.logger.warn(`Config observe anomaly: ${snapshot.path} (${suspicious.join(", ")})`);
	appendConfigAuditRecordSync(deps, {
		ts: now,
		source: "config-io",
		event: "config.observe",
		phase: "read",
		configPath: snapshot.path,
		pid: process.pid,
		ppid: process.ppid,
		cwd: process.cwd(),
		argv: process.argv.slice(0, 8),
		execArgv: process.execArgv.slice(0, 8),
		exists: true,
		valid: snapshot.valid,
		hash: current.hash,
		bytes: current.bytes,
		mtimeMs: current.mtimeMs,
		ctimeMs: current.ctimeMs,
		dev: current.dev,
		ino: current.ino,
		mode: current.mode,
		nlink: current.nlink,
		uid: current.uid,
		gid: current.gid,
		hasMeta: current.hasMeta,
		gatewayMode: current.gatewayMode,
		suspicious,
		lastKnownGoodHash: entry.lastKnownGood?.hash ?? null,
		lastKnownGoodBytes: entry.lastKnownGood?.bytes ?? null,
		lastKnownGoodMtimeMs: entry.lastKnownGood?.mtimeMs ?? null,
		lastKnownGoodCtimeMs: entry.lastKnownGood?.ctimeMs ?? null,
		lastKnownGoodDev: entry.lastKnownGood?.dev ?? null,
		lastKnownGoodIno: entry.lastKnownGood?.ino ?? null,
		lastKnownGoodMode: entry.lastKnownGood?.mode ?? null,
		lastKnownGoodNlink: entry.lastKnownGood?.nlink ?? null,
		lastKnownGoodUid: entry.lastKnownGood?.uid ?? null,
		lastKnownGoodGid: entry.lastKnownGood?.gid ?? null,
		lastKnownGoodGatewayMode: entry.lastKnownGood?.gatewayMode ?? null,
		backupHash: backup?.hash ?? null,
		backupBytes: backup?.bytes ?? null,
		backupMtimeMs: backup?.mtimeMs ?? null,
		backupCtimeMs: backup?.ctimeMs ?? null,
		backupDev: backup?.dev ?? null,
		backupIno: backup?.ino ?? null,
		backupMode: backup?.mode ?? null,
		backupNlink: backup?.nlink ?? null,
		backupUid: backup?.uid ?? null,
		backupGid: backup?.gid ?? null,
		backupGatewayMode: backup?.gatewayMode ?? null,
		clobberedPath,
		restoredFromBackup: false,
		restoredBackupPath: null
	});
	healthState = setConfigHealthEntry(healthState, snapshot.path, {
		...entry,
		lastObservedSuspiciousSignature: suspiciousSignature
	});
	writeConfigHealthStateSync(deps, healthState);
}
function warnOnConfigMiskeys(raw, logger) {
	if (!raw || typeof raw !== "object") return;
	const gateway = raw.gateway;
	if (!gateway || typeof gateway !== "object") return;
	if ("token" in gateway) logger.warn("Config uses \"gateway.token\". This key is ignored; use \"gateway.auth.token\" instead.");
}
function stampConfigVersion(cfg) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		...cfg,
		meta: {
			...cfg.meta,
			lastTouchedVersion: VERSION,
			lastTouchedAt: now
		}
	};
}
function warnIfConfigFromFuture(cfg, logger) {
	const touched = cfg.meta?.lastTouchedVersion;
	if (!touched) return;
	if (shouldWarnOnTouchedVersion(VERSION, touched)) logger.warn(`Config was last written by a newer OpenClaw (${touched}); current version is ${VERSION}.`);
}
function resolveConfigPathForDeps(deps) {
	if (deps.configPath) return deps.configPath;
	return resolveConfigPath(deps.env, resolveStateDir(deps.env, deps.homedir));
}
function normalizeDeps(overrides = {}) {
	return {
		fs: overrides.fs ?? fs,
		json5: overrides.json5 ?? JSON5,
		env: overrides.env ?? process.env,
		homedir: overrides.homedir ?? (() => resolveRequiredHomeDir(overrides.env ?? process.env, os.homedir)),
		configPath: overrides.configPath ?? "",
		logger: overrides.logger ?? console
	};
}
function maybeLoadDotEnvForConfig(env) {
	if (env !== process.env) return;
	loadDotEnv({ quiet: true });
}
function parseConfigJson5(raw, json5 = JSON5) {
	try {
		return {
			ok: true,
			parsed: json5.parse(raw)
		};
	} catch (err) {
		return {
			ok: false,
			error: String(err)
		};
	}
}
function resolveConfigIncludesForRead(parsed, configPath, deps) {
	return resolveConfigIncludes(parsed, configPath, {
		readFile: (candidate) => deps.fs.readFileSync(candidate, "utf-8"),
		readFileWithGuards: ({ includePath, resolvedPath, rootRealDir }) => readConfigIncludeFileWithGuards({
			includePath,
			resolvedPath,
			rootRealDir,
			ioFs: deps.fs
		}),
		parseJson: (raw) => deps.json5.parse(raw)
	});
}
function resolveConfigForRead(resolvedIncludes, env) {
	if (resolvedIncludes && typeof resolvedIncludes === "object" && "env" in resolvedIncludes) applyConfigEnvVars(resolvedIncludes, env);
	const envWarnings = [];
	return {
		resolvedConfigRaw: resolveConfigEnvVars(resolvedIncludes, env, { onMissing: (w) => envWarnings.push(w) }),
		envSnapshotForRestore: { ...env },
		envWarnings
	};
}
function resolveLegacyConfigForRead(resolvedConfigRaw, sourceRaw) {
	return {
		effectiveConfigRaw: resolvedConfigRaw,
		sourceLegacyIssues: findLegacyConfigIssues(resolvedConfigRaw, sourceRaw, listPluginDoctorLegacyConfigRules())
	};
}
function createConfigFileSnapshot(params) {
	const sourceConfig = asResolvedSourceConfig(params.sourceConfig);
	const runtimeConfig = asRuntimeConfig(params.runtimeConfig);
	return {
		path: params.path,
		exists: params.exists,
		raw: params.raw,
		parsed: params.parsed,
		sourceConfig,
		resolved: sourceConfig,
		valid: params.valid,
		runtimeConfig,
		config: runtimeConfig,
		hash: params.hash,
		issues: params.issues,
		warnings: params.warnings,
		legacyIssues: params.legacyIssues
	};
}
async function finalizeReadConfigSnapshotInternalResult(deps, result) {
	await observeConfigSnapshot(deps, result.snapshot);
	return result;
}
function createConfigIO(overrides = {}) {
	const deps = normalizeDeps(overrides);
	const configPath = resolveConfigPathForDeps(deps);
	function observeLoadConfigSnapshot(snapshot) {
		observeConfigSnapshotSync(deps, snapshot);
		return snapshot;
	}
	function loadConfig() {
		try {
			maybeLoadDotEnvForConfig(deps.env);
			if (!deps.fs.existsSync(configPath)) {
				if (shouldEnableShellEnvFallback(deps.env) && !shouldDeferShellEnvFallback(deps.env)) loadShellEnvFallback({
					enabled: true,
					env: deps.env,
					expectedKeys: SHELL_ENV_EXPECTED_KEYS,
					logger: deps.logger,
					timeoutMs: resolveShellEnvFallbackTimeoutMs(deps.env)
				});
				return {};
			}
			const raw = deps.fs.readFileSync(configPath, "utf-8");
			const recovered = maybeRecoverSuspiciousConfigReadSync({
				deps,
				configPath,
				raw,
				parsed: deps.json5.parse(raw)
			});
			const effectiveRaw = recovered.raw;
			const effectiveParsed = recovered.parsed;
			const hash = hashConfigRaw(effectiveRaw);
			const readResolution = resolveConfigForRead(resolveConfigIncludesForRead(effectiveParsed, configPath, deps), deps.env);
			const resolvedConfig = readResolution.resolvedConfigRaw;
			const legacyResolution = resolveLegacyConfigForRead(resolvedConfig, effectiveParsed);
			const effectiveConfigRaw = legacyResolution.effectiveConfigRaw;
			for (const w of readResolution.envWarnings) deps.logger.warn(`Config (${configPath}): missing env var "${w.varName}" at ${w.configPath} - feature using this value will be unavailable`);
			warnOnConfigMiskeys(effectiveConfigRaw, deps.logger);
			if (typeof effectiveConfigRaw !== "object" || effectiveConfigRaw === null) {
				observeLoadConfigSnapshot({ ...createConfigFileSnapshot({
					path: configPath,
					exists: true,
					raw: effectiveRaw,
					parsed: effectiveParsed,
					sourceConfig: {},
					valid: true,
					runtimeConfig: {},
					hash,
					issues: [],
					warnings: [],
					legacyIssues: legacyResolution.sourceLegacyIssues
				}) });
				return {};
			}
			const preValidationDuplicates = findDuplicateAgentDirs(effectiveConfigRaw, {
				env: deps.env,
				homedir: deps.homedir
			});
			if (preValidationDuplicates.length > 0) throw new DuplicateAgentDirError(preValidationDuplicates);
			const validated = validateConfigObjectWithPlugins(effectiveConfigRaw, { env: deps.env });
			if (!validated.ok) {
				observeLoadConfigSnapshot({ ...createConfigFileSnapshot({
					path: configPath,
					exists: true,
					raw: effectiveRaw,
					parsed: effectiveParsed,
					sourceConfig: coerceConfig(effectiveConfigRaw),
					valid: false,
					runtimeConfig: coerceConfig(effectiveConfigRaw),
					hash,
					issues: validated.issues,
					warnings: validated.warnings,
					legacyIssues: legacyResolution.sourceLegacyIssues
				}) });
				const details = validated.issues.map((iss) => `- ${sanitizeTerminalText(iss.path || "<root>")}: ${sanitizeTerminalText(iss.message)}`).join("\n");
				if (!loggedInvalidConfigs.has(configPath)) {
					loggedInvalidConfigs.add(configPath);
					deps.logger.error(`Invalid config at ${configPath}:\\n${details}`);
				}
				const error = /* @__PURE__ */ new Error(`Invalid config at ${configPath}:\n${details}`);
				error.code = "INVALID_CONFIG";
				error.details = details;
				throw error;
			}
			if (validated.warnings.length > 0) {
				const details = validated.warnings.map((iss) => `- ${sanitizeTerminalText(iss.path || "<root>")}: ${sanitizeTerminalText(iss.message)}`).join("\n");
				deps.logger.warn(`Config warnings:\\n${details}`);
			}
			warnIfConfigFromFuture(validated.config, deps.logger);
			const cfg = materializeRuntimeConfig(validated.config, "load");
			observeLoadConfigSnapshot({ ...createConfigFileSnapshot({
				path: configPath,
				exists: true,
				raw: effectiveRaw,
				parsed: effectiveParsed,
				sourceConfig: coerceConfig(effectiveConfigRaw),
				valid: true,
				runtimeConfig: cfg,
				hash,
				issues: [],
				warnings: validated.warnings,
				legacyIssues: legacyResolution.sourceLegacyIssues
			}) });
			const duplicates = findDuplicateAgentDirs(cfg, {
				env: deps.env,
				homedir: deps.homedir
			});
			if (duplicates.length > 0) throw new DuplicateAgentDirError(duplicates);
			applyConfigEnvVars(cfg, deps.env);
			if ((shouldEnableShellEnvFallback(deps.env) || cfg.env?.shellEnv?.enabled === true) && !shouldDeferShellEnvFallback(deps.env)) loadShellEnvFallback({
				enabled: true,
				env: deps.env,
				expectedKeys: SHELL_ENV_EXPECTED_KEYS,
				logger: deps.logger,
				timeoutMs: cfg.env?.shellEnv?.timeoutMs ?? resolveShellEnvFallbackTimeoutMs(deps.env)
			});
			const pendingSecret = AUTO_OWNER_DISPLAY_SECRET_BY_PATH.get(configPath);
			const ownerDisplaySecretResolution = ensureOwnerDisplaySecret(cfg, () => pendingSecret ?? crypto.randomBytes(32).toString("hex"));
			const cfgWithOwnerDisplaySecret = ownerDisplaySecretResolution.config;
			if (ownerDisplaySecretResolution.generatedSecret) {
				AUTO_OWNER_DISPLAY_SECRET_BY_PATH.set(configPath, ownerDisplaySecretResolution.generatedSecret);
				if (!AUTO_OWNER_DISPLAY_SECRET_PERSIST_IN_FLIGHT.has(configPath)) {
					AUTO_OWNER_DISPLAY_SECRET_PERSIST_IN_FLIGHT.add(configPath);
					writeConfigFile(cfgWithOwnerDisplaySecret, { expectedConfigPath: configPath }).then(() => {
						AUTO_OWNER_DISPLAY_SECRET_BY_PATH.delete(configPath);
						AUTO_OWNER_DISPLAY_SECRET_PERSIST_WARNED.delete(configPath);
					}).catch((err) => {
						if (!AUTO_OWNER_DISPLAY_SECRET_PERSIST_WARNED.has(configPath)) {
							AUTO_OWNER_DISPLAY_SECRET_PERSIST_WARNED.add(configPath);
							deps.logger.warn(`Failed to persist auto-generated commands.ownerDisplaySecret at ${configPath}: ${String(err)}`);
						}
					}).finally(() => {
						AUTO_OWNER_DISPLAY_SECRET_PERSIST_IN_FLIGHT.delete(configPath);
					});
				}
			} else {
				AUTO_OWNER_DISPLAY_SECRET_BY_PATH.delete(configPath);
				AUTO_OWNER_DISPLAY_SECRET_PERSIST_WARNED.delete(configPath);
			}
			return applyConfigOverrides(cfgWithOwnerDisplaySecret);
		} catch (err) {
			if (err instanceof DuplicateAgentDirError) {
				deps.logger.error(err.message);
				throw err;
			}
			if (err?.code === "INVALID_CONFIG") throw err;
			deps.logger.error(`Failed to read config at ${configPath}`, err);
			throw err;
		}
	}
	async function readConfigFileSnapshotInternal() {
		maybeLoadDotEnvForConfig(deps.env);
		if (!deps.fs.existsSync(configPath)) return await finalizeReadConfigSnapshotInternalResult(deps, { snapshot: createConfigFileSnapshot({
			path: configPath,
			exists: false,
			raw: null,
			parsed: {},
			sourceConfig: {},
			valid: true,
			runtimeConfig: {},
			hash: hashConfigRaw(null),
			issues: [],
			warnings: [],
			legacyIssues: []
		}) });
		try {
			const raw = deps.fs.readFileSync(configPath, "utf-8");
			const rawHash = hashConfigRaw(raw);
			const parsedRes = parseConfigJson5(raw, deps.json5);
			if (!parsedRes.ok) return await finalizeReadConfigSnapshotInternalResult(deps, { snapshot: createConfigFileSnapshot({
				path: configPath,
				exists: true,
				raw,
				parsed: {},
				sourceConfig: {},
				valid: false,
				runtimeConfig: {},
				hash: rawHash,
				issues: [{
					path: "",
					message: `JSON5 parse failed: ${parsedRes.error}`
				}],
				warnings: [],
				legacyIssues: []
			}) });
			const recovered = await maybeRecoverSuspiciousConfigRead({
				deps,
				configPath,
				raw,
				parsed: parsedRes.parsed
			});
			const effectiveRaw = recovered.raw;
			const effectiveParsed = recovered.parsed;
			const hash = hashConfigRaw(effectiveRaw);
			let resolved;
			try {
				resolved = resolveConfigIncludesForRead(effectiveParsed, configPath, deps);
			} catch (err) {
				const message = err instanceof ConfigIncludeError ? err.message : `Include resolution failed: ${String(err)}`;
				return await finalizeReadConfigSnapshotInternalResult(deps, { snapshot: createConfigFileSnapshot({
					path: configPath,
					exists: true,
					raw: effectiveRaw,
					parsed: effectiveParsed,
					sourceConfig: coerceConfig(effectiveParsed),
					valid: false,
					runtimeConfig: coerceConfig(effectiveParsed),
					hash,
					issues: [{
						path: "",
						message
					}],
					warnings: [],
					legacyIssues: []
				}) });
			}
			const readResolution = resolveConfigForRead(resolved, deps.env);
			const envVarWarnings = readResolution.envWarnings.map((w) => ({
				path: w.configPath,
				message: `Missing env var "${w.varName}" - feature using this value will be unavailable`
			}));
			const resolvedConfigRaw = readResolution.resolvedConfigRaw;
			const legacyResolution = resolveLegacyConfigForRead(resolvedConfigRaw, effectiveParsed);
			const effectiveConfigRaw = legacyResolution.effectiveConfigRaw;
			const validated = validateConfigObjectWithPlugins(effectiveConfigRaw, { env: deps.env });
			if (!validated.ok) return await finalizeReadConfigSnapshotInternalResult(deps, { snapshot: createConfigFileSnapshot({
				path: configPath,
				exists: true,
				raw: effectiveRaw,
				parsed: effectiveParsed,
				sourceConfig: coerceConfig(effectiveConfigRaw),
				valid: false,
				runtimeConfig: coerceConfig(effectiveConfigRaw),
				hash,
				issues: validated.issues,
				warnings: [...validated.warnings, ...envVarWarnings],
				legacyIssues: legacyResolution.sourceLegacyIssues
			}) });
			warnIfConfigFromFuture(validated.config, deps.logger);
			const snapshotConfig = materializeRuntimeConfig(validated.config, "snapshot");
			return await finalizeReadConfigSnapshotInternalResult(deps, {
				snapshot: createConfigFileSnapshot({
					path: configPath,
					exists: true,
					raw: effectiveRaw,
					parsed: effectiveParsed,
					sourceConfig: coerceConfig(effectiveConfigRaw),
					valid: true,
					runtimeConfig: snapshotConfig,
					hash,
					issues: [],
					warnings: [...validated.warnings, ...envVarWarnings],
					legacyIssues: legacyResolution.sourceLegacyIssues
				}),
				envSnapshotForRestore: readResolution.envSnapshotForRestore
			});
		} catch (err) {
			const nodeErr = err;
			let message;
			if (nodeErr?.code === "EACCES") {
				const uid = process.getuid?.();
				const uidHint = typeof uid === "number" ? String(uid) : "$(id -u)";
				message = [
					`read failed: ${String(err)}`,
					``,
					`Config file is not readable by the current process. If running in a container`,
					`or 1-click deployment, fix ownership with:`,
					`  chown ${uidHint} "${configPath}"`,
					`Then restart the gateway.`
				].join("\n");
				deps.logger.error(message);
			} else message = `read failed: ${String(err)}`;
			return await finalizeReadConfigSnapshotInternalResult(deps, { snapshot: createConfigFileSnapshot({
				path: configPath,
				exists: true,
				raw: null,
				parsed: {},
				sourceConfig: {},
				valid: false,
				runtimeConfig: {},
				hash: hashConfigRaw(null),
				issues: [{
					path: "",
					message
				}],
				warnings: [],
				legacyIssues: []
			}) });
		}
	}
	async function readConfigFileSnapshot() {
		return (await readConfigFileSnapshotInternal()).snapshot;
	}
	async function readConfigFileSnapshotForWrite() {
		const result = await readConfigFileSnapshotInternal();
		return {
			snapshot: result.snapshot,
			writeOptions: {
				envSnapshotForRestore: result.envSnapshotForRestore,
				expectedConfigPath: configPath
			}
		};
	}
	async function writeConfigFile(cfg, options = {}) {
		let persistCandidate = cfg;
		const { snapshot } = await readConfigFileSnapshotInternal();
		let envRefMap = null;
		let changedPaths = null;
		if (snapshot.valid && snapshot.exists) {
			const patch = createMergePatch(snapshot.config, cfg);
			persistCandidate = applyMergePatch(projectSourceOntoRuntimeShape(snapshot.resolved, snapshot.config), patch);
			try {
				const resolvedIncludes = resolveConfigIncludes(snapshot.parsed, configPath, {
					readFile: (candidate) => deps.fs.readFileSync(candidate, "utf-8"),
					readFileWithGuards: ({ includePath, resolvedPath, rootRealDir }) => readConfigIncludeFileWithGuards({
						includePath,
						resolvedPath,
						rootRealDir,
						ioFs: deps.fs
					}),
					parseJson: (raw) => deps.json5.parse(raw)
				});
				const collected = /* @__PURE__ */ new Map();
				collectEnvRefPaths(resolvedIncludes, "", collected);
				if (collected.size > 0) {
					envRefMap = collected;
					changedPaths = /* @__PURE__ */ new Set();
					collectChangedPaths(snapshot.config, cfg, "", changedPaths);
				}
			} catch {
				envRefMap = null;
			}
		}
		const validated = validateConfigObjectRawWithPlugins(persistCandidate, { env: deps.env });
		if (!validated.ok) {
			const issue = validated.issues[0];
			const pathLabel = issue?.path ? issue.path : "<root>";
			const issueMessage = issue?.message ?? "invalid";
			throw new Error(formatConfigValidationFailure(pathLabel, issueMessage));
		}
		if (validated.warnings.length > 0) {
			const details = validated.warnings.map((warning) => `- ${warning.path}: ${warning.message}`).join("\n");
			deps.logger.warn(`Config warnings:\n${details}`);
		}
		let cfgToWrite = persistCandidate;
		try {
			if (deps.fs.existsSync(configPath)) {
				const parsedRes = parseConfigJson5(await deps.fs.promises.readFile(configPath, "utf-8"), deps.json5);
				if (parsedRes.ok) {
					const envForRestore = options.envSnapshotForRestore ?? deps.env;
					cfgToWrite = restoreEnvVarRefs(cfgToWrite, parsedRes.parsed, envForRestore);
				}
			}
		} catch {}
		const dir = path.dirname(configPath);
		await deps.fs.promises.mkdir(dir, {
			recursive: true,
			mode: 448
		});
		await tightenStateDirPermissionsIfNeeded({
			configPath,
			env: deps.env,
			homedir: deps.homedir,
			fsModule: deps.fs
		});
		let outputConfig = envRefMap && changedPaths ? restoreEnvRefsFromMap(cfgToWrite, "", envRefMap, changedPaths) : cfgToWrite;
		if (options.unsetPaths?.length) for (const unsetPath of options.unsetPaths) {
			if (!Array.isArray(unsetPath) || unsetPath.length === 0) continue;
			const unsetResult = unsetPathForWrite(outputConfig, unsetPath);
			if (unsetResult.changed) outputConfig = unsetResult.next;
		}
		const stampedOutputConfig = stampConfigVersion(outputConfig);
		const json = JSON.stringify(stampedOutputConfig, null, 2).trimEnd().concat("\n");
		const nextHash = hashConfigRaw(json);
		const previousHash = resolveConfigSnapshotHash(snapshot);
		const changedPathCount = changedPaths?.size;
		const previousBytes = typeof snapshot.raw === "string" ? Buffer.byteLength(snapshot.raw, "utf-8") : null;
		const nextBytes = Buffer.byteLength(json, "utf-8");
		const previousStat = snapshot.exists ? await deps.fs.promises.stat(configPath).catch(() => null) : null;
		const hasMetaBefore = hasConfigMeta(snapshot.parsed);
		const hasMetaAfter = hasConfigMeta(stampedOutputConfig);
		const gatewayModeBefore = resolveGatewayMode(snapshot.resolved);
		const gatewayModeAfter = resolveGatewayMode(stampedOutputConfig);
		const suspiciousReasons = resolveConfigWriteSuspiciousReasons({
			existsBefore: snapshot.exists,
			previousBytes,
			nextBytes,
			hasMetaBefore,
			gatewayModeBefore,
			gatewayModeAfter
		});
		const logConfigOverwrite = () => {
			if (!snapshot.exists) return;
			const isVitest = deps.env.VITEST === "true";
			const shouldLogInVitest = deps.env.OPENCLAW_TEST_CONFIG_OVERWRITE_LOG === "1";
			if (isVitest && !shouldLogInVitest) return;
			const changeSummary = typeof changedPathCount === "number" ? `, changedPaths=${changedPathCount}` : "";
			deps.logger.warn(`Config overwrite: ${configPath} (sha256 ${previousHash ?? "unknown"} -> ${nextHash}, backup=${configPath}.bak${changeSummary})`);
		};
		const logConfigWriteAnomalies = () => {
			if (suspiciousReasons.length === 0) return;
			const isVitest = deps.env.VITEST === "true";
			const shouldLogInVitest = deps.env.OPENCLAW_TEST_CONFIG_WRITE_ANOMALY_LOG === "1";
			if (isVitest && !shouldLogInVitest) return;
			deps.logger.warn(`Config write anomaly: ${configPath} (${suspiciousReasons.join(", ")})`);
		};
		const auditRecordBase = {
			ts: (/* @__PURE__ */ new Date()).toISOString(),
			source: "config-io",
			event: "config.write",
			configPath,
			pid: process.pid,
			ppid: process.ppid,
			cwd: process.cwd(),
			argv: process.argv.slice(0, 8),
			execArgv: process.execArgv.slice(0, 8),
			watchMode: deps.env.OPENCLAW_WATCH_MODE === "1",
			watchSession: typeof deps.env.OPENCLAW_WATCH_SESSION === "string" && deps.env.OPENCLAW_WATCH_SESSION.trim().length > 0 ? deps.env.OPENCLAW_WATCH_SESSION.trim() : null,
			watchCommand: typeof deps.env.OPENCLAW_WATCH_COMMAND === "string" && deps.env.OPENCLAW_WATCH_COMMAND.trim().length > 0 ? deps.env.OPENCLAW_WATCH_COMMAND.trim() : null,
			existsBefore: snapshot.exists,
			previousHash: previousHash ?? null,
			nextHash,
			previousBytes,
			nextBytes,
			previousDev: resolveConfigStatMetadata(previousStat).dev,
			nextDev: null,
			previousIno: resolveConfigStatMetadata(previousStat).ino,
			nextIno: null,
			previousMode: resolveConfigStatMetadata(previousStat).mode,
			nextMode: null,
			previousNlink: resolveConfigStatMetadata(previousStat).nlink,
			nextNlink: null,
			previousUid: resolveConfigStatMetadata(previousStat).uid,
			nextUid: null,
			previousGid: resolveConfigStatMetadata(previousStat).gid,
			nextGid: null,
			changedPathCount: typeof changedPathCount === "number" ? changedPathCount : null,
			hasMetaBefore,
			hasMetaAfter,
			gatewayModeBefore,
			gatewayModeAfter,
			suspicious: suspiciousReasons
		};
		const appendWriteAudit = async (result, err, nextStat) => {
			const errorCode = err && typeof err === "object" && "code" in err && typeof err.code === "string" ? err.code : void 0;
			const errorMessage = err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : void 0;
			const nextMetadata = resolveConfigStatMetadata(nextStat ?? null);
			await appendConfigAuditRecord(deps, {
				...auditRecordBase,
				result,
				nextHash: result === "failed" ? null : auditRecordBase.nextHash,
				nextBytes: result === "failed" ? null : auditRecordBase.nextBytes,
				nextDev: result === "failed" ? null : nextMetadata.dev,
				nextIno: result === "failed" ? null : nextMetadata.ino,
				nextMode: result === "failed" ? null : nextMetadata.mode,
				nextNlink: result === "failed" ? null : nextMetadata.nlink,
				nextUid: result === "failed" ? null : nextMetadata.uid,
				nextGid: result === "failed" ? null : nextMetadata.gid,
				errorCode,
				errorMessage
			});
		};
		const tmp = path.join(dir, `${path.basename(configPath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
		try {
			await deps.fs.promises.writeFile(tmp, json, {
				encoding: "utf-8",
				mode: 384
			});
			if (deps.fs.existsSync(configPath)) await maintainConfigBackups(configPath, deps.fs.promises);
			try {
				await deps.fs.promises.rename(tmp, configPath);
			} catch (err) {
				const code = err.code;
				if (code === "EPERM" || code === "EEXIST") {
					await deps.fs.promises.copyFile(tmp, configPath);
					await deps.fs.promises.chmod(configPath, 384).catch(() => {});
					await deps.fs.promises.unlink(tmp).catch(() => {});
					logConfigOverwrite();
					logConfigWriteAnomalies();
					await appendWriteAudit("copy-fallback", void 0, await deps.fs.promises.stat(configPath).catch(() => null));
					return { persistedHash: nextHash };
				}
				await deps.fs.promises.unlink(tmp).catch(() => {});
				throw err;
			}
			logConfigOverwrite();
			logConfigWriteAnomalies();
			await appendWriteAudit("rename", void 0, await deps.fs.promises.stat(configPath).catch(() => null));
			return { persistedHash: nextHash };
		} catch (err) {
			await appendWriteAudit("failed", err);
			throw err;
		}
	}
	return {
		configPath,
		loadConfig,
		readConfigFileSnapshot,
		readConfigFileSnapshotForWrite,
		writeConfigFile
	};
}
const AUTO_OWNER_DISPLAY_SECRET_BY_PATH = /* @__PURE__ */ new Map();
const AUTO_OWNER_DISPLAY_SECRET_PERSIST_IN_FLIGHT = /* @__PURE__ */ new Set();
const AUTO_OWNER_DISPLAY_SECRET_PERSIST_WARNED = /* @__PURE__ */ new Set();
const configWriteListeners = /* @__PURE__ */ new Set();
function notifyConfigWriteListeners(event) {
	for (const listener of configWriteListeners) try {
		listener(event);
	} catch {}
}
function clearConfigCache() {}
function registerConfigWriteListener(listener) {
	configWriteListeners.add(listener);
	return () => {
		configWriteListeners.delete(listener);
	};
}
function isCompatibleTopLevelRuntimeProjectionShape(params) {
	const runtime = params.runtimeSnapshot;
	const candidate = params.candidate;
	for (const key of Object.keys(runtime)) {
		if (!Object.hasOwn(candidate, key)) return false;
		const runtimeValue = runtime[key];
		const candidateValue = candidate[key];
		if ((Array.isArray(runtimeValue) ? "array" : runtimeValue === null ? "null" : typeof runtimeValue) !== (Array.isArray(candidateValue) ? "array" : candidateValue === null ? "null" : typeof candidateValue)) return false;
	}
	return true;
}
function projectConfigOntoRuntimeSourceSnapshot(config) {
	const runtimeConfigSnapshot = getRuntimeConfigSnapshot();
	const runtimeConfigSourceSnapshot = getRuntimeConfigSourceSnapshot();
	if (!runtimeConfigSnapshot || !runtimeConfigSourceSnapshot) return config;
	if (config === runtimeConfigSnapshot) return runtimeConfigSourceSnapshot;
	if (!isCompatibleTopLevelRuntimeProjectionShape({
		runtimeSnapshot: runtimeConfigSnapshot,
		candidate: config
	})) return config;
	return coerceConfig(applyMergePatch(coerceConfig(projectSourceOntoRuntimeShape(runtimeConfigSourceSnapshot, runtimeConfigSnapshot)), createMergePatch(runtimeConfigSnapshot, config)));
}
function loadConfig() {
	const runtimeConfigSnapshot = getRuntimeConfigSnapshot();
	if (runtimeConfigSnapshot) return runtimeConfigSnapshot;
	const config = createConfigIO().loadConfig();
	setRuntimeConfigSnapshot(config);
	return getRuntimeConfigSnapshot() ?? config;
}
function getRuntimeConfig() {
	return loadConfig();
}
async function readBestEffortConfig() {
	const snapshot = await readConfigFileSnapshot();
	return snapshot.valid ? loadConfig() : snapshot.config;
}
async function readConfigFileSnapshot() {
	return await createConfigIO().readConfigFileSnapshot();
}
async function readSourceConfigSnapshot() {
	return await readConfigFileSnapshot();
}
async function readConfigFileSnapshotForWrite() {
	return await createConfigIO().readConfigFileSnapshotForWrite();
}
async function readSourceConfigSnapshotForWrite() {
	return await readConfigFileSnapshotForWrite();
}
async function writeConfigFile(cfg, options = {}) {
	const io = createConfigIO();
	let nextCfg = cfg;
	const runtimeConfigSnapshot = getRuntimeConfigSnapshot();
	const runtimeConfigSourceSnapshot = getRuntimeConfigSourceSnapshot();
	const hadRuntimeSnapshot = Boolean(runtimeConfigSnapshot);
	const hadBothSnapshots = Boolean(runtimeConfigSnapshot && runtimeConfigSourceSnapshot);
	if (hadBothSnapshots) nextCfg = coerceConfig(applyMergePatch(runtimeConfigSourceSnapshot, createMergePatch(runtimeConfigSnapshot, cfg)));
	const sameConfigPath = options.expectedConfigPath === void 0 || options.expectedConfigPath === io.configPath;
	const writeResult = await io.writeConfigFile(nextCfg, {
		envSnapshotForRestore: sameConfigPath ? options.envSnapshotForRestore : void 0,
		unsetPaths: options.unsetPaths
	});
	const notifyCommittedWrite = () => {
		const currentRuntimeConfig = getRuntimeConfigSnapshot();
		if (!currentRuntimeConfig) return;
		notifyConfigWriteListeners({
			configPath: io.configPath,
			sourceConfig: nextCfg,
			runtimeConfig: currentRuntimeConfig,
			persistedHash: writeResult.persistedHash,
			writtenAtMs: Date.now()
		});
	};
	const refreshHandler = getRuntimeConfigSnapshotRefreshHandler();
	if (refreshHandler) try {
		if (await refreshHandler.refresh({ sourceConfig: nextCfg })) {
			notifyCommittedWrite();
			return;
		}
	} catch (error) {
		try {
			refreshHandler.clearOnRefreshFailure?.();
		} catch {}
		const detail = error instanceof Error ? error.message : String(error);
		throw new ConfigRuntimeRefreshError(`Config was written to ${io.configPath}, but runtime snapshot refresh failed: ${detail}`, { cause: error });
	}
	if (hadBothSnapshots) {
		setRuntimeConfigSnapshot(io.loadConfig(), nextCfg);
		notifyCommittedWrite();
		return;
	}
	if (hadRuntimeSnapshot) {
		setRuntimeConfigSnapshot(io.loadConfig());
		notifyCommittedWrite();
		return;
	}
	setRuntimeConfigSnapshot(io.loadConfig());
	notifyCommittedWrite();
}
//#endregion
export { resolvePolicyTargetResolution as $, getConfigValueAtPath as A, LEGACY_CONFIG_MIGRATIONS as At, validateSafeBinArgv as B, collectPluginSchemaMetadata as C, resolveActiveTalkProviderConfig as Ct, resetConfigOverrides as D, normalizeProviderSpecificConfig as Dt, getConfigOverrides as E, applyNativeStreamingUsageCompat as Et, asRuntimeConfig as F, collectDurableServiceEnvVars as Ft, resolveAllowlistCandidatePath as G, normalizeSafeBinName as H, getTrustedSafeBinDirs as I, createConfigRuntimeEnv as It, resolveCommandResolutionFromArgv as J, resolveApprovalAuditCandidatePath as K, isTrustedSafeBinPath as L, listPluginDoctorLegacyConfigRules as Lt, setConfigValueAtPath as M, migrateLegacyXSearchConfig as Mt, unsetConfigValueAtPath as N, ensureControlUiAllowedOriginsForNonLoopbackBind as Nt, setConfigOverride as O, resolveProviderConfigApiKeyResolver as Ot, asResolvedSourceConfig as P, mergeMissing as Pt, resolvePolicyTargetCandidatePath as Q, listWritableExplicitTrustedSafeBinDirs as R, resolveOwnerDisplaySetting as Rt, collectChannelSchemaMetadata as S, normalizeTalkSection as St, applyConfigOverrides as T, resolveSubagentMaxConcurrent as Tt, matchAllowlist as U, listRiskyConfiguredSafeBins as V, parseExecArgvToken as W, resolveExecutionTargetResolution as X, resolveExecutionTargetCandidatePath as Y, resolvePolicyAllowlistCandidatePath as Z, collectUnsupportedSecretRefPolicyIssues as _, SAFE_BIN_PROFILES as _t, loadConfig as a, extractShellWrapperInlineCommand as at, validateConfigObjectRawWithPlugins as b, resolveNormalizedProviderModelMaxTokens as bt, readBestEffortConfig as c, unwrapKnownShellMultiplexerInvocation as ct, readSourceConfigSnapshot as d, resolveInlineCommandMatch as dt, resolveExecutableFromPathEnv as et, readSourceConfigSnapshotForWrite as f, isDispatchWrapperExecutable as ft, normalizeOpenClawVersionBase as g, DEFAULT_SAFE_BINS as gt, writeConfigFile as h, normalizeExecutableToken as ht, getRuntimeConfig as i, extractShellWrapperCommand as it, parseConfigPath as j, migrateLegacyWebSearchConfig as jt, unsetConfigOverride as k, findLegacyConfigIssues as kt, readConfigFileSnapshot as l, POSIX_INLINE_COMMAND_FLAGS as lt, resolveConfigSnapshotHash as m, unwrapKnownDispatchWrapperInvocation as mt, clearConfigCache as n, POSIX_SHELL_WRAPPERS as nt, parseConfigJson5 as o, hasEnvManipulationBeforeShellWrapper as ot, registerConfigWriteListener as p, unwrapDispatchWrappersForResolution as pt, resolveCommandResolution as q, createConfigIO as r, POWERSHELL_WRAPPERS as rt, projectConfigOntoRuntimeSourceSnapshot as s, isShellWrapperExecutable as st, ConfigRuntimeRefreshError as t, resolveExecWrapperTrustPlan as tt, readConfigFileSnapshotForWrite as u, POWERSHELL_INLINE_COMMAND_FLAGS as ut, validateConfigObject as v, normalizeSafeBinProfileFixtures as vt, GENERATED_BUNDLED_CHANNEL_CONFIG_METADATA as w, resolveAgentMaxConcurrent as wt, validateConfigObjectWithPlugins as x, buildTalkConfigResponse as xt, validateConfigObjectRaw as y, resolveSafeBinProfiles as yt, normalizeTrustedSafeBinDirs as z };
