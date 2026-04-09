import { n as resolveProviderRequestCapabilities } from "./provider-attribution-DFA_ceCj.js";
//#region src/agents/prompt-cache-stability.ts
function normalizeStructuredPromptSection(text) {
	return text.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
function normalizePromptCapabilityIds(capabilities) {
	const seen = /* @__PURE__ */ new Set();
	const normalized = [];
	for (const capability of capabilities) {
		const value = normalizeStructuredPromptSection(capability).toLowerCase();
		if (!value || seen.has(value)) continue;
		seen.add(value);
		normalized.push(value);
	}
	return normalized.toSorted((left, right) => left.localeCompare(right));
}
//#endregion
//#region src/agents/system-prompt-cache-boundary.ts
const SYSTEM_PROMPT_CACHE_BOUNDARY = "\n<!-- OPENCLAW_CACHE_BOUNDARY -->\n";
function stripSystemPromptCacheBoundary(text) {
	return text.replaceAll(SYSTEM_PROMPT_CACHE_BOUNDARY, "\n");
}
function splitSystemPromptCacheBoundary(text) {
	const boundaryIndex = text.indexOf(SYSTEM_PROMPT_CACHE_BOUNDARY);
	if (boundaryIndex === -1) return;
	return {
		stablePrefix: text.slice(0, boundaryIndex).trimEnd(),
		dynamicSuffix: text.slice(boundaryIndex + 34).trimStart()
	};
}
function prependSystemPromptAdditionAfterCacheBoundary(params) {
	const systemPromptAddition = typeof params.systemPromptAddition === "string" ? normalizeStructuredPromptSection(params.systemPromptAddition) : "";
	if (!systemPromptAddition) return params.systemPrompt;
	const split = splitSystemPromptCacheBoundary(params.systemPrompt);
	if (!split) return `${systemPromptAddition}\n\n${params.systemPrompt}`;
	const dynamicSuffix = split.dynamicSuffix ? normalizeStructuredPromptSection(split.dynamicSuffix) : "";
	if (!dynamicSuffix) return `${split.stablePrefix}${SYSTEM_PROMPT_CACHE_BOUNDARY}${systemPromptAddition}`;
	return `${split.stablePrefix}${SYSTEM_PROMPT_CACHE_BOUNDARY}${systemPromptAddition}\n\n${dynamicSuffix}`;
}
//#endregion
//#region src/agents/anthropic-payload-policy.ts
function resolveBaseUrlHostname(baseUrl) {
	try {
		return new URL(baseUrl).hostname;
	} catch {
		return;
	}
}
function isLongTtlEligibleEndpoint(baseUrl) {
	if (typeof baseUrl !== "string") return false;
	const hostname = resolveBaseUrlHostname(baseUrl);
	if (!hostname) return false;
	return hostname === "api.anthropic.com" || hostname === "aiplatform.googleapis.com" || hostname.endsWith("-aiplatform.googleapis.com");
}
function resolveAnthropicEphemeralCacheControl(baseUrl, cacheRetention) {
	const retention = cacheRetention ?? (process.env.PI_CACHE_RETENTION === "long" ? "long" : "short");
	if (retention === "none") return;
	const ttl = retention === "long" && isLongTtlEligibleEndpoint(baseUrl) ? "1h" : void 0;
	return {
		type: "ephemeral",
		...ttl ? { ttl } : {}
	};
}
function applyAnthropicCacheControlToSystem(system, cacheControl) {
	if (!Array.isArray(system)) return;
	const normalizedBlocks = [];
	for (const block of system) {
		if (!block || typeof block !== "object") {
			normalizedBlocks.push(block);
			continue;
		}
		const record = block;
		if (record.type !== "text" || typeof record.text !== "string") {
			normalizedBlocks.push(block);
			continue;
		}
		const split = splitSystemPromptCacheBoundary(record.text);
		if (!split) {
			if (record.cache_control === void 0) record.cache_control = cacheControl;
			normalizedBlocks.push(record);
			continue;
		}
		const { cache_control: existingCacheControl, ...rest } = record;
		if (split.stablePrefix) normalizedBlocks.push({
			...rest,
			text: split.stablePrefix,
			cache_control: existingCacheControl ?? cacheControl
		});
		if (split.dynamicSuffix) normalizedBlocks.push({
			...rest,
			text: split.dynamicSuffix
		});
	}
	system.splice(0, system.length, ...normalizedBlocks);
}
function stripAnthropicSystemPromptBoundary(system) {
	if (!Array.isArray(system)) return;
	for (const block of system) {
		if (!block || typeof block !== "object") continue;
		const record = block;
		if (record.type === "text" && typeof record.text === "string") record.text = stripSystemPromptCacheBoundary(record.text);
	}
}
function applyAnthropicCacheControlToMessages(messages, cacheControl) {
	if (!Array.isArray(messages) || messages.length === 0) return;
	const lastMessage = messages[messages.length - 1];
	if (!lastMessage || typeof lastMessage !== "object") return;
	const record = lastMessage;
	if (record.role !== "user") return;
	const content = record.content;
	if (Array.isArray(content)) {
		const lastBlock = content[content.length - 1];
		if (!lastBlock || typeof lastBlock !== "object") return;
		const lastBlockRecord = lastBlock;
		if (lastBlockRecord.type === "text" || lastBlockRecord.type === "image" || lastBlockRecord.type === "tool_result") lastBlockRecord.cache_control = cacheControl;
		return;
	}
	if (typeof content === "string") record.content = [{
		type: "text",
		text: content,
		cache_control: cacheControl
	}];
}
function resolveAnthropicPayloadPolicy(input) {
	return {
		allowsServiceTier: resolveProviderRequestCapabilities({
			provider: input.provider,
			api: input.api,
			baseUrl: input.baseUrl,
			capability: "llm",
			transport: "stream"
		}).allowsAnthropicServiceTier,
		cacheControl: input.enableCacheControl === true ? resolveAnthropicEphemeralCacheControl(input.baseUrl, input.cacheRetention) : void 0,
		serviceTier: input.serviceTier
	};
}
function applyAnthropicPayloadPolicyToParams(payloadObj, policy) {
	if (policy.allowsServiceTier && policy.serviceTier !== void 0 && payloadObj.service_tier === void 0) payloadObj.service_tier = policy.serviceTier;
	if (policy.cacheControl) applyAnthropicCacheControlToSystem(payloadObj.system, policy.cacheControl);
	else stripAnthropicSystemPromptBoundary(payloadObj.system);
	if (!policy.cacheControl) return;
	applyAnthropicCacheControlToMessages(payloadObj.messages, policy.cacheControl);
}
function applyAnthropicEphemeralCacheControlMarkers(payloadObj) {
	const messages = payloadObj.messages;
	if (!Array.isArray(messages)) return;
	for (const message of messages) {
		if (message.role === "system" || message.role === "developer") {
			if (typeof message.content === "string") {
				message.content = [{
					type: "text",
					text: message.content,
					cache_control: { type: "ephemeral" }
				}];
				continue;
			}
			if (Array.isArray(message.content) && message.content.length > 0) {
				const last = message.content[message.content.length - 1];
				if (last && typeof last === "object") {
					const record = last;
					if (record.type !== "thinking" && record.type !== "redacted_thinking") record.cache_control = { type: "ephemeral" };
				}
			}
			continue;
		}
		if (message.role === "assistant" && Array.isArray(message.content)) for (const block of message.content) {
			if (!block || typeof block !== "object") continue;
			const record = block;
			if (record.type === "thinking" || record.type === "redacted_thinking") delete record.cache_control;
		}
	}
}
//#endregion
export { prependSystemPromptAdditionAfterCacheBoundary as a, normalizeStructuredPromptSection as c, SYSTEM_PROMPT_CACHE_BOUNDARY as i, applyAnthropicPayloadPolicyToParams as n, stripSystemPromptCacheBoundary as o, resolveAnthropicPayloadPolicy as r, normalizePromptCapabilityIds as s, applyAnthropicEphemeralCacheControlMarkers as t };
