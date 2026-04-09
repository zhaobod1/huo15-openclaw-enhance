import { h as readStringParam } from "./common-B7pbdYUb.js";
import { r as resolveReactionMessageId } from "./channel-actions-DLDrCW4b.js";
import { o as normalizeWhatsAppTarget } from "./normalize-target-Rq2SUNBo.js";
import { t as handleWhatsAppAction } from "./action-runtime-Cqtq0wFI.js";
import "./normalize-NKCRvjJ3.js";
//#region extensions/whatsapp/src/channel-react-action.ts
const WHATSAPP_CHANNEL = "whatsapp";
async function handleWhatsAppReactAction(params) {
	if (params.action !== "react") throw new Error(`Action ${params.action} is not supported for provider ${WHATSAPP_CHANNEL}.`);
	const isWhatsAppSource = params.toolContext?.currentChannelProvider === WHATSAPP_CHANNEL;
	const explicitTarget = readStringParam(params.params, "chatJid") ?? readStringParam(params.params, "to");
	const normalizedTarget = explicitTarget ? normalizeWhatsAppTarget(explicitTarget) : null;
	const normalizedCurrent = isWhatsAppSource && params.toolContext?.currentChannelId ? normalizeWhatsAppTarget(params.toolContext.currentChannelId) : null;
	const scopedContext = !isWhatsAppSource || normalizedTarget != null && (normalizedCurrent == null || normalizedTarget !== normalizedCurrent) || !params.toolContext ? void 0 : {
		currentChannelId: params.toolContext.currentChannelId ?? void 0,
		currentChannelProvider: params.toolContext.currentChannelProvider ?? void 0,
		currentMessageId: params.toolContext.currentMessageId ?? void 0
	};
	const messageIdRaw = resolveReactionMessageId({
		args: params.params,
		toolContext: scopedContext
	});
	if (messageIdRaw == null) readStringParam(params.params, "messageId", { required: true });
	const messageId = String(messageIdRaw);
	const emoji = readStringParam(params.params, "emoji", { allowEmpty: true });
	const remove = typeof params.params.remove === "boolean" ? params.params.remove : void 0;
	return await handleWhatsAppAction({
		action: "react",
		chatJid: readStringParam(params.params, "chatJid") ?? readStringParam(params.params, "to", { required: true }),
		messageId,
		emoji,
		remove,
		participant: readStringParam(params.params, "participant"),
		accountId: params.accountId ?? void 0,
		fromMe: typeof params.params.fromMe === "boolean" ? params.params.fromMe : void 0
	}, params.cfg);
}
//#endregion
export { handleWhatsAppReactAction };
