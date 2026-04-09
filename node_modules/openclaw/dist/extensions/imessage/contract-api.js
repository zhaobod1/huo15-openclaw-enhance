import { t as resolveOutboundSendDep } from "../../send-deps-CVbk0lDS.js";
import { c as collectStatusIssuesFromLastError } from "../../status-helpers-ChR3_7qO.js";
import "../../outbound-runtime-BSC4z6CP.js";
import { n as resolveIMessageAttachmentRoots, r as resolveIMessageRemoteAttachmentRoots, t as DEFAULT_IMESSAGE_ATTACHMENT_ROOTS } from "../../media-contract-C8ZK0sub.js";
//#region extensions/imessage/src/test-plugin.ts
function normalizeIMessageTestHandle(raw) {
	const trimmed = raw.trim();
	if (!trimmed) return "";
	const lowered = trimmed.toLowerCase();
	if (lowered.startsWith("imessage:")) return normalizeIMessageTestHandle(trimmed.slice(9));
	if (lowered.startsWith("sms:")) return normalizeIMessageTestHandle(trimmed.slice(4));
	if (lowered.startsWith("auto:")) return normalizeIMessageTestHandle(trimmed.slice(5));
	if (/^(chat_id:|chat_guid:|chat_identifier:)/i.test(trimmed)) return trimmed.replace(/^(chat_id:|chat_guid:|chat_identifier:)/i, (match) => match.toLowerCase());
	if (trimmed.includes("@")) return trimmed.toLowerCase();
	const digits = trimmed.replace(/[^\d+]/g, "");
	if (digits) return digits.startsWith("+") ? `+${digits.slice(1)}` : `+${digits}`;
	return trimmed.replace(/\s+/g, "");
}
const defaultIMessageOutbound = {
	deliveryMode: "direct",
	sendText: async ({ to, text, accountId, replyToId, deps, cfg }) => {
		return {
			channel: "imessage",
			messageId: (await resolveOutboundSendDep(deps, "imessage")?.(to, text, {
				config: cfg,
				accountId: accountId ?? void 0,
				replyToId: replyToId ?? void 0
			}))?.messageId ?? "imessage-test-stub"
		};
	},
	sendMedia: async ({ to, text, mediaUrl, accountId, replyToId, deps, cfg, mediaLocalRoots }) => {
		return {
			channel: "imessage",
			messageId: (await resolveOutboundSendDep(deps, "imessage")?.(to, text, {
				config: cfg,
				mediaUrl,
				accountId: accountId ?? void 0,
				replyToId: replyToId ?? void 0,
				mediaLocalRoots
			}))?.messageId ?? "imessage-test-stub"
		};
	}
};
const createIMessageTestPlugin = (params) => ({
	id: "imessage",
	meta: {
		id: "imessage",
		label: "iMessage",
		selectionLabel: "iMessage (imsg)",
		docsPath: "/channels/imessage",
		blurb: "iMessage test stub.",
		aliases: ["imsg"]
	},
	capabilities: {
		chatTypes: ["direct", "group"],
		media: true
	},
	config: {
		listAccountIds: () => [],
		resolveAccount: () => ({})
	},
	status: { collectStatusIssues: (accounts) => collectStatusIssuesFromLastError("imessage", accounts) },
	outbound: params?.outbound ?? defaultIMessageOutbound,
	messaging: {
		targetResolver: {
			looksLikeId: (raw) => {
				const trimmed = raw.trim();
				if (!trimmed) return false;
				if (/^(imessage:|sms:|auto:|chat_id:|chat_guid:|chat_identifier:)/i.test(trimmed)) return true;
				if (trimmed.includes("@")) return true;
				return /^\+?\d{3,}$/.test(trimmed);
			},
			hint: "<handle|chat_id:ID>"
		},
		normalizeTarget: (raw) => normalizeIMessageTestHandle(raw)
	}
});
//#endregion
export { DEFAULT_IMESSAGE_ATTACHMENT_ROOTS, createIMessageTestPlugin, resolveIMessageAttachmentRoots, resolveIMessageAttachmentRoots as resolveInboundAttachmentRoots, resolveIMessageRemoteAttachmentRoots, resolveIMessageRemoteAttachmentRoots as resolveRemoteInboundAttachmentRoots };
