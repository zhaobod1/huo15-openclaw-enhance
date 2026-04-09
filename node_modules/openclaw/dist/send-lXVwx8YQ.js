import { i as getChildLogger } from "./logger-C-bijuBQ.js";
import { u as normalizeE164 } from "./utils-ms6h9yny.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import "./session-key-BR3Z-ljs.js";
import { a as loadConfig } from "./io-CS2J_l4V.js";
import { r as normalizeChannelId } from "./registry-Bol_V2Fp.js";
import { t as redactIdentifier } from "./redact-identifier-PKOeqlX2.js";
import { l as resolveStorePath } from "./paths-UazeViO92.js";
import { t as loadSessionStore } from "./store-load-CibBc4QB.js";
import { a as generateSecureUuid } from "./secure-random-BRacmrZN.js";
import { n as normalizePollInput } from "./polls-DHTlCLT8.js";
import { t as resolveOutboundSendDep } from "./send-deps-CVbk0lDS.js";
import { n as missingTargetError } from "./target-errors-9jgza0IW.js";
import { t as loadWebMedia } from "./web-media-Blt79Ld9.js";
import { n as resolveChannelGroupRequireMention, r as resolveChannelGroupToolsPolicy } from "./group-policy-D1X7pmp3.js";
import "./core-D7mi2qmR.js";
import { t as resolveMarkdownTableMode } from "./markdown-tables-hkAZKOT1.js";
import { t as convertMarkdownTables } from "./tables-BblJIt3c.js";
import { o as readChannelAllowFromStoreSync } from "./pairing-store--adbbV4I.js";
import "./channel-policy-DIVRdPsQ.js";
import "./channel-targets-BmwNqxOt.js";
import { t as resolveReactionLevel } from "./text-runtime-DQoOM_co.js";
import "./channel-pairing-DrJTvhRN.js";
import "./runtime-env-BLYCS7ta.js";
import "./config-runtime-OuR9WVXH.js";
import "./web-media-CwsGSbKF.js";
import { t as sanitizeForPlainText } from "./sanitize-text-9E3ODlSk.js";
import "./infra-runtime-DS3U08t7.js";
import "./media-runtime-BfmVsgHe.js";
import "./account-resolution-CIVX3Yfx.js";
import "./channel-actions-DLDrCW4b.js";
import "./channel-feedback-CG9vt7uF.js";
import { i as createAttachedChannelResultAdapter } from "./channel-send-result-6453QwSe.js";
import { l as resolveWhatsAppMediaMaxBytes, o as resolveDefaultWhatsAppAccountId, s as resolveWhatsAppAccount, u as resolveMergedWhatsAppAccountConfig } from "./accounts-DU73wvhy.js";
import { i as normalizeWhatsAppAllowFromEntries, o as normalizeWhatsAppTarget, t as isWhatsAppGroupJid } from "./normalize-target-Rq2SUNBo.js";
import { n as requireActiveWebListener } from "./active-listener-6k7uzSfv.js";
import "./config-api-DQdqnsff.js";
import { i as markdownToWhatsApp, o as toWhatsappJid } from "./text-runtime-DeiM8W1E.js";
//#region extensions/whatsapp/src/resolve-outbound-target.ts
function whatsappAllowFromPolicyError(target) {
	return /* @__PURE__ */ new Error(`Target "${target}" is not listed in the configured WhatsApp allowFrom policy.`);
}
function resolveWhatsAppOutboundTarget(params) {
	const trimmed = params.to?.trim() ?? "";
	const allowListRaw = (params.allowFrom ?? []).map((entry) => String(entry).trim()).filter(Boolean);
	const hasWildcard = allowListRaw.includes("*");
	const allowList = allowListRaw.filter((entry) => entry !== "*").map((entry) => normalizeWhatsAppTarget(entry)).filter((entry) => Boolean(entry));
	if (trimmed) {
		const normalizedTo = normalizeWhatsAppTarget(trimmed);
		if (!normalizedTo) return {
			ok: false,
			error: missingTargetError("WhatsApp", "<E.164|group JID>")
		};
		if (isWhatsAppGroupJid(normalizedTo)) return {
			ok: true,
			to: normalizedTo
		};
		if (hasWildcard || allowList.length === 0) return {
			ok: true,
			to: normalizedTo
		};
		if (allowList.includes(normalizedTo)) return {
			ok: true,
			to: normalizedTo
		};
		return {
			ok: false,
			error: whatsappAllowFromPolicyError(normalizedTo)
		};
	}
	return {
		ok: false,
		error: missingTargetError("WhatsApp", "<E.164|group JID>")
	};
}
//#endregion
//#region extensions/whatsapp/src/reaction-level.ts
/** Resolve the effective reaction level and its implications for WhatsApp. */
function resolveWhatsAppReactionLevel(params) {
	return resolveReactionLevel({
		value: resolveMergedWhatsAppAccountConfig({
			cfg: params.cfg,
			accountId: params.accountId
		}).reactionLevel,
		defaultLevel: "minimal",
		invalidFallback: "minimal"
	});
}
//#endregion
//#region extensions/whatsapp/src/config-accessors.ts
function formatWhatsAppConfigAllowFromEntries(allowFrom) {
	return normalizeWhatsAppAllowFromEntries(allowFrom);
}
//#endregion
//#region extensions/whatsapp/src/group-policy.ts
function resolveWhatsAppGroupRequireMention(params) {
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "whatsapp",
		groupId: params.groupId,
		accountId: params.accountId
	});
}
function resolveWhatsAppGroupToolPolicy(params) {
	return resolveChannelGroupToolsPolicy({
		cfg: params.cfg,
		channel: "whatsapp",
		groupId: params.groupId,
		accountId: params.accountId,
		senderId: params.senderId,
		senderName: params.senderName,
		senderUsername: params.senderUsername,
		senderE164: params.senderE164
	});
}
//#endregion
//#region extensions/whatsapp/src/group-intro.ts
const WHATSAPP_GROUP_INTRO_HINT = "WhatsApp IDs: SenderId is the participant JID (group participant id).";
function resolveWhatsAppGroupIntroHint() {
	return WHATSAPP_GROUP_INTRO_HINT;
}
function resolveWhatsAppMentionStripRegexes(ctx) {
	const selfE164 = (ctx.To ?? "").replace(/^whatsapp:/i, "");
	if (!selfE164) return [];
	const escaped = selfE164.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [new RegExp(escaped, "g"), new RegExp(`@${escaped}`, "g")];
}
//#endregion
//#region extensions/whatsapp/src/heartbeat-recipients.ts
function getSessionRecipients(cfg) {
	if ((cfg.session?.scope ?? "per-sender") === "global") return [];
	const store = loadSessionStore(resolveStorePath(cfg.session?.store));
	const isGroupKey = (key) => key.includes(":group:") || key.includes(":channel:") || key.includes("@g.us");
	const isCronKey = (key) => key.startsWith("cron:");
	const recipients = Object.entries(store).filter(([key]) => key !== "global" && key !== "unknown").filter(([key]) => !isGroupKey(key) && !isCronKey(key)).map(([_, entry]) => ({
		to: normalizeChannelId(entry?.lastChannel) === "whatsapp" && entry?.lastTo ? normalizeE164(entry.lastTo) : "",
		updatedAt: entry?.updatedAt ?? 0
	})).filter(({ to }) => to.length > 1).toSorted((a, b) => b.updatedAt - a.updatedAt);
	const seen = /* @__PURE__ */ new Set();
	return recipients.filter((recipient) => {
		if (seen.has(recipient.to)) return false;
		seen.add(recipient.to);
		return true;
	});
}
function resolveWhatsAppHeartbeatRecipients(cfg, opts = {}) {
	if (opts.to) return {
		recipients: [normalizeE164(opts.to)],
		source: "flag"
	};
	const sessionRecipients = getSessionRecipients(cfg);
	const resolvedAccountId = opts.accountId?.trim() || resolveDefaultWhatsAppAccountId(cfg) || "default";
	const configuredAllowFrom = (resolveWhatsAppAccount({
		cfg,
		accountId: resolvedAccountId
	}).allowFrom ?? []).filter((value) => value !== "*").map(normalizeE164);
	const storeAllowFrom = readChannelAllowFromStoreSync("whatsapp", process.env, resolvedAccountId).map(normalizeE164);
	const unique = (list) => [...new Set(list.filter(Boolean))];
	const allowFrom = unique([...configuredAllowFrom, ...storeAllowFrom]);
	if (opts.all) return {
		recipients: unique([...sessionRecipients.map((entry) => entry.to), ...allowFrom]),
		source: "all"
	};
	if (allowFrom.length > 0) {
		const allowSet = new Set(allowFrom);
		const authorizedSessionRecipients = sessionRecipients.map((entry) => entry.to).filter((recipient) => allowSet.has(recipient));
		if (authorizedSessionRecipients.length === 1) return {
			recipients: [authorizedSessionRecipients[0]],
			source: "session-single"
		};
		if (authorizedSessionRecipients.length > 1) return {
			recipients: authorizedSessionRecipients,
			source: "session-ambiguous"
		};
		return {
			recipients: allowFrom,
			source: "allowFrom"
		};
	}
	if (sessionRecipients.length === 1) return {
		recipients: [sessionRecipients[0].to],
		source: "session-single"
	};
	if (sessionRecipients.length > 1) return {
		recipients: sessionRecipients.map((entry) => entry.to),
		source: "session-ambiguous"
	};
	return {
		recipients: allowFrom,
		source: "allowFrom"
	};
}
//#endregion
//#region extensions/whatsapp/src/outbound-send-deps.ts
const WHATSAPP_LEGACY_OUTBOUND_SEND_DEP_KEYS = ["sendWhatsApp"];
//#endregion
//#region extensions/whatsapp/src/outbound-base.ts
function createWhatsAppOutboundBase({ chunker, sendMessageWhatsApp, sendPollWhatsApp, shouldLogVerbose, resolveTarget, normalizeText = (text) => text ?? "", skipEmptyText = false }) {
	return {
		deliveryMode: "gateway",
		chunker,
		chunkerMode: "text",
		textChunkLimit: 4e3,
		sanitizeText: ({ text }) => sanitizeForPlainText(text),
		pollMaxOptions: 12,
		resolveTarget,
		...createAttachedChannelResultAdapter({
			channel: "whatsapp",
			sendText: async ({ cfg, to, text, accountId, deps, gifPlayback }) => {
				const normalizedText = normalizeText(text);
				if (skipEmptyText && !normalizedText) return { messageId: "" };
				return await (resolveOutboundSendDep(deps, "whatsapp", { legacyKeys: WHATSAPP_LEGACY_OUTBOUND_SEND_DEP_KEYS }) ?? sendMessageWhatsApp)(to, normalizedText, {
					verbose: false,
					cfg,
					accountId: accountId ?? void 0,
					gifPlayback
				});
			},
			sendMedia: async ({ cfg, to, text, mediaUrl, mediaAccess, mediaLocalRoots, mediaReadFile, accountId, deps, gifPlayback }) => {
				return await (resolveOutboundSendDep(deps, "whatsapp", { legacyKeys: WHATSAPP_LEGACY_OUTBOUND_SEND_DEP_KEYS }) ?? sendMessageWhatsApp)(to, normalizeText(text), {
					verbose: false,
					cfg,
					mediaUrl,
					mediaAccess,
					mediaLocalRoots,
					mediaReadFile,
					accountId: accountId ?? void 0,
					gifPlayback
				});
			},
			sendPoll: async ({ cfg, to, poll, accountId }) => await sendPollWhatsApp(to, poll, {
				verbose: shouldLogVerbose(),
				accountId: accountId ?? void 0,
				cfg
			})
		})
	};
}
//#endregion
//#region extensions/whatsapp/src/runtime-api.ts
async function loadOutboundMediaFromUrl(mediaUrl, options = {}) {
	const readFile = options.mediaAccess?.readFile ?? options.mediaReadFile;
	const localRoots = options.mediaAccess?.localRoots?.length && options.mediaAccess.localRoots.length > 0 ? options.mediaAccess.localRoots : options.mediaLocalRoots && options.mediaLocalRoots.length > 0 ? options.mediaLocalRoots : void 0;
	return await loadWebMedia(mediaUrl, readFile ? {
		...options.maxBytes !== void 0 ? { maxBytes: options.maxBytes } : {},
		localRoots: "any",
		readFile,
		hostReadCapability: true
	} : {
		...options.maxBytes !== void 0 ? { maxBytes: options.maxBytes } : {},
		...localRoots ? { localRoots } : {}
	});
}
//#endregion
//#region extensions/whatsapp/src/send.ts
const outboundLog = createSubsystemLogger("gateway/channels/whatsapp").child("outbound");
function resolveOutboundWhatsAppAccountId(params) {
	const explicitAccountId = params.accountId?.trim();
	if (explicitAccountId) return explicitAccountId;
	return resolveDefaultWhatsAppAccountId(params.cfg);
}
async function sendMessageWhatsApp(to, body, options) {
	let text = body.trimStart();
	const jid = toWhatsappJid(to);
	if (!text && !options.mediaUrl) return {
		messageId: "",
		toJid: jid
	};
	const correlationId = generateSecureUuid();
	const startedAt = Date.now();
	const cfg = options.cfg ?? loadConfig();
	const { listener: active, accountId: resolvedAccountId } = requireActiveWebListener(resolveOutboundWhatsAppAccountId({
		cfg,
		accountId: options.accountId
	}));
	const account = resolveWhatsAppAccount({
		cfg,
		accountId: resolvedAccountId ?? options.accountId
	});
	const tableMode = resolveMarkdownTableMode({
		cfg,
		channel: "whatsapp",
		accountId: resolvedAccountId ?? options.accountId
	});
	text = convertMarkdownTables(text ?? "", tableMode);
	text = markdownToWhatsApp(text);
	const redactedTo = redactIdentifier(to);
	const logger = getChildLogger({
		module: "web-outbound",
		correlationId,
		to: redactedTo
	});
	try {
		const redactedJid = redactIdentifier(jid);
		let mediaBuffer;
		let mediaType;
		let documentFileName;
		if (options.mediaUrl) {
			const media = await loadOutboundMediaFromUrl(options.mediaUrl, {
				maxBytes: resolveWhatsAppMediaMaxBytes(account),
				mediaAccess: options.mediaAccess,
				mediaLocalRoots: options.mediaLocalRoots,
				mediaReadFile: options.mediaReadFile
			});
			const caption = text || void 0;
			mediaBuffer = media.buffer;
			mediaType = media.contentType ?? "application/octet-stream";
			if (media.kind === "audio") mediaType = media.contentType === "audio/ogg" ? "audio/ogg; codecs=opus" : media.contentType ?? "application/octet-stream";
			else if (media.kind === "video") text = caption ?? "";
			else if (media.kind === "image") text = caption ?? "";
			else {
				text = caption ?? "";
				documentFileName = media.fileName;
			}
		}
		outboundLog.info(`Sending message -> ${redactedJid}${options.mediaUrl ? " (media)" : ""}`);
		logger.info({
			jid: redactedJid,
			hasMedia: Boolean(options.mediaUrl)
		}, "sending message");
		await active.sendComposingTo(to);
		const accountId = Boolean(options.accountId?.trim()) ? resolvedAccountId : void 0;
		const sendOptions = options.gifPlayback || accountId || documentFileName ? {
			...options.gifPlayback ? { gifPlayback: true } : {},
			...documentFileName ? { fileName: documentFileName } : {},
			accountId
		} : void 0;
		const messageId = (sendOptions ? await active.sendMessage(to, text, mediaBuffer, mediaType, sendOptions) : await active.sendMessage(to, text, mediaBuffer, mediaType))?.messageId ?? "unknown";
		const durationMs = Date.now() - startedAt;
		outboundLog.info(`Sent message ${messageId} -> ${redactedJid}${options.mediaUrl ? " (media)" : ""} (${durationMs}ms)`);
		logger.info({
			jid: redactedJid,
			messageId
		}, "sent message");
		return {
			messageId,
			toJid: jid
		};
	} catch (err) {
		logger.error({
			err: String(err),
			to: redactedTo,
			hasMedia: Boolean(options.mediaUrl)
		}, "failed to send via web session");
		throw err;
	}
}
async function sendReactionWhatsApp(chatJid, messageId, emoji, options) {
	const correlationId = generateSecureUuid();
	const { listener: active } = requireActiveWebListener(resolveOutboundWhatsAppAccountId({
		cfg: loadConfig(),
		accountId: options.accountId
	}));
	const redactedChatJid = redactIdentifier(chatJid);
	const logger = getChildLogger({
		module: "web-outbound",
		correlationId,
		chatJid: redactedChatJid,
		messageId
	});
	try {
		const redactedJid = redactIdentifier(toWhatsappJid(chatJid));
		outboundLog.info(`Sending reaction "${emoji}" -> message ${messageId}`);
		logger.info({
			chatJid: redactedJid,
			messageId,
			emoji
		}, "sending reaction");
		await active.sendReaction(chatJid, messageId, emoji, options.fromMe ?? false, options.participant);
		outboundLog.info(`Sent reaction "${emoji}" -> message ${messageId}`);
		logger.info({
			chatJid: redactedJid,
			messageId,
			emoji
		}, "sent reaction");
	} catch (err) {
		logger.error({
			err: String(err),
			chatJid: redactedChatJid,
			messageId,
			emoji
		}, "failed to send reaction via web session");
		throw err;
	}
}
async function sendPollWhatsApp(to, poll, options) {
	const correlationId = generateSecureUuid();
	const startedAt = Date.now();
	const { listener: active } = requireActiveWebListener(resolveOutboundWhatsAppAccountId({
		cfg: options.cfg ?? loadConfig(),
		accountId: options.accountId
	}));
	const redactedTo = redactIdentifier(to);
	const logger = getChildLogger({
		module: "web-outbound",
		correlationId,
		to: redactedTo
	});
	try {
		const jid = toWhatsappJid(to);
		const redactedJid = redactIdentifier(jid);
		const normalized = normalizePollInput(poll, { maxOptions: 12 });
		outboundLog.info(`Sending poll -> ${redactedJid}`);
		logger.info({
			jid: redactedJid,
			optionCount: normalized.options.length,
			maxSelections: normalized.maxSelections
		}, "sending poll");
		const messageId = (await active.sendPoll(to, normalized))?.messageId ?? "unknown";
		const durationMs = Date.now() - startedAt;
		outboundLog.info(`Sent poll ${messageId} -> ${redactedJid} (${durationMs}ms)`);
		logger.info({
			jid: redactedJid,
			messageId
		}, "sent poll");
		return {
			messageId,
			toJid: jid
		};
	} catch (err) {
		logger.error({
			err: String(err),
			to: redactedTo
		}, "failed to send poll via web session");
		throw err;
	}
}
//#endregion
export { WHATSAPP_LEGACY_OUTBOUND_SEND_DEP_KEYS as a, resolveWhatsAppMentionStripRegexes as c, formatWhatsAppConfigAllowFromEntries as d, resolveWhatsAppReactionLevel as f, createWhatsAppOutboundBase as i, resolveWhatsAppGroupRequireMention as l, sendPollWhatsApp as n, resolveWhatsAppHeartbeatRecipients as o, resolveWhatsAppOutboundTarget as p, sendReactionWhatsApp as r, resolveWhatsAppGroupIntroHint as s, sendMessageWhatsApp as t, resolveWhatsAppGroupToolPolicy as u };
