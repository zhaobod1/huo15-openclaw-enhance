import "./pi-embedded-helpers-T2IjifdJ.js";
import { S as sanitizeUserFacingText } from "./errors-By_fjUFz.js";
import { a as parseAssistantTextSignature, i as normalizeAssistantPhase } from "./chat-message-content-qTIElPJw.js";
import { t as stripReasoningTagsFromText } from "./reasoning-tags-ZuFk9o0O.js";
import { r as resolveToolDisplay, t as formatToolDetail } from "./tool-display-BaXsrnTn.js";
//#region src/shared/chat-content.ts
function extractTextFromChatContent(content, opts) {
	const normalizeText = opts?.normalizeText ?? ((text) => text.replace(/\s+/g, " ").trim());
	const joinWith = opts?.joinWith ?? " ";
	const coerceText = (value) => {
		if (typeof value === "string") return value;
		if (value == null) return "";
		if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint" || typeof value === "symbol") return String(value);
		if (typeof value === "object") try {
			return JSON.stringify(value) ?? "";
		} catch {
			return "";
		}
		return "";
	};
	const sanitize = (text) => {
		const raw = coerceText(text);
		return coerceText(opts?.sanitizeText ? opts.sanitizeText(raw) : raw);
	};
	const normalize = (text) => coerceText(normalizeText(coerceText(text)));
	if (typeof content === "string") {
		const normalized = normalize(sanitize(content));
		return normalized ? normalized : null;
	}
	if (!Array.isArray(content)) return null;
	const chunks = [];
	for (const block of content) {
		if (!block || typeof block !== "object") continue;
		if (block.type !== "text") continue;
		const text = block.text;
		const value = sanitize(text);
		if (value.trim()) chunks.push(value);
	}
	const joined = normalize(chunks.join(joinWith));
	return joined ? joined : null;
}
//#endregion
//#region src/agents/pi-embedded-utils.ts
function isAssistantMessage(msg) {
	return msg?.role === "assistant";
}
/**
* Strip malformed Minimax tool invocations that leak into text content.
* Minimax sometimes embeds tool calls as XML in text blocks instead of
* proper structured tool calls. This removes:
* - <invoke name="...">...</invoke> blocks
* - </minimax:tool_call> closing tags
*/
function stripMinimaxToolCallXml(text) {
	if (!text) return text;
	if (!/minimax:tool_call/i.test(text)) return text;
	let cleaned = text.replace(/<invoke\b[^>]*>[\s\S]*?<\/invoke>/gi, "");
	cleaned = cleaned.replace(/<\/?minimax:tool_call>/gi, "");
	return cleaned;
}
/**
* Strip model control tokens leaked into assistant text output.
*
* Models like GLM-5 and DeepSeek sometimes emit internal delimiter tokens
* (e.g. `<|assistant|>`, `<|tool_call_result_begin|>`, `<｜begin▁of▁sentence｜>`)
* in their responses. These use the universal `<|...|>` convention (ASCII or
* full-width pipe variants) and should never reach end users.
*
* This is a provider bug — no upstream fix tracked yet.
* Remove this function when upstream providers stop leaking tokens.
* @see https://github.com/openclaw/openclaw/issues/40020
*/
const MODEL_SPECIAL_TOKEN_RE = /<[|｜][^|｜]*[|｜]>/g;
function stripModelSpecialTokens(text) {
	if (!text) return text;
	if (!MODEL_SPECIAL_TOKEN_RE.test(text)) return text;
	MODEL_SPECIAL_TOKEN_RE.lastIndex = 0;
	return text.replace(MODEL_SPECIAL_TOKEN_RE, " ").replace(/  +/g, " ").trim();
}
/**
* Strip downgraded tool call text representations that leak into text content.
* When replaying history to Gemini, tool calls without `thought_signature` are
* downgraded to text blocks like `[Tool Call: name (ID: ...)]`. These should
* not be shown to users.
*/
function stripDowngradedToolCallText(text) {
	if (!text) return text;
	if (!/\[Tool (?:Call|Result)/i.test(text) && !/\[Historical context/i.test(text)) return text;
	const consumeJsonish = (input, start, options) => {
		const { allowLeadingNewlines = false } = options ?? {};
		let index = start;
		while (index < input.length) {
			const ch = input[index];
			if (ch === " " || ch === "	") {
				index += 1;
				continue;
			}
			if (allowLeadingNewlines && (ch === "\n" || ch === "\r")) {
				index += 1;
				continue;
			}
			break;
		}
		if (index >= input.length) return null;
		const startChar = input[index];
		if (startChar === "{" || startChar === "[") {
			let depth = 0;
			let inString = false;
			let escape = false;
			for (let i = index; i < input.length; i += 1) {
				const ch = input[i];
				if (inString) {
					if (escape) escape = false;
					else if (ch === "\\") escape = true;
					else if (ch === "\"") inString = false;
					continue;
				}
				if (ch === "\"") {
					inString = true;
					continue;
				}
				if (ch === "{" || ch === "[") {
					depth += 1;
					continue;
				}
				if (ch === "}" || ch === "]") {
					depth -= 1;
					if (depth === 0) return i + 1;
				}
			}
			return null;
		}
		if (startChar === "\"") {
			let escape = false;
			for (let i = index + 1; i < input.length; i += 1) {
				const ch = input[i];
				if (escape) {
					escape = false;
					continue;
				}
				if (ch === "\\") {
					escape = true;
					continue;
				}
				if (ch === "\"") return i + 1;
			}
			return null;
		}
		let end = index;
		while (end < input.length && input[end] !== "\n" && input[end] !== "\r") end += 1;
		return end;
	};
	const stripToolCalls = (input) => {
		const markerRe = /\[Tool Call:[^\]]*\]/gi;
		let result = "";
		let cursor = 0;
		for (const match of input.matchAll(markerRe)) {
			const start = match.index ?? 0;
			if (start < cursor) continue;
			result += input.slice(cursor, start);
			let index = start + match[0].length;
			while (index < input.length && (input[index] === " " || input[index] === "	")) index += 1;
			if (input[index] === "\r") {
				index += 1;
				if (input[index] === "\n") index += 1;
			} else if (input[index] === "\n") index += 1;
			while (index < input.length && (input[index] === " " || input[index] === "	")) index += 1;
			if (input.slice(index, index + 9).toLowerCase() === "arguments") {
				index += 9;
				if (input[index] === ":") index += 1;
				if (input[index] === " ") index += 1;
				const end = consumeJsonish(input, index, { allowLeadingNewlines: true });
				if (end !== null) index = end;
			}
			if ((input[index] === "\n" || input[index] === "\r") && (result.endsWith("\n") || result.endsWith("\r") || result.length === 0)) {
				if (input[index] === "\r") index += 1;
				if (input[index] === "\n") index += 1;
			}
			cursor = index;
		}
		result += input.slice(cursor);
		return result;
	};
	let cleaned = stripToolCalls(text);
	cleaned = cleaned.replace(/\[Tool Result for ID[^\]]*\]\n?[\s\S]*?(?=\n*\[Tool |\n*$)/gi, "");
	cleaned = cleaned.replace(/\[Historical context:[^\]]*\]\n?/gi, "");
	return cleaned.trim();
}
/**
* Strip thinking tags and their content from text.
* This is a safety net for cases where the model outputs <think> tags
* that slip through other filtering mechanisms.
*/
function stripThinkingTagsFromText(text) {
	return stripReasoningTagsFromText(text, {
		mode: "strict",
		trim: "both"
	});
}
function sanitizeAssistantText(text) {
	return stripThinkingTagsFromText(stripDowngradedToolCallText(stripModelSpecialTokens(stripMinimaxToolCallXml(text)))).trim();
}
function finalizeAssistantExtraction(msg, extracted) {
	return sanitizeUserFacingText(extracted, { errorContext: msg.stopReason === "error" });
}
function extractAssistantTextForPhase(msg, phase) {
	const messagePhase = normalizeAssistantPhase(msg.phase);
	const shouldIncludeContent = (resolvedPhase) => {
		if (phase) return resolvedPhase === phase;
		return resolvedPhase === void 0;
	};
	if (typeof msg.content === "string") return shouldIncludeContent(messagePhase) ? finalizeAssistantExtraction(msg, sanitizeAssistantText(msg.content)) : "";
	if (!Array.isArray(msg.content)) return "";
	const hasExplicitPhasedTextBlocks = msg.content.some((block) => {
		if (!block || typeof block !== "object") return false;
		const record = block;
		if (record.type !== "text") return false;
		return Boolean(parseAssistantTextSignature(record.textSignature)?.phase);
	});
	return finalizeAssistantExtraction(msg, extractTextFromChatContent(msg.content.filter((block) => {
		if (!block || typeof block !== "object") return false;
		const record = block;
		if (record.type !== "text") return false;
		return shouldIncludeContent(parseAssistantTextSignature(record.textSignature)?.phase ?? (hasExplicitPhasedTextBlocks ? void 0 : messagePhase));
	}), {
		sanitizeText: (text) => sanitizeAssistantText(text),
		joinWith: "\n",
		normalizeText: (text) => text.trim()
	}) ?? "");
}
function extractAssistantVisibleText(msg) {
	const finalAnswerText = extractAssistantTextForPhase(msg, "final_answer");
	if (finalAnswerText.trim()) return finalAnswerText;
	return extractAssistantTextForPhase(msg);
}
function extractAssistantText(msg) {
	return finalizeAssistantExtraction(msg, extractTextFromChatContent(msg.content, {
		sanitizeText: (text) => sanitizeAssistantText(text),
		joinWith: "\n",
		normalizeText: (text) => text.trim()
	}) ?? "");
}
function extractAssistantThinking(msg) {
	if (!Array.isArray(msg.content)) return "";
	return msg.content.map((block) => {
		if (!block || typeof block !== "object") return "";
		const record = block;
		if (record.type === "thinking" && typeof record.thinking === "string") return record.thinking.trim();
		return "";
	}).filter(Boolean).join("\n").trim();
}
function formatReasoningMessage(text) {
	const trimmed = text.trim();
	if (!trimmed) return "";
	return `Reasoning:\n${trimmed.split("\n").map((line) => line ? `_${line}_` : line).join("\n")}`;
}
function splitThinkingTaggedText(text) {
	const trimmedStart = text.trimStart();
	if (!trimmedStart.startsWith("<")) return null;
	const openRe = /<\s*(?:think(?:ing)?|thought|antthinking)\s*>/i;
	const closeRe = /<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/i;
	if (!openRe.test(trimmedStart)) return null;
	if (!closeRe.test(text)) return null;
	const scanRe = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;
	let inThinking = false;
	let cursor = 0;
	let thinkingStart = 0;
	const blocks = [];
	const pushText = (value) => {
		if (!value) return;
		blocks.push({
			type: "text",
			text: value
		});
	};
	const pushThinking = (value) => {
		const cleaned = value.trim();
		if (!cleaned) return;
		blocks.push({
			type: "thinking",
			thinking: cleaned
		});
	};
	for (const match of text.matchAll(scanRe)) {
		const index = match.index ?? 0;
		const isClose = Boolean(match[1]?.includes("/"));
		if (!inThinking && !isClose) {
			pushText(text.slice(cursor, index));
			thinkingStart = index + match[0].length;
			inThinking = true;
			continue;
		}
		if (inThinking && isClose) {
			pushThinking(text.slice(thinkingStart, index));
			cursor = index + match[0].length;
			inThinking = false;
		}
	}
	if (inThinking) return null;
	pushText(text.slice(cursor));
	if (!blocks.some((b) => b.type === "thinking")) return null;
	return blocks;
}
function promoteThinkingTagsToBlocks(message) {
	if (!Array.isArray(message.content)) return;
	if (message.content.some((block) => block && typeof block === "object" && block.type === "thinking")) return;
	const next = [];
	let changed = false;
	for (const block of message.content) {
		if (!block || typeof block !== "object" || !("type" in block)) {
			next.push(block);
			continue;
		}
		if (block.type !== "text") {
			next.push(block);
			continue;
		}
		const split = splitThinkingTaggedText(block.text);
		if (!split) {
			next.push(block);
			continue;
		}
		changed = true;
		for (const part of split) if (part.type === "thinking") next.push({
			type: "thinking",
			thinking: part.thinking
		});
		else if (part.type === "text") {
			const cleaned = part.text.trimStart();
			if (cleaned) next.push({
				type: "text",
				text: cleaned
			});
		}
	}
	if (!changed) return;
	message.content = next;
}
function extractThinkingFromTaggedText(text) {
	if (!text) return "";
	const scanRe = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;
	let result = "";
	let lastIndex = 0;
	let inThinking = false;
	for (const match of text.matchAll(scanRe)) {
		const idx = match.index ?? 0;
		if (inThinking) result += text.slice(lastIndex, idx);
		inThinking = !(match[1] === "/");
		lastIndex = idx + match[0].length;
	}
	return result.trim();
}
function extractThinkingFromTaggedStream(text) {
	if (!text) return "";
	const closed = extractThinkingFromTaggedText(text);
	if (closed) return closed;
	const openRe = /<\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;
	const closeRe = /<\s*\/\s*(?:think(?:ing)?|thought|antthinking)\s*>/gi;
	const openMatches = [...text.matchAll(openRe)];
	if (openMatches.length === 0) return "";
	const closeMatches = [...text.matchAll(closeRe)];
	const lastOpen = openMatches[openMatches.length - 1];
	const lastClose = closeMatches[closeMatches.length - 1];
	if (lastClose && (lastClose.index ?? -1) > (lastOpen.index ?? -1)) return closed;
	const start = (lastOpen.index ?? 0) + lastOpen[0].length;
	return text.slice(start).trim();
}
function inferToolMetaFromArgs(toolName, args) {
	return formatToolDetail(resolveToolDisplay({
		name: toolName,
		args
	}));
}
//#endregion
export { extractThinkingFromTaggedText as a, isAssistantMessage as c, stripDowngradedToolCallText as d, stripMinimaxToolCallXml as f, extractTextFromChatContent as h, extractThinkingFromTaggedStream as i, promoteThinkingTagsToBlocks as l, stripThinkingTagsFromText as m, extractAssistantThinking as n, formatReasoningMessage as o, stripModelSpecialTokens as p, extractAssistantVisibleText as r, inferToolMetaFromArgs as s, extractAssistantText as t, splitThinkingTaggedText as u };
