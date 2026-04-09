import { t as normalizeXaiModelId } from "./model-id-myczZZ3L.js";
//#region extensions/xai/src/responses-tool-shared.ts
const XAI_RESPONSES_ENDPOINT = "https://api.x.ai/v1/responses";
function buildXaiResponsesToolBody(params) {
	return {
		model: params.model,
		input: [{
			role: "user",
			content: params.inputText
		}],
		tools: params.tools,
		...params.maxTurns ? { max_turns: params.maxTurns } : {}
	};
}
function extractXaiWebSearchContent(data) {
	for (const output of data.output ?? []) {
		if (output.type === "message") {
			for (const block of output.content ?? []) if (block.type === "output_text" && typeof block.text === "string" && block.text) {
				const urls = (block.annotations ?? []).filter((annotation) => annotation.type === "url_citation" && typeof annotation.url === "string").map((annotation) => annotation.url);
				return {
					text: block.text,
					annotationCitations: [...new Set(urls)]
				};
			}
		}
		if (output.type === "output_text" && typeof output.text === "string" && output.text) {
			const urls = (output.annotations ?? []).filter((annotation) => annotation.type === "url_citation" && typeof annotation.url === "string").map((annotation) => annotation.url);
			return {
				text: output.text,
				annotationCitations: [...new Set(urls)]
			};
		}
	}
	return {
		text: typeof data.output_text === "string" ? data.output_text : void 0,
		annotationCitations: []
	};
}
function resolveXaiResponseTextAndCitations(data) {
	const { text, annotationCitations } = extractXaiWebSearchContent(data);
	return {
		content: text ?? "No response",
		citations: Array.isArray(data.citations) && data.citations.length > 0 ? data.citations : annotationCitations
	};
}
//#endregion
//#region extensions/xai/src/tool-config-shared.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function coerceXaiToolConfig(config) {
	return isRecord(config) ? config : {};
}
function resolveNormalizedXaiToolModel(params) {
	const value = coerceXaiToolConfig(params.config).model;
	return typeof value === "string" && value.trim() ? normalizeXaiModelId(value.trim()) : params.defaultModel;
}
function resolvePositiveIntegerToolConfig(config, key) {
	const raw = coerceXaiToolConfig(config)[key];
	if (typeof raw !== "number" || !Number.isFinite(raw)) return;
	const normalized = Math.trunc(raw);
	return normalized > 0 ? normalized : void 0;
}
//#endregion
export { buildXaiResponsesToolBody as a, XAI_RESPONSES_ENDPOINT as i, resolveNormalizedXaiToolModel as n, extractXaiWebSearchContent as o, resolvePositiveIntegerToolConfig as r, resolveXaiResponseTextAndCitations as s, coerceXaiToolConfig as t };
