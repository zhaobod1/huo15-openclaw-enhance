import { t as safeParseJsonWithSchema } from "./zod-parse-SRMZ4WYD.js";
import { _ as resolveAgentCommand, a as normalizeRuntimeSessionId, c as PermissionDeniedError, d as SessionModelReplayError, f as SessionResumeRequiredError, h as isAcpResourceNotFoundError, i as withTimeout, l as PermissionPromptUnavailableError, m as formatUnknownErrorMessage, n as InterruptedError, o as textPrompt, p as extractAcpError, r as TimeoutError, s as AuthPolicyError, t as AcpClient, u as SessionModeReplayError } from "./acp-client-DOkp1hpf.js";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
//#region extensions/acpx/src/runtime-types.ts
const OUTPUT_ERROR_CODES = [
	"NO_SESSION",
	"TIMEOUT",
	"PERMISSION_DENIED",
	"PERMISSION_PROMPT_UNAVAILABLE",
	"RUNTIME",
	"USAGE"
];
const OUTPUT_ERROR_ORIGINS = [
	"cli",
	"runtime",
	"queue",
	"acp"
];
//#endregion
//#region extensions/acpx/src/error-normalization.ts
const AUTH_REQUIRED_ACP_CODES = new Set([-32e3]);
const QUERY_CLOSED_BEFORE_RESPONSE_DETAIL = "query closed before response received";
function asRecord$1(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return value;
}
function isAuthRequiredMessage(value) {
	if (!value) return false;
	const normalized = value.toLowerCase();
	return normalized.includes("auth required") || normalized.includes("authentication required") || normalized.includes("authorization required") || normalized.includes("credential required") || normalized.includes("credentials required") || normalized.includes("token required") || normalized.includes("login required");
}
function isAcpAuthRequiredPayload(acp) {
	if (!acp) return false;
	if (!AUTH_REQUIRED_ACP_CODES.has(acp.code)) return false;
	if (isAuthRequiredMessage(acp.message)) return true;
	const data = asRecord$1(acp.data);
	if (!data) return false;
	if (data.authRequired === true) return true;
	const methodId = data.methodId;
	if (typeof methodId === "string" && methodId.trim().length > 0) return true;
	const methods = data.methods;
	if (Array.isArray(methods) && methods.length > 0) return true;
	return false;
}
function isOutputErrorCode(value) {
	return typeof value === "string" && OUTPUT_ERROR_CODES.includes(value);
}
function isOutputErrorOrigin(value) {
	return typeof value === "string" && OUTPUT_ERROR_ORIGINS.includes(value);
}
function readOutputErrorMeta(error) {
	const record = asRecord$1(error);
	if (!record) return {};
	return {
		outputCode: isOutputErrorCode(record.outputCode) ? record.outputCode : void 0,
		detailCode: typeof record.detailCode === "string" && record.detailCode.trim().length > 0 ? record.detailCode : void 0,
		origin: isOutputErrorOrigin(record.origin) ? record.origin : void 0,
		retryable: typeof record.retryable === "boolean" ? record.retryable : void 0,
		acp: extractAcpError(record.acp)
	};
}
function isTimeoutLike(error) {
	return error instanceof Error && error.name === "TimeoutError";
}
function isNoSessionLike(error) {
	return error instanceof Error && error.name === "NoSessionError";
}
function isUsageLike(error) {
	if (!(error instanceof Error)) return false;
	return error.name === "CommanderError" || error.name === "InvalidArgumentError" || asRecord$1(error)?.code === "commander.invalidArgument";
}
function formatErrorMessage(error) {
	return formatUnknownErrorMessage(error);
}
function isAcpQueryClosedBeforeResponseError(error) {
	const acp = extractAcpError(error);
	if (!acp || acp.code !== -32603) return false;
	const details = asRecord$1(acp.data)?.details;
	if (typeof details !== "string") return false;
	return details.toLowerCase().includes(QUERY_CLOSED_BEFORE_RESPONSE_DETAIL);
}
function mapErrorCode(error) {
	if (error instanceof PermissionPromptUnavailableError) return "PERMISSION_PROMPT_UNAVAILABLE";
	if (error instanceof PermissionDeniedError) return "PERMISSION_DENIED";
	if (isTimeoutLike(error)) return "TIMEOUT";
	if (isNoSessionLike(error) || isAcpResourceNotFoundError(error)) return "NO_SESSION";
	if (isUsageLike(error)) return "USAGE";
}
function normalizeOutputError(error, options = {}) {
	const meta = readOutputErrorMeta(error);
	let code = mapErrorCode(error) ?? options.defaultCode ?? "RUNTIME";
	if (meta.outputCode) code = meta.outputCode;
	if (code === "RUNTIME" && isAcpResourceNotFoundError(error)) code = "NO_SESSION";
	const acp = options.acp ?? meta.acp ?? extractAcpError(error);
	const detailCode = meta.detailCode ?? options.detailCode ?? (error instanceof AuthPolicyError || isAcpAuthRequiredPayload(acp) ? "AUTH_REQUIRED" : void 0);
	return {
		code,
		message: formatErrorMessage(error),
		detailCode,
		origin: meta.origin ?? options.origin,
		retryable: meta.retryable ?? options.retryable,
		acp
	};
}
//#endregion
//#region extensions/acpx/src/history/conversation.ts
const MAX_RUNTIME_MESSAGES = 200;
const MAX_RUNTIME_AGENT_TEXT_CHARS = 8e3;
const MAX_RUNTIME_THINKING_CHARS = 4e3;
const MAX_RUNTIME_TOOL_IO_CHARS = 4e3;
const MAX_RUNTIME_REQUEST_TOKEN_USAGE = 100;
function isoNow$1() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function deepClone(value) {
	try {
		return structuredClone(value);
	} catch {
		return value;
	}
}
function hasOwn(source, key) {
	return Object.prototype.hasOwnProperty.call(source, key);
}
function normalizeAgentName(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function extractText(content) {
	if (content.type === "text") return content.text;
	if (content.type === "resource_link") return content.title ?? content.name ?? content.uri;
	if (content.type === "resource") {
		if ("text" in content.resource && typeof content.resource.text === "string") return content.resource.text;
		return content.resource.uri;
	}
}
function contentToUserContent(content) {
	if (content.type === "text") return { Text: content.text };
	if (content.type === "resource_link") {
		const value = content.title ?? content.name ?? content.uri;
		return { Mention: {
			uri: content.uri,
			content: value
		} };
	}
	if (content.type === "resource") {
		if ("text" in content.resource && typeof content.resource.text === "string") return { Text: content.resource.text };
		return { Mention: {
			uri: content.resource.uri,
			content: content.resource.uri
		} };
	}
	if (content.type === "image") return { Image: {
		source: content.data,
		size: null
	} };
}
function nextUserMessageId() {
	return randomUUID();
}
function isUserMessage(message) {
	return typeof message === "object" && message !== null && hasOwn(message, "User");
}
function isAgentMessage(message) {
	return typeof message === "object" && message !== null && hasOwn(message, "Agent");
}
function isAgentTextContent(content) {
	return hasOwn(content, "Text");
}
function isAgentThinkingContent(content) {
	return hasOwn(content, "Thinking");
}
function isAgentToolUseContent(content) {
	return hasOwn(content, "ToolUse");
}
function updateConversationTimestamp(conversation, timestamp) {
	conversation.updated_at = timestamp;
}
function ensureAgentMessage(conversation) {
	const last = conversation.messages.at(-1);
	if (last && isAgentMessage(last)) return last.Agent;
	const created = {
		content: [],
		tool_results: {}
	};
	conversation.messages.push({ Agent: created });
	return created;
}
function appendAgentText(agent, text) {
	if (!text.trim()) return;
	const last = agent.content.at(-1);
	if (last && isAgentTextContent(last)) {
		last.Text = trimRuntimeText(`${last.Text}${text}`, MAX_RUNTIME_AGENT_TEXT_CHARS);
		return;
	}
	const next = { Text: text };
	agent.content.push(next);
}
function appendAgentThinking(agent, text) {
	if (!text.trim()) return;
	const last = agent.content.at(-1);
	if (last && isAgentThinkingContent(last)) {
		last.Thinking.text = trimRuntimeText(`${last.Thinking.text}${text}`, MAX_RUNTIME_THINKING_CHARS);
		return;
	}
	const next = { Thinking: {
		text,
		signature: null
	} };
	agent.content.push(next);
}
function trimRuntimeText(value, maxChars) {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}
function statusIndicatesComplete(status) {
	if (typeof status !== "string") return false;
	const normalized = status.toLowerCase();
	return normalized.includes("complete") || normalized.includes("done") || normalized.includes("success") || normalized.includes("failed") || normalized.includes("error") || normalized.includes("cancel");
}
function statusIndicatesError(status) {
	if (typeof status !== "string") return false;
	const normalized = status.toLowerCase();
	return normalized.includes("fail") || normalized.includes("error");
}
function toToolResultContent(value) {
	if (typeof value === "string") return { Text: trimRuntimeText(value, MAX_RUNTIME_TOOL_IO_CHARS) };
	if (value != null) try {
		return { Text: trimRuntimeText(JSON.stringify(value), MAX_RUNTIME_TOOL_IO_CHARS) };
	} catch {
		return { Text: "[Unserializable value]" };
	}
	return { Text: "" };
}
function toRawInput(value) {
	if (typeof value === "string") return trimRuntimeText(value, MAX_RUNTIME_TOOL_IO_CHARS);
	try {
		return trimRuntimeText(JSON.stringify(value ?? {}), MAX_RUNTIME_TOOL_IO_CHARS);
	} catch {
		return value == null ? "" : "[Unserializable input]";
	}
}
function ensureToolUseContent(agent, toolCallId) {
	for (const content of agent.content) if (isAgentToolUseContent(content) && content.ToolUse.id === toolCallId) return content.ToolUse;
	const created = {
		id: toolCallId,
		name: "tool_call",
		raw_input: "{}",
		input: {},
		is_input_complete: false,
		thought_signature: null
	};
	agent.content.push({ ToolUse: created });
	return created;
}
function upsertToolResult(agent, toolCallId, patch) {
	const existing = agent.tool_results[toolCallId];
	const next = {
		tool_use_id: toolCallId,
		tool_name: patch.tool_name ?? existing?.tool_name ?? "tool_call",
		is_error: patch.is_error ?? existing?.is_error ?? false,
		content: patch.content ?? existing?.content ?? { Text: "" },
		output: patch.output ?? existing?.output
	};
	agent.tool_results[toolCallId] = next;
}
function applyToolCallUpdate(agent, update) {
	const tool = ensureToolUseContent(agent, update.toolCallId);
	if (hasOwn(update, "title")) tool.name = normalizeAgentName(update.title) ?? tool.name ?? "tool_call";
	if (hasOwn(update, "kind")) {
		const kindName = normalizeAgentName(update.kind);
		if (!tool.name || tool.name === "tool_call") tool.name = kindName ?? tool.name;
	}
	if (hasOwn(update, "rawInput")) {
		const rawInput = deepClone(update.rawInput);
		tool.input = rawInput ?? {};
		tool.raw_input = toRawInput(rawInput);
	}
	if (hasOwn(update, "status")) tool.is_input_complete = statusIndicatesComplete(update.status);
	if (hasOwn(update, "rawOutput") || hasOwn(update, "status") || hasOwn(update, "title") || hasOwn(update, "kind")) {
		const status = update.status;
		const output = hasOwn(update, "rawOutput") ? deepClone(update.rawOutput) : void 0;
		upsertToolResult(agent, update.toolCallId, {
			tool_name: tool.name,
			is_error: statusIndicatesError(status),
			content: output === void 0 ? void 0 : toToolResultContent(output),
			output
		});
	}
}
function asRecord(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return value;
}
function numberField(source, keys) {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
	}
}
function usageToTokenUsage(update) {
	const updateRecord = asRecord(update);
	const usageMeta = asRecord(updateRecord?._meta)?.usage;
	const source = asRecord(usageMeta) ?? updateRecord;
	if (!source) return;
	const normalized = {
		input_tokens: numberField(source, ["input_tokens", "inputTokens"]),
		output_tokens: numberField(source, ["output_tokens", "outputTokens"]),
		cache_creation_input_tokens: numberField(source, [
			"cache_creation_input_tokens",
			"cacheCreationInputTokens",
			"cachedWriteTokens"
		]),
		cache_read_input_tokens: numberField(source, [
			"cache_read_input_tokens",
			"cacheReadInputTokens",
			"cachedReadTokens"
		])
	};
	if (normalized.input_tokens === void 0 && normalized.output_tokens === void 0 && normalized.cache_creation_input_tokens === void 0 && normalized.cache_read_input_tokens === void 0) return;
	return normalized;
}
function ensureAcpxState$1(state) {
	return state ?? {};
}
function lastUserMessageId(conversation) {
	for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
		const message = conversation.messages[index];
		if (message && isUserMessage(message)) return message.User.id;
	}
}
function createSessionConversation(timestamp = isoNow$1()) {
	return {
		title: null,
		messages: [],
		updated_at: timestamp,
		cumulative_token_usage: {},
		request_token_usage: {}
	};
}
function cloneSessionConversation(conversation) {
	if (!conversation) return createSessionConversation();
	return {
		title: conversation.title,
		messages: deepClone(conversation.messages ?? []),
		updated_at: conversation.updated_at,
		cumulative_token_usage: deepClone(conversation.cumulative_token_usage ?? {}),
		request_token_usage: deepClone(conversation.request_token_usage ?? {})
	};
}
function cloneSessionAcpxState(state) {
	if (!state) return;
	return {
		current_mode_id: state.current_mode_id,
		desired_mode_id: state.desired_mode_id,
		current_model_id: state.current_model_id,
		available_models: state.available_models ? [...state.available_models] : void 0,
		available_commands: state.available_commands ? [...state.available_commands] : void 0,
		config_options: state.config_options ? deepClone(state.config_options) : void 0,
		session_options: state.session_options ? {
			model: state.session_options.model,
			allowed_tools: state.session_options.allowed_tools ? [...state.session_options.allowed_tools] : void 0,
			max_turns: state.session_options.max_turns
		} : void 0
	};
}
function recordPromptSubmission(conversation, prompt, timestamp = isoNow$1()) {
	const userContent = (typeof prompt === "string" ? textPrompt(prompt) : prompt).map((content) => contentToUserContent(content)).filter((content) => content !== void 0);
	if (userContent.length === 0) return;
	conversation.messages.push({ User: {
		id: nextUserMessageId(),
		content: userContent.map((content) => {
			if ("Text" in content) return { Text: trimRuntimeText(content.Text, MAX_RUNTIME_AGENT_TEXT_CHARS) };
			return content;
		})
	} });
	updateConversationTimestamp(conversation, timestamp);
	trimConversationForRuntime(conversation);
}
function recordSessionUpdate(conversation, state, notification, timestamp = isoNow$1()) {
	const acpx = ensureAcpxState$1(state);
	const update = notification.update;
	switch (update.sessionUpdate) {
		case "user_message_chunk": {
			const userContent = contentToUserContent(update.content);
			if (userContent) conversation.messages.push({ User: {
				id: nextUserMessageId(),
				content: [userContent]
			} });
			break;
		}
		case "agent_message_chunk": {
			const text = extractText(update.content);
			if (text) appendAgentText(ensureAgentMessage(conversation), text);
			break;
		}
		case "agent_thought_chunk": {
			const text = extractText(update.content);
			if (text) appendAgentThinking(ensureAgentMessage(conversation), text);
			break;
		}
		case "tool_call":
		case "tool_call_update":
			applyToolCallUpdate(ensureAgentMessage(conversation), update);
			break;
		case "usage_update": {
			const usage = usageToTokenUsage(update);
			if (usage) {
				conversation.cumulative_token_usage = usage;
				const userId = lastUserMessageId(conversation);
				if (userId) conversation.request_token_usage[userId] = usage;
			}
			break;
		}
		case "session_info_update":
			if (hasOwn(update, "title")) conversation.title = update.title ?? null;
			if (hasOwn(update, "updatedAt")) conversation.updated_at = update.updatedAt ?? conversation.updated_at;
			break;
		case "available_commands_update":
			acpx.available_commands = update.availableCommands.map((entry) => entry.name).filter((entry) => typeof entry === "string" && entry.trim().length > 0);
			break;
		case "current_mode_update":
			acpx.current_mode_id = update.currentModeId;
			break;
		case "config_option_update":
			acpx.config_options = deepClone(update.configOptions);
			break;
		default: break;
	}
	updateConversationTimestamp(conversation, timestamp);
	trimConversationForRuntime(conversation);
	return acpx;
}
function recordClientOperation(conversation, state, operation, timestamp = isoNow$1()) {
	const acpx = ensureAcpxState$1(state);
	updateConversationTimestamp(conversation, timestamp);
	trimConversationForRuntime(conversation);
	return acpx;
}
function trimConversationForRuntime(conversation) {
	if (conversation.messages.length > MAX_RUNTIME_MESSAGES) conversation.messages = conversation.messages.slice(-MAX_RUNTIME_MESSAGES);
	for (const message of conversation.messages) {
		if (!isAgentMessage(message)) {
			if (isUserMessage(message)) message.User.content = message.User.content.map((content) => {
				if ("Text" in content) return { Text: trimRuntimeText(content.Text, MAX_RUNTIME_AGENT_TEXT_CHARS) };
				return content;
			});
			continue;
		}
		for (const content of message.Agent.content) if ("Text" in content) content.Text = trimRuntimeText(content.Text, MAX_RUNTIME_AGENT_TEXT_CHARS);
		else if ("Thinking" in content) content.Thinking.text = trimRuntimeText(content.Thinking.text, MAX_RUNTIME_THINKING_CHARS);
		else if ("ToolUse" in content) content.ToolUse.raw_input = trimRuntimeText(content.ToolUse.raw_input, MAX_RUNTIME_TOOL_IO_CHARS);
		for (const result of Object.values(message.Agent.tool_results)) {
			if ("Text" in result.content) result.content.Text = trimRuntimeText(result.content.Text, MAX_RUNTIME_TOOL_IO_CHARS);
			if (typeof result.output === "string") result.output = trimRuntimeText(result.output, MAX_RUNTIME_TOOL_IO_CHARS);
		}
	}
	const requestUsageEntries = Object.entries(conversation.request_token_usage);
	if (requestUsageEntries.length > MAX_RUNTIME_REQUEST_TOKEN_USAGE) conversation.request_token_usage = Object.fromEntries(requestUsageEntries.slice(-MAX_RUNTIME_REQUEST_TOKEN_USAGE));
}
//#endregion
//#region extensions/acpx/src/history/shared.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asTrimmedString(value) {
	return typeof value === "string" ? value.trim() : "";
}
function asString(value) {
	return typeof value === "string" ? value : void 0;
}
function asOptionalString(value) {
	return asTrimmedString(value) || void 0;
}
function asOptionalBoolean(value) {
	return typeof value === "boolean" ? value : void 0;
}
//#endregion
//#region extensions/acpx/src/history/projector.ts
const AcpxJsonObjectSchema = z.record(z.string(), z.unknown());
z.object({
	type: z.literal("error"),
	message: z.string().trim().min(1).catch("acpx reported an error"),
	code: z.string().optional(),
	retryable: z.boolean().optional()
});
function asOptionalFiniteNumber(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function resolveStructuredPromptPayload(parsed) {
	if (asTrimmedString(parsed.method) === "session/update") {
		const params = parsed.params;
		if (isRecord(params) && isRecord(params.update)) {
			const update = params.update;
			const tag = asOptionalString(update.sessionUpdate);
			return {
				type: tag ?? "",
				payload: update,
				...tag ? { tag } : {}
			};
		}
	}
	const sessionUpdate = asOptionalString(parsed.sessionUpdate);
	if (sessionUpdate) return {
		type: sessionUpdate,
		payload: parsed,
		tag: sessionUpdate
	};
	const type = asTrimmedString(parsed.type);
	const tag = asOptionalString(parsed.tag);
	return {
		type,
		payload: parsed,
		...tag ? { tag } : {}
	};
}
function resolveStatusTextForTag(params) {
	const { tag, payload } = params;
	if (tag === "available_commands_update") {
		const commands = Array.isArray(payload.availableCommands) ? payload.availableCommands : [];
		return commands.length > 0 ? `available commands updated (${commands.length})` : "available commands updated";
	}
	if (tag === "current_mode_update") {
		const mode = asTrimmedString(payload.currentModeId) || asTrimmedString(payload.modeId) || asTrimmedString(payload.mode);
		return mode ? `mode updated: ${mode}` : "mode updated";
	}
	if (tag === "config_option_update") {
		const id = asTrimmedString(payload.id) || asTrimmedString(payload.configOptionId);
		const value = asTrimmedString(payload.currentValue) || asTrimmedString(payload.value) || asTrimmedString(payload.optionValue);
		if (id && value) return `config updated: ${id}=${value}`;
		if (id) return `config updated: ${id}`;
		return "config updated";
	}
	if (tag === "session_info_update") return asTrimmedString(payload.summary) || asTrimmedString(payload.message) || "session updated";
	if (tag === "plan") {
		const content = asTrimmedString((Array.isArray(payload.entries) ? payload.entries : []).find((entry) => isRecord(entry))?.content);
		return content ? `plan: ${content}` : null;
	}
	return null;
}
function resolveTextChunk(params) {
	const contentRaw = params.payload.content;
	if (isRecord(contentRaw)) {
		const contentType = asTrimmedString(contentRaw.type);
		if (contentType && contentType !== "text") return null;
		const text = asString(contentRaw.text);
		if (text && text.length > 0) return {
			type: "text_delta",
			text,
			stream: params.stream,
			tag: params.tag
		};
	}
	const text = asString(params.payload.text);
	if (!text || text.length === 0) return null;
	return {
		type: "text_delta",
		text,
		stream: params.stream,
		tag: params.tag
	};
}
function createTextDeltaEvent(params) {
	if (params.content == null || params.content.length === 0) return null;
	return {
		type: "text_delta",
		text: params.content,
		stream: params.stream,
		...params.tag ? { tag: params.tag } : {}
	};
}
function createToolCallEvent(params) {
	const title = asTrimmedString(params.payload.title) || "tool call";
	const status = asTrimmedString(params.payload.status);
	const toolCallId = asOptionalString(params.payload.toolCallId);
	return {
		type: "tool_call",
		text: status ? `${title} (${status})` : title,
		tag: params.tag,
		...toolCallId ? { toolCallId } : {},
		...status ? { status } : {},
		title
	};
}
function parsePromptEventLine(line) {
	const trimmed = line.trim();
	if (!trimmed) return null;
	const parsed = safeParseJsonWithSchema(AcpxJsonObjectSchema, trimmed);
	if (!parsed) return {
		type: "status",
		text: trimmed
	};
	const structured = resolveStructuredPromptPayload(parsed);
	const type = structured.type;
	const payload = structured.payload;
	const tag = structured.tag;
	switch (type) {
		case "text": return createTextDeltaEvent({
			content: asString(payload.content),
			stream: "output",
			tag
		});
		case "thought": return createTextDeltaEvent({
			content: asString(payload.content),
			stream: "thought",
			tag
		});
		case "tool_call": return createToolCallEvent({
			payload,
			tag: tag ?? "tool_call"
		});
		case "tool_call_update": return createToolCallEvent({
			payload,
			tag: tag ?? "tool_call_update"
		});
		case "agent_message_chunk": return resolveTextChunk({
			payload,
			stream: "output",
			tag: "agent_message_chunk"
		});
		case "agent_thought_chunk": return resolveTextChunk({
			payload,
			stream: "thought",
			tag: "agent_thought_chunk"
		});
		case "usage_update": {
			const used = asOptionalFiniteNumber(payload.used);
			const size = asOptionalFiniteNumber(payload.size);
			return {
				type: "status",
				text: used != null && size != null ? `usage updated: ${used}/${size}` : "usage updated",
				tag: "usage_update",
				...used != null ? { used } : {},
				...size != null ? { size } : {}
			};
		}
		case "available_commands_update":
		case "current_mode_update":
		case "config_option_update":
		case "session_info_update":
		case "plan": {
			const text = resolveStatusTextForTag({
				tag: type,
				payload
			});
			if (!text) return null;
			return {
				type: "status",
				text,
				tag: type
			};
		}
		case "client_operation": {
			const text = [
				asTrimmedString(payload.method) || "operation",
				asTrimmedString(payload.status),
				asTrimmedString(payload.summary)
			].filter(Boolean).join(" ");
			if (!text) return null;
			return {
				type: "status",
				text,
				...tag ? { tag } : {}
			};
		}
		case "update": {
			const update = asTrimmedString(payload.update);
			if (!update) return null;
			return {
				type: "status",
				text: update,
				...tag ? { tag } : {}
			};
		}
		case "done": return {
			type: "done",
			stopReason: asOptionalString(payload.stopReason)
		};
		case "error": return {
			type: "error",
			message: asTrimmedString(payload.message) || "acpx runtime error",
			code: asOptionalString(payload.code),
			retryable: asOptionalBoolean(payload.retryable)
		};
		default: return null;
	}
}
//#endregion
//#region extensions/acpx/src/session/lifecycle.ts
function applyLifecycleSnapshotToRecord(record, snapshot) {
	record.pid = snapshot.pid;
	record.agentStartedAt = snapshot.startedAt;
	if (snapshot.lastExit) {
		record.lastAgentExitCode = snapshot.lastExit.exitCode;
		record.lastAgentExitSignal = snapshot.lastExit.signal;
		record.lastAgentExitAt = snapshot.lastExit.exitedAt;
		record.lastAgentDisconnectReason = snapshot.lastExit.reason;
		return;
	}
	record.lastAgentExitCode = void 0;
	record.lastAgentExitSignal = void 0;
	record.lastAgentExitAt = void 0;
	record.lastAgentDisconnectReason = void 0;
}
function reconcileAgentSessionId(record, agentSessionId) {
	const normalized = normalizeRuntimeSessionId(agentSessionId);
	if (!normalized) return;
	record.agentSessionId = normalized;
}
function sessionHasAgentMessages(record) {
	return record.messages.some((message) => typeof message === "object" && message !== null && "Agent" in message);
}
function applyConversation(record, conversation) {
	record.title = conversation.title;
	record.messages = conversation.messages;
	record.updated_at = conversation.updated_at;
	record.cumulative_token_usage = conversation.cumulative_token_usage;
	record.request_token_usage = conversation.request_token_usage;
}
//#endregion
//#region extensions/acpx/src/perf-metrics.ts
const counters = /* @__PURE__ */ new Map();
function incrementPerfCounter(name, delta = 1) {
	counters.set(name, (counters.get(name) ?? 0) + delta);
}
//#endregion
//#region extensions/acpx/src/session-mode-preference.ts
function ensureAcpxState(state) {
	return state ?? {};
}
function normalizeModeId(modeId) {
	if (typeof modeId !== "string") return;
	const trimmed = modeId.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function normalizeModelId(modelId) {
	if (typeof modelId !== "string") return;
	const trimmed = modelId.trim();
	return trimmed.length > 0 ? trimmed : void 0;
}
function getDesiredModeId(state) {
	return normalizeModeId(state?.desired_mode_id);
}
function getDesiredModelId(state) {
	return normalizeModelId(state?.session_options?.model);
}
function setCurrentModelId(record, modelId) {
	const acpx = ensureAcpxState(record.acpx);
	const normalized = normalizeModelId(modelId);
	if (normalized) acpx.current_model_id = normalized;
	else delete acpx.current_model_id;
	record.acpx = acpx;
}
function syncAdvertisedModelState(record, models) {
	if (!models) return;
	const acpx = ensureAcpxState(record.acpx);
	acpx.current_model_id = models.currentModelId;
	acpx.available_models = models.availableModels.map((model) => model.modelId);
	record.acpx = acpx;
}
//#endregion
//#region extensions/acpx/src/session/reconnect.ts
function isProcessAlive(pid) {
	if (!pid || !Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}
const SESSION_LOAD_UNSUPPORTED_CODES = new Set([-32601, -32602]);
function shouldFallbackToNewSession(error, record) {
	if (error instanceof TimeoutError || error instanceof InterruptedError) return false;
	if (isAcpResourceNotFoundError(error)) return true;
	const acp = extractAcpError(error);
	if (acp && SESSION_LOAD_UNSUPPORTED_CODES.has(acp.code)) return true;
	if (!sessionHasAgentMessages(record)) {
		if (isAcpQueryClosedBeforeResponseError(error)) return true;
		if (acp?.code === -32603) return true;
	}
	return false;
}
function requiresSameSession(resumePolicy) {
	return resumePolicy === "same-session-only";
}
function makeSessionResumeRequiredError(params) {
	return new SessionResumeRequiredError(`Persistent ACP session ${params.record.acpSessionId} could not be resumed: ${params.reason}`, { cause: params.cause instanceof Error ? params.cause : void 0 });
}
async function connectAndLoadSession(options) {
	const record = options.record;
	const client = options.client;
	const sameSessionOnly = requiresSameSession(options.resumePolicy);
	const originalSessionId = record.acpSessionId;
	const originalAgentSessionId = record.agentSessionId;
	const desiredModeId = getDesiredModeId(record.acpx);
	const desiredModelId = getDesiredModelId(record.acpx);
	const storedProcessAlive = isProcessAlive(record.pid);
	const shouldReconnect = Boolean(record.pid) && !storedProcessAlive;
	if (options.verbose) {
		if (storedProcessAlive) process.stderr.write(`[acpx] saved session pid ${record.pid} is running; reconnecting with loadSession\n`);
		else if (shouldReconnect) process.stderr.write(`[acpx] saved session pid ${record.pid} is dead; respawning agent and attempting session/load\n`);
	}
	const reusingLoadedSession = client.hasReusableSession(record.acpSessionId);
	if (reusingLoadedSession) incrementPerfCounter("runtime.connect_and_load.reused_session");
	else await withTimeout(client.start(), options.timeoutMs);
	options.onClientAvailable?.(options.activeController);
	applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
	record.closed = false;
	record.closedAt = void 0;
	options.onConnectedRecord?.(record);
	let resumed = false;
	let loadError;
	let sessionId = record.acpSessionId;
	let createdFreshSession = false;
	let pendingAgentSessionId = record.agentSessionId;
	let sessionModels;
	if (reusingLoadedSession) resumed = true;
	else if (client.supportsLoadSession()) try {
		const loadResult = await withTimeout(client.loadSessionWithOptions(record.acpSessionId, record.cwd, { suppressReplayUpdates: true }), options.timeoutMs);
		reconcileAgentSessionId(record, loadResult.agentSessionId);
		sessionModels = loadResult.models;
		resumed = true;
	} catch (error) {
		loadError = formatErrorMessage(error);
		if (sameSessionOnly) throw makeSessionResumeRequiredError({
			record,
			reason: loadError,
			cause: error
		});
		if (!shouldFallbackToNewSession(error, record)) throw error;
		const createdSession = await withTimeout(client.createSession(record.cwd), options.timeoutMs);
		sessionId = createdSession.sessionId;
		createdFreshSession = true;
		pendingAgentSessionId = createdSession.agentSessionId;
		sessionModels = createdSession.models;
	}
	else {
		if (sameSessionOnly) throw makeSessionResumeRequiredError({
			record,
			reason: "agent does not support session/load"
		});
		const createdSession = await withTimeout(client.createSession(record.cwd), options.timeoutMs);
		sessionId = createdSession.sessionId;
		createdFreshSession = true;
		pendingAgentSessionId = createdSession.agentSessionId;
		sessionModels = createdSession.models;
	}
	if (createdFreshSession && desiredModeId) try {
		await withTimeout(client.setSessionMode(sessionId, desiredModeId), options.timeoutMs);
		if (options.verbose) process.stderr.write(`[acpx] replayed desired mode ${desiredModeId} on fresh ACP session ${sessionId} (previous ${originalSessionId})\n`);
	} catch (error) {
		const message = `Failed to replay saved session mode ${desiredModeId} on fresh ACP session ${sessionId}: ` + formatErrorMessage(error);
		record.acpSessionId = originalSessionId;
		record.agentSessionId = originalAgentSessionId;
		if (options.verbose) process.stderr.write(`[acpx] ${message}\n`);
		throw new SessionModeReplayError(message, {
			cause: error instanceof Error ? error : void 0,
			retryable: true
		});
	}
	if (createdFreshSession && desiredModelId && sessionModels && desiredModelId !== sessionModels.currentModelId) try {
		await withTimeout(client.setSessionModel(sessionId, desiredModelId), options.timeoutMs);
		setCurrentModelId(record, desiredModelId);
		if (options.verbose) process.stderr.write(`[acpx] replayed desired model ${desiredModelId} on fresh ACP session ${sessionId} (previous ${originalSessionId})\n`);
	} catch (error) {
		const message = `Failed to replay saved session model ${desiredModelId} on fresh ACP session ${sessionId}: ` + formatErrorMessage(error);
		record.acpSessionId = originalSessionId;
		record.agentSessionId = originalAgentSessionId;
		if (options.verbose) process.stderr.write(`[acpx] ${message}\n`);
		throw new SessionModelReplayError(message, {
			cause: error instanceof Error ? error : void 0,
			retryable: true
		});
	}
	if (createdFreshSession) {
		record.acpSessionId = sessionId;
		reconcileAgentSessionId(record, pendingAgentSessionId);
	}
	syncAdvertisedModelState(record, sessionModels);
	if (createdFreshSession && desiredModelId && sessionModels) setCurrentModelId(record, desiredModelId);
	options.onSessionIdResolved?.(sessionId);
	return {
		sessionId,
		agentSessionId: record.agentSessionId,
		resumed,
		loadError
	};
}
//#endregion
//#region extensions/acpx/src/session/repository.ts
const SESSION_RECORD_SCHEMA = "openclaw.acpx.session.v1";
function safeSessionId(sessionId) {
	return encodeURIComponent(sessionId);
}
var SessionRepository = class {
	constructor(config) {
		this.config = config;
	}
	get sessionDir() {
		return path.join(this.config.stateDir, "sessions");
	}
	async ensureDir() {
		await fs.mkdir(this.sessionDir, { recursive: true });
	}
	filePath(sessionId) {
		return path.join(this.sessionDir, `${safeSessionId(sessionId)}.json`);
	}
	async load(sessionId) {
		try {
			const payload = await fs.readFile(this.filePath(sessionId), "utf8");
			return JSON.parse(payload);
		} catch {
			return null;
		}
	}
	async save(record) {
		await this.ensureDir();
		const target = this.filePath(record.acpxRecordId);
		const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
		await fs.writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, "utf8");
		await fs.rename(temp, target);
	}
	async close(sessionId) {
		const record = await this.load(sessionId);
		if (!record) return null;
		record.closed = true;
		record.closedAt = (/* @__PURE__ */ new Date()).toISOString();
		await this.save(record);
		return record;
	}
};
//#endregion
//#region extensions/acpx/src/session/reuse-policy.ts
function shouldReuseExistingRecord(record, params) {
	if (path.resolve(record.cwd) !== path.resolve(params.cwd)) return false;
	if (record.agentCommand !== params.agentCommand) return false;
	if (params.resumeSessionId && record.acpSessionId !== params.resumeSessionId) return false;
	return true;
}
//#endregion
//#region extensions/acpx/src/session/manager.ts
function createDeferred() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
var AsyncEventQueue = class {
	constructor() {
		this.items = [];
		this.waits = [];
		this.closed = false;
	}
	push(item) {
		if (this.closed) return;
		const waiter = this.waits.shift();
		if (waiter) {
			waiter.resolve(item);
			return;
		}
		this.items.push(item);
	}
	close() {
		if (this.closed) return;
		this.closed = true;
		for (const waiter of this.waits.splice(0)) waiter.resolve(null);
	}
	async next() {
		if (this.items.length > 0) return this.items.shift() ?? null;
		if (this.closed) return null;
		const waiter = createDeferred();
		this.waits.push(waiter);
		return await waiter.promise;
	}
	async *iterate() {
		while (true) {
			const next = await this.next();
			if (!next) return;
			yield next;
		}
	}
};
function isoNow() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function toPromptInput(text, attachments) {
	if (!attachments || attachments.length === 0) return text;
	const blocks = [];
	if (text) blocks.push({
		type: "text",
		text
	});
	for (const attachment of attachments) if (attachment.mediaType.startsWith("image/")) blocks.push({
		type: "image",
		mimeType: attachment.mediaType,
		data: attachment.data
	});
	return blocks.length > 0 ? blocks : textPrompt(text);
}
function toSdkMcpServers(config) {
	return Object.entries(config.mcpServers).map(([name, server]) => ({
		name,
		command: server.command,
		args: [...server.args ?? []],
		env: Object.entries(server.env ?? {}).map(([envName, value]) => ({
			name: envName,
			value
		}))
	}));
}
function createInitialRecord(params) {
	const now = isoNow();
	return {
		schema: SESSION_RECORD_SCHEMA,
		acpxRecordId: params.sessionKey,
		acpSessionId: params.sessionId,
		agentSessionId: params.agentSessionId,
		agentCommand: params.agentCommand,
		cwd: params.cwd,
		name: params.sessionKey,
		createdAt: now,
		lastUsedAt: now,
		lastSeq: 0,
		eventLog: {
			active_path: "",
			segment_count: 0,
			max_segment_bytes: 0,
			max_segments: 0,
			last_write_at: void 0,
			last_write_error: null
		},
		closed: false,
		closedAt: void 0,
		...createSessionConversation(now),
		acpx: {}
	};
}
function statusSummary(record) {
	return [
		`session=${record.acpxRecordId}`,
		`backendSessionId=${record.acpSessionId}`,
		record.agentSessionId ? `agentSessionId=${record.agentSessionId}` : null,
		record.pid != null ? `pid=${record.pid}` : null,
		record.closed ? "closed" : "open"
	].filter(Boolean).join(" ");
}
var SessionRuntimeManager = class {
	constructor(config) {
		this.config = config;
		this.activeControllers = /* @__PURE__ */ new Map();
		this.repository = new SessionRepository(config);
	}
	async ensureSession(input) {
		const cwd = path.resolve(input.cwd?.trim() || this.config.cwd);
		const agentCommand = resolveAgentCommand(input.agent, this.config.agents);
		const existing = await this.repository.load(input.sessionKey);
		if (existing && shouldReuseExistingRecord(existing, {
			cwd,
			agentCommand,
			resumeSessionId: input.resumeSessionId
		})) {
			existing.closed = false;
			existing.closedAt = void 0;
			await this.repository.save(existing);
			return existing;
		}
		const client = new AcpClient({
			agentCommand,
			cwd,
			mcpServers: toSdkMcpServers(this.config),
			permissionMode: this.config.permissionMode,
			nonInteractivePermissions: this.config.nonInteractivePermissions,
			verbose: false
		});
		try {
			await client.start();
			let sessionId;
			let agentSessionId;
			if (input.resumeSessionId) {
				const loaded = await client.loadSession(input.resumeSessionId, cwd);
				sessionId = input.resumeSessionId;
				agentSessionId = loaded.agentSessionId;
			} else {
				const created = await client.createSession(cwd);
				sessionId = created.sessionId;
				agentSessionId = created.agentSessionId;
			}
			const record = createInitialRecord({
				sessionKey: input.sessionKey,
				sessionId,
				agentCommand,
				cwd,
				agentSessionId
			});
			record.protocolVersion = client.initializeResult?.protocolVersion;
			record.agentCapabilities = client.initializeResult?.agentCapabilities;
			applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
			await this.repository.save(record);
			return record;
		} finally {
			await client.close();
		}
	}
	async *runTurn(input) {
		const record = await this.requireRecord(input.handle.acpxRecordId ?? input.handle.sessionKey);
		const conversation = cloneSessionConversation(record);
		let acpxState = cloneSessionAcpxState(record.acpx);
		recordPromptSubmission(conversation, toPromptInput(input.text, input.attachments), isoNow());
		trimConversationForRuntime(conversation);
		const queue = new AsyncEventQueue();
		const client = new AcpClient({
			agentCommand: record.agentCommand,
			cwd: record.cwd,
			mcpServers: toSdkMcpServers(this.config),
			permissionMode: this.config.permissionMode,
			nonInteractivePermissions: this.config.nonInteractivePermissions,
			verbose: false
		});
		let activeSessionId = record.acpSessionId;
		let sawDone = false;
		const activeController = {
			hasActivePrompt: () => client.hasActivePrompt(),
			requestCancelActivePrompt: async () => await client.requestCancelActivePrompt(),
			setSessionMode: async (modeId) => {
				await client.setSessionMode(activeSessionId, modeId);
			},
			setSessionConfigOption: async (configId, value) => {
				await client.setSessionConfigOption(activeSessionId, configId, value);
			}
		};
		const emitParsed = (payload) => {
			const parsed = parsePromptEventLine(JSON.stringify(payload));
			if (!parsed) return;
			if (parsed.type === "done") sawDone = true;
			queue.push(parsed);
		};
		const abortHandler = () => {
			activeController.requestCancelActivePrompt();
		};
		if (input.signal) {
			if (input.signal.aborted) {
				queue.close();
				return;
			}
			input.signal.addEventListener("abort", abortHandler, { once: true });
		}
		this.activeControllers.set(record.acpxRecordId, activeController);
		(async () => {
			try {
				client.setEventHandlers({
					onSessionUpdate: (notification) => {
						acpxState = recordSessionUpdate(conversation, acpxState, notification);
						trimConversationForRuntime(conversation);
						emitParsed({
							jsonrpc: "2.0",
							method: "session/update",
							params: notification
						});
					},
					onClientOperation: (operation) => {
						acpxState = recordClientOperation(conversation, acpxState, operation);
						trimConversationForRuntime(conversation);
						emitParsed({
							type: "client_operation",
							...operation
						});
					}
				});
				const { sessionId, resumed, loadError } = await connectAndLoadSession({
					client,
					record,
					resumePolicy: "allow-new",
					timeoutMs: this.timeoutMs,
					activeController,
					onClientAvailable: (controller) => {
						this.activeControllers.set(record.acpxRecordId, controller);
					},
					onConnectedRecord: (connectedRecord) => {
						connectedRecord.lastPromptAt = isoNow();
					},
					onSessionIdResolved: (sessionIdValue) => {
						activeSessionId = sessionIdValue;
					}
				});
				record.lastRequestId = input.requestId;
				record.lastPromptAt = isoNow();
				record.closed = false;
				record.closedAt = void 0;
				record.lastUsedAt = isoNow();
				if (resumed || loadError) emitParsed({
					type: "status",
					text: loadError ? `load fallback: ${loadError}` : "session resumed"
				});
				const response = await withTimeout(client.prompt(sessionId, toPromptInput(input.text, input.attachments)), this.timeoutMs);
				record.acpSessionId = activeSessionId;
				reconcileAgentSessionId(record, record.agentSessionId);
				record.protocolVersion = client.initializeResult?.protocolVersion;
				record.agentCapabilities = client.initializeResult?.agentCapabilities;
				record.acpx = acpxState;
				applyConversation(record, conversation);
				applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
				await this.repository.save(record);
				if (!sawDone) queue.push({
					type: "done",
					stopReason: response.stopReason
				});
			} catch (error) {
				const normalized = normalizeOutputError(error, { origin: "runtime" });
				queue.push({
					type: "error",
					message: normalized.message,
					code: normalized.code,
					retryable: normalized.retryable
				});
			} finally {
				if (input.signal) input.signal.removeEventListener("abort", abortHandler);
				this.activeControllers.delete(record.acpxRecordId);
				client.clearEventHandlers();
				applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
				record.acpx = acpxState;
				applyConversation(record, conversation);
				record.lastUsedAt = isoNow();
				await this.repository.save(record).catch(() => {});
				await client.close().catch(() => {});
				queue.close();
			}
		})();
		yield* queue.iterate();
	}
	async getStatus(handle) {
		const record = await this.requireRecord(handle.acpxRecordId ?? handle.sessionKey);
		return {
			summary: statusSummary(record),
			acpxRecordId: record.acpxRecordId,
			backendSessionId: record.acpSessionId,
			agentSessionId: record.agentSessionId,
			details: {
				cwd: record.cwd,
				lastUsedAt: record.lastUsedAt,
				closed: record.closed === true
			}
		};
	}
	async setMode(handle, mode) {
		const record = await this.requireRecord(handle.acpxRecordId ?? handle.sessionKey);
		const controller = this.activeControllers.get(record.acpxRecordId);
		if (controller) await controller.setSessionMode(mode);
		else {
			const client = new AcpClient({
				agentCommand: record.agentCommand,
				cwd: record.cwd,
				mcpServers: toSdkMcpServers(this.config),
				permissionMode: this.config.permissionMode,
				nonInteractivePermissions: this.config.nonInteractivePermissions,
				verbose: false
			});
			try {
				await client.start();
				const { sessionId } = await connectAndLoadSession({
					client,
					record,
					timeoutMs: this.timeoutMs,
					activeController: {
						hasActivePrompt: () => false,
						requestCancelActivePrompt: async () => false,
						setSessionMode: async () => {},
						setSessionConfigOption: async () => {}
					}
				});
				await client.setSessionMode(sessionId, mode);
			} finally {
				applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
				await this.repository.save(record).catch(() => {});
				await client.close();
			}
		}
		record.acpx = {
			...record.acpx ?? {},
			desired_mode_id: mode
		};
		await this.repository.save(record);
	}
	async setConfigOption(handle, key, value) {
		const record = await this.requireRecord(handle.acpxRecordId ?? handle.sessionKey);
		const controller = this.activeControllers.get(record.acpxRecordId);
		if (controller) await controller.setSessionConfigOption(key, value);
		else {
			const client = new AcpClient({
				agentCommand: record.agentCommand,
				cwd: record.cwd,
				mcpServers: toSdkMcpServers(this.config),
				permissionMode: this.config.permissionMode,
				nonInteractivePermissions: this.config.nonInteractivePermissions,
				verbose: false
			});
			try {
				await client.start();
				const { sessionId } = await connectAndLoadSession({
					client,
					record,
					timeoutMs: this.timeoutMs,
					activeController: {
						hasActivePrompt: () => false,
						requestCancelActivePrompt: async () => false,
						setSessionMode: async () => {},
						setSessionConfigOption: async () => {}
					}
				});
				await client.setSessionConfigOption(sessionId, key, value);
			} finally {
				applyLifecycleSnapshotToRecord(record, client.getAgentLifecycleSnapshot());
				await this.repository.save(record).catch(() => {});
				await client.close();
			}
		}
		await this.repository.save(record);
	}
	async cancel(handle) {
		await this.activeControllers.get(handle.acpxRecordId ?? handle.sessionKey)?.requestCancelActivePrompt();
	}
	async close(handle) {
		const record = await this.requireRecord(handle.acpxRecordId ?? handle.sessionKey);
		await this.cancel(handle);
		record.closed = true;
		record.closedAt = isoNow();
		await this.repository.save(record);
	}
	get timeoutMs() {
		return this.config.timeoutSeconds != null ? this.config.timeoutSeconds * 1e3 : void 0;
	}
	async requireRecord(sessionId) {
		const record = await this.repository.load(sessionId);
		if (!record) throw new Error(`ACP session not found: ${sessionId}`);
		return record;
	}
};
//#endregion
export { SessionRuntimeManager };
