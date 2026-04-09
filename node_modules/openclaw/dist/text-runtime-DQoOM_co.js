import "./redact-BDinS1q9.js";
import "./logger-C-bijuBQ.js";
import "./utils-ms6h9yny.js";
import "./logger-DC8YwEpM.js";
import "./safe-text-CZwe1QN-.js";
import "./diagnostic-DeM0n-NO.js";
import { n as findCodeRegions, r as isInsideCode, t as stripReasoningTagsFromText } from "./reasoning-tags-ZuFk9o0O.js";
import { o as sliceMarkdownIR, r as chunkMarkdownIR } from "./tables-BblJIt3c.js";
//#region src/markdown/render-aware-chunking.ts
function renderMarkdownIRChunksWithinLimit(options) {
	if (!options.ir.text) return [];
	const normalizedLimit = Math.max(1, Math.floor(options.limit));
	const pending = chunkMarkdownIR(options.ir, normalizedLimit);
	const finalized = [];
	while (pending.length > 0) {
		const chunk = pending.shift();
		if (!chunk) continue;
		const rendered = options.renderChunk(chunk);
		if (options.measureRendered(rendered) <= normalizedLimit || chunk.text.length <= 1) {
			finalized.push(chunk);
			continue;
		}
		const split = splitMarkdownIRByRenderedLimit(chunk, normalizedLimit, options);
		if (split.length <= 1) {
			finalized.push(chunk);
			continue;
		}
		pending.unshift(...split);
	}
	return coalesceWhitespaceOnlyMarkdownIRChunks(finalized, normalizedLimit, options).map((source) => ({
		source,
		rendered: options.renderChunk(source)
	}));
}
function splitMarkdownIRByRenderedLimit(chunk, renderedLimit, options) {
	const currentTextLength = chunk.text.length;
	if (currentTextLength <= 1) return [chunk];
	const splitLimit = findLargestChunkTextLengthWithinRenderedLimit(chunk, renderedLimit, options);
	if (splitLimit <= 0) return [chunk];
	const split = splitMarkdownIRPreserveWhitespace(chunk, splitLimit);
	const firstChunk = split[0];
	if (firstChunk && options.measureRendered(options.renderChunk(firstChunk)) <= renderedLimit) return split;
	return [sliceMarkdownIR(chunk, 0, splitLimit), sliceMarkdownIR(chunk, splitLimit, currentTextLength)];
}
function findLargestChunkTextLengthWithinRenderedLimit(chunk, renderedLimit, options) {
	const currentTextLength = chunk.text.length;
	if (currentTextLength <= 1) return currentTextLength;
	for (let candidateLength = currentTextLength - 1; candidateLength >= 1; candidateLength -= 1) {
		const candidate = sliceMarkdownIR(chunk, 0, candidateLength);
		const rendered = options.renderChunk(candidate);
		if (options.measureRendered(rendered) <= renderedLimit) return candidateLength;
	}
	return 0;
}
function findMarkdownIRPreservedSplitIndex(text, start, limit) {
	const maxEnd = Math.min(text.length, start + limit);
	if (maxEnd >= text.length) return text.length;
	let lastOutsideParenNewlineBreak = -1;
	let lastOutsideParenWhitespaceBreak = -1;
	let lastOutsideParenWhitespaceRunStart = -1;
	let lastAnyNewlineBreak = -1;
	let lastAnyWhitespaceBreak = -1;
	let lastAnyWhitespaceRunStart = -1;
	let parenDepth = 0;
	let sawNonWhitespace = false;
	for (let index = start; index < maxEnd; index += 1) {
		const char = text[index];
		if (char === "(") {
			sawNonWhitespace = true;
			parenDepth += 1;
			continue;
		}
		if (char === ")" && parenDepth > 0) {
			sawNonWhitespace = true;
			parenDepth -= 1;
			continue;
		}
		if (!/\s/.test(char)) {
			sawNonWhitespace = true;
			continue;
		}
		if (!sawNonWhitespace) continue;
		if (char === "\n") {
			lastAnyNewlineBreak = index + 1;
			if (parenDepth === 0) lastOutsideParenNewlineBreak = index + 1;
			continue;
		}
		const whitespaceRunStart = index === start || !/\s/.test(text[index - 1] ?? "") ? index : lastAnyWhitespaceRunStart;
		lastAnyWhitespaceBreak = index + 1;
		lastAnyWhitespaceRunStart = whitespaceRunStart;
		if (parenDepth === 0) {
			lastOutsideParenWhitespaceBreak = index + 1;
			lastOutsideParenWhitespaceRunStart = whitespaceRunStart;
		}
	}
	const resolveWhitespaceBreak = (breakIndex, runStart) => {
		if (breakIndex <= start) return breakIndex;
		if (runStart <= start) return breakIndex;
		return /\s/.test(text[breakIndex] ?? "") ? runStart : breakIndex;
	};
	if (lastOutsideParenNewlineBreak > start) return lastOutsideParenNewlineBreak;
	if (lastOutsideParenWhitespaceBreak > start) return resolveWhitespaceBreak(lastOutsideParenWhitespaceBreak, lastOutsideParenWhitespaceRunStart);
	if (lastAnyNewlineBreak > start) return lastAnyNewlineBreak;
	if (lastAnyWhitespaceBreak > start) return resolveWhitespaceBreak(lastAnyWhitespaceBreak, lastAnyWhitespaceRunStart);
	return maxEnd;
}
function splitMarkdownIRPreserveWhitespace(ir, limit) {
	if (!ir.text) return [];
	const normalizedLimit = Math.max(1, Math.floor(limit));
	if (normalizedLimit <= 0 || ir.text.length <= normalizedLimit) return [ir];
	const chunks = [];
	let cursor = 0;
	while (cursor < ir.text.length) {
		const end = findMarkdownIRPreservedSplitIndex(ir.text, cursor, normalizedLimit);
		chunks.push(sliceMarkdownIR(ir, cursor, end));
		cursor = end;
	}
	return chunks;
}
function mergeAdjacentStyleSpans(styles) {
	const merged = [];
	for (const span of styles) {
		const last = merged.at(-1);
		if (last && last.style === span.style && span.start <= last.end) {
			last.end = Math.max(last.end, span.end);
			continue;
		}
		merged.push({ ...span });
	}
	return merged;
}
function mergeAdjacentLinkSpans(links) {
	const merged = [];
	for (const link of links) {
		const last = merged.at(-1);
		if (last && last.href === link.href && link.start <= last.end) {
			last.end = Math.max(last.end, link.end);
			continue;
		}
		merged.push({ ...link });
	}
	return merged;
}
function mergeMarkdownIRChunks(left, right) {
	const offset = left.text.length;
	return {
		text: left.text + right.text,
		styles: mergeAdjacentStyleSpans([...left.styles, ...right.styles.map((span) => ({
			...span,
			start: span.start + offset,
			end: span.end + offset
		}))]),
		links: mergeAdjacentLinkSpans([...left.links, ...right.links.map((link) => ({
			...link,
			start: link.start + offset,
			end: link.end + offset
		}))])
	};
}
function coalesceWhitespaceOnlyMarkdownIRChunks(chunks, renderedLimit, options) {
	const coalesced = [];
	let index = 0;
	while (index < chunks.length) {
		const chunk = chunks[index];
		if (!chunk) {
			index += 1;
			continue;
		}
		if (chunk.text.trim().length > 0) {
			coalesced.push(chunk);
			index += 1;
			continue;
		}
		const prev = coalesced.at(-1);
		const next = chunks[index + 1];
		const chunkLength = chunk.text.length;
		const canMerge = (candidate) => options.measureRendered(options.renderChunk(candidate)) <= renderedLimit;
		if (prev) {
			const mergedPrev = mergeMarkdownIRChunks(prev, chunk);
			if (canMerge(mergedPrev)) {
				coalesced[coalesced.length - 1] = mergedPrev;
				index += 1;
				continue;
			}
		}
		if (next) {
			const mergedNext = mergeMarkdownIRChunks(chunk, next);
			if (canMerge(mergedNext)) {
				chunks[index + 1] = mergedNext;
				index += 1;
				continue;
			}
		}
		if (prev && next) for (let prefixLength = chunkLength - 1; prefixLength >= 1; prefixLength -= 1) {
			const prefix = sliceMarkdownIR(chunk, 0, prefixLength);
			const suffix = sliceMarkdownIR(chunk, prefixLength, chunkLength);
			const mergedPrev = mergeMarkdownIRChunks(prev, prefix);
			const mergedNext = mergeMarkdownIRChunks(suffix, next);
			if (canMerge(mergedPrev) && canMerge(mergedNext)) {
				coalesced[coalesced.length - 1] = mergedPrev;
				chunks[index + 1] = mergedNext;
				break;
			}
		}
		index += 1;
	}
	return coalesced;
}
//#endregion
//#region src/shared/text/model-special-tokens.ts
/**
* Strip model control tokens leaked into assistant text output.
*
* Models like GLM-5 and DeepSeek sometimes emit internal delimiter tokens
* (e.g. `<|assistant|>`, `<|tool_call_result_begin|>`, `<｜begin▁of▁sentence｜>`)
* in their responses. These use the universal `<|...|>` convention (ASCII or
* full-width pipe variants) and should never reach end users.
*
* Matches inside fenced code blocks or inline code spans are preserved so
* that documentation / examples that reference these tokens are not corrupted.
*
* This is a provider bug — no upstream fix tracked yet.
* Remove this function when upstream providers stop leaking tokens.
* @see https://github.com/openclaw/openclaw/issues/40020
*/
const MODEL_SPECIAL_TOKEN_RE = /<[|｜][^|｜]*[|｜]>/g;
function overlapsCodeRegion(start, end, codeRegions) {
	return codeRegions.some((region) => start < region.end && end > region.start);
}
function stripModelSpecialTokens(text) {
	if (!text) return text;
	MODEL_SPECIAL_TOKEN_RE.lastIndex = 0;
	if (!MODEL_SPECIAL_TOKEN_RE.test(text)) return text;
	MODEL_SPECIAL_TOKEN_RE.lastIndex = 0;
	const codeRegions = findCodeRegions(text);
	return text.replace(MODEL_SPECIAL_TOKEN_RE, (match, offset) => {
		const start = offset;
		const end = start + match.length;
		return isInsideCode(start, codeRegions) || overlapsCodeRegion(start, end, codeRegions) ? match : " ";
	});
}
//#endregion
//#region src/shared/text/assistant-visible-text.ts
const MEMORY_TAG_RE = /<\s*(\/?)\s*relevant[-_]memories\b[^<>]*>/gi;
const MEMORY_TAG_QUICK_RE = /<\s*\/?\s*relevant[-_]memories\b/i;
/**
* Strip XML-style tool call tags that models sometimes emit as plain text.
* This stateful pass hides content from an opening tag through the matching
* closing tag, or to end-of-string if the stream was truncated mid-tag.
*/
const TOOL_CALL_QUICK_RE = /<\s*\/?\s*(?:tool_call|function_calls?|tool_calls)\b/i;
const TOOL_CALL_TAG_NAMES = new Set([
	"tool_call",
	"function_call",
	"function_calls",
	"tool_calls"
]);
const TOOL_CALL_JSON_PAYLOAD_START_RE = /^(?:\s+[A-Za-z_:][-A-Za-z0-9_:.]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))*\s*(?:\r?\n\s*)?[[{]/;
function endsInsideQuotedString(text, start, end) {
	let quoteChar = null;
	let isEscaped = false;
	for (let idx = start; idx < end; idx += 1) {
		const char = text[idx];
		if (quoteChar === null) {
			if (char === "\"" || char === "'") quoteChar = char;
			continue;
		}
		if (isEscaped) {
			isEscaped = false;
			continue;
		}
		if (char === "\\") {
			isEscaped = true;
			continue;
		}
		if (char === quoteChar) quoteChar = null;
	}
	return quoteChar !== null;
}
function isToolCallBoundary(char) {
	return !char || /\s/.test(char) || char === "/" || char === ">";
}
function findTagCloseIndex(text, start) {
	let quoteChar = null;
	let isEscaped = false;
	for (let idx = start; idx < text.length; idx += 1) {
		const char = text[idx];
		if (quoteChar !== null) {
			if (isEscaped) {
				isEscaped = false;
				continue;
			}
			if (char === "\\") {
				isEscaped = true;
				continue;
			}
			if (char === quoteChar) quoteChar = null;
			continue;
		}
		if (char === "\"" || char === "'") {
			quoteChar = char;
			continue;
		}
		if (char === "<") return -1;
		if (char === ">") return idx;
	}
	return -1;
}
function looksLikeToolCallPayloadStart(text, start) {
	return TOOL_CALL_JSON_PAYLOAD_START_RE.test(text.slice(start));
}
function parseToolCallTagAt(text, start) {
	if (text[start] !== "<") return null;
	let cursor = start + 1;
	while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
	let isClose = false;
	if (text[cursor] === "/") {
		isClose = true;
		cursor += 1;
		while (cursor < text.length && /\s/.test(text[cursor])) cursor += 1;
	}
	const nameStart = cursor;
	while (cursor < text.length && /[A-Za-z_]/.test(text[cursor])) cursor += 1;
	const tagName = text.slice(nameStart, cursor).toLowerCase();
	if (!TOOL_CALL_TAG_NAMES.has(tagName) || !isToolCallBoundary(text[cursor])) return null;
	const contentStart = cursor;
	const closeIndex = findTagCloseIndex(text, cursor);
	if (closeIndex === -1) return {
		contentStart,
		end: text.length,
		isClose,
		isSelfClosing: false,
		tagName,
		isTruncated: true
	};
	return {
		contentStart,
		end: closeIndex + 1,
		isClose,
		isSelfClosing: !isClose && /\/\s*$/.test(text.slice(cursor, closeIndex)),
		tagName,
		isTruncated: false
	};
}
function stripToolCallXmlTags(text) {
	if (!text || !TOOL_CALL_QUICK_RE.test(text)) return text;
	const codeRegions = findCodeRegions(text);
	let result = "";
	let lastIndex = 0;
	let inToolCallBlock = false;
	let toolCallContentStart = 0;
	let toolCallBlockTagName = null;
	const visibleTagBalance = /* @__PURE__ */ new Map();
	for (let idx = 0; idx < text.length; idx += 1) {
		if (text[idx] !== "<") continue;
		if (!inToolCallBlock && isInsideCode(idx, codeRegions)) continue;
		const tag = parseToolCallTagAt(text, idx);
		if (!tag) continue;
		if (!inToolCallBlock) {
			result += text.slice(lastIndex, idx);
			if (tag.isClose) {
				if (tag.isTruncated) {
					const preserveEnd = tag.contentStart;
					result += text.slice(idx, preserveEnd);
					lastIndex = preserveEnd;
					idx = Math.max(idx, preserveEnd - 1);
					continue;
				}
				const balance = visibleTagBalance.get(tag.tagName) ?? 0;
				if (balance > 0) {
					result += text.slice(idx, tag.end);
					visibleTagBalance.set(tag.tagName, balance - 1);
				}
				lastIndex = tag.end;
				idx = Math.max(idx, tag.end - 1);
				continue;
			}
			if (tag.isSelfClosing) {
				lastIndex = tag.end;
				idx = Math.max(idx, tag.end - 1);
				continue;
			}
			if (!tag.isClose && looksLikeToolCallPayloadStart(text, tag.isTruncated ? tag.contentStart : tag.end)) {
				inToolCallBlock = true;
				toolCallContentStart = tag.end;
				toolCallBlockTagName = tag.tagName;
				if (tag.isTruncated) {
					lastIndex = text.length;
					break;
				}
			} else {
				const preserveEnd = tag.isTruncated ? tag.contentStart : tag.end;
				result += text.slice(idx, preserveEnd);
				if (!tag.isTruncated) visibleTagBalance.set(tag.tagName, (visibleTagBalance.get(tag.tagName) ?? 0) + 1);
				lastIndex = preserveEnd;
				idx = Math.max(idx, preserveEnd - 1);
				continue;
			}
		} else if (tag.isClose && tag.tagName === toolCallBlockTagName && !endsInsideQuotedString(text, toolCallContentStart, idx)) {
			inToolCallBlock = false;
			toolCallBlockTagName = null;
		}
		lastIndex = tag.end;
		idx = Math.max(idx, tag.end - 1);
	}
	if (!inToolCallBlock) result += text.slice(lastIndex);
	return result;
}
function stripRelevantMemoriesTags(text) {
	if (!text || !MEMORY_TAG_QUICK_RE.test(text)) return text;
	MEMORY_TAG_RE.lastIndex = 0;
	const codeRegions = findCodeRegions(text);
	let result = "";
	let lastIndex = 0;
	let inMemoryBlock = false;
	for (const match of text.matchAll(MEMORY_TAG_RE)) {
		const idx = match.index ?? 0;
		if (isInsideCode(idx, codeRegions)) continue;
		const isClose = match[1] === "/";
		if (!inMemoryBlock) {
			result += text.slice(lastIndex, idx);
			if (!isClose) inMemoryBlock = true;
		} else if (isClose) inMemoryBlock = false;
		lastIndex = idx + match[0].length;
	}
	if (!inMemoryBlock) result += text.slice(lastIndex);
	return result;
}
function stripAssistantInternalScaffolding(text) {
	return stripModelSpecialTokens(stripToolCallXmlTags(stripRelevantMemoriesTags(stripReasoningTagsFromText(text, {
		mode: "preserve",
		trim: "start"
	})))).trimStart();
}
const FILE_REF_EXTENSIONS_WITH_TLD = new Set([
	"md",
	"go",
	"py",
	"pl",
	"sh",
	"am",
	"at",
	"be",
	"cc"
]);
function isAutoLinkedFileRef(href, label) {
	if (href.replace(/^https?:\/\//i, "") !== label) return false;
	const dotIndex = label.lastIndexOf(".");
	if (dotIndex < 1) return false;
	const ext = label.slice(dotIndex + 1).toLowerCase();
	if (!FILE_REF_EXTENSIONS_WITH_TLD.has(ext)) return false;
	const segments = label.split("/");
	if (segments.length > 1) {
		for (let i = 0; i < segments.length - 1; i += 1) if (segments[i]?.includes(".")) return false;
	}
	return true;
}
//#endregion
//#region src/shared/text/strip-markdown.ts
/**
* Strip lightweight markdown formatting from text while preserving readable
* plain-text structure for TTS and channel fallbacks.
*/
function stripMarkdown(text) {
	let result = text;
	result = result.replace(/\*\*(.+?)\*\*/g, "$1");
	result = result.replace(/__(.+?)__/g, "$1");
	result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1");
	result = result.replace(/(?<![\p{L}\p{N}])_(?!_)(.+?)(?<!_)_(?![\p{L}\p{N}])/gu, "$1");
	result = result.replace(/~~(.+?)~~/g, "$1");
	result = result.replace(/^#{1,6}\s+(.+)$/gm, "$1");
	result = result.replace(/^>\s?(.*)$/gm, "$1");
	result = result.replace(/^[-*_]{3,}$/gm, "");
	result = result.replace(/`([^`]+)`/g, "$1");
	result = result.replace(/\n{3,}/g, "\n\n");
	return result.trim();
}
//#endregion
//#region src/utils/chunk-items.ts
function chunkItems(items, size) {
	if (size <= 0) return [Array.from(items)];
	const rows = [];
	for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
	return rows;
}
//#endregion
//#region src/utils/reaction-level.ts
const LEVELS = new Set([
	"off",
	"ack",
	"minimal",
	"extensive"
]);
function parseLevel(value) {
	if (value === void 0 || value === null) return { kind: "missing" };
	if (typeof value !== "string") return { kind: "invalid" };
	const trimmed = value.trim();
	if (!trimmed) return { kind: "missing" };
	if (LEVELS.has(trimmed)) return {
		kind: "ok",
		value: trimmed
	};
	return { kind: "invalid" };
}
function resolveReactionLevel(params) {
	const parsed = parseLevel(params.value);
	switch (parsed.kind === "ok" ? parsed.value : parsed.kind === "missing" ? params.defaultLevel : params.invalidFallback) {
		case "off": return {
			level: "off",
			ackEnabled: false,
			agentReactionsEnabled: false
		};
		case "ack": return {
			level: "ack",
			ackEnabled: true,
			agentReactionsEnabled: false
		};
		case "minimal": return {
			level: "minimal",
			ackEnabled: false,
			agentReactionsEnabled: true,
			agentReactionGuidance: "minimal"
		};
		case "extensive": return {
			level: "extensive",
			ackEnabled: false,
			agentReactionsEnabled: true,
			agentReactionGuidance: "extensive"
		};
		default: return {
			level: "minimal",
			ackEnabled: false,
			agentReactionsEnabled: true,
			agentReactionGuidance: "minimal"
		};
	}
}
//#endregion
export { isAutoLinkedFileRef as a, FILE_REF_EXTENSIONS_WITH_TLD as i, chunkItems as n, stripAssistantInternalScaffolding as o, stripMarkdown as r, renderMarkdownIRChunksWithinLimit as s, resolveReactionLevel as t };
