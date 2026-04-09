import { r as logVerbose } from "./globals-B43CpcZo.js";
import { h as resolveDefaultModelForAgent } from "./model-selection-BVM4eHHo.js";
import { t as requireApiKey } from "./model-auth-runtime-shared-D5s3-tJn.js";
import "./tokens-wOGzQgw2.js";
import "./heartbeat-D76mk7r3.js";
import { r as getApiKeyForModel } from "./model-auth-BbESr7Je.js";
import "./chunk-CKMbnOQL.js";
import { n as resolveModelAsync } from "./model-D9GwM6aS.js";
import "./dispatch-CYHzwBjK.js";
import "./provider-dispatcher-B5ApdNtJ.js";
import "./reply-CxEVitwF.js";
import "./abort-O9-dSalh.js";
import "./btw-command-CuVDr7NT.js";
import { t as prepareModelForSimpleCompletion } from "./simple-completion-transport-BleFtTAA.js";
import { completeSimple } from "@mariozechner/pi-ai";
//#region src/auto-reply/reply/conversation-label-generator.ts
const DEFAULT_MAX_LABEL_LENGTH = 128;
const TIMEOUT_MS = 15e3;
function isTextContentBlock(block) {
	return block.type === "text";
}
async function generateConversationLabel(params) {
	const { userMessage, prompt, cfg, agentId, agentDir } = params;
	const maxLength = typeof params.maxLength === "number" && Number.isFinite(params.maxLength) && params.maxLength > 0 ? Math.floor(params.maxLength) : DEFAULT_MAX_LABEL_LENGTH;
	const modelRef = resolveDefaultModelForAgent({
		cfg,
		agentId
	});
	const resolved = await resolveModelAsync(modelRef.provider, modelRef.model, agentDir, cfg);
	if (!resolved.model) {
		logVerbose(`conversation-label-generator: failed to resolve model ${modelRef.provider}/${modelRef.model}`);
		return null;
	}
	const completionModel = prepareModelForSimpleCompletion({
		model: resolved.model,
		cfg
	});
	const apiKey = requireApiKey(await getApiKeyForModel({
		model: completionModel,
		cfg,
		agentDir
	}), modelRef.provider);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const text = (await completeSimple(completionModel, { messages: [{
			role: "user",
			content: `${prompt}\n\n${userMessage}`,
			timestamp: Date.now()
		}] }, {
			apiKey,
			maxTokens: 100,
			temperature: .3,
			signal: controller.signal
		})).content.filter(isTextContentBlock).map((block) => block.text).join("").trim();
		if (!text) return null;
		return text.slice(0, maxLength);
	} finally {
		clearTimeout(timeout);
	}
}
//#endregion
export { generateConversationLabel as t };
