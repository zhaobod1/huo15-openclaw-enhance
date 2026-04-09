import { i as getChildLogger } from "../../logger-C-bijuBQ.js";
import { l as normalizeMainKey } from "../../session-key-BR3Z-ljs.js";
import { a as loadConfig } from "../../io-CS2J_l4V.js";
import { t as redactIdentifier } from "../../redact-identifier-PKOeqlX2.js";
import { c as updateSessionStore } from "../../store-Cx4GsUxp.js";
import { t as canonicalizeMainSessionAlias } from "../../main-session-D-BGz7Y3.js";
import { l as resolveStorePath } from "../../paths-UazeViO92.js";
import { a as resolveThreadFlag, i as resolveSessionResetType, n as resolveChannelResetConfig, r as resolveSessionResetPolicy, t as evaluateSessionFreshness } from "../../reset-C4TVXJqP.js";
import { n as resolveSessionKey } from "../../session-key-DqCyICpO.js";
import { t as loadSessionStore } from "../../store-load-CibBc4QB.js";
import { c as optimizeImageToPng } from "../../image-ops-DThsnXqU.js";
import { n as SILENT_REPLY_TOKEN, t as HEARTBEAT_TOKEN } from "../../tokens-wOGzQgw2.js";
import { n as HEARTBEAT_PROMPT, o as resolveHeartbeatPrompt, s as stripHeartbeatToken } from "../../heartbeat-D76mk7r3.js";
import { p as resolveSendableOutboundReplyParts, s as hasOutboundReplyContent } from "../../reply-payload-Dp5nBPsr.js";
import { i as LocalMediaAccessError, n as loadWebMediaRaw, o as getDefaultLocalRoots, r as optimizeImageToJpeg, t as loadWebMedia } from "../../web-media-Blt79Ld9.js";
import { t as appendCronStyleCurrentTimeLine } from "../../current-time-C1zXvUcB.js";
import "../../routing-DdBDhOmH.js";
import "../../text-runtime-DQoOM_co.js";
import "../../runtime-env-BLYCS7ta.js";
import "../../config-runtime-OuR9WVXH.js";
import { t as resolveHeartbeatReplyPayload } from "../../heartbeat-reply-payload-CGA2_hts.js";
import { t as getReplyFromConfig } from "../../reply-CxEVitwF.js";
import "../../reply-runtime-C61hmKmz.js";
import { n as emitHeartbeatEvent, o as resolveIndicatorType, t as resolveHeartbeatVisibility } from "../../heartbeat-visibility-DuIccTiw.js";
import "../../infra-runtime-DS3U08t7.js";
import "../../agent-runtime-fFOj5-ju.js";
import { n as resolveWebCredsBackupPath, r as resolveWebCredsPath, t as hasWebCredsSync } from "../../creds-files-7VMSa4da.js";
import { n as sendPollWhatsApp, o as resolveWhatsAppHeartbeatRecipients, r as sendReactionWhatsApp, t as sendMessageWhatsApp } from "../../send-lXVwx8YQ.js";
import { n as whatsAppActionRuntime, t as handleWhatsAppAction } from "../../action-runtime-Cqtq0wFI.js";
import { i as setActiveWebListener, n as requireActiveWebListener, r as resolveWebAccountId, t as getActiveWebListener } from "../../active-listener-6k7uzSfv.js";
import { t as createWhatsAppLoginTool } from "../../agent-tools-login-_c0iN9bo.js";
import { n as setWhatsAppRuntime } from "../../runtime-DvjCUocI.js";
import { a as maybeRestoreCredsFromBackup, c as readWebSelfId, d as webAuthExists, i as logoutWeb, l as readWebSelfIdentity, n as getWebAuthAgeMs, o as pickWebChannel, r as logWebSelfId, s as readCredsJsonRaw, t as WA_WEB_AUTH_DIR, u as resolveDefaultWebAuthDir } from "../../auth-store-DP2PtQzV.js";
import { t as DEFAULT_WEB_MEDIA_BYTES } from "../../constants-ChkQsOqH.js";
import { n as getStatusCode, t as formatError } from "../../session-errors-DolXkGj2.js";
import { a as extractMediaPlaceholder, c as whatsappHeartbeatLog, i as extractLocationData, l as newConnectionId$1, n as monitorWebChannel, o as extractText, r as monitorWebInbox, s as resetWebInboundDedupe, t as loginWeb } from "../../login-D1hxC8lt.js";
import { a as waitForWaConnection, i as waitForCredsSaveQueueWithTimeout, n as newConnectionId, r as waitForCredsSaveQueue, t as createWaSocket } from "../../session-Dh1rjDNV.js";
//#region extensions/whatsapp/src/auto-reply/session-snapshot.ts
function getSessionSnapshot(cfg, from, _isHeartbeat = false, ctx) {
	const sessionCfg = cfg.session;
	const scope = sessionCfg?.scope ?? "per-sender";
	const key = ctx?.sessionKey?.trim() ?? resolveSessionKey(scope, {
		From: from,
		To: "",
		Body: ""
	}, normalizeMainKey(sessionCfg?.mainKey));
	const entry = loadSessionStore(resolveStorePath(sessionCfg?.store))[key];
	const isThread = resolveThreadFlag({
		sessionKey: key,
		messageThreadId: ctx?.messageThreadId ?? null,
		threadLabel: ctx?.threadLabel ?? null,
		threadStarterBody: ctx?.threadStarterBody ?? null,
		parentSessionKey: ctx?.parentSessionKey ?? null
	});
	const resetType = resolveSessionResetType({
		sessionKey: key,
		isGroup: ctx?.isGroup,
		isThread
	});
	const resetPolicy = resolveSessionResetPolicy({
		sessionCfg,
		resetType,
		resetOverride: resolveChannelResetConfig({
			sessionCfg,
			channel: entry?.lastChannel ?? entry?.channel
		})
	});
	const now = Date.now();
	const freshness = entry ? evaluateSessionFreshness({
		updatedAt: entry.updatedAt,
		now,
		policy: resetPolicy
	}) : { fresh: false };
	return {
		key,
		entry,
		fresh: freshness.fresh,
		resetPolicy,
		resetType,
		dailyResetAt: freshness.dailyResetAt,
		idleExpiresAt: freshness.idleExpiresAt
	};
}
//#endregion
//#region extensions/whatsapp/src/auto-reply/heartbeat-runner.ts
function resolveDefaultAgentIdFromConfig(cfg) {
	const agents = cfg.agents?.list ?? [];
	return (agents.find((agent) => agent?.default)?.id ?? agents[0]?.id ?? "main").trim().toLowerCase() || "main";
}
async function runWebHeartbeatOnce(opts) {
	const { cfg: cfgOverride, to, verbose = false, sessionId, overrideBody, dryRun = false } = opts;
	const replyResolver = opts.replyResolver ?? getReplyFromConfig;
	const sender = opts.sender ?? sendMessageWhatsApp;
	const runId = newConnectionId$1();
	const redactedTo = redactIdentifier(to);
	const heartbeatLogger = getChildLogger({
		module: "web-heartbeat",
		runId,
		to: redactedTo
	});
	const cfg = cfgOverride ?? loadConfig();
	const visibility = resolveHeartbeatVisibility({
		cfg,
		channel: "whatsapp"
	});
	const heartbeatOkText = HEARTBEAT_TOKEN;
	const maybeSendHeartbeatOk = async () => {
		if (!visibility.showOk) return false;
		if (dryRun) {
			whatsappHeartbeatLog.info(`[dry-run] heartbeat ok -> ${redactedTo}`);
			return false;
		}
		const sendResult = await sender(to, heartbeatOkText, { verbose });
		heartbeatLogger.info({
			to: redactedTo,
			messageId: sendResult.messageId,
			chars: heartbeatOkText.length,
			reason: "heartbeat-ok"
		}, "heartbeat ok sent");
		whatsappHeartbeatLog.info(`heartbeat ok sent to ${redactedTo} (id ${sendResult.messageId})`);
		return true;
	};
	const sessionCfg = cfg.session;
	const sessionScope = sessionCfg?.scope ?? "per-sender";
	const mainKey = normalizeMainKey(sessionCfg?.mainKey);
	const rawSessionKey = resolveSessionKey(sessionScope, { From: to }, mainKey);
	const sessionKey = canonicalizeMainSessionAlias({
		cfg,
		agentId: resolveDefaultAgentIdFromConfig(cfg),
		sessionKey: rawSessionKey
	});
	if (sessionId) {
		const storePath = resolveStorePath(cfg.session?.store);
		const store = loadSessionStore(storePath);
		const current = store[sessionKey] ?? {};
		store[sessionKey] = {
			...current,
			sessionId,
			updatedAt: Date.now()
		};
		await updateSessionStore(storePath, (nextStore) => {
			nextStore[sessionKey] = {
				...nextStore[sessionKey] ?? current,
				sessionId,
				updatedAt: Date.now()
			};
		});
	}
	const sessionSnapshot = getSessionSnapshot(cfg, to, true, { sessionKey });
	if (verbose) heartbeatLogger.info({
		to: redactedTo,
		sessionKey: sessionSnapshot.key,
		sessionId: sessionId ?? sessionSnapshot.entry?.sessionId ?? null,
		sessionFresh: sessionSnapshot.fresh,
		resetMode: sessionSnapshot.resetPolicy.mode,
		resetAtHour: sessionSnapshot.resetPolicy.atHour,
		idleMinutes: sessionSnapshot.resetPolicy.idleMinutes ?? null,
		dailyResetAt: sessionSnapshot.dailyResetAt ?? null,
		idleExpiresAt: sessionSnapshot.idleExpiresAt ?? null
	}, "heartbeat session snapshot");
	if (overrideBody && overrideBody.trim().length === 0) throw new Error("Override body must be non-empty when provided.");
	try {
		if (overrideBody) {
			if (dryRun) {
				whatsappHeartbeatLog.info(`[dry-run] web send -> ${redactedTo} (${overrideBody.trim().length} chars, manual message)`);
				return;
			}
			const sendResult = await sender(to, overrideBody, { verbose });
			emitHeartbeatEvent({
				status: "sent",
				to,
				preview: overrideBody.slice(0, 160),
				hasMedia: false,
				channel: "whatsapp",
				indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : void 0
			});
			heartbeatLogger.info({
				to: redactedTo,
				messageId: sendResult.messageId,
				chars: overrideBody.length,
				reason: "manual-message"
			}, "manual heartbeat message sent");
			whatsappHeartbeatLog.info(`manual heartbeat sent to ${redactedTo} (id ${sendResult.messageId})`);
			return;
		}
		if (!visibility.showAlerts && !visibility.showOk && !visibility.useIndicator) {
			heartbeatLogger.info({
				to: redactedTo,
				reason: "alerts-disabled"
			}, "heartbeat skipped");
			emitHeartbeatEvent({
				status: "skipped",
				to,
				reason: "alerts-disabled",
				channel: "whatsapp"
			});
			return;
		}
		const replyPayload = resolveHeartbeatReplyPayload(await replyResolver({
			Body: appendCronStyleCurrentTimeLine(resolveHeartbeatPrompt(cfg.agents?.defaults?.heartbeat?.prompt), cfg, Date.now()),
			From: to,
			To: to,
			MessageSid: sessionId ?? sessionSnapshot.entry?.sessionId
		}, { isHeartbeat: true }, cfg));
		if (!replyPayload || !hasOutboundReplyContent(replyPayload)) {
			heartbeatLogger.info({
				to: redactedTo,
				reason: "empty-reply",
				sessionId: sessionSnapshot.entry?.sessionId ?? null
			}, "heartbeat skipped");
			emitHeartbeatEvent({
				status: "ok-empty",
				to,
				channel: "whatsapp",
				silent: !await maybeSendHeartbeatOk(),
				indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-empty") : void 0
			});
			return;
		}
		const reply = resolveSendableOutboundReplyParts(replyPayload);
		const hasMedia = reply.hasMedia;
		const ackMaxChars = Math.max(0, cfg.agents?.defaults?.heartbeat?.ackMaxChars ?? 300);
		const stripped = stripHeartbeatToken(replyPayload.text, {
			mode: "heartbeat",
			maxAckChars: ackMaxChars
		});
		if (stripped.shouldSkip && !hasMedia) {
			const storePath = resolveStorePath(cfg.session?.store);
			const store = loadSessionStore(storePath);
			if (sessionSnapshot.entry && store[sessionSnapshot.key]) {
				store[sessionSnapshot.key].updatedAt = sessionSnapshot.entry.updatedAt;
				await updateSessionStore(storePath, (nextStore) => {
					const nextEntry = nextStore[sessionSnapshot.key];
					if (!nextEntry) return;
					nextStore[sessionSnapshot.key] = {
						...nextEntry,
						updatedAt: sessionSnapshot.entry.updatedAt
					};
				});
			}
			heartbeatLogger.info({
				to: redactedTo,
				reason: "heartbeat-token",
				rawLength: replyPayload.text?.length
			}, "heartbeat skipped");
			emitHeartbeatEvent({
				status: "ok-token",
				to,
				channel: "whatsapp",
				silent: !await maybeSendHeartbeatOk(),
				indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-token") : void 0
			});
			return;
		}
		if (hasMedia) heartbeatLogger.warn({ to: redactedTo }, "heartbeat reply contained media; sending text only");
		const finalText = stripped.text || reply.text;
		if (!visibility.showAlerts) {
			heartbeatLogger.info({
				to: redactedTo,
				reason: "alerts-disabled"
			}, "heartbeat skipped");
			emitHeartbeatEvent({
				status: "skipped",
				to,
				reason: "alerts-disabled",
				preview: finalText.slice(0, 200),
				channel: "whatsapp",
				hasMedia,
				indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : void 0
			});
			return;
		}
		if (dryRun) {
			heartbeatLogger.info({
				to: redactedTo,
				reason: "dry-run",
				chars: finalText.length
			}, "heartbeat dry-run");
			whatsappHeartbeatLog.info(`[dry-run] heartbeat -> ${redactedTo} (${finalText.length} chars)`);
			return;
		}
		const sendResult = await sender(to, finalText, { verbose });
		emitHeartbeatEvent({
			status: "sent",
			to,
			preview: finalText.slice(0, 160),
			hasMedia,
			channel: "whatsapp",
			indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : void 0
		});
		heartbeatLogger.info({
			to: redactedTo,
			messageId: sendResult.messageId,
			chars: finalText.length
		}, "heartbeat sent");
		whatsappHeartbeatLog.info(`heartbeat alert sent to ${redactedTo}`);
	} catch (err) {
		const reason = formatError(err);
		heartbeatLogger.warn({
			to: redactedTo,
			error: reason
		}, "heartbeat failed");
		whatsappHeartbeatLog.warn(`heartbeat failed (${reason})`);
		emitHeartbeatEvent({
			status: "failed",
			to,
			reason,
			channel: "whatsapp",
			indicatorType: visibility.useIndicator ? resolveIndicatorType("failed") : void 0
		});
		throw err;
	}
}
function resolveHeartbeatRecipients(cfg, opts = {}) {
	return resolveWhatsAppHeartbeatRecipients(cfg, opts);
}
//#endregion
//#region extensions/whatsapp/runtime-api.ts
let loginQrModulePromise = null;
function loadLoginQrModule() {
	loginQrModulePromise ??= import("../../login-qr-DCn-bpfo.js");
	return loginQrModulePromise;
}
async function startWebLoginWithQr(...args) {
	const { startWebLoginWithQr } = await loadLoginQrModule();
	return await startWebLoginWithQr(...args);
}
async function waitForWebLogin(...args) {
	const { waitForWebLogin } = await loadLoginQrModule();
	return await waitForWebLogin(...args);
}
//#endregion
export { DEFAULT_WEB_MEDIA_BYTES, HEARTBEAT_PROMPT, HEARTBEAT_TOKEN, LocalMediaAccessError, SILENT_REPLY_TOKEN, WA_WEB_AUTH_DIR, createWaSocket, createWhatsAppLoginTool, extractLocationData, extractMediaPlaceholder, extractText, formatError, getActiveWebListener, getDefaultLocalRoots, getStatusCode, getWebAuthAgeMs, handleWhatsAppAction, hasWebCredsSync, loadWebMedia, loadWebMediaRaw, logWebSelfId, loginWeb, logoutWeb, maybeRestoreCredsFromBackup, monitorWebChannel, monitorWebInbox, newConnectionId, optimizeImageToJpeg, optimizeImageToPng, pickWebChannel, readCredsJsonRaw, readWebSelfId, readWebSelfIdentity, requireActiveWebListener, resetWebInboundDedupe, resolveDefaultWebAuthDir, resolveHeartbeatRecipients, resolveWebAccountId, resolveWebCredsBackupPath, resolveWebCredsPath, runWebHeartbeatOnce, sendMessageWhatsApp, sendPollWhatsApp, sendReactionWhatsApp, setActiveWebListener, setWhatsAppRuntime, startWebLoginWithQr, stripHeartbeatToken, waitForCredsSaveQueue, waitForCredsSaveQueueWithTimeout, waitForWaConnection, waitForWebLogin, webAuthExists, whatsAppActionRuntime };
