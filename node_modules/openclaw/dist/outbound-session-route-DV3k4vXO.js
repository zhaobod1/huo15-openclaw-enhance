import { d as resolveThreadSessionKeys } from "./session-key-BR3Z-ljs.js";
import { t as buildOutboundBaseSessionKey } from "./base-session-key-2NJCUHEq.js";
import { t as normalizeOutboundThreadId } from "./routing-DdBDhOmH.js";
import "./channel-status-45SWZx-g.js";
import { t as parseDiscordTarget } from "./target-parsing-CSh64UAG.js";
//#region extensions/discord/src/channel-api.ts
const DISCORD_CHANNEL_META = {
	id: "discord",
	label: "Discord",
	selectionLabel: "Discord (Bot API)",
	detailLabel: "Discord Bot",
	docsPath: "/channels/discord",
	docsLabel: "discord",
	blurb: "very well supported right now.",
	systemImage: "bubble.left.and.bubble.right",
	markdownCapable: true
};
function getChatChannelMeta(id) {
	if (id !== DISCORD_CHANNEL_META.id) throw new Error(`Unsupported Discord channel meta lookup: ${id}`);
	return DISCORD_CHANNEL_META;
}
//#endregion
//#region extensions/discord/src/outbound-session-route.ts
function resolveDiscordOutboundSessionRoute(params) {
	const parsed = parseDiscordTarget(params.target, { defaultKind: resolveDiscordOutboundTargetKindHint(params) });
	if (!parsed) return null;
	const isDm = parsed.kind === "user";
	const peer = {
		kind: isDm ? "direct" : "channel",
		id: parsed.id
	};
	const baseSessionKey = buildOutboundBaseSessionKey({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "discord",
		accountId: params.accountId,
		peer
	});
	const explicitThreadId = normalizeOutboundThreadId(params.threadId);
	return {
		sessionKey: resolveThreadSessionKeys({
			baseSessionKey,
			threadId: explicitThreadId ?? normalizeOutboundThreadId(params.replyToId),
			useSuffix: false
		}).sessionKey,
		baseSessionKey,
		peer,
		chatType: isDm ? "direct" : "channel",
		from: isDm ? `discord:${parsed.id}` : `discord:channel:${parsed.id}`,
		to: isDm ? `user:${parsed.id}` : `channel:${parsed.id}`,
		threadId: explicitThreadId ?? void 0
	};
}
function resolveDiscordOutboundTargetKindHint(params) {
	const resolvedKind = params.resolvedTarget?.kind;
	if (resolvedKind === "user") return "user";
	if (resolvedKind === "group" || resolvedKind === "channel") return "channel";
	const target = params.target.trim();
	if (/^channel:/i.test(target)) return "channel";
	if (/^(user:|discord:|@|<@!?)/i.test(target)) return "user";
}
//#endregion
export { getChatChannelMeta as n, resolveDiscordOutboundSessionRoute as t };
