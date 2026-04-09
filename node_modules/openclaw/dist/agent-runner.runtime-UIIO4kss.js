import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { o as isInternalMessageChannel, p as resolveMessageChannel, s as isMarkdownCapableMessageChannel } from "./message-channel-DnQkETjb.js";
import { t as sanitizeForLog } from "./ansi-DpBQLMEp.js";
import { d as resolveResponseUsageMode, u as normalizeVerboseLevel } from "./thinking.shared-CA8xx4G3.js";
import { u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { _ as resolveRunModelFallbacksOverride, v as resolveSessionAgentId } from "./agent-scope-CXWTwwic.js";
import { r as logVerbose } from "./globals-B43CpcZo.js";
import "./defaults-I0_TmVEm.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { u as resolveMemoryFlushPlan } from "./memory-state-BWbQIcQt.js";
import "./config-dzPpvDz6.js";
import { _ as resolveGroupSessionKey, c as updateSessionStore, l as updateSessionStoreEntry } from "./store-Cx4GsUxp.js";
import "./sessions-D5EF_laP.js";
import { a as resolveSessionTranscriptPath, i as resolveSessionFilePathOptions, r as resolveSessionFilePath } from "./paths-UazeViO92.js";
import { a as resolveFreshSessionTotalTokens } from "./types-CT9QkK_u.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { a as isAudioFileName } from "./mime-MVyX1IzB.js";
import { a as isSilentReplyText, i as isSilentReplyPrefixText, n as SILENT_REPLY_TOKEN } from "./tokens-wOGzQgw2.js";
import { s as stripHeartbeatToken } from "./heartbeat-D76mk7r3.js";
import { d as readPostCompactionContext, dt as isFallbackSummaryError, ft as runWithModelFallback, n as isLikelyExecutionAckPrompt, pt as LiveSessionModelSwitchError, s as compactEmbeddedPiSession, t as runEmbeddedPiAgent, u as estimateMessagesTokens } from "./pi-embedded-DWASRjxE.js";
import { a as generateSecureUuid } from "./secure-random-BRacmrZN.js";
import { n as isDiagnosticsEnabled, t as emitDiagnosticEvent } from "./diagnostic-events-DQJ80don.js";
import { n as GatewayDrainingError, t as CommandLaneClearedError } from "./command-queue-Cssp02gj.js";
import { o as resolveBootstrapWarningSignaturesSeen } from "./bootstrap-budget-Fd-WnRNB.js";
import "./pi-embedded-helpers-T2IjifdJ.js";
import { C as isBillingErrorMessage, S as sanitizeUserFacingText, T as isRateLimitErrorMessage, d as isCompactionFailureError, f as isContextOverflowError, h as isLikelyContextOverflowError, t as BILLING_ERROR_USER_MESSAGE, w as isOverloadedErrorMessage, y as isTransientHttpError } from "./errors-By_fjUFz.js";
import { n as resolveSandboxConfigForAgent } from "./config-x6EsTLRX.js";
import { n as resolveSandboxRuntimeStatus } from "./runtime-status-BNMb0UiT.js";
import "./thinking-Dy-aqg86.js";
import { c as resolveModelAuthMode } from "./model-auth-BbESr7Je.js";
import { a as resolveSandboxedMediaSource, t as assertMediaNotDataUrl } from "./sandbox-paths-B1-hAAsM.js";
import { h as resolvePathFromInput, o as parseReplyDirectives, p as resolveEffectiveToolFsWorkspaceOnly } from "./deliver-DqZbx7oj.js";
import { r as enqueueSystemEvent } from "./system-events-D41GWMIV.js";
import { p as resolveSendableOutboundReplyParts, s as hasOutboundReplyContent } from "./reply-payload-Dp5nBPsr.js";
import { i as isRenderablePayload, n as applyReplyThreading, t as applyReplyTagsToPayload } from "./reply-payloads-CqDTTwVz.js";
import { i as resolveReplyToMode, t as createReplyToModeFilterForChannel } from "./reply-threading-B6KmGqp6.js";
import { n as filterMessagingToolMediaDuplicates, r as shouldSuppressMessagingToolReplies, t as filterMessagingToolDuplicates } from "./reply-payloads-dedupe-D4MN1PKh.js";
import { h as replyRunRegistry, m as createReplyOperation, p as ReplyRunAlreadyActiveError, s as queueEmbeddedPiMessage } from "./runs-20zfUeR4.js";
import { u as saveMediaSource } from "./store-caT1P_9G.js";
import { i as emitAgentEvent, u as registerAgentRunContext } from "./agent-events-B4irFqCI.js";
import { o as scheduleFollowupDrain, r as enqueueFollowupRun, s as refreshQueuedFollowupSession } from "./fast-mode-DDhjOmb4.js";
import { n as routeReply, t as isRoutableChannel } from "./route-reply-1yUfCtm6.js";
import { t as lookupContextTokens } from "./context-BozTgpbo.js";
import { c as buildFallbackClearedNotice, l as buildFallbackNotice, u as resolveFallbackTransition } from "./status-yaHSTeGo.js";
import { a as ensureSandboxWorkspaceForSession } from "./sandbox-DMz_IPHy.js";
import { a as normalizeUsage, n as deriveSessionTotalTokens, r as hasNonzeroUsage, t as derivePromptTokens } from "./usage-CzcPoJlb.js";
import { a as resolveModelCostConfig, i as formatUsd, n as estimateUsageCost, r as formatTokenCount } from "./usage-format-B6wsX5Cv.js";
import { _ as readSessionMessages } from "./session-utils-ZjbDuU8d.js";
import { n as resolveCronStorePath, t as loadCronStore } from "./store-BaZoKJjq.js";
import { r as resolveEffectiveBlockStreamingConfig } from "./block-streaming-DJKKKWVg.js";
import { n as resolveOriginMessageProvider, r as resolveOriginMessageTo, t as resolveOriginAccountId } from "./origin-routing-CQWuRi9p.js";
import { r as resolveActiveRunQueueAction, t as createTypingSignaler } from "./typing-mode-D_BIkS5h.js";
import { a as resolveModelFallbackOptions, i as isBunFetchSocketError, o as resolveRunAuthProfile, r as formatBunFetchSocketError, t as buildEmbeddedRunExecutionParams } from "./agent-runner-utils-C77H2bCg.js";
import { n as createBlockReplyContentKey, r as createBlockReplyPipeline, t as createAudioAsVoiceBuffer } from "./block-reply-pipeline-CZz7vsue.js";
import { n as incrementCompactionCount } from "./session-updates-if_9gUYi.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
//#region src/auto-reply/reply/reply-delivery.ts
function normalizeReplyPayloadDirectives(params) {
	const parseMode = params.parseMode ?? "always";
	const silentToken = params.silentToken ?? "NO_REPLY";
	const sourceText = params.payload.text ?? "";
	const parsed = parseMode === "always" || parseMode === "auto" && (sourceText.includes("[[") || sourceText.includes("MEDIA:") || sourceText.includes(silentToken)) ? parseReplyDirectives(sourceText, {
		currentMessageId: params.currentMessageId,
		silentToken
	}) : void 0;
	let text = parsed ? parsed.text || void 0 : params.payload.text || void 0;
	if (params.trimLeadingWhitespace && text) text = text.trimStart() || void 0;
	const mediaUrls = params.payload.mediaUrls ?? parsed?.mediaUrls;
	const mediaUrl = params.payload.mediaUrl ?? parsed?.mediaUrl ?? mediaUrls?.[0];
	return {
		payload: {
			...params.payload,
			text,
			mediaUrls,
			mediaUrl,
			replyToId: params.payload.replyToId ?? parsed?.replyToId,
			replyToTag: params.payload.replyToTag || parsed?.replyToTag,
			replyToCurrent: params.payload.replyToCurrent || parsed?.replyToCurrent,
			audioAsVoice: Boolean(params.payload.audioAsVoice || parsed?.audioAsVoice)
		},
		isSilent: parsed?.isSilent ?? false
	};
}
function createBlockReplyDeliveryHandler(params) {
	return async (payload) => {
		const { text, skip } = params.normalizeStreamingText(payload);
		if (skip && !resolveSendableOutboundReplyParts(payload).hasMedia) return;
		const taggedPayload = applyReplyTagsToPayload({
			...payload,
			text,
			mediaUrl: payload.mediaUrl ?? payload.mediaUrls?.[0],
			replyToId: payload.replyToId ?? (payload.replyToCurrent === false ? void 0 : params.currentMessageId)
		}, params.currentMessageId);
		if (!isRenderablePayload(taggedPayload) && !payload.audioAsVoice) return;
		const normalized = normalizeReplyPayloadDirectives({
			payload: taggedPayload,
			currentMessageId: params.currentMessageId,
			silentToken: SILENT_REPLY_TOKEN,
			trimLeadingWhitespace: true,
			parseMode: "auto"
		});
		const mediaNormalizedPayload = params.normalizeMediaPaths ? await params.normalizeMediaPaths(normalized.payload) : normalized.payload;
		const blockPayload = params.applyReplyToMode(mediaNormalizedPayload);
		const blockHasMedia = resolveSendableOutboundReplyParts(blockPayload).hasMedia;
		if (!blockPayload.text && !blockHasMedia && !blockPayload.audioAsVoice) return;
		if (normalized.isSilent && !blockHasMedia) return;
		if (blockPayload.text) params.typingSignals.signalTextDelta(blockPayload.text).catch((err) => {
			logVerbose(`block reply typing signal failed: ${String(err)}`);
		});
		if (params.blockStreamingEnabled && params.blockReplyPipeline) params.blockReplyPipeline.enqueue(blockPayload);
		else if (params.blockStreamingEnabled) {
			params.directlySentBlockKeys.add(createBlockReplyContentKey(blockPayload));
			await params.onBlockReply(blockPayload);
		} else if (blockHasMedia) {
			params.directlySentBlockKeys.add(createBlockReplyContentKey(blockPayload));
			await params.onBlockReply({
				...blockPayload,
				text: void 0
			});
		}
	};
}
//#endregion
//#region src/auto-reply/reply/reply-media-paths.ts
const HTTP_URL_RE = /^https?:\/\//i;
const FILE_URL_RE = /^file:\/\//i;
const WINDOWS_DRIVE_RE = /^[a-zA-Z]:[\\/]/;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
const HAS_FILE_EXT_RE = /\.\w{1,10}$/;
const AGENT_STATE_MEDIA_DIRNAME = path.join(".openclaw", "media");
function isPathInside(root, candidate) {
	const relative = path.relative(path.resolve(root), path.resolve(candidate));
	return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
}
function isLikelyLocalMediaSource(media) {
	return FILE_URL_RE.test(media) || media.startsWith("/") || media.startsWith("./") || media.startsWith("../") || media.startsWith("~") || WINDOWS_DRIVE_RE.test(media) || media.startsWith("\\\\") || !SCHEME_RE.test(media) && (media.includes("/") || media.includes("\\") || HAS_FILE_EXT_RE.test(media));
}
function getPayloadMediaList(payload) {
	return resolveSendableOutboundReplyParts(payload).mediaUrls;
}
function createReplyMediaPathNormalizer(params) {
	const agentId = params.sessionKey ? resolveSessionAgentId({
		sessionKey: params.sessionKey,
		config: params.cfg
	}) : void 0;
	const workspaceOnly = resolveEffectiveToolFsWorkspaceOnly({
		cfg: params.cfg,
		agentId
	});
	let sandboxRootPromise;
	const persistedMediaBySource = /* @__PURE__ */ new Map();
	const resolveSandboxRoot = async () => {
		if (!sandboxRootPromise) sandboxRootPromise = ensureSandboxWorkspaceForSession({
			config: params.cfg,
			sessionKey: params.sessionKey,
			workspaceDir: params.workspaceDir
		}).then((sandbox) => sandbox?.workspaceDir);
		return await sandboxRootPromise;
	};
	const persistVolatileAgentMedia = async (media) => {
		if (!path.isAbsolute(media)) return media;
		const sandboxRoot = await resolveSandboxRoot();
		if (![params.workspaceDir, sandboxRoot].filter((root) => Boolean(root)).map((root) => path.join(path.resolve(root), AGENT_STATE_MEDIA_DIRNAME)).some((root) => isPathInside(root, media))) return media;
		const cached = persistedMediaBySource.get(media);
		if (cached) return await cached;
		const persistPromise = saveMediaSource(media, void 0, "outbound").then((saved) => saved.path).catch((err) => {
			persistedMediaBySource.delete(media);
			throw err;
		});
		persistedMediaBySource.set(media, persistPromise);
		try {
			return await persistPromise;
		} catch (err) {
			logVerbose(`failed to persist volatile reply media ${media}: ${String(err)}`);
			return media;
		}
	};
	const normalizeMediaSource = async (raw) => {
		const media = raw.trim();
		if (!media) return media;
		assertMediaNotDataUrl(media);
		if (HTTP_URL_RE.test(media)) return media;
		const sandboxRoot = await resolveSandboxRoot();
		if (sandboxRoot) try {
			return await resolveSandboxedMediaSource({
				media,
				sandboxRoot
			});
		} catch (err) {
			if (workspaceOnly || !isLikelyLocalMediaSource(media)) throw err;
			if (FILE_URL_RE.test(media)) return media;
			return resolvePathFromInput(media, params.workspaceDir);
		}
		if (!isLikelyLocalMediaSource(media)) return media;
		if (FILE_URL_RE.test(media)) return media;
		return resolvePathFromInput(media, params.workspaceDir);
	};
	return async (payload) => {
		const mediaList = getPayloadMediaList(payload);
		if (mediaList.length === 0) return payload;
		const normalizedMedia = [];
		const seen = /* @__PURE__ */ new Set();
		for (const media of mediaList) {
			const normalized = await persistVolatileAgentMedia(await normalizeMediaSource(media));
			if (!normalized || seen.has(normalized)) continue;
			seen.add(normalized);
			normalizedMedia.push(normalized);
		}
		if (normalizedMedia.length === 0) return {
			...payload,
			mediaUrl: void 0,
			mediaUrls: void 0
		};
		return {
			...payload,
			mediaUrl: normalizedMedia[0],
			mediaUrls: normalizedMedia
		};
	};
}
const GPT_CHAT_BREVITY_ACK_MAX_CHARS = 420;
const GPT_CHAT_BREVITY_ACK_MAX_SENTENCES = 3;
const GPT_CHAT_BREVITY_SOFT_MAX_CHARS = 900;
const GPT_CHAT_BREVITY_SOFT_MAX_SENTENCES = 6;
const FALLBACK_SELECTION_STATE_KEYS = [
	"providerOverride",
	"modelOverride",
	"authProfileOverride",
	"authProfileOverrideSource",
	"authProfileOverrideCompactionCount"
];
function setFallbackSelectionStateField(entry, key, value) {
	switch (key) {
		case "providerOverride":
			if (entry.providerOverride !== value) {
				entry.providerOverride = value;
				return true;
			}
			return false;
		case "modelOverride":
			if (entry.modelOverride !== value) {
				entry.modelOverride = value;
				return true;
			}
			return false;
		case "authProfileOverride":
			if (entry.authProfileOverride !== value) {
				entry.authProfileOverride = value;
				return true;
			}
			return false;
		case "authProfileOverrideSource":
			if (entry.authProfileOverrideSource !== value) {
				entry.authProfileOverrideSource = value;
				return true;
			}
			return false;
		case "authProfileOverrideCompactionCount":
			if (entry.authProfileOverrideCompactionCount !== value) {
				entry.authProfileOverrideCompactionCount = value;
				return true;
			}
			return false;
	}
}
function snapshotFallbackSelectionState(entry) {
	return {
		providerOverride: entry.providerOverride,
		modelOverride: entry.modelOverride,
		authProfileOverride: entry.authProfileOverride,
		authProfileOverrideSource: entry.authProfileOverrideSource,
		authProfileOverrideCompactionCount: entry.authProfileOverrideCompactionCount
	};
}
function buildFallbackSelectionState(params) {
	return {
		providerOverride: params.provider,
		modelOverride: params.model,
		authProfileOverride: params.authProfileId,
		authProfileOverrideSource: params.authProfileId ? params.authProfileIdSource : void 0,
		authProfileOverrideCompactionCount: void 0
	};
}
function applyFallbackSelectionState(entry, nextState, now = Date.now()) {
	let updated = false;
	for (const key of FALLBACK_SELECTION_STATE_KEYS) {
		const nextValue = nextState[key];
		if (nextValue === void 0) {
			if (Object.hasOwn(entry, key)) {
				delete entry[key];
				updated = true;
			}
			continue;
		}
		if (entry[key] !== nextValue) updated = setFallbackSelectionStateField(entry, key, nextValue) || updated;
	}
	if (updated) entry.updatedAt = now;
	return updated;
}
function rollbackFallbackSelectionStateIfUnchanged(entry, expectedState, previousState, now = Date.now()) {
	let updated = false;
	for (const key of FALLBACK_SELECTION_STATE_KEYS) {
		if (entry[key] !== expectedState[key]) continue;
		const previousValue = previousState[key];
		if (previousValue === void 0) {
			if (Object.hasOwn(entry, key)) {
				delete entry[key];
				updated = true;
			}
			continue;
		}
		if (entry[key] !== previousValue) updated = setFallbackSelectionStateField(entry, key, previousValue) || updated;
	}
	if (updated) entry.updatedAt = now;
	return updated;
}
/**
* Build a human-friendly rate-limit message from a FallbackSummaryError.
* Includes a countdown when the soonest cooldown expiry is known.
*/
function buildRateLimitCooldownMessage(err) {
	if (!isFallbackSummaryError(err)) return "⚠️ All models are temporarily rate-limited. Please try again in a few minutes.";
	const expiry = err.soonestCooldownExpiry;
	const now = Date.now();
	if (typeof expiry === "number" && expiry > now) {
		const secsLeft = Math.max(1, Math.ceil((expiry - now) / 1e3));
		if (secsLeft <= 60) return `⚠️ Rate-limited — ready in ~${secsLeft}s. Please wait a moment.`;
		return `⚠️ Rate-limited — ready in ~${Math.ceil(secsLeft / 60)} min. Please try again shortly.`;
	}
	return "⚠️ All models are temporarily rate-limited. Please try again in a few minutes.";
}
function isPureTransientRateLimitSummary(err) {
	return isFallbackSummaryError(err) && err.attempts.length > 0 && err.attempts.every((attempt) => {
		const reason = attempt.reason;
		return reason === "rate_limit" || reason === "overloaded";
	});
}
function isToolResultTurnMismatchError(message) {
	const lower = message.toLowerCase();
	return lower.includes("toolresult") && lower.includes("tooluse") && lower.includes("exceeds the number") && lower.includes("previous turn");
}
function buildExternalRunFailureText(message) {
	if (isToolResultTurnMismatchError(message)) return "⚠️ Session history got out of sync. Please try again, or use /new to start a fresh session.";
	return "⚠️ Something went wrong while processing your request. Please try again, or use /new to start a fresh session.";
}
function shouldApplyOpenAIGptChatGuard(params) {
	if (params.provider !== "openai" && params.provider !== "openai-codex") return false;
	return /^gpt-5(?:[.-]|$)/i.test(params.model ?? "");
}
function countChatReplySentences(text) {
	return text.trim().split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean).length;
}
function scoreChattyFinalReplyText(text) {
	const trimmed = text.trim();
	if (!trimmed) return 0;
	let score = 0;
	const sentenceCount = countChatReplySentences(trimmed);
	if (trimmed.length > 900) score += 1;
	if (trimmed.length > 1500) score += 1;
	if (sentenceCount > 6) score += 1;
	if (sentenceCount > 10) score += 1;
	if (trimmed.split(/\n{2,}/u).filter(Boolean).length >= 3) score += 1;
	if (/\b(?:in summary|to summarize|here(?:'s| is) what|what changed|what I verified)\b/i.test(trimmed)) score += 1;
	return score;
}
function shortenChattyFinalReplyText(text, params) {
	const trimmed = text.trim();
	if (!trimmed) return trimmed;
	let shortened = trimmed.split(/(?<=[.!?])\s+/u).map((part) => part.trim()).filter(Boolean).slice(0, params.maxSentences).join(" ");
	if (!shortened) shortened = trimmed.slice(0, params.maxChars).trimEnd();
	if (shortened.length > params.maxChars) shortened = shortened.slice(0, params.maxChars).trimEnd();
	if (shortened.length >= trimmed.length) return trimmed;
	return shortened.replace(/[.,;:!?-]*$/u, "").trimEnd() + "...";
}
function applyOpenAIGptChatReplyGuard(params) {
	if (params.isHeartbeat || !shouldApplyOpenAIGptChatGuard({
		provider: params.provider,
		model: params.model
	}) || !params.payloads?.length) return;
	const trimmedCommand = params.commandBody.trim();
	const isAckTurn = isLikelyExecutionAckPrompt(trimmedCommand);
	const allowSoftCap = !isAckTurn && trimmedCommand.length > 0 && trimmedCommand.length <= 120 && !/\b(?:detail|detailed|depth|deep dive|explain|compare|walk me through|why|how)\b/i.test(trimmedCommand);
	for (const payload of params.payloads) {
		if (!payload.text?.trim() || payload.isError || payload.isReasoning || payload.mediaUrl || (payload.mediaUrls?.length ?? 0) > 0 || payload.interactive || payload.text.includes("```")) continue;
		if (isAckTurn) {
			payload.text = shortenChattyFinalReplyText(payload.text, {
				maxChars: GPT_CHAT_BREVITY_ACK_MAX_CHARS,
				maxSentences: GPT_CHAT_BREVITY_ACK_MAX_SENTENCES
			});
			continue;
		}
		if (allowSoftCap && scoreChattyFinalReplyText(payload.text) >= 4) payload.text = shortenChattyFinalReplyText(payload.text, {
			maxChars: GPT_CHAT_BREVITY_SOFT_MAX_CHARS,
			maxSentences: GPT_CHAT_BREVITY_SOFT_MAX_SENTENCES
		});
	}
}
function buildRestartLifecycleReplyText() {
	return "⚠️ Gateway is restarting. Please wait a few seconds and try again.";
}
function resolveRestartLifecycleError(err) {
	const pending = [err];
	const seen = /* @__PURE__ */ new Set();
	while (pending.length > 0) {
		const candidate = pending.shift();
		if (!candidate || seen.has(candidate)) continue;
		seen.add(candidate);
		if (candidate instanceof GatewayDrainingError || candidate instanceof CommandLaneClearedError) return candidate;
		if (isFallbackSummaryError(candidate)) for (const attempt of candidate.attempts) pending.push(attempt.error);
		if (candidate instanceof Error && "cause" in candidate) pending.push(candidate.cause);
	}
}
function isReplyOperationUserAbort(replyOperation) {
	return replyOperation?.result?.kind === "aborted" && replyOperation.result.code === "aborted_by_user";
}
function isReplyOperationRestartAbort(replyOperation) {
	return replyOperation?.result?.kind === "aborted" && replyOperation.result.code === "aborted_for_restart";
}
async function runAgentTurnWithFallback(params) {
	const TRANSIENT_HTTP_RETRY_DELAY_MS = 2500;
	let didLogHeartbeatStrip = false;
	let autoCompactionCount = 0;
	const directlySentBlockKeys = /* @__PURE__ */ new Set();
	const runId = params.opts?.runId ?? crypto.randomUUID();
	const normalizeReplyMediaPaths = createReplyMediaPathNormalizer({
		cfg: params.followupRun.run.config,
		sessionKey: params.sessionKey,
		workspaceDir: params.followupRun.run.workspaceDir
	});
	let didNotifyAgentRunStart = false;
	const notifyAgentRunStart = () => {
		if (didNotifyAgentRunStart) return;
		didNotifyAgentRunStart = true;
		params.opts?.onAgentRunStart?.(runId);
	};
	const shouldSurfaceToControlUi = isInternalMessageChannel(params.followupRun.run.messageProvider ?? params.sessionCtx.Surface ?? params.sessionCtx.Provider);
	if (params.sessionKey) registerAgentRunContext(runId, {
		sessionKey: params.sessionKey,
		verboseLevel: params.resolvedVerboseLevel,
		isHeartbeat: params.isHeartbeat,
		isControlUiVisible: shouldSurfaceToControlUi
	});
	let runResult;
	let fallbackProvider = params.followupRun.run.provider;
	let fallbackModel = params.followupRun.run.model;
	let fallbackAttempts = [];
	let didResetAfterCompactionFailure = false;
	let didRetryTransientHttpError = false;
	let liveModelSwitchRetries = 0;
	let bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(params.getActiveSessionEntry()?.systemPromptReport);
	const persistFallbackCandidateSelection = async (provider, model) => {
		if (!params.sessionKey || !params.activeSessionStore || provider === params.followupRun.run.provider && model === params.followupRun.run.model) return;
		const activeSessionEntry = params.getActiveSessionEntry() ?? params.activeSessionStore[params.sessionKey];
		if (!activeSessionEntry) return;
		const previousState = snapshotFallbackSelectionState(activeSessionEntry);
		const scopedAuthProfile = resolveRunAuthProfile(params.followupRun.run, provider);
		const nextState = buildFallbackSelectionState({
			provider,
			model,
			authProfileId: scopedAuthProfile.authProfileId,
			authProfileIdSource: scopedAuthProfile.authProfileIdSource
		});
		if (!applyFallbackSelectionState(activeSessionEntry, nextState)) return;
		params.activeSessionStore[params.sessionKey] = activeSessionEntry;
		try {
			if (params.storePath) await updateSessionStore(params.storePath, (store) => {
				const persistedEntry = store[params.sessionKey];
				if (!persistedEntry) return;
				applyFallbackSelectionState(persistedEntry, nextState);
				store[params.sessionKey] = persistedEntry;
			});
		} catch (error) {
			rollbackFallbackSelectionStateIfUnchanged(activeSessionEntry, nextState, previousState);
			params.activeSessionStore[params.sessionKey] = activeSessionEntry;
			throw error;
		}
		return async () => {
			if (rollbackFallbackSelectionStateIfUnchanged(activeSessionEntry, nextState, previousState)) params.activeSessionStore[params.sessionKey] = activeSessionEntry;
			if (!params.storePath) return;
			await updateSessionStore(params.storePath, (store) => {
				const persistedEntry = store[params.sessionKey];
				if (!persistedEntry) return;
				if (rollbackFallbackSelectionStateIfUnchanged(persistedEntry, nextState, previousState)) store[params.sessionKey] = persistedEntry;
			});
		};
	};
	while (true) try {
		const normalizeStreamingText = (payload) => {
			let text = payload.text;
			const reply = resolveSendableOutboundReplyParts(payload);
			if (params.followupRun.run.silentExpected) return { skip: true };
			if (!params.isHeartbeat && text?.includes("HEARTBEAT_OK")) {
				const stripped = stripHeartbeatToken(text, { mode: "message" });
				if (stripped.didStrip && !didLogHeartbeatStrip) {
					didLogHeartbeatStrip = true;
					logVerbose("Stripped stray HEARTBEAT_OK token from reply");
				}
				if (stripped.shouldSkip && !reply.hasMedia) return { skip: true };
				text = stripped.text;
			}
			if (isSilentReplyText(text, "NO_REPLY")) return { skip: true };
			if (isSilentReplyPrefixText(text, "NO_REPLY") || isSilentReplyPrefixText(text, "HEARTBEAT_OK")) return { skip: true };
			if (!text) {
				if (reply.hasMedia) return {
					text: void 0,
					skip: false
				};
				return { skip: true };
			}
			const sanitized = sanitizeUserFacingText(text, { errorContext: Boolean(payload.isError) });
			if (!sanitized.trim()) return { skip: true };
			return {
				text: sanitized,
				skip: false
			};
		};
		const handlePartialForTyping = async (payload) => {
			if (isSilentReplyPrefixText(payload.text, "NO_REPLY")) return;
			const { text, skip } = normalizeStreamingText(payload);
			if (skip || !text) return;
			await params.typingSignals.signalTextDelta(text);
			return text;
		};
		const blockReplyPipeline = params.blockReplyPipeline;
		const blockReplyHandler = params.opts?.onBlockReply ? createBlockReplyDeliveryHandler({
			onBlockReply: params.opts.onBlockReply,
			currentMessageId: params.sessionCtx.MessageSidFull ?? params.sessionCtx.MessageSid,
			normalizeStreamingText,
			applyReplyToMode: params.applyReplyToMode,
			normalizeMediaPaths: normalizeReplyMediaPaths,
			typingSignals: params.typingSignals,
			blockStreamingEnabled: params.blockStreamingEnabled,
			blockReplyPipeline,
			directlySentBlockKeys
		}) : void 0;
		const onToolResult = params.opts?.onToolResult;
		const fallbackResult = await runWithModelFallback({
			...resolveModelFallbackOptions(params.followupRun.run),
			runId,
			run: async (provider, model, runOptions) => {
				params.opts?.onModelSelected?.({
					provider,
					model,
					thinkLevel: params.followupRun.run.thinkLevel
				});
				let rollbackFallbackCandidateSelection;
				try {
					rollbackFallbackCandidateSelection = await persistFallbackCandidateSelection(provider, model);
				} catch (error) {
					logVerbose(`failed to persist fallback candidate selection (non-fatal): ${String(error)}`);
				}
				const { embeddedContext, senderContext, runBaseParams } = buildEmbeddedRunExecutionParams({
					run: params.followupRun.run,
					sessionCtx: params.sessionCtx,
					hasRepliedRef: params.opts?.hasRepliedRef,
					provider,
					runId,
					allowTransientCooldownProbe: runOptions?.allowTransientCooldownProbe,
					model
				});
				return (async () => {
					let attemptCompactionCount = 0;
					try {
						const result = await runEmbeddedPiAgent({
							...embeddedContext,
							allowGatewaySubagentBinding: true,
							trigger: params.isHeartbeat ? "heartbeat" : "user",
							groupId: resolveGroupSessionKey(params.sessionCtx)?.id,
							groupChannel: params.sessionCtx.GroupChannel?.trim() ?? params.sessionCtx.GroupSubject?.trim(),
							groupSpace: params.sessionCtx.GroupSpace?.trim() ?? void 0,
							...senderContext,
							...runBaseParams,
							prompt: params.commandBody,
							extraSystemPrompt: params.followupRun.run.extraSystemPrompt,
							toolResultFormat: (() => {
								const channel = resolveMessageChannel(params.sessionCtx.Surface, params.sessionCtx.Provider);
								if (!channel) return "markdown";
								return isMarkdownCapableMessageChannel(channel) ? "markdown" : "plain";
							})(),
							suppressToolErrorWarnings: params.opts?.suppressToolErrorWarnings,
							bootstrapContextMode: params.opts?.bootstrapContextMode,
							bootstrapContextRunKind: params.opts?.isHeartbeat ? "heartbeat" : "default",
							images: params.opts?.images,
							imageOrder: params.opts?.imageOrder,
							abortSignal: params.replyOperation?.abortSignal ?? params.opts?.abortSignal,
							replyOperation: params.replyOperation,
							blockReplyBreak: params.resolvedBlockStreamingBreak,
							blockReplyChunking: params.blockReplyChunking,
							onPartialReply: async (payload) => {
								const textForTyping = await handlePartialForTyping(payload);
								if (!params.opts?.onPartialReply || textForTyping === void 0) return;
								await params.opts.onPartialReply({
									text: textForTyping,
									mediaUrls: payload.mediaUrls
								});
							},
							onAssistantMessageStart: async () => {
								await params.typingSignals.signalMessageStart();
								await params.opts?.onAssistantMessageStart?.();
							},
							onReasoningStream: params.typingSignals.shouldStartOnReasoning || params.opts?.onReasoningStream ? async (payload) => {
								if (params.followupRun.run.silentExpected) return;
								await params.typingSignals.signalReasoningDelta();
								await params.opts?.onReasoningStream?.({
									text: payload.text,
									mediaUrls: payload.mediaUrls
								});
							} : void 0,
							onReasoningEnd: params.opts?.onReasoningEnd,
							onAgentEvent: async (evt) => {
								const hasLifecyclePhase = evt.stream === "lifecycle" && typeof evt.data.phase === "string";
								if (evt.stream !== "lifecycle" || hasLifecyclePhase) notifyAgentRunStart();
								if (evt.stream === "tool") {
									const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
									const name = typeof evt.data.name === "string" ? evt.data.name : void 0;
									if (phase === "start" || phase === "update") {
										await params.typingSignals.signalToolStart();
										await params.opts?.onToolStart?.({
											name,
											phase
										});
									}
								}
								if (evt.stream === "item") await params.opts?.onItemEvent?.({
									itemId: typeof evt.data.itemId === "string" ? evt.data.itemId : void 0,
									kind: typeof evt.data.kind === "string" ? evt.data.kind : void 0,
									title: typeof evt.data.title === "string" ? evt.data.title : void 0,
									name: typeof evt.data.name === "string" ? evt.data.name : void 0,
									phase: typeof evt.data.phase === "string" ? evt.data.phase : void 0,
									status: typeof evt.data.status === "string" ? evt.data.status : void 0,
									summary: typeof evt.data.summary === "string" ? evt.data.summary : void 0,
									progressText: typeof evt.data.progressText === "string" ? evt.data.progressText : void 0,
									approvalId: typeof evt.data.approvalId === "string" ? evt.data.approvalId : void 0,
									approvalSlug: typeof evt.data.approvalSlug === "string" ? evt.data.approvalSlug : void 0
								});
								if (evt.stream === "plan") await params.opts?.onPlanUpdate?.({
									phase: typeof evt.data.phase === "string" ? evt.data.phase : void 0,
									title: typeof evt.data.title === "string" ? evt.data.title : void 0,
									explanation: typeof evt.data.explanation === "string" ? evt.data.explanation : void 0,
									steps: Array.isArray(evt.data.steps) ? evt.data.steps.filter((step) => typeof step === "string") : void 0,
									source: typeof evt.data.source === "string" ? evt.data.source : void 0
								});
								if (evt.stream === "approval") await params.opts?.onApprovalEvent?.({
									phase: typeof evt.data.phase === "string" ? evt.data.phase : void 0,
									kind: typeof evt.data.kind === "string" ? evt.data.kind : void 0,
									status: typeof evt.data.status === "string" ? evt.data.status : void 0,
									title: typeof evt.data.title === "string" ? evt.data.title : void 0,
									itemId: typeof evt.data.itemId === "string" ? evt.data.itemId : void 0,
									toolCallId: typeof evt.data.toolCallId === "string" ? evt.data.toolCallId : void 0,
									approvalId: typeof evt.data.approvalId === "string" ? evt.data.approvalId : void 0,
									approvalSlug: typeof evt.data.approvalSlug === "string" ? evt.data.approvalSlug : void 0,
									command: typeof evt.data.command === "string" ? evt.data.command : void 0,
									host: typeof evt.data.host === "string" ? evt.data.host : void 0,
									reason: typeof evt.data.reason === "string" ? evt.data.reason : void 0,
									message: typeof evt.data.message === "string" ? evt.data.message : void 0
								});
								if (evt.stream === "command_output") await params.opts?.onCommandOutput?.({
									itemId: typeof evt.data.itemId === "string" ? evt.data.itemId : void 0,
									phase: typeof evt.data.phase === "string" ? evt.data.phase : void 0,
									title: typeof evt.data.title === "string" ? evt.data.title : void 0,
									toolCallId: typeof evt.data.toolCallId === "string" ? evt.data.toolCallId : void 0,
									name: typeof evt.data.name === "string" ? evt.data.name : void 0,
									output: typeof evt.data.output === "string" ? evt.data.output : void 0,
									status: typeof evt.data.status === "string" ? evt.data.status : void 0,
									exitCode: typeof evt.data.exitCode === "number" || evt.data.exitCode === null ? evt.data.exitCode : void 0,
									durationMs: typeof evt.data.durationMs === "number" ? evt.data.durationMs : void 0,
									cwd: typeof evt.data.cwd === "string" ? evt.data.cwd : void 0
								});
								if (evt.stream === "patch") await params.opts?.onPatchSummary?.({
									itemId: typeof evt.data.itemId === "string" ? evt.data.itemId : void 0,
									phase: typeof evt.data.phase === "string" ? evt.data.phase : void 0,
									title: typeof evt.data.title === "string" ? evt.data.title : void 0,
									toolCallId: typeof evt.data.toolCallId === "string" ? evt.data.toolCallId : void 0,
									name: typeof evt.data.name === "string" ? evt.data.name : void 0,
									added: Array.isArray(evt.data.added) ? evt.data.added.filter((entry) => typeof entry === "string") : void 0,
									modified: Array.isArray(evt.data.modified) ? evt.data.modified.filter((entry) => typeof entry === "string") : void 0,
									deleted: Array.isArray(evt.data.deleted) ? evt.data.deleted.filter((entry) => typeof entry === "string") : void 0,
									summary: typeof evt.data.summary === "string" ? evt.data.summary : void 0
								});
								if (evt.stream === "compaction") {
									const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
									if (phase === "start") {
										const notifyUser = params.followupRun.run.config.agents?.defaults?.compaction?.notifyUser === true;
										if (params.opts?.onCompactionStart) await params.opts.onCompactionStart();
										else if (notifyUser && params.opts?.onBlockReply) {
											const currentMessageId = params.sessionCtx.MessageSidFull ?? params.sessionCtx.MessageSid;
											const noticePayload = params.applyReplyToMode({
												text: "🧹 Compacting context...",
												replyToId: currentMessageId,
												replyToCurrent: true,
												isCompactionNotice: true
											});
											try {
												await params.opts.onBlockReply(noticePayload);
											} catch (err) {
												logVerbose(`compaction start notice delivery failed (non-fatal): ${String(err)}`);
											}
										}
									}
									const completed = evt.data?.completed === true;
									if (phase === "end" && completed) {
										attemptCompactionCount += 1;
										await params.opts?.onCompactionEnd?.();
									}
								}
							},
							onBlockReply: blockReplyHandler,
							onBlockReplyFlush: params.blockStreamingEnabled && blockReplyPipeline ? async () => {
								await blockReplyPipeline.flush({ force: true });
							} : void 0,
							shouldEmitToolResult: params.shouldEmitToolResult,
							shouldEmitToolOutput: params.shouldEmitToolOutput,
							bootstrapPromptWarningSignaturesSeen,
							bootstrapPromptWarningSignature: bootstrapPromptWarningSignaturesSeen[bootstrapPromptWarningSignaturesSeen.length - 1],
							onToolResult: onToolResult ? (() => {
								let toolResultChain = Promise.resolve();
								return (payload) => {
									toolResultChain = toolResultChain.then(async () => {
										const { text, skip } = normalizeStreamingText(payload);
										if (skip) return;
										if (text !== void 0) await params.typingSignals.signalTextDelta(text);
										await onToolResult({
											...payload,
											text
										});
									}).catch((err) => {
										logVerbose(`tool result delivery failed: ${String(err)}`);
									});
									const task = toolResultChain.finally(() => {
										params.pendingToolTasks.delete(task);
									});
									params.pendingToolTasks.add(task);
								};
							})() : void 0
						});
						bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(result.meta?.systemPromptReport);
						const resultCompactionCount = Math.max(0, result.meta?.agentMeta?.compactionCount ?? 0);
						attemptCompactionCount = Math.max(attemptCompactionCount, resultCompactionCount);
						return result;
					} catch (err) {
						if (rollbackFallbackCandidateSelection) try {
							await rollbackFallbackCandidateSelection();
						} catch (rollbackError) {
							logVerbose(`failed to roll back fallback candidate selection (non-fatal): ${String(rollbackError)}`);
						}
						throw err;
					} finally {
						autoCompactionCount += attemptCompactionCount;
					}
				})();
			}
		});
		runResult = fallbackResult.result;
		fallbackProvider = fallbackResult.provider;
		fallbackModel = fallbackResult.model;
		fallbackAttempts = Array.isArray(fallbackResult.attempts) ? fallbackResult.attempts.map((attempt) => ({
			provider: String(attempt.provider ?? ""),
			model: String(attempt.model ?? ""),
			error: String(attempt.error ?? ""),
			reason: attempt.reason ? String(attempt.reason) : void 0,
			status: typeof attempt.status === "number" ? attempt.status : void 0,
			code: attempt.code ? String(attempt.code) : void 0
		})) : [];
		const embeddedError = runResult.meta?.error;
		if (embeddedError && isContextOverflowError(embeddedError.message) && !didResetAfterCompactionFailure && await params.resetSessionAfterCompactionFailure(embeddedError.message)) {
			didResetAfterCompactionFailure = true;
			params.replyOperation?.fail("run_failed", embeddedError);
			return {
				kind: "final",
				payload: { text: "⚠️ Context limit exceeded. I've reset our conversation to start fresh - please try again.\n\nTo prevent this, increase your compaction buffer by setting `agents.defaults.compaction.reserveTokensFloor` to 20000 or higher in your config." }
			};
		}
		if (embeddedError?.kind === "role_ordering") {
			if (await params.resetSessionAfterRoleOrderingConflict(embeddedError.message)) {
				params.replyOperation?.fail("run_failed", embeddedError);
				return {
					kind: "final",
					payload: { text: "⚠️ Message ordering conflict. I've reset the conversation - please try again." }
				};
			}
		}
		break;
	} catch (err) {
		if (err instanceof LiveSessionModelSwitchError) {
			liveModelSwitchRetries += 1;
			if (liveModelSwitchRetries > 2) {
				defaultRuntime.error(`Live model switch failed after 2 retries (${sanitizeForLog(err.provider)}/${sanitizeForLog(err.model)}). The requested model may be unavailable.`);
				const switchErrorText = shouldSurfaceToControlUi ? "⚠️ Agent failed before reply: model switch could not be completed. The requested model may be temporarily unavailable.\nLogs: openclaw logs --follow" : "⚠️ Agent failed before reply: model switch could not be completed. The requested model may be temporarily unavailable. Please try again shortly.";
				params.replyOperation?.fail("run_failed", err);
				return {
					kind: "final",
					payload: { text: switchErrorText }
				};
			}
			params.followupRun.run.provider = err.provider;
			params.followupRun.run.model = err.model;
			params.followupRun.run.authProfileId = err.authProfileId;
			params.followupRun.run.authProfileIdSource = err.authProfileId ? err.authProfileIdSource : void 0;
			fallbackProvider = err.provider;
			fallbackModel = err.model;
			continue;
		}
		const message = err instanceof Error ? err.message : String(err);
		const isBilling = isBillingErrorMessage(message);
		const isContextOverflow = !isBilling && isLikelyContextOverflowError(message);
		const isCompactionFailure = !isBilling && isCompactionFailureError(message);
		const isSessionCorruption = /function call turn comes immediately after/i.test(message);
		const isRoleOrderingError = /incorrect role information|roles must alternate/i.test(message);
		const isTransientHttp = isTransientHttpError(message);
		if (isReplyOperationRestartAbort(params.replyOperation)) return {
			kind: "final",
			payload: { text: buildRestartLifecycleReplyText() }
		};
		if (isReplyOperationUserAbort(params.replyOperation)) return {
			kind: "final",
			payload: { text: SILENT_REPLY_TOKEN }
		};
		const restartLifecycleError = resolveRestartLifecycleError(err);
		if (restartLifecycleError instanceof GatewayDrainingError) {
			params.replyOperation?.fail("gateway_draining", restartLifecycleError);
			return {
				kind: "final",
				payload: { text: buildRestartLifecycleReplyText() }
			};
		}
		if (restartLifecycleError instanceof CommandLaneClearedError) {
			params.replyOperation?.fail("command_lane_cleared", restartLifecycleError);
			return {
				kind: "final",
				payload: { text: buildRestartLifecycleReplyText() }
			};
		}
		if (isCompactionFailure && !didResetAfterCompactionFailure && await params.resetSessionAfterCompactionFailure(message)) {
			didResetAfterCompactionFailure = true;
			params.replyOperation?.fail("run_failed", err);
			return {
				kind: "final",
				payload: { text: "⚠️ Context limit exceeded during compaction. I've reset our conversation to start fresh - please try again.\n\nTo prevent this, increase your compaction buffer by setting `agents.defaults.compaction.reserveTokensFloor` to 20000 or higher in your config." }
			};
		}
		if (isRoleOrderingError) {
			if (await params.resetSessionAfterRoleOrderingConflict(message)) {
				params.replyOperation?.fail("run_failed", err);
				return {
					kind: "final",
					payload: { text: "⚠️ Message ordering conflict. I've reset the conversation - please try again." }
				};
			}
		}
		if (isSessionCorruption && params.sessionKey && params.activeSessionStore && params.storePath) {
			const sessionKey = params.sessionKey;
			const corruptedSessionId = params.getActiveSessionEntry()?.sessionId;
			defaultRuntime.error(`Session history corrupted (Gemini function call ordering). Resetting session: ${params.sessionKey}`);
			try {
				if (corruptedSessionId) {
					const transcriptPath = resolveSessionTranscriptPath(corruptedSessionId);
					try {
						fs.unlinkSync(transcriptPath);
					} catch {}
				}
				delete params.activeSessionStore[sessionKey];
				await updateSessionStore(params.storePath, (store) => {
					delete store[sessionKey];
				});
			} catch (cleanupErr) {
				defaultRuntime.error(`Failed to reset corrupted session ${params.sessionKey}: ${String(cleanupErr)}`);
			}
			params.replyOperation?.fail("session_corruption_reset", err);
			return {
				kind: "final",
				payload: { text: "⚠️ Session history was corrupted. I've reset the conversation - please try again!" }
			};
		}
		if (isTransientHttp && !didRetryTransientHttpError) {
			didRetryTransientHttpError = true;
			defaultRuntime.error(`Transient HTTP provider error before reply (${message}). Retrying once in ${TRANSIENT_HTTP_RETRY_DELAY_MS}ms.`);
			await new Promise((resolve) => {
				setTimeout(resolve, TRANSIENT_HTTP_RETRY_DELAY_MS);
			});
			continue;
		}
		defaultRuntime.error(`Embedded agent failed before reply: ${message}`);
		const isRateLimit = isFallbackSummaryError(err) ? isPureTransientRateLimitSummary(err) : isRateLimitErrorMessage(message);
		const trimmedMessage = (isTransientHttp ? sanitizeUserFacingText(message, { errorContext: true }) : message).replace(/\.\s*$/, "");
		const fallbackText = isBilling ? BILLING_ERROR_USER_MESSAGE : isRateLimit ? buildRateLimitCooldownMessage(err) : isContextOverflow ? "⚠️ Context overflow — prompt too large for this model. Try a shorter message or a larger-context model." : isRoleOrderingError ? "⚠️ Message ordering conflict - please try again. If this persists, use /new to start a fresh session." : shouldSurfaceToControlUi ? `⚠️ Agent failed before reply: ${trimmedMessage}.\nLogs: openclaw logs --follow` : buildExternalRunFailureText(message);
		params.replyOperation?.fail("run_failed", err);
		return {
			kind: "final",
			payload: { text: fallbackText }
		};
	}
	const finalEmbeddedError = runResult?.meta?.error;
	const hasPayloadText = runResult?.payloads?.some((p) => p.text?.trim());
	if (finalEmbeddedError && !hasPayloadText) {
		if (isContextOverflowError(finalEmbeddedError.message ?? "")) {
			params.replyOperation?.fail("run_failed", finalEmbeddedError);
			return {
				kind: "final",
				payload: { text: "⚠️ Context overflow — this conversation is too large for the model. Use /new to start a fresh session." }
			};
		}
	}
	if (runResult) {
		if (!runResult.payloads?.some((p) => !p.isError && !p.isReasoning && hasOutboundReplyContent(p, { trimText: true }))) {
			const metaErrorMsg = finalEmbeddedError?.message ?? "";
			const rawErrorPayloadText = runResult.payloads?.find((p) => p.isError && p.text?.trim() && !p.text.startsWith("⚠️"))?.text ?? "";
			const errorCandidate = metaErrorMsg || rawErrorPayloadText;
			if (errorCandidate && (isRateLimitErrorMessage(errorCandidate) || isOverloadedErrorMessage(errorCandidate))) {
				const isOverloaded = isOverloadedErrorMessage(errorCandidate);
				runResult.payloads = [{
					text: isOverloaded ? "⚠️ The AI service is temporarily overloaded. Please try again in a moment." : "⚠️ API rate limit reached — the model couldn't generate a response. Please try again in a moment.",
					isError: true
				}];
			}
		}
		applyOpenAIGptChatReplyGuard({
			provider: fallbackProvider,
			model: fallbackModel,
			commandBody: params.commandBody,
			isHeartbeat: params.isHeartbeat,
			payloads: runResult.payloads
		});
	}
	return {
		kind: "success",
		runId,
		runResult,
		fallbackProvider,
		fallbackModel,
		fallbackAttempts,
		didLogHeartbeatStrip,
		autoCompactionCount,
		directlySentBlockKeys: directlySentBlockKeys.size > 0 ? directlySentBlockKeys : void 0
	};
}
//#endregion
//#region src/auto-reply/reply/agent-runner-helpers.ts
const hasAudioMedia = (urls) => Boolean(urls?.some((url) => isAudioFileName(url)));
const isAudioPayload = (payload) => hasAudioMedia(resolveSendableOutboundReplyParts(payload).mediaUrls);
function resolveCurrentVerboseLevel(params) {
	if (!params.sessionKey || !params.storePath) return;
	try {
		const entry = loadSessionStore(params.storePath)[params.sessionKey];
		return normalizeVerboseLevel(String(entry?.verboseLevel ?? ""));
	} catch {
		return;
	}
}
function createVerboseGate(params, shouldEmit) {
	const fallbackVerbose = normalizeVerboseLevel(String(params.resolvedVerboseLevel ?? "")) ?? "off";
	return () => {
		return shouldEmit(resolveCurrentVerboseLevel(params) ?? fallbackVerbose);
	};
}
const createShouldEmitToolResult = (params) => {
	return createVerboseGate(params, (level) => level !== "off");
};
const createShouldEmitToolOutput = (params) => {
	return createVerboseGate(params, (level) => level === "full");
};
const finalizeWithFollowup = (value, queueKey, runFollowupTurn) => {
	scheduleFollowupDrain(queueKey, runFollowupTurn);
	return value;
};
const signalTypingIfNeeded = async (payloads, typingSignals) => {
	if (payloads.some((payload) => hasOutboundReplyContent(payload, { trimText: true }))) await typingSignals.signalRunStart();
};
//#endregion
//#region src/auto-reply/reply/memory-flush.ts
function resolveMemoryFlushContextWindowTokens(params) {
	return lookupContextTokens(params.modelId, { allowAsyncLoad: false }) ?? params.agentCfgContextTokens ?? 2e5;
}
function resolvePositiveTokenCount(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : void 0;
}
function resolveMemoryFlushGateState(params) {
	if (!params.entry) return null;
	const totalTokens = resolvePositiveTokenCount(params.tokenCount) ?? resolveFreshSessionTotalTokens(params.entry);
	if (!totalTokens || totalTokens <= 0) return null;
	const contextWindow = Math.max(1, Math.floor(params.contextWindowTokens));
	const reserveTokens = Math.max(0, Math.floor(params.reserveTokensFloor));
	const softThreshold = Math.max(0, Math.floor(params.softThresholdTokens));
	const threshold = Math.max(0, contextWindow - reserveTokens - softThreshold);
	if (threshold <= 0) return null;
	return {
		entry: params.entry,
		totalTokens,
		threshold
	};
}
function shouldRunMemoryFlush(params) {
	const state = resolveMemoryFlushGateState(params);
	if (!state || state.totalTokens < state.threshold) return false;
	if (hasAlreadyFlushedForCurrentCompaction(state.entry)) return false;
	return true;
}
function shouldRunPreflightCompaction(params) {
	const state = resolveMemoryFlushGateState(params);
	return Boolean(state && state.totalTokens >= state.threshold);
}
/**
* Returns true when a memory flush has already been performed for the current
* compaction cycle. This prevents repeated flush runs within the same cycle —
* important for both the token-based and transcript-size–based trigger paths.
*/
function hasAlreadyFlushedForCurrentCompaction(entry) {
	const compactionCount = entry.compactionCount ?? 0;
	const lastFlushAt = entry.memoryFlushCompactionCount;
	return typeof lastFlushAt === "number" && lastFlushAt === compactionCount;
}
//#endregion
//#region src/auto-reply/reply/agent-runner-memory.ts
function estimatePromptTokensForMemoryFlush(prompt) {
	const trimmed = prompt?.trim();
	if (!trimmed) return;
	const tokens = estimateMessagesTokens([{
		role: "user",
		content: trimmed,
		timestamp: Date.now()
	}]);
	if (!Number.isFinite(tokens) || tokens <= 0) return;
	return Math.ceil(tokens);
}
function resolveEffectivePromptTokens(basePromptTokens, lastOutputTokens, promptTokenEstimate) {
	const base = Math.max(0, basePromptTokens ?? 0);
	const output = Math.max(0, lastOutputTokens ?? 0);
	const estimate = Math.max(0, promptTokenEstimate ?? 0);
	return base + output + estimate;
}
const TRANSCRIPT_OUTPUT_READ_BUFFER_TOKENS = 8192;
const TRANSCRIPT_TAIL_CHUNK_BYTES = 64 * 1024;
function parseUsageFromTranscriptLine(line) {
	const trimmed = line.trim();
	if (!trimmed) return;
	try {
		const parsed = JSON.parse(trimmed);
		const usage = normalizeUsage(parsed.message?.usage ?? parsed.usage);
		if (usage && hasNonzeroUsage(usage)) return usage;
	} catch {}
}
function resolveSessionLogPath(sessionId, sessionEntry, sessionKey, opts) {
	if (!sessionId) return;
	try {
		const transcriptPath = sessionEntry?.transcriptPath?.trim();
		const sessionFile = sessionEntry?.sessionFile?.trim() || transcriptPath;
		const pathOpts = resolveSessionFilePathOptions({
			agentId: resolveAgentIdFromSessionKey(sessionKey),
			storePath: opts?.storePath
		});
		return resolveSessionFilePath(sessionId, sessionFile ? { sessionFile } : sessionEntry, pathOpts);
	} catch {
		return;
	}
}
function deriveTranscriptUsageSnapshot(usage) {
	if (!usage) return;
	const promptTokens = derivePromptTokens(usage);
	const outputRaw = usage.output;
	const outputTokens = typeof outputRaw === "number" && Number.isFinite(outputRaw) && outputRaw > 0 ? outputRaw : void 0;
	if (!(typeof promptTokens === "number") && !(typeof outputTokens === "number")) return;
	return {
		promptTokens,
		outputTokens
	};
}
async function appendPostCompactionRefreshPrompt(params) {
	const refreshPrompt = await readPostCompactionContext(params.followupRun.run.workspaceDir, params.cfg);
	if (!refreshPrompt) return;
	const existingPrompt = params.followupRun.run.extraSystemPrompt?.trim();
	if (existingPrompt?.includes(refreshPrompt)) return;
	params.followupRun.run.extraSystemPrompt = [existingPrompt, refreshPrompt].filter(Boolean).join("\n\n");
}
async function readSessionLogSnapshot(params) {
	const logPath = resolveSessionLogPath(params.sessionId, params.sessionEntry, params.sessionKey, params.opts);
	if (!logPath) return {};
	const snapshot = {};
	if (params.includeByteSize) try {
		const stat = await fs.promises.stat(logPath);
		const size = Math.floor(stat.size);
		snapshot.byteSize = Number.isFinite(size) && size >= 0 ? size : void 0;
	} catch {
		snapshot.byteSize = void 0;
	}
	if (params.includeUsage) try {
		snapshot.usage = deriveTranscriptUsageSnapshot(await readLastNonzeroUsageFromSessionLog(logPath));
	} catch {
		snapshot.usage = void 0;
	}
	return snapshot;
}
async function readLastNonzeroUsageFromSessionLog(logPath) {
	const handle = await fs.promises.open(logPath, "r");
	try {
		let position = (await handle.stat()).size;
		let leadingPartial = "";
		while (position > 0) {
			const chunkSize = Math.min(TRANSCRIPT_TAIL_CHUNK_BYTES, position);
			const start = position - chunkSize;
			const buffer = Buffer.allocUnsafe(chunkSize);
			const { bytesRead } = await handle.read(buffer, 0, chunkSize, start);
			if (bytesRead <= 0) break;
			const lines = `${buffer.toString("utf-8", 0, bytesRead)}${leadingPartial}`.split(/\n+/);
			leadingPartial = lines.shift() ?? "";
			for (let i = lines.length - 1; i >= 0; i -= 1) {
				const usage = parseUsageFromTranscriptLine(lines[i] ?? "");
				if (usage) return usage;
			}
			position = start;
		}
		return parseUsageFromTranscriptLine(leadingPartial);
	} finally {
		await handle.close();
	}
}
function estimatePromptTokensFromSessionTranscript(params) {
	const sessionId = params.sessionId?.trim();
	if (!sessionId) return;
	try {
		const messages = readSessionMessages(sessionId, params.storePath, params.sessionFile);
		if (messages.length === 0) return;
		const estimatedTokens = estimateMessagesTokens(messages);
		if (!Number.isFinite(estimatedTokens) || estimatedTokens <= 0) return;
		return Math.ceil(estimatedTokens);
	} catch {
		return;
	}
}
async function runPreflightCompactionIfNeeded(params) {
	if (!params.sessionKey) return params.sessionEntry;
	let entry = params.sessionEntry ?? (params.sessionKey ? params.sessionStore?.[params.sessionKey] : void 0);
	if (!entry?.sessionId) return entry ?? params.sessionEntry;
	if (params.isHeartbeat) return entry ?? params.sessionEntry;
	const contextWindowTokens = resolveMemoryFlushContextWindowTokens({
		modelId: params.followupRun.run.model ?? params.defaultModel,
		agentCfgContextTokens: params.agentCfgContextTokens
	});
	const memoryFlushPlan = resolveMemoryFlushPlan({ cfg: params.cfg });
	const reserveTokensFloor = memoryFlushPlan?.reserveTokensFloor ?? params.cfg.agents?.defaults?.compaction?.reserveTokensFloor ?? 2e4;
	const softThresholdTokens = memoryFlushPlan?.softThresholdTokens ?? 4e3;
	const freshPersistedTokens = resolveFreshSessionTotalTokens(entry);
	const persistedTotalTokens = entry.totalTokens;
	const hasPersistedTotalTokens = typeof persistedTotalTokens === "number" && Number.isFinite(persistedTotalTokens) && persistedTotalTokens > 0;
	if (!(entry.totalTokensFresh === false || !hasPersistedTotalTokens)) return entry ?? params.sessionEntry;
	const promptTokenEstimate = estimatePromptTokensForMemoryFlush(params.promptForEstimate ?? params.followupRun.prompt);
	const transcriptPromptTokens = typeof freshPersistedTokens === "number" ? void 0 : estimatePromptTokensFromSessionTranscript({
		sessionId: entry.sessionId,
		storePath: params.storePath,
		sessionFile: entry.sessionFile ?? params.followupRun.run.sessionFile
	});
	const projectedTokenCount = typeof transcriptPromptTokens === "number" ? resolveEffectivePromptTokens(transcriptPromptTokens, void 0, promptTokenEstimate) : void 0;
	const tokenCountForCompaction = typeof projectedTokenCount === "number" && Number.isFinite(projectedTokenCount) && projectedTokenCount > 0 ? projectedTokenCount : void 0;
	const threshold = contextWindowTokens - reserveTokensFloor - softThresholdTokens;
	logVerbose(`preflightCompaction check: sessionKey=${params.sessionKey} tokenCount=${tokenCountForCompaction ?? freshPersistedTokens ?? "undefined"} contextWindow=${contextWindowTokens} threshold=${threshold} isHeartbeat=${params.isHeartbeat} persistedFresh=${entry?.totalTokensFresh === true} transcriptPromptTokens=${transcriptPromptTokens ?? "undefined"} promptTokensEst=${promptTokenEstimate ?? "undefined"}`);
	if (!shouldRunPreflightCompaction({
		entry,
		tokenCount: tokenCountForCompaction,
		contextWindowTokens,
		reserveTokensFloor,
		softThresholdTokens
	})) return entry ?? params.sessionEntry;
	logVerbose(`preflightCompaction triggered: sessionKey=${params.sessionKey} tokenCount=${tokenCountForCompaction ?? freshPersistedTokens ?? "undefined"} threshold=${threshold}`);
	params.replyOperation.setPhase("preflight_compacting");
	const sessionFile = resolveSessionLogPath(entry.sessionId, entry.sessionFile ? entry : {
		...entry,
		sessionFile: params.followupRun.run.sessionFile
	}, params.sessionKey ?? params.followupRun.run.sessionKey, { storePath: params.storePath });
	const result = await compactEmbeddedPiSession({
		sessionId: entry.sessionId,
		sessionKey: params.sessionKey,
		allowGatewaySubagentBinding: true,
		messageChannel: params.followupRun.run.messageProvider,
		groupId: entry.groupId ?? params.followupRun.run.groupId,
		groupChannel: entry.groupChannel ?? params.followupRun.run.groupChannel,
		groupSpace: entry.space ?? params.followupRun.run.groupSpace,
		sessionFile: sessionFile ?? params.followupRun.run.sessionFile,
		workspaceDir: params.followupRun.run.workspaceDir,
		agentDir: params.followupRun.run.agentDir,
		config: params.cfg,
		skillsSnapshot: entry.skillsSnapshot ?? params.followupRun.run.skillsSnapshot,
		provider: params.followupRun.run.provider,
		model: params.followupRun.run.model,
		thinkLevel: params.followupRun.run.thinkLevel,
		bashElevated: params.followupRun.run.bashElevated,
		trigger: "budget",
		currentTokenCount: tokenCountForCompaction,
		senderIsOwner: params.followupRun.run.senderIsOwner,
		ownerNumbers: params.followupRun.run.ownerNumbers,
		abortSignal: params.replyOperation.abortSignal
	});
	if (!result?.ok || !result.compacted) {
		logVerbose(`preflightCompaction skipped: sessionKey=${params.sessionKey} reason=${result?.reason ?? "not_compacted"}`);
		return entry ?? params.sessionEntry;
	}
	await incrementCompactionCount({
		cfg: params.cfg,
		sessionEntry: entry,
		sessionStore: params.sessionStore,
		sessionKey: params.sessionKey,
		storePath: params.storePath,
		tokensAfter: result.result?.tokensAfter
	});
	await appendPostCompactionRefreshPrompt({
		cfg: params.cfg,
		followupRun: params.followupRun
	});
	entry = params.sessionStore?.[params.sessionKey] ?? entry;
	return entry ?? params.sessionEntry;
}
async function runMemoryFlushIfNeeded(params) {
	const memoryFlushPlan = resolveMemoryFlushPlan({ cfg: params.cfg });
	if (!memoryFlushPlan) return params.sessionEntry;
	const memoryFlushWritable = (() => {
		if (!params.sessionKey) return true;
		const runtime = resolveSandboxRuntimeStatus({
			cfg: params.cfg,
			sessionKey: params.sessionKey
		});
		if (!runtime.sandboxed) return true;
		return resolveSandboxConfigForAgent(params.cfg, runtime.agentId).workspaceAccess === "rw";
	})();
	const canAttemptFlush = memoryFlushWritable && !params.isHeartbeat;
	let entry = params.sessionEntry ?? (params.sessionKey ? params.sessionStore?.[params.sessionKey] : void 0);
	const contextWindowTokens = resolveMemoryFlushContextWindowTokens({
		modelId: params.followupRun.run.model ?? params.defaultModel,
		agentCfgContextTokens: params.agentCfgContextTokens
	});
	const promptTokenEstimate = estimatePromptTokensForMemoryFlush(params.promptForEstimate ?? params.followupRun.prompt);
	const persistedPromptTokensRaw = entry?.totalTokens;
	const persistedPromptTokens = typeof persistedPromptTokensRaw === "number" && Number.isFinite(persistedPromptTokensRaw) && persistedPromptTokensRaw > 0 ? persistedPromptTokensRaw : void 0;
	const hasFreshPersistedPromptTokens = typeof persistedPromptTokens === "number" && entry?.totalTokensFresh === true;
	const flushThreshold = contextWindowTokens - memoryFlushPlan.reserveTokensFloor - memoryFlushPlan.softThresholdTokens;
	const shouldReadTranscriptForOutput = canAttemptFlush && entry && hasFreshPersistedPromptTokens && typeof promptTokenEstimate === "number" && Number.isFinite(promptTokenEstimate) && flushThreshold > 0 && (persistedPromptTokens ?? 0) + promptTokenEstimate >= flushThreshold - TRANSCRIPT_OUTPUT_READ_BUFFER_TOKENS;
	const shouldReadTranscript = Boolean(canAttemptFlush && entry && (!hasFreshPersistedPromptTokens || shouldReadTranscriptForOutput));
	const forceFlushTranscriptBytes = memoryFlushPlan.forceFlushTranscriptBytes;
	const shouldCheckTranscriptSizeForForcedFlush = Boolean(canAttemptFlush && entry && Number.isFinite(forceFlushTranscriptBytes) && forceFlushTranscriptBytes > 0);
	const sessionLogSnapshot = shouldReadTranscript || shouldCheckTranscriptSizeForForcedFlush ? await readSessionLogSnapshot({
		sessionId: params.followupRun.run.sessionId,
		sessionEntry: entry,
		sessionKey: params.sessionKey ?? params.followupRun.run.sessionKey,
		opts: { storePath: params.storePath },
		includeByteSize: shouldCheckTranscriptSizeForForcedFlush,
		includeUsage: shouldReadTranscript
	}) : void 0;
	const transcriptByteSize = sessionLogSnapshot?.byteSize;
	const shouldForceFlushByTranscriptSize = typeof transcriptByteSize === "number" && transcriptByteSize >= forceFlushTranscriptBytes;
	const transcriptUsageSnapshot = sessionLogSnapshot?.usage;
	const transcriptPromptTokens = transcriptUsageSnapshot?.promptTokens;
	const transcriptOutputTokens = transcriptUsageSnapshot?.outputTokens;
	const hasReliableTranscriptPromptTokens = typeof transcriptPromptTokens === "number" && Number.isFinite(transcriptPromptTokens) && transcriptPromptTokens > 0;
	if (entry && hasReliableTranscriptPromptTokens && (!hasFreshPersistedPromptTokens || (transcriptPromptTokens ?? 0) > (persistedPromptTokens ?? 0))) {
		const nextEntry = {
			...entry,
			totalTokens: transcriptPromptTokens,
			totalTokensFresh: true
		};
		entry = nextEntry;
		if (params.sessionKey && params.sessionStore) params.sessionStore[params.sessionKey] = nextEntry;
		if (params.storePath && params.sessionKey) try {
			const updatedEntry = await updateSessionStoreEntry({
				storePath: params.storePath,
				sessionKey: params.sessionKey,
				update: async () => ({
					totalTokens: transcriptPromptTokens,
					totalTokensFresh: true
				})
			});
			if (updatedEntry) {
				entry = updatedEntry;
				if (params.sessionStore) params.sessionStore[params.sessionKey] = updatedEntry;
			}
		} catch (err) {
			logVerbose(`failed to persist derived prompt totalTokens: ${String(err)}`);
		}
	}
	const promptTokensSnapshot = Math.max(hasFreshPersistedPromptTokens ? persistedPromptTokens ?? 0 : 0, hasReliableTranscriptPromptTokens ? transcriptPromptTokens ?? 0 : 0);
	const projectedTokenCount = promptTokensSnapshot > 0 && (hasFreshPersistedPromptTokens || hasReliableTranscriptPromptTokens) ? resolveEffectivePromptTokens(promptTokensSnapshot, transcriptOutputTokens, promptTokenEstimate) : void 0;
	const tokenCountForFlush = typeof projectedTokenCount === "number" && Number.isFinite(projectedTokenCount) && projectedTokenCount > 0 ? projectedTokenCount : void 0;
	logVerbose(`memoryFlush check: sessionKey=${params.sessionKey} tokenCount=${tokenCountForFlush ?? "undefined"} contextWindow=${contextWindowTokens} threshold=${flushThreshold} isHeartbeat=${params.isHeartbeat} memoryFlushWritable=${memoryFlushWritable} compactionCount=${entry?.compactionCount ?? 0} memoryFlushCompactionCount=${entry?.memoryFlushCompactionCount ?? "undefined"} persistedPromptTokens=${persistedPromptTokens ?? "undefined"} persistedFresh=${entry?.totalTokensFresh === true} promptTokensEst=${promptTokenEstimate ?? "undefined"} transcriptPromptTokens=${transcriptPromptTokens ?? "undefined"} transcriptOutputTokens=${transcriptOutputTokens ?? "undefined"} projectedTokenCount=${projectedTokenCount ?? "undefined"} transcriptBytes=${transcriptByteSize ?? "undefined"} forceFlushTranscriptBytes=${forceFlushTranscriptBytes} forceFlushByTranscriptSize=${shouldForceFlushByTranscriptSize}`);
	if (!(memoryFlushWritable && !params.isHeartbeat && shouldRunMemoryFlush({
		entry,
		tokenCount: tokenCountForFlush,
		contextWindowTokens,
		reserveTokensFloor: memoryFlushPlan.reserveTokensFloor,
		softThresholdTokens: memoryFlushPlan.softThresholdTokens
	}) || shouldForceFlushByTranscriptSize && entry != null && !hasAlreadyFlushedForCurrentCompaction(entry))) return entry ?? params.sessionEntry;
	logVerbose(`memoryFlush triggered: sessionKey=${params.sessionKey} tokenCount=${tokenCountForFlush ?? "undefined"} threshold=${flushThreshold}`);
	params.replyOperation.setPhase("memory_flushing");
	let activeSessionEntry = entry ?? params.sessionEntry;
	const activeSessionStore = params.sessionStore;
	let bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(activeSessionEntry?.systemPromptReport ?? (params.sessionKey ? activeSessionStore?.[params.sessionKey]?.systemPromptReport : void 0));
	const flushRunId = crypto.randomUUID();
	if (params.sessionKey) registerAgentRunContext(flushRunId, {
		sessionKey: params.sessionKey,
		verboseLevel: params.resolvedVerboseLevel
	});
	let memoryCompactionCompleted = false;
	const memoryFlushNowMs = Date.now();
	const activeMemoryFlushPlan = resolveMemoryFlushPlan({
		cfg: params.cfg,
		nowMs: memoryFlushNowMs
	}) ?? memoryFlushPlan;
	const memoryFlushWritePath = activeMemoryFlushPlan.relativePath;
	const flushSystemPrompt = [params.followupRun.run.extraSystemPrompt, activeMemoryFlushPlan.systemPrompt].filter(Boolean).join("\n\n");
	let postCompactionSessionId;
	try {
		await runWithModelFallback({
			...resolveModelFallbackOptions(params.followupRun.run),
			runId: flushRunId,
			run: async (provider, model, runOptions) => {
				const { embeddedContext, senderContext, runBaseParams } = buildEmbeddedRunExecutionParams({
					run: params.followupRun.run,
					sessionCtx: params.sessionCtx,
					hasRepliedRef: params.opts?.hasRepliedRef,
					provider,
					model,
					runId: flushRunId,
					allowTransientCooldownProbe: runOptions?.allowTransientCooldownProbe
				});
				const result = await runEmbeddedPiAgent({
					...embeddedContext,
					...senderContext,
					...runBaseParams,
					allowGatewaySubagentBinding: true,
					silentExpected: true,
					trigger: "memory",
					memoryFlushWritePath,
					prompt: activeMemoryFlushPlan.prompt,
					extraSystemPrompt: flushSystemPrompt,
					bootstrapPromptWarningSignaturesSeen,
					bootstrapPromptWarningSignature: bootstrapPromptWarningSignaturesSeen[bootstrapPromptWarningSignaturesSeen.length - 1],
					abortSignal: params.replyOperation.abortSignal,
					replyOperation: params.replyOperation,
					onAgentEvent: (evt) => {
						if (evt.stream === "compaction") {
							if ((typeof evt.data.phase === "string" ? evt.data.phase : "") === "end") memoryCompactionCompleted = true;
						}
					}
				});
				if (result.meta?.agentMeta?.sessionId) postCompactionSessionId = result.meta.agentMeta.sessionId;
				bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(result.meta?.systemPromptReport);
				return result;
			}
		});
		let memoryFlushCompactionCount = activeSessionEntry?.compactionCount ?? (params.sessionKey ? activeSessionStore?.[params.sessionKey]?.compactionCount : 0) ?? 0;
		if (memoryCompactionCompleted) {
			const previousSessionId = activeSessionEntry?.sessionId ?? params.followupRun.run.sessionId;
			const nextCount = await incrementCompactionCount({
				cfg: params.cfg,
				sessionEntry: activeSessionEntry,
				sessionStore: activeSessionStore,
				sessionKey: params.sessionKey,
				storePath: params.storePath,
				newSessionId: postCompactionSessionId
			});
			const updatedEntry = params.sessionKey ? activeSessionStore?.[params.sessionKey] : void 0;
			if (updatedEntry) {
				activeSessionEntry = updatedEntry;
				params.followupRun.run.sessionId = updatedEntry.sessionId;
				params.replyOperation.updateSessionId(updatedEntry.sessionId);
				if (updatedEntry.sessionFile) params.followupRun.run.sessionFile = updatedEntry.sessionFile;
				const queueKey = params.followupRun.run.sessionKey ?? params.sessionKey;
				if (queueKey) refreshQueuedFollowupSession({
					key: queueKey,
					previousSessionId,
					nextSessionId: updatedEntry.sessionId,
					nextSessionFile: updatedEntry.sessionFile
				});
			}
			if (typeof nextCount === "number") memoryFlushCompactionCount = nextCount;
		}
		if (params.storePath && params.sessionKey) try {
			const updatedEntry = await updateSessionStoreEntry({
				storePath: params.storePath,
				sessionKey: params.sessionKey,
				update: async () => ({
					memoryFlushAt: Date.now(),
					memoryFlushCompactionCount
				})
			});
			if (updatedEntry) {
				activeSessionEntry = updatedEntry;
				params.followupRun.run.sessionId = updatedEntry.sessionId;
				params.replyOperation.updateSessionId(updatedEntry.sessionId);
				if (updatedEntry.sessionFile) params.followupRun.run.sessionFile = updatedEntry.sessionFile;
			}
		} catch (err) {
			logVerbose(`failed to persist memory flush metadata: ${String(err)}`);
		}
	} catch (err) {
		logVerbose(`memory flush run failed: ${String(err)}`);
	}
	return activeSessionEntry;
}
//#endregion
//#region src/auto-reply/reply/agent-runner-payloads.ts
let replyPayloadsDedupeRuntimePromise = null;
function loadReplyPayloadsDedupeRuntime() {
	replyPayloadsDedupeRuntimePromise ??= import("./reply-payloads-dedupe.runtime-CBlUwaqr.js");
	return replyPayloadsDedupeRuntimePromise;
}
async function normalizeReplyPayloadMedia(params) {
	if (!params.normalizeMediaPaths || !resolveSendableOutboundReplyParts(params.payload).hasMedia) return params.payload;
	try {
		return await params.normalizeMediaPaths(params.payload);
	} catch (err) {
		logVerbose(`reply payload media normalization failed: ${String(err)}`);
		return {
			...params.payload,
			mediaUrl: void 0,
			mediaUrls: void 0,
			audioAsVoice: false
		};
	}
}
async function normalizeSentMediaUrlsForDedupe(params) {
	if (params.sentMediaUrls.length === 0 || !params.normalizeMediaPaths) return params.sentMediaUrls;
	const normalizedUrls = [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of params.sentMediaUrls) {
		const trimmed = raw.trim();
		if (!trimmed) continue;
		if (!seen.has(trimmed)) {
			seen.add(trimmed);
			normalizedUrls.push(trimmed);
		}
		try {
			const normalizedMediaUrls = resolveSendableOutboundReplyParts(await params.normalizeMediaPaths({
				mediaUrl: trimmed,
				mediaUrls: [trimmed]
			})).mediaUrls;
			for (const mediaUrl of normalizedMediaUrls) {
				const candidate = mediaUrl.trim();
				if (!candidate || seen.has(candidate)) continue;
				seen.add(candidate);
				normalizedUrls.push(candidate);
			}
		} catch (err) {
			logVerbose(`messaging tool sent-media normalization failed: ${String(err)}`);
		}
	}
	return normalizedUrls;
}
async function buildReplyPayloads(params) {
	let didLogHeartbeatStrip = params.didLogHeartbeatStrip;
	const sanitizedPayloads = params.isHeartbeat ? params.payloads : params.payloads.flatMap((payload) => {
		let text = payload.text;
		if (payload.isError && text && isBunFetchSocketError(text)) text = formatBunFetchSocketError(text);
		if (!text || !text.includes("HEARTBEAT_OK")) return [{
			...payload,
			text
		}];
		const stripped = stripHeartbeatToken(text, { mode: "message" });
		if (stripped.didStrip && !didLogHeartbeatStrip) {
			didLogHeartbeatStrip = true;
			logVerbose("Stripped stray HEARTBEAT_OK token from reply");
		}
		const hasMedia = resolveSendableOutboundReplyParts(payload).hasMedia;
		if (stripped.shouldSkip && !hasMedia) return [];
		return [{
			...payload,
			text: stripped.text
		}];
	});
	const replyTaggedPayloads = (await Promise.all(applyReplyThreading({
		payloads: sanitizedPayloads,
		replyToMode: params.replyToMode,
		replyToChannel: params.replyToChannel,
		currentMessageId: params.currentMessageId,
		replyThreading: params.replyThreading
	}).map(async (payload) => {
		const parsed = normalizeReplyPayloadDirectives({
			payload,
			currentMessageId: params.currentMessageId,
			silentToken: SILENT_REPLY_TOKEN,
			parseMode: "always"
		}).payload;
		return await normalizeReplyPayloadMedia({
			payload: parsed,
			normalizeMediaPaths: params.normalizeMediaPaths
		});
	}))).filter(isRenderablePayload);
	const silentFilteredPayloads = params.silentExpected ? [] : replyTaggedPayloads;
	const shouldDropFinalPayloads = params.blockStreamingEnabled && Boolean(params.blockReplyPipeline?.didStream()) && !params.blockReplyPipeline?.isAborted();
	const messagingToolSentTexts = params.messagingToolSentTexts ?? [];
	const messagingToolSentTargets = params.messagingToolSentTargets ?? [];
	const dedupeRuntime = messagingToolSentTexts.length > 0 || (params.messagingToolSentMediaUrls?.length ?? 0) > 0 || messagingToolSentTargets.length > 0 ? await loadReplyPayloadsDedupeRuntime() : null;
	const suppressMessagingToolReplies = dedupeRuntime?.shouldSuppressMessagingToolReplies({
		messageProvider: resolveOriginMessageProvider({
			originatingChannel: params.originatingChannel,
			provider: params.messageProvider
		}),
		messagingToolSentTargets,
		originatingTo: resolveOriginMessageTo({ originatingTo: params.originatingTo }),
		accountId: resolveOriginAccountId({ originatingAccountId: params.accountId })
	}) ?? false;
	const dedupeMessagingToolPayloads = suppressMessagingToolReplies || messagingToolSentTargets.length === 0;
	const messagingToolSentMediaUrls = dedupeMessagingToolPayloads ? await normalizeSentMediaUrlsForDedupe({
		sentMediaUrls: params.messagingToolSentMediaUrls ?? [],
		normalizeMediaPaths: params.normalizeMediaPaths
	}) : params.messagingToolSentMediaUrls ?? [];
	const dedupedPayloads = dedupeMessagingToolPayloads ? (dedupeRuntime ?? await loadReplyPayloadsDedupeRuntime()).filterMessagingToolDuplicates({
		payloads: silentFilteredPayloads,
		sentTexts: messagingToolSentTexts
	}) : silentFilteredPayloads;
	const mediaFilteredPayloads = dedupeMessagingToolPayloads ? (dedupeRuntime ?? await loadReplyPayloadsDedupeRuntime()).filterMessagingToolMediaDuplicates({
		payloads: dedupedPayloads,
		sentMediaUrls: messagingToolSentMediaUrls
	}) : dedupedPayloads;
	const filteredPayloads = shouldDropFinalPayloads ? [] : params.blockStreamingEnabled ? mediaFilteredPayloads.filter((payload) => !params.blockReplyPipeline?.hasSentPayload(payload)) : params.directlySentBlockKeys?.size ? mediaFilteredPayloads.filter((payload) => !params.directlySentBlockKeys.has(createBlockReplyContentKey(payload))) : mediaFilteredPayloads;
	return {
		replyPayloads: suppressMessagingToolReplies ? [] : filteredPayloads,
		didLogHeartbeatStrip
	};
}
//#endregion
//#region src/auto-reply/reply/agent-runner-reminder-guard.ts
const UNSCHEDULED_REMINDER_NOTE = "Note: I did not schedule a reminder in this turn, so this will not trigger automatically.";
const REMINDER_COMMITMENT_PATTERNS = [/\b(?:i\s*['’]?ll|i will)\s+(?:make sure to\s+)?(?:remember|remind|ping|follow up|follow-up|check back|circle back)\b/i, /\b(?:i\s*['’]?ll|i will)\s+(?:set|create|schedule)\s+(?:a\s+)?reminder\b/i];
function hasUnbackedReminderCommitment(text) {
	const normalized = text.toLowerCase();
	if (!normalized.trim()) return false;
	if (normalized.includes("Note: I did not schedule a reminder in this turn, so this will not trigger automatically.".toLowerCase())) return false;
	return REMINDER_COMMITMENT_PATTERNS.some((pattern) => pattern.test(text));
}
/**
* Returns true when the cron store has at least one enabled job that shares the
* current session key. Used to suppress the "no reminder scheduled" guard note
* when an existing cron (created in a prior turn) already covers the commitment.
*/
async function hasSessionRelatedCronJobs(params) {
	try {
		const store = await loadCronStore(resolveCronStorePath(params.cronStorePath));
		if (store.jobs.length === 0) return false;
		if (params.sessionKey) return store.jobs.some((job) => job.enabled && job.sessionKey === params.sessionKey);
		return false;
	} catch {
		return false;
	}
}
function appendUnscheduledReminderNote(payloads) {
	let appended = false;
	return payloads.map((payload) => {
		if (appended || payload.isError || typeof payload.text !== "string") return payload;
		if (!hasUnbackedReminderCommitment(payload.text)) return payload;
		appended = true;
		const trimmed = payload.text.trimEnd();
		return {
			...payload,
			text: `${trimmed}\n\n${UNSCHEDULED_REMINDER_NOTE}`
		};
	});
}
//#endregion
//#region src/auto-reply/reply/agent-runner-usage-line.ts
const formatResponseUsageLine = (params) => {
	const usage = params.usage;
	if (!usage) return null;
	const input = usage.input;
	const output = usage.output;
	if (typeof input !== "number" && typeof output !== "number") return null;
	const inputLabel = typeof input === "number" ? formatTokenCount(input) : "?";
	const outputLabel = typeof output === "number" ? formatTokenCount(output) : "?";
	const cost = params.showCost && typeof input === "number" && typeof output === "number" ? estimateUsageCost({
		usage: {
			input,
			output,
			cacheRead: usage.cacheRead,
			cacheWrite: usage.cacheWrite
		},
		cost: params.costConfig
	}) : void 0;
	const costLabel = params.showCost ? formatUsd(cost) : void 0;
	return `Usage: ${inputLabel} in / ${outputLabel} out${costLabel ? ` · est ${costLabel}` : ""}`;
};
const appendUsageLine = (payloads, line) => {
	let index = -1;
	for (let i = payloads.length - 1; i >= 0; i -= 1) if (payloads[i]?.text) {
		index = i;
		break;
	}
	if (index === -1) return [...payloads, { text: line }];
	const existing = payloads[index];
	const existingText = existing.text ?? "";
	const separator = existingText.endsWith("\n") ? "" : "\n";
	const next = {
		...existing,
		text: `${existingText}${separator}${line}`
	};
	const updated = payloads.slice();
	updated[index] = next;
	return updated;
};
//#endregion
//#region src/auto-reply/reply/session-usage.ts
function resolveNonNegativeNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function estimateSessionRunCostUsd(params) {
	if (!hasNonzeroUsage(params.usage)) return;
	const cost = resolveModelCostConfig({
		provider: params.providerUsed,
		model: params.modelUsed,
		config: params.cfg
	});
	return resolveNonNegativeNumber(estimateUsageCost({
		usage: params.usage,
		cost
	}));
}
async function persistSessionUsageUpdate(params) {
	const { storePath, sessionKey } = params;
	if (!storePath || !sessionKey) return;
	const label = params.logLabel ? `${params.logLabel} ` : "";
	const cfg = params.cfg ?? loadConfig();
	const hasUsage = hasNonzeroUsage(params.usage);
	const hasPromptTokens = typeof params.promptTokens === "number" && Number.isFinite(params.promptTokens) && params.promptTokens > 0;
	const hasFreshContextSnapshot = Boolean(params.lastCallUsage) || hasPromptTokens || params.usageIsContextSnapshot === true;
	if (hasUsage || hasFreshContextSnapshot) {
		try {
			await updateSessionStoreEntry({
				storePath,
				sessionKey,
				update: async (entry) => {
					const resolvedContextTokens = params.contextTokensUsed ?? entry.contextTokens;
					const usageForContext = params.lastCallUsage ?? (params.usageIsContextSnapshot === true ? params.usage : void 0);
					const totalTokens = hasFreshContextSnapshot ? deriveSessionTotalTokens({
						usage: usageForContext,
						contextTokens: resolvedContextTokens,
						promptTokens: params.promptTokens
					}) : void 0;
					const runEstimatedCostUsd = estimateSessionRunCostUsd({
						cfg,
						usage: params.usage,
						providerUsed: params.providerUsed ?? entry.modelProvider,
						modelUsed: params.modelUsed ?? entry.model
					});
					const existingEstimatedCostUsd = resolveNonNegativeNumber(entry.estimatedCostUsd) ?? 0;
					const patch = {
						modelProvider: params.providerUsed ?? entry.modelProvider,
						model: params.modelUsed ?? entry.model,
						contextTokens: resolvedContextTokens,
						systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
						updatedAt: Date.now()
					};
					if (hasUsage) {
						patch.inputTokens = params.usage?.input ?? 0;
						patch.outputTokens = params.usage?.output ?? 0;
						const cacheUsage = params.lastCallUsage ?? params.usage;
						patch.cacheRead = cacheUsage?.cacheRead ?? 0;
						patch.cacheWrite = cacheUsage?.cacheWrite ?? 0;
					}
					if (runEstimatedCostUsd !== void 0) patch.estimatedCostUsd = existingEstimatedCostUsd + runEstimatedCostUsd;
					else if (entry.estimatedCostUsd !== void 0) patch.estimatedCostUsd = entry.estimatedCostUsd;
					patch.totalTokens = totalTokens;
					patch.totalTokensFresh = typeof totalTokens === "number";
					return patch;
				}
			});
		} catch (err) {
			logVerbose(`failed to persist ${label}usage update: ${String(err)}`);
		}
		return;
	}
	if (params.modelUsed || params.contextTokensUsed) try {
		await updateSessionStoreEntry({
			storePath,
			sessionKey,
			update: async (entry) => {
				return {
					modelProvider: params.providerUsed ?? entry.modelProvider,
					model: params.modelUsed ?? entry.model,
					contextTokens: params.contextTokensUsed ?? entry.contextTokens,
					systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
					updatedAt: Date.now()
				};
			}
		});
	} catch (err) {
		logVerbose(`failed to persist ${label}model/context update: ${String(err)}`);
	}
}
//#endregion
//#region src/auto-reply/reply/session-run-accounting.ts
async function persistRunSessionUsage(params) {
	await persistSessionUsageUpdate(params);
}
async function incrementRunCompactionCount(params) {
	const tokensAfterCompaction = params.lastCallUsage ? deriveSessionTotalTokens({
		usage: params.lastCallUsage,
		contextTokens: params.contextTokensUsed
	}) : void 0;
	return incrementCompactionCount({
		sessionEntry: params.sessionEntry,
		sessionStore: params.sessionStore,
		sessionKey: params.sessionKey,
		storePath: params.storePath,
		cfg: params.cfg,
		amount: params.amount,
		tokensAfter: tokensAfterCompaction,
		newSessionId: params.newSessionId
	});
}
//#endregion
//#region src/auto-reply/reply/followup-runner.ts
function createFollowupRunner(params) {
	const { opts, typing, typingMode, sessionEntry, sessionStore, sessionKey, storePath, defaultModel, agentCfgContextTokens } = params;
	const typingSignals = createTypingSignaler({
		typing,
		mode: typingMode,
		isHeartbeat: opts?.isHeartbeat === true
	});
	/**
	* Sends followup payloads, routing to the originating channel if set.
	*
	* When originatingChannel/originatingTo are set on the queued run,
	* replies are routed directly to that provider instead of using the
	* session's current dispatcher. This ensures replies go back to
	* where the message originated.
	*/
	const sendFollowupPayloads = async (payloads, queued) => {
		const { originatingChannel, originatingTo } = queued;
		const shouldRouteToOriginating = isRoutableChannel(originatingChannel) && originatingTo;
		if (!shouldRouteToOriginating && !opts?.onBlockReply) {
			logVerbose("followup queue: no onBlockReply handler; dropping payloads");
			return;
		}
		for (const payload of payloads) {
			if (!payload || !hasOutboundReplyContent(payload)) continue;
			if (isSilentReplyText(payload.text, "NO_REPLY") && !resolveSendableOutboundReplyParts(payload).hasMedia) continue;
			await typingSignals.signalTextDelta(payload.text);
			if (shouldRouteToOriginating) {
				const result = await routeReply({
					payload,
					channel: originatingChannel,
					to: originatingTo,
					sessionKey: queued.run.sessionKey,
					accountId: queued.originatingAccountId,
					threadId: queued.originatingThreadId,
					cfg: queued.run.config
				});
				if (!result.ok) {
					logVerbose(`followup queue: route-reply failed: ${result.error ?? "unknown error"}`);
					const provider = resolveOriginMessageProvider({ provider: queued.run.messageProvider });
					const origin = resolveOriginMessageProvider({ originatingChannel });
					if (opts?.onBlockReply && origin && origin === provider) await opts.onBlockReply(payload);
				}
			} else if (opts?.onBlockReply) await opts.onBlockReply(payload);
		}
	};
	return async (queued) => {
		const replySessionKey = queued.run.sessionKey ?? sessionKey;
		const replyOperation = createReplyOperation({
			sessionId: queued.run.sessionId,
			sessionKey: replySessionKey ?? "",
			resetTriggered: false,
			upstreamAbortSignal: opts?.abortSignal
		});
		try {
			const runId = crypto.randomUUID();
			const shouldSurfaceToControlUi = isInternalMessageChannel(resolveOriginMessageProvider({
				originatingChannel: queued.originatingChannel,
				provider: queued.run.messageProvider
			}));
			if (queued.run.sessionKey) registerAgentRunContext(runId, {
				sessionKey: queued.run.sessionKey,
				verboseLevel: queued.run.verboseLevel,
				isControlUiVisible: shouldSurfaceToControlUi
			});
			let autoCompactionCount = 0;
			let runResult;
			let fallbackProvider = queued.run.provider;
			let fallbackModel = queued.run.model;
			let activeSessionEntry = (sessionKey ? sessionStore?.[sessionKey] : void 0) ?? sessionEntry;
			activeSessionEntry = await runPreflightCompactionIfNeeded({
				cfg: queued.run.config,
				followupRun: queued,
				promptForEstimate: queued.prompt,
				defaultModel,
				agentCfgContextTokens,
				sessionEntry: activeSessionEntry,
				sessionStore,
				sessionKey,
				storePath,
				isHeartbeat: opts?.isHeartbeat === true,
				replyOperation
			});
			let bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(activeSessionEntry?.systemPromptReport);
			replyOperation.setPhase("running");
			try {
				const fallbackResult = await runWithModelFallback({
					cfg: queued.run.config,
					provider: queued.run.provider,
					model: queued.run.model,
					runId,
					agentDir: queued.run.agentDir,
					fallbacksOverride: resolveRunModelFallbacksOverride({
						cfg: queued.run.config,
						agentId: queued.run.agentId,
						sessionKey: queued.run.sessionKey
					}),
					run: async (provider, model, runOptions) => {
						const authProfile = resolveRunAuthProfile(queued.run, provider);
						let attemptCompactionCount = 0;
						try {
							const result = await runEmbeddedPiAgent({
								allowGatewaySubagentBinding: true,
								replyOperation,
								sessionId: queued.run.sessionId,
								sessionKey: queued.run.sessionKey,
								agentId: queued.run.agentId,
								trigger: "user",
								messageChannel: queued.originatingChannel ?? void 0,
								messageProvider: queued.run.messageProvider,
								agentAccountId: queued.run.agentAccountId,
								messageTo: queued.originatingTo,
								messageThreadId: queued.originatingThreadId,
								currentChannelId: queued.originatingTo,
								currentThreadTs: queued.originatingThreadId != null ? String(queued.originatingThreadId) : void 0,
								groupId: queued.run.groupId,
								groupChannel: queued.run.groupChannel,
								groupSpace: queued.run.groupSpace,
								senderId: queued.run.senderId,
								senderName: queued.run.senderName,
								senderUsername: queued.run.senderUsername,
								senderE164: queued.run.senderE164,
								senderIsOwner: queued.run.senderIsOwner,
								sessionFile: queued.run.sessionFile,
								agentDir: queued.run.agentDir,
								workspaceDir: queued.run.workspaceDir,
								config: queued.run.config,
								skillsSnapshot: queued.run.skillsSnapshot,
								prompt: queued.prompt,
								extraSystemPrompt: queued.run.extraSystemPrompt,
								ownerNumbers: queued.run.ownerNumbers,
								enforceFinalTag: queued.run.enforceFinalTag,
								provider,
								model,
								...authProfile,
								thinkLevel: queued.run.thinkLevel,
								verboseLevel: queued.run.verboseLevel,
								reasoningLevel: queued.run.reasoningLevel,
								suppressToolErrorWarnings: opts?.suppressToolErrorWarnings,
								execOverrides: queued.run.execOverrides,
								bashElevated: queued.run.bashElevated,
								timeoutMs: queued.run.timeoutMs,
								runId,
								allowTransientCooldownProbe: runOptions?.allowTransientCooldownProbe,
								blockReplyBreak: queued.run.blockReplyBreak,
								bootstrapPromptWarningSignaturesSeen,
								bootstrapPromptWarningSignature: bootstrapPromptWarningSignaturesSeen[bootstrapPromptWarningSignaturesSeen.length - 1],
								onAgentEvent: (evt) => {
									if (evt.stream !== "compaction") return;
									const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
									const completed = evt.data?.completed === true;
									if (phase === "end" && completed) attemptCompactionCount += 1;
								}
							});
							bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(result.meta?.systemPromptReport);
							const resultCompactionCount = Math.max(0, result.meta?.agentMeta?.compactionCount ?? 0);
							attemptCompactionCount = Math.max(attemptCompactionCount, resultCompactionCount);
							return result;
						} finally {
							autoCompactionCount += attemptCompactionCount;
						}
					}
				});
				runResult = fallbackResult.result;
				fallbackProvider = fallbackResult.provider;
				fallbackModel = fallbackResult.model;
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				replyOperation.fail("run_failed", err);
				defaultRuntime.error?.(`Followup agent failed before reply: ${message}`);
				return;
			}
			const usage = runResult.meta?.agentMeta?.usage;
			const promptTokens = runResult.meta?.agentMeta?.promptTokens;
			const modelUsed = runResult.meta?.agentMeta?.model ?? fallbackModel ?? defaultModel;
			const contextTokensUsed = agentCfgContextTokens ?? lookupContextTokens(modelUsed) ?? sessionEntry?.contextTokens ?? 2e5;
			if (storePath && sessionKey) await persistRunSessionUsage({
				storePath,
				sessionKey,
				cfg: queued.run.config,
				usage,
				lastCallUsage: runResult.meta?.agentMeta?.lastCallUsage,
				promptTokens,
				modelUsed,
				providerUsed: fallbackProvider,
				contextTokensUsed,
				systemPromptReport: runResult.meta?.systemPromptReport,
				usageIsContextSnapshot: false,
				logLabel: "followup"
			});
			const payloadArray = runResult.payloads ?? [];
			if (payloadArray.length === 0) return;
			const sanitizedPayloads = payloadArray.flatMap((payload) => {
				const text = payload.text;
				if (!text || !text.includes("HEARTBEAT_OK")) return [payload];
				const stripped = stripHeartbeatToken(text, { mode: "message" });
				const hasMedia = resolveSendableOutboundReplyParts(payload).hasMedia;
				if (stripped.shouldSkip && !hasMedia) return [];
				return [{
					...payload,
					text: stripped.text
				}];
			});
			const replyToChannel = resolveOriginMessageProvider({
				originatingChannel: queued.originatingChannel,
				provider: queued.run.messageProvider
			});
			const mediaFilteredPayloads = filterMessagingToolMediaDuplicates({
				payloads: filterMessagingToolDuplicates({
					payloads: applyReplyThreading({
						payloads: sanitizedPayloads,
						replyToMode: resolveReplyToMode(queued.run.config, replyToChannel, queued.originatingAccountId, queued.originatingChatType),
						replyToChannel
					}),
					sentTexts: runResult.messagingToolSentTexts ?? []
				}),
				sentMediaUrls: runResult.messagingToolSentMediaUrls ?? []
			});
			const finalPayloads = shouldSuppressMessagingToolReplies({
				messageProvider: resolveOriginMessageProvider({
					originatingChannel: queued.originatingChannel,
					provider: queued.run.messageProvider
				}),
				messagingToolSentTargets: runResult.messagingToolSentTargets,
				originatingTo: resolveOriginMessageTo({ originatingTo: queued.originatingTo }),
				accountId: resolveOriginAccountId({
					originatingAccountId: queued.originatingAccountId,
					accountId: queued.run.agentAccountId
				})
			}) ? [] : mediaFilteredPayloads;
			if (finalPayloads.length === 0) return;
			if (autoCompactionCount > 0) {
				const previousSessionId = queued.run.sessionId;
				const count = await incrementRunCompactionCount({
					cfg: queued.run.config,
					sessionEntry,
					sessionStore,
					sessionKey,
					storePath,
					amount: autoCompactionCount,
					lastCallUsage: runResult.meta?.agentMeta?.lastCallUsage,
					contextTokensUsed,
					newSessionId: runResult.meta?.agentMeta?.sessionId
				});
				const refreshedSessionEntry = sessionKey && sessionStore ? sessionStore[sessionKey] : void 0;
				if (refreshedSessionEntry) {
					const queueKey = queued.run.sessionKey ?? sessionKey;
					if (queueKey) refreshQueuedFollowupSession({
						key: queueKey,
						previousSessionId,
						nextSessionId: refreshedSessionEntry.sessionId,
						nextSessionFile: refreshedSessionEntry.sessionFile
					});
				}
				if (queued.run.verboseLevel && queued.run.verboseLevel !== "off") {
					const suffix = typeof count === "number" ? ` (count ${count})` : "";
					finalPayloads.unshift({ text: `🧹 Auto-compaction complete${suffix}.` });
				}
			}
			await sendFollowupPayloads(finalPayloads, queued);
		} finally {
			replyOperation.complete();
			typing.markRunComplete();
			typing.markDispatchIdle();
		}
	};
}
//#endregion
//#region src/auto-reply/reply/agent-runner.ts
const BLOCK_REPLY_SEND_TIMEOUT_MS = 15e3;
async function runReplyAgent(params) {
	const { commandBody, followupRun, queueKey, resolvedQueue, shouldSteer, shouldFollowup, isActive, isRunActive, isStreaming, opts, typing, sessionEntry, sessionStore, sessionKey, storePath, defaultModel, agentCfgContextTokens, resolvedVerboseLevel, isNewSession, blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak, sessionCtx, shouldInjectGroupIntro, typingMode, resetTriggered, replyOperation: providedReplyOperation } = params;
	let activeSessionEntry = sessionEntry;
	const activeSessionStore = sessionStore;
	let activeIsNewSession = isNewSession;
	const isHeartbeat = opts?.isHeartbeat === true;
	const typingSignals = createTypingSignaler({
		typing,
		mode: typingMode,
		isHeartbeat
	});
	const shouldEmitToolResult = createShouldEmitToolResult({
		sessionKey,
		storePath,
		resolvedVerboseLevel
	});
	const shouldEmitToolOutput = createShouldEmitToolOutput({
		sessionKey,
		storePath,
		resolvedVerboseLevel
	});
	const pendingToolTasks = /* @__PURE__ */ new Set();
	const blockReplyTimeoutMs = opts?.blockReplyTimeoutMs ?? BLOCK_REPLY_SEND_TIMEOUT_MS;
	const replyToChannel = resolveOriginMessageProvider({
		originatingChannel: sessionCtx.OriginatingChannel,
		provider: sessionCtx.Surface ?? sessionCtx.Provider
	});
	const replyToMode = resolveReplyToMode(followupRun.run.config, replyToChannel, sessionCtx.AccountId, sessionCtx.ChatType);
	const applyReplyToMode = createReplyToModeFilterForChannel(replyToMode, replyToChannel);
	const cfg = followupRun.run.config;
	const normalizeReplyMediaPaths = createReplyMediaPathNormalizer({
		cfg,
		sessionKey,
		workspaceDir: followupRun.run.workspaceDir
	});
	const blockReplyCoalescing = blockStreamingEnabled && opts?.onBlockReply ? resolveEffectiveBlockStreamingConfig({
		cfg,
		provider: sessionCtx.Provider,
		accountId: sessionCtx.AccountId,
		chunking: blockReplyChunking
	}).coalescing : void 0;
	const blockReplyPipeline = blockStreamingEnabled && opts?.onBlockReply ? createBlockReplyPipeline({
		onBlockReply: opts.onBlockReply,
		timeoutMs: blockReplyTimeoutMs,
		coalescing: blockReplyCoalescing,
		buffer: createAudioAsVoiceBuffer({ isAudioPayload })
	}) : null;
	const touchActiveSessionEntry = async () => {
		if (!activeSessionEntry || !activeSessionStore || !sessionKey) return;
		const updatedAt = Date.now();
		activeSessionEntry.updatedAt = updatedAt;
		activeSessionStore[sessionKey] = activeSessionEntry;
		if (storePath) await updateSessionStoreEntry({
			storePath,
			sessionKey,
			update: async () => ({ updatedAt })
		});
	};
	if (shouldSteer && isStreaming) {
		if (queueEmbeddedPiMessage((sessionKey ? replyRunRegistry.resolveSessionId(sessionKey) : void 0) ?? followupRun.run.sessionId, followupRun.prompt) && !shouldFollowup) {
			await touchActiveSessionEntry();
			typing.cleanup();
			return;
		}
	}
	const activeRunQueueAction = resolveActiveRunQueueAction({
		isActive,
		isHeartbeat,
		shouldFollowup,
		queueMode: resolvedQueue.mode
	});
	const queuedRunFollowupTurn = createFollowupRunner({
		opts,
		typing,
		typingMode,
		sessionEntry: activeSessionEntry,
		sessionStore: activeSessionStore,
		sessionKey,
		storePath,
		defaultModel,
		agentCfgContextTokens
	});
	if (activeRunQueueAction === "drop") {
		typing.cleanup();
		return;
	}
	if (activeRunQueueAction === "enqueue-followup") {
		enqueueFollowupRun(queueKey, followupRun, resolvedQueue, "message-id", queuedRunFollowupTurn, false);
		if (!isRunActive?.()) finalizeWithFollowup(void 0, queueKey, queuedRunFollowupTurn);
		await touchActiveSessionEntry();
		typing.cleanup();
		return;
	}
	const replySessionKey = sessionKey ?? followupRun.run.sessionKey;
	let replyOperation;
	try {
		replyOperation = providedReplyOperation ?? createReplyOperation({
			sessionId: followupRun.run.sessionId,
			sessionKey: replySessionKey ?? "",
			resetTriggered: resetTriggered === true,
			upstreamAbortSignal: opts?.abortSignal
		});
	} catch (error) {
		if (error instanceof ReplyRunAlreadyActiveError) {
			typing.cleanup();
			return { text: "⚠️ Previous run is still shutting down. Please try again in a moment." };
		}
		throw error;
	}
	let runFollowupTurn = queuedRunFollowupTurn;
	try {
		await typingSignals.signalRunStart();
		activeSessionEntry = await runPreflightCompactionIfNeeded({
			cfg,
			followupRun,
			promptForEstimate: followupRun.prompt,
			defaultModel,
			agentCfgContextTokens,
			sessionEntry: activeSessionEntry,
			sessionStore: activeSessionStore,
			sessionKey,
			storePath,
			isHeartbeat,
			replyOperation
		});
		activeSessionEntry = await runMemoryFlushIfNeeded({
			cfg,
			followupRun,
			promptForEstimate: followupRun.prompt,
			sessionCtx,
			opts,
			defaultModel,
			agentCfgContextTokens,
			resolvedVerboseLevel,
			sessionEntry: activeSessionEntry,
			sessionStore: activeSessionStore,
			sessionKey,
			storePath,
			isHeartbeat,
			replyOperation
		});
		runFollowupTurn = createFollowupRunner({
			opts,
			typing,
			typingMode,
			sessionEntry: activeSessionEntry,
			sessionStore: activeSessionStore,
			sessionKey,
			storePath,
			defaultModel,
			agentCfgContextTokens
		});
		let responseUsageLine;
		const resetSession = async ({ failureLabel, buildLogMessage, cleanupTranscripts }) => {
			if (!sessionKey || !activeSessionStore || !storePath) return false;
			const prevEntry = activeSessionStore[sessionKey] ?? activeSessionEntry;
			if (!prevEntry) return false;
			const prevSessionId = cleanupTranscripts ? prevEntry.sessionId : void 0;
			const nextSessionId = generateSecureUuid();
			const nextEntry = {
				...prevEntry,
				sessionId: nextSessionId,
				updatedAt: Date.now(),
				systemSent: false,
				abortedLastRun: false,
				modelProvider: void 0,
				model: void 0,
				inputTokens: void 0,
				outputTokens: void 0,
				totalTokens: void 0,
				totalTokensFresh: false,
				estimatedCostUsd: void 0,
				cacheRead: void 0,
				cacheWrite: void 0,
				contextTokens: void 0,
				systemPromptReport: void 0,
				fallbackNoticeSelectedModel: void 0,
				fallbackNoticeActiveModel: void 0,
				fallbackNoticeReason: void 0
			};
			const agentId = resolveAgentIdFromSessionKey(sessionKey);
			const nextSessionFile = resolveSessionTranscriptPath(nextSessionId, agentId, sessionCtx.MessageThreadId);
			nextEntry.sessionFile = nextSessionFile;
			activeSessionStore[sessionKey] = nextEntry;
			try {
				await updateSessionStore(storePath, (store) => {
					store[sessionKey] = nextEntry;
				});
			} catch (err) {
				defaultRuntime.error(`Failed to persist session reset after ${failureLabel} (${sessionKey}): ${String(err)}`);
			}
			followupRun.run.sessionId = nextSessionId;
			followupRun.run.sessionFile = nextSessionFile;
			refreshQueuedFollowupSession({
				key: queueKey,
				previousSessionId: prevEntry.sessionId,
				nextSessionId,
				nextSessionFile
			});
			activeSessionEntry = nextEntry;
			activeIsNewSession = true;
			defaultRuntime.error(buildLogMessage(nextSessionId));
			if (cleanupTranscripts && prevSessionId) {
				const transcriptCandidates = /* @__PURE__ */ new Set();
				const resolved = resolveSessionFilePath(prevSessionId, prevEntry, resolveSessionFilePathOptions({
					agentId,
					storePath
				}));
				if (resolved) transcriptCandidates.add(resolved);
				transcriptCandidates.add(resolveSessionTranscriptPath(prevSessionId, agentId));
				for (const candidate of transcriptCandidates) try {
					fs.unlinkSync(candidate);
				} catch {}
			}
			return true;
		};
		const resetSessionAfterCompactionFailure = async (reason) => resetSession({
			failureLabel: "compaction failure",
			buildLogMessage: (nextSessionId) => `Auto-compaction failed (${reason}). Restarting session ${sessionKey} -> ${nextSessionId} and retrying.`
		});
		const resetSessionAfterRoleOrderingConflict = async (reason) => resetSession({
			failureLabel: "role ordering conflict",
			buildLogMessage: (nextSessionId) => `Role ordering conflict (${reason}). Restarting session ${sessionKey} -> ${nextSessionId}.`,
			cleanupTranscripts: true
		});
		replyOperation.setPhase("running");
		const runStartedAt = Date.now();
		const runOutcome = await runAgentTurnWithFallback({
			commandBody,
			followupRun,
			sessionCtx,
			replyOperation,
			opts,
			typingSignals,
			blockReplyPipeline,
			blockStreamingEnabled,
			blockReplyChunking,
			resolvedBlockStreamingBreak,
			applyReplyToMode,
			shouldEmitToolResult,
			shouldEmitToolOutput,
			pendingToolTasks,
			resetSessionAfterCompactionFailure,
			resetSessionAfterRoleOrderingConflict,
			isHeartbeat,
			sessionKey,
			getActiveSessionEntry: () => activeSessionEntry,
			activeSessionStore,
			storePath,
			resolvedVerboseLevel
		});
		if (runOutcome.kind === "final") {
			if (!replyOperation.result) replyOperation.fail("run_failed", /* @__PURE__ */ new Error("reply operation exited with final payload"));
			return finalizeWithFollowup(runOutcome.payload, queueKey, runFollowupTurn);
		}
		const { runId, runResult, fallbackProvider, fallbackModel, fallbackAttempts, directlySentBlockKeys } = runOutcome;
		let { didLogHeartbeatStrip, autoCompactionCount } = runOutcome;
		if (shouldInjectGroupIntro && activeSessionEntry && activeSessionStore && sessionKey && activeSessionEntry.groupActivationNeedsSystemIntro) {
			const updatedAt = Date.now();
			activeSessionEntry.groupActivationNeedsSystemIntro = false;
			activeSessionEntry.updatedAt = updatedAt;
			activeSessionStore[sessionKey] = activeSessionEntry;
			if (storePath) await updateSessionStoreEntry({
				storePath,
				sessionKey,
				update: async () => ({
					groupActivationNeedsSystemIntro: false,
					updatedAt
				})
			});
		}
		const payloadArray = runResult.payloads ?? [];
		if (blockReplyPipeline) {
			await blockReplyPipeline.flush({ force: true });
			blockReplyPipeline.stop();
		}
		if (pendingToolTasks.size > 0) await Promise.allSettled(pendingToolTasks);
		const usage = runResult.meta?.agentMeta?.usage;
		const promptTokens = runResult.meta?.agentMeta?.promptTokens;
		const modelUsed = runResult.meta?.agentMeta?.model ?? fallbackModel ?? defaultModel;
		const providerUsed = runResult.meta?.agentMeta?.provider ?? fallbackProvider ?? followupRun.run.provider;
		const verboseEnabled = resolvedVerboseLevel !== "off";
		const selectedProvider = followupRun.run.provider;
		const selectedModel = followupRun.run.model;
		const fallbackStateEntry = activeSessionEntry ?? (sessionKey ? activeSessionStore?.[sessionKey] : void 0);
		const fallbackTransition = resolveFallbackTransition({
			selectedProvider,
			selectedModel,
			activeProvider: providerUsed,
			activeModel: modelUsed,
			attempts: fallbackAttempts,
			state: fallbackStateEntry
		});
		if (fallbackTransition.stateChanged) {
			if (fallbackStateEntry) {
				fallbackStateEntry.fallbackNoticeSelectedModel = fallbackTransition.nextState.selectedModel;
				fallbackStateEntry.fallbackNoticeActiveModel = fallbackTransition.nextState.activeModel;
				fallbackStateEntry.fallbackNoticeReason = fallbackTransition.nextState.reason;
				fallbackStateEntry.updatedAt = Date.now();
				activeSessionEntry = fallbackStateEntry;
			}
			if (sessionKey && fallbackStateEntry && activeSessionStore) activeSessionStore[sessionKey] = fallbackStateEntry;
			if (sessionKey && storePath) await updateSessionStoreEntry({
				storePath,
				sessionKey,
				update: async () => ({
					fallbackNoticeSelectedModel: fallbackTransition.nextState.selectedModel,
					fallbackNoticeActiveModel: fallbackTransition.nextState.activeModel,
					fallbackNoticeReason: fallbackTransition.nextState.reason
				})
			});
		}
		const contextTokensUsed = agentCfgContextTokens ?? lookupContextTokens(modelUsed) ?? activeSessionEntry?.contextTokens ?? 2e5;
		await persistRunSessionUsage({
			storePath,
			sessionKey,
			cfg,
			usage,
			lastCallUsage: runResult.meta?.agentMeta?.lastCallUsage,
			promptTokens,
			modelUsed,
			providerUsed,
			contextTokensUsed,
			systemPromptReport: runResult.meta?.systemPromptReport,
			usageIsContextSnapshot: false
		});
		if (payloadArray.length === 0) return finalizeWithFollowup(void 0, queueKey, runFollowupTurn);
		const payloadResult = await buildReplyPayloads({
			payloads: payloadArray,
			isHeartbeat,
			didLogHeartbeatStrip,
			silentExpected: followupRun.run.silentExpected,
			blockStreamingEnabled,
			blockReplyPipeline,
			directlySentBlockKeys,
			replyToMode,
			replyToChannel,
			currentMessageId: sessionCtx.MessageSidFull ?? sessionCtx.MessageSid,
			replyThreading: sessionCtx.ReplyThreading,
			messageProvider: followupRun.run.messageProvider,
			messagingToolSentTexts: runResult.messagingToolSentTexts,
			messagingToolSentMediaUrls: runResult.messagingToolSentMediaUrls,
			messagingToolSentTargets: runResult.messagingToolSentTargets,
			originatingChannel: sessionCtx.OriginatingChannel,
			originatingTo: resolveOriginMessageTo({
				originatingTo: sessionCtx.OriginatingTo,
				to: sessionCtx.To
			}),
			accountId: sessionCtx.AccountId,
			normalizeMediaPaths: normalizeReplyMediaPaths
		});
		const { replyPayloads } = payloadResult;
		didLogHeartbeatStrip = payloadResult.didLogHeartbeatStrip;
		if (replyPayloads.length === 0) return finalizeWithFollowup(void 0, queueKey, runFollowupTurn);
		const successfulCronAdds = runResult.successfulCronAdds ?? 0;
		const hasReminderCommitment = replyPayloads.some((payload) => !payload.isError && typeof payload.text === "string" && hasUnbackedReminderCommitment(payload.text));
		const coveredByExistingCron = hasReminderCommitment && successfulCronAdds === 0 ? await hasSessionRelatedCronJobs({
			cronStorePath: cfg.cron?.store,
			sessionKey
		}) : false;
		const guardedReplyPayloads = hasReminderCommitment && successfulCronAdds === 0 && !coveredByExistingCron ? appendUnscheduledReminderNote(replyPayloads) : replyPayloads;
		await signalTypingIfNeeded(guardedReplyPayloads, typingSignals);
		if (isDiagnosticsEnabled(cfg) && hasNonzeroUsage(usage)) {
			const input = usage.input ?? 0;
			const output = usage.output ?? 0;
			const cacheRead = usage.cacheRead ?? 0;
			const cacheWrite = usage.cacheWrite ?? 0;
			const promptTokens = input + cacheRead + cacheWrite;
			const totalTokens = usage.total ?? promptTokens + output;
			const costUsd = estimateUsageCost({
				usage,
				cost: resolveModelCostConfig({
					provider: providerUsed,
					model: modelUsed,
					config: cfg
				})
			});
			emitDiagnosticEvent({
				type: "model.usage",
				sessionKey,
				sessionId: followupRun.run.sessionId,
				channel: replyToChannel,
				provider: providerUsed,
				model: modelUsed,
				usage: {
					input,
					output,
					cacheRead,
					cacheWrite,
					promptTokens,
					total: totalTokens
				},
				lastCallUsage: runResult.meta?.agentMeta?.lastCallUsage,
				context: {
					limit: contextTokensUsed,
					used: totalTokens
				},
				costUsd,
				durationMs: Date.now() - runStartedAt
			});
		}
		const responseUsageMode = resolveResponseUsageMode(activeSessionEntry?.responseUsage ?? (sessionKey ? activeSessionStore?.[sessionKey]?.responseUsage : void 0));
		if (responseUsageMode !== "off" && hasNonzeroUsage(usage)) {
			const showCost = resolveModelAuthMode(providerUsed, cfg) === "api-key";
			let formatted = formatResponseUsageLine({
				usage,
				showCost,
				costConfig: showCost ? resolveModelCostConfig({
					provider: providerUsed,
					model: modelUsed,
					config: cfg
				}) : void 0
			});
			if (formatted && responseUsageMode === "full" && sessionKey) formatted = `${formatted} · session \`${sessionKey}\``;
			if (formatted) responseUsageLine = formatted;
		}
		let finalPayloads = guardedReplyPayloads;
		const verboseNotices = [];
		if (verboseEnabled && activeIsNewSession) verboseNotices.push({ text: `🧭 New session: ${followupRun.run.sessionId}` });
		if (fallbackTransition.fallbackTransitioned) {
			emitAgentEvent({
				runId,
				sessionKey,
				stream: "lifecycle",
				data: {
					phase: "fallback",
					selectedProvider,
					selectedModel,
					activeProvider: providerUsed,
					activeModel: modelUsed,
					reasonSummary: fallbackTransition.reasonSummary,
					attemptSummaries: fallbackTransition.attemptSummaries,
					attempts: fallbackAttempts
				}
			});
			if (verboseEnabled) {
				const fallbackNotice = buildFallbackNotice({
					selectedProvider,
					selectedModel,
					activeProvider: providerUsed,
					activeModel: modelUsed,
					attempts: fallbackAttempts
				});
				if (fallbackNotice) verboseNotices.push({ text: fallbackNotice });
			}
		}
		if (fallbackTransition.fallbackCleared) {
			emitAgentEvent({
				runId,
				sessionKey,
				stream: "lifecycle",
				data: {
					phase: "fallback_cleared",
					selectedProvider,
					selectedModel,
					activeProvider: providerUsed,
					activeModel: modelUsed,
					previousActiveModel: fallbackTransition.previousState.activeModel
				}
			});
			if (verboseEnabled) verboseNotices.push({ text: buildFallbackClearedNotice({
				selectedProvider,
				selectedModel,
				previousActiveModel: fallbackTransition.previousState.activeModel
			}) });
		}
		if (autoCompactionCount > 0) {
			const previousSessionId = activeSessionEntry?.sessionId ?? followupRun.run.sessionId;
			const count = await incrementRunCompactionCount({
				cfg,
				sessionEntry: activeSessionEntry,
				sessionStore: activeSessionStore,
				sessionKey,
				storePath,
				amount: autoCompactionCount,
				lastCallUsage: runResult.meta?.agentMeta?.lastCallUsage,
				contextTokensUsed,
				newSessionId: runResult.meta?.agentMeta?.sessionId
			});
			const refreshedSessionEntry = sessionKey && activeSessionStore ? activeSessionStore[sessionKey] : void 0;
			if (refreshedSessionEntry) {
				activeSessionEntry = refreshedSessionEntry;
				refreshQueuedFollowupSession({
					key: queueKey,
					previousSessionId,
					nextSessionId: refreshedSessionEntry.sessionId,
					nextSessionFile: refreshedSessionEntry.sessionFile
				});
			}
			if (sessionKey) readPostCompactionContext(process.cwd(), cfg).then((contextContent) => {
				if (contextContent) enqueueSystemEvent(contextContent, { sessionKey });
			}).catch(() => {});
			if (verboseEnabled) {
				const suffix = typeof count === "number" ? ` (count ${count})` : "";
				verboseNotices.push({ text: `🧹 Auto-compaction complete${suffix}.` });
			}
		}
		if (verboseNotices.length > 0) finalPayloads = [...verboseNotices, ...finalPayloads];
		if (responseUsageLine) finalPayloads = appendUsageLine(finalPayloads, responseUsageLine);
		return finalizeWithFollowup(finalPayloads.length === 1 ? finalPayloads[0] : finalPayloads, queueKey, runFollowupTurn);
	} catch (error) {
		if (replyOperation.result?.kind === "aborted" && replyOperation.result.code === "aborted_for_restart") return finalizeWithFollowup({ text: "⚠️ Gateway is restarting. Please wait a few seconds and try again." }, queueKey, runFollowupTurn);
		if (replyOperation.result?.kind === "aborted") return finalizeWithFollowup({ text: SILENT_REPLY_TOKEN }, queueKey, runFollowupTurn);
		if (error instanceof GatewayDrainingError) {
			replyOperation.fail("gateway_draining", error);
			return finalizeWithFollowup({ text: "⚠️ Gateway is restarting. Please wait a few seconds and try again." }, queueKey, runFollowupTurn);
		}
		if (error instanceof CommandLaneClearedError) {
			replyOperation.fail("command_lane_cleared", error);
			return finalizeWithFollowup({ text: "⚠️ Gateway is restarting. Please wait a few seconds and try again." }, queueKey, runFollowupTurn);
		}
		replyOperation.fail("run_failed", error);
		finalizeWithFollowup(void 0, queueKey, runFollowupTurn);
		throw error;
	} finally {
		replyOperation.complete();
		blockReplyPipeline?.stop();
		typing.markRunComplete();
		typing.markDispatchIdle();
	}
}
//#endregion
export { runReplyAgent };
