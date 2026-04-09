import { b as truncateUtf16Safe } from "./utils-ms6h9yny.js";
import { c as normalizeAgentId, u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { f as filterBootstrapFilesForSession, h as loadWorkspaceBootstrapFiles } from "./workspace-DLW8_PFX.js";
import { n as createInternalHookEvent, p as triggerInternalHook } from "./internal-hooks-CVt9m78W.js";
import { r as getOrLoadBootstrapFiles } from "./bootstrap-cache-tubl2Dhc.js";
import { g as resolveBootstrapMaxChars, m as buildBootstrapContextFiles, v as resolveBootstrapTotalMaxChars } from "./pi-embedded-helpers-T2IjifdJ.js";
import path from "node:path";
import { z } from "zod";
//#region src/agents/bootstrap-hooks.ts
async function applyBootstrapHookOverrides(params) {
	const sessionKey = params.sessionKey ?? params.sessionId ?? "unknown";
	const agentId = params.agentId ?? (params.sessionKey ? resolveAgentIdFromSessionKey(params.sessionKey) : void 0);
	const event = createInternalHookEvent("agent", "bootstrap", sessionKey, {
		workspaceDir: params.workspaceDir,
		bootstrapFiles: params.files,
		cfg: params.config,
		sessionKey: params.sessionKey,
		sessionId: params.sessionId,
		agentId
	});
	await triggerInternalHook(event);
	const updated = event.context.bootstrapFiles;
	return Array.isArray(updated) ? updated : params.files;
}
//#endregion
//#region src/agents/bootstrap-files.ts
function makeBootstrapWarn(params) {
	if (!params.warn) return;
	return (message) => params.warn?.(`${message} (sessionKey=${params.sessionLabel})`);
}
function sanitizeBootstrapFiles(files, warn) {
	const sanitized = [];
	for (const file of files) {
		const pathValue = typeof file.path === "string" ? file.path.trim() : "";
		if (!pathValue) {
			warn?.(`skipping bootstrap file "${file.name}" — missing or invalid "path" field (hook may have used "filePath" instead)`);
			continue;
		}
		sanitized.push({
			...file,
			path: pathValue
		});
	}
	return sanitized;
}
function applyContextModeFilter(params) {
	const contextMode = params.contextMode ?? "full";
	const runKind = params.runKind ?? "default";
	if (contextMode !== "lightweight") return params.files;
	if (runKind === "heartbeat") return params.files.filter((file) => file.name === "HEARTBEAT.md");
	return [];
}
async function resolveBootstrapFilesForRun(params) {
	const sessionKey = params.sessionKey ?? params.sessionId;
	return sanitizeBootstrapFiles(await applyBootstrapHookOverrides({
		files: applyContextModeFilter({
			files: filterBootstrapFilesForSession(params.sessionKey ? await getOrLoadBootstrapFiles({
				workspaceDir: params.workspaceDir,
				sessionKey: params.sessionKey
			}) : await loadWorkspaceBootstrapFiles(params.workspaceDir), sessionKey),
			contextMode: params.contextMode,
			runKind: params.runKind
		}),
		workspaceDir: params.workspaceDir,
		config: params.config,
		sessionKey: params.sessionKey,
		sessionId: params.sessionId,
		agentId: params.agentId
	}), params.warn);
}
async function resolveBootstrapContextForRun(params) {
	const bootstrapFiles = await resolveBootstrapFilesForRun(params);
	return {
		bootstrapFiles,
		contextFiles: buildBootstrapContextFiles(bootstrapFiles, {
			maxChars: resolveBootstrapMaxChars(params.config),
			totalMaxChars: resolveBootstrapTotalMaxChars(params.config),
			warn: params.warn
		})
	};
}
//#endregion
//#region src/cron/delivery-field-schemas.ts
const trimStringPreprocess = (value) => typeof value === "string" ? value.trim() : value;
const trimLowercaseStringPreprocess = (value) => typeof value === "string" ? value.trim().toLowerCase() : value;
const DeliveryModeFieldSchema = z.preprocess(trimLowercaseStringPreprocess, z.enum([
	"deliver",
	"announce",
	"none",
	"webhook"
])).transform((value) => value === "deliver" ? "announce" : value);
const LowercaseNonEmptyStringFieldSchema = z.preprocess(trimLowercaseStringPreprocess, z.string().min(1));
const TrimmedNonEmptyStringFieldSchema = z.preprocess(trimStringPreprocess, z.string().min(1));
const DeliveryThreadIdFieldSchema = z.union([TrimmedNonEmptyStringFieldSchema, z.number().finite()]);
const TimeoutSecondsFieldSchema = z.number().finite().transform((value) => Math.max(0, Math.floor(value)));
function parseDeliveryInput(input) {
	return {
		mode: parseOptionalField(DeliveryModeFieldSchema, input.mode),
		channel: parseOptionalField(LowercaseNonEmptyStringFieldSchema, input.channel),
		to: parseOptionalField(TrimmedNonEmptyStringFieldSchema, input.to),
		threadId: parseOptionalField(DeliveryThreadIdFieldSchema, input.threadId),
		accountId: parseOptionalField(TrimmedNonEmptyStringFieldSchema, input.accountId)
	};
}
function parseOptionalField(schema, value) {
	const parsed = schema.safeParse(value);
	return parsed.success ? parsed.data : void 0;
}
//#endregion
//#region src/cron/service/normalize.ts
function normalizeRequiredName(raw) {
	if (typeof raw !== "string") throw new Error("cron job name is required");
	const name = raw.trim();
	if (!name) throw new Error("cron job name is required");
	return name;
}
function normalizeOptionalText(raw) {
	if (typeof raw !== "string") return;
	const trimmed = raw.trim();
	return trimmed ? trimmed : void 0;
}
function truncateText(input, maxLen) {
	if (input.length <= maxLen) return input;
	return `${truncateUtf16Safe(input, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
function normalizeOptionalAgentId(raw) {
	if (typeof raw !== "string") return;
	const trimmed = raw.trim();
	if (!trimmed) return;
	return normalizeAgentId(trimmed);
}
function normalizeOptionalSessionKey(raw) {
	if (typeof raw !== "string") return;
	return raw.trim() || void 0;
}
function inferLegacyName(job) {
	const firstLine = (job?.payload?.kind === "systemEvent" && typeof job.payload.text === "string" ? job.payload.text : job?.payload?.kind === "agentTurn" && typeof job.payload.message === "string" ? job.payload.message : "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
	if (firstLine) return truncateText(firstLine, 60);
	const kind = typeof job?.schedule?.kind === "string" ? job.schedule.kind : "";
	if (kind === "cron" && typeof job?.schedule?.expr === "string") return `Cron: ${truncateText(job.schedule.expr, 52)}`;
	if (kind === "every" && typeof job?.schedule?.everyMs === "number") return `Every: ${job.schedule.everyMs}ms`;
	if (kind === "at") return "One-shot";
	return "Cron job";
}
function normalizePayloadToSystemText(payload) {
	if (payload.kind === "systemEvent") return payload.text.trim();
	return payload.message.trim();
}
//#endregion
//#region src/agents/bootstrap-budget.ts
const DEFAULT_BOOTSTRAP_NEAR_LIMIT_RATIO = .85;
function normalizePositiveLimit(value) {
	if (!Number.isFinite(value) || value <= 0) return 1;
	return Math.floor(value);
}
function formatWarningCause(cause) {
	return cause === "per-file-limit" ? "max/file" : "max/total";
}
function normalizeSeenSignatures(signatures) {
	if (!Array.isArray(signatures) || signatures.length === 0) return [];
	const seen = /* @__PURE__ */ new Set();
	const result = [];
	for (const signature of signatures) {
		const value = typeof signature === "string" ? signature.trim() : "";
		if (!value || seen.has(value)) continue;
		seen.add(value);
		result.push(value);
	}
	return result;
}
function appendSeenSignature(signatures, signature) {
	if (!signature.trim()) return signatures;
	if (signatures.includes(signature)) return signatures;
	const next = [...signatures, signature];
	if (next.length <= 32) return next;
	return next.slice(-32);
}
function resolveBootstrapWarningSignaturesSeen(report) {
	const truncation = report?.bootstrapTruncation;
	const seenFromReport = normalizeSeenSignatures(truncation?.warningSignaturesSeen);
	if (seenFromReport.length > 0) return seenFromReport;
	if (truncation?.warningMode === "off") return [];
	const single = typeof truncation?.promptWarningSignature === "string" ? truncation.promptWarningSignature.trim() : "";
	return single ? [single] : [];
}
function buildBootstrapInjectionStats(params) {
	const injectedByPath = /* @__PURE__ */ new Map();
	const injectedByBaseName = /* @__PURE__ */ new Map();
	for (const file of params.injectedFiles) {
		const pathValue = typeof file.path === "string" ? file.path.trim() : "";
		if (!pathValue) continue;
		if (!injectedByPath.has(pathValue)) injectedByPath.set(pathValue, file.content);
		const normalizedPath = pathValue.replace(/\\/g, "/");
		const baseName = path.posix.basename(normalizedPath);
		if (!injectedByBaseName.has(baseName)) injectedByBaseName.set(baseName, file.content);
	}
	return params.bootstrapFiles.map((file) => {
		const pathValue = typeof file.path === "string" ? file.path.trim() : "";
		const rawChars = file.missing ? 0 : (file.content ?? "").trimEnd().length;
		const injected = (pathValue ? injectedByPath.get(pathValue) : void 0) ?? injectedByPath.get(file.name) ?? injectedByBaseName.get(file.name);
		const injectedChars = injected ? injected.length : 0;
		const truncated = !file.missing && injectedChars < rawChars;
		return {
			name: file.name,
			path: pathValue || file.name,
			missing: file.missing,
			rawChars,
			injectedChars,
			truncated
		};
	});
}
function analyzeBootstrapBudget(params) {
	const bootstrapMaxChars = normalizePositiveLimit(params.bootstrapMaxChars);
	const bootstrapTotalMaxChars = normalizePositiveLimit(params.bootstrapTotalMaxChars);
	const nearLimitRatio = typeof params.nearLimitRatio === "number" && Number.isFinite(params.nearLimitRatio) && params.nearLimitRatio > 0 && params.nearLimitRatio < 1 ? params.nearLimitRatio : DEFAULT_BOOTSTRAP_NEAR_LIMIT_RATIO;
	const nonMissing = params.files.filter((file) => !file.missing);
	const rawChars = nonMissing.reduce((sum, file) => sum + file.rawChars, 0);
	const injectedChars = nonMissing.reduce((sum, file) => sum + file.injectedChars, 0);
	const totalNearLimit = injectedChars >= Math.ceil(bootstrapTotalMaxChars * nearLimitRatio);
	const totalOverLimit = injectedChars >= bootstrapTotalMaxChars;
	const files = params.files.map((file) => {
		if (file.missing) return {
			...file,
			nearLimit: false,
			causes: []
		};
		const perFileOverLimit = file.rawChars > bootstrapMaxChars;
		const nearLimit = file.rawChars >= Math.ceil(bootstrapMaxChars * nearLimitRatio);
		const causes = [];
		if (file.truncated) {
			if (perFileOverLimit) causes.push("per-file-limit");
			if (totalOverLimit) causes.push("total-limit");
		}
		return {
			...file,
			nearLimit,
			causes
		};
	});
	const truncatedFiles = files.filter((file) => file.truncated);
	return {
		files,
		truncatedFiles,
		nearLimitFiles: files.filter((file) => file.nearLimit),
		totalNearLimit,
		hasTruncation: truncatedFiles.length > 0,
		totals: {
			rawChars,
			injectedChars,
			truncatedChars: Math.max(0, rawChars - injectedChars),
			bootstrapMaxChars,
			bootstrapTotalMaxChars,
			nearLimitRatio
		}
	};
}
function buildBootstrapTruncationSignature(analysis) {
	if (!analysis.hasTruncation) return;
	const files = analysis.truncatedFiles.map((file) => ({
		path: file.path || file.name,
		rawChars: file.rawChars,
		injectedChars: file.injectedChars,
		causes: [...file.causes].toSorted()
	})).toSorted((a, b) => {
		const pathCmp = a.path.localeCompare(b.path);
		if (pathCmp !== 0) return pathCmp;
		if (a.rawChars !== b.rawChars) return a.rawChars - b.rawChars;
		if (a.injectedChars !== b.injectedChars) return a.injectedChars - b.injectedChars;
		return a.causes.join("+").localeCompare(b.causes.join("+"));
	});
	return JSON.stringify({
		bootstrapMaxChars: analysis.totals.bootstrapMaxChars,
		bootstrapTotalMaxChars: analysis.totals.bootstrapTotalMaxChars,
		files
	});
}
function formatBootstrapTruncationWarningLines(params) {
	if (!params.analysis.hasTruncation) return [];
	const maxFiles = typeof params.maxFiles === "number" && Number.isFinite(params.maxFiles) && params.maxFiles > 0 ? Math.floor(params.maxFiles) : 3;
	const lines = [];
	const duplicateNameCounts = params.analysis.truncatedFiles.reduce((acc, file) => {
		acc.set(file.name, (acc.get(file.name) ?? 0) + 1);
		return acc;
	}, /* @__PURE__ */ new Map());
	const topFiles = params.analysis.truncatedFiles.slice(0, maxFiles);
	for (const file of topFiles) {
		const pct = file.rawChars > 0 ? Math.round((file.rawChars - file.injectedChars) / file.rawChars * 100) : 0;
		const causeText = file.causes.length > 0 ? file.causes.map((cause) => formatWarningCause(cause)).join(", ") : "";
		const nameLabel = (duplicateNameCounts.get(file.name) ?? 0) > 1 && file.path.trim().length > 0 ? `${file.name} (${file.path})` : file.name;
		lines.push(`${nameLabel}: ${file.rawChars} raw -> ${file.injectedChars} injected (~${Math.max(0, pct)}% removed${causeText ? `; ${causeText}` : ""}).`);
	}
	if (params.analysis.truncatedFiles.length > topFiles.length) lines.push(`+${params.analysis.truncatedFiles.length - topFiles.length} more truncated file(s).`);
	lines.push("If unintentional, raise agents.defaults.bootstrapMaxChars and/or agents.defaults.bootstrapTotalMaxChars.");
	return lines;
}
function buildBootstrapPromptWarning(params) {
	const signature = buildBootstrapTruncationSignature(params.analysis);
	let seenSignatures = normalizeSeenSignatures(params.seenSignatures);
	if (params.previousSignature && !seenSignatures.includes(params.previousSignature)) seenSignatures = appendSeenSignature(seenSignatures, params.previousSignature);
	const hasSeenSignature = Boolean(signature && seenSignatures.includes(signature));
	const warningShown = params.mode !== "off" && Boolean(signature) && (params.mode === "always" || !hasSeenSignature);
	const warningSignaturesSeen = signature && params.mode !== "off" ? appendSeenSignature(seenSignatures, signature) : seenSignatures;
	return {
		signature,
		warningShown,
		lines: warningShown ? formatBootstrapTruncationWarningLines({
			analysis: params.analysis,
			maxFiles: params.maxFiles
		}) : [],
		warningSignaturesSeen
	};
}
function appendBootstrapPromptWarning(prompt, warningLines, options) {
	const normalizedLines = (warningLines ?? []).map((line) => line.trim()).filter(Boolean);
	if (normalizedLines.length === 0) return prompt;
	if (options?.preserveExactPrompt && prompt === options.preserveExactPrompt) return prompt;
	const warningBlock = [
		"[Bootstrap truncation warning]",
		"Some workspace bootstrap files were truncated before injection.",
		"Treat Project Context as partial and read the relevant files directly if details seem missing.",
		...normalizedLines.map((line) => `- ${line}`)
	].join("\n");
	return prompt ? `${prompt}\n\n${warningBlock}` : warningBlock;
}
const prependBootstrapPromptWarning = appendBootstrapPromptWarning;
function buildBootstrapTruncationReportMeta(params) {
	return {
		warningMode: params.warningMode,
		warningShown: params.warning.warningShown,
		promptWarningSignature: params.warning.signature,
		...params.warning.warningSignaturesSeen.length > 0 ? { warningSignaturesSeen: params.warning.warningSignaturesSeen } : {},
		truncatedFiles: params.analysis.truncatedFiles.length,
		nearLimitFiles: params.analysis.nearLimitFiles.length,
		totalNearLimit: params.analysis.totalNearLimit
	};
}
//#endregion
export { parseDeliveryInput as _, prependBootstrapPromptWarning as a, resolveBootstrapContextForRun as b, normalizeOptionalAgentId as c, normalizePayloadToSystemText as d, normalizeRequiredName as f, TrimmedNonEmptyStringFieldSchema as g, TimeoutSecondsFieldSchema as h, buildBootstrapTruncationReportMeta as i, normalizeOptionalSessionKey as l, LowercaseNonEmptyStringFieldSchema as m, buildBootstrapInjectionStats as n, resolveBootstrapWarningSignaturesSeen as o, DeliveryThreadIdFieldSchema as p, buildBootstrapPromptWarning as r, inferLegacyName as s, analyzeBootstrapBudget as t, normalizeOptionalText as u, parseOptionalField as v, makeBootstrapWarn as y };
