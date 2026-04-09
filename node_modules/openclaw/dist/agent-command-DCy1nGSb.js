import { n as defaultRuntime } from "./runtime-D34lIttY.js";
import { a as isGatewayMessageChannel, d as normalizeMessageChannel, o as isInternalMessageChannel, p as resolveMessageChannel, r as isDeliverableMessageChannel, t as INTERNAL_MESSAGE_CHANNEL } from "./message-channel-DnQkETjb.js";
import { t as sanitizeForLog } from "./ansi-DpBQLMEp.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { n as ensureAuthProfileStore } from "./store-HF_Z-jKz.js";
import "./auth-profiles-gRFfbuWd.js";
import { c as normalizeThinkLevel, n as formatXHighModelHint, u as normalizeVerboseLevel } from "./thinking.shared-CA8xx4G3.js";
import { c as normalizeAgentId, l as normalizeMainKey, m as toAgentRequestSessionKey, u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { a as resolveAgentDir, f as resolveAgentSkillsFilter, h as resolveEffectiveModelFallbacks, p as resolveAgentWorkspaceDir, r as listAgentIds, v as resolveSessionAgentId, x as matchesSkillFilter } from "./agent-scope-CXWTwwic.js";
import { d as ensureAgentWorkspace } from "./workspace-DLW8_PFX.js";
import { S as resolveThinkingDefault, c as modelKey, d as parseModelRef, h as resolveDefaultModelForAgent, l as normalizeModelRef, m as resolveConfiguredModelRef, t as buildAllowedModelSet } from "./model-selection-BVM4eHHo.js";
import { n as DEFAULT_MODEL, r as DEFAULT_PROVIDER } from "./defaults-I0_TmVEm.js";
import { a as loadConfig, u as readConfigFileSnapshotForWrite } from "./io-CS2J_l4V.js";
import { r as normalizeChannelId, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { o as setRuntimeConfigSnapshot } from "./runtime-snapshot-BQtdTwL2.js";
import "./config-dzPpvDz6.js";
import { t as formatCliCommand } from "./command-format-D6RJqoCJ.js";
import { c as updateSessionStore } from "./store-Cx4GsUxp.js";
import { r as resolveExplicitAgentSessionKey } from "./main-session-D-BGz7Y3.js";
import "./sessions-D5EF_laP.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { n as mergeSessionEntry, o as setSessionRuntimeModel } from "./types-CT9QkK_u.js";
import { i as resolveSessionResetType, n as resolveChannelResetConfig, r as resolveSessionResetPolicy, t as evaluateSessionFreshness } from "./reset-C4TVXJqP.js";
import { n as resolveSessionKey } from "./session-key-DqCyICpO.js";
import { c as normalizeAccountId } from "./delivery-context-uGixCTFh.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { t as emitSessionTranscriptUpdate } from "./transcript-events-24MLs1cx.js";
import { n as resolveSessionTranscriptFile } from "./transcript-e2ojqOxD.js";
import { r as loadModelCatalog } from "./model-catalog-CQDWCU0w.js";
import { a as isSilentReplyText, i as isSilentReplyPrefixText } from "./tokens-wOGzQgw2.js";
import { E as normalizeSpawnedRunMetadata, ft as runWithModelFallback, it as AGENT_LANE_SUBAGENT, pt as LiveSessionModelSwitchError, r as prepareSessionManagerForRun, rt as AGENT_LANE_NESTED, t as runEmbeddedPiAgent, ut as formatAgentInternalEventsForPrompt } from "./pi-embedded-DWASRjxE.js";
import { n as clearBootstrapSnapshotOnSessionRollover } from "./bootstrap-cache-tubl2Dhc.js";
import { o as resolveBootstrapWarningSignaturesSeen } from "./bootstrap-budget-Fd-WnRNB.js";
import { j as hasInternalRuntimeContext } from "./errors-By_fjUFz.js";
import { i as supportsXHighThinking, t as formatThinkingLevels } from "./thinking-Dy-aqg86.js";
import { i as normalizeOutboundPayloadsForJson, n as formatOutboundPayloadLog, r as normalizeOutboundPayloads, t as deliverOutboundPayloads } from "./deliver-DqZbx7oj.js";
import { S as shouldRefreshSnapshotForVersion, r as getRemoteSkillEligibility, t as canExecRequestNode, y as getSkillsSnapshotVersion } from "./exec-defaults-uj0McX2k.js";
import { n as resolveMessageChannelSelection } from "./channel-selection-DOPNKcAo.js";
import { t as buildOutboundSessionContext } from "./session-context-CTlVqYkw.js";
import { i as resolveSessionDeliveryTarget, r as resolveOutboundTarget } from "./targets-B4dqnBo1.js";
import { t as resolveCommandSecretRefsViaGateway } from "./command-secret-gateway-BAJQe5Ov.js";
import { t as getAgentRuntimeCommandSecretTargetIds } from "./command-secret-targets-Cx2mAV-T.js";
import { i as emitAgentEvent, t as clearAgentRunContext, u as registerAgentRunContext } from "./agent-events-B4irFqCI.js";
import { t as normalizeReplyPayload } from "./normalize-reply-DgJ-TYpX.js";
import { t as resolveAgentTimeoutMs } from "./timeout-C9RIx1qJ.js";
import { n as resolveContextTokensForModel } from "./context-BozTgpbo.js";
import { r as buildWorkspaceSkillSnapshot } from "./skills-BnlzYY40.js";
import { n as deriveSessionTotalTokens, r as hasNonzeroUsage } from "./usage-CzcPoJlb.js";
import { a as resolveModelCostConfig, n as estimateUsageCost } from "./usage-format-B6wsX5Cv.js";
import { t as applyModelOverrideToSessionEntry } from "./model-overrides-D7BCRD4Y.js";
import { p as toAcpRuntimeError } from "./session-identity-DQtM7u0c.js";
import { n as getAcpSessionManager } from "./manager-B8s0Ep5O.js";
import { n as resolveAcpSessionCwd, o as resolveAcpAgentPolicyError, s as resolveAcpDispatchPolicyError } from "./pi-embedded-block-chunker-VwLi93im.js";
import { n as resolveSendPolicy } from "./send-policy-Bsgzkxhe.js";
import { t as createReplyPrefixContext } from "./reply-prefix-DWH6-cyp.js";
import { t as clearSessionAuthProfileOverride } from "./session-override-Dg8rXKfc.js";
import { t as createDefaultDeps } from "./deps-sT-6fEgQ.js";
import { t as applyVerboseOverride } from "./level-overrides-Cx6HpmCT.js";
import { t as createOutboundSendDeps } from "./outbound-send-deps-D2y9QW7B.js";
import "./refresh-Dlqc7ygw.js";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { SessionManager } from "@mariozechner/pi-coding-agent";
import readline from "node:readline";
//#region src/agents/command/attempt-execution.ts
/** Maximum number of JSONL records to inspect before giving up. */
const SESSION_FILE_MAX_RECORDS = 500;
/**
* Check whether a session transcript file exists and contains at least one
* assistant message, indicating that the SessionManager has flushed the
* initial user+assistant exchange to disk.  This is used to decide whether
* a fallback retry can rely on the on-disk history or must re-send the
* original prompt.
*
* The check parses JSONL records line-by-line (CWE-703) instead of relying
* on a raw substring match against a bounded byte prefix, which could
* produce false negatives when the pre-assistant content exceeds the byte
* limit.
*/
async function sessionFileHasContent(sessionFile) {
	if (!sessionFile) return false;
	try {
		if ((await fs.lstat(sessionFile)).isSymbolicLink()) return false;
		const fh = await fs.open(sessionFile, "r");
		try {
			const rl = readline.createInterface({ input: fh.createReadStream({ encoding: "utf-8" }) });
			let recordCount = 0;
			for await (const line of rl) {
				if (!line.trim()) continue;
				recordCount++;
				if (recordCount > SESSION_FILE_MAX_RECORDS) break;
				let obj;
				try {
					obj = JSON.parse(line);
				} catch {
					continue;
				}
				const rec = obj;
				if (rec?.type === "message" && rec.message?.role === "assistant") return true;
			}
			return false;
		} finally {
			await fh.close();
		}
	} catch {
		return false;
	}
}
async function persistSessionEntry$1(params) {
	const persisted = await updateSessionStore(params.storePath, (store) => {
		const merged = mergeSessionEntry(store[params.sessionKey], params.entry);
		for (const field of params.clearedFields ?? []) if (!Object.hasOwn(params.entry, field)) Reflect.deleteProperty(merged, field);
		store[params.sessionKey] = merged;
		return merged;
	});
	params.sessionStore[params.sessionKey] = persisted;
}
function resolveFallbackRetryPrompt(params) {
	if (!params.isFallbackRetry) return params.body;
	if (!params.sessionHasHistory) return params.body;
	return "Continue where you left off. The previous model attempt failed or timed out.";
}
function prependInternalEventContext(body, events) {
	if (hasInternalRuntimeContext(body)) return body;
	const renderedEvents = formatAgentInternalEventsForPrompt(events);
	if (!renderedEvents) return body;
	return [renderedEvents, body].filter(Boolean).join("\n\n");
}
function createAcpVisibleTextAccumulator() {
	let pendingSilentPrefix = "";
	let visibleText = "";
	const startsWithWordChar = (chunk) => /^[\p{L}\p{N}]/u.test(chunk);
	const resolveNextCandidate = (base, chunk) => {
		if (!base) return chunk;
		if (isSilentReplyText(base, "NO_REPLY") && !chunk.startsWith(base) && startsWithWordChar(chunk)) return chunk;
		if (chunk.startsWith(base) && chunk.length > base.length) return chunk;
		return `${base}${chunk}`;
	};
	const mergeVisibleChunk = (base, chunk) => {
		if (!base) return {
			text: chunk,
			delta: chunk
		};
		if (chunk.startsWith(base) && chunk.length > base.length) return {
			text: chunk,
			delta: chunk.slice(base.length)
		};
		return {
			text: `${base}${chunk}`,
			delta: chunk
		};
	};
	return {
		consume(chunk) {
			if (!chunk) return null;
			if (!visibleText) {
				const leadCandidate = resolveNextCandidate(pendingSilentPrefix, chunk);
				const trimmedLeadCandidate = leadCandidate.trim();
				if (isSilentReplyText(trimmedLeadCandidate, "NO_REPLY") || isSilentReplyPrefixText(trimmedLeadCandidate, "NO_REPLY")) {
					pendingSilentPrefix = leadCandidate;
					return null;
				}
				if (pendingSilentPrefix) {
					pendingSilentPrefix = "";
					visibleText = leadCandidate;
					return {
						text: visibleText,
						delta: leadCandidate
					};
				}
			}
			const nextVisible = mergeVisibleChunk(visibleText, chunk);
			visibleText = nextVisible.text;
			return nextVisible.delta ? nextVisible : null;
		},
		finalize() {
			return visibleText.trim();
		},
		finalizeRaw() {
			return visibleText;
		}
	};
}
const ACP_TRANSCRIPT_USAGE = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0
	}
};
async function persistAcpTurnTranscript(params) {
	const promptText = params.body;
	const replyText = params.finalText;
	if (!promptText && !replyText) return params.sessionEntry;
	const { sessionFile, sessionEntry } = await resolveSessionTranscriptFile({
		sessionId: params.sessionId,
		sessionKey: params.sessionKey,
		sessionEntry: params.sessionEntry,
		sessionStore: params.sessionStore,
		storePath: params.storePath,
		agentId: params.sessionAgentId,
		threadId: params.threadId
	});
	const hadSessionFile = await fs.access(sessionFile).then(() => true).catch(() => false);
	const sessionManager = SessionManager.open(sessionFile);
	await prepareSessionManagerForRun({
		sessionManager,
		sessionFile,
		hadSessionFile,
		sessionId: params.sessionId,
		cwd: params.sessionCwd
	});
	if (promptText) sessionManager.appendMessage({
		role: "user",
		content: promptText,
		timestamp: Date.now()
	});
	if (replyText) sessionManager.appendMessage({
		role: "assistant",
		content: [{
			type: "text",
			text: replyText
		}],
		api: "openai-responses",
		provider: "openclaw",
		model: "acp-runtime",
		usage: ACP_TRANSCRIPT_USAGE,
		stopReason: "stop",
		timestamp: Date.now()
	});
	emitSessionTranscriptUpdate(sessionFile);
	return sessionEntry;
}
function runAgentAttempt(params) {
	const effectivePrompt = resolveFallbackRetryPrompt({
		body: params.body,
		isFallbackRetry: params.isFallbackRetry,
		sessionHasHistory: params.sessionHasHistory
	});
	const bootstrapPromptWarningSignaturesSeen = resolveBootstrapWarningSignaturesSeen(params.sessionEntry?.systemPromptReport);
	const bootstrapPromptWarningSignature = bootstrapPromptWarningSignaturesSeen[bootstrapPromptWarningSignaturesSeen.length - 1];
	const authProfileId = params.providerOverride === params.authProfileProvider ? params.sessionEntry?.authProfileOverride : void 0;
	return runEmbeddedPiAgent({
		sessionId: params.sessionId,
		sessionKey: params.sessionKey,
		agentId: params.sessionAgentId,
		trigger: "user",
		messageChannel: params.messageChannel,
		agentAccountId: params.runContext.accountId,
		messageTo: params.opts.replyTo ?? params.opts.to,
		messageThreadId: params.opts.threadId,
		groupId: params.runContext.groupId,
		groupChannel: params.runContext.groupChannel,
		groupSpace: params.runContext.groupSpace,
		spawnedBy: params.spawnedBy,
		currentChannelId: params.runContext.currentChannelId,
		currentThreadTs: params.runContext.currentThreadTs,
		replyToMode: params.runContext.replyToMode,
		hasRepliedRef: params.runContext.hasRepliedRef,
		senderIsOwner: params.opts.senderIsOwner,
		sessionFile: params.sessionFile,
		workspaceDir: params.workspaceDir,
		config: params.cfg,
		skillsSnapshot: params.skillsSnapshot,
		prompt: effectivePrompt,
		images: params.isFallbackRetry ? void 0 : params.opts.images,
		imageOrder: params.isFallbackRetry ? void 0 : params.opts.imageOrder,
		clientTools: params.opts.clientTools,
		provider: params.providerOverride,
		model: params.modelOverride,
		authProfileId,
		authProfileIdSource: authProfileId ? params.sessionEntry?.authProfileOverrideSource : void 0,
		thinkLevel: params.resolvedThinkLevel,
		verboseLevel: params.resolvedVerboseLevel,
		timeoutMs: params.timeoutMs,
		runId: params.runId,
		lane: params.opts.lane,
		abortSignal: params.opts.abortSignal,
		extraSystemPrompt: params.opts.extraSystemPrompt,
		internalEvents: params.opts.internalEvents,
		inputProvenance: params.opts.inputProvenance,
		streamParams: params.opts.streamParams,
		agentDir: params.agentDir,
		allowTransientCooldownProbe: params.allowTransientCooldownProbe,
		cleanupBundleMcpOnRunEnd: params.opts.cleanupBundleMcpOnRunEnd,
		onAgentEvent: params.onAgentEvent,
		bootstrapPromptWarningSignaturesSeen,
		bootstrapPromptWarningSignature
	});
}
function buildAcpResult(params) {
	const normalizedFinalPayload = normalizeReplyPayload({ text: params.payloadText });
	return {
		payloads: normalizedFinalPayload ? [normalizedFinalPayload] : [],
		meta: {
			durationMs: Date.now() - params.startedAt,
			aborted: params.abortSignal?.aborted === true,
			stopReason: params.stopReason
		}
	};
}
function emitAcpLifecycleStart(params) {
	emitAgentEvent({
		runId: params.runId,
		stream: "lifecycle",
		data: {
			phase: "start",
			startedAt: params.startedAt
		}
	});
}
function emitAcpLifecycleEnd(params) {
	emitAgentEvent({
		runId: params.runId,
		stream: "lifecycle",
		data: {
			phase: "end",
			endedAt: Date.now()
		}
	});
}
function emitAcpLifecycleError(params) {
	emitAgentEvent({
		runId: params.runId,
		stream: "lifecycle",
		data: {
			phase: "error",
			error: params.message,
			endedAt: Date.now()
		}
	});
}
function emitAcpAssistantDelta(params) {
	emitAgentEvent({
		runId: params.runId,
		stream: "assistant",
		data: {
			text: params.text,
			delta: params.delta
		}
	});
}
//#endregion
//#region src/infra/outbound/agent-delivery.ts
function resolveAgentDeliveryPlan(params) {
	const requestedRaw = typeof params.requestedChannel === "string" ? params.requestedChannel.trim() : "";
	const requestedChannel = (requestedRaw ? normalizeMessageChannel(requestedRaw) : void 0) || "last";
	const explicitTo = typeof params.explicitTo === "string" && params.explicitTo.trim() ? params.explicitTo.trim() : void 0;
	const normalizedTurnSource = params.turnSourceChannel ? normalizeMessageChannel(params.turnSourceChannel) : void 0;
	const turnSourceChannel = normalizedTurnSource && isDeliverableMessageChannel(normalizedTurnSource) ? normalizedTurnSource : void 0;
	const turnSourceTo = typeof params.turnSourceTo === "string" && params.turnSourceTo.trim() ? params.turnSourceTo.trim() : void 0;
	const turnSourceAccountId = normalizeAccountId(params.turnSourceAccountId);
	const turnSourceThreadId = params.turnSourceThreadId != null && params.turnSourceThreadId !== "" ? params.turnSourceThreadId : void 0;
	const baseDelivery = resolveSessionDeliveryTarget({
		entry: params.sessionEntry,
		requestedChannel: requestedChannel === "webchat" ? "last" : requestedChannel,
		explicitTo,
		explicitThreadId: params.explicitThreadId,
		turnSourceChannel,
		turnSourceTo,
		turnSourceAccountId,
		turnSourceThreadId
	});
	const resolvedChannel = (() => {
		if (requestedChannel === "webchat") return INTERNAL_MESSAGE_CHANNEL;
		if (requestedChannel === "last") {
			if (baseDelivery.channel && baseDelivery.channel !== "webchat") return baseDelivery.channel;
			return INTERNAL_MESSAGE_CHANNEL;
		}
		if (isGatewayMessageChannel(requestedChannel)) return requestedChannel;
		if (baseDelivery.channel && baseDelivery.channel !== "webchat") return baseDelivery.channel;
		return INTERNAL_MESSAGE_CHANNEL;
	})();
	const deliveryTargetMode = explicitTo ? "explicit" : isDeliverableMessageChannel(resolvedChannel) ? "implicit" : void 0;
	const resolvedAccountId = normalizeAccountId(params.accountId) ?? (deliveryTargetMode === "implicit" ? baseDelivery.accountId : void 0);
	let resolvedTo = explicitTo;
	if (!resolvedTo && isDeliverableMessageChannel(resolvedChannel) && resolvedChannel === baseDelivery.lastChannel) resolvedTo = baseDelivery.lastTo;
	return {
		baseDelivery,
		resolvedChannel,
		resolvedTo,
		resolvedAccountId,
		resolvedThreadId: baseDelivery.threadId,
		deliveryTargetMode
	};
}
function resolveAgentOutboundTarget(params) {
	const targetMode = params.targetMode ?? params.plan.deliveryTargetMode ?? (params.plan.resolvedTo ? "explicit" : "implicit");
	if (!isDeliverableMessageChannel(params.plan.resolvedChannel)) return {
		resolvedTarget: null,
		resolvedTo: params.plan.resolvedTo,
		targetMode
	};
	if (params.validateExplicitTarget !== true && params.plan.resolvedTo) return {
		resolvedTarget: null,
		resolvedTo: params.plan.resolvedTo,
		targetMode
	};
	const resolvedTarget = resolveOutboundTarget({
		channel: params.plan.resolvedChannel,
		to: params.plan.resolvedTo,
		cfg: params.cfg,
		accountId: params.plan.resolvedAccountId,
		mode: targetMode
	});
	return {
		resolvedTarget,
		resolvedTo: resolvedTarget.ok ? resolvedTarget.to : params.plan.resolvedTo,
		targetMode
	};
}
//#endregion
//#region src/infra/outbound/envelope.ts
const isOutboundPayloadJson = (payload) => "mediaUrl" in payload;
function buildOutboundResultEnvelope(params) {
	const hasPayloads = params.payloads !== void 0;
	const payloads = params.payloads === void 0 ? void 0 : params.payloads.length === 0 ? [] : isOutboundPayloadJson(params.payloads[0]) ? [...params.payloads] : normalizeOutboundPayloadsForJson(params.payloads);
	if (params.flattenDelivery !== false && params.delivery && !params.meta && !hasPayloads) return params.delivery;
	return {
		...hasPayloads ? { payloads } : {},
		...params.meta ? { meta: params.meta } : {},
		...params.delivery ? { delivery: params.delivery } : {}
	};
}
//#endregion
//#region src/agents/command/delivery.ts
const NESTED_LOG_PREFIX = "[agent:nested]";
function formatNestedLogPrefix(opts, sessionKey) {
	const parts = [NESTED_LOG_PREFIX];
	const session = sessionKey ?? opts.sessionKey ?? opts.sessionId;
	if (session) parts.push(`session=${session}`);
	if (opts.runId) parts.push(`run=${opts.runId}`);
	const channel = opts.messageChannel ?? opts.channel;
	if (channel) parts.push(`channel=${channel}`);
	if (opts.to) parts.push(`to=${opts.to}`);
	if (opts.accountId) parts.push(`account=${opts.accountId}`);
	return parts.join(" ");
}
function logNestedOutput(runtime, opts, output, sessionKey) {
	const prefix = formatNestedLogPrefix(opts, sessionKey);
	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		runtime.log(`${prefix} ${line}`);
	}
}
function normalizeAgentCommandReplyPayloads(params) {
	const payloads = params.payloads ?? [];
	if (payloads.length === 0) return [];
	const channel = params.deliveryChannel && !isInternalMessageChannel(params.deliveryChannel) ? normalizeChannelId(params.deliveryChannel) ?? params.deliveryChannel : void 0;
	if (!channel) return payloads;
	const deliveryPlugin = getChannelPlugin(channel);
	const sessionKey = params.outboundSession?.key ?? params.opts.sessionKey;
	const agentId = params.outboundSession?.agentId ?? resolveSessionAgentId({
		sessionKey,
		config: params.cfg
	});
	const replyPrefix = createReplyPrefixContext({
		cfg: params.cfg,
		agentId,
		channel,
		accountId: params.accountId
	});
	const modelUsed = params.result.meta.agentMeta?.model;
	const providerUsed = params.result.meta.agentMeta?.provider;
	if (providerUsed && modelUsed) replyPrefix.onModelSelected({
		provider: providerUsed,
		model: modelUsed,
		thinkLevel: void 0
	});
	const responsePrefixContext = replyPrefix.responsePrefixContextProvider();
	const applyChannelTransforms = params.applyChannelTransforms ?? true;
	const transformReplyPayload = deliveryPlugin?.messaging?.transformReplyPayload ? (payload) => deliveryPlugin.messaging?.transformReplyPayload?.({
		payload,
		cfg: params.cfg,
		accountId: params.accountId
	}) ?? payload : void 0;
	const normalizedPayloads = [];
	for (const payload of payloads) {
		const normalized = normalizeReplyPayload(payload, {
			responsePrefix: replyPrefix.responsePrefix,
			applyChannelTransforms,
			responsePrefixContext,
			transformReplyPayload
		});
		if (normalized) normalizedPayloads.push(normalized);
	}
	return normalizedPayloads;
}
async function deliverAgentCommandResult(params) {
	const { cfg, deps, runtime, opts, outboundSession, sessionEntry, payloads, result } = params;
	const effectiveSessionKey = outboundSession?.key ?? opts.sessionKey;
	const deliver = opts.deliver === true;
	const bestEffortDeliver = opts.bestEffortDeliver === true;
	const turnSourceChannel = opts.runContext?.messageChannel ?? opts.messageChannel;
	const turnSourceTo = opts.runContext?.currentChannelId ?? opts.to;
	const turnSourceAccountId = opts.runContext?.accountId ?? opts.accountId;
	const turnSourceThreadId = opts.runContext?.currentThreadTs ?? opts.threadId;
	const deliveryPlan = resolveAgentDeliveryPlan({
		sessionEntry,
		requestedChannel: opts.replyChannel ?? opts.channel,
		explicitTo: opts.replyTo ?? opts.to,
		explicitThreadId: opts.threadId,
		accountId: opts.replyAccountId ?? opts.accountId,
		wantsDelivery: deliver,
		turnSourceChannel,
		turnSourceTo,
		turnSourceAccountId,
		turnSourceThreadId
	});
	let deliveryChannel = deliveryPlan.resolvedChannel;
	const explicitChannelHint = (opts.replyChannel ?? opts.channel)?.trim();
	if (deliver && isInternalMessageChannel(deliveryChannel) && !explicitChannelHint) try {
		deliveryChannel = (await resolveMessageChannelSelection({ cfg })).channel;
	} catch {}
	const effectiveDeliveryPlan = deliveryChannel === deliveryPlan.resolvedChannel ? deliveryPlan : {
		...deliveryPlan,
		resolvedChannel: deliveryChannel
	};
	const deliveryPlugin = !isInternalMessageChannel(deliveryChannel) ? getChannelPlugin(normalizeChannelId(deliveryChannel) ?? deliveryChannel) : void 0;
	const isDeliveryChannelKnown = isInternalMessageChannel(deliveryChannel) || Boolean(deliveryPlugin);
	const targetMode = opts.deliveryTargetMode ?? effectiveDeliveryPlan.deliveryTargetMode ?? (opts.to ? "explicit" : "implicit");
	const resolvedAccountId = effectiveDeliveryPlan.resolvedAccountId;
	const resolved = deliver && isDeliveryChannelKnown && deliveryChannel ? resolveAgentOutboundTarget({
		cfg,
		plan: effectiveDeliveryPlan,
		targetMode,
		validateExplicitTarget: true
	}) : {
		resolvedTarget: null,
		resolvedTo: effectiveDeliveryPlan.resolvedTo,
		targetMode
	};
	const resolvedTarget = resolved.resolvedTarget;
	const deliveryTarget = resolved.resolvedTo;
	const resolvedThreadId = deliveryPlan.resolvedThreadId ?? opts.threadId;
	const replyTransport = deliveryPlugin?.threading?.resolveReplyTransport?.({
		cfg,
		accountId: resolvedAccountId,
		threadId: resolvedThreadId
	}) ?? null;
	const resolvedReplyToId = replyTransport?.replyToId ?? void 0;
	const resolvedThreadTarget = replyTransport && Object.hasOwn(replyTransport, "threadId") ? replyTransport.threadId ?? null : resolvedThreadId ?? null;
	const logDeliveryError = (err) => {
		const message = `Delivery failed (${deliveryChannel}${deliveryTarget ? ` to ${deliveryTarget}` : ""}): ${String(err)}`;
		runtime.error?.(message);
		if (!runtime.error) runtime.log(message);
	};
	if (deliver) {
		if (isInternalMessageChannel(deliveryChannel)) {
			const err = /* @__PURE__ */ new Error("delivery channel is required: pass --channel/--reply-channel or use a main session with a previous channel");
			if (!bestEffortDeliver) throw err;
			logDeliveryError(err);
		} else if (!isDeliveryChannelKnown) {
			const err = /* @__PURE__ */ new Error(`Unknown channel: ${deliveryChannel}`);
			if (!bestEffortDeliver) throw err;
			logDeliveryError(err);
		} else if (resolvedTarget && !resolvedTarget.ok) {
			if (!bestEffortDeliver) throw resolvedTarget.error;
			logDeliveryError(resolvedTarget.error);
		}
	}
	const normalizedReplyPayloads = normalizeAgentCommandReplyPayloads({
		cfg,
		opts,
		outboundSession,
		payloads,
		result,
		deliveryChannel,
		accountId: resolvedAccountId,
		applyChannelTransforms: deliver
	});
	const normalizedPayloads = normalizeOutboundPayloadsForJson(normalizedReplyPayloads);
	if (opts.json) {
		runtime.log(JSON.stringify(buildOutboundResultEnvelope({
			payloads: normalizedPayloads,
			meta: result.meta
		}), null, 2));
		if (!deliver) return {
			payloads: normalizedPayloads,
			meta: result.meta
		};
	}
	if (!payloads || payloads.length === 0) {
		runtime.log("No reply from agent.");
		return {
			payloads: [],
			meta: result.meta
		};
	}
	const deliveryPayloads = normalizeOutboundPayloads(normalizedReplyPayloads);
	const logPayload = (payload) => {
		if (opts.json) return;
		const output = formatOutboundPayloadLog(payload);
		if (!output) return;
		if (opts.lane === AGENT_LANE_NESTED) {
			logNestedOutput(runtime, opts, output, effectiveSessionKey);
			return;
		}
		runtime.log(output);
	};
	if (!deliver) for (const payload of deliveryPayloads) logPayload(payload);
	if (deliver && deliveryChannel && !isInternalMessageChannel(deliveryChannel)) {
		if (deliveryTarget) await deliverOutboundPayloads({
			cfg,
			channel: deliveryChannel,
			to: deliveryTarget,
			accountId: resolvedAccountId,
			payloads: deliveryPayloads,
			session: outboundSession,
			replyToId: resolvedReplyToId ?? null,
			threadId: resolvedThreadTarget ?? null,
			bestEffort: bestEffortDeliver,
			onError: (err) => logDeliveryError(err),
			onPayload: logPayload,
			deps: createOutboundSendDeps(deps)
		});
	}
	return {
		payloads: normalizedPayloads,
		meta: result.meta
	};
}
//#endregion
//#region src/agents/command/run-context.ts
function resolveAgentRunContext(opts) {
	const merged = opts.runContext ? { ...opts.runContext } : {};
	const normalizedChannel = resolveMessageChannel(merged.messageChannel ?? opts.messageChannel, opts.replyChannel ?? opts.channel);
	if (normalizedChannel) merged.messageChannel = normalizedChannel;
	const normalizedAccountId = normalizeAccountId(merged.accountId ?? opts.accountId);
	if (normalizedAccountId) merged.accountId = normalizedAccountId;
	const groupId = (merged.groupId ?? opts.groupId)?.toString().trim();
	if (groupId) merged.groupId = groupId;
	const groupChannel = (merged.groupChannel ?? opts.groupChannel)?.toString().trim();
	if (groupChannel) merged.groupChannel = groupChannel;
	const groupSpace = (merged.groupSpace ?? opts.groupSpace)?.toString().trim();
	if (groupSpace) merged.groupSpace = groupSpace;
	if (merged.currentThreadTs == null && opts.threadId != null && opts.threadId !== "" && opts.threadId !== null) merged.currentThreadTs = String(opts.threadId);
	if (!merged.currentChannelId && opts.to) {
		const trimmedTo = opts.to.trim();
		if (trimmedTo) merged.currentChannelId = trimmedTo;
	}
	return merged;
}
//#endregion
//#region src/agents/command/session-store.ts
function resolveNonNegativeNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
async function updateSessionStoreAfterAgentRun(params) {
	const { cfg, sessionId, sessionKey, storePath, sessionStore, defaultProvider, defaultModel, fallbackProvider, fallbackModel, result } = params;
	const usage = result.meta.agentMeta?.usage;
	const promptTokens = result.meta.agentMeta?.promptTokens;
	const compactionsThisRun = Math.max(0, result.meta.agentMeta?.compactionCount ?? 0);
	const modelUsed = result.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
	const providerUsed = result.meta.agentMeta?.provider ?? fallbackProvider ?? defaultProvider;
	const contextTokens = resolveContextTokensForModel({
		cfg,
		provider: providerUsed,
		model: modelUsed,
		contextTokensOverride: params.contextTokensOverride,
		fallbackContextTokens: 2e5,
		allowAsyncLoad: false
	}) ?? 2e5;
	const entry = sessionStore[sessionKey] ?? {
		sessionId,
		updatedAt: Date.now()
	};
	const next = {
		...entry,
		sessionId,
		updatedAt: Date.now(),
		contextTokens
	};
	setSessionRuntimeModel(next, {
		provider: providerUsed,
		model: modelUsed
	});
	next.abortedLastRun = result.meta.aborted ?? false;
	if (result.meta.systemPromptReport) next.systemPromptReport = result.meta.systemPromptReport;
	if (hasNonzeroUsage(usage)) {
		const input = usage.input ?? 0;
		const output = usage.output ?? 0;
		const totalTokens = deriveSessionTotalTokens({
			usage: promptTokens ? void 0 : usage,
			contextTokens,
			promptTokens
		});
		const runEstimatedCostUsd = resolveNonNegativeNumber(estimateUsageCost({
			usage,
			cost: resolveModelCostConfig({
				provider: providerUsed,
				model: modelUsed,
				config: cfg
			})
		}));
		next.inputTokens = input;
		next.outputTokens = output;
		if (typeof totalTokens === "number" && Number.isFinite(totalTokens) && totalTokens > 0) {
			next.totalTokens = totalTokens;
			next.totalTokensFresh = true;
		} else {
			next.totalTokens = void 0;
			next.totalTokensFresh = false;
		}
		next.cacheRead = usage.cacheRead ?? 0;
		next.cacheWrite = usage.cacheWrite ?? 0;
		if (runEstimatedCostUsd !== void 0) next.estimatedCostUsd = (resolveNonNegativeNumber(entry.estimatedCostUsd) ?? 0) + runEstimatedCostUsd;
	}
	if (compactionsThisRun > 0) next.compactionCount = (entry.compactionCount ?? 0) + compactionsThisRun;
	sessionStore[sessionKey] = await updateSessionStore(storePath, (store) => {
		const merged = mergeSessionEntry(store[sessionKey], next);
		store[sessionKey] = merged;
		return merged;
	});
}
//#endregion
//#region src/sessions/session-id-resolution.ts
function normalizeLookupKey(value) {
	return value.trim().toLowerCase();
}
function compareNormalizedUpdatedAtDescending(a, b) {
	return (b.entry?.updatedAt ?? 0) - (a.entry?.updatedAt ?? 0);
}
function compareStoreKeys(a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}
function normalizeSessionIdMatches(matches, normalizedSessionId) {
	return matches.map(([sessionKey, entry]) => {
		const normalizedSessionKey = normalizeLookupKey(sessionKey);
		const normalizedRequestKey = normalizeLookupKey(toAgentRequestSessionKey(sessionKey) ?? sessionKey);
		return {
			sessionKey,
			entry,
			normalizedSessionKey,
			normalizedRequestKey,
			isCanonicalSessionKey: sessionKey === normalizedSessionKey,
			isStructural: normalizedSessionKey.endsWith(`:${normalizedSessionId}`) || normalizedRequestKey === normalizedSessionId || normalizedRequestKey.endsWith(`:${normalizedSessionId}`)
		};
	});
}
function collapseAliasMatches(matches) {
	const grouped = /* @__PURE__ */ new Map();
	for (const match of matches) {
		const bucket = grouped.get(match.normalizedRequestKey);
		if (bucket) bucket.push(match);
		else grouped.set(match.normalizedRequestKey, [match]);
	}
	return Array.from(grouped.values(), (group) => {
		if (group.length === 1) return group[0];
		return [...group].toSorted((a, b) => {
			const timeDiff = compareNormalizedUpdatedAtDescending(a, b);
			if (timeDiff !== 0) return timeDiff;
			if (a.isCanonicalSessionKey !== b.isCanonicalSessionKey) return a.isCanonicalSessionKey ? -1 : 1;
			return compareStoreKeys(a.normalizedSessionKey, b.normalizedSessionKey);
		})[0];
	});
}
function selectFreshestUniqueMatch(matches) {
	if (matches.length === 1) return matches[0];
	const [freshest, secondFreshest] = [...matches].toSorted(compareNormalizedUpdatedAtDescending);
	if ((freshest?.entry?.updatedAt ?? 0) > (secondFreshest?.entry?.updatedAt ?? 0)) return freshest;
}
function resolveSessionIdMatchSelection(matches, sessionId) {
	if (matches.length === 0) return { kind: "none" };
	const canonicalMatches = collapseAliasMatches(normalizeSessionIdMatches(matches, normalizeLookupKey(sessionId)));
	if (canonicalMatches.length === 1) return {
		kind: "selected",
		sessionKey: canonicalMatches[0].sessionKey
	};
	const structuralMatches = canonicalMatches.filter((match) => match.isStructural);
	const selectedStructuralMatch = selectFreshestUniqueMatch(structuralMatches);
	if (selectedStructuralMatch) return {
		kind: "selected",
		sessionKey: selectedStructuralMatch.sessionKey
	};
	if (structuralMatches.length > 1) return {
		kind: "ambiguous",
		sessionKeys: structuralMatches.map((match) => match.sessionKey)
	};
	const selectedCanonicalMatch = selectFreshestUniqueMatch(canonicalMatches);
	if (selectedCanonicalMatch) return {
		kind: "selected",
		sessionKey: selectedCanonicalMatch.sessionKey
	};
	return {
		kind: "ambiguous",
		sessionKeys: canonicalMatches.map((match) => match.sessionKey)
	};
}
function resolvePreferredSessionKeyForSessionIdMatches(matches, sessionId) {
	const selection = resolveSessionIdMatchSelection(matches, sessionId);
	return selection.kind === "selected" ? selection.sessionKey : void 0;
}
//#endregion
//#region src/agents/command/session.ts
function buildExplicitSessionIdSessionKey(params) {
	return `agent:${normalizeAgentId(params.agentId)}:explicit:${params.sessionId.trim()}`;
}
function collectSessionIdMatchesForRequest(opts) {
	const matches = [];
	const primaryStoreMatches = [];
	const storeByKey = /* @__PURE__ */ new Map();
	const addMatches = (candidateStore, candidateStorePath, options) => {
		for (const [candidateKey, candidateEntry] of Object.entries(candidateStore)) {
			if (candidateEntry?.sessionId !== opts.sessionId) continue;
			matches.push([candidateKey, candidateEntry]);
			if (options?.primary) primaryStoreMatches.push([candidateKey, candidateEntry]);
			storeByKey.set(candidateKey, {
				sessionKey: candidateKey,
				sessionStore: candidateStore,
				storePath: candidateStorePath
			});
		}
	};
	addMatches(opts.sessionStore, opts.storePath, { primary: true });
	for (const agentId of listAgentIds(opts.cfg)) {
		if (agentId === opts.storeAgentId) continue;
		const candidateStorePath = resolveStorePath(opts.cfg.session?.store, { agentId });
		addMatches(loadSessionStore(candidateStorePath), candidateStorePath);
	}
	return {
		matches,
		primaryStoreMatches,
		storeByKey
	};
}
function resolveSessionKeyForRequest(opts) {
	const sessionCfg = opts.cfg.session;
	const scope = sessionCfg?.scope ?? "per-sender";
	const mainKey = normalizeMainKey(sessionCfg?.mainKey);
	const explicitSessionKey = opts.sessionKey?.trim() || resolveExplicitAgentSessionKey({
		cfg: opts.cfg,
		agentId: opts.agentId
	});
	const storeAgentId = resolveAgentIdFromSessionKey(explicitSessionKey);
	const storePath = resolveStorePath(sessionCfg?.store, { agentId: storeAgentId });
	const sessionStore = loadSessionStore(storePath);
	const ctx = opts.to?.trim() ? { From: opts.to } : void 0;
	let sessionKey = explicitSessionKey ?? (ctx ? resolveSessionKey(scope, ctx, mainKey) : void 0);
	if (opts.sessionId && !explicitSessionKey && (!sessionKey || sessionStore[sessionKey]?.sessionId !== opts.sessionId)) {
		const { matches, primaryStoreMatches, storeByKey } = collectSessionIdMatchesForRequest({
			cfg: opts.cfg,
			sessionStore,
			storePath,
			storeAgentId,
			sessionId: opts.sessionId
		});
		const preferredSelection = resolveSessionIdMatchSelection(matches, opts.sessionId);
		const currentStoreSelection = preferredSelection.kind === "selected" ? preferredSelection : resolveSessionIdMatchSelection(primaryStoreMatches, opts.sessionId);
		if (currentStoreSelection.kind === "selected") {
			const preferred = storeByKey.get(currentStoreSelection.sessionKey);
			if (preferred) return preferred;
			sessionKey = currentStoreSelection.sessionKey;
		}
	}
	if (opts.sessionId && !sessionKey) sessionKey = buildExplicitSessionIdSessionKey({
		sessionId: opts.sessionId,
		agentId: opts.agentId
	});
	return {
		sessionKey,
		sessionStore,
		storePath
	};
}
function resolveSession(opts) {
	const sessionCfg = opts.cfg.session;
	const { sessionKey, sessionStore, storePath } = resolveSessionKeyForRequest({
		cfg: opts.cfg,
		to: opts.to,
		sessionId: opts.sessionId,
		sessionKey: opts.sessionKey,
		agentId: opts.agentId
	});
	const now = Date.now();
	const sessionEntry = sessionKey ? sessionStore[sessionKey] : void 0;
	const resetPolicy = resolveSessionResetPolicy({
		sessionCfg,
		resetType: resolveSessionResetType({ sessionKey }),
		resetOverride: resolveChannelResetConfig({
			sessionCfg,
			channel: sessionEntry?.lastChannel ?? sessionEntry?.channel ?? sessionEntry?.origin?.provider
		})
	});
	const fresh = sessionEntry ? evaluateSessionFreshness({
		updatedAt: sessionEntry.updatedAt,
		now,
		policy: resetPolicy
	}).fresh : false;
	const sessionId = opts.sessionId?.trim() || (fresh ? sessionEntry?.sessionId : void 0) || crypto.randomUUID();
	const isNewSession = !fresh && !opts.sessionId;
	clearBootstrapSnapshotOnSessionRollover({
		sessionKey,
		previousSessionId: isNewSession ? sessionEntry?.sessionId : void 0
	});
	return {
		sessionId,
		sessionKey,
		sessionEntry,
		sessionStore,
		storePath,
		isNewSession,
		persistedThinking: fresh && sessionEntry?.thinkingLevel ? normalizeThinkLevel(sessionEntry.thinkingLevel) : void 0,
		persistedVerbose: fresh && sessionEntry?.verboseLevel ? normalizeVerboseLevel(sessionEntry.verboseLevel) : void 0
	};
}
//#endregion
//#region src/agents/agent-command.ts
const log = createSubsystemLogger("agents/agent-command");
const OVERRIDE_FIELDS_CLEARED_BY_DELETE = [
	"providerOverride",
	"modelOverride",
	"authProfileOverride",
	"authProfileOverrideSource",
	"authProfileOverrideCompactionCount",
	"fallbackNoticeSelectedModel",
	"fallbackNoticeActiveModel",
	"fallbackNoticeReason"
];
const OVERRIDE_VALUE_MAX_LENGTH = 256;
async function persistSessionEntry(params) {
	await persistSessionEntry$1({
		...params,
		clearedFields: OVERRIDE_FIELDS_CLEARED_BY_DELETE
	});
}
function containsControlCharacters(value) {
	for (const char of value) {
		const code = char.codePointAt(0);
		if (code === void 0) continue;
		if (code <= 31 || code >= 127 && code <= 159) return true;
	}
	return false;
}
function normalizeExplicitOverrideInput(raw, kind) {
	const trimmed = raw.trim();
	const label = kind === "provider" ? "Provider" : "Model";
	if (!trimmed) throw new Error(`${label} override must be non-empty.`);
	if (trimmed.length > OVERRIDE_VALUE_MAX_LENGTH) throw new Error(`${label} override exceeds ${String(OVERRIDE_VALUE_MAX_LENGTH)} characters.`);
	if (containsControlCharacters(trimmed)) throw new Error(`${label} override contains invalid control characters.`);
	return trimmed;
}
async function prepareAgentCommandExecution(opts, runtime) {
	const message = opts.message ?? "";
	if (!message.trim()) throw new Error("Message (--message) is required");
	const body = prependInternalEventContext(message, opts.internalEvents);
	if (!opts.to && !opts.sessionId && !opts.sessionKey && !opts.agentId) throw new Error("Pass --to <E.164>, --session-id, or --agent to choose a session");
	const loadedRaw = loadConfig();
	const sourceConfig = await (async () => {
		try {
			const { snapshot } = await readConfigFileSnapshotForWrite();
			if (snapshot.valid) return snapshot.resolved;
		} catch {}
		return loadedRaw;
	})();
	const { resolvedConfig: cfg, diagnostics } = await resolveCommandSecretRefsViaGateway({
		config: loadedRaw,
		commandName: "agent",
		targetIds: getAgentRuntimeCommandSecretTargetIds()
	});
	setRuntimeConfigSnapshot(cfg, sourceConfig);
	const normalizedSpawned = normalizeSpawnedRunMetadata({
		spawnedBy: opts.spawnedBy,
		groupId: opts.groupId,
		groupChannel: opts.groupChannel,
		groupSpace: opts.groupSpace,
		workspaceDir: opts.workspaceDir
	});
	for (const entry of diagnostics) runtime.log(`[secrets] ${entry}`);
	const agentIdOverrideRaw = opts.agentId?.trim();
	const agentIdOverride = agentIdOverrideRaw ? normalizeAgentId(agentIdOverrideRaw) : void 0;
	if (agentIdOverride) {
		if (!listAgentIds(cfg).includes(agentIdOverride)) throw new Error(`Unknown agent id "${agentIdOverrideRaw}". Use "${formatCliCommand("openclaw agents list")}" to see configured agents.`);
	}
	if (agentIdOverride && opts.sessionKey) {
		const sessionAgentId = resolveAgentIdFromSessionKey(opts.sessionKey);
		if (sessionAgentId !== agentIdOverride) throw new Error(`Agent id "${agentIdOverrideRaw}" does not match session key agent "${sessionAgentId}".`);
	}
	const agentCfg = cfg.agents?.defaults;
	const configuredModel = resolveConfiguredModelRef({
		cfg,
		defaultProvider: DEFAULT_PROVIDER,
		defaultModel: DEFAULT_MODEL
	});
	const thinkingLevelsHint = formatThinkingLevels(configuredModel.provider, configuredModel.model);
	const thinkOverride = normalizeThinkLevel(opts.thinking);
	const thinkOnce = normalizeThinkLevel(opts.thinkingOnce);
	if (opts.thinking && !thinkOverride) throw new Error(`Invalid thinking level. Use one of: ${thinkingLevelsHint}.`);
	if (opts.thinkingOnce && !thinkOnce) throw new Error(`Invalid one-shot thinking level. Use one of: ${thinkingLevelsHint}.`);
	const verboseOverride = normalizeVerboseLevel(opts.verbose);
	if (opts.verbose && !verboseOverride) throw new Error("Invalid verbose level. Use \"on\", \"full\", or \"off\".");
	const isSubagentLane = (typeof opts.lane === "string" ? opts.lane.trim() : "") === String(AGENT_LANE_SUBAGENT);
	const timeoutSecondsRaw = opts.timeout !== void 0 ? Number.parseInt(String(opts.timeout), 10) : isSubagentLane ? 0 : void 0;
	if (timeoutSecondsRaw !== void 0 && (Number.isNaN(timeoutSecondsRaw) || timeoutSecondsRaw < 0)) throw new Error("--timeout must be a non-negative integer (seconds; 0 means no timeout)");
	const timeoutMs = resolveAgentTimeoutMs({
		cfg,
		overrideSeconds: timeoutSecondsRaw
	});
	const { sessionId, sessionKey, sessionEntry: sessionEntryRaw, sessionStore, storePath, isNewSession, persistedThinking, persistedVerbose } = resolveSession({
		cfg,
		to: opts.to,
		sessionId: opts.sessionId,
		sessionKey: opts.sessionKey,
		agentId: agentIdOverride
	});
	const sessionAgentId = agentIdOverride ?? resolveSessionAgentId({
		sessionKey: sessionKey ?? opts.sessionKey?.trim(),
		config: cfg
	});
	const outboundSession = buildOutboundSessionContext({
		cfg,
		agentId: sessionAgentId,
		sessionKey
	});
	const workspaceDirRaw = normalizedSpawned.workspaceDir ?? resolveAgentWorkspaceDir(cfg, sessionAgentId);
	const agentDir = resolveAgentDir(cfg, sessionAgentId);
	const workspaceDir = (await ensureAgentWorkspace({
		dir: workspaceDirRaw,
		ensureBootstrapFiles: !agentCfg?.skipBootstrap
	})).dir;
	const runId = opts.runId?.trim() || sessionId;
	const acpManager = getAcpSessionManager();
	return {
		body,
		cfg,
		normalizedSpawned,
		agentCfg,
		thinkOverride,
		thinkOnce,
		verboseOverride,
		timeoutMs,
		sessionId,
		sessionKey,
		sessionEntry: sessionEntryRaw,
		sessionStore,
		storePath,
		isNewSession,
		persistedThinking,
		persistedVerbose,
		sessionAgentId,
		outboundSession,
		workspaceDir,
		agentDir,
		runId,
		acpManager,
		acpResolution: sessionKey ? acpManager.resolveSession({
			cfg,
			sessionKey
		}) : null
	};
}
async function agentCommandInternal(opts, runtime = defaultRuntime, deps = createDefaultDeps()) {
	const prepared = await prepareAgentCommandExecution(opts, runtime);
	const { body, cfg, normalizedSpawned, agentCfg, thinkOverride, thinkOnce, verboseOverride, timeoutMs, sessionId, sessionKey, sessionStore, storePath, isNewSession, persistedThinking, persistedVerbose, sessionAgentId, outboundSession, workspaceDir, agentDir, runId, acpManager, acpResolution } = prepared;
	let sessionEntry = prepared.sessionEntry;
	try {
		if (opts.deliver === true) {
			if (resolveSendPolicy({
				cfg,
				entry: sessionEntry,
				sessionKey,
				channel: sessionEntry?.channel,
				chatType: sessionEntry?.chatType
			}) === "deny") throw new Error("send blocked by session policy");
		}
		if (acpResolution?.kind === "stale") throw acpResolution.error;
		if (acpResolution?.kind === "ready" && sessionKey) {
			const startedAt = Date.now();
			registerAgentRunContext(runId, { sessionKey });
			emitAcpLifecycleStart({
				runId,
				startedAt
			});
			const visibleTextAccumulator = createAcpVisibleTextAccumulator();
			let stopReason;
			try {
				const dispatchPolicyError = resolveAcpDispatchPolicyError(cfg);
				if (dispatchPolicyError) throw dispatchPolicyError;
				const agentPolicyError = resolveAcpAgentPolicyError(cfg, normalizeAgentId(acpResolution.meta.agent || resolveAgentIdFromSessionKey(sessionKey)));
				if (agentPolicyError) throw agentPolicyError;
				await acpManager.runTurn({
					cfg,
					sessionKey,
					text: body,
					mode: "prompt",
					requestId: runId,
					signal: opts.abortSignal,
					onEvent: (event) => {
						if (event.type === "done") {
							stopReason = event.stopReason;
							return;
						}
						if (event.type !== "text_delta") return;
						if (event.stream && event.stream !== "output") return;
						if (!event.text) return;
						const visibleUpdate = visibleTextAccumulator.consume(event.text);
						if (!visibleUpdate) return;
						emitAcpAssistantDelta({
							runId,
							text: visibleUpdate.text,
							delta: visibleUpdate.delta
						});
					}
				});
			} catch (error) {
				const acpError = toAcpRuntimeError({
					error,
					fallbackCode: "ACP_TURN_FAILED",
					fallbackMessage: "ACP turn failed before completion."
				});
				emitAcpLifecycleError({
					runId,
					message: acpError.message
				});
				throw acpError;
			}
			emitAcpLifecycleEnd({ runId });
			const finalTextRaw = visibleTextAccumulator.finalizeRaw();
			const finalText = visibleTextAccumulator.finalize();
			try {
				sessionEntry = await persistAcpTurnTranscript({
					body,
					finalText: finalTextRaw,
					sessionId,
					sessionKey,
					sessionEntry,
					sessionStore,
					storePath,
					sessionAgentId,
					threadId: opts.threadId,
					sessionCwd: resolveAcpSessionCwd(acpResolution.meta) ?? workspaceDir
				});
			} catch (error) {
				log.warn(`ACP transcript persistence failed for ${sessionKey}: ${error instanceof Error ? error.message : String(error)}`);
			}
			const result = buildAcpResult({
				payloadText: finalText,
				startedAt,
				stopReason,
				abortSignal: opts.abortSignal
			});
			const payloads = result.payloads;
			return await deliverAgentCommandResult({
				cfg,
				deps,
				runtime,
				opts,
				outboundSession,
				sessionEntry,
				result,
				payloads
			});
		}
		let resolvedThinkLevel = thinkOnce ?? thinkOverride ?? persistedThinking;
		const resolvedVerboseLevel = verboseOverride ?? persistedVerbose ?? agentCfg?.verboseDefault;
		if (sessionKey) registerAgentRunContext(runId, {
			sessionKey,
			verboseLevel: resolvedVerboseLevel
		});
		const skillsSnapshotVersion = getSkillsSnapshotVersion(workspaceDir);
		const skillFilter = resolveAgentSkillsFilter(cfg, sessionAgentId);
		const currentSkillsSnapshot = sessionEntry?.skillsSnapshot;
		const shouldRefreshSkillsSnapshot = !currentSkillsSnapshot || shouldRefreshSnapshotForVersion(currentSkillsSnapshot.version, skillsSnapshotVersion) || !matchesSkillFilter(currentSkillsSnapshot.skillFilter, skillFilter);
		const needsSkillsSnapshot = isNewSession || shouldRefreshSkillsSnapshot;
		const skillsSnapshot = needsSkillsSnapshot ? buildWorkspaceSkillSnapshot(workspaceDir, {
			config: cfg,
			eligibility: { remote: getRemoteSkillEligibility({ advertiseExecNode: canExecRequestNode({
				cfg,
				sessionEntry,
				sessionKey,
				agentId: sessionAgentId
			}) }) },
			snapshotVersion: skillsSnapshotVersion,
			skillFilter,
			agentId: sessionAgentId
		}) : currentSkillsSnapshot;
		if (skillsSnapshot && sessionStore && sessionKey && needsSkillsSnapshot) {
			const next = {
				...sessionEntry ?? {
					sessionId,
					updatedAt: Date.now()
				},
				sessionId,
				updatedAt: Date.now(),
				skillsSnapshot
			};
			await persistSessionEntry({
				sessionStore,
				sessionKey,
				storePath,
				entry: next
			});
			sessionEntry = next;
		}
		if (sessionStore && sessionKey) {
			const next = {
				...sessionStore[sessionKey] ?? sessionEntry ?? {
					sessionId,
					updatedAt: Date.now()
				},
				sessionId,
				updatedAt: Date.now()
			};
			if (thinkOverride) next.thinkingLevel = thinkOverride;
			applyVerboseOverride(next, verboseOverride);
			await persistSessionEntry({
				sessionStore,
				sessionKey,
				storePath,
				entry: next
			});
			sessionEntry = next;
		}
		const configuredDefaultRef = resolveDefaultModelForAgent({
			cfg,
			agentId: sessionAgentId
		});
		const { provider: defaultProvider, model: defaultModel } = normalizeModelRef(configuredDefaultRef.provider, configuredDefaultRef.model);
		let provider = defaultProvider;
		let model = defaultModel;
		const hasAllowlist = agentCfg?.models && Object.keys(agentCfg.models).length > 0;
		const hasStoredOverride = Boolean(sessionEntry?.modelOverride || sessionEntry?.providerOverride);
		const explicitProviderOverride = typeof opts.provider === "string" ? normalizeExplicitOverrideInput(opts.provider, "provider") : void 0;
		const explicitModelOverride = typeof opts.model === "string" ? normalizeExplicitOverrideInput(opts.model, "model") : void 0;
		const hasExplicitRunOverride = Boolean(explicitProviderOverride || explicitModelOverride);
		if (hasExplicitRunOverride && opts.allowModelOverride !== true) throw new Error("Model override is not authorized for this caller.");
		const needsModelCatalog = hasAllowlist || hasStoredOverride || hasExplicitRunOverride;
		let allowedModelKeys = /* @__PURE__ */ new Set();
		let allowedModelCatalog = [];
		let modelCatalog = null;
		let allowAnyModel = false;
		if (needsModelCatalog) {
			modelCatalog = await loadModelCatalog({ config: cfg });
			const allowed = buildAllowedModelSet({
				cfg,
				catalog: modelCatalog,
				defaultProvider,
				defaultModel,
				agentId: sessionAgentId
			});
			allowedModelKeys = allowed.allowedKeys;
			allowedModelCatalog = allowed.allowedCatalog;
			allowAnyModel = allowed.allowAny ?? false;
		}
		if (sessionEntry && sessionStore && sessionKey && hasStoredOverride) {
			const entry = sessionEntry;
			const overrideProvider = sessionEntry.providerOverride?.trim() || defaultProvider;
			const overrideModel = sessionEntry.modelOverride?.trim();
			if (overrideModel) {
				const normalizedOverride = normalizeModelRef(overrideProvider, overrideModel);
				const key = modelKey(normalizedOverride.provider, normalizedOverride.model);
				if (!allowAnyModel && !allowedModelKeys.has(key)) {
					const { updated } = applyModelOverrideToSessionEntry({
						entry,
						selection: {
							provider: defaultProvider,
							model: defaultModel,
							isDefault: true
						}
					});
					if (updated) await persistSessionEntry({
						sessionStore,
						sessionKey,
						storePath,
						entry
					});
				}
			}
		}
		const storedProviderOverride = sessionEntry?.providerOverride?.trim();
		let storedModelOverride = sessionEntry?.modelOverride?.trim();
		if (storedModelOverride) {
			const normalizedStored = normalizeModelRef(storedProviderOverride || defaultProvider, storedModelOverride);
			const key = modelKey(normalizedStored.provider, normalizedStored.model);
			if (allowAnyModel || allowedModelKeys.has(key)) {
				provider = normalizedStored.provider;
				model = normalizedStored.model;
			}
		}
		let providerForAuthProfileValidation = provider;
		if (hasExplicitRunOverride) {
			const explicitRef = explicitModelOverride ? explicitProviderOverride ? normalizeModelRef(explicitProviderOverride, explicitModelOverride) : parseModelRef(explicitModelOverride, provider) : explicitProviderOverride ? normalizeModelRef(explicitProviderOverride, model) : null;
			if (!explicitRef) throw new Error("Invalid model override.");
			const explicitKey = modelKey(explicitRef.provider, explicitRef.model);
			if (!allowAnyModel && !allowedModelKeys.has(explicitKey)) throw new Error(`Model override "${sanitizeForLog(explicitRef.provider)}/${sanitizeForLog(explicitRef.model)}" is not allowed for agent "${sessionAgentId}".`);
			provider = explicitRef.provider;
			model = explicitRef.model;
		}
		if (sessionEntry) {
			const authProfileId = sessionEntry.authProfileOverride;
			if (authProfileId) {
				const entry = sessionEntry;
				const profile = ensureAuthProfileStore().profiles[authProfileId];
				if (!profile || profile.provider !== providerForAuthProfileValidation) {
					if (sessionStore && sessionKey) await clearSessionAuthProfileOverride({
						sessionEntry: entry,
						sessionStore,
						sessionKey,
						storePath
					});
				}
			}
		}
		if (!resolvedThinkLevel) {
			let catalogForThinking = modelCatalog ?? allowedModelCatalog;
			if (!catalogForThinking || catalogForThinking.length === 0) {
				modelCatalog = await loadModelCatalog({ config: cfg });
				catalogForThinking = modelCatalog;
			}
			resolvedThinkLevel = resolveThinkingDefault({
				cfg,
				provider,
				model,
				catalog: catalogForThinking
			});
		}
		if (resolvedThinkLevel === "xhigh" && !supportsXHighThinking(provider, model)) {
			if (Boolean(thinkOnce || thinkOverride)) throw new Error(`Thinking level "xhigh" is only supported for ${formatXHighModelHint()}.`);
			resolvedThinkLevel = "high";
			if (sessionEntry && sessionStore && sessionKey && sessionEntry.thinkingLevel === "xhigh") {
				const entry = sessionEntry;
				entry.thinkingLevel = "high";
				entry.updatedAt = Date.now();
				await persistSessionEntry({
					sessionStore,
					sessionKey,
					storePath,
					entry
				});
			}
		}
		let sessionFile;
		if (sessionStore && sessionKey) {
			const resolvedSessionFile = await resolveSessionTranscriptFile({
				sessionId,
				sessionKey,
				sessionStore,
				storePath,
				sessionEntry,
				agentId: sessionAgentId,
				threadId: opts.threadId
			});
			sessionFile = resolvedSessionFile.sessionFile;
			sessionEntry = resolvedSessionFile.sessionEntry;
		}
		if (!sessionFile) {
			const resolvedSessionFile = await resolveSessionTranscriptFile({
				sessionId,
				sessionKey: sessionKey ?? sessionId,
				storePath,
				sessionEntry,
				agentId: sessionAgentId,
				threadId: opts.threadId
			});
			sessionFile = resolvedSessionFile.sessionFile;
			sessionEntry = resolvedSessionFile.sessionEntry;
		}
		const startedAt = Date.now();
		let lifecycleEnded = false;
		let result;
		let fallbackProvider = provider;
		let fallbackModel = model;
		const MAX_LIVE_SWITCH_RETRIES = 5;
		let liveSwitchRetries = 0;
		for (;;) try {
			const runContext = resolveAgentRunContext(opts);
			const messageChannel = resolveMessageChannel(runContext.messageChannel, opts.replyChannel ?? opts.channel);
			const spawnedBy = normalizedSpawned.spawnedBy ?? sessionEntry?.spawnedBy;
			const effectiveFallbacksOverride = resolveEffectiveModelFallbacks({
				cfg,
				agentId: sessionAgentId,
				hasSessionModelOverride: Boolean(storedModelOverride)
			});
			let fallbackAttemptIndex = 0;
			const fallbackResult = await runWithModelFallback({
				cfg,
				provider,
				model,
				runId,
				agentDir,
				fallbacksOverride: effectiveFallbacksOverride,
				run: async (providerOverride, modelOverride, runOptions) => {
					const isFallbackRetry = fallbackAttemptIndex > 0;
					fallbackAttemptIndex += 1;
					return runAgentAttempt({
						providerOverride,
						modelOverride,
						cfg,
						sessionEntry,
						sessionId,
						sessionKey,
						sessionAgentId,
						sessionFile,
						workspaceDir,
						body,
						isFallbackRetry,
						resolvedThinkLevel,
						timeoutMs,
						runId,
						opts,
						runContext,
						spawnedBy,
						messageChannel,
						skillsSnapshot,
						resolvedVerboseLevel,
						agentDir,
						authProfileProvider: providerForAuthProfileValidation,
						sessionStore,
						storePath,
						allowTransientCooldownProbe: runOptions?.allowTransientCooldownProbe,
						sessionHasHistory: !isNewSession || await sessionFileHasContent(sessionFile),
						onAgentEvent: (evt) => {
							if (evt.stream === "lifecycle" && typeof evt.data?.phase === "string" && (evt.data.phase === "end" || evt.data.phase === "error")) lifecycleEnded = true;
						}
					});
				}
			});
			result = fallbackResult.result;
			fallbackProvider = fallbackResult.provider;
			fallbackModel = fallbackResult.model;
			if (!lifecycleEnded) {
				const stopReason = result.meta.stopReason;
				if (stopReason && stopReason !== "end_turn") console.error(`[agent] run ${runId} ended with stopReason=${stopReason}`);
				emitAgentEvent({
					runId,
					stream: "lifecycle",
					data: {
						phase: "end",
						startedAt,
						endedAt: Date.now(),
						aborted: result.meta.aborted ?? false,
						stopReason
					}
				});
			}
			break;
		} catch (err) {
			if (err instanceof LiveSessionModelSwitchError) {
				liveSwitchRetries++;
				if (liveSwitchRetries > MAX_LIVE_SWITCH_RETRIES) {
					log.error(`Live session model switch in subagent run ${runId}: exceeded maximum retries (${MAX_LIVE_SWITCH_RETRIES})`);
					if (!lifecycleEnded) emitAgentEvent({
						runId,
						stream: "lifecycle",
						data: {
							phase: "error",
							startedAt,
							endedAt: Date.now(),
							error: "Agent run failed"
						}
					});
					throw new Error(`Exceeded maximum live model switch retries (${MAX_LIVE_SWITCH_RETRIES})`, { cause: err });
				}
				const switchRef = normalizeModelRef(err.provider, err.model);
				const switchKey = modelKey(switchRef.provider, switchRef.model);
				if (!allowAnyModel && !allowedModelKeys.has(switchKey)) {
					log.info(`Live session model switch in subagent run ${runId}: rejected ${sanitizeForLog(err.provider)}/${sanitizeForLog(err.model)} (not in allowlist)`);
					if (!lifecycleEnded) emitAgentEvent({
						runId,
						stream: "lifecycle",
						data: {
							phase: "error",
							startedAt,
							endedAt: Date.now(),
							error: "Agent run failed"
						}
					});
					throw new Error(`Live model switch rejected: ${sanitizeForLog(err.provider)}/${sanitizeForLog(err.model)} is not in the agent allowlist`, { cause: err });
				}
				const previousProvider = provider;
				const previousModel = model;
				provider = err.provider;
				model = err.model;
				fallbackProvider = err.provider;
				fallbackModel = err.model;
				providerForAuthProfileValidation = err.provider;
				if (sessionEntry) {
					sessionEntry = { ...sessionEntry };
					sessionEntry.authProfileOverride = err.authProfileId;
					sessionEntry.authProfileOverrideSource = err.authProfileId ? err.authProfileIdSource : void 0;
					sessionEntry.authProfileOverrideCompactionCount = void 0;
				}
				if (storedModelOverride || err.model !== previousModel || err.provider !== previousProvider) storedModelOverride = err.model;
				lifecycleEnded = false;
				log.info(`Live session model switch in subagent run ${runId}: switching to ${sanitizeForLog(err.provider)}/${sanitizeForLog(err.model)}`);
				continue;
			}
			if (!lifecycleEnded) emitAgentEvent({
				runId,
				stream: "lifecycle",
				data: {
					phase: "error",
					startedAt,
					endedAt: Date.now(),
					error: err instanceof Error ? err.message : "Agent run failed"
				}
			});
			throw err;
		}
		if (sessionStore && sessionKey) await updateSessionStoreAfterAgentRun({
			cfg,
			contextTokensOverride: agentCfg?.contextTokens,
			sessionId,
			sessionKey,
			storePath,
			sessionStore,
			defaultProvider: provider,
			defaultModel: model,
			fallbackProvider,
			fallbackModel,
			result
		});
		const payloads = result.payloads ?? [];
		return await deliverAgentCommandResult({
			cfg,
			deps,
			runtime,
			opts,
			outboundSession,
			sessionEntry,
			result,
			payloads
		});
	} finally {
		clearAgentRunContext(runId);
	}
}
async function agentCommand(opts, runtime = defaultRuntime, deps = createDefaultDeps()) {
	return await agentCommandInternal({
		...opts,
		senderIsOwner: opts.senderIsOwner ?? true,
		allowModelOverride: opts.allowModelOverride ?? true
	}, runtime, deps);
}
async function agentCommandFromIngress(opts, runtime = defaultRuntime, deps = createDefaultDeps()) {
	if (typeof opts.senderIsOwner !== "boolean") throw new Error("senderIsOwner must be explicitly set for ingress agent runs.");
	if (typeof opts.allowModelOverride !== "boolean") throw new Error("allowModelOverride must be explicitly set for ingress agent runs.");
	return await agentCommandInternal({
		...opts,
		senderIsOwner: opts.senderIsOwner,
		allowModelOverride: opts.allowModelOverride
	}, runtime, deps);
}
//#endregion
export { resolveAgentDeliveryPlan as a, resolvePreferredSessionKeyForSessionIdMatches as i, agentCommandFromIngress as n, resolveAgentOutboundTarget as o, resolveSessionKeyForRequest as r, agentCommand as t };
