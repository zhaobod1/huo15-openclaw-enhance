import { n as describeImagesWithModel, t as describeImageWithModel } from "./image-runtime-C6QbxTR_.js";
import { o as resolveProviderHttpRequestConfig, r as postJsonRequest, t as assertOkOrThrowHttpError } from "./shared-CXDsESE1.js";
import "./media-understanding-Cl-f734o.js";
import "./provider-http-BuJ3ne_x.js";
import { _ as QWEN_STANDARD_CN_BASE_URL, v as QWEN_STANDARD_GLOBAL_BASE_URL } from "./models-eJXVucds.js";
//#region extensions/qwen/media-understanding-provider.ts
const DEFAULT_QWEN_VIDEO_MODEL = "qwen-vl-max-latest";
const DEFAULT_QWEN_VIDEO_PROMPT = "Describe the video in detail.";
function resolveQwenStandardBaseUrl(cfg, providerId) {
	const direct = cfg?.models?.providers?.[providerId]?.baseUrl?.trim();
	if (!direct) return QWEN_STANDARD_GLOBAL_BASE_URL;
	try {
		const url = new URL(direct);
		if (url.hostname === "coding-intl.dashscope.aliyuncs.com") return QWEN_STANDARD_GLOBAL_BASE_URL;
		if (url.hostname === "coding.dashscope.aliyuncs.com") return QWEN_STANDARD_CN_BASE_URL;
		return `${url.origin}${url.pathname}`.replace(/\/+$/u, "");
	} catch {
		return QWEN_STANDARD_GLOBAL_BASE_URL;
	}
}
function coerceQwenText(payload) {
	const message = payload.choices?.[0]?.message;
	if (!message) return null;
	if (typeof message.content === "string" && message.content.trim()) return message.content.trim();
	if (Array.isArray(message.content)) {
		const text = message.content.map((part) => typeof part.text === "string" ? part.text.trim() : "").filter(Boolean).join("\n").trim();
		if (text) return text;
	}
	if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) return message.reasoning_content.trim();
	return null;
}
async function describeQwenVideo(params) {
	const fetchFn = params.fetchFn ?? fetch;
	const model = params.model?.trim() || DEFAULT_QWEN_VIDEO_MODEL;
	const mime = params.mime?.trim() || "video/mp4";
	const prompt = params.prompt?.trim() || DEFAULT_QWEN_VIDEO_PROMPT;
	const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } = resolveProviderHttpRequestConfig({
		baseUrl: params.baseUrl,
		defaultBaseUrl: QWEN_STANDARD_GLOBAL_BASE_URL,
		headers: params.headers,
		request: params.request,
		defaultHeaders: {
			"content-type": "application/json",
			authorization: `Bearer ${params.apiKey}`
		},
		provider: "qwen",
		api: "openai-completions",
		capability: "video",
		transport: "media-understanding"
	});
	const { response: res, release } = await postJsonRequest({
		url: `${baseUrl}/chat/completions`,
		headers,
		body: {
			model,
			messages: [{
				role: "user",
				content: [{
					type: "text",
					text: prompt
				}, {
					type: "video_url",
					video_url: { url: `data:${mime};base64,${params.buffer.toString("base64")}` }
				}]
			}]
		},
		timeoutMs: params.timeoutMs,
		fetchFn,
		allowPrivateNetwork,
		dispatcherPolicy
	});
	try {
		await assertOkOrThrowHttpError(res, "Qwen video description failed");
		const text = coerceQwenText(await res.json());
		if (!text) throw new Error("Qwen video description response missing content");
		return {
			text,
			model
		};
	} finally {
		await release();
	}
}
function buildQwenMediaUnderstandingProvider() {
	return {
		id: "qwen",
		capabilities: ["image", "video"],
		defaultModels: {
			image: "qwen-vl-max-latest",
			video: DEFAULT_QWEN_VIDEO_MODEL
		},
		autoPriority: { video: 15 },
		describeImage: describeImageWithModel,
		describeImages: describeImagesWithModel,
		describeVideo: describeQwenVideo
	};
}
function resolveQwenMediaUnderstandingBaseUrl(cfg) {
	return resolveQwenStandardBaseUrl(cfg, "qwen");
}
//#endregion
export { describeQwenVideo as n, resolveQwenMediaUnderstandingBaseUrl as r, buildQwenMediaUnderstandingProvider as t };
