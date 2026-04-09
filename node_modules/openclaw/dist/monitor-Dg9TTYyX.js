import { t as createNonExitingRuntime } from "./runtime-D34lIttY.js";
import { u as resolveAgentIdFromSessionKey } from "./session-key-BR3Z-ljs.js";
import { a as shouldLogVerbose, r as logVerbose, t as danger } from "./globals-B43CpcZo.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { a as normalizePluginHttpPath } from "./http-route-overlap-BBDTJzpq.js";
import { p as resolveSendableOutboundReplyParts } from "./reply-payload-Dp5nBPsr.js";
import { r as chunkMarkdownText } from "./chunk-CKMbnOQL.js";
import { t as buildRandomTempFilePath } from "./temp-download-C7nY-2xj.js";
import "./temp-path-BO7uM_47.js";
import { i as resolveAgentRoute, n as deriveLastRoutePolicy } from "./resolve-route-CavttejP.js";
import { r as getSessionBindingService } from "./session-binding-service-1Qw5xtDF.js";
import { t as waitForAbortSignal } from "./abort-signal-BTEmoq5M.js";
import "./routing-DdBDhOmH.js";
import { t as hasControlCommand } from "./command-detection-B5SSBbHQ.js";
import { t as finalizeInboundContext } from "./inbound-context-C9Q1ZUwZ.js";
import { r as formatInboundEnvelope } from "./envelope-C2z9fFcf.js";
import { n as buildMentionRegexes, r as matchesMentionPatterns } from "./mentions-Xv-PavLt.js";
import { t as dispatchReplyWithBufferedBlockDispatcher } from "./provider-dispatcher-B5ApdNtJ.js";
import { n as resolveControlCommandGate } from "./command-gating-C6mMbL1P.js";
import { t as recordInboundSession } from "./session-CTQg3QT8.js";
import { n as recordChannelActivity } from "./channel-activity-DwMot8mI.js";
import { a as readChannelAllowFromStore, d as upsertChannelPairingRequest } from "./pairing-store--adbbV4I.js";
import { n as isSenderIdAllowed, r as mergeDmAllowFromSources, t as firstDefined } from "./allow-from-BFEY21VG.js";
import { a as warnMissingProviderGroupPolicyFallbackOnce, n as resolveAllowlistProviderRuntimeGroupPolicy, r as resolveDefaultGroupPolicy } from "./runtime-group-policy-DxOE0SLn.js";
import { n as evaluateMatchedGroupAccessForPolicy } from "./group-access-agsrqQrw.js";
import { c as resolvePinnedMainDmOwnerFromAllowlist } from "./dm-policy-shared-CWGTUVOf.js";
import { s as clearHistoryEntriesIfEnabled, u as recordPendingHistoryEntryIfEnabled } from "./history-ClGWPUk1.js";
import "./reply-history-szIO6La4.js";
import { t as createChannelReplyPipeline } from "./channel-reply-pipeline-DkatqAK5.js";
import { t as createChannelPairingChallengeIssuer } from "./channel-pairing-DrJTvhRN.js";
import { a as isRequestBodyLimitError, c as requestBodyErrorToText, s as readRequestBodyWithLimit } from "./http-body-CB7OL37N.js";
import { a as createWebhookInFlightLimiter, i as beginWebhookRequestPipelineOrReject } from "./webhook-request-guards-uO5Z6rny.js";
import { t as registerPluginHttpRoute } from "./http-registry-UDbwC7Vv.js";
import "./webhook-ingress-BwX4VVop.js";
import "./runtime-env-BLYCS7ta.js";
import "./config-runtime-OuR9WVXH.js";
import "./reply-runtime-C61hmKmz.js";
import "./reply-dispatch-runtime-D76pfZo2.js";
import "./infra-runtime-DS3U08t7.js";
import { n as ensureConfiguredBindingRouteReady, r as resolveConfiguredBindingRoute } from "./conversation-runtime-D-TUyzoB.js";
import { t as resolvePairingIdLabel } from "./pairing-labels-ClKNVP7c.js";
import "./command-auth-Bpii4TsA.js";
import "./channel-inbound-bc7z3_ut.js";
import { n as resolveMentionGatingWithBypass } from "./mention-gating-ChSbLk0u.js";
import { n as toLocationContext, t as formatLocationText } from "./location-BcUMSJBU.js";
import { t as resolveInboundSessionEnvelopeContext } from "./session-envelope-oXR9OZTd.js";
import { i as resolveLineAccount, r as resolveDefaultLineAccountId } from "./accounts-B0uKQB9m.js";
import { n as resolveLineGroupConfigEntry, r as resolveLineGroupHistoryKey } from "./group-keys-DwzI3fzV.js";
import { D as showLoadingAnimation, S as pushMessagesLine, T as replyMessageLine, c as processLineMessage, d as createImageMessage, f as createLocationMessage, g as getUserDisplayName, k as buildTemplateMessageFromPayload, m as createTextMessageWithQuickReplies, p as createQuickReplyItems, u as createFlexMessage, w as pushTextMessageWithQuickReplies, x as pushMessageLine } from "./markdown-to-line-CL1tn6Ko.js";
import fs from "node:fs";
import crypto from "node:crypto";
import { messagingApi } from "@line/bot-sdk";
//#region extensions/line/src/bot-access.ts
function normalizeAllowEntry(value) {
	const trimmed = String(value).trim();
	if (!trimmed) return "";
	if (trimmed === "*") return "*";
	return trimmed.replace(/^line:(?:user:)?/i, "");
}
const normalizeAllowFrom = (list) => {
	const entries = (list ?? []).map((value) => normalizeAllowEntry(value)).filter(Boolean);
	return {
		entries,
		hasWildcard: entries.includes("*"),
		hasEntries: entries.length > 0
	};
};
const normalizeDmAllowFromWithStore = (params) => normalizeAllowFrom(mergeDmAllowFromSources(params));
const isSenderAllowed = (params) => {
	const { allow, senderId } = params;
	return isSenderIdAllowed(allow, senderId, false);
};
//#endregion
//#region extensions/line/src/download.ts
const AUDIO_BRANDS = new Set([
	"m4a ",
	"m4b ",
	"m4p ",
	"m4r ",
	"f4a ",
	"f4b "
]);
async function downloadLineMedia(messageId, channelAccessToken, maxBytes = 10 * 1024 * 1024) {
	const response = await new messagingApi.MessagingApiBlobClient({ channelAccessToken }).getMessageContent(messageId);
	const chunks = [];
	let totalSize = 0;
	for await (const chunk of response) {
		totalSize += chunk.length;
		if (totalSize > maxBytes) throw new Error(`Media exceeds ${Math.round(maxBytes / (1024 * 1024))}MB limit`);
		chunks.push(chunk);
	}
	const buffer = Buffer.concat(chunks);
	const contentType = detectContentType(buffer);
	const filePath = buildRandomTempFilePath({
		prefix: "line-media",
		extension: getExtensionForContentType(contentType)
	});
	await fs.promises.writeFile(filePath, buffer);
	logVerbose(`line: downloaded media ${messageId} to ${filePath} (${buffer.length} bytes)`);
	return {
		path: filePath,
		contentType,
		size: buffer.length
	};
}
function detectContentType(buffer) {
	const hasFtypBox = buffer.length >= 12 && buffer[4] === 102 && buffer[5] === 116 && buffer[6] === 121 && buffer[7] === 112;
	if (buffer.length >= 2) {
		if (buffer[0] === 255 && buffer[1] === 216) return "image/jpeg";
		if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) return "image/png";
		if (buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70) return "image/gif";
		if (buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80) return "image/webp";
		if (hasFtypBox) {
			const majorBrand = buffer.toString("ascii", 8, 12).toLowerCase();
			if (AUDIO_BRANDS.has(majorBrand)) return "audio/mp4";
			return "video/mp4";
		}
	}
	return "application/octet-stream";
}
function getExtensionForContentType(contentType) {
	switch (contentType) {
		case "image/jpeg": return ".jpg";
		case "image/png": return ".png";
		case "image/gif": return ".gif";
		case "image/webp": return ".webp";
		case "video/mp4": return ".mp4";
		case "audio/mp4": return ".m4a";
		case "audio/mpeg": return ".mp3";
		default: return ".bin";
	}
}
//#endregion
//#region extensions/line/src/auto-reply-delivery.ts
async function deliverLineAutoReply(params) {
	const { payload, lineData, replyToken, accountId, to, textLimit, deps } = params;
	let replyTokenUsed = params.replyTokenUsed;
	const pushLineMessages = async (messages) => {
		if (messages.length === 0) return;
		for (let i = 0; i < messages.length; i += 5) await deps.pushMessagesLine(to, messages.slice(i, i + 5), { accountId });
	};
	const sendLineMessages = async (messages, allowReplyToken) => {
		if (messages.length === 0) return;
		let remaining = messages;
		if (allowReplyToken && replyToken && !replyTokenUsed) {
			const replyBatch = remaining.slice(0, 5);
			try {
				await deps.replyMessageLine(replyToken, replyBatch, { accountId });
			} catch (err) {
				deps.onReplyError?.(err);
				await pushLineMessages(replyBatch);
			}
			replyTokenUsed = true;
			remaining = remaining.slice(replyBatch.length);
		}
		if (remaining.length > 0) await pushLineMessages(remaining);
	};
	const richMessages = [];
	const hasQuickReplies = Boolean(lineData.quickReplies?.length);
	if (lineData.flexMessage) richMessages.push(deps.createFlexMessage(lineData.flexMessage.altText.slice(0, 400), lineData.flexMessage.contents));
	if (lineData.templateMessage) {
		const templateMsg = deps.buildTemplateMessageFromPayload(lineData.templateMessage);
		if (templateMsg) richMessages.push(templateMsg);
	}
	if (lineData.location) richMessages.push(deps.createLocationMessage(lineData.location));
	const processed = payload.text ? deps.processLineMessage(payload.text) : {
		text: "",
		flexMessages: []
	};
	for (const flexMsg of processed.flexMessages) richMessages.push(deps.createFlexMessage(flexMsg.altText.slice(0, 400), flexMsg.contents));
	const chunks = processed.text ? deps.chunkMarkdownText(processed.text, textLimit) : [];
	const mediaMessages = resolveSendableOutboundReplyParts(payload).mediaUrls.map((url) => url?.trim()).filter((url) => Boolean(url)).map((url) => deps.createImageMessage(url));
	if (chunks.length > 0) {
		const hasRichOrMedia = richMessages.length > 0 || mediaMessages.length > 0;
		if (hasQuickReplies && hasRichOrMedia) try {
			await sendLineMessages([...richMessages, ...mediaMessages], false);
		} catch (err) {
			deps.onReplyError?.(err);
		}
		const { replyTokenUsed: nextReplyTokenUsed } = await deps.sendLineReplyChunks({
			to,
			chunks,
			quickReplies: lineData.quickReplies,
			replyToken,
			replyTokenUsed,
			accountId,
			replyMessageLine: deps.replyMessageLine,
			pushMessageLine: deps.pushMessageLine,
			pushTextMessageWithQuickReplies: deps.pushTextMessageWithQuickReplies,
			createTextMessageWithQuickReplies: deps.createTextMessageWithQuickReplies
		});
		replyTokenUsed = nextReplyTokenUsed;
		if (!hasQuickReplies || !hasRichOrMedia) {
			await sendLineMessages(richMessages, false);
			if (mediaMessages.length > 0) await sendLineMessages(mediaMessages, false);
		}
	} else {
		const combined = [...richMessages, ...mediaMessages];
		if (hasQuickReplies && combined.length > 0) {
			const quickReply = deps.createQuickReplyItems(lineData.quickReplies);
			const targetIndex = replyToken && !replyTokenUsed ? Math.min(4, combined.length - 1) : combined.length - 1;
			combined[targetIndex] = {
				...combined[targetIndex],
				quickReply
			};
		}
		await sendLineMessages(combined, true);
	}
	return { replyTokenUsed };
}
//#endregion
//#region extensions/line/src/bot-message-context.ts
function getLineSourceInfo(source) {
	return {
		userId: source.type === "user" ? source.userId : source.type === "group" ? source.userId : source.type === "room" ? source.userId : void 0,
		groupId: source.type === "group" ? source.groupId : void 0,
		roomId: source.type === "room" ? source.roomId : void 0,
		isGroup: source.type === "group" || source.type === "room"
	};
}
function buildPeerId(source) {
	const groupKey = resolveLineGroupHistoryKey({
		groupId: source.type === "group" ? source.groupId : void 0,
		roomId: source.type === "room" ? source.roomId : void 0
	});
	if (groupKey) return groupKey;
	if (source.type === "user" && source.userId) return source.userId;
	return "unknown";
}
async function resolveLineInboundRoute(params) {
	recordChannelActivity({
		channel: "line",
		accountId: params.account.accountId,
		direction: "inbound"
	});
	const { userId, groupId, roomId, isGroup } = getLineSourceInfo(params.source);
	const peerId = buildPeerId(params.source);
	let route = resolveAgentRoute({
		cfg: params.cfg,
		channel: "line",
		accountId: params.account.accountId,
		peer: {
			kind: isGroup ? "group" : "direct",
			id: peerId
		}
	});
	const configuredRoute = resolveConfiguredBindingRoute({
		cfg: params.cfg,
		route,
		conversation: {
			channel: "line",
			accountId: params.account.accountId,
			conversationId: peerId
		}
	});
	let configuredBinding = configuredRoute.bindingResolution;
	const configuredBindingSessionKey = configuredRoute.boundSessionKey ?? "";
	route = configuredRoute.route;
	const boundConversation = getSessionBindingService().resolveByConversation({
		channel: "line",
		accountId: params.account.accountId,
		conversationId: peerId
	});
	const boundSessionKey = boundConversation?.targetSessionKey?.trim();
	if (boundConversation && boundSessionKey) {
		route = {
			...route,
			sessionKey: boundSessionKey,
			agentId: resolveAgentIdFromSessionKey(boundSessionKey) || route.agentId,
			lastRoutePolicy: deriveLastRoutePolicy({
				sessionKey: boundSessionKey,
				mainSessionKey: route.mainSessionKey
			}),
			matchedBy: "binding.channel"
		};
		configuredBinding = null;
		getSessionBindingService().touch(boundConversation.bindingId);
		logVerbose(`line: routed via bound conversation ${peerId} -> ${boundSessionKey}`);
	}
	if (configuredBinding) {
		const ensured = await ensureConfiguredBindingRouteReady({
			cfg: params.cfg,
			bindingResolution: configuredBinding
		});
		if (!ensured.ok) {
			logVerbose(`line: configured ACP binding unavailable for ${peerId} -> ${configuredBindingSessionKey}: ${ensured.error}`);
			throw new Error(`Configured ACP binding unavailable: ${ensured.error}`);
		}
		logVerbose(`line: using configured ACP binding for ${peerId} -> ${configuredBindingSessionKey}`);
	}
	return {
		userId,
		groupId,
		roomId,
		isGroup,
		peerId,
		route
	};
}
const STICKER_PACKAGES = {
	"1": "Moon & James",
	"2": "Cony & Brown",
	"3": "Brown & Friends",
	"4": "Moon Special",
	"789": "LINE Characters",
	"6136": "Cony's Happy Life",
	"6325": "Brown's Life",
	"6359": "Choco",
	"6362": "Sally",
	"6370": "Edward",
	"11537": "Cony",
	"11538": "Brown",
	"11539": "Moon"
};
function describeStickerKeywords(sticker) {
	const keywords = sticker.keywords;
	if (keywords && keywords.length > 0) return keywords.slice(0, 3).join(", ");
	const stickerText = sticker.text;
	if (stickerText) return stickerText;
	return "";
}
function extractMessageText(message) {
	if (message.type === "text") return message.text;
	if (message.type === "location") {
		const loc = message;
		return formatLocationText({
			latitude: loc.latitude,
			longitude: loc.longitude,
			name: loc.title,
			address: loc.address
		}) ?? "";
	}
	if (message.type === "sticker") {
		const sticker = message;
		const packageName = STICKER_PACKAGES[sticker.packageId] ?? "sticker";
		const keywords = describeStickerKeywords(sticker);
		if (keywords) return `[Sent a ${packageName} sticker: ${keywords}]`;
		return `[Sent a ${packageName} sticker]`;
	}
	return "";
}
function extractMediaPlaceholder(message) {
	switch (message.type) {
		case "image": return "<media:image>";
		case "video": return "<media:video>";
		case "audio": return "<media:audio>";
		case "file": return "<media:document>";
		default: return "";
	}
}
function resolveLineConversationLabel(params) {
	return params.isGroup ? params.groupId ? `group:${params.groupId}` : params.roomId ? `room:${params.roomId}` : "unknown-group" : params.senderLabel;
}
function resolveLineAddresses(params) {
	const fromAddress = params.isGroup ? params.groupId ? `line:group:${params.groupId}` : params.roomId ? `line:room:${params.roomId}` : `line:${params.peerId}` : `line:${params.userId ?? params.peerId}`;
	return {
		fromAddress,
		toAddress: params.isGroup ? fromAddress : `line:${params.userId ?? params.peerId}`,
		originatingTo: params.isGroup ? fromAddress : `line:${params.userId ?? params.peerId}`
	};
}
function resolveLineGroupSystemPrompt(groups, source) {
	return resolveLineGroupConfigEntry(groups, {
		groupId: source.groupId,
		roomId: source.roomId
	})?.systemPrompt?.trim() || void 0;
}
async function finalizeLineInboundContext(params) {
	const { fromAddress, toAddress, originatingTo } = resolveLineAddresses({
		isGroup: params.source.isGroup,
		groupId: params.source.groupId,
		roomId: params.source.roomId,
		userId: params.source.userId,
		peerId: params.source.peerId
	});
	const senderId = params.source.userId ?? "unknown";
	const senderLabel = params.source.userId ? `user:${params.source.userId}` : "unknown";
	const conversationLabel = resolveLineConversationLabel({
		isGroup: params.source.isGroup,
		groupId: params.source.groupId,
		roomId: params.source.roomId,
		senderLabel
	});
	const { storePath, envelopeOptions, previousTimestamp } = resolveInboundSessionEnvelopeContext({
		cfg: params.cfg,
		agentId: params.route.agentId,
		sessionKey: params.route.sessionKey
	});
	const body = formatInboundEnvelope({
		channel: "LINE",
		from: conversationLabel,
		timestamp: params.timestamp,
		body: params.rawBody,
		chatType: params.source.isGroup ? "group" : "direct",
		sender: { id: senderId },
		previousTimestamp,
		envelope: envelopeOptions
	});
	const ctxPayload = finalizeInboundContext({
		Body: body,
		BodyForAgent: params.rawBody,
		RawBody: params.rawBody,
		CommandBody: params.rawBody,
		From: fromAddress,
		To: toAddress,
		SessionKey: params.route.sessionKey,
		AccountId: params.route.accountId,
		ChatType: params.source.isGroup ? "group" : "direct",
		ConversationLabel: conversationLabel,
		GroupSubject: params.source.isGroup ? params.source.groupId ?? params.source.roomId : void 0,
		SenderId: senderId,
		Provider: "line",
		Surface: "line",
		MessageSid: params.messageSid,
		Timestamp: params.timestamp,
		MediaPath: params.media.firstPath,
		MediaType: params.media.firstContentType,
		MediaUrl: params.media.firstPath,
		MediaPaths: params.media.paths,
		MediaUrls: params.media.paths,
		MediaTypes: params.media.types,
		...params.locationContext,
		CommandAuthorized: params.commandAuthorized,
		OriginatingChannel: "line",
		OriginatingTo: originatingTo,
		GroupSystemPrompt: params.source.isGroup ? resolveLineGroupSystemPrompt(params.account.config.groups, params.source) : void 0,
		InboundHistory: params.inboundHistory
	});
	const pinnedMainDmOwner = !params.source.isGroup ? resolvePinnedMainDmOwnerFromAllowlist({
		dmScope: params.cfg.session?.dmScope,
		allowFrom: params.account.config.allowFrom,
		normalizeEntry: (entry) => normalizeAllowFrom([entry]).entries[0]
	}) : null;
	await recordInboundSession({
		storePath,
		sessionKey: ctxPayload.SessionKey ?? params.route.sessionKey,
		ctx: ctxPayload,
		updateLastRoute: !params.source.isGroup ? {
			sessionKey: params.route.mainSessionKey,
			channel: "line",
			to: params.source.userId ?? params.source.peerId,
			accountId: params.route.accountId,
			mainDmOwnerPin: pinnedMainDmOwner && params.source.userId ? {
				ownerRecipient: pinnedMainDmOwner,
				senderRecipient: params.source.userId,
				onSkip: ({ ownerRecipient, senderRecipient }) => {
					logVerbose(`line: skip main-session last route for ${senderRecipient} (pinned owner ${ownerRecipient})`);
				}
			} : void 0
		} : void 0,
		onRecordError: (err) => {
			logVerbose(`line: failed updating session meta: ${String(err)}`);
		}
	});
	if (shouldLogVerbose()) {
		const preview = body.slice(0, 200).replace(/\n/g, "\\n");
		const mediaInfo = params.verboseLog.kind === "inbound" && (params.verboseLog.mediaCount ?? 0) > 1 ? ` mediaCount=${params.verboseLog.mediaCount}` : "";
		logVerbose(`${params.verboseLog.kind === "inbound" ? "line inbound" : "line postback"}: from=${ctxPayload.From} len=${body.length}${mediaInfo} preview="${preview}"`);
	}
	return {
		ctxPayload,
		replyToken: params.event.replyToken
	};
}
async function buildLineMessageContext(params) {
	const { event, allMedia, cfg, account, commandAuthorized, groupHistories, historyLimit } = params;
	const source = event.source;
	const { userId, groupId, roomId, isGroup, peerId, route } = await resolveLineInboundRoute({
		source,
		cfg,
		account
	});
	const message = event.message;
	const messageId = message.id;
	const timestamp = event.timestamp;
	const textContent = extractMessageText(message);
	const placeholder = extractMediaPlaceholder(message);
	let rawBody = textContent || placeholder;
	if (!rawBody && allMedia.length > 0) rawBody = `<media:image>${allMedia.length > 1 ? ` (${allMedia.length} images)` : ""}`;
	if (!rawBody && allMedia.length === 0) return null;
	let locationContext;
	if (message.type === "location") {
		const loc = message;
		locationContext = toLocationContext({
			latitude: loc.latitude,
			longitude: loc.longitude,
			name: loc.title,
			address: loc.address
		});
	}
	const historyKey = isGroup ? peerId : void 0;
	const inboundHistory = historyKey && groupHistories && (historyLimit ?? 0) > 0 ? (groupHistories.get(historyKey) ?? []).map((entry) => ({
		sender: entry.sender,
		body: entry.body,
		timestamp: entry.timestamp
	})) : void 0;
	const { ctxPayload } = await finalizeLineInboundContext({
		cfg,
		account,
		event,
		route,
		source: {
			userId,
			groupId,
			roomId,
			isGroup,
			peerId
		},
		rawBody,
		timestamp,
		messageSid: messageId,
		commandAuthorized,
		media: {
			firstPath: allMedia[0]?.path,
			firstContentType: allMedia[0]?.contentType,
			paths: allMedia.length > 0 ? allMedia.map((m) => m.path) : void 0,
			types: allMedia.length > 0 ? allMedia.map((m) => m.contentType).filter(Boolean) : void 0
		},
		locationContext,
		verboseLog: {
			kind: "inbound",
			mediaCount: allMedia.length
		},
		inboundHistory
	});
	return {
		ctxPayload,
		event,
		userId,
		groupId,
		roomId,
		isGroup,
		route,
		replyToken: event.replyToken,
		accountId: account.accountId
	};
}
async function buildLinePostbackContext(params) {
	const { event, cfg, account, commandAuthorized } = params;
	const source = event.source;
	const { userId, groupId, roomId, isGroup, peerId, route } = await resolveLineInboundRoute({
		source,
		cfg,
		account
	});
	const timestamp = event.timestamp;
	const rawData = event.postback?.data?.trim() ?? "";
	if (!rawData) return null;
	let rawBody = rawData;
	if (rawData.includes("line.action=")) {
		const searchParams = new URLSearchParams(rawData);
		const action = searchParams.get("line.action") ?? "";
		const device = searchParams.get("line.device");
		rawBody = device ? `line action ${action} device ${device}` : `line action ${action}`;
	}
	const messageSid = event.replyToken ? `postback:${event.replyToken}` : `postback:${timestamp}`;
	const { ctxPayload } = await finalizeLineInboundContext({
		cfg,
		account,
		event,
		route,
		source: {
			userId,
			groupId,
			roomId,
			isGroup,
			peerId
		},
		rawBody,
		timestamp,
		messageSid,
		commandAuthorized,
		media: {
			firstPath: "",
			firstContentType: void 0,
			paths: void 0,
			types: void 0
		},
		verboseLog: { kind: "postback" }
	});
	return {
		ctxPayload,
		event,
		userId,
		groupId,
		roomId,
		isGroup,
		route,
		replyToken: event.replyToken,
		accountId: account.accountId
	};
}
//#endregion
//#region extensions/line/src/bot-handlers.ts
const LINE_DOWNLOADABLE_MESSAGE_TYPES = new Set([
	"image",
	"video",
	"audio",
	"file"
]);
function isDownloadableLineMessageType(messageType) {
	return LINE_DOWNLOADABLE_MESSAGE_TYPES.has(messageType);
}
const LINE_WEBHOOK_REPLAY_WINDOW_MS = 600 * 1e3;
const LINE_WEBHOOK_REPLAY_MAX_ENTRIES = 4096;
const LINE_WEBHOOK_REPLAY_PRUNE_INTERVAL_MS = 1e3;
function createLineWebhookReplayCache() {
	return {
		seenEvents: /* @__PURE__ */ new Map(),
		inFlightEvents: /* @__PURE__ */ new Map(),
		lastPruneAtMs: 0
	};
}
function pruneLineWebhookReplayCache(cache, nowMs) {
	const minSeenAt = nowMs - LINE_WEBHOOK_REPLAY_WINDOW_MS;
	for (const [key, seenAt] of cache.seenEvents) if (seenAt < minSeenAt) cache.seenEvents.delete(key);
	if (cache.seenEvents.size > LINE_WEBHOOK_REPLAY_MAX_ENTRIES) {
		const deleteCount = cache.seenEvents.size - LINE_WEBHOOK_REPLAY_MAX_ENTRIES;
		let deleted = 0;
		for (const key of cache.seenEvents.keys()) {
			if (deleted >= deleteCount) break;
			cache.seenEvents.delete(key);
			deleted += 1;
		}
	}
}
function buildLineWebhookReplayKey(event, accountId) {
	if (event.type === "message") {
		const messageId = event.message?.id?.trim();
		if (messageId) return {
			key: `${accountId}|message:${messageId}`,
			eventId: `message:${messageId}`
		};
	}
	const eventId = event.webhookEventId?.trim();
	if (!eventId) return null;
	const source = event.source;
	const sourceId = source?.type === "group" ? `group:${source.groupId ?? ""}` : source?.type === "room" ? `room:${source.roomId ?? ""}` : `user:${source?.userId ?? ""}`;
	return {
		key: `${accountId}|${event.type}|${sourceId}|${eventId}`,
		eventId: `event:${eventId}`
	};
}
function getLineReplayCandidate(event, context) {
	const replay = buildLineWebhookReplayKey(event, context.account.accountId);
	const cache = context.replayCache;
	if (!replay || !cache) return null;
	const nowMs = Date.now();
	if (nowMs - cache.lastPruneAtMs >= LINE_WEBHOOK_REPLAY_PRUNE_INTERVAL_MS || cache.seenEvents.size >= LINE_WEBHOOK_REPLAY_MAX_ENTRIES) {
		pruneLineWebhookReplayCache(cache, nowMs);
		cache.lastPruneAtMs = nowMs;
	}
	return {
		key: replay.key,
		eventId: replay.eventId,
		seenAtMs: nowMs,
		cache
	};
}
function shouldSkipLineReplayEvent(candidate) {
	const inFlightResult = candidate.cache.inFlightEvents.get(candidate.key);
	if (inFlightResult) {
		logVerbose(`line: skipped in-flight replayed webhook event ${candidate.eventId}`);
		return {
			skip: true,
			inFlightResult
		};
	}
	if (candidate.cache.seenEvents.has(candidate.key)) {
		logVerbose(`line: skipped replayed webhook event ${candidate.eventId}`);
		return { skip: true };
	}
	return { skip: false };
}
function markLineReplayEventInFlight(candidate) {
	let resolve;
	let reject;
	const promise = new Promise((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	promise.catch(() => {});
	candidate.cache.inFlightEvents.set(candidate.key, promise);
	return {
		promise,
		resolve,
		reject
	};
}
function clearLineReplayEventInFlight(candidate) {
	candidate.cache.inFlightEvents.delete(candidate.key);
}
function rememberLineReplayEvent(candidate) {
	candidate.cache.seenEvents.set(candidate.key, candidate.seenAtMs);
}
function resolveLineGroupConfig(params) {
	return resolveLineGroupConfigEntry(params.config.groups, {
		groupId: params.groupId,
		roomId: params.roomId
	});
}
async function sendLinePairingReply(params) {
	const { senderId, replyToken, context } = params;
	const idLabel = (() => {
		try {
			return resolvePairingIdLabel("line");
		} catch {
			return "lineUserId";
		}
	})();
	await createChannelPairingChallengeIssuer({
		channel: "line",
		upsertPairingRequest: async ({ id, meta }) => await upsertChannelPairingRequest({
			channel: "line",
			id,
			accountId: context.account.accountId,
			meta
		})
	})({
		senderId,
		senderIdLine: `Your ${idLabel}: ${senderId}`,
		onCreated: () => {
			logVerbose(`line pairing request sender=${senderId}`);
		},
		sendPairingReply: async (text) => {
			if (replyToken) try {
				await replyMessageLine(replyToken, [{
					type: "text",
					text
				}], {
					accountId: context.account.accountId,
					channelAccessToken: context.account.channelAccessToken
				});
				return;
			} catch (err) {
				logVerbose(`line pairing reply failed for ${senderId}: ${String(err)}`);
			}
			try {
				await pushMessageLine(`line:${senderId}`, text, {
					accountId: context.account.accountId,
					channelAccessToken: context.account.channelAccessToken
				});
			} catch (err) {
				logVerbose(`line pairing reply failed for ${senderId}: ${String(err)}`);
			}
		}
	});
}
async function shouldProcessLineEvent(event, context) {
	const denied = {
		allowed: false,
		commandAuthorized: false
	};
	const { cfg, account } = context;
	const { userId, groupId, roomId, isGroup } = getLineSourceInfo(event.source);
	const senderId = userId ?? "";
	const dmPolicy = account.config.dmPolicy ?? "pairing";
	const storeAllowFrom = await readChannelAllowFromStore("line", void 0, account.accountId).catch(() => []);
	const effectiveDmAllow = normalizeDmAllowFromWithStore({
		allowFrom: account.config.allowFrom,
		storeAllowFrom,
		dmPolicy
	});
	const groupConfig = resolveLineGroupConfig({
		config: account.config,
		groupId,
		roomId
	});
	const groupAllowOverride = groupConfig?.allowFrom;
	const fallbackGroupAllowFrom = account.config.allowFrom?.length ? account.config.allowFrom : void 0;
	const effectiveGroupAllow = normalizeAllowFrom(firstDefined(groupAllowOverride, account.config.groupAllowFrom, fallbackGroupAllowFrom));
	const defaultGroupPolicy = resolveDefaultGroupPolicy(cfg);
	const { groupPolicy, providerMissingFallbackApplied } = resolveAllowlistProviderRuntimeGroupPolicy({
		providerConfigPresent: cfg.channels?.line !== void 0,
		groupPolicy: account.config.groupPolicy,
		defaultGroupPolicy
	});
	warnMissingProviderGroupPolicyFallbackOnce({
		providerMissingFallbackApplied,
		providerKey: "line",
		accountId: account.accountId,
		log: (message) => logVerbose(message)
	});
	if (isGroup) {
		if (groupConfig?.enabled === false) {
			logVerbose(`Blocked line group ${groupId ?? roomId ?? "unknown"} (group disabled)`);
			return denied;
		}
		if (typeof groupAllowOverride !== "undefined") {
			if (!senderId) {
				logVerbose("Blocked line group message (group allowFrom override, no sender ID)");
				return denied;
			}
			if (!isSenderAllowed({
				allow: effectiveGroupAllow,
				senderId
			})) {
				logVerbose(`Blocked line group sender ${senderId} (group allowFrom override)`);
				return denied;
			}
		}
		const senderGroupAccess = evaluateMatchedGroupAccessForPolicy({
			groupPolicy,
			requireMatchInput: true,
			hasMatchInput: Boolean(senderId),
			allowlistConfigured: effectiveGroupAllow.entries.length > 0,
			allowlistMatched: Boolean(senderId) && isSenderAllowed({
				allow: effectiveGroupAllow,
				senderId
			})
		});
		if (!senderGroupAccess.allowed && senderGroupAccess.reason === "disabled") {
			logVerbose("Blocked line group message (groupPolicy: disabled)");
			return denied;
		}
		if (!senderGroupAccess.allowed && senderGroupAccess.reason === "missing_match_input") {
			logVerbose("Blocked line group message (no sender ID, groupPolicy: allowlist)");
			return denied;
		}
		if (!senderGroupAccess.allowed && senderGroupAccess.reason === "empty_allowlist") {
			logVerbose("Blocked line group message (groupPolicy: allowlist, no groupAllowFrom)");
			return denied;
		}
		if (!senderGroupAccess.allowed && senderGroupAccess.reason === "not_allowlisted") {
			logVerbose(`Blocked line group message from ${senderId} (groupPolicy: allowlist)`);
			return denied;
		}
		return {
			allowed: true,
			commandAuthorized: resolveLineCommandAuthorized({
				cfg,
				event,
				senderId,
				allow: effectiveGroupAllow
			})
		};
	}
	if (dmPolicy === "disabled") {
		logVerbose("Blocked line sender (dmPolicy: disabled)");
		return denied;
	}
	if (!(dmPolicy === "open" || isSenderAllowed({
		allow: effectiveDmAllow,
		senderId
	}))) {
		if (dmPolicy === "pairing") {
			if (!senderId) {
				logVerbose("Blocked line sender (dmPolicy: pairing, no sender ID)");
				return denied;
			}
			await sendLinePairingReply({
				senderId,
				replyToken: "replyToken" in event ? event.replyToken : void 0,
				context
			});
		} else logVerbose(`Blocked line sender ${senderId || "unknown"} (dmPolicy: ${dmPolicy})`);
		return denied;
	}
	return {
		allowed: true,
		commandAuthorized: resolveLineCommandAuthorized({
			cfg,
			event,
			senderId,
			allow: effectiveDmAllow
		})
	};
}
function getLineMentionees(message) {
	if (message.type !== "text") return [];
	const mentionees = message.mention?.mentionees;
	return Array.isArray(mentionees) ? mentionees : [];
}
function isLineBotMentioned(message) {
	return getLineMentionees(message).some((m) => m.isSelf === true || m.type === "all");
}
function hasAnyLineMention(message) {
	return getLineMentionees(message).length > 0;
}
function resolveEventRawText(event) {
	if (event.type === "message") {
		const msg = event.message;
		if (msg.type === "text") return msg.text;
		return "";
	}
	if (event.type === "postback") return event.postback?.data?.trim() ?? "";
	return "";
}
function resolveLineCommandAuthorized(params) {
	const senderAllowedForCommands = isSenderAllowed({
		allow: params.allow,
		senderId: params.senderId
	});
	const useAccessGroups = params.cfg.commands?.useAccessGroups !== false;
	const rawText = resolveEventRawText(params.event);
	return resolveControlCommandGate({
		useAccessGroups,
		authorizers: [{
			configured: params.allow.hasEntries,
			allowed: senderAllowedForCommands
		}],
		allowTextCommands: true,
		hasControlCommand: hasControlCommand(rawText, params.cfg)
	}).commandAuthorized;
}
async function handleMessageEvent(event, context) {
	const { cfg, account, runtime, mediaMaxBytes, processMessage } = context;
	const message = event.message;
	const decision = await shouldProcessLineEvent(event, context);
	if (!decision.allowed) return;
	const { isGroup, groupId, roomId } = getLineSourceInfo(event.source);
	if (isGroup) {
		const requireMention = resolveLineGroupConfig({
			config: account.config,
			groupId,
			roomId
		})?.requireMention !== false;
		const rawText = message.type === "text" ? message.text : "";
		const peerId = groupId ?? roomId ?? event.source.userId ?? "unknown";
		const { agentId } = resolveAgentRoute({
			cfg,
			channel: "line",
			accountId: account.accountId,
			peer: {
				kind: "group",
				id: peerId
			}
		});
		const mentionRegexes = buildMentionRegexes(cfg, agentId);
		const wasMentionedByNative = isLineBotMentioned(message);
		const wasMentionedByPattern = message.type === "text" ? matchesMentionPatterns(rawText, mentionRegexes) : false;
		const wasMentioned = wasMentionedByNative || wasMentionedByPattern;
		if (resolveMentionGatingWithBypass({
			isGroup: true,
			requireMention,
			canDetectMention: message.type === "text",
			wasMentioned,
			hasAnyMention: hasAnyLineMention(message),
			allowTextCommands: true,
			hasControlCommand: hasControlCommand(rawText, cfg),
			commandAuthorized: decision.commandAuthorized
		}).shouldSkip) {
			logVerbose(`line: skipping group message (requireMention, not mentioned)`);
			const historyKey = groupId ?? roomId;
			const senderId = event.source.type === "group" || event.source.type === "room" ? event.source.userId ?? "unknown" : "unknown";
			if (historyKey && context.groupHistories) recordPendingHistoryEntryIfEnabled({
				historyMap: context.groupHistories,
				historyKey,
				limit: context.historyLimit ?? 50,
				entry: {
					sender: `user:${senderId}`,
					body: rawText || `<${message.type}>`,
					timestamp: event.timestamp
				}
			});
			return;
		}
	}
	const allMedia = [];
	if (isDownloadableLineMessageType(message.type)) try {
		const media = await downloadLineMedia(message.id, account.channelAccessToken, mediaMaxBytes);
		allMedia.push({
			path: media.path,
			contentType: media.contentType
		});
	} catch (err) {
		const errMsg = String(err);
		if (errMsg.includes("exceeds") && errMsg.includes("limit")) logVerbose(`line: media exceeds size limit for message ${message.id}`);
		else runtime.error?.(danger(`line: failed to download media: ${errMsg}`));
	}
	const messageContext = await buildLineMessageContext({
		event,
		allMedia,
		cfg,
		account,
		commandAuthorized: decision.commandAuthorized,
		groupHistories: context.groupHistories,
		historyLimit: context.historyLimit ?? 50
	});
	if (!messageContext) {
		logVerbose("line: skipping empty message");
		return;
	}
	await processMessage(messageContext);
	if (isGroup && context.groupHistories) {
		const historyKey = groupId ?? roomId;
		if (historyKey && context.groupHistories.has(historyKey)) clearHistoryEntriesIfEnabled({
			historyMap: context.groupHistories,
			historyKey,
			limit: context.historyLimit ?? 50
		});
	}
}
async function handleFollowEvent(event, _context) {
	logVerbose(`line: user ${(event.source.type === "user" ? event.source.userId : void 0) ?? "unknown"} followed`);
}
async function handleUnfollowEvent(event, _context) {
	logVerbose(`line: user ${(event.source.type === "user" ? event.source.userId : void 0) ?? "unknown"} unfollowed`);
}
async function handleJoinEvent(event, _context) {
	const groupId = event.source.type === "group" ? event.source.groupId : void 0;
	const roomId = event.source.type === "room" ? event.source.roomId : void 0;
	logVerbose(`line: bot joined ${groupId ? `group ${groupId}` : `room ${roomId}`}`);
}
async function handleLeaveEvent(event, _context) {
	const groupId = event.source.type === "group" ? event.source.groupId : void 0;
	const roomId = event.source.type === "room" ? event.source.roomId : void 0;
	logVerbose(`line: bot left ${groupId ? `group ${groupId}` : `room ${roomId}`}`);
}
async function handlePostbackEvent(event, context) {
	const data = event.postback.data;
	logVerbose(`line: received postback: ${data}`);
	const decision = await shouldProcessLineEvent(event, context);
	if (!decision.allowed) return;
	const postbackContext = await buildLinePostbackContext({
		event,
		cfg: context.cfg,
		account: context.account,
		commandAuthorized: decision.commandAuthorized
	});
	if (!postbackContext) return;
	await context.processMessage(postbackContext);
}
async function handleLineWebhookEvents(events, context) {
	let firstError;
	for (const event of events) {
		const replayCandidate = getLineReplayCandidate(event, context);
		const replaySkip = replayCandidate ? shouldSkipLineReplayEvent(replayCandidate) : null;
		if (replaySkip?.skip) {
			if (replaySkip.inFlightResult) try {
				await replaySkip.inFlightResult;
			} catch (err) {
				context.runtime.error?.(danger(`line: replayed in-flight event failed: ${String(err)}`));
				firstError ??= err;
			}
			continue;
		}
		const inFlightReservation = replayCandidate ? markLineReplayEventInFlight(replayCandidate) : null;
		try {
			switch (event.type) {
				case "message":
					await handleMessageEvent(event, context);
					break;
				case "follow":
					await handleFollowEvent(event, context);
					break;
				case "unfollow":
					await handleUnfollowEvent(event, context);
					break;
				case "join":
					await handleJoinEvent(event, context);
					break;
				case "leave":
					await handleLeaveEvent(event, context);
					break;
				case "postback":
					await handlePostbackEvent(event, context);
					break;
				default: logVerbose(`line: unhandled event type: ${event.type}`);
			}
			if (replayCandidate) {
				rememberLineReplayEvent(replayCandidate);
				inFlightReservation?.resolve();
				clearLineReplayEventInFlight(replayCandidate);
			}
		} catch (err) {
			if (replayCandidate) {
				inFlightReservation?.reject(err);
				clearLineReplayEventInFlight(replayCandidate);
			}
			context.runtime.error?.(danger(`line: event handler failed: ${String(err)}`));
			firstError ??= err;
		}
	}
	if (firstError) throw firstError;
}
//#endregion
//#region extensions/line/src/signature.ts
function validateLineSignature(body, signature, channelSecret) {
	const hash = crypto.createHmac("SHA256", channelSecret).update(body).digest("base64");
	const hashBuffer = Buffer.from(hash);
	const signatureBuffer = Buffer.from(signature);
	const maxLen = Math.max(hashBuffer.length, signatureBuffer.length);
	const paddedHash = Buffer.alloc(maxLen);
	const paddedSig = Buffer.alloc(maxLen);
	hashBuffer.copy(paddedHash);
	signatureBuffer.copy(paddedSig);
	const timingResult = crypto.timingSafeEqual(paddedHash, paddedSig);
	return hashBuffer.length === signatureBuffer.length && timingResult;
}
//#endregion
//#region extensions/line/src/webhook-utils.ts
function parseLineWebhookBody(rawBody) {
	try {
		return JSON.parse(rawBody);
	} catch {
		return null;
	}
}
//#endregion
//#region extensions/line/src/webhook.ts
const LINE_WEBHOOK_MAX_RAW_BODY_BYTES = 64 * 1024;
function readRawBody(req) {
	const rawBody = req.rawBody ?? (typeof req.body === "string" || Buffer.isBuffer(req.body) ? req.body : null);
	if (!rawBody) return null;
	return Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody;
}
function parseWebhookBody(rawBody) {
	if (!rawBody) return null;
	return parseLineWebhookBody(rawBody);
}
function createLineWebhookMiddleware(options) {
	const { channelSecret, onEvents, runtime } = options;
	return async (req, res, _next) => {
		try {
			const signature = req.headers["x-line-signature"];
			if (!signature || typeof signature !== "string") {
				res.status(400).json({ error: "Missing X-Line-Signature header" });
				return;
			}
			const rawBody = readRawBody(req);
			if (!rawBody) {
				res.status(400).json({ error: "Missing raw request body for signature verification" });
				return;
			}
			if (Buffer.byteLength(rawBody, "utf-8") > LINE_WEBHOOK_MAX_RAW_BODY_BYTES) {
				res.status(413).json({ error: "Payload too large" });
				return;
			}
			if (!validateLineSignature(rawBody, signature, channelSecret)) {
				logVerbose("line: webhook signature validation failed");
				res.status(401).json({ error: "Invalid signature" });
				return;
			}
			const body = parseWebhookBody(rawBody);
			if (!body) {
				res.status(400).json({ error: "Invalid webhook payload" });
				return;
			}
			if (body.events && body.events.length > 0) {
				logVerbose(`line: received ${body.events.length} webhook events`);
				await onEvents(body);
			}
			res.status(200).json({ status: "ok" });
		} catch (err) {
			runtime?.error?.(danger(`line webhook error: ${String(err)}`));
			if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
		}
	};
}
function startLineWebhook(options) {
	const channelSecret = typeof options.channelSecret === "string" ? options.channelSecret.trim() : "";
	if (!channelSecret) throw new Error("LINE webhook mode requires a non-empty channel secret. Set channels.line.channelSecret in your config.");
	return {
		path: options.path ?? "/line/webhook",
		handler: createLineWebhookMiddleware({
			channelSecret,
			onEvents: options.onEvents,
			runtime: options.runtime
		})
	};
}
//#endregion
//#region extensions/line/src/bot.ts
function createLineBot(opts) {
	const runtime = opts.runtime ?? createNonExitingRuntime();
	const cfg = opts.config ?? loadConfig();
	const account = resolveLineAccount({
		cfg,
		accountId: opts.accountId
	});
	const mediaMaxBytes = (opts.mediaMaxMb ?? account.config.mediaMaxMb ?? 10) * 1024 * 1024;
	const processMessage = opts.onMessage ?? (async () => {
		logVerbose("line: no message handler configured");
	});
	const replayCache = createLineWebhookReplayCache();
	const groupHistories = /* @__PURE__ */ new Map();
	const handleWebhook = async (body) => {
		if (!body.events || body.events.length === 0) return;
		await handleLineWebhookEvents(body.events, {
			cfg,
			account,
			runtime,
			mediaMaxBytes,
			processMessage,
			replayCache,
			groupHistories,
			historyLimit: cfg.messages?.groupChat?.historyLimit ?? 50
		});
	};
	return {
		handleWebhook,
		account
	};
}
//#endregion
//#region extensions/line/src/reply-chunks.ts
async function sendLineReplyChunks(params) {
	const hasQuickReplies = Boolean(params.quickReplies?.length);
	let replyTokenUsed = Boolean(params.replyTokenUsed);
	if (params.chunks.length === 0) return { replyTokenUsed };
	if (params.replyToken && !replyTokenUsed) try {
		const replyBatch = params.chunks.slice(0, 5);
		const remaining = params.chunks.slice(replyBatch.length);
		const replyMessages = replyBatch.map((chunk) => ({
			type: "text",
			text: chunk
		}));
		if (hasQuickReplies && remaining.length === 0 && replyMessages.length > 0) {
			const lastIndex = replyMessages.length - 1;
			replyMessages[lastIndex] = params.createTextMessageWithQuickReplies(replyBatch[lastIndex], params.quickReplies);
		}
		await params.replyMessageLine(params.replyToken, replyMessages, { accountId: params.accountId });
		replyTokenUsed = true;
		for (let i = 0; i < remaining.length; i += 1) if (i === remaining.length - 1 && hasQuickReplies) await params.pushTextMessageWithQuickReplies(params.to, remaining[i], params.quickReplies, { accountId: params.accountId });
		else await params.pushMessageLine(params.to, remaining[i], { accountId: params.accountId });
		return { replyTokenUsed };
	} catch (err) {
		params.onReplyError?.(err);
		replyTokenUsed = true;
	}
	for (let i = 0; i < params.chunks.length; i += 1) if (i === params.chunks.length - 1 && hasQuickReplies) await params.pushTextMessageWithQuickReplies(params.to, params.chunks[i], params.quickReplies, { accountId: params.accountId });
	else await params.pushMessageLine(params.to, params.chunks[i], { accountId: params.accountId });
	return { replyTokenUsed };
}
//#endregion
//#region extensions/line/src/webhook-node.ts
const LINE_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;
const LINE_WEBHOOK_PREAUTH_MAX_BODY_BYTES = 64 * 1024;
const LINE_WEBHOOK_PREAUTH_BODY_TIMEOUT_MS = 5e3;
async function readLineWebhookRequestBody(req, maxBytes = LINE_WEBHOOK_MAX_BODY_BYTES, timeoutMs = LINE_WEBHOOK_PREAUTH_BODY_TIMEOUT_MS) {
	return await readRequestBodyWithLimit(req, {
		maxBytes,
		timeoutMs
	});
}
function createLineNodeWebhookHandler(params) {
	const maxBodyBytes = params.maxBodyBytes ?? LINE_WEBHOOK_MAX_BODY_BYTES;
	const readBody = params.readBody ?? readLineWebhookRequestBody;
	return async (req, res) => {
		if (req.method === "GET" || req.method === "HEAD") {
			if (req.method === "HEAD") {
				res.statusCode = 204;
				res.end();
				return;
			}
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/plain");
			res.end("OK");
			return;
		}
		if (req.method !== "POST") {
			res.statusCode = 405;
			res.setHeader("Allow", "GET, HEAD, POST");
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ error: "Method Not Allowed" }));
			return;
		}
		try {
			const signatureHeader = req.headers["x-line-signature"];
			const signature = typeof signatureHeader === "string" ? signatureHeader.trim() : Array.isArray(signatureHeader) ? (signatureHeader[0] ?? "").trim() : "";
			if (!signature) {
				logVerbose("line: webhook missing X-Line-Signature header");
				res.statusCode = 400;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: "Missing X-Line-Signature header" }));
				return;
			}
			const rawBody = await readBody(req, Math.min(maxBodyBytes, LINE_WEBHOOK_PREAUTH_MAX_BODY_BYTES), LINE_WEBHOOK_PREAUTH_BODY_TIMEOUT_MS);
			if (!validateLineSignature(rawBody, signature, params.channelSecret)) {
				logVerbose("line: webhook signature validation failed");
				res.statusCode = 401;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: "Invalid signature" }));
				return;
			}
			const body = parseLineWebhookBody(rawBody);
			if (!body) {
				res.statusCode = 400;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: "Invalid webhook payload" }));
				return;
			}
			params.onRequestAuthenticated?.();
			if (body.events && body.events.length > 0) {
				logVerbose(`line: received ${body.events.length} webhook events`);
				await params.bot.handleWebhook(body);
			}
			res.statusCode = 200;
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ status: "ok" }));
		} catch (err) {
			if (isRequestBodyLimitError(err, "PAYLOAD_TOO_LARGE")) {
				res.statusCode = 413;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: "Payload too large" }));
				return;
			}
			if (isRequestBodyLimitError(err, "REQUEST_BODY_TIMEOUT")) {
				res.statusCode = 408;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: requestBodyErrorToText("REQUEST_BODY_TIMEOUT") }));
				return;
			}
			params.runtime.error?.(danger(`line webhook error: ${String(err)}`));
			if (!res.headersSent) {
				res.statusCode = 500;
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ error: "Internal server error" }));
			}
		}
	};
}
//#endregion
//#region extensions/line/src/monitor.ts
const runtimeState = /* @__PURE__ */ new Map();
const lineWebhookInFlightLimiter = createWebhookInFlightLimiter();
function recordChannelRuntimeState(params) {
	const key = `${params.channel}:${params.accountId}`;
	const existing = runtimeState.get(key) ?? {
		running: false,
		lastStartAt: null,
		lastStopAt: null,
		lastError: null
	};
	runtimeState.set(key, {
		...existing,
		...params.state
	});
}
function startLineLoadingKeepalive(params) {
	const intervalMs = params.intervalMs ?? 18e3;
	const loadingSeconds = params.loadingSeconds ?? 20;
	let stopped = false;
	const trigger = () => {
		if (stopped) return;
		showLoadingAnimation(params.userId, {
			accountId: params.accountId,
			loadingSeconds
		}).catch(() => {});
	};
	trigger();
	const timer = setInterval(trigger, intervalMs);
	return () => {
		if (stopped) return;
		stopped = true;
		clearInterval(timer);
	};
}
async function monitorLineProvider(opts) {
	const { channelAccessToken, channelSecret, accountId, config, runtime, abortSignal, webhookPath } = opts;
	const resolvedAccountId = accountId ?? resolveDefaultLineAccountId(config);
	const token = channelAccessToken.trim();
	const secret = channelSecret.trim();
	if (!token) throw new Error("LINE webhook mode requires a non-empty channel access token.");
	if (!secret) throw new Error("LINE webhook mode requires a non-empty channel secret.");
	recordChannelRuntimeState({
		channel: "line",
		accountId: resolvedAccountId,
		state: {
			running: true,
			lastStartAt: Date.now()
		}
	});
	const bot = createLineBot({
		channelAccessToken: token,
		channelSecret: secret,
		accountId,
		runtime,
		config,
		onMessage: async (ctx) => {
			if (!ctx) return;
			const { ctxPayload, replyToken, route } = ctx;
			recordChannelRuntimeState({
				channel: "line",
				accountId: resolvedAccountId,
				state: { lastInboundAt: Date.now() }
			});
			const shouldShowLoading = Boolean(ctx.userId && !ctx.isGroup);
			const displayNamePromise = ctx.userId ? getUserDisplayName(ctx.userId, { accountId: ctx.accountId }) : Promise.resolve(ctxPayload.From);
			const stopLoading = shouldShowLoading ? startLineLoadingKeepalive({
				userId: ctx.userId,
				accountId: ctx.accountId
			}) : null;
			logVerbose(`line: received message from ${await displayNamePromise} (${ctxPayload.From})`);
			try {
				const textLimit = 5e3;
				let replyTokenUsed = false;
				const { onModelSelected, ...replyPipeline } = createChannelReplyPipeline({
					cfg: config,
					agentId: route.agentId,
					channel: "line",
					accountId: route.accountId
				});
				const { queuedFinal } = await dispatchReplyWithBufferedBlockDispatcher({
					ctx: ctxPayload,
					cfg: config,
					dispatcherOptions: {
						...replyPipeline,
						deliver: async (payload, _info) => {
							const lineData = payload.channelData?.line ?? {};
							if (ctx.userId && !ctx.isGroup) showLoadingAnimation(ctx.userId, { accountId: ctx.accountId }).catch(() => {});
							const { replyTokenUsed: nextReplyTokenUsed } = await deliverLineAutoReply({
								payload,
								lineData,
								to: ctxPayload.From,
								replyToken,
								replyTokenUsed,
								accountId: ctx.accountId,
								textLimit,
								deps: {
									buildTemplateMessageFromPayload,
									processLineMessage,
									chunkMarkdownText,
									sendLineReplyChunks,
									replyMessageLine,
									pushMessageLine,
									pushTextMessageWithQuickReplies,
									createQuickReplyItems,
									createTextMessageWithQuickReplies,
									pushMessagesLine,
									createFlexMessage,
									createImageMessage,
									createLocationMessage,
									onReplyError: (replyErr) => {
										logVerbose(`line: reply token failed, falling back to push: ${String(replyErr)}`);
									}
								}
							});
							replyTokenUsed = nextReplyTokenUsed;
							recordChannelRuntimeState({
								channel: "line",
								accountId: resolvedAccountId,
								state: { lastOutboundAt: Date.now() }
							});
						},
						onError: (err, info) => {
							runtime.error?.(danger(`line ${info.kind} reply failed: ${String(err)}`));
						}
					},
					replyOptions: { onModelSelected }
				});
				if (!queuedFinal) logVerbose(`line: no response generated for message from ${ctxPayload.From}`);
			} catch (err) {
				runtime.error?.(danger(`line: auto-reply failed: ${String(err)}`));
				if (replyToken) try {
					await replyMessageLine(replyToken, [{
						type: "text",
						text: "Sorry, I encountered an error processing your message."
					}], { accountId: ctx.accountId });
				} catch (replyErr) {
					runtime.error?.(danger(`line: error reply failed: ${String(replyErr)}`));
				}
			} finally {
				stopLoading?.();
			}
		}
	});
	const normalizedPath = normalizePluginHttpPath(webhookPath, "/line/webhook") ?? "/line/webhook";
	const createScopedLineWebhookHandler = (onRequestAuthenticated) => createLineNodeWebhookHandler({
		channelSecret: secret,
		bot,
		runtime,
		onRequestAuthenticated
	});
	const unregisterHttp = registerPluginHttpRoute({
		path: normalizedPath,
		auth: "plugin",
		replaceExisting: true,
		pluginId: "line",
		accountId: resolvedAccountId,
		log: (msg) => logVerbose(msg),
		handler: async (req, res) => {
			if (req.method !== "POST") {
				await createScopedLineWebhookHandler()(req, res);
				return;
			}
			const requestLifecycle = beginWebhookRequestPipelineOrReject({
				req,
				res,
				inFlightLimiter: lineWebhookInFlightLimiter,
				inFlightKey: `line:${resolvedAccountId}`
			});
			if (!requestLifecycle.ok) return;
			try {
				await createScopedLineWebhookHandler(requestLifecycle.release)(req, res);
			} finally {
				requestLifecycle.release();
			}
		}
	});
	logVerbose(`line: registered webhook handler at ${normalizedPath}`);
	let stopped = false;
	const stopHandler = () => {
		if (stopped) return;
		stopped = true;
		logVerbose(`line: stopping provider for account ${resolvedAccountId}`);
		unregisterHttp();
		recordChannelRuntimeState({
			channel: "line",
			accountId: resolvedAccountId,
			state: {
				running: false,
				lastStopAt: Date.now()
			}
		});
	};
	if (abortSignal?.aborted) stopHandler();
	else if (abortSignal) {
		abortSignal.addEventListener("abort", stopHandler, { once: true });
		await waitForAbortSignal(abortSignal);
	}
	return {
		account: bot.account,
		handleWebhook: bot.handleWebhook,
		stop: () => {
			stopHandler();
			abortSignal?.removeEventListener("abort", stopHandler);
		}
	};
}
//#endregion
export { startLineWebhook as a, downloadLineMedia as c, normalizeDmAllowFromWithStore as d, createLineWebhookMiddleware as i, isSenderAllowed as l, createLineNodeWebhookHandler as n, parseLineWebhookBody as o, readLineWebhookRequestBody as r, validateLineSignature as s, monitorLineProvider as t, normalizeAllowFrom as u };
