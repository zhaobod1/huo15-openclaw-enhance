import { s as getChatChannelMeta } from "./registry-DldQsVOb.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "./session-key-BR3Z-ljs.js";
import { r as buildChannelConfigSchema } from "./config-schema-BEuKmAWr.js";
import { c as jsonResult, h as readStringParam } from "./common-B7pbdYUb.js";
import { s as resolveMergedAccountConfig, t as createAccountListHelpers } from "./account-helpers-A6tF0W1f.js";
import "./core-D7mi2qmR.js";
import "./channel-config-schema-BT1Xyv2r.js";
import { d as createDefaultChannelRuntimeState, u as createComputedAccountStatusAdapter } from "./status-helpers-ChR3_7qO.js";
import { n as dispatchInboundReplyWithBase } from "./inbound-reply-dispatch-rMXU9cNH.js";
import "./account-resolution-CIVX3Yfx.js";
import "./channel-plugin-common-CsTcAEqq.js";
import { n as createChatChannelPlugin, t as buildChannelOutboundSessionRoute } from "./channel-core-BVR4R0_P.js";
import { c as parseQaTarget, d as readQaBusMessage, f as searchQaBusMessages, i as editQaBusMessage, l as pollQaBus, n as createQaBusThread, p as sendQaBusMessage, r as deleteQaBusMessage, s as normalizeQaTarget, t as buildQaTarget, u as reactToQaBusMessage } from "./bus-client-CWEVOQqO.js";
import { t as zod_exports } from "./zod-COH8D-AP.js";
import { t as getQaChannelRuntime } from "./runtime-api-v4XR7Jzv.js";
import { Type } from "@sinclair/typebox";
//#region extensions/qa-channel/src/accounts.ts
const DEFAULT_POLL_TIMEOUT_MS = 1e3;
const { listAccountIds: listQaChannelAccountIds, resolveDefaultAccountId: resolveDefaultQaChannelAccountId } = createAccountListHelpers("qa-channel", { normalizeAccountId });
function resolveMergedQaAccountConfig(cfg, accountId) {
	return resolveMergedAccountConfig({
		channelConfig: cfg.channels?.["qa-channel"],
		accounts: cfg.channels?.["qa-channel"]?.accounts,
		accountId,
		omitKeys: ["defaultAccount"],
		normalizeAccountId
	});
}
function resolveQaChannelAccount(params) {
	const accountId = normalizeAccountId(params.accountId);
	const merged = resolveMergedQaAccountConfig(params.cfg, accountId);
	const enabled = params.cfg.channels?.["qa-channel"]?.enabled !== false && merged.enabled !== false;
	const baseUrl = merged.baseUrl?.trim() ?? "";
	const botUserId = merged.botUserId?.trim() || "openclaw";
	const botDisplayName = merged.botDisplayName?.trim() || "OpenClaw QA";
	return {
		accountId,
		enabled,
		configured: Boolean(baseUrl),
		name: merged.name?.trim() || void 0,
		baseUrl,
		botUserId,
		botDisplayName,
		pollTimeoutMs: merged.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS,
		config: {
			...merged,
			allowFrom: merged.allowFrom ?? ["*"]
		}
	};
}
function listEnabledQaChannelAccounts(cfg) {
	return listQaChannelAccountIds(cfg).map((accountId) => resolveQaChannelAccount({
		cfg,
		accountId
	})).filter((account) => account.enabled);
}
//#endregion
//#region extensions/qa-channel/src/channel-actions.ts
function listQaChannelActions(cfg, accountId) {
	const account = resolveQaChannelAccount({
		cfg,
		accountId
	});
	if (!account.enabled || !account.configured) return [];
	const actions = new Set(["send"]);
	if (account.config.actions?.messages !== false) {
		actions.add("read");
		actions.add("edit");
		actions.add("delete");
	}
	if (account.config.actions?.reactions !== false) {
		actions.add("react");
		actions.add("reactions");
	}
	if (account.config.actions?.threads !== false) {
		actions.add("thread-create");
		actions.add("thread-reply");
	}
	if (account.config.actions?.search !== false) actions.add("search");
	return Array.from(actions);
}
const qaChannelMessageActions = {
	describeMessageTool: (context) => ({
		actions: listQaChannelActions(context.cfg, context.accountId),
		capabilities: [],
		schema: { properties: {
			channelId: Type.Optional(Type.String()),
			threadId: Type.Optional(Type.String()),
			messageId: Type.Optional(Type.String()),
			emoji: Type.Optional(Type.String()),
			title: Type.Optional(Type.String()),
			query: Type.Optional(Type.String())
		} }
	}),
	extractToolSend: ({ args }) => {
		const action = typeof args.action === "string" ? args.action.trim() : "";
		if (action === "sendMessage") {
			const to = typeof args.to === "string" ? args.to : void 0;
			return to ? { to } : null;
		}
		if (action === "threadReply") {
			const channelId = typeof args.channelId === "string" ? args.channelId.trim() : "";
			const threadId = typeof args.threadId === "string" ? args.threadId.trim() : "";
			return channelId && threadId ? { to: `thread:${channelId}/${threadId}` } : null;
		}
		return null;
	},
	handleAction: async (context) => {
		const { action, cfg, accountId, params } = context;
		const account = resolveQaChannelAccount({
			cfg,
			accountId
		});
		const baseUrl = account.baseUrl;
		switch (action) {
			case "thread-create": {
				const channelId = readStringParam(params, "channelId") ?? (() => {
					const to = readStringParam(params, "to");
					return to ? parseQaTarget(to).conversationId : void 0;
				})();
				const title = readStringParam(params, "title") ?? "QA thread";
				if (!channelId) throw new Error("qa-channel thread-create requires channelId");
				const { thread } = await createQaBusThread({
					baseUrl,
					accountId: account.accountId,
					conversationId: channelId,
					title,
					createdBy: account.botUserId
				});
				return jsonResult({
					thread,
					target: `thread:${channelId}/${thread.id}`
				});
			}
			case "thread-reply": {
				const channelId = readStringParam(params, "channelId");
				const threadId = readStringParam(params, "threadId");
				const text = readStringParam(params, "text");
				if (!channelId || !threadId || !text) throw new Error("qa-channel thread-reply requires channelId, threadId, and text");
				const { message } = await sendQaBusMessage({
					baseUrl,
					accountId: account.accountId,
					to: `thread:${channelId}/${threadId}`,
					text,
					senderId: account.botUserId,
					senderName: account.botDisplayName,
					threadId
				});
				return jsonResult({ message });
			}
			case "react": {
				const messageId = readStringParam(params, "messageId");
				const emoji = readStringParam(params, "emoji");
				if (!messageId || !emoji) throw new Error("qa-channel react requires messageId and emoji");
				const { message } = await reactToQaBusMessage({
					baseUrl,
					accountId: account.accountId,
					messageId,
					emoji,
					senderId: account.botUserId
				});
				return jsonResult({ message });
			}
			case "reactions":
			case "read": {
				const messageId = readStringParam(params, "messageId");
				if (!messageId) throw new Error(`qa-channel ${action} requires messageId`);
				const { message } = await readQaBusMessage({
					baseUrl,
					accountId: account.accountId,
					messageId
				});
				return jsonResult({ message });
			}
			case "edit": {
				const messageId = readStringParam(params, "messageId");
				const text = readStringParam(params, "text");
				if (!messageId || !text) throw new Error("qa-channel edit requires messageId and text");
				const { message } = await editQaBusMessage({
					baseUrl,
					accountId: account.accountId,
					messageId,
					text
				});
				return jsonResult({ message });
			}
			case "delete": {
				const messageId = readStringParam(params, "messageId");
				if (!messageId) throw new Error("qa-channel delete requires messageId");
				const { message } = await deleteQaBusMessage({
					baseUrl,
					accountId: account.accountId,
					messageId
				});
				return jsonResult({ message });
			}
			case "search": {
				const query = readStringParam(params, "query");
				const channelId = readStringParam(params, "channelId");
				const threadId = readStringParam(params, "threadId");
				const { messages } = await searchQaBusMessages({
					baseUrl,
					input: {
						accountId: account.accountId,
						query,
						conversationId: channelId,
						threadId
					}
				});
				return jsonResult({ messages });
			}
			default: throw new Error(`qa-channel action not implemented: ${action}`);
		}
	}
};
//#endregion
//#region extensions/qa-channel/src/config-schema.ts
const QaChannelActionConfigSchema = zod_exports.z.object({
	messages: zod_exports.z.boolean().optional(),
	reactions: zod_exports.z.boolean().optional(),
	search: zod_exports.z.boolean().optional(),
	threads: zod_exports.z.boolean().optional()
}).strict();
const QaChannelAccountConfigSchema = zod_exports.z.object({
	name: zod_exports.z.string().optional(),
	enabled: zod_exports.z.boolean().optional(),
	baseUrl: zod_exports.z.string().url().optional(),
	botUserId: zod_exports.z.string().optional(),
	botDisplayName: zod_exports.z.string().optional(),
	pollTimeoutMs: zod_exports.z.number().int().min(100).max(3e4).optional(),
	allowFrom: zod_exports.z.array(zod_exports.z.union([zod_exports.z.string(), zod_exports.z.number()])).optional(),
	defaultTo: zod_exports.z.string().optional(),
	actions: QaChannelActionConfigSchema.optional()
}).strict();
const qaChannelPluginConfigSchema = buildChannelConfigSchema(QaChannelAccountConfigSchema.extend({
	accounts: zod_exports.z.record(zod_exports.z.string(), QaChannelAccountConfigSchema.partial()).optional(),
	defaultAccount: zod_exports.z.string().optional()
}).strict());
//#endregion
//#region extensions/qa-channel/src/inbound.ts
async function handleQaInbound(params) {
	const runtime = getQaChannelRuntime();
	const inbound = params.message;
	const target = buildQaTarget({
		chatType: inbound.conversation.kind,
		conversationId: inbound.conversation.id,
		threadId: inbound.threadId
	});
	const route = runtime.channel.routing.resolveAgentRoute({
		cfg: params.config,
		channel: params.channelId,
		accountId: params.account.accountId,
		peer: {
			kind: inbound.conversation.kind === "direct" ? "direct" : "channel",
			id: target
		}
	});
	const storePath = runtime.channel.session.resolveStorePath(params.config.session?.store, { agentId: route.agentId });
	const previousTimestamp = runtime.channel.session.readSessionUpdatedAt({
		storePath,
		sessionKey: route.sessionKey
	});
	const body = runtime.channel.reply.formatAgentEnvelope({
		channel: params.channelLabel,
		from: inbound.senderName || inbound.senderId,
		timestamp: inbound.timestamp,
		previousTimestamp,
		envelope: runtime.channel.reply.resolveEnvelopeFormatOptions(params.config),
		body: inbound.text
	});
	const ctxPayload = runtime.channel.reply.finalizeInboundContext({
		Body: body,
		BodyForAgent: inbound.text,
		RawBody: inbound.text,
		CommandBody: inbound.text,
		From: buildQaTarget({
			chatType: inbound.conversation.kind,
			conversationId: inbound.senderId
		}),
		To: target,
		SessionKey: route.sessionKey,
		AccountId: route.accountId ?? params.account.accountId,
		ChatType: inbound.conversation.kind === "direct" ? "direct" : "group",
		ConversationLabel: inbound.threadTitle || inbound.conversation.title || inbound.senderName || inbound.conversation.id,
		GroupSubject: inbound.conversation.kind === "channel" ? inbound.threadTitle || inbound.conversation.title || inbound.conversation.id : void 0,
		GroupChannel: inbound.conversation.kind === "channel" ? inbound.conversation.id : void 0,
		NativeChannelId: inbound.conversation.id,
		MessageThreadId: inbound.threadId,
		ThreadLabel: inbound.threadTitle,
		ThreadParentId: inbound.threadId ? inbound.conversation.id : void 0,
		SenderName: inbound.senderName,
		SenderId: inbound.senderId,
		Provider: params.channelId,
		Surface: params.channelId,
		MessageSid: inbound.id,
		MessageSidFull: inbound.id,
		ReplyToId: inbound.replyToId,
		Timestamp: inbound.timestamp,
		OriginatingChannel: params.channelId,
		OriginatingTo: target,
		CommandAuthorized: true
	});
	await dispatchInboundReplyWithBase({
		cfg: params.config,
		channel: params.channelId,
		accountId: params.account.accountId,
		route,
		storePath,
		ctxPayload,
		core: runtime,
		deliver: async (payload) => {
			const text = payload && typeof payload === "object" && "text" in payload ? String(payload.text ?? "") : "";
			if (!text.trim()) return;
			await sendQaBusMessage({
				baseUrl: params.account.baseUrl,
				accountId: params.account.accountId,
				to: target,
				text,
				senderId: params.account.botUserId,
				senderName: params.account.botDisplayName,
				threadId: inbound.threadId,
				replyToId: inbound.id
			});
		},
		onRecordError: (error) => {
			throw error instanceof Error ? error : /* @__PURE__ */ new Error(`qa-channel session record failed: ${String(error)}`);
		},
		onDispatchError: (error) => {
			throw error instanceof Error ? error : /* @__PURE__ */ new Error(`qa-channel dispatch failed: ${String(error)}`);
		}
	});
}
//#endregion
//#region extensions/qa-channel/src/gateway.ts
async function startQaGatewayAccount(channelId, channelLabel, ctx) {
	const account = ctx.account;
	if (!account.configured) throw new Error(`QA channel is not configured for account "${account.accountId}"`);
	ctx.setStatus({
		accountId: account.accountId,
		running: true,
		configured: true,
		enabled: account.enabled,
		baseUrl: account.baseUrl
	});
	let cursor = 0;
	try {
		while (!ctx.abortSignal.aborted) {
			const result = await pollQaBus({
				baseUrl: account.baseUrl,
				accountId: account.accountId,
				cursor,
				timeoutMs: account.pollTimeoutMs,
				signal: ctx.abortSignal
			});
			cursor = result.cursor;
			for (const event of result.events) {
				if (event.kind !== "inbound-message") continue;
				await handleQaInbound({
					channelId,
					channelLabel,
					account,
					config: ctx.cfg,
					message: event.message
				});
			}
		}
	} catch (error) {
		if (!(error instanceof Error) || error.name !== "AbortError") throw error;
	}
	ctx.setStatus({
		accountId: account.accountId,
		running: false
	});
}
//#endregion
//#region extensions/qa-channel/src/outbound.ts
async function sendQaChannelText(params) {
	const account = resolveQaChannelAccount({
		cfg: params.cfg,
		accountId: params.accountId
	});
	const parsed = parseQaTarget(params.to);
	const resolvedThreadId = params.threadId == null ? parsed.threadId : String(params.threadId);
	const { message } = await sendQaBusMessage({
		baseUrl: account.baseUrl,
		accountId: account.accountId,
		to: buildQaTarget({
			chatType: parsed.chatType,
			conversationId: parsed.conversationId,
			threadId: resolvedThreadId
		}),
		text: params.text,
		senderId: account.botUserId,
		senderName: account.botDisplayName,
		threadId: resolvedThreadId,
		replyToId: params.replyToId == null ? void 0 : String(params.replyToId)
	});
	return {
		to: params.to,
		messageId: message.id
	};
}
//#endregion
//#region extensions/qa-channel/src/setup.ts
function applyQaSetup(params) {
	const nextCfg = structuredClone(params.cfg);
	const section = nextCfg.channels?.["qa-channel"] ?? {};
	const accounts = { ...section.accounts ?? {} };
	const target = params.accountId === "default" ? { ...section } : { ...accounts[params.accountId] ?? {} };
	if (typeof params.input.baseUrl === "string") target.baseUrl = params.input.baseUrl;
	if (typeof params.input.botUserId === "string") target.botUserId = params.input.botUserId;
	if (typeof params.input.botDisplayName === "string") target.botDisplayName = params.input.botDisplayName;
	nextCfg.channels ??= {};
	if (params.accountId === "default") nextCfg.channels["qa-channel"] = {
		...section,
		...target
	};
	else {
		accounts[params.accountId] = target;
		nextCfg.channels["qa-channel"] = {
			...section,
			accounts
		};
	}
	return nextCfg;
}
//#endregion
//#region extensions/qa-channel/src/status.ts
const qaChannelStatus = createComputedAccountStatusAdapter({
	defaultRuntime: createDefaultChannelRuntimeState(DEFAULT_ACCOUNT_ID),
	buildChannelSummary: ({ snapshot }) => ({ baseUrl: snapshot.baseUrl ?? "[missing]" }),
	resolveAccountSnapshot: ({ account }) => ({
		accountId: account.accountId,
		name: account.name,
		enabled: account.enabled,
		configured: account.configured,
		extra: {
			baseUrl: account.baseUrl || "[missing]",
			botUserId: account.botUserId
		}
	})
});
//#endregion
//#region extensions/qa-channel/src/channel.ts
const CHANNEL_ID = "qa-channel";
const meta = { ...getChatChannelMeta(CHANNEL_ID) };
const qaChannelPlugin = createChatChannelPlugin({
	base: {
		id: CHANNEL_ID,
		meta,
		capabilities: { chatTypes: ["direct", "group"] },
		reload: { configPrefixes: ["channels.qa-channel"] },
		configSchema: qaChannelPluginConfigSchema,
		setup: { applyAccountConfig: ({ cfg, accountId, input }) => applyQaSetup({
			cfg,
			accountId,
			input
		}) },
		config: {
			listAccountIds: (cfg) => listQaChannelAccountIds(cfg),
			resolveAccount: (cfg, accountId) => resolveQaChannelAccount({
				cfg,
				accountId
			}),
			defaultAccountId: (cfg) => resolveDefaultQaChannelAccountId(cfg),
			isConfigured: (account) => account.configured,
			resolveAllowFrom: ({ cfg, accountId }) => resolveQaChannelAccount({
				cfg,
				accountId
			}).config.allowFrom,
			resolveDefaultTo: ({ cfg, accountId }) => resolveQaChannelAccount({
				cfg,
				accountId
			}).config.defaultTo
		},
		messaging: {
			normalizeTarget: normalizeQaTarget,
			parseExplicitTarget: ({ raw }) => {
				const parsed = parseQaTarget(raw);
				return {
					to: buildQaTarget(parsed),
					threadId: parsed.threadId,
					chatType: parsed.chatType
				};
			},
			inferTargetChatType: ({ to }) => parseQaTarget(to).chatType,
			targetResolver: {
				looksLikeId: (raw) => /^((dm|channel):|thread:[^/]+\/)/i.test(raw.trim()) || raw.trim().length > 0,
				hint: "<dm:user|channel:room|thread:room/thread>"
			},
			resolveOutboundSessionRoute: ({ cfg, agentId, accountId, target, threadId }) => {
				const parsed = parseQaTarget(target);
				return buildChannelOutboundSessionRoute({
					cfg,
					agentId,
					channel: CHANNEL_ID,
					accountId,
					peer: {
						kind: parsed.chatType === "direct" ? "direct" : "channel",
						id: buildQaTarget(parsed)
					},
					chatType: parsed.chatType,
					from: `qa-channel:${accountId ?? "default"}`,
					to: buildQaTarget(parsed),
					threadId: threadId ?? parsed.threadId
				});
			}
		},
		status: qaChannelStatus,
		gateway: { startAccount: async (ctx) => {
			await startQaGatewayAccount(CHANNEL_ID, meta.label, ctx);
		} },
		actions: qaChannelMessageActions
	},
	outbound: {
		base: { deliveryMode: "direct" },
		attachedResults: {
			channel: CHANNEL_ID,
			sendText: async ({ cfg, to, text, accountId, threadId, replyToId }) => await sendQaChannelText({
				cfg,
				accountId,
				to,
				text,
				threadId,
				replyToId
			})
		}
	}
});
//#endregion
export { resolveDefaultQaChannelAccountId as a, listQaChannelAccountIds as i, qaChannelMessageActions as n, resolveQaChannelAccount as o, listEnabledQaChannelAccounts as r, qaChannelPlugin as t };
