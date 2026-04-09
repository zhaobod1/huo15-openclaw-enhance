import { i as loadPluginManifest, r as getPackageManifestMetadata } from "./manifest-BLZdOZfM.js";
import { n as buildPluginLoaderJitiOptions, r as resolveLoaderPackageRoot, s as shouldPreferNativeJiti, t as buildPluginLoaderAliasMap } from "./sdk-alias-7jGsJqWE.js";
import { A as TtsConfigSchema, I as createAllowDenyChannelRulesSchema, N as TypingModeSchema, O as TranscribeAudioSchema, S as SecretInputSchema, T as SecretsConfigSchema, c as GroupPolicySchema, f as InboundDebounceSchema, g as NativeCommandsSettingSchema, h as ModelsConfigSchema, l as HexColorSchema, n as BlockStreamingCoalesceSchema, r as ContextVisibilityModeSchema, s as GroupChatSchema, t as BlockStreamingChunkSchema, u as HumanDelaySchema, v as QueueSchema } from "./zod-schema.core-BITC5-JP.js";
import { t as parseDurationMs } from "./parse-duration-CG2hdvNG.js";
import { a as MemorySearchSchema, c as AgentModelSchema, i as HeartbeatSchema, n as AgentSandboxSchema, r as ElevatedAllowFromSchema, s as ToolsSchema, t as AgentEntrySchema } from "./zod-schema.agent-runtime-cSDGDkCI.js";
import { t as sensitive } from "./zod-schema.sensitive-CDTkVMNJ.js";
import { r as buildChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { p as ChannelHeartbeatVisibilitySchema } from "./zod-schema.providers-core-COgcDZGS.js";
import "./zod-schema.providers-whatsapp-BxD_GymF.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";
import { z } from "zod";
//#region src/cli/parse-bytes.ts
const UNIT_MULTIPLIERS = {
	b: 1,
	kb: 1024,
	k: 1024,
	mb: 1024 ** 2,
	m: 1024 ** 2,
	gb: 1024 ** 3,
	g: 1024 ** 3,
	tb: 1024 ** 4,
	t: 1024 ** 4
};
function parseByteSize(raw, opts) {
	const trimmed = String(raw ?? "").trim().toLowerCase();
	if (!trimmed) throw new Error("invalid byte size (empty)");
	const m = /^(\d+(?:\.\d+)?)([a-z]+)?$/.exec(trimmed);
	if (!m) throw new Error(`invalid byte size: ${raw}`);
	const value = Number(m[1]);
	if (!Number.isFinite(value) || value < 0) throw new Error(`invalid byte size: ${raw}`);
	const multiplier = UNIT_MULTIPLIERS[(m[2] ?? opts?.defaultUnit ?? "b").toLowerCase()];
	if (!multiplier) throw new Error(`invalid byte size unit: ${raw}`);
	const bytes = Math.round(value * multiplier);
	if (!Number.isFinite(bytes)) throw new Error(`invalid byte size: ${raw}`);
	return bytes;
}
//#endregion
//#region src/config/byte-size.ts
/**
* Parse an optional byte-size value from config.
* Accepts non-negative numbers or strings like "2mb".
*/
function parseNonNegativeByteSize(value) {
	if (typeof value === "number" && Number.isFinite(value)) {
		const int = Math.floor(value);
		return int >= 0 ? int : null;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		try {
			const bytes = parseByteSize(trimmed, { defaultUnit: "b" });
			return bytes >= 0 ? bytes : null;
		} catch {
			return null;
		}
	}
	return null;
}
function isValidNonNegativeByteSizeString(value) {
	return parseNonNegativeByteSize(value) !== null;
}
//#endregion
//#region src/config/zod-schema.agent-defaults.ts
const AgentDefaultsSchema = z.object({
	params: z.record(z.string(), z.unknown()).optional(),
	model: AgentModelSchema.optional(),
	imageModel: AgentModelSchema.optional(),
	imageGenerationModel: AgentModelSchema.optional(),
	videoGenerationModel: AgentModelSchema.optional(),
	musicGenerationModel: AgentModelSchema.optional(),
	pdfModel: AgentModelSchema.optional(),
	pdfMaxBytesMb: z.number().positive().optional(),
	pdfMaxPages: z.number().int().positive().optional(),
	models: z.record(z.string(), z.object({
		alias: z.string().optional(),
		params: z.record(z.string(), z.unknown()).optional(),
		streaming: z.boolean().optional()
	}).strict()).optional(),
	workspace: z.string().optional(),
	skills: z.array(z.string()).optional(),
	repoRoot: z.string().optional(),
	skipBootstrap: z.boolean().optional(),
	bootstrapMaxChars: z.number().int().positive().optional(),
	bootstrapTotalMaxChars: z.number().int().positive().optional(),
	bootstrapPromptTruncationWarning: z.union([
		z.literal("off"),
		z.literal("once"),
		z.literal("always")
	]).optional(),
	userTimezone: z.string().optional(),
	timeFormat: z.union([
		z.literal("auto"),
		z.literal("12"),
		z.literal("24")
	]).optional(),
	envelopeTimezone: z.string().optional(),
	envelopeTimestamp: z.union([z.literal("on"), z.literal("off")]).optional(),
	envelopeElapsed: z.union([z.literal("on"), z.literal("off")]).optional(),
	contextTokens: z.number().int().positive().optional(),
	memorySearch: MemorySearchSchema,
	contextPruning: z.object({
		mode: z.union([z.literal("off"), z.literal("cache-ttl")]).optional(),
		ttl: z.string().optional(),
		keepLastAssistants: z.number().int().nonnegative().optional(),
		softTrimRatio: z.number().min(0).max(1).optional(),
		hardClearRatio: z.number().min(0).max(1).optional(),
		minPrunableToolChars: z.number().int().nonnegative().optional(),
		tools: z.object({
			allow: z.array(z.string()).optional(),
			deny: z.array(z.string()).optional()
		}).strict().optional(),
		softTrim: z.object({
			maxChars: z.number().int().nonnegative().optional(),
			headChars: z.number().int().nonnegative().optional(),
			tailChars: z.number().int().nonnegative().optional()
		}).strict().optional(),
		hardClear: z.object({
			enabled: z.boolean().optional(),
			placeholder: z.string().optional()
		}).strict().optional()
	}).strict().optional(),
	llm: z.object({ idleTimeoutSeconds: z.number().int().nonnegative().optional().describe("Idle timeout for LLM streaming responses in seconds. If no token is received within this time, the request is aborted. Set to 0 to disable. Default: 60 seconds.") }).strict().optional(),
	compaction: z.object({
		mode: z.union([z.literal("default"), z.literal("safeguard")]).optional(),
		reserveTokens: z.number().int().nonnegative().optional(),
		keepRecentTokens: z.number().int().positive().optional(),
		reserveTokensFloor: z.number().int().nonnegative().optional(),
		maxHistoryShare: z.number().min(.1).max(.9).optional(),
		customInstructions: z.string().optional(),
		identifierPolicy: z.union([
			z.literal("strict"),
			z.literal("off"),
			z.literal("custom")
		]).optional(),
		identifierInstructions: z.string().optional(),
		recentTurnsPreserve: z.number().int().min(0).max(12).optional(),
		qualityGuard: z.object({
			enabled: z.boolean().optional(),
			maxRetries: z.number().int().nonnegative().optional()
		}).strict().optional(),
		postIndexSync: z.enum([
			"off",
			"async",
			"await"
		]).optional(),
		postCompactionSections: z.array(z.string()).optional(),
		model: z.string().optional(),
		timeoutSeconds: z.number().int().positive().optional(),
		memoryFlush: z.object({
			enabled: z.boolean().optional(),
			softThresholdTokens: z.number().int().nonnegative().optional(),
			forceFlushTranscriptBytes: z.union([z.number().int().nonnegative(), z.string().refine(isValidNonNegativeByteSizeString, "Expected byte size string like 2mb")]).optional(),
			prompt: z.string().optional(),
			systemPrompt: z.string().optional()
		}).strict().optional(),
		notifyUser: z.boolean().optional()
	}).strict().optional(),
	embeddedPi: z.object({ projectSettingsPolicy: z.union([
		z.literal("trusted"),
		z.literal("sanitize"),
		z.literal("ignore")
	]).optional() }).strict().optional(),
	thinkingDefault: z.union([
		z.literal("off"),
		z.literal("minimal"),
		z.literal("low"),
		z.literal("medium"),
		z.literal("high"),
		z.literal("xhigh"),
		z.literal("adaptive")
	]).optional(),
	verboseDefault: z.union([
		z.literal("off"),
		z.literal("on"),
		z.literal("full")
	]).optional(),
	elevatedDefault: z.union([
		z.literal("off"),
		z.literal("on"),
		z.literal("ask"),
		z.literal("full")
	]).optional(),
	blockStreamingDefault: z.union([z.literal("off"), z.literal("on")]).optional(),
	blockStreamingBreak: z.union([z.literal("text_end"), z.literal("message_end")]).optional(),
	blockStreamingChunk: BlockStreamingChunkSchema.optional(),
	blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
	humanDelay: HumanDelaySchema.optional(),
	timeoutSeconds: z.number().int().positive().optional(),
	mediaMaxMb: z.number().positive().optional(),
	imageMaxDimensionPx: z.number().int().positive().optional(),
	typingIntervalSeconds: z.number().int().positive().optional(),
	typingMode: TypingModeSchema.optional(),
	heartbeat: HeartbeatSchema,
	maxConcurrent: z.number().int().positive().optional(),
	subagents: z.object({
		allowAgents: z.array(z.string()).optional(),
		maxConcurrent: z.number().int().positive().optional(),
		maxSpawnDepth: z.number().int().min(1).max(5).optional().describe("Maximum nesting depth for sub-agent spawning. 1 = no nesting (default), 2 = sub-agents can spawn sub-sub-agents."),
		maxChildrenPerAgent: z.number().int().min(1).max(20).optional().describe("Maximum number of active children a single agent session can spawn (default: 5)."),
		archiveAfterMinutes: z.number().int().min(0).optional(),
		model: AgentModelSchema.optional(),
		thinking: z.string().optional(),
		runTimeoutSeconds: z.number().int().min(0).optional(),
		announceTimeoutMs: z.number().int().positive().optional(),
		requireAgentId: z.boolean().optional()
	}).strict().optional(),
	sandbox: AgentSandboxSchema
}).strict().optional();
//#endregion
//#region src/config/zod-schema.agents.ts
const AgentsSchema = z.object({
	defaults: z.lazy(() => AgentDefaultsSchema).optional(),
	list: z.array(AgentEntrySchema).optional()
}).strict().optional();
const BindingMatchSchema = z.object({
	channel: z.string(),
	accountId: z.string().optional(),
	peer: z.object({
		kind: z.union([
			z.literal("direct"),
			z.literal("group"),
			z.literal("channel"),
			z.literal("dm")
		]),
		id: z.string()
	}).strict().optional(),
	guildId: z.string().optional(),
	teamId: z.string().optional(),
	roles: z.array(z.string()).optional()
}).strict();
const RouteBindingSchema = z.object({
	type: z.literal("route").optional(),
	agentId: z.string(),
	comment: z.string().optional(),
	match: BindingMatchSchema
}).strict();
const AcpBindingSchema = z.object({
	type: z.literal("acp"),
	agentId: z.string(),
	comment: z.string().optional(),
	match: BindingMatchSchema,
	acp: z.object({
		mode: z.enum(["persistent", "oneshot"]).optional(),
		label: z.string().optional(),
		cwd: z.string().optional(),
		backend: z.string().optional()
	}).strict().optional()
}).strict().superRefine((value, ctx) => {
	if (!(value.match.peer?.id?.trim() ?? "")) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["match", "peer"],
			message: "ACP bindings require match.peer.id to target a concrete conversation."
		});
		return;
	}
});
const BindingsSchema = z.array(z.union([RouteBindingSchema, AcpBindingSchema])).optional();
const BroadcastStrategySchema = z.enum(["parallel", "sequential"]);
const BroadcastSchema = z.object({ strategy: BroadcastStrategySchema.optional() }).catchall(z.array(z.string())).optional();
const AudioSchema = z.object({ transcription: TranscribeAudioSchema }).strict().optional();
//#endregion
//#region src/config/zod-schema.approvals.ts
const ExecApprovalForwardTargetSchema = z.object({
	channel: z.string().min(1),
	to: z.string().min(1),
	accountId: z.string().optional(),
	threadId: z.union([z.string(), z.number()]).optional()
}).strict();
const ExecApprovalForwardingSchema = z.object({
	enabled: z.boolean().optional(),
	mode: z.union([
		z.literal("session"),
		z.literal("targets"),
		z.literal("both")
	]).optional(),
	agentFilter: z.array(z.string()).optional(),
	sessionFilter: z.array(z.string()).optional(),
	targets: z.array(ExecApprovalForwardTargetSchema).optional()
}).strict().optional();
const ApprovalsSchema = z.object({
	exec: ExecApprovalForwardingSchema,
	plugin: ExecApprovalForwardingSchema
}).strict().optional();
//#endregion
//#region src/config/zod-schema.installs.ts
const InstallSourceSchema = z.union([
	z.literal("npm"),
	z.literal("archive"),
	z.literal("path"),
	z.literal("clawhub")
]);
const PluginInstallSourceSchema = z.union([InstallSourceSchema, z.literal("marketplace")]);
const InstallRecordShape = {
	source: InstallSourceSchema,
	spec: z.string().optional(),
	sourcePath: z.string().optional(),
	installPath: z.string().optional(),
	version: z.string().optional(),
	resolvedName: z.string().optional(),
	resolvedVersion: z.string().optional(),
	resolvedSpec: z.string().optional(),
	integrity: z.string().optional(),
	shasum: z.string().optional(),
	resolvedAt: z.string().optional(),
	installedAt: z.string().optional(),
	clawhubUrl: z.string().optional(),
	clawhubPackage: z.string().optional(),
	clawhubFamily: z.union([z.literal("code-plugin"), z.literal("bundle-plugin")]).optional(),
	clawhubChannel: z.union([
		z.literal("official"),
		z.literal("community"),
		z.literal("private")
	]).optional()
};
const PluginInstallRecordShape = {
	...InstallRecordShape,
	source: PluginInstallSourceSchema,
	marketplaceName: z.string().optional(),
	marketplaceSource: z.string().optional(),
	marketplacePlugin: z.string().optional()
};
//#endregion
//#region src/config/zod-schema.hooks.ts
function isSafeRelativeModulePath(raw) {
	const value = raw.trim();
	if (!value) return false;
	if (path.isAbsolute(value)) return false;
	if (value.startsWith("~")) return false;
	if (value.includes(":")) return false;
	if (value.split(/[\\/]+/g).some((part) => part === "..")) return false;
	return true;
}
const SafeRelativeModulePathSchema = z.string().refine(isSafeRelativeModulePath, "module must be a safe relative path (no absolute paths)");
const HookMappingSchema = z.object({
	id: z.string().optional(),
	match: z.object({
		path: z.string().optional(),
		source: z.string().optional()
	}).optional(),
	action: z.union([z.literal("wake"), z.literal("agent")]).optional(),
	wakeMode: z.union([z.literal("now"), z.literal("next-heartbeat")]).optional(),
	name: z.string().optional(),
	agentId: z.string().optional(),
	sessionKey: z.string().optional().register(sensitive),
	messageTemplate: z.string().optional(),
	textTemplate: z.string().optional(),
	deliver: z.boolean().optional(),
	allowUnsafeExternalContent: z.boolean().optional(),
	channel: z.string().trim().min(1).optional(),
	to: z.string().optional(),
	model: z.string().optional(),
	thinking: z.string().optional(),
	timeoutSeconds: z.number().int().positive().optional(),
	transform: z.object({
		module: SafeRelativeModulePathSchema,
		export: z.string().optional()
	}).strict().optional()
}).strict().optional();
const InternalHookHandlerSchema = z.object({
	event: z.string(),
	module: SafeRelativeModulePathSchema,
	export: z.string().optional()
}).strict();
const HookConfigSchema = z.object({
	enabled: z.boolean().optional(),
	env: z.record(z.string(), z.string()).optional()
}).passthrough();
const HookInstallRecordSchema = z.object({
	...InstallRecordShape,
	hooks: z.array(z.string()).optional()
}).strict();
const InternalHooksSchema = z.object({
	enabled: z.boolean().optional(),
	handlers: z.array(InternalHookHandlerSchema).optional(),
	entries: z.record(z.string(), HookConfigSchema).optional(),
	load: z.object({ extraDirs: z.array(z.string()).optional() }).strict().optional(),
	installs: z.record(z.string(), HookInstallRecordSchema).optional()
}).strict().optional();
const HooksGmailSchema = z.object({
	account: z.string().optional(),
	label: z.string().optional(),
	topic: z.string().optional(),
	subscription: z.string().optional(),
	pushToken: z.string().optional().register(sensitive),
	hookUrl: z.string().optional(),
	includeBody: z.boolean().optional(),
	maxBytes: z.number().int().positive().optional(),
	renewEveryMinutes: z.number().int().positive().optional(),
	allowUnsafeExternalContent: z.boolean().optional(),
	serve: z.object({
		bind: z.string().optional(),
		port: z.number().int().positive().optional(),
		path: z.string().optional()
	}).strict().optional(),
	tailscale: z.object({
		mode: z.union([
			z.literal("off"),
			z.literal("serve"),
			z.literal("funnel")
		]).optional(),
		path: z.string().optional(),
		target: z.string().optional()
	}).strict().optional(),
	model: z.string().optional(),
	thinking: z.union([
		z.literal("off"),
		z.literal("minimal"),
		z.literal("low"),
		z.literal("medium"),
		z.literal("high")
	]).optional()
}).strict().optional();
//#endregion
//#region src/plugins/bundled-channel-config-metadata.ts
const PUBLIC_SURFACE_SOURCE_EXTENSIONS$1 = [
	".ts",
	".mts",
	".js",
	".mjs",
	".cts",
	".cjs"
];
const SOURCE_CONFIG_SCHEMA_CANDIDATES = [
	path.join("src", "config-schema.ts"),
	path.join("src", "config-schema.js"),
	path.join("src", "config-schema.mts"),
	path.join("src", "config-schema.mjs"),
	path.join("src", "config-schema.cts"),
	path.join("src", "config-schema.cjs")
];
const PUBLIC_CONFIG_SURFACE_BASENAMES = [
	"channel-config-api",
	"runtime-api",
	"api"
];
const jitiLoaders = /* @__PURE__ */ new Map();
function trimString$2(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function normalizeStringList$1(value) {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => trimString$2(entry) ?? "").filter(Boolean);
}
function isBuiltChannelConfigSchema(value) {
	if (!value || typeof value !== "object") return false;
	const candidate = value;
	return Boolean(candidate.schema && typeof candidate.schema === "object");
}
function resolveConfigSchemaExport(imported) {
	for (const [name, value] of Object.entries(imported)) if (name.endsWith("ChannelConfigSchema") && isBuiltChannelConfigSchema(value)) return value;
	for (const [name, value] of Object.entries(imported)) {
		if (!name.endsWith("ConfigSchema") || name.endsWith("AccountConfigSchema")) continue;
		if (isBuiltChannelConfigSchema(value)) return value;
		if (value && typeof value === "object") return buildChannelConfigSchema(value);
	}
	for (const value of Object.values(imported)) if (isBuiltChannelConfigSchema(value)) return value;
	return null;
}
function getJiti(modulePath) {
	const tryNative = shouldPreferNativeJiti(modulePath) || modulePath.includes(`${path.sep}dist${path.sep}`);
	const aliasMap = buildPluginLoaderAliasMap(modulePath, process.argv[1], import.meta.url);
	const cacheKey = JSON.stringify({
		tryNative,
		aliasMap: Object.entries(aliasMap).toSorted(([left], [right]) => left.localeCompare(right))
	});
	const cached = jitiLoaders.get(cacheKey);
	if (cached) return cached;
	const loader = createJiti(import.meta.url, {
		...buildPluginLoaderJitiOptions(aliasMap),
		tryNative
	});
	jitiLoaders.set(cacheKey, loader);
	return loader;
}
function resolveChannelConfigSchemaModulePath(pluginDir) {
	for (const relativePath of SOURCE_CONFIG_SCHEMA_CANDIDATES) {
		const candidate = path.join(pluginDir, relativePath);
		if (fs.existsSync(candidate)) return candidate;
	}
	for (const basename of PUBLIC_CONFIG_SURFACE_BASENAMES) for (const extension of PUBLIC_SURFACE_SOURCE_EXTENSIONS$1) {
		const candidate = path.join(pluginDir, `${basename}${extension}`);
		if (fs.existsSync(candidate)) return candidate;
	}
}
function loadChannelConfigSurfaceModuleSync(modulePath) {
	try {
		return resolveConfigSchemaExport(getJiti(modulePath)(modulePath));
	} catch {
		return null;
	}
}
function resolvePackageChannelMeta(packageManifest, channelId) {
	const channelMeta = packageManifest?.channel;
	return channelMeta?.id?.trim() === channelId ? channelMeta : void 0;
}
function collectBundledChannelConfigs(params) {
	const channelIds = normalizeStringList$1(params.manifest.channels);
	const existingChannelConfigs = params.manifest.channelConfigs && Object.keys(params.manifest.channelConfigs).length > 0 ? { ...params.manifest.channelConfigs } : {};
	if (channelIds.length === 0) return Object.keys(existingChannelConfigs).length > 0 ? existingChannelConfigs : void 0;
	const surfaceModulePath = resolveChannelConfigSchemaModulePath(params.pluginDir);
	const surface = surfaceModulePath ? loadChannelConfigSurfaceModuleSync(surfaceModulePath) : null;
	for (const channelId of channelIds) {
		const existing = existingChannelConfigs[channelId];
		const channelMeta = resolvePackageChannelMeta(params.packageManifest, channelId);
		const preferOver = normalizeStringList$1(channelMeta?.preferOver);
		const uiHints = surface?.uiHints || existing?.uiHints ? {
			...surface?.uiHints && Object.keys(surface.uiHints).length > 0 ? surface.uiHints : {},
			...existing?.uiHints && Object.keys(existing.uiHints).length > 0 ? existing.uiHints : {}
		} : void 0;
		if (!surface?.schema && !existing?.schema) continue;
		existingChannelConfigs[channelId] = {
			schema: surface?.schema ?? existing?.schema ?? {},
			...uiHints && Object.keys(uiHints).length > 0 ? { uiHints } : {},
			...surface?.runtime ?? existing?.runtime ? { runtime: surface?.runtime ?? existing?.runtime } : {},
			...trimString$2(existing?.label) ?? trimString$2(channelMeta?.label) ? { label: trimString$2(existing?.label) ?? trimString$2(channelMeta?.label) } : {},
			...trimString$2(existing?.description) ?? trimString$2(channelMeta?.blurb) ? { description: trimString$2(existing?.description) ?? trimString$2(channelMeta?.blurb) } : {},
			...existing?.preferOver?.length ? { preferOver: existing.preferOver } : preferOver.length > 0 ? { preferOver } : {}
		};
	}
	return Object.keys(existingChannelConfigs).length > 0 ? existingChannelConfigs : void 0;
}
//#endregion
//#region src/plugins/bundled-plugin-scan.ts
const PUBLIC_SURFACE_SOURCE_EXTENSIONS = [
	".ts",
	".mts",
	".js",
	".mjs",
	".cts",
	".cjs"
];
const RUNTIME_SIDECAR_ARTIFACTS = new Set([
	"helper-api.js",
	"light-runtime-api.js",
	"runtime-api.js",
	"thread-bindings-runtime.js"
]);
function trimString$1(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function rewriteEntryToBuiltPath$1(entry) {
	if (!entry) return;
	return entry.replace(/^\.\//u, "").replace(/\.[^.]+$/u, ".js");
}
function isTopLevelPublicSurfaceSource(name) {
	if (!PUBLIC_SURFACE_SOURCE_EXTENSIONS.includes(path.extname(name))) return false;
	if (name.startsWith(".") || name.startsWith("test-") || name.includes(".test-")) return false;
	if (name.endsWith(".d.ts")) return false;
	if (/^config-api(\.[cm]?[jt]s)$/u.test(name)) return false;
	return !/(\.test|\.spec)(\.[cm]?[jt]s)$/u.test(name);
}
function deriveBundledPluginIdHint(params) {
	const base = path.basename(params.entryPath, path.extname(params.entryPath));
	if (!params.hasMultipleExtensions) return params.manifestId;
	const packageName = trimString$1(params.packageName);
	if (!packageName) return `${params.manifestId}/${base}`;
	return `${packageName.includes("/") ? packageName.split("/").pop() ?? packageName : packageName}/${base}`;
}
function collectBundledPluginPublicSurfaceArtifacts(params) {
	const excluded = new Set([params.sourceEntry, params.setupEntry].filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => path.basename(entry)));
	const artifacts = fs.readdirSync(params.pluginDir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name).filter(isTopLevelPublicSurfaceSource).filter((entry) => !excluded.has(entry)).map((entry) => rewriteEntryToBuiltPath$1(entry)).filter((entry) => typeof entry === "string" && entry.length > 0).toSorted((left, right) => left.localeCompare(right));
	return artifacts.length > 0 ? artifacts : void 0;
}
function collectBundledPluginRuntimeSidecarArtifacts(publicSurfaceArtifacts) {
	if (!publicSurfaceArtifacts) return;
	const artifacts = publicSurfaceArtifacts.filter((artifact) => RUNTIME_SIDECAR_ARTIFACTS.has(artifact));
	return artifacts.length > 0 ? artifacts : void 0;
}
function resolveBundledPluginScanDir(params) {
	const sourceDir = path.join(params.packageRoot, "extensions");
	const runtimeDir = path.join(params.packageRoot, "dist-runtime", "extensions");
	const builtDir = path.join(params.packageRoot, "dist", "extensions");
	if (params.runningFromBuiltArtifact) {
		if (fs.existsSync(builtDir)) return builtDir;
		if (fs.existsSync(runtimeDir)) return runtimeDir;
	}
	if (fs.existsSync(sourceDir)) return sourceDir;
	if (fs.existsSync(runtimeDir) && fs.existsSync(builtDir)) return runtimeDir;
	if (fs.existsSync(builtDir)) return builtDir;
}
//#endregion
//#region src/plugins/bundled-plugin-metadata.ts
const OPENCLAW_PACKAGE_ROOT = resolveLoaderPackageRoot({
	modulePath: fileURLToPath(import.meta.url),
	moduleUrl: import.meta.url
}) ?? fileURLToPath(new URL("../..", import.meta.url));
const CURRENT_MODULE_PATH = fileURLToPath(import.meta.url);
const RUNNING_FROM_BUILT_ARTIFACT = CURRENT_MODULE_PATH.includes(`${path.sep}dist${path.sep}`) || CURRENT_MODULE_PATH.includes(`${path.sep}dist-runtime${path.sep}`);
const bundledPluginMetadataCache = /* @__PURE__ */ new Map();
function trimString(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function normalizeStringList(value) {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => trimString(entry) ?? "").filter(Boolean);
}
function rewriteEntryToBuiltPath(entry) {
	if (!entry) return;
	return entry.replace(/^\.\//u, "").replace(/\.[^.]+$/u, ".js");
}
function readPackageManifest(pluginDir) {
	const packagePath = path.join(pluginDir, "package.json");
	if (!fs.existsSync(packagePath)) return;
	try {
		return JSON.parse(fs.readFileSync(packagePath, "utf-8"));
	} catch {
		return;
	}
}
function collectBundledPluginMetadataForPackageRoot(packageRoot, includeChannelConfigs, includeSyntheticChannelConfigs) {
	const scanDir = resolveBundledPluginScanDir({
		packageRoot,
		runningFromBuiltArtifact: RUNNING_FROM_BUILT_ARTIFACT
	});
	if (!scanDir || !fs.existsSync(scanDir)) return [];
	const entries = [];
	for (const dirName of fs.readdirSync(scanDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).toSorted((left, right) => left.localeCompare(right))) {
		const pluginDir = path.join(scanDir, dirName);
		const manifestResult = loadPluginManifest(pluginDir, false);
		if (!manifestResult.ok) continue;
		const packageJson = readPackageManifest(pluginDir);
		const packageManifest = getPackageManifestMetadata(packageJson);
		const extensions = normalizeStringList(packageManifest?.extensions);
		if (extensions.length === 0) continue;
		const sourceEntry = trimString(extensions[0]);
		const builtEntry = rewriteEntryToBuiltPath(sourceEntry);
		if (!sourceEntry || !builtEntry) continue;
		const setupSourcePath = trimString(packageManifest?.setupEntry);
		const setupSource = setupSourcePath && rewriteEntryToBuiltPath(setupSourcePath) ? {
			source: setupSourcePath,
			built: rewriteEntryToBuiltPath(setupSourcePath)
		} : void 0;
		const publicSurfaceArtifacts = collectBundledPluginPublicSurfaceArtifacts({
			pluginDir,
			sourceEntry,
			...setupSourcePath ? { setupEntry: setupSourcePath } : {}
		});
		const runtimeSidecarArtifacts = collectBundledPluginRuntimeSidecarArtifacts(publicSurfaceArtifacts);
		const channelConfigs = includeChannelConfigs && includeSyntheticChannelConfigs ? collectBundledChannelConfigs({
			pluginDir,
			manifest: manifestResult.manifest,
			packageManifest
		}) : manifestResult.manifest.channelConfigs;
		entries.push({
			dirName,
			idHint: deriveBundledPluginIdHint({
				entryPath: sourceEntry,
				manifestId: manifestResult.manifest.id,
				packageName: trimString(packageJson?.name),
				hasMultipleExtensions: extensions.length > 1
			}),
			source: {
				source: sourceEntry,
				built: builtEntry
			},
			...setupSource ? { setupSource } : {},
			...publicSurfaceArtifacts ? { publicSurfaceArtifacts } : {},
			...runtimeSidecarArtifacts ? { runtimeSidecarArtifacts } : {},
			...trimString(packageJson?.name) ? { packageName: trimString(packageJson?.name) } : {},
			...trimString(packageJson?.version) ? { packageVersion: trimString(packageJson?.version) } : {},
			...trimString(packageJson?.description) ? { packageDescription: trimString(packageJson?.description) } : {},
			...packageManifest ? { packageManifest } : {},
			manifest: {
				...manifestResult.manifest,
				...channelConfigs ? { channelConfigs } : {}
			}
		});
	}
	return entries;
}
function listBundledPluginMetadata(params) {
	const rootDir = path.resolve(params?.rootDir ?? OPENCLAW_PACKAGE_ROOT);
	const includeChannelConfigs = params?.includeChannelConfigs ?? !RUNNING_FROM_BUILT_ARTIFACT;
	const includeSyntheticChannelConfigs = params?.includeSyntheticChannelConfigs ?? includeChannelConfigs;
	const cacheKey = JSON.stringify({
		rootDir,
		includeChannelConfigs,
		includeSyntheticChannelConfigs
	});
	const cached = bundledPluginMetadataCache.get(cacheKey);
	if (cached) return cached;
	const entries = Object.freeze(collectBundledPluginMetadataForPackageRoot(rootDir, includeChannelConfigs, includeSyntheticChannelConfigs));
	bundledPluginMetadataCache.set(cacheKey, entries);
	return entries;
}
function findBundledPluginMetadataById(pluginId, params) {
	return listBundledPluginMetadata(params).find((entry) => entry.manifest.id === pluginId);
}
function resolveBundledPluginWorkspaceSourcePath(params) {
	const metadata = findBundledPluginMetadataById(params.pluginId, { rootDir: params.rootDir });
	if (!metadata) return null;
	return path.resolve(params.rootDir, "extensions", metadata.dirName);
}
function normalizeRelativePluginEntryPath(entryPath) {
	return entryPath.replace(/^\.\//u, "");
}
function resolveBundledPluginRepoEntryPath(params) {
	const metadata = findBundledPluginMetadataById(params.pluginId, { rootDir: params.rootDir });
	if (!metadata) return null;
	const entryOrder = params.preferBuilt ? [metadata.source.built, metadata.source.source] : [metadata.source.source, metadata.source.built];
	const baseDirs = [path.resolve(params.rootDir, "dist", "extensions", metadata.dirName), path.resolve(params.rootDir, "extensions", metadata.dirName)];
	for (const baseDir of baseDirs) for (const entryPath of entryOrder) {
		const candidate = path.resolve(baseDir, normalizeRelativePluginEntryPath(entryPath));
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}
//#endregion
//#region src/config/zod-schema.providers.ts
const ChannelModelByChannelSchema = z.record(z.string(), z.record(z.string(), z.string())).optional();
let directChannelRuntimeSchemasCache;
function getDirectChannelRuntimeSchemas() {
	if (!directChannelRuntimeSchemasCache) {
		const runtimeMap = /* @__PURE__ */ new Map();
		for (const entry of listBundledPluginMetadata({
			includeChannelConfigs: true,
			includeSyntheticChannelConfigs: true
		})) {
			const channelConfigs = entry.manifest.channelConfigs;
			if (!channelConfigs) continue;
			for (const [channelId, channelConfig] of Object.entries(channelConfigs)) if (channelConfig?.runtime && !runtimeMap.has(channelId)) runtimeMap.set(channelId, channelConfig.runtime);
		}
		directChannelRuntimeSchemasCache = runtimeMap;
	}
	return directChannelRuntimeSchemasCache;
}
function hasPluginOwnedChannelConfig(value) {
	return Object.keys(value).some((key) => key !== "defaults" && key !== "modelByChannel");
}
function addLegacyChannelAcpBindingIssues(value, ctx, path = []) {
	if (!value || typeof value !== "object") return;
	if (Array.isArray(value)) {
		value.forEach((entry, index) => addLegacyChannelAcpBindingIssues(entry, ctx, [...path, index]));
		return;
	}
	const record = value;
	const bindings = record.bindings;
	if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
		const acp = bindings.acp;
		if (acp && typeof acp === "object") ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [
				...path,
				"bindings",
				"acp"
			],
			message: "Legacy channel-local ACP bindings were removed; use top-level bindings[] entries."
		});
	}
	for (const [key, entry] of Object.entries(record)) addLegacyChannelAcpBindingIssues(entry, ctx, [...path, key]);
}
function normalizeBundledChannelConfigs(value, ctx) {
	if (!value || !hasPluginOwnedChannelConfig(value)) return value;
	let next;
	for (const [channelId, runtimeSchema] of getDirectChannelRuntimeSchemas()) {
		if (!Object.prototype.hasOwnProperty.call(value, channelId)) continue;
		const parsed = runtimeSchema.safeParse(value[channelId]);
		if (!parsed.success) {
			for (const issue of parsed.issues) ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: issue.message ?? `Invalid channels.${channelId} config.`,
				path: [channelId, ...Array.isArray(issue.path) ? issue.path : []]
			});
			continue;
		}
		next ??= { ...value };
		next[channelId] = parsed.data;
	}
	return next ?? value;
}
const ChannelsSchema = z.object({
	defaults: z.object({
		groupPolicy: GroupPolicySchema.optional(),
		contextVisibility: ContextVisibilityModeSchema.optional(),
		heartbeat: ChannelHeartbeatVisibilitySchema
	}).strict().optional(),
	modelByChannel: ChannelModelByChannelSchema
}).passthrough().superRefine((value, ctx) => {
	addLegacyChannelAcpBindingIssues(value, ctx);
}).transform((value, ctx) => normalizeBundledChannelConfigs(value, ctx)).optional();
//#endregion
//#region src/config/zod-schema.session.ts
const SessionResetConfigSchema = z.object({
	mode: z.union([z.literal("daily"), z.literal("idle")]).optional(),
	atHour: z.number().int().min(0).max(23).optional(),
	idleMinutes: z.number().int().positive().optional()
}).strict();
const SessionSendPolicySchema = createAllowDenyChannelRulesSchema();
const SessionSchema = z.object({
	scope: z.union([z.literal("per-sender"), z.literal("global")]).optional(),
	dmScope: z.union([
		z.literal("main"),
		z.literal("per-peer"),
		z.literal("per-channel-peer"),
		z.literal("per-account-channel-peer")
	]).optional(),
	identityLinks: z.record(z.string(), z.array(z.string())).optional(),
	resetTriggers: z.array(z.string()).optional(),
	idleMinutes: z.number().int().positive().optional(),
	reset: SessionResetConfigSchema.optional(),
	resetByType: z.object({
		direct: SessionResetConfigSchema.optional(),
		dm: SessionResetConfigSchema.optional(),
		group: SessionResetConfigSchema.optional(),
		thread: SessionResetConfigSchema.optional()
	}).strict().optional(),
	resetByChannel: z.record(z.string(), SessionResetConfigSchema).optional(),
	store: z.string().optional(),
	typingIntervalSeconds: z.number().int().positive().optional(),
	typingMode: TypingModeSchema.optional(),
	parentForkMaxTokens: z.number().int().nonnegative().optional(),
	mainKey: z.string().optional(),
	sendPolicy: SessionSendPolicySchema.optional(),
	agentToAgent: z.object({ maxPingPongTurns: z.number().int().min(0).max(5).optional() }).strict().optional(),
	threadBindings: z.object({
		enabled: z.boolean().optional(),
		idleHours: z.number().nonnegative().optional(),
		maxAgeHours: z.number().nonnegative().optional()
	}).strict().optional(),
	maintenance: z.object({
		mode: z.enum(["enforce", "warn"]).optional(),
		pruneAfter: z.union([z.string(), z.number()]).optional(),
		pruneDays: z.number().int().positive().optional(),
		maxEntries: z.number().int().positive().optional(),
		rotateBytes: z.union([z.string(), z.number()]).optional(),
		resetArchiveRetention: z.union([
			z.string(),
			z.number(),
			z.literal(false)
		]).optional(),
		maxDiskBytes: z.union([z.string(), z.number()]).optional(),
		highWaterBytes: z.union([z.string(), z.number()]).optional()
	}).strict().superRefine((val, ctx) => {
		if (val.pruneAfter !== void 0) try {
			parseDurationMs(String(val.pruneAfter).trim(), { defaultUnit: "d" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["pruneAfter"],
				message: "invalid duration (use ms, s, m, h, d)"
			});
		}
		if (val.rotateBytes !== void 0) try {
			parseByteSize(String(val.rotateBytes).trim(), { defaultUnit: "b" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["rotateBytes"],
				message: "invalid size (use b, kb, mb, gb, tb)"
			});
		}
		if (val.resetArchiveRetention !== void 0 && val.resetArchiveRetention !== false) try {
			parseDurationMs(String(val.resetArchiveRetention).trim(), { defaultUnit: "d" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["resetArchiveRetention"],
				message: "invalid duration (use ms, s, m, h, d)"
			});
		}
		if (val.maxDiskBytes !== void 0) try {
			parseByteSize(String(val.maxDiskBytes).trim(), { defaultUnit: "b" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxDiskBytes"],
				message: "invalid size (use b, kb, mb, gb, tb)"
			});
		}
		if (val.highWaterBytes !== void 0) try {
			parseByteSize(String(val.highWaterBytes).trim(), { defaultUnit: "b" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["highWaterBytes"],
				message: "invalid size (use b, kb, mb, gb, tb)"
			});
		}
	}).optional()
}).strict().optional();
const MessagesSchema = z.object({
	messagePrefix: z.string().optional(),
	responsePrefix: z.string().optional(),
	groupChat: GroupChatSchema,
	queue: QueueSchema,
	inbound: InboundDebounceSchema,
	ackReaction: z.string().optional(),
	ackReactionScope: z.enum([
		"group-mentions",
		"group-all",
		"direct",
		"all",
		"off",
		"none"
	]).optional(),
	removeAckAfterReply: z.boolean().optional(),
	statusReactions: z.object({
		enabled: z.boolean().optional(),
		emojis: z.object({
			thinking: z.string().optional(),
			tool: z.string().optional(),
			coding: z.string().optional(),
			web: z.string().optional(),
			done: z.string().optional(),
			error: z.string().optional(),
			stallSoft: z.string().optional(),
			stallHard: z.string().optional(),
			compacting: z.string().optional()
		}).strict().optional(),
		timing: z.object({
			debounceMs: z.number().int().min(0).optional(),
			stallSoftMs: z.number().int().min(0).optional(),
			stallHardMs: z.number().int().min(0).optional(),
			doneHoldMs: z.number().int().min(0).optional(),
			errorHoldMs: z.number().int().min(0).optional()
		}).strict().optional()
	}).strict().optional(),
	suppressToolErrors: z.boolean().optional(),
	tts: TtsConfigSchema
}).strict().optional();
const CommandsSchema = z.object({
	native: NativeCommandsSettingSchema.optional().default("auto"),
	nativeSkills: NativeCommandsSettingSchema.optional().default("auto"),
	text: z.boolean().optional(),
	bash: z.boolean().optional(),
	bashForegroundMs: z.number().int().min(0).max(3e4).optional(),
	config: z.boolean().optional(),
	mcp: z.boolean().optional(),
	plugins: z.boolean().optional(),
	debug: z.boolean().optional(),
	restart: z.boolean().optional().default(true),
	useAccessGroups: z.boolean().optional(),
	ownerAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
	ownerDisplay: z.enum(["raw", "hash"]).optional().default("raw"),
	ownerDisplaySecret: z.string().optional().register(sensitive),
	allowFrom: ElevatedAllowFromSchema.optional()
}).strict().optional().default(() => ({
	native: "auto",
	nativeSkills: "auto",
	restart: true,
	ownerDisplay: "raw"
}));
//#endregion
//#region src/config/zod-schema.ts
const BrowserSnapshotDefaultsSchema = z.object({ mode: z.literal("efficient").optional() }).strict().optional();
const NodeHostSchema = z.object({ browserProxy: z.object({
	enabled: z.boolean().optional(),
	allowProfiles: z.array(z.string()).optional()
}).strict().optional() }).strict().optional();
const MemoryQmdPathSchema = z.object({
	path: z.string(),
	name: z.string().optional(),
	pattern: z.string().optional()
}).strict();
const MemoryQmdSessionSchema = z.object({
	enabled: z.boolean().optional(),
	exportDir: z.string().optional(),
	retentionDays: z.number().int().nonnegative().optional()
}).strict();
const MemoryQmdUpdateSchema = z.object({
	interval: z.string().optional(),
	debounceMs: z.number().int().nonnegative().optional(),
	onBoot: z.boolean().optional(),
	waitForBootSync: z.boolean().optional(),
	embedInterval: z.string().optional(),
	commandTimeoutMs: z.number().int().nonnegative().optional(),
	updateTimeoutMs: z.number().int().nonnegative().optional(),
	embedTimeoutMs: z.number().int().nonnegative().optional()
}).strict();
const MemoryQmdLimitsSchema = z.object({
	maxResults: z.number().int().positive().optional(),
	maxSnippetChars: z.number().int().positive().optional(),
	maxInjectedChars: z.number().int().positive().optional(),
	timeoutMs: z.number().int().nonnegative().optional()
}).strict();
const MemoryQmdMcporterSchema = z.object({
	enabled: z.boolean().optional(),
	serverName: z.string().optional(),
	startDaemon: z.boolean().optional()
}).strict();
const LoggingLevelSchema = z.union([
	z.literal("silent"),
	z.literal("fatal"),
	z.literal("error"),
	z.literal("warn"),
	z.literal("info"),
	z.literal("debug"),
	z.literal("trace")
]);
const MemoryQmdSchema = z.object({
	command: z.string().optional(),
	mcporter: MemoryQmdMcporterSchema.optional(),
	searchMode: z.union([
		z.literal("query"),
		z.literal("search"),
		z.literal("vsearch")
	]).optional(),
	searchTool: z.string().trim().min(1).optional(),
	includeDefaultMemory: z.boolean().optional(),
	paths: z.array(MemoryQmdPathSchema).optional(),
	sessions: MemoryQmdSessionSchema.optional(),
	update: MemoryQmdUpdateSchema.optional(),
	limits: MemoryQmdLimitsSchema.optional(),
	scope: SessionSendPolicySchema.optional()
}).strict();
const MemorySchema = z.object({
	backend: z.union([z.literal("builtin"), z.literal("qmd")]).optional(),
	citations: z.union([
		z.literal("auto"),
		z.literal("on"),
		z.literal("off")
	]).optional(),
	qmd: MemoryQmdSchema.optional()
}).strict().optional();
const HttpUrlSchema = z.string().url().refine((value) => {
	const protocol = new URL(value).protocol;
	return protocol === "http:" || protocol === "https:";
}, "Expected http:// or https:// URL");
const ResponsesEndpointUrlFetchShape = {
	allowUrl: z.boolean().optional(),
	urlAllowlist: z.array(z.string()).optional(),
	allowedMimes: z.array(z.string()).optional(),
	maxBytes: z.number().int().positive().optional(),
	maxRedirects: z.number().int().nonnegative().optional(),
	timeoutMs: z.number().int().positive().optional()
};
const SkillEntrySchema = z.object({
	enabled: z.boolean().optional(),
	apiKey: SecretInputSchema.optional().register(sensitive),
	env: z.record(z.string(), z.string()).optional(),
	config: z.record(z.string(), z.unknown()).optional()
}).strict();
const PluginEntrySchema = z.object({
	enabled: z.boolean().optional(),
	hooks: z.object({ allowPromptInjection: z.boolean().optional() }).strict().optional(),
	subagent: z.object({
		allowModelOverride: z.boolean().optional(),
		allowedModels: z.array(z.string()).optional()
	}).strict().optional(),
	config: z.record(z.string(), z.unknown()).optional()
}).strict();
const TalkProviderEntrySchema = z.object({ apiKey: SecretInputSchema.optional().register(sensitive) }).catchall(z.unknown());
const TalkSchema = z.object({
	provider: z.string().optional(),
	providers: z.record(z.string(), TalkProviderEntrySchema).optional(),
	interruptOnSpeech: z.boolean().optional(),
	silenceTimeoutMs: z.number().int().positive().optional()
}).strict().superRefine((talk, ctx) => {
	const provider = talk.provider?.trim().toLowerCase();
	const providers = talk.providers ? Object.keys(talk.providers) : [];
	if (provider && providers.length > 0 && !(provider in talk.providers)) ctx.addIssue({
		code: z.ZodIssueCode.custom,
		path: ["provider"],
		message: `talk.provider must match a key in talk.providers (missing "${provider}")`
	});
	if (!provider && providers.length > 1) ctx.addIssue({
		code: z.ZodIssueCode.custom,
		path: ["provider"],
		message: "talk.provider is required when talk.providers defines multiple providers"
	});
});
const McpServerSchema = z.object({
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.union([
		z.string(),
		z.number(),
		z.boolean()
	])).optional(),
	cwd: z.string().optional(),
	workingDirectory: z.string().optional(),
	url: HttpUrlSchema.optional(),
	headers: z.record(z.string(), z.union([
		z.string().register(sensitive),
		z.number(),
		z.boolean()
	]).register(sensitive)).optional()
}).catchall(z.unknown());
const McpConfigSchema = z.object({ servers: z.record(z.string(), McpServerSchema).optional() }).strict().optional();
const OpenClawSchema = z.object({
	$schema: z.string().optional(),
	meta: z.object({
		lastTouchedVersion: z.string().optional(),
		lastTouchedAt: z.union([z.string(), z.number().transform((n, ctx) => {
			const d = new Date(n);
			if (Number.isNaN(d.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Invalid timestamp"
				});
				return z.NEVER;
			}
			return d.toISOString();
		})]).optional()
	}).strict().optional(),
	env: z.object({
		shellEnv: z.object({
			enabled: z.boolean().optional(),
			timeoutMs: z.number().int().nonnegative().optional()
		}).strict().optional(),
		vars: z.record(z.string(), z.string()).optional()
	}).catchall(z.string()).optional(),
	wizard: z.object({
		lastRunAt: z.string().optional(),
		lastRunVersion: z.string().optional(),
		lastRunCommit: z.string().optional(),
		lastRunCommand: z.string().optional(),
		lastRunMode: z.union([z.literal("local"), z.literal("remote")]).optional()
	}).strict().optional(),
	diagnostics: z.object({
		enabled: z.boolean().optional(),
		flags: z.array(z.string()).optional(),
		stuckSessionWarnMs: z.number().int().positive().optional(),
		otel: z.object({
			enabled: z.boolean().optional(),
			endpoint: z.string().optional(),
			protocol: z.union([z.literal("http/protobuf"), z.literal("grpc")]).optional(),
			headers: z.record(z.string(), z.string()).optional(),
			serviceName: z.string().optional(),
			traces: z.boolean().optional(),
			metrics: z.boolean().optional(),
			logs: z.boolean().optional(),
			sampleRate: z.number().min(0).max(1).optional(),
			flushIntervalMs: z.number().int().nonnegative().optional()
		}).strict().optional(),
		cacheTrace: z.object({
			enabled: z.boolean().optional(),
			filePath: z.string().optional(),
			includeMessages: z.boolean().optional(),
			includePrompt: z.boolean().optional(),
			includeSystem: z.boolean().optional()
		}).strict().optional()
	}).strict().optional(),
	logging: z.object({
		level: LoggingLevelSchema.optional(),
		file: z.string().optional(),
		maxFileBytes: z.number().int().positive().optional(),
		consoleLevel: LoggingLevelSchema.optional(),
		consoleStyle: z.union([
			z.literal("pretty"),
			z.literal("compact"),
			z.literal("json")
		]).optional(),
		redactSensitive: z.union([z.literal("off"), z.literal("tools")]).optional(),
		redactPatterns: z.array(z.string()).optional()
	}).strict().optional(),
	cli: z.object({ banner: z.object({ taglineMode: z.union([
		z.literal("random"),
		z.literal("default"),
		z.literal("off")
	]).optional() }).strict().optional() }).strict().optional(),
	update: z.object({
		channel: z.union([
			z.literal("stable"),
			z.literal("beta"),
			z.literal("dev")
		]).optional(),
		checkOnStart: z.boolean().optional(),
		auto: z.object({
			enabled: z.boolean().optional(),
			stableDelayHours: z.number().nonnegative().max(168).optional(),
			stableJitterHours: z.number().nonnegative().max(168).optional(),
			betaCheckIntervalHours: z.number().positive().max(24).optional()
		}).strict().optional()
	}).strict().optional(),
	browser: z.object({
		enabled: z.boolean().optional(),
		evaluateEnabled: z.boolean().optional(),
		cdpUrl: z.string().optional(),
		remoteCdpTimeoutMs: z.number().int().nonnegative().optional(),
		remoteCdpHandshakeTimeoutMs: z.number().int().nonnegative().optional(),
		color: z.string().optional(),
		executablePath: z.string().optional(),
		headless: z.boolean().optional(),
		noSandbox: z.boolean().optional(),
		attachOnly: z.boolean().optional(),
		cdpPortRangeStart: z.number().int().min(1).max(65535).optional(),
		defaultProfile: z.string().optional(),
		snapshotDefaults: BrowserSnapshotDefaultsSchema,
		ssrfPolicy: z.object({
			dangerouslyAllowPrivateNetwork: z.boolean().optional(),
			allowedHostnames: z.array(z.string()).optional(),
			hostnameAllowlist: z.array(z.string()).optional()
		}).strict().optional(),
		profiles: z.record(z.string().regex(/^[a-z0-9-]+$/, "Profile names must be alphanumeric with hyphens only"), z.object({
			cdpPort: z.number().int().min(1).max(65535).optional(),
			cdpUrl: z.string().optional(),
			userDataDir: z.string().optional(),
			driver: z.union([
				z.literal("openclaw"),
				z.literal("clawd"),
				z.literal("existing-session")
			]).optional(),
			attachOnly: z.boolean().optional(),
			color: HexColorSchema
		}).strict().refine((value) => value.driver === "existing-session" || value.cdpPort || value.cdpUrl, { message: "Profile must set cdpPort or cdpUrl" }).refine((value) => value.driver === "existing-session" || !value.userDataDir, { message: "Profile userDataDir is only supported with driver=\"existing-session\"" })).optional(),
		extraArgs: z.array(z.string()).optional()
	}).strict().optional(),
	ui: z.object({
		seamColor: HexColorSchema.optional(),
		assistant: z.object({
			name: z.string().max(50).optional(),
			avatar: z.string().max(200).optional()
		}).strict().optional()
	}).strict().optional(),
	secrets: SecretsConfigSchema,
	auth: z.object({
		profiles: z.record(z.string(), z.object({
			provider: z.string(),
			mode: z.union([
				z.literal("api_key"),
				z.literal("oauth"),
				z.literal("token")
			]),
			email: z.string().optional(),
			displayName: z.string().optional()
		}).strict()).optional(),
		order: z.record(z.string(), z.array(z.string())).optional(),
		cooldowns: z.object({
			billingBackoffHours: z.number().positive().optional(),
			billingBackoffHoursByProvider: z.record(z.string(), z.number().positive()).optional(),
			billingMaxHours: z.number().positive().optional(),
			authPermanentBackoffMinutes: z.number().positive().optional(),
			authPermanentMaxMinutes: z.number().positive().optional(),
			failureWindowHours: z.number().positive().optional(),
			overloadedProfileRotations: z.number().int().nonnegative().optional(),
			overloadedBackoffMs: z.number().int().nonnegative().optional(),
			rateLimitedProfileRotations: z.number().int().nonnegative().optional()
		}).strict().optional()
	}).strict().optional(),
	acp: z.object({
		enabled: z.boolean().optional(),
		dispatch: z.object({ enabled: z.boolean().optional() }).strict().optional(),
		backend: z.string().optional(),
		defaultAgent: z.string().optional(),
		allowedAgents: z.array(z.string()).optional(),
		maxConcurrentSessions: z.number().int().positive().optional(),
		stream: z.object({
			coalesceIdleMs: z.number().int().nonnegative().optional(),
			maxChunkChars: z.number().int().positive().optional(),
			repeatSuppression: z.boolean().optional(),
			deliveryMode: z.union([z.literal("live"), z.literal("final_only")]).optional(),
			hiddenBoundarySeparator: z.union([
				z.literal("none"),
				z.literal("space"),
				z.literal("newline"),
				z.literal("paragraph")
			]).optional(),
			maxOutputChars: z.number().int().positive().optional(),
			maxSessionUpdateChars: z.number().int().positive().optional(),
			tagVisibility: z.record(z.string(), z.boolean()).optional()
		}).strict().optional(),
		runtime: z.object({
			ttlMinutes: z.number().int().positive().optional(),
			installCommand: z.string().optional()
		}).strict().optional()
	}).strict().optional(),
	models: ModelsConfigSchema,
	nodeHost: NodeHostSchema,
	agents: AgentsSchema,
	tools: ToolsSchema,
	bindings: BindingsSchema,
	broadcast: BroadcastSchema,
	audio: AudioSchema,
	media: z.object({
		preserveFilenames: z.boolean().optional(),
		ttlHours: z.number().int().min(1).max(168).optional()
	}).strict().optional(),
	messages: MessagesSchema,
	commands: CommandsSchema,
	approvals: ApprovalsSchema,
	session: SessionSchema,
	cron: z.object({
		enabled: z.boolean().optional(),
		store: z.string().optional(),
		maxConcurrentRuns: z.number().int().positive().optional(),
		retry: z.object({
			maxAttempts: z.number().int().min(0).max(10).optional(),
			backoffMs: z.array(z.number().int().nonnegative()).min(1).max(10).optional(),
			retryOn: z.array(z.enum([
				"rate_limit",
				"overloaded",
				"network",
				"timeout",
				"server_error"
			])).min(1).optional()
		}).strict().optional(),
		webhook: HttpUrlSchema.optional(),
		webhookToken: SecretInputSchema.optional().register(sensitive),
		sessionRetention: z.union([z.string(), z.literal(false)]).optional(),
		runLog: z.object({
			maxBytes: z.union([z.string(), z.number()]).optional(),
			keepLines: z.number().int().positive().optional()
		}).strict().optional(),
		failureAlert: z.object({
			enabled: z.boolean().optional(),
			after: z.number().int().min(1).optional(),
			cooldownMs: z.number().int().min(0).optional(),
			mode: z.enum(["announce", "webhook"]).optional(),
			accountId: z.string().optional()
		}).strict().optional(),
		failureDestination: z.object({
			channel: z.string().optional(),
			to: z.string().optional(),
			accountId: z.string().optional(),
			mode: z.enum(["announce", "webhook"]).optional()
		}).strict().optional()
	}).strict().superRefine((val, ctx) => {
		if (val.sessionRetention !== void 0 && val.sessionRetention !== false) try {
			parseDurationMs(String(val.sessionRetention).trim(), { defaultUnit: "h" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["sessionRetention"],
				message: "invalid duration (use ms, s, m, h, d)"
			});
		}
		if (val.runLog?.maxBytes !== void 0) try {
			parseByteSize(String(val.runLog.maxBytes).trim(), { defaultUnit: "b" });
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["runLog", "maxBytes"],
				message: "invalid size (use b, kb, mb, gb, tb)"
			});
		}
	}).optional(),
	hooks: z.object({
		enabled: z.boolean().optional(),
		path: z.string().optional(),
		token: z.string().optional().register(sensitive),
		defaultSessionKey: z.string().optional(),
		allowRequestSessionKey: z.boolean().optional(),
		allowedSessionKeyPrefixes: z.array(z.string()).optional(),
		allowedAgentIds: z.array(z.string()).optional(),
		maxBodyBytes: z.number().int().positive().optional(),
		presets: z.array(z.string()).optional(),
		transformsDir: z.string().optional(),
		mappings: z.array(HookMappingSchema).optional(),
		gmail: HooksGmailSchema,
		internal: InternalHooksSchema
	}).strict().optional(),
	web: z.object({
		enabled: z.boolean().optional(),
		heartbeatSeconds: z.number().int().positive().optional(),
		reconnect: z.object({
			initialMs: z.number().positive().optional(),
			maxMs: z.number().positive().optional(),
			factor: z.number().positive().optional(),
			jitter: z.number().min(0).max(1).optional(),
			maxAttempts: z.number().int().min(0).optional()
		}).strict().optional()
	}).strict().optional(),
	channels: ChannelsSchema,
	discovery: z.object({
		wideArea: z.object({
			enabled: z.boolean().optional(),
			domain: z.string().optional()
		}).strict().optional(),
		mdns: z.object({ mode: z.enum([
			"off",
			"minimal",
			"full"
		]).optional() }).strict().optional()
	}).strict().optional(),
	canvasHost: z.object({
		enabled: z.boolean().optional(),
		root: z.string().optional(),
		port: z.number().int().positive().optional(),
		liveReload: z.boolean().optional()
	}).strict().optional(),
	talk: TalkSchema.optional(),
	gateway: z.object({
		port: z.number().int().positive().optional(),
		mode: z.union([z.literal("local"), z.literal("remote")]).optional(),
		bind: z.union([
			z.literal("auto"),
			z.literal("lan"),
			z.literal("loopback"),
			z.literal("custom"),
			z.literal("tailnet")
		]).optional(),
		customBindHost: z.string().optional(),
		controlUi: z.object({
			enabled: z.boolean().optional(),
			basePath: z.string().optional(),
			root: z.string().optional(),
			allowedOrigins: z.array(z.string()).optional(),
			dangerouslyAllowHostHeaderOriginFallback: z.boolean().optional(),
			allowInsecureAuth: z.boolean().optional(),
			dangerouslyDisableDeviceAuth: z.boolean().optional()
		}).strict().optional(),
		auth: z.object({
			mode: z.union([
				z.literal("none"),
				z.literal("token"),
				z.literal("password"),
				z.literal("trusted-proxy")
			]).optional(),
			token: SecretInputSchema.optional().register(sensitive),
			password: SecretInputSchema.optional().register(sensitive),
			allowTailscale: z.boolean().optional(),
			rateLimit: z.object({
				maxAttempts: z.number().optional(),
				windowMs: z.number().optional(),
				lockoutMs: z.number().optional(),
				exemptLoopback: z.boolean().optional()
			}).strict().optional(),
			trustedProxy: z.object({
				userHeader: z.string().min(1, "userHeader is required for trusted-proxy mode"),
				requiredHeaders: z.array(z.string()).optional(),
				allowUsers: z.array(z.string()).optional()
			}).strict().optional()
		}).strict().optional(),
		trustedProxies: z.array(z.string()).optional(),
		allowRealIpFallback: z.boolean().optional(),
		tools: z.object({
			deny: z.array(z.string()).optional(),
			allow: z.array(z.string()).optional()
		}).strict().optional(),
		webchat: z.object({ chatHistoryMaxChars: z.number().int().positive().max(5e5).optional() }).strict().optional(),
		channelHealthCheckMinutes: z.number().int().min(0).optional(),
		channelStaleEventThresholdMinutes: z.number().int().min(1).optional(),
		channelMaxRestartsPerHour: z.number().int().min(1).optional(),
		tailscale: z.object({
			mode: z.union([
				z.literal("off"),
				z.literal("serve"),
				z.literal("funnel")
			]).optional(),
			resetOnExit: z.boolean().optional()
		}).strict().optional(),
		remote: z.object({
			url: z.string().optional(),
			transport: z.union([z.literal("ssh"), z.literal("direct")]).optional(),
			token: SecretInputSchema.optional().register(sensitive),
			password: SecretInputSchema.optional().register(sensitive),
			tlsFingerprint: z.string().optional(),
			sshTarget: z.string().optional(),
			sshIdentity: z.string().optional()
		}).strict().optional(),
		reload: z.object({
			mode: z.union([
				z.literal("off"),
				z.literal("restart"),
				z.literal("hot"),
				z.literal("hybrid")
			]).optional(),
			debounceMs: z.number().int().min(0).optional(),
			deferralTimeoutMs: z.number().int().min(0).optional()
		}).strict().optional(),
		tls: z.object({
			enabled: z.boolean().optional(),
			autoGenerate: z.boolean().optional(),
			certPath: z.string().optional(),
			keyPath: z.string().optional(),
			caPath: z.string().optional()
		}).optional(),
		http: z.object({
			endpoints: z.object({
				chatCompletions: z.object({
					enabled: z.boolean().optional(),
					maxBodyBytes: z.number().int().positive().optional(),
					maxImageParts: z.number().int().nonnegative().optional(),
					maxTotalImageBytes: z.number().int().positive().optional(),
					images: z.object({ ...ResponsesEndpointUrlFetchShape }).strict().optional()
				}).strict().optional(),
				responses: z.object({
					enabled: z.boolean().optional(),
					maxBodyBytes: z.number().int().positive().optional(),
					maxUrlParts: z.number().int().nonnegative().optional(),
					files: z.object({
						...ResponsesEndpointUrlFetchShape,
						maxChars: z.number().int().positive().optional(),
						pdf: z.object({
							maxPages: z.number().int().positive().optional(),
							maxPixels: z.number().int().positive().optional(),
							minTextChars: z.number().int().nonnegative().optional()
						}).strict().optional()
					}).strict().optional(),
					images: z.object({ ...ResponsesEndpointUrlFetchShape }).strict().optional()
				}).strict().optional()
			}).strict().optional(),
			securityHeaders: z.object({ strictTransportSecurity: z.union([z.string(), z.literal(false)]).optional() }).strict().optional()
		}).strict().optional(),
		push: z.object({ apns: z.object({ relay: z.object({
			baseUrl: z.string().optional(),
			timeoutMs: z.number().int().positive().optional()
		}).strict().optional() }).strict().optional() }).strict().optional(),
		nodes: z.object({
			browser: z.object({
				mode: z.union([
					z.literal("auto"),
					z.literal("manual"),
					z.literal("off")
				]).optional(),
				node: z.string().optional()
			}).strict().optional(),
			allowCommands: z.array(z.string()).optional(),
			denyCommands: z.array(z.string()).optional()
		}).strict().optional()
	}).strict().superRefine((gateway, ctx) => {
		const effectiveHealthCheckMinutes = gateway.channelHealthCheckMinutes ?? 5;
		if (gateway.channelStaleEventThresholdMinutes != null && effectiveHealthCheckMinutes !== 0 && gateway.channelStaleEventThresholdMinutes < effectiveHealthCheckMinutes) ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["channelStaleEventThresholdMinutes"],
			message: "channelStaleEventThresholdMinutes should be >= channelHealthCheckMinutes to avoid delayed stale detection"
		});
	}).optional(),
	memory: MemorySchema,
	mcp: McpConfigSchema,
	skills: z.object({
		allowBundled: z.array(z.string()).optional(),
		load: z.object({
			extraDirs: z.array(z.string()).optional(),
			watch: z.boolean().optional(),
			watchDebounceMs: z.number().int().min(0).optional()
		}).strict().optional(),
		install: z.object({
			preferBrew: z.boolean().optional(),
			nodeManager: z.union([
				z.literal("npm"),
				z.literal("pnpm"),
				z.literal("yarn"),
				z.literal("bun")
			]).optional()
		}).strict().optional(),
		limits: z.object({
			maxCandidatesPerRoot: z.number().int().min(1).optional(),
			maxSkillsLoadedPerSource: z.number().int().min(1).optional(),
			maxSkillsInPrompt: z.number().int().min(0).optional(),
			maxSkillsPromptChars: z.number().int().min(0).optional(),
			maxSkillFileBytes: z.number().int().min(0).optional()
		}).strict().optional(),
		entries: z.record(z.string(), SkillEntrySchema).optional()
	}).strict().optional(),
	plugins: z.object({
		enabled: z.boolean().optional(),
		allow: z.array(z.string()).optional(),
		deny: z.array(z.string()).optional(),
		load: z.object({ paths: z.array(z.string()).optional() }).strict().optional(),
		slots: z.object({
			memory: z.string().optional(),
			contextEngine: z.string().optional()
		}).strict().optional(),
		entries: z.record(z.string(), PluginEntrySchema).optional(),
		installs: z.record(z.string(), z.object({ ...PluginInstallRecordShape }).strict()).optional()
	}).strict().optional()
}).strict().superRefine((cfg, ctx) => {
	const agents = cfg.agents?.list ?? [];
	if (agents.length === 0) return;
	const agentIds = new Set(agents.map((agent) => agent.id));
	const broadcast = cfg.broadcast;
	if (!broadcast) return;
	for (const [peerId, ids] of Object.entries(broadcast)) {
		if (peerId === "strategy") continue;
		if (!Array.isArray(ids)) continue;
		for (let idx = 0; idx < ids.length; idx += 1) {
			const agentId = ids[idx];
			if (!agentIds.has(agentId)) ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [
					"broadcast",
					peerId,
					idx
				],
				message: `Unknown agent id "${agentId}" (not in agents.list).`
			});
		}
	}
});
//#endregion
export { resolveBundledPluginWorkspaceSourcePath as a, resolveBundledPluginRepoEntryPath as i, findBundledPluginMetadataById as n, parseNonNegativeByteSize as o, listBundledPluginMetadata as r, parseByteSize as s, OpenClawSchema as t };
