import { l as isRecord } from "./utils-ms6h9yny.js";
import { t as formatDocsLink } from "./links-BFfjc3N-.js";
import { _ as normalizeAccountId, d as resolveThreadSessionKeys, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { t as getGlobalHookRunner } from "./hook-runner-global-Dd0oQ2OY.js";
import { a as hasConfiguredSecretInput, l as normalizeSecretInputString } from "./types.secrets-BZdSA8i7.js";
import { d as readNumberParam, h as readStringParam, i as createActionGate } from "./common-B7pbdYUb.js";
import { _ as sendPayloadMediaSequenceAndFinalize, b as sendTextMediaPayload, f as resolvePayloadMediaUrls } from "./reply-payload-Dp5nBPsr.js";
import { a as normalizeInteractiveReply, o as resolveInteractiveTextFallback } from "./payload-Dw_f_f7y.js";
import { o as isSingleUseReplyToMode } from "./reply-threading-B6KmGqp6.js";
import { t as resolveOutboundSendDep } from "./send-deps-CVbk0lDS.js";
import { c as createScopedChannelConfigAdapter, t as adaptScopedAccountAccessor, u as createScopedDmSecurityResolver } from "./channel-config-helpers-CWYUF2eN.js";
import { r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
import { t as collectProviderDangerousNameMatchingScopes } from "./dangerous-name-matching-CMg2IF_2.js";
import { n as describeAccountSnapshot } from "./account-helpers-A6tF0W1f.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-2NJCUHEq.js";
import { r as createEnvPatchedAccountSetupAdapter } from "./setup-helpers-BiAtGxsL.js";
import { t as normalizeOutboundThreadId } from "./routing-DdBDhOmH.js";
import "./secret-input-D5U3kuko.js";
import { t as formatAllowFromLowercase } from "./allow-from-DjymPYUA.js";
import { y as createOpenProviderConfiguredRouteWarningCollector } from "./channel-policy-DIVRdPsQ.js";
import { t as createChannelDirectoryAdapter } from "./directory-runtime-BrmKrim8.js";
import { t as createRuntimeDirectoryLiveAdapter } from "./runtime-forwarders-Dhqc-dWG.js";
import { n as resolveTargetsWithOptionalToken } from "./target-resolvers-iFdDie3z.js";
import { A as promptLegacyChannelAllowFromForAccount, I as resolveEntriesWithOptionalToken, J as setSetupChannelEnabled, S as parseMentionOrPrefixedId, T as patchChannelConfigForAccount, b as noteChannelLookupFailure, f as createStandardChannelSetupStatus, i as createAccountScopedGroupAccessSection, o as createLegacyCompatChannelDmPolicy, r as createAccountScopedAllowFromSection, x as noteChannelLookupSummary } from "./setup-wizard-helpers-ecC16ic3.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-B1YYl-hh.js";
import "./text-runtime-DQoOM_co.js";
import { i as createPairingPrefixStripper } from "./channel-pairing-DrJTvhRN.js";
import { d as createDefaultChannelRuntimeState, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import "./runtime-doctor-Ac5edmSG.js";
import "./setup-runtime-QdMg-xhs.js";
import "./setup-tools-DC-2q-4o.js";
import { o as resolveConfiguredFromRequiredCredentialStatuses, r as projectCredentialSnapshotFields } from "./account-snapshot-fields-mnjlKuYD.js";
import "./reply-reference-Cj_oG6hf.js";
import "./outbound-runtime-BSC4z6CP.js";
import "./plugin-runtime-UqZYCyH_.js";
import "./account-resolution-CIVX3Yfx.js";
import { o as createAccountScopedAllowlistNameResolver, r as buildLegacyDmAccountAllowlistAdapter, s as createFlatAllowlistOverrideResolver } from "./allowlist-config-edit-CWwW-8J5.js";
import { n as buildPassiveProbedChannelStatusSummary } from "./extension-shared-CKz43ndd.js";
import "./channel-actions-DLDrCW4b.js";
import { n as createChatChannelPlugin } from "./channel-core-BVR4R0_P.js";
import { i as createAttachedChannelResultAdapter, t as attachChannelToResult } from "./channel-send-result-6453QwSe.js";
import "./param-readers-BFYbGwQ3.js";
import { a as resolveSlackAccount, i as resolveDefaultSlackAccountId, n as listSlackAccountIds, o as resolveSlackReplyToMode, r as mergeSlackAccountConfig, t as listEnabledSlackAccounts } from "./accounts-BpbTO6KH.js";
import { i as resolveSlackChannelId, n as normalizeSlackMessagingTarget, r as parseSlackTarget, t as looksLikeSlackTargetId } from "./target-parsing-Tzk67ZVP.js";
import { c as slackApprovalCapability, p as shouldSuppressLocalSlackExecApprovalPrompt, r as normalizeAllowListLower } from "./allow-list-D2vNJG1C.js";
import { r as parseSlackBlocksInput, t as getChatChannelMeta } from "./channel-api-CwipSosz.js";
import { i as buildSlackInteractiveBlocks, t as resolveSlackReplyBlocks } from "./reply-blocks-BoG6TIOy.js";
import { r as createSlackWebClient } from "./client-C5Kf086m.js";
import { a as resolveSlackGroupToolPolicy, i as resolveSlackGroupRequireMention, n as getSlackRuntime, t as getOptionalSlackRuntime } from "./runtime-D6Ziyk7-.js";
import { t as SLACK_TEXT_LIMIT } from "./limits-B8v6ifkJ.js";
import { n as secretTargetRegistryEntries, r as collectSlackSecurityAuditFindings, t as collectRuntimeConfigAssignments } from "./secret-contract-CPZX2SUs.js";
import { t as SlackChannelConfigSchema } from "./config-schema-B6LOfmyx.js";
import { a as resolveSlackStreamingMode, i as resolveSlackNativeStreaming, n as formatSlackStreamingBooleanMigrationMessage, t as formatSlackStreamModeMigrationMessage } from "./streaming-compat-DD36WDEG.js";
import { t as resolveSlackChannelAllowlist } from "./resolve-channels-DWtECfQ-.js";
import { t as resolveSlackUserAllowlist } from "./resolve-users-DiYm9cnJ.js";
import { Type } from "@sinclair/typebox";
//#region extensions/slack/src/action-threading.ts
function resolveSlackAutoThreadId(params) {
	const context = params.toolContext;
	if (!context?.currentThreadTs || !context.currentChannelId) return;
	if (context.replyToMode !== "all" && !isSingleUseReplyToMode(context.replyToMode ?? "off")) return;
	const parsedTarget = parseSlackTarget(params.to, { defaultKind: "channel" });
	if (!parsedTarget || parsedTarget.kind !== "channel") return;
	if (parsedTarget.id.toLowerCase() !== context.currentChannelId.toLowerCase()) return;
	if (isSingleUseReplyToMode(context.replyToMode ?? "off") && context.hasRepliedRef?.value) return;
	return context.currentThreadTs;
}
//#endregion
//#region extensions/slack/src/interactive-replies.ts
const SLACK_BUTTON_MAX_ITEMS = 5;
const SLACK_SELECT_MAX_ITEMS = 100;
const SLACK_DIRECTIVE_RE = /\[\[(slack_buttons|slack_select):\s*([^\]]+)\]\]/gi;
const SLACK_OPTIONS_LINE_RE = /^\s*Options:\s*(.+?)\s*\.?\s*$/i;
const SLACK_AUTO_SELECT_MAX_ITEMS = 12;
const SLACK_SIMPLE_OPTION_RE = /^[a-z0-9][a-z0-9 _+/-]{0,31}$/i;
function parseChoice(raw, options) {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const delimiter = trimmed.indexOf(":");
	if (delimiter === -1) return {
		label: trimmed,
		value: trimmed
	};
	const label = trimmed.slice(0, delimiter).trim();
	let value = trimmed.slice(delimiter + 1).trim();
	if (!label || !value) return null;
	let style;
	if (options?.allowStyle) {
		const styleDelimiter = value.lastIndexOf(":");
		if (styleDelimiter !== -1) {
			const maybeStyle = value.slice(styleDelimiter + 1).trim().toLowerCase();
			if (maybeStyle === "primary" || maybeStyle === "secondary" || maybeStyle === "success" || maybeStyle === "danger") {
				const unstyledValue = value.slice(0, styleDelimiter).trim();
				if (unstyledValue) {
					value = unstyledValue;
					style = maybeStyle;
				}
			}
		}
	}
	return style ? {
		label,
		value,
		style
	} : {
		label,
		value
	};
}
function parseChoices(raw, maxItems, options) {
	return raw.split(",").map((entry) => parseChoice(entry, options)).filter((entry) => Boolean(entry)).slice(0, maxItems);
}
function buildTextBlock(text) {
	const trimmed = text.trim();
	if (!trimmed) return null;
	return {
		type: "text",
		text: trimmed
	};
}
function buildButtonsBlock(raw) {
	const choices = parseChoices(raw, SLACK_BUTTON_MAX_ITEMS, { allowStyle: true });
	if (choices.length === 0) return null;
	return {
		type: "buttons",
		buttons: choices.map((choice) => ({
			label: choice.label,
			value: choice.value,
			...choice.style ? { style: choice.style } : {}
		}))
	};
}
function buildSelectBlock(raw) {
	const parts = raw.split("|").map((entry) => entry.trim()).filter(Boolean);
	if (parts.length === 0) return null;
	const [first, second] = parts;
	const placeholder = parts.length >= 2 ? first : "Choose an option";
	const choices = parseChoices(parts.length >= 2 ? second : first, SLACK_SELECT_MAX_ITEMS);
	if (choices.length === 0) return null;
	return {
		type: "select",
		placeholder,
		options: choices
	};
}
function hasSlackBlocks(payload) {
	const blocks = (payload.channelData?.slack)?.blocks;
	if (typeof blocks === "string") return blocks.trim().length > 0;
	return Array.isArray(blocks) && blocks.length > 0;
}
function parseSimpleSlackOptions(raw) {
	const entries = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
	if (entries.length < 2 || entries.length > SLACK_AUTO_SELECT_MAX_ITEMS) return null;
	if (!entries.every((entry) => SLACK_SIMPLE_OPTION_RE.test(entry))) return null;
	if (new Set(entries.map((entry) => entry.toLowerCase())).size !== entries.length) return null;
	return entries.map((entry) => ({
		label: entry,
		value: entry
	}));
}
function resolveInteractiveRepliesFromCapabilities(capabilities) {
	if (!capabilities) return false;
	if (Array.isArray(capabilities)) return capabilities.some((entry) => String(entry).trim().toLowerCase() === "interactivereplies");
	if (typeof capabilities === "object") return capabilities.interactiveReplies === true;
	return false;
}
function isSlackInteractiveRepliesEnabled(params) {
	return resolveInteractiveRepliesFromCapabilities(resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId ?? resolveDefaultSlackAccountId(params.cfg)
	}).config.capabilities);
}
function compileSlackInteractiveReplies(payload) {
	const text = payload.text;
	if (!text) return payload;
	const generatedBlocks = [];
	const visibleTextParts = [];
	let cursor = 0;
	let matchedDirective = false;
	let generatedInteractiveBlock = false;
	SLACK_DIRECTIVE_RE.lastIndex = 0;
	for (const match of text.matchAll(SLACK_DIRECTIVE_RE)) {
		matchedDirective = true;
		const matchText = match[0];
		const directiveType = match[1];
		const body = match[2];
		const index = match.index ?? 0;
		const precedingText = text.slice(cursor, index);
		visibleTextParts.push(precedingText);
		const section = buildTextBlock(precedingText);
		if (section) generatedBlocks.push(section);
		const block = directiveType.toLowerCase() === "slack_buttons" ? buildButtonsBlock(body) : buildSelectBlock(body);
		if (block) {
			generatedInteractiveBlock = true;
			generatedBlocks.push(block);
		}
		cursor = index + matchText.length;
	}
	const trailingText = text.slice(cursor);
	visibleTextParts.push(trailingText);
	const trailingSection = buildTextBlock(trailingText);
	if (trailingSection) generatedBlocks.push(trailingSection);
	const cleanedText = visibleTextParts.join("");
	if (!matchedDirective || !generatedInteractiveBlock) return parseSlackOptionsLine(payload);
	return {
		...payload,
		text: cleanedText.trim() || void 0,
		interactive: { blocks: [...payload.interactive?.blocks ?? [], ...generatedBlocks] }
	};
}
function parseSlackOptionsLine(payload) {
	const text = payload.text;
	if (!text || payload.interactive?.blocks?.length || hasSlackBlocks(payload)) return payload;
	const lines = text.split("\n");
	const lastNonEmptyIndex = [...lines.keys()].toReversed().find((index) => lines[index]?.trim());
	if (lastNonEmptyIndex == null) return payload;
	const match = (lines[lastNonEmptyIndex] ?? "").match(SLACK_OPTIONS_LINE_RE);
	if (!match) return payload;
	const choices = parseSimpleSlackOptions(match[1] ?? "");
	if (!choices) return payload;
	const bodyText = lines.filter((_, index) => index !== lastNonEmptyIndex).join("\n").trim();
	const generatedBlocks = [];
	const bodyBlock = buildTextBlock(bodyText);
	if (bodyBlock) generatedBlocks.push(bodyBlock);
	generatedBlocks.push(choices.length <= SLACK_BUTTON_MAX_ITEMS ? {
		type: "buttons",
		buttons: choices
	} : {
		type: "select",
		placeholder: "Choose an option",
		options: choices
	});
	return {
		...payload,
		text: bodyText || void 0,
		interactive: { blocks: [...payload.interactive?.blocks ?? [], ...generatedBlocks] }
	};
}
//#endregion
//#region extensions/slack/src/message-action-dispatch.ts
function readSlackBlocksParam(actionParams) {
	return parseSlackBlocksInput(actionParams.blocks);
}
/** Translate generic channel action requests into Slack-specific tool invocations and payload shapes. */
async function handleSlackMessageAction(params) {
	const { providerId, ctx, invoke, normalizeChannelId, includeReadThreadId = false } = params;
	const { action, cfg, params: actionParams } = ctx;
	const accountId = ctx.accountId ?? void 0;
	const resolveChannelId = () => {
		const channelId = readStringParam(actionParams, "channelId") ?? readStringParam(actionParams, "to", { required: true });
		return normalizeChannelId ? normalizeChannelId(channelId) : channelId;
	};
	if (action === "send") {
		const to = readStringParam(actionParams, "to", { required: true });
		const content = readStringParam(actionParams, "message", {
			required: false,
			allowEmpty: true
		});
		const mediaUrl = readStringParam(actionParams, "media", { trim: false });
		const interactive = normalizeInteractiveReply(actionParams.interactive);
		const interactiveBlocks = interactive ? buildSlackInteractiveBlocks(interactive) : void 0;
		const blocks = readSlackBlocksParam(actionParams) ?? interactiveBlocks;
		if (!content && !mediaUrl && !blocks) throw new Error("Slack send requires message, blocks, or media.");
		if (mediaUrl && blocks) throw new Error("Slack send does not support blocks with media.");
		const threadId = readStringParam(actionParams, "threadId");
		const replyTo = readStringParam(actionParams, "replyTo");
		return await invoke({
			action: "sendMessage",
			to,
			content: content ?? "",
			mediaUrl: mediaUrl ?? void 0,
			accountId,
			threadTs: threadId ?? replyTo ?? void 0,
			...blocks ? { blocks } : {}
		}, cfg, ctx.toolContext);
	}
	if (action === "react") {
		const messageId = readStringParam(actionParams, "messageId", { required: true });
		const emoji = readStringParam(actionParams, "emoji", { allowEmpty: true });
		const remove = typeof actionParams.remove === "boolean" ? actionParams.remove : void 0;
		return await invoke({
			action: "react",
			channelId: resolveChannelId(),
			messageId,
			emoji,
			remove,
			accountId
		}, cfg);
	}
	if (action === "reactions") {
		const messageId = readStringParam(actionParams, "messageId", { required: true });
		const limit = readNumberParam(actionParams, "limit", { integer: true });
		return await invoke({
			action: "reactions",
			channelId: resolveChannelId(),
			messageId,
			limit,
			accountId
		}, cfg);
	}
	if (action === "read") {
		const limit = readNumberParam(actionParams, "limit", { integer: true });
		const readAction = {
			action: "readMessages",
			channelId: resolveChannelId(),
			limit,
			before: readStringParam(actionParams, "before"),
			after: readStringParam(actionParams, "after"),
			accountId
		};
		if (includeReadThreadId) readAction.threadId = readStringParam(actionParams, "threadId");
		return await invoke(readAction, cfg);
	}
	if (action === "edit") {
		const messageId = readStringParam(actionParams, "messageId", { required: true });
		const content = readStringParam(actionParams, "message", { allowEmpty: true });
		const blocks = readSlackBlocksParam(actionParams);
		if (!content && !blocks) throw new Error("Slack edit requires message or blocks.");
		return await invoke({
			action: "editMessage",
			channelId: resolveChannelId(),
			messageId,
			content: content ?? "",
			blocks,
			accountId
		}, cfg);
	}
	if (action === "delete") {
		const messageId = readStringParam(actionParams, "messageId", { required: true });
		return await invoke({
			action: "deleteMessage",
			channelId: resolveChannelId(),
			messageId,
			accountId
		}, cfg);
	}
	if (action === "pin" || action === "unpin" || action === "list-pins") {
		const messageId = action === "list-pins" ? void 0 : readStringParam(actionParams, "messageId", { required: true });
		return await invoke({
			action: action === "pin" ? "pinMessage" : action === "unpin" ? "unpinMessage" : "listPins",
			channelId: resolveChannelId(),
			messageId,
			accountId
		}, cfg);
	}
	if (action === "member-info") return await invoke({
		action: "memberInfo",
		userId: readStringParam(actionParams, "userId", { required: true }),
		accountId
	}, cfg);
	if (action === "emoji-list") return await invoke({
		action: "emojiList",
		limit: readNumberParam(actionParams, "limit", { integer: true }),
		accountId
	}, cfg);
	if (action === "download-file") {
		const fileId = readStringParam(actionParams, "fileId", { required: true });
		const channelId = readStringParam(actionParams, "channelId") ?? readStringParam(actionParams, "to");
		const threadId = readStringParam(actionParams, "threadId") ?? readStringParam(actionParams, "replyTo");
		return await invoke({
			action: "downloadFile",
			fileId,
			channelId: channelId ?? void 0,
			threadId: threadId ?? void 0,
			accountId
		}, cfg);
	}
	if (action === "upload-file") {
		const to = readStringParam(actionParams, "to") ?? resolveChannelId();
		const filePath = readStringParam(actionParams, "filePath", { trim: false }) ?? readStringParam(actionParams, "path", { trim: false }) ?? readStringParam(actionParams, "media", { trim: false });
		if (!filePath) throw new Error("upload-file requires filePath, path, or media");
		const threadId = readStringParam(actionParams, "threadId") ?? readStringParam(actionParams, "replyTo");
		return await invoke({
			action: "uploadFile",
			to,
			filePath,
			initialComment: readStringParam(actionParams, "initialComment", { allowEmpty: true }) ?? readStringParam(actionParams, "message", { allowEmpty: true }) ?? "",
			filename: readStringParam(actionParams, "filename"),
			title: readStringParam(actionParams, "title"),
			threadTs: threadId ?? void 0,
			accountId
		}, cfg, ctx.toolContext);
	}
	throw new Error(`Action ${action} is not supported for provider ${providerId}.`);
}
//#endregion
//#region extensions/slack/src/message-actions.ts
function listSlackMessageActions(cfg, accountId) {
	const accounts = (accountId ? [resolveSlackAccount({
		cfg,
		accountId
	})] : listEnabledSlackAccounts(cfg)).filter((account) => account.enabled && account.botTokenSource !== "none");
	if (accounts.length === 0) return [];
	const isActionEnabled = (key, defaultValue = true) => {
		for (const account of accounts) if (createActionGate(account.actions ?? cfg.channels?.slack?.actions)(key, defaultValue)) return true;
		return false;
	};
	const actions = new Set(["send"]);
	if (isActionEnabled("reactions")) {
		actions.add("react");
		actions.add("reactions");
	}
	if (isActionEnabled("messages")) {
		actions.add("read");
		actions.add("edit");
		actions.add("delete");
		actions.add("download-file");
		actions.add("upload-file");
	}
	if (isActionEnabled("pins")) {
		actions.add("pin");
		actions.add("unpin");
		actions.add("list-pins");
	}
	if (isActionEnabled("memberInfo")) actions.add("member-info");
	if (isActionEnabled("emojiList")) actions.add("emoji-list");
	return Array.from(actions);
}
function extractSlackToolSend(args) {
	if ((typeof args.action === "string" ? args.action.trim() : "") !== "sendMessage") return null;
	const to = typeof args.to === "string" ? args.to : void 0;
	if (!to) return null;
	return {
		to,
		accountId: typeof args.accountId === "string" ? args.accountId.trim() : void 0
	};
}
//#endregion
//#region extensions/slack/src/message-tool-schema.ts
function createSlackMessageToolBlocksSchema() {
	return Type.Array(Type.Object({}, {
		additionalProperties: true,
		description: "Slack Block Kit payload blocks (Slack only)."
	}));
}
//#endregion
//#region extensions/slack/src/channel-actions.ts
let slackActionRuntimePromise$1;
async function loadSlackActionRuntime$1() {
	slackActionRuntimePromise$1 ??= import("./action-runtime.runtime-SZRgItl4.js");
	return await slackActionRuntimePromise$1;
}
function createSlackActions(providerId, options) {
	function describeMessageTool({ cfg, accountId }) {
		const actions = listSlackMessageActions(cfg, accountId);
		const capabilities = /* @__PURE__ */ new Set();
		if (actions.includes("send")) capabilities.add("blocks");
		if (isSlackInteractiveRepliesEnabled({
			cfg,
			accountId
		})) capabilities.add("interactive");
		return {
			actions,
			capabilities: Array.from(capabilities),
			schema: actions.includes("send") ? { properties: { blocks: Type.Optional(createSlackMessageToolBlocksSchema()) } } : null
		};
	}
	return {
		describeMessageTool,
		extractToolSend: ({ args }) => extractSlackToolSend(args),
		handleAction: async (ctx) => {
			return await handleSlackMessageAction({
				providerId,
				ctx,
				normalizeChannelId: resolveSlackChannelId,
				includeReadThreadId: true,
				invoke: async (action, cfg, toolContext) => await (options?.invoke ? options.invoke(action, cfg, toolContext) : (await loadSlackActionRuntime$1()).handleSlackAction(action, cfg, {
					...toolContext,
					mediaLocalRoots: ctx.mediaLocalRoots,
					mediaReadFile: ctx.mediaReadFile
				}))
			});
		}
	};
}
//#endregion
//#region extensions/slack/src/channel-type.ts
const SLACK_CHANNEL_TYPE_CACHE = /* @__PURE__ */ new Map();
async function resolveSlackChannelType(params) {
	const channelId = params.channelId.trim();
	if (!channelId) return "unknown";
	const account = resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const cacheKey = `${account.accountId}:${channelId}`;
	const cached = SLACK_CHANNEL_TYPE_CACHE.get(cacheKey);
	if (cached) return cached;
	const groupChannels = normalizeAllowListLower(account.dm?.groupChannels);
	const channelIdLower = channelId.toLowerCase();
	if (groupChannels.includes(channelIdLower) || groupChannels.includes(`slack:${channelIdLower}`) || groupChannels.includes(`channel:${channelIdLower}`) || groupChannels.includes(`group:${channelIdLower}`) || groupChannels.includes(`mpim:${channelIdLower}`)) {
		SLACK_CHANNEL_TYPE_CACHE.set(cacheKey, "group");
		return "group";
	}
	if (Object.keys(account.channels ?? {}).some((key) => {
		const normalized = key.trim().toLowerCase();
		return normalized === channelIdLower || normalized === `channel:${channelIdLower}` || normalized.replace(/^#/, "") === channelIdLower;
	})) {
		SLACK_CHANNEL_TYPE_CACHE.set(cacheKey, "channel");
		return "channel";
	}
	const token = account.botToken?.trim() || account.config.userToken?.trim() || "";
	if (!token) {
		SLACK_CHANNEL_TYPE_CACHE.set(cacheKey, "unknown");
		return "unknown";
	}
	try {
		const channel = (await createSlackWebClient(token).conversations.info({ channel: channelId })).channel;
		const type = channel?.is_im ? "dm" : channel?.is_mpim ? "group" : "channel";
		SLACK_CHANNEL_TYPE_CACHE.set(cacheKey, type);
		return type;
	} catch {
		SLACK_CHANNEL_TYPE_CACHE.set(cacheKey, "unknown");
		return "unknown";
	}
}
function __resetSlackChannelTypeCacheForTest() {
	SLACK_CHANNEL_TYPE_CACHE.clear();
}
//#endregion
//#region extensions/slack/src/outbound-adapter.ts
const SLACK_MAX_BLOCKS = 50;
let slackSendRuntimePromise$1;
async function loadSlackSendRuntime$1() {
	slackSendRuntimePromise$1 ??= import("./send.runtime-CAAfG-Ak.js");
	return await slackSendRuntimePromise$1;
}
function resolveRenderedInteractiveBlocks(interactive) {
	if (!interactive) return;
	const blocks = buildSlackInteractiveBlocks(interactive);
	return blocks.length > 0 ? blocks : void 0;
}
function resolveSlackSendIdentity(identity) {
	if (!identity) return;
	const username = identity.name?.trim() || void 0;
	const iconUrl = identity.avatarUrl?.trim() || void 0;
	const rawEmoji = identity.emoji?.trim();
	const iconEmoji = !iconUrl && rawEmoji && /^:[^:\s]+:$/.test(rawEmoji) ? rawEmoji : void 0;
	if (!username && !iconUrl && !iconEmoji) return;
	return {
		username,
		iconUrl,
		iconEmoji
	};
}
async function applySlackMessageSendingHooks(params) {
	const hookRunner = getGlobalHookRunner();
	if (!hookRunner?.hasHooks("message_sending")) return {
		cancelled: false,
		text: params.text
	};
	const account = resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const hookResult = await hookRunner.runMessageSending({
		to: params.to,
		content: params.text,
		metadata: {
			threadTs: params.threadTs,
			channelId: params.to,
			...params.mediaUrl ? { mediaUrl: params.mediaUrl } : {}
		}
	}, {
		channelId: "slack",
		accountId: account.accountId
	});
	if (hookResult?.cancel) return {
		cancelled: true,
		text: params.text
	};
	return {
		cancelled: false,
		text: hookResult?.content ?? params.text
	};
}
async function sendSlackOutboundMessage(params) {
	const send = resolveOutboundSendDep(params.deps, "slack") ?? (await loadSlackSendRuntime$1()).sendMessageSlack;
	const threadTs = params.replyToId ?? (params.threadId != null ? String(params.threadId) : void 0);
	const hookResult = await applySlackMessageSendingHooks({
		cfg: params.cfg,
		to: params.to,
		text: params.text,
		threadTs,
		mediaUrl: params.mediaUrl,
		accountId: params.accountId ?? void 0
	});
	if (hookResult.cancelled) return {
		messageId: "cancelled-by-hook",
		channelId: params.to,
		meta: { cancelled: true }
	};
	const slackIdentity = resolveSlackSendIdentity(params.identity);
	return await send(params.to, hookResult.text, {
		cfg: params.cfg,
		threadTs,
		accountId: params.accountId ?? void 0,
		...params.mediaUrl ? {
			mediaUrl: params.mediaUrl,
			mediaAccess: params.mediaAccess,
			mediaLocalRoots: params.mediaLocalRoots,
			mediaReadFile: params.mediaReadFile
		} : {},
		...params.blocks ? { blocks: params.blocks } : {},
		...slackIdentity ? { identity: slackIdentity } : {}
	});
}
function resolveSlackBlocks(payload) {
	const slackData = payload.channelData?.slack;
	const renderedInteractive = resolveRenderedInteractiveBlocks(payload.interactive);
	if (!slackData || typeof slackData !== "object" || Array.isArray(slackData)) return renderedInteractive;
	const mergedBlocks = [...parseSlackBlocksInput(slackData.blocks) ?? [], ...renderedInteractive ?? []];
	if (mergedBlocks.length === 0) return;
	if (mergedBlocks.length > SLACK_MAX_BLOCKS) throw new Error(`Slack blocks cannot exceed ${SLACK_MAX_BLOCKS} items after interactive render`);
	return mergedBlocks;
}
const slackOutbound = {
	deliveryMode: "direct",
	chunker: null,
	textChunkLimit: SLACK_TEXT_LIMIT,
	normalizePayload: ({ payload }) => compileSlackInteractiveReplies(payload),
	sendPayload: async (ctx) => {
		const payload = {
			...ctx.payload,
			text: resolveInteractiveTextFallback({
				text: ctx.payload.text,
				interactive: ctx.payload.interactive
			}) ?? ""
		};
		const blocks = resolveSlackBlocks(payload);
		if (!blocks) return await sendTextMediaPayload({
			channel: "slack",
			ctx: {
				...ctx,
				payload
			},
			adapter: slackOutbound
		});
		return attachChannelToResult("slack", await sendPayloadMediaSequenceAndFinalize({
			text: "",
			mediaUrls: resolvePayloadMediaUrls(payload),
			send: async ({ text, mediaUrl }) => await sendSlackOutboundMessage({
				cfg: ctx.cfg,
				to: ctx.to,
				text,
				mediaUrl,
				mediaAccess: ctx.mediaAccess,
				mediaLocalRoots: ctx.mediaLocalRoots,
				mediaReadFile: ctx.mediaReadFile,
				accountId: ctx.accountId,
				deps: ctx.deps,
				replyToId: ctx.replyToId,
				threadId: ctx.threadId,
				identity: ctx.identity
			}),
			finalize: async () => await sendSlackOutboundMessage({
				cfg: ctx.cfg,
				to: ctx.to,
				text: payload.text ?? "",
				mediaAccess: ctx.mediaAccess,
				mediaLocalRoots: ctx.mediaLocalRoots,
				mediaReadFile: ctx.mediaReadFile,
				blocks,
				accountId: ctx.accountId,
				deps: ctx.deps,
				replyToId: ctx.replyToId,
				threadId: ctx.threadId,
				identity: ctx.identity
			})
		}));
	},
	...createAttachedChannelResultAdapter({
		channel: "slack",
		sendText: async ({ cfg, to, text, accountId, deps, replyToId, threadId, identity }) => await sendSlackOutboundMessage({
			cfg,
			to,
			text,
			accountId,
			deps,
			replyToId,
			threadId,
			identity
		}),
		sendMedia: async ({ cfg, to, text, mediaUrl, mediaAccess, mediaLocalRoots, mediaReadFile, accountId, deps, replyToId, threadId, identity }) => await sendSlackOutboundMessage({
			cfg,
			to,
			text,
			mediaUrl,
			mediaAccess,
			mediaLocalRoots,
			mediaReadFile,
			accountId,
			deps,
			replyToId,
			threadId,
			identity
		})
	})
};
//#endregion
//#region extensions/slack/src/scopes.ts
function collectScopes(value, into) {
	if (!value) return;
	if (Array.isArray(value)) {
		for (const entry of value) if (typeof entry === "string" && entry.trim()) into.push(entry.trim());
		return;
	}
	if (typeof value === "string") {
		const raw = value.trim();
		if (!raw) return;
		const parts = raw.split(/[,\s]+/).map((part) => part.trim());
		for (const part of parts) if (part) into.push(part);
		return;
	}
	if (!isRecord(value)) return;
	for (const entry of Object.values(value)) if (Array.isArray(entry) || typeof entry === "string") collectScopes(entry, into);
}
function normalizeScopes(scopes) {
	return Array.from(new Set(scopes.map((scope) => scope.trim()).filter(Boolean))).toSorted();
}
function extractScopes(payload) {
	if (!isRecord(payload)) return [];
	const scopes = [];
	collectScopes(payload.scopes, scopes);
	collectScopes(payload.scope, scopes);
	if (isRecord(payload.info)) {
		collectScopes(payload.info.scopes, scopes);
		collectScopes(payload.info.scope, scopes);
		collectScopes(payload.info.user_scopes, scopes);
		collectScopes(payload.info.bot_scopes, scopes);
	}
	return normalizeScopes(scopes);
}
function readError(payload) {
	if (!isRecord(payload)) return;
	const error = payload.error;
	return typeof error === "string" && error.trim() ? error.trim() : void 0;
}
async function callSlack(client, method) {
	try {
		const result = await client.apiCall(method);
		return isRecord(result) ? result : null;
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
}
async function fetchSlackScopes(token, timeoutMs) {
	const client = createSlackWebClient(token, { timeout: timeoutMs });
	const attempts = ["auth.scopes", "apps.permissions.info"];
	const errors = [];
	for (const method of attempts) {
		const result = await callSlack(client, method);
		const scopes = extractScopes(result);
		if (scopes.length > 0) return {
			ok: true,
			scopes,
			source: method
		};
		const error = readError(result);
		if (error) errors.push(`${method}: ${error}`);
	}
	return {
		ok: false,
		error: errors.length > 0 ? errors.join(" | ") : "no scopes returned"
	};
}
//#endregion
//#region extensions/slack/src/account-inspect.ts
function inspectSlackToken(value) {
	const token = normalizeSecretInputString(value);
	if (token) return {
		token,
		source: "config",
		status: "available"
	};
	if (hasConfiguredSecretInput(value)) return {
		source: "config",
		status: "configured_unavailable"
	};
	return {
		source: "none",
		status: "missing"
	};
}
function inspectSlackAccount(params) {
	const accountId = normalizeAccountId(params.accountId ?? resolveDefaultSlackAccountId(params.cfg));
	const merged = mergeSlackAccountConfig(params.cfg, accountId);
	const enabled = params.cfg.channels?.slack?.enabled !== false && merged.enabled !== false;
	const allowEnv = accountId === DEFAULT_ACCOUNT_ID;
	const mode = merged.mode ?? "socket";
	const isHttpMode = mode === "http";
	const configBot = inspectSlackToken(merged.botToken);
	const configApp = inspectSlackToken(merged.appToken);
	const configSigningSecret = inspectSlackToken(merged.signingSecret);
	const configUser = inspectSlackToken(merged.userToken);
	const envBot = allowEnv ? normalizeSecretInputString(params.envBotToken ?? process.env.SLACK_BOT_TOKEN) : void 0;
	const envApp = allowEnv ? normalizeSecretInputString(params.envAppToken ?? process.env.SLACK_APP_TOKEN) : void 0;
	const envUser = allowEnv ? normalizeSecretInputString(params.envUserToken ?? process.env.SLACK_USER_TOKEN) : void 0;
	const botToken = configBot.token ?? envBot;
	const appToken = configApp.token ?? envApp;
	const signingSecret = configSigningSecret.token;
	const userToken = configUser.token ?? envUser;
	const botTokenSource = configBot.token ? "config" : configBot.status === "configured_unavailable" ? "config" : envBot ? "env" : "none";
	const appTokenSource = configApp.token ? "config" : configApp.status === "configured_unavailable" ? "config" : envApp ? "env" : "none";
	const signingSecretSource = configSigningSecret.token ? "config" : configSigningSecret.status === "configured_unavailable" ? "config" : "none";
	const userTokenSource = configUser.token ? "config" : configUser.status === "configured_unavailable" ? "config" : envUser ? "env" : "none";
	return {
		accountId,
		enabled,
		name: merged.name?.trim() || void 0,
		mode,
		botToken,
		appToken,
		...isHttpMode ? { signingSecret } : {},
		userToken,
		botTokenSource,
		appTokenSource,
		...isHttpMode ? { signingSecretSource } : {},
		userTokenSource,
		botTokenStatus: configBot.token ? "available" : configBot.status === "configured_unavailable" ? "configured_unavailable" : envBot ? "available" : "missing",
		appTokenStatus: configApp.token ? "available" : configApp.status === "configured_unavailable" ? "configured_unavailable" : envApp ? "available" : "missing",
		...isHttpMode ? { signingSecretStatus: configSigningSecret.token ? "available" : configSigningSecret.status === "configured_unavailable" ? "configured_unavailable" : "missing" } : {},
		userTokenStatus: configUser.token ? "available" : configUser.status === "configured_unavailable" ? "configured_unavailable" : envUser ? "available" : "missing",
		configured: isHttpMode ? (configBot.status !== "missing" || Boolean(envBot)) && configSigningSecret.status !== "missing" : (configBot.status !== "missing" || Boolean(envBot)) && (configApp.status !== "missing" || Boolean(envApp)),
		config: merged,
		groupPolicy: merged.groupPolicy,
		textChunkLimit: merged.textChunkLimit,
		mediaMaxMb: merged.mediaMaxMb,
		reactionNotifications: merged.reactionNotifications,
		reactionAllowlist: merged.reactionAllowlist,
		replyToMode: merged.replyToMode,
		replyToModeByChatType: merged.replyToModeByChatType,
		actions: merged.actions,
		slashCommand: merged.slashCommand,
		dm: merged.dm,
		channels: merged.channels
	};
}
//#endregion
//#region extensions/slack/src/security-doctor.ts
function isSlackMutableAllowEntry(raw) {
	const text = raw.trim();
	if (!text || text === "*") return false;
	const mentionMatch = text.match(/^<@([A-Z0-9]+)>$/i);
	if (mentionMatch && /^[A-Z0-9]{8,}$/i.test(mentionMatch[1] ?? "")) return false;
	const withoutPrefix = text.replace(/^(slack|user):/i, "").trim();
	if (/^[UWBCGDT][A-Z0-9]{2,}$/.test(withoutPrefix)) return false;
	if (/^[A-Z0-9]{8,}$/i.test(withoutPrefix)) return false;
	return true;
}
//#endregion
//#region extensions/slack/src/doctor.ts
function asObjectRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function sanitizeForLog(value) {
	return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
function normalizeSlackDmAliases(params) {
	let changed = false;
	let updated = params.entry;
	const rawDm = updated.dm;
	const dm = asObjectRecord(rawDm) ? structuredClone(rawDm) : null;
	let dmChanged = false;
	const allowFromEqual = (a, b) => {
		if (!Array.isArray(a) || !Array.isArray(b)) return false;
		const na = a.map((v) => String(v).trim()).filter(Boolean);
		const nb = b.map((v) => String(v).trim()).filter(Boolean);
		if (na.length !== nb.length) return false;
		return na.every((v, i) => v === nb[i]);
	};
	const topDmPolicy = updated.dmPolicy;
	const legacyDmPolicy = dm?.policy;
	if (topDmPolicy === void 0 && legacyDmPolicy !== void 0) {
		updated = {
			...updated,
			dmPolicy: legacyDmPolicy
		};
		changed = true;
		if (dm) {
			delete dm.policy;
			dmChanged = true;
		}
		params.changes.push(`Moved ${params.pathPrefix}.dm.policy → ${params.pathPrefix}.dmPolicy.`);
	} else if (topDmPolicy !== void 0 && legacyDmPolicy !== void 0 && topDmPolicy === legacyDmPolicy) {
		if (dm) {
			delete dm.policy;
			dmChanged = true;
			params.changes.push(`Removed ${params.pathPrefix}.dm.policy (dmPolicy already set).`);
		}
	}
	const topAllowFrom = updated.allowFrom;
	const legacyAllowFrom = dm?.allowFrom;
	if (topAllowFrom === void 0 && legacyAllowFrom !== void 0) {
		updated = {
			...updated,
			allowFrom: legacyAllowFrom
		};
		changed = true;
		if (dm) {
			delete dm.allowFrom;
			dmChanged = true;
		}
		params.changes.push(`Moved ${params.pathPrefix}.dm.allowFrom → ${params.pathPrefix}.allowFrom.`);
	} else if (topAllowFrom !== void 0 && legacyAllowFrom !== void 0 && allowFromEqual(topAllowFrom, legacyAllowFrom)) {
		if (dm) {
			delete dm.allowFrom;
			dmChanged = true;
			params.changes.push(`Removed ${params.pathPrefix}.dm.allowFrom (allowFrom already set).`);
		}
	}
	if (dm && asObjectRecord(rawDm) && dmChanged) if (Object.keys(dm).length === 0) {
		if (updated.dm !== void 0) {
			const { dm: _ignored, ...rest } = updated;
			updated = rest;
			changed = true;
			params.changes.push(`Removed empty ${params.pathPrefix}.dm after migration.`);
		}
	} else {
		updated = {
			...updated,
			dm
		};
		changed = true;
	}
	return {
		entry: updated,
		changed
	};
}
function normalizeSlackStreamingAliases(params) {
	let updated = params.entry;
	const hadLegacyStreamMode = updated.streamMode !== void 0;
	const legacyStreaming = updated.streaming;
	const beforeStreaming = updated.streaming;
	const beforeNativeStreaming = updated.nativeStreaming;
	const resolvedStreaming = resolveSlackStreamingMode(updated);
	const resolvedNativeStreaming = resolveSlackNativeStreaming(updated);
	if (!(hadLegacyStreamMode || typeof legacyStreaming === "boolean" || typeof legacyStreaming === "string" && legacyStreaming !== resolvedStreaming)) return {
		entry: updated,
		changed: false
	};
	let changed = false;
	if (beforeStreaming !== resolvedStreaming) {
		updated = {
			...updated,
			streaming: resolvedStreaming
		};
		changed = true;
	}
	if (typeof beforeNativeStreaming !== "boolean" || beforeNativeStreaming !== resolvedNativeStreaming) {
		updated = {
			...updated,
			nativeStreaming: resolvedNativeStreaming
		};
		changed = true;
	}
	if (hadLegacyStreamMode) {
		const { streamMode: _ignored, ...rest } = updated;
		updated = rest;
		changed = true;
		params.changes.push(formatSlackStreamModeMigrationMessage(params.pathPrefix, resolvedStreaming));
	}
	if (typeof legacyStreaming === "boolean") params.changes.push(formatSlackStreamingBooleanMigrationMessage(params.pathPrefix, resolvedNativeStreaming));
	else if (typeof legacyStreaming === "string" && legacyStreaming !== resolvedStreaming) params.changes.push(`Normalized ${params.pathPrefix}.streaming (${legacyStreaming}) → (${resolvedStreaming}).`);
	return {
		entry: updated,
		changed
	};
}
function normalizeSlackCompatibilityConfig(cfg) {
	const rawEntry = asObjectRecord(cfg.channels?.slack);
	if (!rawEntry) return {
		config: cfg,
		changes: []
	};
	const changes = [];
	let updated = rawEntry;
	let changed = false;
	const base = normalizeSlackDmAliases({
		entry: rawEntry,
		pathPrefix: "channels.slack",
		changes
	});
	updated = base.entry;
	changed = base.changed;
	const baseStreaming = normalizeSlackStreamingAliases({
		entry: updated,
		pathPrefix: "channels.slack",
		changes
	});
	updated = baseStreaming.entry;
	changed = changed || baseStreaming.changed;
	const rawAccounts = asObjectRecord(updated.accounts);
	if (rawAccounts) {
		let accountsChanged = false;
		const accounts = { ...rawAccounts };
		for (const [accountId, rawAccount] of Object.entries(rawAccounts)) {
			const account = asObjectRecord(rawAccount);
			if (!account) continue;
			let accountEntry = account;
			let accountChanged = false;
			const dm = normalizeSlackDmAliases({
				entry: account,
				pathPrefix: `channels.slack.accounts.${accountId}`,
				changes
			});
			accountEntry = dm.entry;
			accountChanged = dm.changed;
			const streaming = normalizeSlackStreamingAliases({
				entry: accountEntry,
				pathPrefix: `channels.slack.accounts.${accountId}`,
				changes
			});
			accountEntry = streaming.entry;
			accountChanged = accountChanged || streaming.changed;
			if (accountChanged) {
				accounts[accountId] = accountEntry;
				accountsChanged = true;
			}
		}
		if (accountsChanged) {
			updated = {
				...updated,
				accounts
			};
			changed = true;
		}
	}
	if (!changed) return {
		config: cfg,
		changes: []
	};
	return {
		config: {
			...cfg,
			channels: {
				...cfg.channels,
				slack: updated
			}
		},
		changes
	};
}
function collectSlackMutableAllowlistWarnings(cfg) {
	const hits = [];
	const addHits = (pathLabel, list) => {
		if (!Array.isArray(list)) return;
		for (const entry of list) {
			const text = String(entry).trim();
			if (!text || text === "*" || !isSlackMutableAllowEntry(text)) continue;
			hits.push({
				path: pathLabel,
				entry: text
			});
		}
	};
	for (const scope of collectProviderDangerousNameMatchingScopes(cfg, "slack")) {
		if (scope.dangerousNameMatchingEnabled) continue;
		addHits(`${scope.prefix}.allowFrom`, scope.account.allowFrom);
		const dm = asObjectRecord(scope.account.dm);
		if (dm) addHits(`${scope.prefix}.dm.allowFrom`, dm.allowFrom);
		const channels = asObjectRecord(scope.account.channels);
		if (!channels) continue;
		for (const [channelKey, channelRaw] of Object.entries(channels)) {
			const channel = asObjectRecord(channelRaw);
			if (channel) addHits(`${scope.prefix}.channels.${channelKey}.users`, channel.users);
		}
	}
	if (hits.length === 0) return [];
	const exampleLines = hits.slice(0, 8).map((hit) => `- ${sanitizeForLog(hit.path)}: ${sanitizeForLog(hit.entry)}`);
	const remaining = hits.length > 8 ? `- +${hits.length - 8} more mutable allowlist entries.` : null;
	return [
		`- Found ${hits.length} mutable allowlist ${hits.length === 1 ? "entry" : "entries"} across slack while name matching is disabled by default.`,
		...exampleLines,
		...remaining ? [remaining] : [],
		"- Option A (break-glass): enable channels.slack.dangerousNameMatching=true for the affected scope.",
		"- Option B (recommended): resolve names to stable Slack IDs and rewrite the allowlist entries."
	];
}
function hasLegacySlackStreamingAliases(value) {
	const entry = asObjectRecord(value);
	if (!entry) return false;
	return entry.streamMode !== void 0 || typeof entry.streaming === "boolean" || typeof entry.streaming === "string" && entry.streaming !== resolveSlackStreamingMode(entry);
}
function hasLegacySlackAccountStreamingAliases(value) {
	const accounts = asObjectRecord(value);
	if (!accounts) return false;
	return Object.values(accounts).some((account) => hasLegacySlackStreamingAliases(account));
}
const slackDoctor = {
	dmAllowFromMode: "topOrNested",
	groupModel: "route",
	groupAllowFromFallbackToAllowFrom: false,
	warnOnEmptyGroupSenderAllowlist: false,
	legacyConfigRules: [{
		path: ["channels", "slack"],
		message: "channels.slack.streamMode and boolean channels.slack.streaming are legacy; use channels.slack.streaming and channels.slack.nativeStreaming.",
		match: hasLegacySlackStreamingAliases
	}, {
		path: [
			"channels",
			"slack",
			"accounts"
		],
		message: "channels.slack.accounts.<id>.streamMode and boolean channels.slack.accounts.<id>.streaming are legacy; use channels.slack.accounts.<id>.streaming and channels.slack.accounts.<id>.nativeStreaming.",
		match: hasLegacySlackAccountStreamingAliases
	}],
	normalizeCompatibilityConfig: ({ cfg }) => normalizeSlackCompatibilityConfig(cfg),
	collectMutableAllowlistWarnings: ({ cfg }) => collectSlackMutableAllowlistWarnings(cfg)
};
//#endregion
//#region extensions/slack/src/shared.ts
const SLACK_CHANNEL = "slack";
function buildSlackManifest(botName) {
	const safeName = botName.trim() || "OpenClaw";
	const manifest = {
		display_information: {
			name: safeName,
			description: `${safeName} connector for OpenClaw`
		},
		features: {
			bot_user: {
				display_name: safeName,
				always_online: true
			},
			app_home: {
				messages_tab_enabled: true,
				messages_tab_read_only_enabled: false
			},
			slash_commands: [{
				command: "/openclaw",
				description: "Send a message to OpenClaw",
				should_escape: false
			}]
		},
		oauth_config: { scopes: { bot: [
			"app_mentions:read",
			"assistant:write",
			"channels:history",
			"channels:read",
			"chat:write",
			"commands",
			"emoji:read",
			"files:read",
			"files:write",
			"groups:history",
			"groups:read",
			"im:history",
			"im:read",
			"im:write",
			"mpim:history",
			"mpim:read",
			"mpim:write",
			"pins:read",
			"pins:write",
			"reactions:read",
			"reactions:write",
			"users:read"
		] } },
		settings: {
			socket_mode_enabled: true,
			event_subscriptions: { bot_events: [
				"app_mention",
				"channel_rename",
				"member_joined_channel",
				"member_left_channel",
				"message.channels",
				"message.groups",
				"message.im",
				"message.mpim",
				"pin_added",
				"pin_removed",
				"reaction_added",
				"reaction_removed"
			] }
		}
	};
	return JSON.stringify(manifest, null, 2);
}
function buildSlackSetupLines(botName = "OpenClaw") {
	return [
		"1) Slack API -> Create App -> From scratch or From manifest (with the JSON below)",
		"2) Add Socket Mode + enable it to get the app-level token (xapp-...)",
		"3) Install App to workspace to get the xoxb- bot token",
		"4) Enable Event Subscriptions (socket) for message events",
		"5) App Home -> enable the Messages tab for DMs",
		"Tip: set SLACK_BOT_TOKEN + SLACK_APP_TOKEN in your env.",
		`Docs: ${formatDocsLink("/slack", "slack")}`,
		"",
		"Manifest (JSON):",
		buildSlackManifest(botName)
	];
}
function setSlackChannelAllowlist(cfg, accountId, channelKeys) {
	return patchChannelConfigForAccount({
		cfg,
		channel: SLACK_CHANNEL,
		accountId,
		patch: { channels: Object.fromEntries(channelKeys.map((key) => [key, { enabled: true }])) }
	});
}
function isSlackPluginAccountConfigured(account) {
	const mode = account.config.mode ?? "socket";
	if (!Boolean(account.botToken?.trim())) return false;
	if (mode === "http") return Boolean(account.config.signingSecret?.trim());
	return Boolean(account.appToken?.trim());
}
function isSlackSetupAccountConfigured(account) {
	const hasConfiguredBotToken = Boolean(account.botToken?.trim()) || hasConfiguredSecretInput(account.config.botToken);
	const hasConfiguredAppToken = Boolean(account.appToken?.trim()) || hasConfiguredSecretInput(account.config.appToken);
	return hasConfiguredBotToken && hasConfiguredAppToken;
}
const slackConfigAdapter = createScopedChannelConfigAdapter({
	sectionKey: SLACK_CHANNEL,
	listAccountIds: listSlackAccountIds,
	resolveAccount: adaptScopedAccountAccessor(resolveSlackAccount),
	inspectAccount: adaptScopedAccountAccessor(inspectSlackAccount),
	defaultAccountId: resolveDefaultSlackAccountId,
	clearBaseFields: [
		"botToken",
		"appToken",
		"name"
	],
	resolveAllowFrom: (account) => account.dm?.allowFrom,
	formatAllowFrom: (allowFrom) => formatAllowFromLowercase({ allowFrom }),
	resolveDefaultTo: (account) => account.config.defaultTo
});
function createSlackPluginBase(params) {
	return {
		id: SLACK_CHANNEL,
		meta: {
			...getChatChannelMeta(SLACK_CHANNEL),
			preferSessionLookupForAnnounceTarget: true
		},
		setupWizard: params.setupWizard,
		capabilities: {
			chatTypes: [
				"direct",
				"channel",
				"thread"
			],
			reactions: true,
			threads: true,
			media: true,
			nativeCommands: true
		},
		commands: {
			nativeCommandsAutoEnabled: false,
			nativeSkillsAutoEnabled: false,
			resolveNativeCommandName: ({ commandKey, defaultName }) => commandKey === "status" ? "agentstatus" : defaultName
		},
		doctor: slackDoctor,
		agentPrompt: {
			inboundFormattingHints: () => ({
				text_markup: "slack_mrkdwn",
				rules: [
					"Use Slack mrkdwn, not standard Markdown.",
					"Bold uses *single asterisks*.",
					"Links use <url|label>.",
					"Code blocks use triple backticks without a language identifier.",
					"Do not use markdown headings or pipe tables."
				]
			}),
			messageToolHints: ({ cfg, accountId }) => isSlackInteractiveRepliesEnabled({
				cfg,
				accountId
			}) ? [
				"- Prefer Slack buttons/selects for 2-5 discrete choices or parameter picks instead of asking the user to type one.",
				"- Slack interactive replies: use `[[slack_buttons: Label:value, Other:other]]` to add action buttons that route clicks back as Slack interaction system events.",
				"- Slack selects: use `[[slack_select: Placeholder | Label:value, Other:other]]` to add a static select menu that routes the chosen value back as a Slack interaction system event."
			] : ["- Slack interactive replies are disabled. If needed, ask to set `channels.slack.capabilities.interactiveReplies=true` (or the same under `channels.slack.accounts.<account>.capabilities`)."]
		},
		streaming: { blockStreamingCoalesceDefaults: {
			minChars: 1500,
			idleMs: 1e3
		} },
		reload: { configPrefixes: ["channels.slack"] },
		configSchema: SlackChannelConfigSchema,
		config: {
			...slackConfigAdapter,
			hasConfiguredState: ({ env }) => [
				"SLACK_APP_TOKEN",
				"SLACK_BOT_TOKEN",
				"SLACK_USER_TOKEN"
			].some((key) => typeof env?.[key] === "string" && env[key]?.trim().length > 0),
			isConfigured: (account) => isSlackPluginAccountConfigured(account),
			describeAccount: (account) => describeAccountSnapshot({
				account,
				configured: isSlackPluginAccountConfigured(account),
				extra: {
					botTokenSource: account.botTokenSource,
					appTokenSource: account.appTokenSource
				}
			})
		},
		secrets: {
			secretTargetRegistryEntries,
			collectRuntimeConfigAssignments
		},
		setup: params.setup
	};
}
//#endregion
//#region extensions/slack/src/setup-core.ts
function enableSlackAccount(cfg, accountId) {
	return patchChannelConfigForAccount({
		cfg,
		channel: SLACK_CHANNEL,
		accountId,
		patch: { enabled: true }
	});
}
function hasSlackInteractiveRepliesConfig(cfg, accountId) {
	const capabilities = resolveSlackAccount({
		cfg,
		accountId
	}).config.capabilities;
	if (Array.isArray(capabilities)) return capabilities.some((entry) => String(entry).trim().toLowerCase() === "interactivereplies");
	if (!capabilities || typeof capabilities !== "object") return false;
	return "interactiveReplies" in capabilities;
}
function setSlackInteractiveReplies(cfg, accountId, interactiveReplies) {
	const capabilities = resolveSlackAccount({
		cfg,
		accountId
	}).config.capabilities;
	return patchChannelConfigForAccount({
		cfg,
		channel: SLACK_CHANNEL,
		accountId,
		patch: { capabilities: Array.isArray(capabilities) ? interactiveReplies ? [...new Set([...capabilities, "interactiveReplies"])] : capabilities.filter((entry) => String(entry).trim().toLowerCase() !== "interactivereplies") : {
			...capabilities && typeof capabilities === "object" ? capabilities : {},
			interactiveReplies
		} }
	});
}
function createSlackTokenCredential(params) {
	return {
		inputKey: params.inputKey,
		providerHint: params.providerHint,
		credentialLabel: params.credentialLabel,
		preferredEnvVar: params.preferredEnvVar,
		envPrompt: `${params.preferredEnvVar} detected. Use env var?`,
		keepPrompt: params.keepPrompt,
		inputPrompt: params.inputPrompt,
		allowEnv: ({ accountId }) => accountId === DEFAULT_ACCOUNT_ID,
		inspect: ({ cfg, accountId }) => {
			const resolved = resolveSlackAccount({
				cfg,
				accountId
			});
			const configuredValue = params.inputKey === "botToken" ? resolved.config.botToken : resolved.config.appToken;
			const resolvedValue = params.inputKey === "botToken" ? resolved.botToken : resolved.appToken;
			return {
				accountConfigured: Boolean(resolvedValue) || hasConfiguredSecretInput(configuredValue),
				hasConfiguredValue: hasConfiguredSecretInput(configuredValue),
				resolvedValue: resolvedValue?.trim() || void 0,
				envValue: accountId === "default" ? process.env[params.preferredEnvVar]?.trim() : void 0
			};
		},
		applyUseEnv: ({ cfg, accountId }) => enableSlackAccount(cfg, accountId),
		applySet: ({ cfg, accountId, value }) => patchChannelConfigForAccount({
			cfg,
			channel: SLACK_CHANNEL,
			accountId,
			patch: {
				enabled: true,
				[params.inputKey]: value
			}
		})
	};
}
const slackSetupAdapter = createEnvPatchedAccountSetupAdapter({
	channelKey: SLACK_CHANNEL,
	defaultAccountOnlyEnvError: "Slack env tokens can only be used for the default account.",
	missingCredentialError: "Slack requires --bot-token and --app-token (or --use-env).",
	hasCredentials: (input) => Boolean(input.botToken && input.appToken),
	buildPatch: (input) => ({
		...input.botToken ? { botToken: input.botToken } : {},
		...input.appToken ? { appToken: input.appToken } : {}
	})
});
function createSlackSetupWizardBase(handlers) {
	const slackDmPolicy = createLegacyCompatChannelDmPolicy({
		label: "Slack",
		channel: SLACK_CHANNEL,
		promptAllowFrom: handlers.promptAllowFrom
	});
	return {
		channel: SLACK_CHANNEL,
		status: createStandardChannelSetupStatus({
			channelLabel: "Slack",
			configuredLabel: "configured",
			unconfiguredLabel: "needs tokens",
			configuredHint: "configured",
			unconfiguredHint: "needs tokens",
			configuredScore: 2,
			unconfiguredScore: 1,
			resolveConfigured: ({ cfg, accountId }) => inspectSlackAccount({
				cfg,
				accountId
			}).configured
		}),
		introNote: {
			title: "Slack socket mode tokens",
			lines: buildSlackSetupLines(),
			shouldShow: ({ cfg, accountId }) => !isSlackSetupAccountConfigured(resolveSlackAccount({
				cfg,
				accountId
			}))
		},
		envShortcut: {
			prompt: "SLACK_BOT_TOKEN + SLACK_APP_TOKEN detected. Use env vars?",
			preferredEnvVar: "SLACK_BOT_TOKEN",
			isAvailable: ({ cfg, accountId }) => accountId === "default" && Boolean(process.env.SLACK_BOT_TOKEN?.trim()) && Boolean(process.env.SLACK_APP_TOKEN?.trim()) && !isSlackSetupAccountConfigured(resolveSlackAccount({
				cfg,
				accountId
			})),
			apply: ({ cfg, accountId }) => enableSlackAccount(cfg, accountId)
		},
		credentials: [createSlackTokenCredential({
			inputKey: "botToken",
			providerHint: "slack-bot",
			credentialLabel: "Slack bot token",
			preferredEnvVar: "SLACK_BOT_TOKEN",
			keepPrompt: "Slack bot token already configured. Keep it?",
			inputPrompt: "Enter Slack bot token (xoxb-...)"
		}), createSlackTokenCredential({
			inputKey: "appToken",
			providerHint: "slack-app",
			credentialLabel: "Slack app token",
			preferredEnvVar: "SLACK_APP_TOKEN",
			keepPrompt: "Slack app token already configured. Keep it?",
			inputPrompt: "Enter Slack app token (xapp-...)"
		})],
		dmPolicy: slackDmPolicy,
		allowFrom: createAccountScopedAllowFromSection({
			channel: SLACK_CHANNEL,
			credentialInputKey: "botToken",
			helpTitle: "Slack allowlist",
			helpLines: [
				"Allowlist Slack DMs by username (we resolve to user ids).",
				"Examples:",
				"- U12345678",
				"- @alice",
				"Multiple entries: comma-separated.",
				`Docs: ${formatDocsLink("/slack", "slack")}`
			],
			message: "Slack allowFrom (usernames or ids)",
			placeholder: "@alice, U12345678",
			invalidWithoutCredentialNote: "Slack token missing; use user ids (or mention form) only.",
			parseId: (value) => parseMentionOrPrefixedId({
				value,
				mentionPattern: /^<@([A-Z0-9]+)>$/i,
				prefixPattern: /^(slack:|user:)/i,
				idPattern: /^[A-Z][A-Z0-9]+$/i,
				normalizeId: (id) => id.toUpperCase()
			}),
			resolveEntries: handlers.resolveAllowFromEntries
		}),
		groupAccess: createAccountScopedGroupAccessSection({
			channel: SLACK_CHANNEL,
			label: "Slack channels",
			placeholder: "#general, #private, C123",
			currentPolicy: ({ cfg, accountId }) => resolveSlackAccount({
				cfg,
				accountId
			}).config.groupPolicy ?? "allowlist",
			currentEntries: ({ cfg, accountId }) => Object.entries(resolveSlackAccount({
				cfg,
				accountId
			}).config.channels ?? {}).filter(([, value]) => value?.enabled !== false).map(([key]) => key),
			updatePrompt: ({ cfg, accountId }) => Boolean(resolveSlackAccount({
				cfg,
				accountId
			}).config.channels),
			resolveAllowlist: handlers.resolveGroupAllowlist,
			fallbackResolved: (entries) => entries,
			applyAllowlist: ({ cfg, accountId, resolved }) => setSlackChannelAllowlist(cfg, accountId, resolved)
		}),
		finalize: async ({ cfg, accountId, options, prompter }) => {
			if (hasSlackInteractiveRepliesConfig(cfg, accountId)) return;
			if (options?.quickstartDefaults) return { cfg: setSlackInteractiveReplies(cfg, accountId, true) };
			return { cfg: setSlackInteractiveReplies(cfg, accountId, await prompter.confirm({
				message: "Enable Slack interactive replies (buttons/selects) for agent responses?",
				initialValue: true
			})) };
		},
		disable: (cfg) => setSetupChannelEnabled(cfg, SLACK_CHANNEL, false)
	};
}
//#endregion
//#region extensions/slack/src/setup-surface.ts
async function resolveSlackAllowFromEntries(params) {
	return await resolveEntriesWithOptionalToken({
		token: params.token,
		entries: params.entries,
		buildWithoutToken: (input) => ({
			input,
			resolved: false,
			id: null
		}),
		resolveEntries: async ({ token, entries }) => (await resolveSlackUserAllowlist({
			token,
			entries
		})).map((entry) => ({
			input: entry.input,
			resolved: entry.resolved,
			id: entry.id ?? null
		}))
	});
}
async function promptSlackAllowFrom(params) {
	const parseId = (value) => parseMentionOrPrefixedId({
		value,
		mentionPattern: /^<@([A-Z0-9]+)>$/i,
		prefixPattern: /^(slack:|user:)/i,
		idPattern: /^[A-Z][A-Z0-9]+$/i,
		normalizeId: (id) => id.toUpperCase()
	});
	return await promptLegacyChannelAllowFromForAccount({
		cfg: params.cfg,
		channel: SLACK_CHANNEL,
		prompter: params.prompter,
		accountId: params.accountId,
		defaultAccountId: resolveDefaultSlackAccountId(params.cfg),
		resolveAccount: adaptScopedAccountAccessor(resolveSlackAccount),
		resolveExisting: (_account, cfg) => cfg.channels?.slack?.allowFrom ?? cfg.channels?.slack?.dm?.allowFrom ?? [],
		resolveToken: (account) => account.userToken ?? account.botToken ?? "",
		noteTitle: "Slack allowlist",
		noteLines: [
			"Allowlist Slack DMs by username (we resolve to user ids).",
			"Examples:",
			"- U12345678",
			"- @alice",
			"Multiple entries: comma-separated.",
			`Docs: ${formatDocsLink("/slack", "slack")}`
		],
		message: "Slack allowFrom (usernames or ids)",
		placeholder: "@alice, U12345678",
		parseId,
		invalidWithoutTokenNote: "Slack token missing; use user ids (or mention form) only.",
		resolveEntries: async ({ token, entries }) => (await resolveSlackUserAllowlist({
			token,
			entries
		})).map((entry) => ({
			input: entry.input,
			resolved: entry.resolved,
			id: entry.id ?? null
		}))
	});
}
async function resolveSlackGroupAllowlist(params) {
	let keys = params.entries;
	const activeBotToken = resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId
	}).botToken || params.credentialValues.botToken || "";
	if (params.entries.length > 0) try {
		const resolved = await resolveEntriesWithOptionalToken({
			token: activeBotToken,
			entries: params.entries,
			buildWithoutToken: (input) => ({
				input,
				resolved: false,
				id: void 0
			}),
			resolveEntries: async ({ token, entries }) => await resolveSlackChannelAllowlist({
				token,
				entries
			})
		});
		const resolvedKeys = resolved.filter((entry) => entry.resolved && entry.id).map((entry) => entry.id);
		const unresolved = resolved.filter((entry) => !entry.resolved).map((entry) => entry.input);
		keys = [...resolvedKeys, ...unresolved.map((entry) => entry.trim()).filter(Boolean)];
		await noteChannelLookupSummary({
			prompter: params.prompter,
			label: "Slack channels",
			resolvedSections: [{
				title: "Resolved",
				values: resolvedKeys
			}],
			unresolved
		});
	} catch (error) {
		await noteChannelLookupFailure({
			prompter: params.prompter,
			label: "Slack channels",
			error
		});
	}
	return keys;
}
const slackSetupWizard = createSlackSetupWizardBase({
	promptAllowFrom: promptSlackAllowFrom,
	resolveAllowFromEntries: async ({ credentialValues, entries }) => await resolveSlackAllowFromEntries({
		token: credentialValues.botToken,
		entries
	}),
	resolveGroupAllowlist: async ({ cfg, accountId, credentialValues, entries, prompter }) => await resolveSlackGroupAllowlist({
		cfg,
		accountId,
		credentialValues,
		entries,
		prompter
	})
});
//#endregion
//#region extensions/slack/src/threading-tool-context.ts
function buildSlackThreadingToolContext(params) {
	const configuredReplyToMode = resolveSlackReplyToMode(resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId
	}), params.context.ChatType);
	const effectiveReplyToMode = params.context.MessageThreadId != null ? "all" : configuredReplyToMode;
	const threadId = params.context.MessageThreadId ?? params.context.ReplyToId;
	return {
		currentChannelId: params.context.To?.startsWith("channel:") ? params.context.To.slice(8) : params.context.NativeChannelId?.trim() || void 0,
		currentThreadTs: threadId != null ? String(threadId) : void 0,
		replyToMode: effectiveReplyToMode,
		hasRepliedRef: params.hasRepliedRef
	};
}
//#endregion
//#region extensions/slack/src/channel.ts
const resolveSlackDmPolicy = createScopedDmSecurityResolver({
	channelKey: "slack",
	resolvePolicy: (account) => account.dm?.policy,
	resolveAllowFrom: (account) => account.dm?.allowFrom,
	allowFromPathSuffix: "dm.",
	normalizeEntry: (raw) => raw.trim().replace(/^(slack|user):/i, "").trim()
});
async function resolveSlackHandleAction() {
	return getOptionalSlackRuntime()?.channel?.slack?.handleSlackAction ?? (await loadSlackActionRuntime()).handleSlackAction;
}
function getTokenForOperation(account, operation) {
	const userToken = account.config.userToken?.trim() || void 0;
	const botToken = account.botToken?.trim();
	const allowUserWrites = account.config.userTokenReadOnly === false;
	if (operation === "read") return userToken ?? botToken;
	if (!allowUserWrites) return botToken;
	return botToken ?? userToken;
}
let slackActionRuntimePromise;
let slackSendRuntimePromise;
let slackProbeModulePromise;
let slackMonitorModulePromise;
let slackDirectoryLiveModulePromise;
const loadSlackDirectoryConfigModule = createLazyRuntimeModule(() => import("./directory-config-DmB5iBHy.js"));
const loadSlackResolveChannelsModule = createLazyRuntimeModule(() => import("./resolve-channels-D3MCT6qJ.js"));
const loadSlackResolveUsersModule = createLazyRuntimeModule(() => import("./resolve-users-COy5DL7h.js"));
async function loadSlackActionRuntime() {
	slackActionRuntimePromise ??= import("./action-runtime.runtime-SZRgItl4.js");
	return await slackActionRuntimePromise;
}
async function loadSlackSendRuntime() {
	slackSendRuntimePromise ??= import("./send.runtime-CAAfG-Ak.js");
	return await slackSendRuntimePromise;
}
async function loadSlackProbeModule() {
	slackProbeModulePromise ??= import("./probe-CruQWNTj2.js");
	return await slackProbeModulePromise;
}
async function loadSlackMonitorModule() {
	slackMonitorModulePromise ??= import("./monitor-TP6gbaBA.js");
	return await slackMonitorModulePromise;
}
async function loadSlackDirectoryLiveModule() {
	slackDirectoryLiveModulePromise ??= import("./directory-live-Cb-7Dzwk.js");
	return await slackDirectoryLiveModulePromise;
}
async function resolveSlackSendContext(params) {
	const send = resolveOutboundSendDep(params.deps, "slack") ?? (await loadSlackSendRuntime()).sendMessageSlack;
	const account = resolveSlackAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const token = getTokenForOperation(account, "write");
	const botToken = account.botToken?.trim();
	const tokenOverride = token && token !== botToken ? token : void 0;
	return {
		send,
		threadTsValue: params.replyToId ?? params.threadId,
		tokenOverride
	};
}
function parseSlackExplicitTarget(raw) {
	const target = parseSlackTarget(raw, { defaultKind: "channel" });
	if (!target) return null;
	return {
		to: target.id,
		chatType: target.kind === "user" ? "direct" : "channel"
	};
}
function buildSlackBaseSessionKey(params) {
	return buildOutboundBaseSessionKey({
		...params,
		channel: "slack"
	});
}
async function resolveSlackOutboundSessionRoute(params) {
	const parsed = parseSlackTarget(params.target, { defaultKind: "channel" });
	if (!parsed) return null;
	const isDm = parsed.kind === "user";
	let peerKind = isDm ? "direct" : "channel";
	if (!isDm && /^G/i.test(parsed.id)) {
		const channelType = await resolveSlackChannelType({
			cfg: params.cfg,
			accountId: params.accountId,
			channelId: parsed.id
		});
		if (channelType === "group") peerKind = "group";
		if (channelType === "dm") peerKind = "direct";
	}
	const peer = {
		kind: peerKind,
		id: parsed.id
	};
	const baseSessionKey = buildSlackBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		accountId: params.accountId,
		peer
	});
	const threadId = normalizeOutboundThreadId(params.threadId ?? params.replyToId);
	return {
		sessionKey: resolveThreadSessionKeys({
			baseSessionKey,
			threadId
		}).sessionKey,
		baseSessionKey,
		peer,
		chatType: peerKind === "direct" ? "direct" : "channel",
		from: peerKind === "direct" ? `slack:${parsed.id}` : peerKind === "group" ? `slack:group:${parsed.id}` : `slack:channel:${parsed.id}`,
		to: peerKind === "direct" ? `user:${parsed.id}` : `channel:${parsed.id}`,
		threadId
	};
}
function formatSlackScopeDiagnostic(params) {
	const source = params.result.source ? ` (${params.result.source})` : "";
	const label = params.tokenType === "user" ? "User scopes" : "Bot scopes";
	if (params.result.ok && params.result.scopes?.length) return { text: `${label}${source}: ${params.result.scopes.join(", ")}` };
	return {
		text: `${label}: ${params.result.error ?? "scope lookup failed"}`,
		tone: "error"
	};
}
const resolveSlackAllowlistGroupOverrides = createFlatAllowlistOverrideResolver({
	resolveRecord: (account) => account.channels,
	label: (key) => key,
	resolveEntries: (value) => value?.users
});
const resolveSlackAllowlistNames = createAccountScopedAllowlistNameResolver({
	resolveAccount: resolveSlackAccount,
	resolveToken: (account) => account.config.userToken?.trim() || account.botToken?.trim(),
	resolveNames: async ({ token, entries }) => (await loadSlackResolveUsersModule()).resolveSlackUserAllowlist({
		token,
		entries
	})
});
const collectSlackSecurityWarnings = createOpenProviderConfiguredRouteWarningCollector({
	providerConfigPresent: (cfg) => cfg.channels?.slack !== void 0,
	resolveGroupPolicy: (account) => account.config.groupPolicy,
	resolveRouteAllowlistConfigured: (account) => Boolean(account.config.channels) && Object.keys(account.config.channels ?? {}).length > 0,
	configureRouteAllowlist: {
		surface: "Slack channels",
		openScope: "any channel not explicitly denied",
		groupPolicyPath: "channels.slack.groupPolicy",
		routeAllowlistPath: "channels.slack.channels"
	},
	missingRouteAllowlist: {
		surface: "Slack channels",
		openBehavior: "with no channel allowlist; any channel can trigger (mention-gated)",
		remediation: "Set channels.slack.groupPolicy=\"allowlist\" and configure channels.slack.channels"
	}
});
const slackPlugin = createChatChannelPlugin({
	base: {
		...createSlackPluginBase({
			setupWizard: slackSetupWizard,
			setup: slackSetupAdapter
		}),
		allowlist: {
			...buildLegacyDmAccountAllowlistAdapter({
				channelId: "slack",
				resolveAccount: resolveSlackAccount,
				normalize: ({ cfg, accountId, values }) => slackConfigAdapter.formatAllowFrom({
					cfg,
					accountId,
					allowFrom: values
				}),
				resolveDmAllowFrom: (account) => account.config.allowFrom ?? account.config.dm?.allowFrom,
				resolveGroupPolicy: (account) => account.groupPolicy,
				resolveGroupOverrides: resolveSlackAllowlistGroupOverrides
			}),
			resolveNames: resolveSlackAllowlistNames
		},
		approvalCapability: slackApprovalCapability,
		groups: {
			resolveRequireMention: resolveSlackGroupRequireMention,
			resolveToolPolicy: resolveSlackGroupToolPolicy
		},
		messaging: {
			normalizeTarget: normalizeSlackMessagingTarget,
			resolveSessionTarget: ({ id }) => normalizeSlackMessagingTarget(`channel:${id}`),
			parseExplicitTarget: ({ raw }) => parseSlackExplicitTarget(raw),
			inferTargetChatType: ({ to }) => parseSlackExplicitTarget(to)?.chatType,
			resolveOutboundSessionRoute: async (params) => await resolveSlackOutboundSessionRoute(params),
			enableInteractiveReplies: ({ cfg, accountId }) => isSlackInteractiveRepliesEnabled({
				cfg,
				accountId
			}),
			hasStructuredReplyPayload: ({ payload }) => {
				try {
					return Boolean(resolveSlackReplyBlocks(payload)?.length);
				} catch {
					return false;
				}
			},
			targetResolver: {
				looksLikeId: looksLikeSlackTargetId,
				hint: "<channelId|user:ID|channel:ID>",
				resolveTarget: async ({ input }) => {
					const parsed = parseSlackExplicitTarget(input);
					if (!parsed) return null;
					return {
						to: parsed.to,
						kind: parsed.chatType === "direct" ? "user" : "group",
						source: "normalized"
					};
				}
			}
		},
		directory: createChannelDirectoryAdapter({
			listPeers: async (params) => (await loadSlackDirectoryConfigModule()).listSlackDirectoryPeersFromConfig(params),
			listGroups: async (params) => (await loadSlackDirectoryConfigModule()).listSlackDirectoryGroupsFromConfig(params),
			...createRuntimeDirectoryLiveAdapter({
				getRuntime: loadSlackDirectoryLiveModule,
				listPeersLive: (runtime) => runtime.listSlackDirectoryPeersLive,
				listGroupsLive: (runtime) => runtime.listSlackDirectoryGroupsLive
			})
		}),
		resolver: { resolveTargets: async ({ cfg, accountId, inputs, kind }) => {
			const toResolvedTarget = (entry, note) => ({
				input: entry.input,
				resolved: entry.resolved,
				id: entry.id,
				name: entry.name,
				note
			});
			const account = resolveSlackAccount({
				cfg,
				accountId
			});
			if (kind === "group") return resolveTargetsWithOptionalToken({
				token: account.config.userToken?.trim() || account.botToken?.trim(),
				inputs,
				missingTokenNote: "missing Slack token",
				resolveWithToken: async ({ token, inputs }) => (await loadSlackResolveChannelsModule()).resolveSlackChannelAllowlist({
					token,
					entries: inputs
				}),
				mapResolved: (entry) => toResolvedTarget(entry, entry.archived ? "archived" : void 0)
			});
			return resolveTargetsWithOptionalToken({
				token: account.config.userToken?.trim() || account.botToken?.trim(),
				inputs,
				missingTokenNote: "missing Slack token",
				resolveWithToken: async ({ token, inputs }) => (await loadSlackResolveUsersModule()).resolveSlackUserAllowlist({
					token,
					entries: inputs
				}),
				mapResolved: (entry) => toResolvedTarget(entry, entry.note)
			});
		} },
		actions: createSlackActions(SLACK_CHANNEL, { invoke: async (action, cfg, toolContext) => await (await resolveSlackHandleAction())(action, cfg, toolContext) }),
		status: createComputedAccountStatusAdapter({
			defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
			buildChannelSummary: ({ snapshot }) => buildPassiveProbedChannelStatusSummary(snapshot, {
				botTokenSource: snapshot.botTokenSource ?? "none",
				appTokenSource: snapshot.appTokenSource ?? "none"
			}),
			probeAccount: async ({ account, timeoutMs }) => {
				const token = account.botToken?.trim();
				if (!token) return {
					ok: false,
					error: "missing token"
				};
				return await (await loadSlackProbeModule()).probeSlack(token, timeoutMs);
			},
			formatCapabilitiesProbe: ({ probe }) => {
				const slackProbe = probe;
				const lines = [];
				if (slackProbe?.bot?.name) lines.push({ text: `Bot: @${slackProbe.bot.name}` });
				if (slackProbe?.team?.name || slackProbe?.team?.id) {
					const id = slackProbe.team?.id ? ` (${slackProbe.team.id})` : "";
					lines.push({ text: `Team: ${slackProbe.team?.name ?? "unknown"}${id}` });
				}
				return lines;
			},
			buildCapabilitiesDiagnostics: async ({ account, timeoutMs }) => {
				const lines = [];
				const details = {};
				const botToken = account.botToken?.trim();
				const userToken = account.config.userToken?.trim();
				const botScopes = botToken ? await fetchSlackScopes(botToken, timeoutMs) : {
					ok: false,
					error: "Slack bot token missing."
				};
				lines.push(formatSlackScopeDiagnostic({
					tokenType: "bot",
					result: botScopes
				}));
				details.botScopes = botScopes;
				if (userToken) {
					const userScopes = await fetchSlackScopes(userToken, timeoutMs);
					lines.push(formatSlackScopeDiagnostic({
						tokenType: "user",
						result: userScopes
					}));
					details.userScopes = userScopes;
				}
				return {
					lines,
					details
				};
			},
			resolveAccountSnapshot: ({ account }) => {
				const configured = ((account.config.mode ?? "socket") === "http" ? resolveConfiguredFromRequiredCredentialStatuses(account, ["botTokenStatus", "signingSecretStatus"]) : resolveConfiguredFromRequiredCredentialStatuses(account, ["botTokenStatus", "appTokenStatus"])) ?? isSlackPluginAccountConfigured(account);
				return {
					accountId: account.accountId,
					name: account.name,
					enabled: account.enabled,
					configured,
					extra: { ...projectCredentialSnapshotFields(account) }
				};
			}
		}),
		gateway: { startAccount: async (ctx) => {
			const account = ctx.account;
			const botToken = account.botToken?.trim();
			const appToken = account.appToken?.trim();
			ctx.log?.info(`[${account.accountId}] starting provider`);
			return (await loadSlackMonitorModule()).monitorSlackProvider({
				botToken: botToken ?? "",
				appToken: appToken ?? "",
				accountId: account.accountId,
				config: ctx.cfg,
				runtime: ctx.runtime,
				abortSignal: ctx.abortSignal,
				mediaMaxMb: account.config.mediaMaxMb,
				slashCommand: account.config.slashCommand,
				setStatus: ctx.setStatus,
				getStatus: ctx.getStatus
			});
		} },
		mentions: { stripPatterns: () => ["<@[^>\\s]+>"] }
	},
	pairing: { text: {
		idLabel: "slackUserId",
		message: PAIRING_APPROVED_MESSAGE,
		normalizeAllowEntry: createPairingPrefixStripper(/^(slack|user):/i),
		notify: async ({ id, message }) => {
			const cfg = getSlackRuntime().config.loadConfig();
			const account = resolveSlackAccount({
				cfg,
				accountId: resolveDefaultSlackAccountId(cfg)
			});
			const { sendMessageSlack } = await loadSlackSendRuntime();
			const token = getTokenForOperation(account, "write");
			const botToken = account.botToken?.trim();
			const tokenOverride = token && token !== botToken ? token : void 0;
			if (tokenOverride) await sendMessageSlack(`user:${id}`, message, { token: tokenOverride });
			else await sendMessageSlack(`user:${id}`, message);
		}
	} },
	security: {
		resolveDmPolicy: resolveSlackDmPolicy,
		collectWarnings: collectSlackSecurityWarnings,
		collectAuditFindings: collectSlackSecurityAuditFindings
	},
	threading: {
		scopedAccountReplyToMode: {
			resolveAccount: adaptScopedAccountAccessor(resolveSlackAccount),
			resolveReplyToMode: (account, chatType) => resolveSlackReplyToMode(account, chatType)
		},
		allowExplicitReplyTagsWhenOff: false,
		buildToolContext: (params) => buildSlackThreadingToolContext(params),
		resolveAutoThreadId: ({ to, toolContext, replyToId }) => replyToId ? void 0 : resolveSlackAutoThreadId({
			to,
			toolContext
		}),
		resolveReplyTransport: ({ threadId, replyToId }) => ({
			replyToId: replyToId ?? (threadId != null && threadId !== "" ? String(threadId) : void 0),
			threadId: null
		})
	},
	outbound: {
		base: {
			deliveryMode: "direct",
			chunker: null,
			textChunkLimit: SLACK_TEXT_LIMIT,
			shouldSuppressLocalPayloadPrompt: ({ cfg, accountId, payload }) => shouldSuppressLocalSlackExecApprovalPrompt({
				cfg,
				accountId,
				payload
			}),
			sendPayload: async (ctx) => {
				const { send, tokenOverride } = await resolveSlackSendContext({
					cfg: ctx.cfg,
					accountId: ctx.accountId ?? void 0,
					deps: ctx.deps,
					replyToId: ctx.replyToId,
					threadId: ctx.threadId
				});
				return await slackOutbound.sendPayload({
					...ctx,
					deps: {
						...ctx.deps ?? {},
						slack: async (to, text, opts) => await send(to, text, {
							...opts,
							...tokenOverride ? { token: tokenOverride } : {}
						})
					}
				});
			}
		},
		attachedResults: {
			channel: "slack",
			sendText: async ({ to, text, accountId, deps, replyToId, threadId, cfg }) => {
				const { send, threadTsValue, tokenOverride } = await resolveSlackSendContext({
					cfg,
					accountId: accountId ?? void 0,
					deps,
					replyToId,
					threadId
				});
				return await send(to, text, {
					cfg,
					threadTs: threadTsValue != null ? String(threadTsValue) : void 0,
					accountId: accountId ?? void 0,
					...tokenOverride ? { token: tokenOverride } : {}
				});
			},
			sendMedia: async ({ to, text, mediaUrl, mediaLocalRoots, accountId, deps, replyToId, threadId, cfg }) => {
				const { send, threadTsValue, tokenOverride } = await resolveSlackSendContext({
					cfg,
					accountId: accountId ?? void 0,
					deps,
					replyToId,
					threadId
				});
				return await send(to, text, {
					cfg,
					mediaUrl,
					mediaLocalRoots,
					threadTs: threadTsValue != null ? String(threadTsValue) : void 0,
					accountId: accountId ?? void 0,
					...tokenOverride ? { token: tokenOverride } : {}
				});
			}
		}
	}
});
//#endregion
export { createSlackPluginBase as a, __resetSlackChannelTypeCacheForTest as c, extractSlackToolSend as d, listSlackMessageActions as f, resolveSlackAutoThreadId as g, parseSlackOptionsLine as h, slackSetupAdapter as i, resolveSlackChannelType as l, isSlackInteractiveRepliesEnabled as m, buildSlackThreadingToolContext as n, inspectSlackAccount as o, compileSlackInteractiveReplies as p, slackSetupWizard as r, slackOutbound as s, slackPlugin as t, createSlackActions as u };
