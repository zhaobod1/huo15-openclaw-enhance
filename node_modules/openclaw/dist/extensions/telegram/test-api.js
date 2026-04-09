import { r as makeProxyFetch } from "../../proxy-fetch-DBK7pU_g.js";
import { l as listTelegramAccountIds, p as resolveTelegramAccount } from "../../targets-CzovValH.js";
import { s as telegramOutbound, t as telegramPlugin } from "../../channel-CUlsn_7D.js";
import { n as resolveTelegramFetch } from "../../fetch-Cqq-meYl.js";
import { o as telegramMessageActionRuntime } from "../../probe-bz2lFjjJ.js";
import { d as sendPollTelegram, u as sendMessageTelegram } from "../../send-ioWMozJY.js";
import { n as setTelegramRuntime } from "../../runtime-BMv2XWyy.js";
import { r as resetTelegramThreadBindingsForTests } from "../../thread-bindings-CF7vahMj.js";
import { t as handleTelegramAction } from "../../action-runtime-DgrTpsTy.js";
//#region extensions/telegram/src/bot-message-context.test-harness.ts
const baseTelegramMessageContextConfig = {
	agents: { defaults: {
		model: "anthropic/claude-opus-4-5",
		workspace: "/tmp/openclaw"
	} },
	channels: { telegram: {} },
	messages: { groupChat: { mentionPatterns: [] } }
};
async function buildTelegramMessageContextForTest(params) {
	const { vi } = await loadVitestModule();
	return await (await loadBuildTelegramMessageContext())({
		primaryCtx: {
			message: {
				message_id: 1,
				date: 17e8,
				text: "hello",
				from: {
					id: 42,
					first_name: "Alice"
				},
				...params.message
			},
			me: {
				id: 7,
				username: "bot"
			}
		},
		allMedia: params.allMedia ?? [],
		storeAllowFrom: [],
		options: params.options ?? {},
		bot: { api: {
			sendChatAction: vi.fn(),
			setMessageReaction: vi.fn()
		} },
		cfg: params.cfg ?? baseTelegramMessageContextConfig,
		loadFreshConfig: () => params.cfg ?? baseTelegramMessageContextConfig,
		account: { accountId: params.accountId ?? "default" },
		historyLimit: 0,
		groupHistories: /* @__PURE__ */ new Map(),
		dmPolicy: "open",
		allowFrom: [],
		groupAllowFrom: [],
		ackReactionScope: "off",
		logger: { info: vi.fn() },
		resolveGroupActivation: params.resolveGroupActivation ?? (() => void 0),
		resolveGroupRequireMention: params.resolveGroupRequireMention ?? (() => false),
		resolveTelegramGroupConfig: params.resolveTelegramGroupConfig ?? (() => ({
			groupConfig: { requireMention: false },
			topicConfig: void 0
		})),
		sendChatActionHandler: { sendChatAction: vi.fn() }
	});
}
let buildTelegramMessageContextLoader;
let vitestModuleLoader;
let messageContextMocksInstalled = false;
async function loadBuildTelegramMessageContext() {
	await installMessageContextTestMocks();
	if (!buildTelegramMessageContextLoader) ({buildTelegramMessageContext: buildTelegramMessageContextLoader} = await import("../../bot-message-context-ByKWwQVX.js"));
	return buildTelegramMessageContextLoader;
}
async function loadVitestModule() {
	vitestModuleLoader ??= import("../../dist-CMipqFAN.js");
	return await vitestModuleLoader;
}
async function installMessageContextTestMocks() {
	if (messageContextMocksInstalled) return;
	messageContextMocksInstalled = true;
}
//#endregion
export { buildTelegramMessageContextForTest, handleTelegramAction, listTelegramAccountIds, makeProxyFetch, resetTelegramThreadBindingsForTests, resolveTelegramAccount, resolveTelegramFetch, sendMessageTelegram, sendPollTelegram, setTelegramRuntime, telegramMessageActionRuntime, telegramOutbound, telegramPlugin };
