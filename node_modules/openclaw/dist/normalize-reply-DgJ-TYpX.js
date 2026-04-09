import { a as isSilentReplyText, o as stripSilentToken, r as isSilentReplyPayloadText } from "./tokens-wOGzQgw2.js";
import { s as stripHeartbeatToken } from "./heartbeat-D76mk7r3.js";
import "./pi-embedded-helpers-T2IjifdJ.js";
import { S as sanitizeUserFacingText } from "./errors-By_fjUFz.js";
import { i as hasReplyPayloadContent } from "./payload-Dw_f_f7y.js";
import { n as resolveResponsePrefixTemplate } from "./response-prefix-template-ChV3xk7N.js";
//#region src/auto-reply/reply/normalize-reply.ts
function normalizeReplyPayload(payload, opts = {}) {
	const applyChannelTransforms = opts.applyChannelTransforms ?? true;
	const hasContent = (text) => hasReplyPayloadContent({
		...payload,
		text
	}, { trimText: true });
	const trimmed = payload.text?.trim() ?? "";
	if (!hasContent(trimmed)) {
		opts.onSkip?.("empty");
		return null;
	}
	const silentToken = opts.silentToken ?? "NO_REPLY";
	let text = payload.text ?? void 0;
	if (text && isSilentReplyPayloadText(text, silentToken)) {
		if (!hasContent("")) {
			opts.onSkip?.("silent");
			return null;
		}
		text = "";
	}
	if (text && text.includes(silentToken) && !isSilentReplyText(text, silentToken)) {
		text = stripSilentToken(text, silentToken);
		if (!hasContent(text)) {
			opts.onSkip?.("silent");
			return null;
		}
	}
	if (text && !trimmed) text = "";
	if ((opts.stripHeartbeat ?? true) && text?.includes("HEARTBEAT_OK")) {
		const stripped = stripHeartbeatToken(text, { mode: "message" });
		if (stripped.didStrip) opts.onHeartbeatStrip?.();
		if (stripped.shouldSkip && !hasContent(stripped.text)) {
			opts.onSkip?.("heartbeat");
			return null;
		}
		text = stripped.text;
	}
	if (text) text = sanitizeUserFacingText(text, { errorContext: Boolean(payload.isError) });
	if (!hasContent(text)) {
		opts.onSkip?.("empty");
		return null;
	}
	let enrichedPayload = {
		...payload,
		text
	};
	if (applyChannelTransforms && opts.transformReplyPayload) {
		enrichedPayload = opts.transformReplyPayload(enrichedPayload) ?? enrichedPayload;
		text = enrichedPayload.text;
	}
	const effectivePrefix = opts.responsePrefixContext ? resolveResponsePrefixTemplate(opts.responsePrefix, opts.responsePrefixContext) : opts.responsePrefix;
	if (effectivePrefix && text && text.trim() !== "HEARTBEAT_OK" && !text.startsWith(effectivePrefix)) text = `${effectivePrefix} ${text}`;
	enrichedPayload = {
		...enrichedPayload,
		text
	};
	return enrichedPayload;
}
//#endregion
export { normalizeReplyPayload as t };
