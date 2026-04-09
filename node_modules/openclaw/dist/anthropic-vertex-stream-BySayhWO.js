import { a as normalizeAnyChannelId } from "./registry-DldQsVOb.js";
import { n as resolveProviderRequestCapabilities } from "./provider-attribution-DFA_ceCj.js";
import { o as resolveUnsupportedToolSchemaKeywords, s as detectOpenAICompletionsCompat } from "./provider-model-compat-ddK_un1r.js";
import { n as listChannelPlugins, t as getChannelPlugin } from "./registry-Bol_V2Fp.js";
import "./plugins-wZ5d6YSY.js";
import { L as resolveProviderTransportTurnStateWithPlugin, P as resolveProviderStreamFn } from "./provider-runtime-SgdEL2pb.js";
import { a as loadBundledPluginPublicSurfaceModuleSync } from "./facade-runtime-Bv3MxT2V.js";
import { n as fetchWithSsrFGuard } from "./fetch-guard-Bl48brXk.js";
import { o as resolveMessageActionDiscoveryChannelId, r as createMessageActionDiscoveryContext, s as resolveMessageActionDiscoveryForPlugin } from "./message-action-discovery-RDjl5Hph.js";
import { t as copyPluginToolMeta } from "./tools-l2IKeN5J.js";
import { c as resolveProviderRequestPolicyConfig, i as getModelProviderRequestTransport, n as buildProviderRequestDispatcherPolicy } from "./provider-request-config-BRDGCVdB.js";
import { n as resolveOpenAIResponsesPayloadPolicy, t as applyOpenAIResponsesPayloadPolicy } from "./openai-responses-payload-policy-C5Rt0hKh.js";
import { n as applyAnthropicPayloadPolicyToParams, o as stripSystemPromptCacheBoundary, r as resolveAnthropicPayloadPolicy } from "./anthropic-payload-policy-DdUEVGSh.js";
import { p as cleanSchemaForGemini, u as stripUnsupportedSchemaKeywords } from "./provider-tools-CSRWZ4nU.js";
import { r as hasCopilotVisionInput, t as buildCopilotDynamicHeaders } from "./copilot-dynamic-headers-BocFCAcC.js";
import { t as parseGeminiAuth } from "./gemini-auth-DVcTK8JJ.js";
import { n as normalizeGoogleApiBaseUrl } from "./google-api-base-url-DQpGB4Lb.js";
import { calculateCost, createAssistantMessageEventStream, getApiProvider, getEnvApiKey, parseStreamingJson, registerApiProvider, streamAnthropic } from "@mariozechner/pi-ai";
import { randomUUID } from "node:crypto";
import { convertMessages } from "@mariozechner/pi-ai/openai-completions";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
//#region src/agents/channel-tools.ts
const channelAgentToolMeta = /* @__PURE__ */ new WeakMap();
function getChannelAgentToolMeta(tool) {
	return channelAgentToolMeta.get(tool);
}
function copyChannelAgentToolMeta(source, target) {
	const meta = channelAgentToolMeta.get(source);
	if (meta) channelAgentToolMeta.set(target, meta);
}
/**
* Get the list of supported message actions for a specific channel.
* Returns an empty array if channel is not found or has no actions configured.
*/
function listChannelSupportedActions(params) {
	const channelId = resolveMessageActionDiscoveryChannelId(params.channel);
	if (!channelId) return [];
	const plugin = getChannelPlugin(channelId);
	if (!plugin?.actions) return [];
	return resolveMessageActionDiscoveryForPlugin({
		pluginId: plugin.id,
		actions: plugin.actions,
		context: createMessageActionDiscoveryContext(params),
		includeActions: true
	}).actions;
}
function listChannelAgentTools(params) {
	const tools = [];
	for (const plugin of listChannelPlugins()) {
		const entry = plugin.agentTools;
		if (!entry) continue;
		const resolved = typeof entry === "function" ? entry(params) : entry;
		if (Array.isArray(resolved)) {
			for (const tool of resolved) channelAgentToolMeta.set(tool, { channelId: plugin.id });
			tools.push(...resolved);
		}
	}
	return tools;
}
function resolveChannelMessageToolHints(params) {
	const channelId = normalizeAnyChannelId(params.channel);
	if (!channelId) return [];
	const resolve = getChannelPlugin(channelId)?.agentPrompt?.messageToolHints;
	if (!resolve) return [];
	return (resolve({
		cfg: params.cfg ?? {},
		accountId: params.accountId
	}) ?? []).map((entry) => entry.trim()).filter(Boolean);
}
function resolveChannelMessageToolCapabilities(params) {
	const channelId = normalizeAnyChannelId(params.channel);
	if (!channelId) return [];
	const resolve = getChannelPlugin(channelId)?.agentPrompt?.messageToolCapabilities;
	if (!resolve) return [];
	return (resolve({
		cfg: params.cfg ?? {},
		accountId: params.accountId
	}) ?? []).map((entry) => entry.trim()).filter(Boolean);
}
function resolveChannelReactionGuidance(params) {
	const channelId = normalizeAnyChannelId(params.channel);
	if (!channelId) return;
	const resolve = getChannelPlugin(channelId)?.agentPrompt?.reactionGuidance;
	if (!resolve) return;
	const resolved = resolve({
		cfg: params.cfg ?? {},
		accountId: params.accountId
	});
	if (!resolved?.level) return;
	return {
		level: resolved.level,
		channel: resolved.channelLabel?.trim() || channelId
	};
}
//#endregion
//#region src/agents/pi-tools.schema.ts
function extractEnumValues(schema) {
	if (!schema || typeof schema !== "object") return;
	const record = schema;
	if (Array.isArray(record.enum)) return record.enum;
	if ("const" in record) return [record.const];
	const variants = Array.isArray(record.anyOf) ? record.anyOf : Array.isArray(record.oneOf) ? record.oneOf : null;
	if (variants) {
		const values = variants.flatMap((variant) => {
			return extractEnumValues(variant) ?? [];
		});
		return values.length > 0 ? values : void 0;
	}
}
function mergePropertySchemas(existing, incoming) {
	if (!existing) return incoming;
	if (!incoming) return existing;
	const existingEnum = extractEnumValues(existing);
	const incomingEnum = extractEnumValues(incoming);
	if (existingEnum || incomingEnum) {
		const values = Array.from(new Set([...existingEnum ?? [], ...incomingEnum ?? []]));
		const merged = {};
		for (const source of [existing, incoming]) {
			if (!source || typeof source !== "object") continue;
			const record = source;
			for (const key of [
				"title",
				"description",
				"default"
			]) if (!(key in merged) && key in record) merged[key] = record[key];
		}
		const types = new Set(values.map((value) => typeof value));
		if (types.size === 1) merged.type = Array.from(types)[0];
		merged.enum = values;
		return merged;
	}
	return existing;
}
function hasTopLevelArrayKeyword(schemaRecord, key) {
	return Array.isArray(schemaRecord[key]);
}
function getFlattenableVariantKey(schemaRecord) {
	if (hasTopLevelArrayKeyword(schemaRecord, "anyOf")) return "anyOf";
	if (hasTopLevelArrayKeyword(schemaRecord, "oneOf")) return "oneOf";
	return null;
}
function getTopLevelConditionalKey(schemaRecord) {
	return getFlattenableVariantKey(schemaRecord) ?? (hasTopLevelArrayKeyword(schemaRecord, "allOf") ? "allOf" : null);
}
function hasTopLevelObjectSchema(schemaRecord, conditionalKey) {
	return "type" in schemaRecord && "properties" in schemaRecord && conditionalKey === null;
}
function isObjectLikeSchemaMissingType(schemaRecord, conditionalKey) {
	return !("type" in schemaRecord) && (typeof schemaRecord.properties === "object" || Array.isArray(schemaRecord.required)) && conditionalKey === null;
}
function isTypedSchemaMissingProperties(schemaRecord, conditionalKey) {
	return "type" in schemaRecord && !("properties" in schemaRecord) && conditionalKey === null;
}
function isTrulyEmptySchema(schemaRecord) {
	return Object.keys(schemaRecord).length === 0;
}
function normalizeToolParameterSchema(schema, options) {
	const schemaRecord = schema && typeof schema === "object" ? schema : void 0;
	if (!schemaRecord) return schema;
	const isGeminiProvider = options?.modelProvider?.toLowerCase().includes("google") || options?.modelProvider?.toLowerCase().includes("gemini");
	const isAnthropicProvider = options?.modelProvider?.toLowerCase().includes("anthropic");
	const unsupportedToolSchemaKeywords = resolveUnsupportedToolSchemaKeywords(options?.modelCompat);
	function applyProviderCleaning(s) {
		if (isGeminiProvider && !isAnthropicProvider) return cleanSchemaForGemini(s);
		if (unsupportedToolSchemaKeywords.size > 0) return stripUnsupportedSchemaKeywords(s, unsupportedToolSchemaKeywords);
		return s;
	}
	const conditionalKey = getTopLevelConditionalKey(schemaRecord);
	const flattenableVariantKey = getFlattenableVariantKey(schemaRecord);
	if (hasTopLevelObjectSchema(schemaRecord, conditionalKey)) return applyProviderCleaning(schemaRecord);
	if (isObjectLikeSchemaMissingType(schemaRecord, conditionalKey)) return applyProviderCleaning({
		...schemaRecord,
		type: "object"
	});
	if (isTypedSchemaMissingProperties(schemaRecord, conditionalKey)) return applyProviderCleaning({
		...schemaRecord,
		properties: {}
	});
	if (!flattenableVariantKey) {
		if (isTrulyEmptySchema(schemaRecord)) return applyProviderCleaning({
			type: "object",
			properties: {}
		});
		if (conditionalKey === "allOf") return schema;
		return schema;
	}
	const variants = schemaRecord[flattenableVariantKey];
	const mergedProperties = {};
	const requiredCounts = /* @__PURE__ */ new Map();
	let objectVariants = 0;
	for (const entry of variants) {
		if (!entry || typeof entry !== "object") continue;
		const props = entry.properties;
		if (!props || typeof props !== "object") continue;
		objectVariants += 1;
		for (const [key, value] of Object.entries(props)) {
			if (!(key in mergedProperties)) {
				mergedProperties[key] = value;
				continue;
			}
			mergedProperties[key] = mergePropertySchemas(mergedProperties[key], value);
		}
		const required = Array.isArray(entry.required) ? entry.required : [];
		for (const key of required) {
			if (typeof key !== "string") continue;
			requiredCounts.set(key, (requiredCounts.get(key) ?? 0) + 1);
		}
	}
	const baseRequired = Array.isArray(schemaRecord.required) ? schemaRecord.required.filter((key) => typeof key === "string") : void 0;
	const mergedRequired = baseRequired && baseRequired.length > 0 ? baseRequired : objectVariants > 0 ? Array.from(requiredCounts.entries()).filter(([, count]) => count === objectVariants).map(([key]) => key) : void 0;
	const nextSchema = { ...schemaRecord };
	return applyProviderCleaning({
		type: "object",
		...typeof nextSchema.title === "string" ? { title: nextSchema.title } : {},
		...typeof nextSchema.description === "string" ? { description: nextSchema.description } : {},
		properties: Object.keys(mergedProperties).length > 0 ? mergedProperties : schemaRecord.properties ?? {},
		...mergedRequired && mergedRequired.length > 0 ? { required: mergedRequired } : {},
		additionalProperties: "additionalProperties" in schemaRecord ? schemaRecord.additionalProperties : true
	});
}
function normalizeToolParameters(tool, options) {
	function preserveToolMeta(target) {
		copyPluginToolMeta(tool, target);
		copyChannelAgentToolMeta(tool, target);
		return target;
	}
	const schema = tool.parameters && typeof tool.parameters === "object" ? tool.parameters : void 0;
	if (!schema) return tool;
	return preserveToolMeta({
		...tool,
		parameters: normalizeToolParameterSchema(schema, options)
	});
}
//#endregion
//#region src/agents/custom-api-registry.ts
const CUSTOM_API_SOURCE_PREFIX = "openclaw-custom-api:";
function getCustomApiRegistrySourceId(api) {
	return `${CUSTOM_API_SOURCE_PREFIX}${api}`;
}
function ensureCustomApiRegistered(api, streamFn) {
	if (getApiProvider(api)) return false;
	registerApiProvider({
		api,
		stream: (model, context, options) => streamFn(model, context, options),
		streamSimple: (model, context, options) => streamFn(model, context, options)
	}, getCustomApiRegistrySourceId(api));
	return true;
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/tslib.mjs
function __classPrivateFieldSet$1(receiver, state, value, kind, f) {
	if (kind === "m") throw new TypeError("Private method is not writable");
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
	return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet$1(receiver, state, kind, f) {
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
	return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/uuid.mjs
/**
* https://stackoverflow.com/a/2117523
*/
let uuid4$1 = function() {
	const { crypto } = globalThis;
	if (crypto?.randomUUID) {
		uuid4$1 = crypto.randomUUID.bind(crypto);
		return crypto.randomUUID();
	}
	const u8 = new Uint8Array(1);
	const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/errors.mjs
function isAbortError$1(err) {
	return typeof err === "object" && err !== null && ("name" in err && err.name === "AbortError" || "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
const castToError$1 = (err) => {
	if (err instanceof Error) return err;
	if (typeof err === "object" && err !== null) {
		try {
			if (Object.prototype.toString.call(err) === "[object Error]") {
				const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
				if (err.stack) error.stack = err.stack;
				if (err.cause && !error.cause) error.cause = err.cause;
				if (err.name) error.name = err.name;
				return error;
			}
		} catch {}
		try {
			return new Error(JSON.stringify(err));
		} catch {}
	}
	return new Error(err);
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/core/error.mjs
var AnthropicError = class extends Error {};
var APIError$1 = class APIError$1 extends AnthropicError {
	constructor(status, error, message, headers, type) {
		super(`${APIError$1.makeMessage(status, error, message)}`);
		this.status = status;
		this.headers = headers;
		this.requestID = headers?.get("request-id");
		this.error = error;
		this.type = type ?? null;
	}
	static makeMessage(status, error, message) {
		const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
		if (status && msg) return `${status} ${msg}`;
		if (status) return `${status} status code (no body)`;
		if (msg) return msg;
		return "(no status code or body)";
	}
	static generate(status, errorResponse, message, headers) {
		if (!status || !headers) return new APIConnectionError$1({
			message,
			cause: castToError$1(errorResponse)
		});
		const error = errorResponse;
		const type = error?.["error"]?.["type"];
		if (status === 400) return new BadRequestError$1(status, error, message, headers, type);
		if (status === 401) return new AuthenticationError$1(status, error, message, headers, type);
		if (status === 403) return new PermissionDeniedError$1(status, error, message, headers, type);
		if (status === 404) return new NotFoundError$1(status, error, message, headers, type);
		if (status === 409) return new ConflictError$1(status, error, message, headers, type);
		if (status === 422) return new UnprocessableEntityError$1(status, error, message, headers, type);
		if (status === 429) return new RateLimitError$1(status, error, message, headers, type);
		if (status >= 500) return new InternalServerError$1(status, error, message, headers, type);
		return new APIError$1(status, error, message, headers, type);
	}
};
var APIUserAbortError$1 = class extends APIError$1 {
	constructor({ message } = {}) {
		super(void 0, void 0, message || "Request was aborted.", void 0);
	}
};
var APIConnectionError$1 = class extends APIError$1 {
	constructor({ message, cause }) {
		super(void 0, void 0, message || "Connection error.", void 0);
		if (cause) this.cause = cause;
	}
};
var APIConnectionTimeoutError$1 = class extends APIConnectionError$1 {
	constructor({ message } = {}) {
		super({ message: message ?? "Request timed out." });
	}
};
var BadRequestError$1 = class extends APIError$1 {};
var AuthenticationError$1 = class extends APIError$1 {};
var PermissionDeniedError$1 = class extends APIError$1 {};
var NotFoundError$1 = class extends APIError$1 {};
var ConflictError$1 = class extends APIError$1 {};
var UnprocessableEntityError$1 = class extends APIError$1 {};
var RateLimitError$1 = class extends APIError$1 {};
var InternalServerError$1 = class extends APIError$1 {};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/values.mjs
const startsWithSchemeRegexp$1 = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL$1 = (url) => {
	return startsWithSchemeRegexp$1.test(url);
};
let isArray$1 = (val) => (isArray$1 = Array.isArray, isArray$1(val));
let isReadonlyArray$1 = isArray$1;
/** Returns an object if the given value isn't an object, otherwise returns as-is */
function maybeObj$1(x) {
	if (typeof x !== "object") return {};
	return x ?? {};
}
function isEmptyObj$1(obj) {
	if (!obj) return true;
	for (const _k in obj) return false;
	return true;
}
function hasOwn$1(obj, key) {
	return Object.prototype.hasOwnProperty.call(obj, key);
}
const validatePositiveInteger$1 = (name, n) => {
	if (typeof n !== "number" || !Number.isInteger(n)) throw new AnthropicError(`${name} must be an integer`);
	if (n < 0) throw new AnthropicError(`${name} must be a positive integer`);
	return n;
};
const safeJSON$1 = (text) => {
	try {
		return JSON.parse(text);
	} catch (err) {
		return;
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/sleep.mjs
const sleep$1 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//#endregion
//#region node_modules/@anthropic-ai/sdk/version.mjs
const VERSION$1 = "0.81.0";
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/detect-platform.mjs
const isRunningInBrowser$1 = () => {
	return typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
};
/**
* Note this does not detect 'browser'; for that, use getBrowserInfo().
*/
function getDetectedPlatform$1() {
	if (typeof Deno !== "undefined" && Deno.build != null) return "deno";
	if (typeof EdgeRuntime !== "undefined") return "edge";
	if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") return "node";
	return "unknown";
}
const getPlatformProperties$1 = () => {
	const detectedPlatform = getDetectedPlatform$1();
	if (detectedPlatform === "deno") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION$1,
		"X-Stainless-OS": normalizePlatform$1(Deno.build.os),
		"X-Stainless-Arch": normalizeArch$1(Deno.build.arch),
		"X-Stainless-Runtime": "deno",
		"X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
	};
	if (typeof EdgeRuntime !== "undefined") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION$1,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": `other:${EdgeRuntime}`,
		"X-Stainless-Runtime": "edge",
		"X-Stainless-Runtime-Version": globalThis.process.version
	};
	if (detectedPlatform === "node") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION$1,
		"X-Stainless-OS": normalizePlatform$1(globalThis.process.platform ?? "unknown"),
		"X-Stainless-Arch": normalizeArch$1(globalThis.process.arch ?? "unknown"),
		"X-Stainless-Runtime": "node",
		"X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
	};
	const browserInfo = getBrowserInfo$1();
	if (browserInfo) return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION$1,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": `browser:${browserInfo.browser}`,
		"X-Stainless-Runtime-Version": browserInfo.version
	};
	return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION$1,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": "unknown",
		"X-Stainless-Runtime-Version": "unknown"
	};
};
function getBrowserInfo$1() {
	if (typeof navigator === "undefined" || !navigator) return null;
	for (const { key, pattern } of [
		{
			key: "edge",
			pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "chrome",
			pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "firefox",
			pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "safari",
			pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
		}
	]) {
		const match = pattern.exec(navigator.userAgent);
		if (match) return {
			browser: key,
			version: `${match[1] || 0}.${match[2] || 0}.${match[3] || 0}`
		};
	}
	return null;
}
const normalizeArch$1 = (arch) => {
	if (arch === "x32") return "x32";
	if (arch === "x86_64" || arch === "x64") return "x64";
	if (arch === "arm") return "arm";
	if (arch === "aarch64" || arch === "arm64") return "arm64";
	if (arch) return `other:${arch}`;
	return "unknown";
};
const normalizePlatform$1 = (platform) => {
	platform = platform.toLowerCase();
	if (platform.includes("ios")) return "iOS";
	if (platform === "android") return "Android";
	if (platform === "darwin") return "MacOS";
	if (platform === "win32") return "Windows";
	if (platform === "freebsd") return "FreeBSD";
	if (platform === "openbsd") return "OpenBSD";
	if (platform === "linux") return "Linux";
	if (platform) return `Other:${platform}`;
	return "Unknown";
};
let _platformHeaders$1;
const getPlatformHeaders$1 = () => {
	return _platformHeaders$1 ?? (_platformHeaders$1 = getPlatformProperties$1());
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/shims.mjs
function getDefaultFetch$1() {
	if (typeof fetch !== "undefined") return fetch;
	throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream$1(...args) {
	const ReadableStream = globalThis.ReadableStream;
	if (typeof ReadableStream === "undefined") throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
	return new ReadableStream(...args);
}
function ReadableStreamFrom$1(iterable) {
	let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
	return makeReadableStream$1({
		start() {},
		async pull(controller) {
			const { done, value } = await iter.next();
			if (done) controller.close();
			else controller.enqueue(value);
		},
		async cancel() {
			await iter.return?.();
		}
	});
}
/**
* Most browsers don't yet have async iterable support for ReadableStream,
* and Node has a very different way of reading bytes from its "ReadableStream".
*
* This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
*/
function ReadableStreamToAsyncIterable$1(stream) {
	if (stream[Symbol.asyncIterator]) return stream;
	const reader = stream.getReader();
	return {
		async next() {
			try {
				const result = await reader.read();
				if (result?.done) reader.releaseLock();
				return result;
			} catch (e) {
				reader.releaseLock();
				throw e;
			}
		},
		async return() {
			const cancelPromise = reader.cancel();
			reader.releaseLock();
			await cancelPromise;
			return {
				done: true,
				value: void 0
			};
		},
		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
/**
* Cancels a ReadableStream we don't need to consume.
* See https://undici.nodejs.org/#/?id=garbage-collection
*/
async function CancelReadableStream$1(stream) {
	if (stream === null || typeof stream !== "object") return;
	if (stream[Symbol.asyncIterator]) {
		await stream[Symbol.asyncIterator]().return?.();
		return;
	}
	const reader = stream.getReader();
	const cancelPromise = reader.cancel();
	reader.releaseLock();
	await cancelPromise;
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/request-options.mjs
const FallbackEncoder$1 = ({ headers, body }) => {
	return {
		bodyHeaders: { "content-type": "application/json" },
		body: JSON.stringify(body)
	};
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/query.mjs
/**
* Basic re-implementation of `qs.stringify` for primitive types.
*/
function stringifyQuery$1(query) {
	return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
		if (value === null) return `${encodeURIComponent(key)}=`;
		throw new AnthropicError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
	}).join("&");
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/bytes.mjs
function concatBytes$1(buffers) {
	let length = 0;
	for (const buffer of buffers) length += buffer.length;
	const output = new Uint8Array(length);
	let index = 0;
	for (const buffer of buffers) {
		output.set(buffer, index);
		index += buffer.length;
	}
	return output;
}
let encodeUTF8_$1;
function encodeUTF8$1(str) {
	let encoder;
	return (encodeUTF8_$1 ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_$1 = encoder.encode.bind(encoder)))(str);
}
let decodeUTF8_$1;
function decodeUTF8$1(bytes) {
	let decoder;
	return (decodeUTF8_$1 ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_$1 = decoder.decode.bind(decoder)))(bytes);
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/decoders/line.mjs
var _LineDecoder_buffer$1, _LineDecoder_carriageReturnIndex$1;
/**
* A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
* reading lines from text.
*
* https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
*/
var LineDecoder$1 = class {
	constructor() {
		_LineDecoder_buffer$1.set(this, void 0);
		_LineDecoder_carriageReturnIndex$1.set(this, void 0);
		__classPrivateFieldSet$1(this, _LineDecoder_buffer$1, new Uint8Array(), "f");
		__classPrivateFieldSet$1(this, _LineDecoder_carriageReturnIndex$1, null, "f");
	}
	decode(chunk) {
		if (chunk == null) return [];
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8$1(chunk) : chunk;
		__classPrivateFieldSet$1(this, _LineDecoder_buffer$1, concatBytes$1([__classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f"), binaryChunk]), "f");
		const lines = [];
		let patternIndex;
		while ((patternIndex = findNewlineIndex$1(__classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f"), __classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f"))) != null) {
			if (patternIndex.carriage && __classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f") == null) {
				__classPrivateFieldSet$1(this, _LineDecoder_carriageReturnIndex$1, patternIndex.index, "f");
				continue;
			}
			if (__classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f") != null && (patternIndex.index !== __classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f") + 1 || patternIndex.carriage)) {
				lines.push(decodeUTF8$1(__classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f").subarray(0, __classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f") - 1)));
				__classPrivateFieldSet$1(this, _LineDecoder_buffer$1, __classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f").subarray(__classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f")), "f");
				__classPrivateFieldSet$1(this, _LineDecoder_carriageReturnIndex$1, null, "f");
				continue;
			}
			const endIndex = __classPrivateFieldGet$1(this, _LineDecoder_carriageReturnIndex$1, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
			const line = decodeUTF8$1(__classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f").subarray(0, endIndex));
			lines.push(line);
			__classPrivateFieldSet$1(this, _LineDecoder_buffer$1, __classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f").subarray(patternIndex.index), "f");
			__classPrivateFieldSet$1(this, _LineDecoder_carriageReturnIndex$1, null, "f");
		}
		return lines;
	}
	flush() {
		if (!__classPrivateFieldGet$1(this, _LineDecoder_buffer$1, "f").length) return [];
		return this.decode("\n");
	}
};
_LineDecoder_buffer$1 = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex$1 = /* @__PURE__ */ new WeakMap();
LineDecoder$1.NEWLINE_CHARS = new Set(["\n", "\r"]);
LineDecoder$1.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
* This function searches the buffer for the end patterns, (\r or \n)
* and returns an object with the index preceding the matched newline and the
* index after the newline char. `null` is returned if no new line is found.
*
* ```ts
* findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
* ```
*/
function findNewlineIndex$1(buffer, startIndex) {
	const newline = 10;
	const carriage = 13;
	for (let i = startIndex ?? 0; i < buffer.length; i++) {
		if (buffer[i] === newline) return {
			preceding: i,
			index: i + 1,
			carriage: false
		};
		if (buffer[i] === carriage) return {
			preceding: i,
			index: i + 1,
			carriage: true
		};
	}
	return null;
}
function findDoubleNewlineIndex$1(buffer) {
	const newline = 10;
	const carriage = 13;
	for (let i = 0; i < buffer.length - 1; i++) {
		if (buffer[i] === newline && buffer[i + 1] === newline) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === carriage) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) return i + 4;
	}
	return -1;
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/log.mjs
const levelNumbers$1 = {
	off: 0,
	error: 200,
	warn: 300,
	info: 400,
	debug: 500
};
const parseLogLevel$1 = (maybeLevel, sourceName, client) => {
	if (!maybeLevel) return;
	if (hasOwn$1(levelNumbers$1, maybeLevel)) return maybeLevel;
	loggerFor$1(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers$1))}`);
};
function noop$1() {}
function makeLogFn$1(fnLevel, logger, logLevel) {
	if (!logger || levelNumbers$1[fnLevel] > levelNumbers$1[logLevel]) return noop$1;
	else return logger[fnLevel].bind(logger);
}
const noopLogger$1 = {
	error: noop$1,
	warn: noop$1,
	info: noop$1,
	debug: noop$1
};
let cachedLoggers$1 = /* @__PURE__ */ new WeakMap();
function loggerFor$1(client) {
	const logger = client.logger;
	const logLevel = client.logLevel ?? "off";
	if (!logger) return noopLogger$1;
	const cachedLogger = cachedLoggers$1.get(logger);
	if (cachedLogger && cachedLogger[0] === logLevel) return cachedLogger[1];
	const levelLogger = {
		error: makeLogFn$1("error", logger, logLevel),
		warn: makeLogFn$1("warn", logger, logLevel),
		info: makeLogFn$1("info", logger, logLevel),
		debug: makeLogFn$1("debug", logger, logLevel)
	};
	cachedLoggers$1.set(logger, [logLevel, levelLogger]);
	return levelLogger;
}
const formatRequestDetails$1 = (details) => {
	if (details.options) {
		details.options = { ...details.options };
		delete details.options["headers"];
	}
	if (details.headers) details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [name, name.toLowerCase() === "x-api-key" || name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value]));
	if ("retryOfRequestLogID" in details) {
		if (details.retryOfRequestLogID) details.retryOf = details.retryOfRequestLogID;
		delete details.retryOfRequestLogID;
	}
	return details;
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/core/streaming.mjs
var _Stream_client$1;
var Stream$1 = class Stream$1 {
	constructor(iterator, controller, client) {
		this.iterator = iterator;
		_Stream_client$1.set(this, void 0);
		this.controller = controller;
		__classPrivateFieldSet$1(this, _Stream_client$1, client, "f");
	}
	static fromSSEResponse(response, controller, client) {
		let consumed = false;
		const logger = client ? loggerFor$1(client) : console;
		async function* iterator() {
			if (consumed) throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const sse of _iterSSEMessages$1(response, controller)) {
					if (sse.event === "completion") try {
						yield JSON.parse(sse.data);
					} catch (e) {
						logger.error(`Could not parse message into JSON:`, sse.data);
						logger.error(`From chunk:`, sse.raw);
						throw e;
					}
					if (sse.event === "message_start" || sse.event === "message_delta" || sse.event === "message_stop" || sse.event === "content_block_start" || sse.event === "content_block_delta" || sse.event === "content_block_stop") try {
						yield JSON.parse(sse.data);
					} catch (e) {
						logger.error(`Could not parse message into JSON:`, sse.data);
						logger.error(`From chunk:`, sse.raw);
						throw e;
					}
					if (sse.event === "ping") continue;
					if (sse.event === "error") {
						const body = safeJSON$1(sse.data) ?? sse.data;
						const type = body?.error?.type;
						throw new APIError$1(void 0, body, void 0, response.headers, type);
					}
				}
				done = true;
			} catch (e) {
				if (isAbortError$1(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream$1(iterator, controller, client);
	}
	/**
	* Generates a Stream from a newline-separated ReadableStream
	* where each item is a JSON value.
	*/
	static fromReadableStream(readableStream, controller, client) {
		let consumed = false;
		async function* iterLines() {
			const lineDecoder = new LineDecoder$1();
			const iter = ReadableStreamToAsyncIterable$1(readableStream);
			for await (const chunk of iter) for (const line of lineDecoder.decode(chunk)) yield line;
			for (const line of lineDecoder.flush()) yield line;
		}
		async function* iterator() {
			if (consumed) throw new AnthropicError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const line of iterLines()) {
					if (done) continue;
					if (line) yield JSON.parse(line);
				}
				done = true;
			} catch (e) {
				if (isAbortError$1(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream$1(iterator, controller, client);
	}
	[(_Stream_client$1 = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		return this.iterator();
	}
	/**
	* Splits the stream into two streams which can be
	* independently read from at different speeds.
	*/
	tee() {
		const left = [];
		const right = [];
		const iterator = this.iterator();
		const teeIterator = (queue) => {
			return { next: () => {
				if (queue.length === 0) {
					const result = iterator.next();
					left.push(result);
					right.push(result);
				}
				return queue.shift();
			} };
		};
		return [new Stream$1(() => teeIterator(left), this.controller, __classPrivateFieldGet$1(this, _Stream_client$1, "f")), new Stream$1(() => teeIterator(right), this.controller, __classPrivateFieldGet$1(this, _Stream_client$1, "f"))];
	}
	/**
	* Converts this stream to a newline-separated ReadableStream of
	* JSON stringified values in the stream
	* which can be turned back into a Stream with `Stream.fromReadableStream()`.
	*/
	toReadableStream() {
		const self = this;
		let iter;
		return makeReadableStream$1({
			async start() {
				iter = self[Symbol.asyncIterator]();
			},
			async pull(ctrl) {
				try {
					const { value, done } = await iter.next();
					if (done) return ctrl.close();
					const bytes = encodeUTF8$1(JSON.stringify(value) + "\n");
					ctrl.enqueue(bytes);
				} catch (err) {
					ctrl.error(err);
				}
			},
			async cancel() {
				await iter.return?.();
			}
		});
	}
};
async function* _iterSSEMessages$1(response, controller) {
	if (!response.body) {
		controller.abort();
		if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
		throw new AnthropicError(`Attempted to iterate over a response with no body`);
	}
	const sseDecoder = new SSEDecoder$1();
	const lineDecoder = new LineDecoder$1();
	const iter = ReadableStreamToAsyncIterable$1(response.body);
	for await (const sseChunk of iterSSEChunks$1(iter)) for (const line of lineDecoder.decode(sseChunk)) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
	for (const line of lineDecoder.flush()) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
}
/**
* Given an async iterable iterator, iterates over it and yields full
* SSE chunks, i.e. yields when a double new-line is encountered.
*/
async function* iterSSEChunks$1(iterator) {
	let data = new Uint8Array();
	for await (const chunk of iterator) {
		if (chunk == null) continue;
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8$1(chunk) : chunk;
		let newData = new Uint8Array(data.length + binaryChunk.length);
		newData.set(data);
		newData.set(binaryChunk, data.length);
		data = newData;
		let patternIndex;
		while ((patternIndex = findDoubleNewlineIndex$1(data)) !== -1) {
			yield data.slice(0, patternIndex);
			data = data.slice(patternIndex);
		}
	}
	if (data.length > 0) yield data;
}
var SSEDecoder$1 = class {
	constructor() {
		this.event = null;
		this.data = [];
		this.chunks = [];
	}
	decode(line) {
		if (line.endsWith("\r")) line = line.substring(0, line.length - 1);
		if (!line) {
			if (!this.event && !this.data.length) return null;
			const sse = {
				event: this.event,
				data: this.data.join("\n"),
				raw: this.chunks
			};
			this.event = null;
			this.data = [];
			this.chunks = [];
			return sse;
		}
		this.chunks.push(line);
		if (line.startsWith(":")) return null;
		let [fieldname, _, value] = partition$1(line, ":");
		if (value.startsWith(" ")) value = value.substring(1);
		if (fieldname === "event") this.event = value;
		else if (fieldname === "data") this.data.push(value);
		return null;
	}
};
function partition$1(str, delimiter) {
	const index = str.indexOf(delimiter);
	if (index !== -1) return [
		str.substring(0, index),
		delimiter,
		str.substring(index + delimiter.length)
	];
	return [
		str,
		"",
		""
	];
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/parse.mjs
async function defaultParseResponse$1(client, props) {
	const { response, requestLogID, retryOfRequestLogID, startTime } = props;
	const body = await (async () => {
		if (props.options.stream) {
			loggerFor$1(client).debug("response", response.status, response.url, response.headers, response.body);
			if (props.options.__streamClass) return props.options.__streamClass.fromSSEResponse(response, props.controller);
			return Stream$1.fromSSEResponse(response, props.controller);
		}
		if (response.status === 204) return null;
		if (props.options.__binaryResponse) return response;
		const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim();
		if (mediaType?.includes("application/json") || mediaType?.endsWith("+json")) {
			if (response.headers.get("content-length") === "0") return;
			return addRequestID$1(await response.json(), response);
		}
		return await response.text();
	})();
	loggerFor$1(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails$1({
		retryOfRequestLogID,
		url: response.url,
		status: response.status,
		body,
		durationMs: Date.now() - startTime
	}));
	return body;
}
function addRequestID$1(value, response) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value;
	return Object.defineProperty(value, "_request_id", {
		value: response.headers.get("request-id"),
		enumerable: false
	});
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/core/api-promise.mjs
var _APIPromise_client$1;
/**
* A subclass of `Promise` providing additional helper methods
* for interacting with the SDK.
*/
var APIPromise$1 = class APIPromise$1 extends Promise {
	constructor(client, responsePromise, parseResponse = defaultParseResponse$1) {
		super((resolve) => {
			resolve(null);
		});
		this.responsePromise = responsePromise;
		this.parseResponse = parseResponse;
		_APIPromise_client$1.set(this, void 0);
		__classPrivateFieldSet$1(this, _APIPromise_client$1, client, "f");
	}
	_thenUnwrap(transform) {
		return new APIPromise$1(__classPrivateFieldGet$1(this, _APIPromise_client$1, "f"), this.responsePromise, async (client, props) => addRequestID$1(transform(await this.parseResponse(client, props), props), props.response));
	}
	/**
	* Gets the raw `Response` instance instead of parsing the response
	* data.
	*
	* If you want to parse the response body but still get the `Response`
	* instance, you can use {@link withResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	asResponse() {
		return this.responsePromise.then((p) => p.response);
	}
	/**
	* Gets the parsed response data, the raw `Response` instance and the ID of the request,
	* returned via the `request-id` header which is useful for debugging requests and resporting
	* issues to Anthropic.
	*
	* If you just want to get the raw `Response` instance without parsing it,
	* you can use {@link asResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	async withResponse() {
		const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
		return {
			data,
			response,
			request_id: response.headers.get("request-id")
		};
	}
	parse() {
		if (!this.parsedPromise) this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet$1(this, _APIPromise_client$1, "f"), data));
		return this.parsedPromise;
	}
	then(onfulfilled, onrejected) {
		return this.parse().then(onfulfilled, onrejected);
	}
	catch(onrejected) {
		return this.parse().catch(onrejected);
	}
	finally(onfinally) {
		return this.parse().finally(onfinally);
	}
};
_APIPromise_client$1 = /* @__PURE__ */ new WeakMap();
//#endregion
//#region node_modules/@anthropic-ai/sdk/core/pagination.mjs
var _AbstractPage_client$1;
var AbstractPage$1 = class {
	constructor(client, response, body, options) {
		_AbstractPage_client$1.set(this, void 0);
		__classPrivateFieldSet$1(this, _AbstractPage_client$1, client, "f");
		this.options = options;
		this.response = response;
		this.body = body;
	}
	hasNextPage() {
		if (!this.getPaginatedItems().length) return false;
		return this.nextPageRequestOptions() != null;
	}
	async getNextPage() {
		const nextOptions = this.nextPageRequestOptions();
		if (!nextOptions) throw new AnthropicError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
		return await __classPrivateFieldGet$1(this, _AbstractPage_client$1, "f").requestAPIList(this.constructor, nextOptions);
	}
	async *iterPages() {
		let page = this;
		yield page;
		while (page.hasNextPage()) {
			page = await page.getNextPage();
			yield page;
		}
	}
	async *[(_AbstractPage_client$1 = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		for await (const page of this.iterPages()) for (const item of page.getPaginatedItems()) yield item;
	}
};
/**
* This subclass of Promise will resolve to an instantiated Page once the request completes.
*
* It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
*
*    for await (const item of client.items.list()) {
*      console.log(item)
*    }
*/
var PagePromise$1 = class extends APIPromise$1 {
	constructor(client, request, Page) {
		super(client, request, async (client, props) => new Page(client, props.response, await defaultParseResponse$1(client, props), props.options));
	}
	/**
	* Allow auto-paginating iteration on an unawaited list call, eg:
	*
	*    for await (const item of client.items.list()) {
	*      console.log(item)
	*    }
	*/
	async *[Symbol.asyncIterator]() {
		const page = await this;
		for await (const item of page) yield item;
	}
};
var Page$1 = class extends AbstractPage$1 {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
		this.first_id = body.first_id || null;
		this.last_id = body.last_id || null;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		if (this.options.query?.["before_id"]) {
			const first_id = this.first_id;
			if (!first_id) return null;
			return {
				...this.options,
				query: {
					...maybeObj$1(this.options.query),
					before_id: first_id
				}
			};
		}
		const cursor = this.last_id;
		if (!cursor) return null;
		return {
			...this.options,
			query: {
				...maybeObj$1(this.options.query),
				after_id: cursor
			}
		};
	}
};
var PageCursor = class extends AbstractPage$1 {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
		this.next_page = body.next_page || null;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const cursor = this.next_page;
		if (!cursor) return null;
		return {
			...this.options,
			query: {
				...maybeObj$1(this.options.query),
				page: cursor
			}
		};
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/uploads.mjs
const checkFileSupport$1 = () => {
	if (typeof File === "undefined") {
		const { process } = globalThis;
		const isOldNode = typeof process?.versions?.node === "string" && parseInt(process.versions.node.split(".")) < 20;
		throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
	}
};
/**
* Construct a `File` instance. This is used to ensure a helpful error is thrown
* for environments that don't define a global `File` yet.
*/
function makeFile$1(fileBits, fileName, options) {
	checkFileSupport$1();
	return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName$1(value, stripPath) {
	const val = typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "";
	return stripPath ? val.split(/[\\/]/).pop() || void 0 : val;
}
const isAsyncIterable$1 = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
const multipartFormRequestOptions$1 = async (opts, fetch, stripFilenames = true) => {
	return {
		...opts,
		body: await createForm$1(opts.body, fetch, stripFilenames)
	};
};
const supportsFormDataMap$1 = /* @__PURE__ */ new WeakMap();
/**
* node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
* properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
* This function detects if the fetch function provided supports the global FormData object to avoid
* confusing error messages later on.
*/
function supportsFormData$1(fetchObject) {
	const fetch = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
	const cached = supportsFormDataMap$1.get(fetch);
	if (cached) return cached;
	const promise = (async () => {
		try {
			const FetchResponse = "Response" in fetch ? fetch.Response : (await fetch("data:,")).constructor;
			const data = new FormData();
			if (data.toString() === await new FetchResponse(data).text()) return false;
			return true;
		} catch {
			return true;
		}
	})();
	supportsFormDataMap$1.set(fetch, promise);
	return promise;
}
const createForm$1 = async (body, fetch, stripFilenames = true) => {
	if (!await supportsFormData$1(fetch)) throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
	const form = new FormData();
	await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue$1(form, key, value, stripFilenames)));
	return form;
};
const isNamedBlob$1 = (value) => value instanceof Blob && "name" in value;
const addFormValue$1 = async (form, key, value, stripFilenames) => {
	if (value === void 0) return;
	if (value == null) throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") form.append(key, String(value));
	else if (value instanceof Response) {
		let options = {};
		const contentType = value.headers.get("Content-Type");
		if (contentType) options = { type: contentType };
		form.append(key, makeFile$1([await value.blob()], getName$1(value, stripFilenames), options));
	} else if (isAsyncIterable$1(value)) form.append(key, makeFile$1([await new Response(ReadableStreamFrom$1(value)).blob()], getName$1(value, stripFilenames)));
	else if (isNamedBlob$1(value)) form.append(key, makeFile$1([value], getName$1(value, stripFilenames), { type: value.type }));
	else if (Array.isArray(value)) await Promise.all(value.map((entry) => addFormValue$1(form, key + "[]", entry, stripFilenames)));
	else if (typeof value === "object") await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue$1(form, `${key}[${name}]`, prop, stripFilenames)));
	else throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/to-file.mjs
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isBlobLike$1 = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isFileLike$1 = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike$1(value);
const isResponseLike$1 = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
/**
* Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
* @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
* @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
* @param {Object=} options additional properties
* @param {string=} options.type the MIME type of the content
* @param {number=} options.lastModified the last modified timestamp
* @returns a {@link File} with the given properties
*/
async function toFile$1(value, name, options) {
	checkFileSupport$1();
	value = await value;
	name || (name = getName$1(value, true));
	if (isFileLike$1(value)) {
		if (value instanceof File && name == null && options == null) return value;
		return makeFile$1([await value.arrayBuffer()], name ?? value.name, {
			type: value.type,
			lastModified: value.lastModified,
			...options
		});
	}
	if (isResponseLike$1(value)) {
		const blob = await value.blob();
		name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
		return makeFile$1(await getBytes$1(blob), name, options);
	}
	const parts = await getBytes$1(value);
	if (!options?.type) {
		const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
		if (typeof type === "string") options = {
			...options,
			type
		};
	}
	return makeFile$1(parts, name, options);
}
async function getBytes$1(value) {
	let parts = [];
	if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) parts.push(value);
	else if (isBlobLike$1(value)) parts.push(value instanceof Blob ? value : await value.arrayBuffer());
	else if (isAsyncIterable$1(value)) for await (const chunk of value) parts.push(...await getBytes$1(chunk));
	else {
		const constructor = value?.constructor?.name;
		throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError$1(value)}`);
	}
	return parts;
}
function propsForError$1(value) {
	if (typeof value !== "object" || value === null) return "";
	return `; props: [${Object.getOwnPropertyNames(value).map((p) => `"${p}"`).join(", ")}]`;
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/core/resource.mjs
var APIResource$1 = class {
	constructor(client) {
		this._client = client;
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/headers.mjs
const brand_privateNullableHeaders$1 = Symbol.for("brand.privateNullableHeaders");
function* iterateHeaders$1(headers) {
	if (!headers) return;
	if (brand_privateNullableHeaders$1 in headers) {
		const { values, nulls } = headers;
		yield* values.entries();
		for (const name of nulls) yield [name, null];
		return;
	}
	let shouldClear = false;
	let iter;
	if (headers instanceof Headers) iter = headers.entries();
	else if (isReadonlyArray$1(headers)) iter = headers;
	else {
		shouldClear = true;
		iter = Object.entries(headers ?? {});
	}
	for (let row of iter) {
		const name = row[0];
		if (typeof name !== "string") throw new TypeError("expected header name to be a string");
		const values = isReadonlyArray$1(row[1]) ? row[1] : [row[1]];
		let didClear = false;
		for (const value of values) {
			if (value === void 0) continue;
			if (shouldClear && !didClear) {
				didClear = true;
				yield [name, null];
			}
			yield [name, value];
		}
	}
}
const buildHeaders$1 = (newHeaders) => {
	const targetHeaders = new Headers();
	const nullHeaders = /* @__PURE__ */ new Set();
	for (const headers of newHeaders) {
		const seenHeaders = /* @__PURE__ */ new Set();
		for (const [name, value] of iterateHeaders$1(headers)) {
			const lowerName = name.toLowerCase();
			if (!seenHeaders.has(lowerName)) {
				targetHeaders.delete(name);
				seenHeaders.add(lowerName);
			}
			if (value === null) {
				targetHeaders.delete(name);
				nullHeaders.add(lowerName);
			} else {
				targetHeaders.append(name, value);
				nullHeaders.delete(lowerName);
			}
		}
	}
	return {
		[brand_privateNullableHeaders$1]: true,
		values: targetHeaders,
		nulls: nullHeaders
	};
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/stainless-helper-header.mjs
/**
* Shared utilities for tracking SDK helper usage.
*/
/**
* Symbol used to mark objects created by SDK helpers for tracking.
* The value is the helper name (e.g., 'mcpTool', 'betaZodTool').
*/
const SDK_HELPER_SYMBOL = Symbol("anthropic.sdk.stainlessHelper");
function wasCreatedByStainlessHelper(value) {
	return typeof value === "object" && value !== null && SDK_HELPER_SYMBOL in value;
}
/**
* Collects helper names from tools and messages arrays.
* Returns a deduplicated array of helper names found.
*/
function collectStainlessHelpers(tools, messages) {
	const helpers = /* @__PURE__ */ new Set();
	if (tools) {
		for (const tool of tools) if (wasCreatedByStainlessHelper(tool)) helpers.add(tool[SDK_HELPER_SYMBOL]);
	}
	if (messages) for (const message of messages) {
		if (wasCreatedByStainlessHelper(message)) helpers.add(message[SDK_HELPER_SYMBOL]);
		if (Array.isArray(message.content)) {
			for (const block of message.content) if (wasCreatedByStainlessHelper(block)) helpers.add(block[SDK_HELPER_SYMBOL]);
		}
	}
	return Array.from(helpers);
}
/**
* Builds x-stainless-helper header value from tools and messages.
* Returns an empty object if no helpers are found.
*/
function stainlessHelperHeader(tools, messages) {
	const helpers = collectStainlessHelpers(tools, messages);
	if (helpers.length === 0) return {};
	return { "x-stainless-helper": helpers.join(", ") };
}
/**
* Builds x-stainless-helper header value from a file object.
* Returns an empty object if the file is not marked with a helper.
*/
function stainlessHelperHeaderFromFile(file) {
	if (wasCreatedByStainlessHelper(file)) return { "x-stainless-helper": file[SDK_HELPER_SYMBOL] };
	return {};
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/path.mjs
/**
* Percent-encode everything that isn't safe to have in a path without encoding safe chars.
*
* Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
* > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
* > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
* > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
*/
function encodeURIPath$1(str) {
	return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction$1 = (pathEncoder = encodeURIPath$1) => function path(statics, ...params) {
	if (statics.length === 1) return statics[0];
	let postPath = false;
	const invalidSegments = [];
	const path = statics.reduce((previousValue, currentValue, index) => {
		if (/[?#]/.test(currentValue)) postPath = true;
		const value = params[index];
		let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
		if (index !== params.length && (value == null || typeof value === "object" && value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY$1) ?? EMPTY$1)?.toString)) {
			encoded = value + "";
			invalidSegments.push({
				start: previousValue.length + currentValue.length,
				length: encoded.length,
				error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
			});
		}
		return previousValue + currentValue + (index === params.length ? "" : encoded);
	}, "");
	const pathOnly = path.split(/[?#]/, 1)[0];
	const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
	let match;
	while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) invalidSegments.push({
		start: match.index,
		length: match[0].length,
		error: `Value "${match[0]}" can\'t be safely passed as a path parameter`
	});
	invalidSegments.sort((a, b) => a.start - b.start);
	if (invalidSegments.length > 0) {
		let lastEnd = 0;
		const underline = invalidSegments.reduce((acc, segment) => {
			const spaces = " ".repeat(segment.start - lastEnd);
			const arrows = "^".repeat(segment.length);
			lastEnd = segment.start + segment.length;
			return acc + spaces + arrows;
		}, "");
		throw new AnthropicError(`Path parameters result in path with invalid segments:\n${invalidSegments.map((e) => e.error).join("\n")}\n${path}\n${underline}`);
	}
	return path;
};
/**
* URI-encodes path params and ensures no unsafe /./ or /../ path segments are introduced.
*/
const path$1 = /* @__PURE__ */ createPathTagFunction$1(encodeURIPath$1);
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/files.mjs
var Files$3 = class extends APIResource$1 {
	/**
	* List Files
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fileMetadata of client.beta.files.list()) {
	*   // ...
	* }
	* ```
	*/
	list(params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList("/v1/files", Page$1, {
			query,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() }, options?.headers])
		});
	}
	/**
	* Delete File
	*
	* @example
	* ```ts
	* const deletedFile = await client.beta.files.delete(
	*   'file_id',
	* );
	* ```
	*/
	delete(fileID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.delete(path$1`/v1/files/${fileID}`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() }, options?.headers])
		});
	}
	/**
	* Download File
	*
	* @example
	* ```ts
	* const response = await client.beta.files.download(
	*   'file_id',
	* );
	*
	* const content = await response.blob();
	* console.log(content);
	* ```
	*/
	download(fileID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/files/${fileID}/content`, {
			...options,
			headers: buildHeaders$1([{
				"anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString(),
				Accept: "application/binary"
			}, options?.headers]),
			__binaryResponse: true
		});
	}
	/**
	* Get File Metadata
	*
	* @example
	* ```ts
	* const fileMetadata =
	*   await client.beta.files.retrieveMetadata('file_id');
	* ```
	*/
	retrieveMetadata(fileID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/files/${fileID}`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() }, options?.headers])
		});
	}
	/**
	* Upload File
	*
	* @example
	* ```ts
	* const fileMetadata = await client.beta.files.upload({
	*   file: fs.createReadStream('path/to/file'),
	* });
	* ```
	*/
	upload(params, options) {
		const { betas, ...body } = params;
		return this._client.post("/v1/files", multipartFormRequestOptions$1({
			body,
			...options,
			headers: buildHeaders$1([
				{ "anthropic-beta": [...betas ?? [], "files-api-2025-04-14"].toString() },
				stainlessHelperHeaderFromFile(body.file),
				options?.headers
			])
		}, this._client));
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/models.mjs
var Models$2 = class extends APIResource$1 {
	/**
	* Get a specific model.
	*
	* The Models API response can be used to determine information about a specific
	* model or resolve a model alias to a model ID.
	*
	* @example
	* ```ts
	* const betaModelInfo = await client.beta.models.retrieve(
	*   'model_id',
	* );
	* ```
	*/
	retrieve(modelID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/models/${modelID}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 }, options?.headers])
		});
	}
	/**
	* List available models.
	*
	* The Models API response can be used to determine which models are available for
	* use in the API. More recently released models are listed first.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const betaModelInfo of client.beta.models.list()) {
	*   // ...
	* }
	* ```
	*/
	list(params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList("/v1/models?beta=true", Page$1, {
			query,
			...options,
			headers: buildHeaders$1([{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/constants.mjs
/**
* Model-specific timeout constraints for non-streaming requests
*/
const MODEL_NONSTREAMING_TOKENS = {
	"claude-opus-4-20250514": 8192,
	"claude-opus-4-0": 8192,
	"claude-4-opus-20250514": 8192,
	"anthropic.claude-opus-4-20250514-v1:0": 8192,
	"claude-opus-4@20250514": 8192,
	"claude-opus-4-1-20250805": 8192,
	"anthropic.claude-opus-4-1-20250805-v1:0": 8192,
	"claude-opus-4-1@20250805": 8192
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/beta-parser.mjs
function getOutputFormat$1(params) {
	return params?.output_format ?? params?.output_config?.format;
}
function maybeParseBetaMessage(message, params, opts) {
	const outputFormat = getOutputFormat$1(params);
	if (!params || !("parse" in (outputFormat ?? {}))) return {
		...message,
		content: message.content.map((block) => {
			if (block.type === "text") {
				const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
					value: null,
					enumerable: false
				});
				return Object.defineProperty(parsedBlock, "parsed", {
					get() {
						opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
						return null;
					},
					enumerable: false
				});
			}
			return block;
		}),
		parsed_output: null
	};
	return parseBetaMessage(message, params, opts);
}
function parseBetaMessage(message, params, opts) {
	let firstParsedOutput = null;
	const content = message.content.map((block) => {
		if (block.type === "text") {
			const parsedOutput = parseBetaOutputFormat(params, block.text);
			if (firstParsedOutput === null) firstParsedOutput = parsedOutput;
			const parsedBlock = Object.defineProperty({ ...block }, "parsed_output", {
				value: parsedOutput,
				enumerable: false
			});
			return Object.defineProperty(parsedBlock, "parsed", {
				get() {
					opts.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead.");
					return parsedOutput;
				},
				enumerable: false
			});
		}
		return block;
	});
	return {
		...message,
		content,
		parsed_output: firstParsedOutput
	};
}
function parseBetaOutputFormat(params, content) {
	const outputFormat = getOutputFormat$1(params);
	if (outputFormat?.type !== "json_schema") return null;
	try {
		if ("parse" in outputFormat) return outputFormat.parse(content);
		return JSON.parse(content);
	} catch (error) {
		throw new AnthropicError(`Failed to parse structured output: ${error}`);
	}
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/_vendor/partial-json-parser/parser.mjs
const tokenize = (input) => {
	let current = 0;
	let tokens = [];
	while (current < input.length) {
		let char = input[current];
		if (char === "\\") {
			current++;
			continue;
		}
		if (char === "{") {
			tokens.push({
				type: "brace",
				value: "{"
			});
			current++;
			continue;
		}
		if (char === "}") {
			tokens.push({
				type: "brace",
				value: "}"
			});
			current++;
			continue;
		}
		if (char === "[") {
			tokens.push({
				type: "paren",
				value: "["
			});
			current++;
			continue;
		}
		if (char === "]") {
			tokens.push({
				type: "paren",
				value: "]"
			});
			current++;
			continue;
		}
		if (char === ":") {
			tokens.push({
				type: "separator",
				value: ":"
			});
			current++;
			continue;
		}
		if (char === ",") {
			tokens.push({
				type: "delimiter",
				value: ","
			});
			current++;
			continue;
		}
		if (char === "\"") {
			let value = "";
			let danglingQuote = false;
			char = input[++current];
			while (char !== "\"") {
				if (current === input.length) {
					danglingQuote = true;
					break;
				}
				if (char === "\\") {
					current++;
					if (current === input.length) {
						danglingQuote = true;
						break;
					}
					value += char + input[current];
					char = input[++current];
				} else {
					value += char;
					char = input[++current];
				}
			}
			char = input[++current];
			if (!danglingQuote) tokens.push({
				type: "string",
				value
			});
			continue;
		}
		if (char && /\s/.test(char)) {
			current++;
			continue;
		}
		let NUMBERS = /[0-9]/;
		if (char && NUMBERS.test(char) || char === "-" || char === ".") {
			let value = "";
			if (char === "-") {
				value += char;
				char = input[++current];
			}
			while (char && NUMBERS.test(char) || char === ".") {
				value += char;
				char = input[++current];
			}
			tokens.push({
				type: "number",
				value
			});
			continue;
		}
		let LETTERS = /[a-z]/i;
		if (char && LETTERS.test(char)) {
			let value = "";
			while (char && LETTERS.test(char)) {
				if (current === input.length) break;
				value += char;
				char = input[++current];
			}
			if (value == "true" || value == "false" || value === "null") tokens.push({
				type: "name",
				value
			});
			else {
				current++;
				continue;
			}
			continue;
		}
		current++;
	}
	return tokens;
}, strip = (tokens) => {
	if (tokens.length === 0) return tokens;
	let lastToken = tokens[tokens.length - 1];
	switch (lastToken.type) {
		case "separator":
			tokens = tokens.slice(0, tokens.length - 1);
			return strip(tokens);
		case "number":
			let lastCharacterOfLastToken = lastToken.value[lastToken.value.length - 1];
			if (lastCharacterOfLastToken === "." || lastCharacterOfLastToken === "-") {
				tokens = tokens.slice(0, tokens.length - 1);
				return strip(tokens);
			}
		case "string":
			let tokenBeforeTheLastToken = tokens[tokens.length - 2];
			if (tokenBeforeTheLastToken?.type === "delimiter") {
				tokens = tokens.slice(0, tokens.length - 1);
				return strip(tokens);
			} else if (tokenBeforeTheLastToken?.type === "brace" && tokenBeforeTheLastToken.value === "{") {
				tokens = tokens.slice(0, tokens.length - 1);
				return strip(tokens);
			}
			break;
		case "delimiter":
			tokens = tokens.slice(0, tokens.length - 1);
			return strip(tokens);
	}
	return tokens;
}, unstrip = (tokens) => {
	let tail = [];
	tokens.map((token) => {
		if (token.type === "brace") if (token.value === "{") tail.push("}");
		else tail.splice(tail.lastIndexOf("}"), 1);
		if (token.type === "paren") if (token.value === "[") tail.push("]");
		else tail.splice(tail.lastIndexOf("]"), 1);
	});
	if (tail.length > 0) tail.reverse().map((item) => {
		if (item === "}") tokens.push({
			type: "brace",
			value: "}"
		});
		else if (item === "]") tokens.push({
			type: "paren",
			value: "]"
		});
	});
	return tokens;
}, generate = (tokens) => {
	let output = "";
	tokens.map((token) => {
		switch (token.type) {
			case "string":
				output += "\"" + token.value + "\"";
				break;
			default:
				output += token.value;
				break;
		}
	});
	return output;
}, partialParse$1 = (input) => JSON.parse(generate(unstrip(strip(tokenize(input)))));
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.mjs
var _BetaMessageStream_instances, _BetaMessageStream_currentMessageSnapshot, _BetaMessageStream_params, _BetaMessageStream_connectedPromise, _BetaMessageStream_resolveConnectedPromise, _BetaMessageStream_rejectConnectedPromise, _BetaMessageStream_endPromise, _BetaMessageStream_resolveEndPromise, _BetaMessageStream_rejectEndPromise, _BetaMessageStream_listeners, _BetaMessageStream_ended, _BetaMessageStream_errored, _BetaMessageStream_aborted, _BetaMessageStream_catchingPromiseCreated, _BetaMessageStream_response, _BetaMessageStream_request_id, _BetaMessageStream_logger, _BetaMessageStream_getFinalMessage, _BetaMessageStream_getFinalText, _BetaMessageStream_handleError, _BetaMessageStream_beginRequest, _BetaMessageStream_addStreamEvent, _BetaMessageStream_endRequest, _BetaMessageStream_accumulateMessage;
const JSON_BUF_PROPERTY$1 = "__json_buf";
function tracksToolInput$1(content) {
	return content.type === "tool_use" || content.type === "server_tool_use" || content.type === "mcp_tool_use";
}
var BetaMessageStream = class BetaMessageStream {
	constructor(params, opts) {
		_BetaMessageStream_instances.add(this);
		this.messages = [];
		this.receivedMessages = [];
		_BetaMessageStream_currentMessageSnapshot.set(this, void 0);
		_BetaMessageStream_params.set(this, null);
		this.controller = new AbortController();
		_BetaMessageStream_connectedPromise.set(this, void 0);
		_BetaMessageStream_resolveConnectedPromise.set(this, () => {});
		_BetaMessageStream_rejectConnectedPromise.set(this, () => {});
		_BetaMessageStream_endPromise.set(this, void 0);
		_BetaMessageStream_resolveEndPromise.set(this, () => {});
		_BetaMessageStream_rejectEndPromise.set(this, () => {});
		_BetaMessageStream_listeners.set(this, {});
		_BetaMessageStream_ended.set(this, false);
		_BetaMessageStream_errored.set(this, false);
		_BetaMessageStream_aborted.set(this, false);
		_BetaMessageStream_catchingPromiseCreated.set(this, false);
		_BetaMessageStream_response.set(this, void 0);
		_BetaMessageStream_request_id.set(this, void 0);
		_BetaMessageStream_logger.set(this, void 0);
		_BetaMessageStream_handleError.set(this, (error) => {
			__classPrivateFieldSet$1(this, _BetaMessageStream_errored, true, "f");
			if (isAbortError$1(error)) error = new APIUserAbortError$1();
			if (error instanceof APIUserAbortError$1) {
				__classPrivateFieldSet$1(this, _BetaMessageStream_aborted, true, "f");
				return this._emit("abort", error);
			}
			if (error instanceof AnthropicError) return this._emit("error", error);
			if (error instanceof Error) {
				const anthropicError = new AnthropicError(error.message);
				anthropicError.cause = error;
				return this._emit("error", anthropicError);
			}
			return this._emit("error", new AnthropicError(String(error)));
		});
		__classPrivateFieldSet$1(this, _BetaMessageStream_connectedPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _BetaMessageStream_resolveConnectedPromise, resolve, "f");
			__classPrivateFieldSet$1(this, _BetaMessageStream_rejectConnectedPromise, reject, "f");
		}), "f");
		__classPrivateFieldSet$1(this, _BetaMessageStream_endPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _BetaMessageStream_resolveEndPromise, resolve, "f");
			__classPrivateFieldSet$1(this, _BetaMessageStream_rejectEndPromise, reject, "f");
		}), "f");
		__classPrivateFieldGet$1(this, _BetaMessageStream_connectedPromise, "f").catch(() => {});
		__classPrivateFieldGet$1(this, _BetaMessageStream_endPromise, "f").catch(() => {});
		__classPrivateFieldSet$1(this, _BetaMessageStream_params, params, "f");
		__classPrivateFieldSet$1(this, _BetaMessageStream_logger, opts?.logger ?? console, "f");
	}
	get response() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_response, "f");
	}
	get request_id() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_request_id, "f");
	}
	/**
	* Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
	* returned vie the `request-id` header which is useful for debugging requests and resporting
	* issues to Anthropic.
	*
	* This is the same as the `APIPromise.withResponse()` method.
	*
	* This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
	* as no `Response` is available.
	*/
	async withResponse() {
		__classPrivateFieldSet$1(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
		const response = await __classPrivateFieldGet$1(this, _BetaMessageStream_connectedPromise, "f");
		if (!response) throw new Error("Could not resolve a `Response` object");
		return {
			data: this,
			response,
			request_id: response.headers.get("request-id")
		};
	}
	/**
	* Intended for use on the frontend, consuming a stream produced with
	* `.toReadableStream()` on the backend.
	*
	* Note that messages sent to the model do not appear in `.on('message')`
	* in this context.
	*/
	static fromReadableStream(stream) {
		const runner = new BetaMessageStream(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static createMessage(messages, params, options, { logger } = {}) {
		const runner = new BetaMessageStream(params, { logger });
		for (const message of params.messages) runner._addMessageParam(message);
		__classPrivateFieldSet$1(runner, _BetaMessageStream_params, {
			...params,
			stream: true
		}, "f");
		runner._run(() => runner._createMessage(messages, {
			...params,
			stream: true
		}, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	_run(executor) {
		executor().then(() => {
			this._emitFinal();
			this._emit("end");
		}, __classPrivateFieldGet$1(this, _BetaMessageStream_handleError, "f"));
	}
	_addMessageParam(message) {
		this.messages.push(message);
	}
	_addMessage(message, emit = true) {
		this.receivedMessages.push(message);
		if (emit) this._emit("message", message);
	}
	async _createMessage(messages, params, options) {
		const signal = options?.signal;
		let abortHandler;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			abortHandler = this.controller.abort.bind(this.controller);
			signal.addEventListener("abort", abortHandler);
		}
		try {
			__classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
			const { response, data: stream } = await messages.create({
				...params,
				stream: true
			}, {
				...options,
				signal: this.controller.signal
			}).withResponse();
			this._connected(response);
			for await (const event of stream) __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
			if (stream.controller.signal?.aborted) throw new APIUserAbortError$1();
			__classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
		} finally {
			if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
		}
	}
	_connected(response) {
		if (this.ended) return;
		__classPrivateFieldSet$1(this, _BetaMessageStream_response, response, "f");
		__classPrivateFieldSet$1(this, _BetaMessageStream_request_id, response?.headers.get("request-id"), "f");
		__classPrivateFieldGet$1(this, _BetaMessageStream_resolveConnectedPromise, "f").call(this, response);
		this._emit("connect");
	}
	get ended() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_ended, "f");
	}
	get errored() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_errored, "f");
	}
	get aborted() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_aborted, "f");
	}
	abort() {
		this.controller.abort();
	}
	/**
	* Adds the listener function to the end of the listeners array for the event.
	* No checks are made to see if the listener has already been added. Multiple calls passing
	* the same combination of event and listener will result in the listener being added, and
	* called, multiple times.
	* @returns this MessageStream, so that calls can be chained
	*/
	on(event, listener) {
		(__classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event] = [])).push({ listener });
		return this;
	}
	/**
	* Removes the specified listener from the listener array for the event.
	* off() will remove, at most, one instance of a listener from the listener array. If any single
	* listener has been added multiple times to the listener array for the specified event, then
	* off() must be called multiple times to remove each instance.
	* @returns this MessageStream, so that calls can be chained
	*/
	off(event, listener) {
		const listeners = __classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event];
		if (!listeners) return this;
		const index = listeners.findIndex((l) => l.listener === listener);
		if (index >= 0) listeners.splice(index, 1);
		return this;
	}
	/**
	* Adds a one-time listener function for the event. The next time the event is triggered,
	* this listener is removed and then invoked.
	* @returns this MessageStream, so that calls can be chained
	*/
	once(event, listener) {
		(__classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event] || (__classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event] = [])).push({
			listener,
			once: true
		});
		return this;
	}
	/**
	* This is similar to `.once()`, but returns a Promise that resolves the next time
	* the event is triggered, instead of calling a listener callback.
	* @returns a Promise that resolves the next time given event is triggered,
	* or rejects if an error is emitted.  (If you request the 'error' event,
	* returns a promise that resolves with the error).
	*
	* Example:
	*
	*   const message = await stream.emitted('message') // rejects if the stream errors
	*/
	emitted(event) {
		return new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
			if (event !== "error") this.once("error", reject);
			this.once(event, resolve);
		});
	}
	async done() {
		__classPrivateFieldSet$1(this, _BetaMessageStream_catchingPromiseCreated, true, "f");
		await __classPrivateFieldGet$1(this, _BetaMessageStream_endPromise, "f");
	}
	get currentMessage() {
		return __classPrivateFieldGet$1(this, _BetaMessageStream_currentMessageSnapshot, "f");
	}
	/**
	* @returns a promise that resolves with the the final assistant Message response,
	* or rejects if an error occurred or the stream ended prematurely without producing a Message.
	* If structured outputs were used, this will be a ParsedMessage with a `parsed` field.
	*/
	async finalMessage() {
		await this.done();
		return __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this);
	}
	/**
	* @returns a promise that resolves with the the final assistant Message's text response, concatenated
	* together if there are more than one text blocks.
	* Rejects if an error occurred or the stream ended prematurely without producing a Message.
	*/
	async finalText() {
		await this.done();
		return __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalText).call(this);
	}
	_emit(event, ...args) {
		if (__classPrivateFieldGet$1(this, _BetaMessageStream_ended, "f")) return;
		if (event === "end") {
			__classPrivateFieldSet$1(this, _BetaMessageStream_ended, true, "f");
			__classPrivateFieldGet$1(this, _BetaMessageStream_resolveEndPromise, "f").call(this);
		}
		const listeners = __classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event];
		if (listeners) {
			__classPrivateFieldGet$1(this, _BetaMessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
			listeners.forEach(({ listener }) => listener(...args));
		}
		if (event === "abort") {
			const error = args[0];
			if (!__classPrivateFieldGet$1(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet$1(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet$1(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
			return;
		}
		if (event === "error") {
			const error = args[0];
			if (!__classPrivateFieldGet$1(this, _BetaMessageStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet$1(this, _BetaMessageStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet$1(this, _BetaMessageStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
		}
	}
	_emitFinal() {
		if (this.receivedMessages.at(-1)) this._emit("finalMessage", __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_getFinalMessage).call(this));
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		let abortHandler;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			abortHandler = this.controller.abort.bind(this.controller);
			signal.addEventListener("abort", abortHandler);
		}
		try {
			__classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_beginRequest).call(this);
			this._connected(null);
			const stream = Stream$1.fromReadableStream(readableStream, this.controller);
			for await (const event of stream) __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_addStreamEvent).call(this, event);
			if (stream.controller.signal?.aborted) throw new APIUserAbortError$1();
			__classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_endRequest).call(this);
		} finally {
			if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
		}
	}
	[(_BetaMessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_params = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_listeners = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_ended = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_errored = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_aborted = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_response = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_request_id = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_logger = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_handleError = /* @__PURE__ */ new WeakMap(), _BetaMessageStream_instances = /* @__PURE__ */ new WeakSet(), _BetaMessageStream_getFinalMessage = function _BetaMessageStream_getFinalMessage() {
		if (this.receivedMessages.length === 0) throw new AnthropicError("stream ended without producing a Message with role=assistant");
		return this.receivedMessages.at(-1);
	}, _BetaMessageStream_getFinalText = function _BetaMessageStream_getFinalText() {
		if (this.receivedMessages.length === 0) throw new AnthropicError("stream ended without producing a Message with role=assistant");
		const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
		if (textBlocks.length === 0) throw new AnthropicError("stream ended without producing a content block with type=text");
		return textBlocks.join(" ");
	}, _BetaMessageStream_beginRequest = function _BetaMessageStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet$1(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
	}, _BetaMessageStream_addStreamEvent = function _BetaMessageStream_addStreamEvent(event) {
		if (this.ended) return;
		const messageSnapshot = __classPrivateFieldGet$1(this, _BetaMessageStream_instances, "m", _BetaMessageStream_accumulateMessage).call(this, event);
		this._emit("streamEvent", event, messageSnapshot);
		switch (event.type) {
			case "content_block_delta": {
				const content = messageSnapshot.content.at(-1);
				switch (event.delta.type) {
					case "text_delta":
						if (content.type === "text") this._emit("text", event.delta.text, content.text || "");
						break;
					case "citations_delta":
						if (content.type === "text") this._emit("citation", event.delta.citation, content.citations ?? []);
						break;
					case "input_json_delta":
						if (tracksToolInput$1(content) && content.input) this._emit("inputJson", event.delta.partial_json, content.input);
						break;
					case "thinking_delta":
						if (content.type === "thinking") this._emit("thinking", event.delta.thinking, content.thinking);
						break;
					case "signature_delta":
						if (content.type === "thinking") this._emit("signature", content.signature);
						break;
					case "compaction_delta":
						if (content.type === "compaction" && content.content) this._emit("compaction", content.content);
						break;
					default: checkNever$1(event.delta);
				}
				break;
			}
			case "message_stop":
				this._addMessageParam(messageSnapshot);
				this._addMessage(maybeParseBetaMessage(messageSnapshot, __classPrivateFieldGet$1(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet$1(this, _BetaMessageStream_logger, "f") }), true);
				break;
			case "content_block_stop":
				this._emit("contentBlock", messageSnapshot.content.at(-1));
				break;
			case "message_start":
				__classPrivateFieldSet$1(this, _BetaMessageStream_currentMessageSnapshot, messageSnapshot, "f");
				break;
			case "content_block_start":
			case "message_delta": break;
		}
	}, _BetaMessageStream_endRequest = function _BetaMessageStream_endRequest() {
		if (this.ended) throw new AnthropicError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet$1(this, _BetaMessageStream_currentMessageSnapshot, "f");
		if (!snapshot) throw new AnthropicError(`request ended without sending any chunks`);
		__classPrivateFieldSet$1(this, _BetaMessageStream_currentMessageSnapshot, void 0, "f");
		return maybeParseBetaMessage(snapshot, __classPrivateFieldGet$1(this, _BetaMessageStream_params, "f"), { logger: __classPrivateFieldGet$1(this, _BetaMessageStream_logger, "f") });
	}, _BetaMessageStream_accumulateMessage = function _BetaMessageStream_accumulateMessage(event) {
		let snapshot = __classPrivateFieldGet$1(this, _BetaMessageStream_currentMessageSnapshot, "f");
		if (event.type === "message_start") {
			if (snapshot) throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
			return event.message;
		}
		if (!snapshot) throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
		switch (event.type) {
			case "message_stop": return snapshot;
			case "message_delta":
				snapshot.container = event.delta.container;
				snapshot.stop_reason = event.delta.stop_reason;
				snapshot.stop_sequence = event.delta.stop_sequence;
				snapshot.usage.output_tokens = event.usage.output_tokens;
				snapshot.context_management = event.context_management;
				if (event.usage.input_tokens != null) snapshot.usage.input_tokens = event.usage.input_tokens;
				if (event.usage.cache_creation_input_tokens != null) snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
				if (event.usage.cache_read_input_tokens != null) snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
				if (event.usage.server_tool_use != null) snapshot.usage.server_tool_use = event.usage.server_tool_use;
				if (event.usage.iterations != null) snapshot.usage.iterations = event.usage.iterations;
				return snapshot;
			case "content_block_start":
				snapshot.content.push(event.content_block);
				return snapshot;
			case "content_block_delta": {
				const snapshotContent = snapshot.content.at(event.index);
				switch (event.delta.type) {
					case "text_delta":
						if (snapshotContent?.type === "text") snapshot.content[event.index] = {
							...snapshotContent,
							text: (snapshotContent.text || "") + event.delta.text
						};
						break;
					case "citations_delta":
						if (snapshotContent?.type === "text") snapshot.content[event.index] = {
							...snapshotContent,
							citations: [...snapshotContent.citations ?? [], event.delta.citation]
						};
						break;
					case "input_json_delta":
						if (snapshotContent && tracksToolInput$1(snapshotContent)) {
							let jsonBuf = snapshotContent[JSON_BUF_PROPERTY$1] || "";
							jsonBuf += event.delta.partial_json;
							const newContent = { ...snapshotContent };
							Object.defineProperty(newContent, JSON_BUF_PROPERTY$1, {
								value: jsonBuf,
								enumerable: false,
								writable: true
							});
							if (jsonBuf) try {
								newContent.input = partialParse$1(jsonBuf);
							} catch (err) {
								const error = new AnthropicError(`Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${err}. JSON: ${jsonBuf}`);
								__classPrivateFieldGet$1(this, _BetaMessageStream_handleError, "f").call(this, error);
							}
							snapshot.content[event.index] = newContent;
						}
						break;
					case "thinking_delta":
						if (snapshotContent?.type === "thinking") snapshot.content[event.index] = {
							...snapshotContent,
							thinking: snapshotContent.thinking + event.delta.thinking
						};
						break;
					case "signature_delta":
						if (snapshotContent?.type === "thinking") snapshot.content[event.index] = {
							...snapshotContent,
							signature: event.delta.signature
						};
						break;
					case "compaction_delta":
						if (snapshotContent?.type === "compaction") snapshot.content[event.index] = {
							...snapshotContent,
							content: (snapshotContent.content || "") + event.delta.content
						};
						break;
					default: checkNever$1(event.delta);
				}
				return snapshot;
			}
			case "content_block_stop": return snapshot;
		}
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("streamEvent", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	toReadableStream() {
		return new Stream$1(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
};
function checkNever$1(x) {}
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/tools/ToolError.mjs
/**
* An error that can be thrown from a tool's `run` method to return structured
* content blocks as the error result, rather than just a string message.
*
* When the ToolRunner catches this error, it will use the `content` property
* as the tool result with `is_error: true`.
*
* @example
* ```ts
* const tool = {
*   name: 'my_tool',
*   run: async (input) => {
*     if (somethingWentWrong) {
*       throw new ToolError([
*         { type: 'text', text: 'Error details here' },
*         { type: 'image', source: { type: 'base64', data: '...', media_type: 'image/png' } },
*       ]);
*     }
*     return 'success';
*   },
* };
* ```
*/
var ToolError = class extends Error {
	constructor(content) {
		const message = typeof content === "string" ? content : content.map((block) => {
			if (block.type === "text") return block.text;
			return `[${block.type}]`;
		}).join(" ");
		super(message);
		this.name = "ToolError";
		this.content = content;
	}
};
const DEFAULT_SUMMARY_PROMPT = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete—err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
var _BetaToolRunner_instances, _BetaToolRunner_consumed, _BetaToolRunner_mutated, _BetaToolRunner_state, _BetaToolRunner_options, _BetaToolRunner_message, _BetaToolRunner_toolResponse, _BetaToolRunner_completion, _BetaToolRunner_iterationCount, _BetaToolRunner_checkAndCompact, _BetaToolRunner_generateToolResponse;
/**
* Just Promise.withResolvers(), which is not available in all environments.
*/
function promiseWithResolvers() {
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
/**
* A ToolRunner handles the automatic conversation loop between the assistant and tools.
*
* A ToolRunner is an async iterable that yields either BetaMessage or BetaMessageStream objects
* depending on the streaming configuration.
*/
var BetaToolRunner = class {
	constructor(client, params, options) {
		_BetaToolRunner_instances.add(this);
		this.client = client;
		/** Whether the async iterator has been consumed */
		_BetaToolRunner_consumed.set(this, false);
		/** Whether parameters have been mutated since the last API call */
		_BetaToolRunner_mutated.set(this, false);
		/** Current state containing the request parameters */
		_BetaToolRunner_state.set(this, void 0);
		_BetaToolRunner_options.set(this, void 0);
		/** Promise for the last message received from the assistant */
		_BetaToolRunner_message.set(this, void 0);
		/** Cached tool response to avoid redundant executions */
		_BetaToolRunner_toolResponse.set(this, void 0);
		/** Promise resolvers for waiting on completion */
		_BetaToolRunner_completion.set(this, void 0);
		/** Number of iterations (API requests) made so far */
		_BetaToolRunner_iterationCount.set(this, 0);
		__classPrivateFieldSet$1(this, _BetaToolRunner_state, { params: {
			...params,
			messages: structuredClone(params.messages)
		} }, "f");
		const helperValue = ["BetaToolRunner", ...collectStainlessHelpers(params.tools, params.messages)].join(", ");
		__classPrivateFieldSet$1(this, _BetaToolRunner_options, {
			...options,
			headers: buildHeaders$1([{ "x-stainless-helper": helperValue }, options?.headers])
		}, "f");
		__classPrivateFieldSet$1(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
	}
	async *[(_BetaToolRunner_consumed = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_mutated = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_state = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_options = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_message = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_toolResponse = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_completion = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_iterationCount = /* @__PURE__ */ new WeakMap(), _BetaToolRunner_instances = /* @__PURE__ */ new WeakSet(), _BetaToolRunner_checkAndCompact = async function _BetaToolRunner_checkAndCompact() {
		const compactionControl = __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.compactionControl;
		if (!compactionControl || !compactionControl.enabled) return false;
		let tokensUsed = 0;
		if (__classPrivateFieldGet$1(this, _BetaToolRunner_message, "f") !== void 0) try {
			const message = await __classPrivateFieldGet$1(this, _BetaToolRunner_message, "f");
			tokensUsed = message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0) + message.usage.output_tokens;
		} catch {
			return false;
		}
		const threshold = compactionControl.contextTokenThreshold ?? 1e5;
		if (tokensUsed < threshold) return false;
		const model = compactionControl.model ?? __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.model;
		const summaryPrompt = compactionControl.summaryPrompt ?? DEFAULT_SUMMARY_PROMPT;
		const messages = __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.messages;
		if (messages[messages.length - 1].role === "assistant") {
			const lastMessage = messages[messages.length - 1];
			if (Array.isArray(lastMessage.content)) {
				const nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
				if (nonToolBlocks.length === 0) messages.pop();
				else lastMessage.content = nonToolBlocks;
			}
		}
		const response = await this.client.beta.messages.create({
			model,
			messages: [...messages, {
				role: "user",
				content: [{
					type: "text",
					text: summaryPrompt
				}]
			}],
			max_tokens: __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.max_tokens
		}, { headers: { "x-stainless-helper": "compaction" } });
		if (response.content[0]?.type !== "text") throw new AnthropicError("Expected text response for compaction");
		__classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.messages = [{
			role: "user",
			content: response.content
		}];
		return true;
	}, Symbol.asyncIterator)]() {
		var _a;
		if (__classPrivateFieldGet$1(this, _BetaToolRunner_consumed, "f")) throw new AnthropicError("Cannot iterate over a consumed stream");
		__classPrivateFieldSet$1(this, _BetaToolRunner_consumed, true, "f");
		__classPrivateFieldSet$1(this, _BetaToolRunner_mutated, true, "f");
		__classPrivateFieldSet$1(this, _BetaToolRunner_toolResponse, void 0, "f");
		try {
			while (true) {
				let stream;
				try {
					if (__classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.max_iterations && __classPrivateFieldGet$1(this, _BetaToolRunner_iterationCount, "f") >= __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.max_iterations) break;
					__classPrivateFieldSet$1(this, _BetaToolRunner_mutated, false, "f");
					__classPrivateFieldSet$1(this, _BetaToolRunner_toolResponse, void 0, "f");
					__classPrivateFieldSet$1(this, _BetaToolRunner_iterationCount, (_a = __classPrivateFieldGet$1(this, _BetaToolRunner_iterationCount, "f"), _a++, _a), "f");
					__classPrivateFieldSet$1(this, _BetaToolRunner_message, void 0, "f");
					const { max_iterations, compactionControl, ...params } = __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params;
					if (params.stream) {
						stream = this.client.beta.messages.stream({ ...params }, __classPrivateFieldGet$1(this, _BetaToolRunner_options, "f"));
						__classPrivateFieldSet$1(this, _BetaToolRunner_message, stream.finalMessage(), "f");
						__classPrivateFieldGet$1(this, _BetaToolRunner_message, "f").catch(() => {});
						yield stream;
					} else {
						__classPrivateFieldSet$1(this, _BetaToolRunner_message, this.client.beta.messages.create({
							...params,
							stream: false
						}, __classPrivateFieldGet$1(this, _BetaToolRunner_options, "f")), "f");
						yield __classPrivateFieldGet$1(this, _BetaToolRunner_message, "f");
					}
					if (!await __classPrivateFieldGet$1(this, _BetaToolRunner_instances, "m", _BetaToolRunner_checkAndCompact).call(this)) {
						if (!__classPrivateFieldGet$1(this, _BetaToolRunner_mutated, "f")) {
							const { role, content } = await __classPrivateFieldGet$1(this, _BetaToolRunner_message, "f");
							__classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.messages.push({
								role,
								content
							});
						}
						const toolMessage = await __classPrivateFieldGet$1(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.messages.at(-1));
						if (toolMessage) __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
						else if (!__classPrivateFieldGet$1(this, _BetaToolRunner_mutated, "f")) break;
					}
				} finally {
					if (stream) stream.abort();
				}
			}
			if (!__classPrivateFieldGet$1(this, _BetaToolRunner_message, "f")) throw new AnthropicError("ToolRunner concluded without a message from the server");
			__classPrivateFieldGet$1(this, _BetaToolRunner_completion, "f").resolve(await __classPrivateFieldGet$1(this, _BetaToolRunner_message, "f"));
		} catch (error) {
			__classPrivateFieldSet$1(this, _BetaToolRunner_consumed, false, "f");
			__classPrivateFieldGet$1(this, _BetaToolRunner_completion, "f").promise.catch(() => {});
			__classPrivateFieldGet$1(this, _BetaToolRunner_completion, "f").reject(error);
			__classPrivateFieldSet$1(this, _BetaToolRunner_completion, promiseWithResolvers(), "f");
			throw error;
		}
	}
	setMessagesParams(paramsOrMutator) {
		if (typeof paramsOrMutator === "function") __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params = paramsOrMutator(__classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params);
		else __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params = paramsOrMutator;
		__classPrivateFieldSet$1(this, _BetaToolRunner_mutated, true, "f");
		__classPrivateFieldSet$1(this, _BetaToolRunner_toolResponse, void 0, "f");
	}
	/**
	* Get the tool response for the last message from the assistant.
	* Avoids redundant tool executions by caching results.
	*
	* @returns A promise that resolves to a BetaMessageParam containing tool results, or null if no tools need to be executed
	*
	* @example
	* const toolResponse = await runner.generateToolResponse();
	* if (toolResponse) {
	*   console.log('Tool results:', toolResponse.content);
	* }
	*/
	async generateToolResponse() {
		const message = await __classPrivateFieldGet$1(this, _BetaToolRunner_message, "f") ?? this.params.messages.at(-1);
		if (!message) return null;
		return __classPrivateFieldGet$1(this, _BetaToolRunner_instances, "m", _BetaToolRunner_generateToolResponse).call(this, message);
	}
	/**
	* Wait for the async iterator to complete. This works even if the async iterator hasn't yet started, and
	* will wait for an instance to start and go to completion.
	*
	* @returns A promise that resolves to the final BetaMessage when the iterator completes
	*
	* @example
	* // Start consuming the iterator
	* for await (const message of runner) {
	*   console.log('Message:', message.content);
	* }
	*
	* // Meanwhile, wait for completion from another part of the code
	* const finalMessage = await runner.done();
	* console.log('Final response:', finalMessage.content);
	*/
	done() {
		return __classPrivateFieldGet$1(this, _BetaToolRunner_completion, "f").promise;
	}
	/**
	* Returns a promise indicating that the stream is done. Unlike .done(), this will eagerly read the stream:
	* * If the iterator has not been consumed, consume the entire iterator and return the final message from the
	* assistant.
	* * If the iterator has been consumed, waits for it to complete and returns the final message.
	*
	* @returns A promise that resolves to the final BetaMessage from the conversation
	* @throws {AnthropicError} If no messages were processed during the conversation
	*
	* @example
	* const finalMessage = await runner.runUntilDone();
	* console.log('Final response:', finalMessage.content);
	*/
	async runUntilDone() {
		if (!__classPrivateFieldGet$1(this, _BetaToolRunner_consumed, "f")) for await (const _ of this);
		return this.done();
	}
	/**
	* Get the current parameters being used by the ToolRunner.
	*
	* @returns A readonly view of the current ToolRunnerParams
	*
	* @example
	* const currentParams = runner.params;
	* console.log('Current model:', currentParams.model);
	* console.log('Message count:', currentParams.messages.length);
	*/
	get params() {
		return __classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params;
	}
	/**
	* Add one or more messages to the conversation history.
	*
	* @param messages - One or more BetaMessageParam objects to add to the conversation
	*
	* @example
	* runner.pushMessages(
	*   { role: 'user', content: 'Also, what about the weather in NYC?' }
	* );
	*
	* @example
	* // Adding multiple messages
	* runner.pushMessages(
	*   { role: 'user', content: 'What about NYC?' },
	*   { role: 'user', content: 'And Boston?' }
	* );
	*/
	pushMessages(...messages) {
		this.setMessagesParams((params) => ({
			...params,
			messages: [...params.messages, ...messages]
		}));
	}
	/**
	* Makes the ToolRunner directly awaitable, equivalent to calling .runUntilDone()
	* This allows using `await runner` instead of `await runner.runUntilDone()`
	*/
	then(onfulfilled, onrejected) {
		return this.runUntilDone().then(onfulfilled, onrejected);
	}
};
_BetaToolRunner_generateToolResponse = async function _BetaToolRunner_generateToolResponse(lastMessage) {
	if (__classPrivateFieldGet$1(this, _BetaToolRunner_toolResponse, "f") !== void 0) return __classPrivateFieldGet$1(this, _BetaToolRunner_toolResponse, "f");
	__classPrivateFieldSet$1(this, _BetaToolRunner_toolResponse, generateToolResponse(__classPrivateFieldGet$1(this, _BetaToolRunner_state, "f").params, lastMessage), "f");
	return __classPrivateFieldGet$1(this, _BetaToolRunner_toolResponse, "f");
};
async function generateToolResponse(params, lastMessage = params.messages.at(-1)) {
	if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.content || typeof lastMessage.content === "string") return null;
	const toolUseBlocks = lastMessage.content.filter((content) => content.type === "tool_use");
	if (toolUseBlocks.length === 0) return null;
	return {
		role: "user",
		content: await Promise.all(toolUseBlocks.map(async (toolUse) => {
			const tool = params.tools.find((t) => ("name" in t ? t.name : t.mcp_server_name) === toolUse.name);
			if (!tool || !("run" in tool)) return {
				type: "tool_result",
				tool_use_id: toolUse.id,
				content: `Error: Tool '${toolUse.name}' not found`,
				is_error: true
			};
			try {
				let input = toolUse.input;
				if ("parse" in tool && tool.parse) input = tool.parse(input);
				const result = await tool.run(input);
				return {
					type: "tool_result",
					tool_use_id: toolUse.id,
					content: result
				};
			} catch (error) {
				return {
					type: "tool_result",
					tool_use_id: toolUse.id,
					content: error instanceof ToolError ? error.content : `Error: ${error instanceof Error ? error.message : String(error)}`,
					is_error: true
				};
			}
		}))
	};
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/decoders/jsonl.mjs
var JSONLDecoder = class JSONLDecoder {
	constructor(iterator, controller) {
		this.iterator = iterator;
		this.controller = controller;
	}
	async *decoder() {
		const lineDecoder = new LineDecoder$1();
		for await (const chunk of this.iterator) for (const line of lineDecoder.decode(chunk)) yield JSON.parse(line);
		for (const line of lineDecoder.flush()) yield JSON.parse(line);
	}
	[Symbol.asyncIterator]() {
		return this.decoder();
	}
	static fromResponse(response, controller) {
		if (!response.body) {
			controller.abort();
			if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
			throw new AnthropicError(`Attempted to iterate over a response with no body`);
		}
		return new JSONLDecoder(ReadableStreamToAsyncIterable$1(response.body), controller);
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/messages/batches.mjs
var Batches$2 = class extends APIResource$1 {
	/**
	* Send a batch of Message creation requests.
	*
	* The Message Batches API can be used to process multiple Messages API requests at
	* once. Once a Message Batch is created, it begins processing immediately. Batches
	* can take up to 24 hours to complete.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const betaMessageBatch =
	*   await client.beta.messages.batches.create({
	*     requests: [
	*       {
	*         custom_id: 'my-custom-id-1',
	*         params: {
	*           max_tokens: 1024,
	*           messages: [
	*             { content: 'Hello, world', role: 'user' },
	*           ],
	*           model: 'claude-opus-4-6',
	*         },
	*       },
	*     ],
	*   });
	* ```
	*/
	create(params, options) {
		const { betas, ...body } = params;
		return this._client.post("/v1/messages/batches?beta=true", {
			body,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() }, options?.headers])
		});
	}
	/**
	* This endpoint is idempotent and can be used to poll for Message Batch
	* completion. To access the results of a Message Batch, make a request to the
	* `results_url` field in the response.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const betaMessageBatch =
	*   await client.beta.messages.batches.retrieve(
	*     'message_batch_id',
	*   );
	* ```
	*/
	retrieve(messageBatchID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/messages/batches/${messageBatchID}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() }, options?.headers])
		});
	}
	/**
	* List all Message Batches within a Workspace. Most recently created batches are
	* returned first.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const betaMessageBatch of client.beta.messages.batches.list()) {
	*   // ...
	* }
	* ```
	*/
	list(params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList("/v1/messages/batches?beta=true", Page$1, {
			query,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() }, options?.headers])
		});
	}
	/**
	* Delete a Message Batch.
	*
	* Message Batches can only be deleted once they've finished processing. If you'd
	* like to delete an in-progress batch, you must first cancel it.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const betaDeletedMessageBatch =
	*   await client.beta.messages.batches.delete(
	*     'message_batch_id',
	*   );
	* ```
	*/
	delete(messageBatchID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.delete(path$1`/v1/messages/batches/${messageBatchID}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() }, options?.headers])
		});
	}
	/**
	* Batches may be canceled any time before processing ends. Once cancellation is
	* initiated, the batch enters a `canceling` state, at which time the system may
	* complete any in-progress, non-interruptible requests before finalizing
	* cancellation.
	*
	* The number of canceled requests is specified in `request_counts`. To determine
	* which requests were canceled, check the individual results within the batch.
	* Note that cancellation may not result in any canceled requests if they were
	* non-interruptible.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const betaMessageBatch =
	*   await client.beta.messages.batches.cancel(
	*     'message_batch_id',
	*   );
	* ```
	*/
	cancel(messageBatchID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.post(path$1`/v1/messages/batches/${messageBatchID}/cancel?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString() }, options?.headers])
		});
	}
	/**
	* Streams the results of a Message Batch as a `.jsonl` file.
	*
	* Each line in the file is a JSON object containing the result of a single request
	* in the Message Batch. Results are not guaranteed to be in the same order as
	* requests. Use the `custom_id` field to match results to requests.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const betaMessageBatchIndividualResponse =
	*   await client.beta.messages.batches.results(
	*     'message_batch_id',
	*   );
	* ```
	*/
	async results(messageBatchID, params = {}, options) {
		const batch = await this.retrieve(messageBatchID);
		if (!batch.results_url) throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
		const { betas } = params ?? {};
		return this._client.get(batch.results_url, {
			...options,
			headers: buildHeaders$1([{
				"anthropic-beta": [...betas ?? [], "message-batches-2024-09-24"].toString(),
				Accept: "application/binary"
			}, options?.headers]),
			stream: true,
			__binaryResponse: true
		})._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.mjs
const DEPRECATED_MODELS$1 = {
	"claude-1.3": "November 6th, 2024",
	"claude-1.3-100k": "November 6th, 2024",
	"claude-instant-1.1": "November 6th, 2024",
	"claude-instant-1.1-100k": "November 6th, 2024",
	"claude-instant-1.2": "November 6th, 2024",
	"claude-3-sonnet-20240229": "July 21st, 2025",
	"claude-3-opus-20240229": "January 5th, 2026",
	"claude-2.1": "July 21st, 2025",
	"claude-2.0": "July 21st, 2025",
	"claude-3-7-sonnet-latest": "February 19th, 2026",
	"claude-3-7-sonnet-20250219": "February 19th, 2026"
};
const MODELS_TO_WARN_WITH_THINKING_ENABLED$1 = ["claude-opus-4-6"];
var Messages$3 = class extends APIResource$1 {
	constructor() {
		super(...arguments);
		this.batches = new Batches$2(this._client);
	}
	create(params, options) {
		const modifiedParams = transformOutputFormat(params);
		const { betas, ...body } = modifiedParams;
		if (body.model in DEPRECATED_MODELS$1) console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS$1[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
		if (body.model in MODELS_TO_WARN_WITH_THINKING_ENABLED$1 && body.thinking && body.thinking.type === "enabled") console.warn(`Using Claude with ${body.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
		let timeout = this._client._options.timeout;
		if (!body.stream && timeout == null) {
			const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? void 0;
			timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
		}
		const helperHeader = stainlessHelperHeader(body.tools, body.messages);
		return this._client.post("/v1/messages?beta=true", {
			body,
			timeout: timeout ?? 6e5,
			...options,
			headers: buildHeaders$1([
				{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 },
				helperHeader,
				options?.headers
			]),
			stream: modifiedParams.stream ?? false
		});
	}
	/**
	* Send a structured list of input messages with text and/or image content, along with an expected `output_format` and
	* the response will be automatically parsed and available in the `parsed_output` property of the message.
	*
	* @example
	* ```ts
	* const message = await client.beta.messages.parse({
	*   model: 'claude-3-5-sonnet-20241022',
	*   max_tokens: 1024,
	*   messages: [{ role: 'user', content: 'What is 2+2?' }],
	*   output_format: zodOutputFormat(z.object({ answer: z.number() }), 'math'),
	* });
	*
	* console.log(message.parsed_output?.answer); // 4
	* ```
	*/
	parse(params, options) {
		options = {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...params.betas ?? [], "structured-outputs-2025-12-15"].toString() }, options?.headers])
		};
		return this.create(params, options).then((message) => parseBetaMessage(message, params, { logger: this._client.logger ?? console }));
	}
	/**
	* Create a Message stream
	*/
	stream(body, options) {
		return BetaMessageStream.createMessage(this, body, options);
	}
	/**
	* Count the number of tokens in a Message.
	*
	* The Token Count API can be used to count the number of tokens in a Message,
	* including tools, images, and documents, without creating it.
	*
	* Learn more about token counting in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
	*
	* @example
	* ```ts
	* const betaMessageTokensCount =
	*   await client.beta.messages.countTokens({
	*     messages: [{ content: 'string', role: 'user' }],
	*     model: 'claude-opus-4-6',
	*   });
	* ```
	*/
	countTokens(params, options) {
		const { betas, ...body } = transformOutputFormat(params);
		return this._client.post("/v1/messages/count_tokens?beta=true", {
			body,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "token-counting-2024-11-01"].toString() }, options?.headers])
		});
	}
	toolRunner(body, options) {
		return new BetaToolRunner(this._client, body, options);
	}
};
/**
* Transform deprecated output_format to output_config.format
* Returns a modified copy of the params without mutating the original
*/
function transformOutputFormat(params) {
	if (!params.output_format) return params;
	if (params.output_config?.format) throw new AnthropicError("Both output_format and output_config.format were provided. Please use only output_config.format (output_format is deprecated).");
	const { output_format, ...rest } = params;
	return {
		...rest,
		output_config: {
			...params.output_config,
			format: output_format
		}
	};
}
Messages$3.Batches = Batches$2;
Messages$3.BetaToolRunner = BetaToolRunner;
Messages$3.ToolError = ToolError;
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/skills/versions.mjs
var Versions$1 = class extends APIResource$1 {
	/**
	* Create Skill Version
	*
	* @example
	* ```ts
	* const version = await client.beta.skills.versions.create(
	*   'skill_id',
	* );
	* ```
	*/
	create(skillID, params = {}, options) {
		const { betas, ...body } = params ?? {};
		return this._client.post(path$1`/v1/skills/${skillID}/versions?beta=true`, multipartFormRequestOptions$1({
			body,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		}, this._client));
	}
	/**
	* Get Skill Version
	*
	* @example
	* ```ts
	* const version = await client.beta.skills.versions.retrieve(
	*   'version',
	*   { skill_id: 'skill_id' },
	* );
	* ```
	*/
	retrieve(version, params, options) {
		const { skill_id, betas } = params;
		return this._client.get(path$1`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
	/**
	* List Skill Versions
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const versionListResponse of client.beta.skills.versions.list(
	*   'skill_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(skillID, params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList(path$1`/v1/skills/${skillID}/versions?beta=true`, PageCursor, {
			query,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
	/**
	* Delete Skill Version
	*
	* @example
	* ```ts
	* const version = await client.beta.skills.versions.delete(
	*   'version',
	*   { skill_id: 'skill_id' },
	* );
	* ```
	*/
	delete(version, params, options) {
		const { skill_id, betas } = params;
		return this._client.delete(path$1`/v1/skills/${skill_id}/versions/${version}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/skills/skills.mjs
var Skills$1 = class extends APIResource$1 {
	constructor() {
		super(...arguments);
		this.versions = new Versions$1(this._client);
	}
	/**
	* Create Skill
	*
	* @example
	* ```ts
	* const skill = await client.beta.skills.create();
	* ```
	*/
	create(params = {}, options) {
		const { betas, ...body } = params ?? {};
		return this._client.post("/v1/skills?beta=true", multipartFormRequestOptions$1({
			body,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		}, this._client, false));
	}
	/**
	* Get Skill
	*
	* @example
	* ```ts
	* const skill = await client.beta.skills.retrieve('skill_id');
	* ```
	*/
	retrieve(skillID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/skills/${skillID}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
	/**
	* List Skills
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const skillListResponse of client.beta.skills.list()) {
	*   // ...
	* }
	* ```
	*/
	list(params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList("/v1/skills?beta=true", PageCursor, {
			query,
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
	/**
	* Delete Skill
	*
	* @example
	* ```ts
	* const skill = await client.beta.skills.delete('skill_id');
	* ```
	*/
	delete(skillID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.delete(path$1`/v1/skills/${skillID}?beta=true`, {
			...options,
			headers: buildHeaders$1([{ "anthropic-beta": [...betas ?? [], "skills-2025-10-02"].toString() }, options?.headers])
		});
	}
};
Skills$1.Versions = Versions$1;
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/beta/beta.mjs
var Beta$1 = class extends APIResource$1 {
	constructor() {
		super(...arguments);
		this.models = new Models$2(this._client);
		this.messages = new Messages$3(this._client);
		this.files = new Files$3(this._client);
		this.skills = new Skills$1(this._client);
	}
};
Beta$1.Models = Models$2;
Beta$1.Messages = Messages$3;
Beta$1.Files = Files$3;
Beta$1.Skills = Skills$1;
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/completions.mjs
var Completions$2 = class extends APIResource$1 {
	create(params, options) {
		const { betas, ...body } = params;
		return this._client.post("/v1/complete", {
			body,
			timeout: this._client._options.timeout ?? 6e5,
			...options,
			headers: buildHeaders$1([{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 }, options?.headers]),
			stream: params.stream ?? false
		});
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/parser.mjs
function getOutputFormat(params) {
	return params?.output_config?.format;
}
function maybeParseMessage(message, params, opts) {
	const outputFormat = getOutputFormat(params);
	if (!params || !("parse" in (outputFormat ?? {}))) return {
		...message,
		content: message.content.map((block) => {
			if (block.type === "text") return Object.defineProperty({ ...block }, "parsed_output", {
				value: null,
				enumerable: false
			});
			return block;
		}),
		parsed_output: null
	};
	return parseMessage(message, params, opts);
}
function parseMessage(message, params, opts) {
	let firstParsedOutput = null;
	const content = message.content.map((block) => {
		if (block.type === "text") {
			const parsedOutput = parseOutputFormat(params, block.text);
			if (firstParsedOutput === null) firstParsedOutput = parsedOutput;
			return Object.defineProperty({ ...block }, "parsed_output", {
				value: parsedOutput,
				enumerable: false
			});
		}
		return block;
	});
	return {
		...message,
		content,
		parsed_output: firstParsedOutput
	};
}
function parseOutputFormat(params, content) {
	const outputFormat = getOutputFormat(params);
	if (outputFormat?.type !== "json_schema") return null;
	try {
		if ("parse" in outputFormat) return outputFormat.parse(content);
		return JSON.parse(content);
	} catch (error) {
		throw new AnthropicError(`Failed to parse structured output: ${error}`);
	}
}
//#endregion
//#region node_modules/@anthropic-ai/sdk/lib/MessageStream.mjs
var _MessageStream_instances, _MessageStream_currentMessageSnapshot, _MessageStream_params, _MessageStream_connectedPromise, _MessageStream_resolveConnectedPromise, _MessageStream_rejectConnectedPromise, _MessageStream_endPromise, _MessageStream_resolveEndPromise, _MessageStream_rejectEndPromise, _MessageStream_listeners, _MessageStream_ended, _MessageStream_errored, _MessageStream_aborted, _MessageStream_catchingPromiseCreated, _MessageStream_response, _MessageStream_request_id, _MessageStream_logger, _MessageStream_getFinalMessage, _MessageStream_getFinalText, _MessageStream_handleError, _MessageStream_beginRequest, _MessageStream_addStreamEvent, _MessageStream_endRequest, _MessageStream_accumulateMessage;
const JSON_BUF_PROPERTY = "__json_buf";
function tracksToolInput(content) {
	return content.type === "tool_use" || content.type === "server_tool_use";
}
var MessageStream = class MessageStream {
	constructor(params, opts) {
		_MessageStream_instances.add(this);
		this.messages = [];
		this.receivedMessages = [];
		_MessageStream_currentMessageSnapshot.set(this, void 0);
		_MessageStream_params.set(this, null);
		this.controller = new AbortController();
		_MessageStream_connectedPromise.set(this, void 0);
		_MessageStream_resolveConnectedPromise.set(this, () => {});
		_MessageStream_rejectConnectedPromise.set(this, () => {});
		_MessageStream_endPromise.set(this, void 0);
		_MessageStream_resolveEndPromise.set(this, () => {});
		_MessageStream_rejectEndPromise.set(this, () => {});
		_MessageStream_listeners.set(this, {});
		_MessageStream_ended.set(this, false);
		_MessageStream_errored.set(this, false);
		_MessageStream_aborted.set(this, false);
		_MessageStream_catchingPromiseCreated.set(this, false);
		_MessageStream_response.set(this, void 0);
		_MessageStream_request_id.set(this, void 0);
		_MessageStream_logger.set(this, void 0);
		_MessageStream_handleError.set(this, (error) => {
			__classPrivateFieldSet$1(this, _MessageStream_errored, true, "f");
			if (isAbortError$1(error)) error = new APIUserAbortError$1();
			if (error instanceof APIUserAbortError$1) {
				__classPrivateFieldSet$1(this, _MessageStream_aborted, true, "f");
				return this._emit("abort", error);
			}
			if (error instanceof AnthropicError) return this._emit("error", error);
			if (error instanceof Error) {
				const anthropicError = new AnthropicError(error.message);
				anthropicError.cause = error;
				return this._emit("error", anthropicError);
			}
			return this._emit("error", new AnthropicError(String(error)));
		});
		__classPrivateFieldSet$1(this, _MessageStream_connectedPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _MessageStream_resolveConnectedPromise, resolve, "f");
			__classPrivateFieldSet$1(this, _MessageStream_rejectConnectedPromise, reject, "f");
		}), "f");
		__classPrivateFieldSet$1(this, _MessageStream_endPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _MessageStream_resolveEndPromise, resolve, "f");
			__classPrivateFieldSet$1(this, _MessageStream_rejectEndPromise, reject, "f");
		}), "f");
		__classPrivateFieldGet$1(this, _MessageStream_connectedPromise, "f").catch(() => {});
		__classPrivateFieldGet$1(this, _MessageStream_endPromise, "f").catch(() => {});
		__classPrivateFieldSet$1(this, _MessageStream_params, params, "f");
		__classPrivateFieldSet$1(this, _MessageStream_logger, opts?.logger ?? console, "f");
	}
	get response() {
		return __classPrivateFieldGet$1(this, _MessageStream_response, "f");
	}
	get request_id() {
		return __classPrivateFieldGet$1(this, _MessageStream_request_id, "f");
	}
	/**
	* Returns the `MessageStream` data, the raw `Response` instance and the ID of the request,
	* returned vie the `request-id` header which is useful for debugging requests and resporting
	* issues to Anthropic.
	*
	* This is the same as the `APIPromise.withResponse()` method.
	*
	* This method will raise an error if you created the stream using `MessageStream.fromReadableStream`
	* as no `Response` is available.
	*/
	async withResponse() {
		__classPrivateFieldSet$1(this, _MessageStream_catchingPromiseCreated, true, "f");
		const response = await __classPrivateFieldGet$1(this, _MessageStream_connectedPromise, "f");
		if (!response) throw new Error("Could not resolve a `Response` object");
		return {
			data: this,
			response,
			request_id: response.headers.get("request-id")
		};
	}
	/**
	* Intended for use on the frontend, consuming a stream produced with
	* `.toReadableStream()` on the backend.
	*
	* Note that messages sent to the model do not appear in `.on('message')`
	* in this context.
	*/
	static fromReadableStream(stream) {
		const runner = new MessageStream(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static createMessage(messages, params, options, { logger } = {}) {
		const runner = new MessageStream(params, { logger });
		for (const message of params.messages) runner._addMessageParam(message);
		__classPrivateFieldSet$1(runner, _MessageStream_params, {
			...params,
			stream: true
		}, "f");
		runner._run(() => runner._createMessage(messages, {
			...params,
			stream: true
		}, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	_run(executor) {
		executor().then(() => {
			this._emitFinal();
			this._emit("end");
		}, __classPrivateFieldGet$1(this, _MessageStream_handleError, "f"));
	}
	_addMessageParam(message) {
		this.messages.push(message);
	}
	_addMessage(message, emit = true) {
		this.receivedMessages.push(message);
		if (emit) this._emit("message", message);
	}
	async _createMessage(messages, params, options) {
		const signal = options?.signal;
		let abortHandler;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			abortHandler = this.controller.abort.bind(this.controller);
			signal.addEventListener("abort", abortHandler);
		}
		try {
			__classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
			const { response, data: stream } = await messages.create({
				...params,
				stream: true
			}, {
				...options,
				signal: this.controller.signal
			}).withResponse();
			this._connected(response);
			for await (const event of stream) __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
			if (stream.controller.signal?.aborted) throw new APIUserAbortError$1();
			__classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
		} finally {
			if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
		}
	}
	_connected(response) {
		if (this.ended) return;
		__classPrivateFieldSet$1(this, _MessageStream_response, response, "f");
		__classPrivateFieldSet$1(this, _MessageStream_request_id, response?.headers.get("request-id"), "f");
		__classPrivateFieldGet$1(this, _MessageStream_resolveConnectedPromise, "f").call(this, response);
		this._emit("connect");
	}
	get ended() {
		return __classPrivateFieldGet$1(this, _MessageStream_ended, "f");
	}
	get errored() {
		return __classPrivateFieldGet$1(this, _MessageStream_errored, "f");
	}
	get aborted() {
		return __classPrivateFieldGet$1(this, _MessageStream_aborted, "f");
	}
	abort() {
		this.controller.abort();
	}
	/**
	* Adds the listener function to the end of the listeners array for the event.
	* No checks are made to see if the listener has already been added. Multiple calls passing
	* the same combination of event and listener will result in the listener being added, and
	* called, multiple times.
	* @returns this MessageStream, so that calls can be chained
	*/
	on(event, listener) {
		(__classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event] = [])).push({ listener });
		return this;
	}
	/**
	* Removes the specified listener from the listener array for the event.
	* off() will remove, at most, one instance of a listener from the listener array. If any single
	* listener has been added multiple times to the listener array for the specified event, then
	* off() must be called multiple times to remove each instance.
	* @returns this MessageStream, so that calls can be chained
	*/
	off(event, listener) {
		const listeners = __classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event];
		if (!listeners) return this;
		const index = listeners.findIndex((l) => l.listener === listener);
		if (index >= 0) listeners.splice(index, 1);
		return this;
	}
	/**
	* Adds a one-time listener function for the event. The next time the event is triggered,
	* this listener is removed and then invoked.
	* @returns this MessageStream, so that calls can be chained
	*/
	once(event, listener) {
		(__classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event] || (__classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event] = [])).push({
			listener,
			once: true
		});
		return this;
	}
	/**
	* This is similar to `.once()`, but returns a Promise that resolves the next time
	* the event is triggered, instead of calling a listener callback.
	* @returns a Promise that resolves the next time given event is triggered,
	* or rejects if an error is emitted.  (If you request the 'error' event,
	* returns a promise that resolves with the error).
	*
	* Example:
	*
	*   const message = await stream.emitted('message') // rejects if the stream errors
	*/
	emitted(event) {
		return new Promise((resolve, reject) => {
			__classPrivateFieldSet$1(this, _MessageStream_catchingPromiseCreated, true, "f");
			if (event !== "error") this.once("error", reject);
			this.once(event, resolve);
		});
	}
	async done() {
		__classPrivateFieldSet$1(this, _MessageStream_catchingPromiseCreated, true, "f");
		await __classPrivateFieldGet$1(this, _MessageStream_endPromise, "f");
	}
	get currentMessage() {
		return __classPrivateFieldGet$1(this, _MessageStream_currentMessageSnapshot, "f");
	}
	/**
	* @returns a promise that resolves with the the final assistant Message response,
	* or rejects if an error occurred or the stream ended prematurely without producing a Message.
	* If structured outputs were used, this will be a ParsedMessage with a `parsed_output` field.
	*/
	async finalMessage() {
		await this.done();
		return __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this);
	}
	/**
	* @returns a promise that resolves with the the final assistant Message's text response, concatenated
	* together if there are more than one text blocks.
	* Rejects if an error occurred or the stream ended prematurely without producing a Message.
	*/
	async finalText() {
		await this.done();
		return __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_getFinalText).call(this);
	}
	_emit(event, ...args) {
		if (__classPrivateFieldGet$1(this, _MessageStream_ended, "f")) return;
		if (event === "end") {
			__classPrivateFieldSet$1(this, _MessageStream_ended, true, "f");
			__classPrivateFieldGet$1(this, _MessageStream_resolveEndPromise, "f").call(this);
		}
		const listeners = __classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event];
		if (listeners) {
			__classPrivateFieldGet$1(this, _MessageStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
			listeners.forEach(({ listener }) => listener(...args));
		}
		if (event === "abort") {
			const error = args[0];
			if (!__classPrivateFieldGet$1(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet$1(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet$1(this, _MessageStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
			return;
		}
		if (event === "error") {
			const error = args[0];
			if (!__classPrivateFieldGet$1(this, _MessageStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet$1(this, _MessageStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet$1(this, _MessageStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
		}
	}
	_emitFinal() {
		if (this.receivedMessages.at(-1)) this._emit("finalMessage", __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_getFinalMessage).call(this));
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		let abortHandler;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			abortHandler = this.controller.abort.bind(this.controller);
			signal.addEventListener("abort", abortHandler);
		}
		try {
			__classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_beginRequest).call(this);
			this._connected(null);
			const stream = Stream$1.fromReadableStream(readableStream, this.controller);
			for await (const event of stream) __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_addStreamEvent).call(this, event);
			if (stream.controller.signal?.aborted) throw new APIUserAbortError$1();
			__classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_endRequest).call(this);
		} finally {
			if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
		}
	}
	[(_MessageStream_currentMessageSnapshot = /* @__PURE__ */ new WeakMap(), _MessageStream_params = /* @__PURE__ */ new WeakMap(), _MessageStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_endPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _MessageStream_listeners = /* @__PURE__ */ new WeakMap(), _MessageStream_ended = /* @__PURE__ */ new WeakMap(), _MessageStream_errored = /* @__PURE__ */ new WeakMap(), _MessageStream_aborted = /* @__PURE__ */ new WeakMap(), _MessageStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _MessageStream_response = /* @__PURE__ */ new WeakMap(), _MessageStream_request_id = /* @__PURE__ */ new WeakMap(), _MessageStream_logger = /* @__PURE__ */ new WeakMap(), _MessageStream_handleError = /* @__PURE__ */ new WeakMap(), _MessageStream_instances = /* @__PURE__ */ new WeakSet(), _MessageStream_getFinalMessage = function _MessageStream_getFinalMessage() {
		if (this.receivedMessages.length === 0) throw new AnthropicError("stream ended without producing a Message with role=assistant");
		return this.receivedMessages.at(-1);
	}, _MessageStream_getFinalText = function _MessageStream_getFinalText() {
		if (this.receivedMessages.length === 0) throw new AnthropicError("stream ended without producing a Message with role=assistant");
		const textBlocks = this.receivedMessages.at(-1).content.filter((block) => block.type === "text").map((block) => block.text);
		if (textBlocks.length === 0) throw new AnthropicError("stream ended without producing a content block with type=text");
		return textBlocks.join(" ");
	}, _MessageStream_beginRequest = function _MessageStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet$1(this, _MessageStream_currentMessageSnapshot, void 0, "f");
	}, _MessageStream_addStreamEvent = function _MessageStream_addStreamEvent(event) {
		if (this.ended) return;
		const messageSnapshot = __classPrivateFieldGet$1(this, _MessageStream_instances, "m", _MessageStream_accumulateMessage).call(this, event);
		this._emit("streamEvent", event, messageSnapshot);
		switch (event.type) {
			case "content_block_delta": {
				const content = messageSnapshot.content.at(-1);
				switch (event.delta.type) {
					case "text_delta":
						if (content.type === "text") this._emit("text", event.delta.text, content.text || "");
						break;
					case "citations_delta":
						if (content.type === "text") this._emit("citation", event.delta.citation, content.citations ?? []);
						break;
					case "input_json_delta":
						if (tracksToolInput(content) && content.input) this._emit("inputJson", event.delta.partial_json, content.input);
						break;
					case "thinking_delta":
						if (content.type === "thinking") this._emit("thinking", event.delta.thinking, content.thinking);
						break;
					case "signature_delta":
						if (content.type === "thinking") this._emit("signature", content.signature);
						break;
					default: checkNever(event.delta);
				}
				break;
			}
			case "message_stop":
				this._addMessageParam(messageSnapshot);
				this._addMessage(maybeParseMessage(messageSnapshot, __classPrivateFieldGet$1(this, _MessageStream_params, "f"), { logger: __classPrivateFieldGet$1(this, _MessageStream_logger, "f") }), true);
				break;
			case "content_block_stop":
				this._emit("contentBlock", messageSnapshot.content.at(-1));
				break;
			case "message_start":
				__classPrivateFieldSet$1(this, _MessageStream_currentMessageSnapshot, messageSnapshot, "f");
				break;
			case "content_block_start":
			case "message_delta": break;
		}
	}, _MessageStream_endRequest = function _MessageStream_endRequest() {
		if (this.ended) throw new AnthropicError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet$1(this, _MessageStream_currentMessageSnapshot, "f");
		if (!snapshot) throw new AnthropicError(`request ended without sending any chunks`);
		__classPrivateFieldSet$1(this, _MessageStream_currentMessageSnapshot, void 0, "f");
		return maybeParseMessage(snapshot, __classPrivateFieldGet$1(this, _MessageStream_params, "f"), { logger: __classPrivateFieldGet$1(this, _MessageStream_logger, "f") });
	}, _MessageStream_accumulateMessage = function _MessageStream_accumulateMessage(event) {
		let snapshot = __classPrivateFieldGet$1(this, _MessageStream_currentMessageSnapshot, "f");
		if (event.type === "message_start") {
			if (snapshot) throw new AnthropicError(`Unexpected event order, got ${event.type} before receiving "message_stop"`);
			return event.message;
		}
		if (!snapshot) throw new AnthropicError(`Unexpected event order, got ${event.type} before "message_start"`);
		switch (event.type) {
			case "message_stop": return snapshot;
			case "message_delta":
				snapshot.stop_reason = event.delta.stop_reason;
				snapshot.stop_sequence = event.delta.stop_sequence;
				snapshot.usage.output_tokens = event.usage.output_tokens;
				if (event.usage.input_tokens != null) snapshot.usage.input_tokens = event.usage.input_tokens;
				if (event.usage.cache_creation_input_tokens != null) snapshot.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens;
				if (event.usage.cache_read_input_tokens != null) snapshot.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens;
				if (event.usage.server_tool_use != null) snapshot.usage.server_tool_use = event.usage.server_tool_use;
				return snapshot;
			case "content_block_start":
				snapshot.content.push({ ...event.content_block });
				return snapshot;
			case "content_block_delta": {
				const snapshotContent = snapshot.content.at(event.index);
				switch (event.delta.type) {
					case "text_delta":
						if (snapshotContent?.type === "text") snapshot.content[event.index] = {
							...snapshotContent,
							text: (snapshotContent.text || "") + event.delta.text
						};
						break;
					case "citations_delta":
						if (snapshotContent?.type === "text") snapshot.content[event.index] = {
							...snapshotContent,
							citations: [...snapshotContent.citations ?? [], event.delta.citation]
						};
						break;
					case "input_json_delta":
						if (snapshotContent && tracksToolInput(snapshotContent)) {
							let jsonBuf = snapshotContent[JSON_BUF_PROPERTY] || "";
							jsonBuf += event.delta.partial_json;
							const newContent = { ...snapshotContent };
							Object.defineProperty(newContent, JSON_BUF_PROPERTY, {
								value: jsonBuf,
								enumerable: false,
								writable: true
							});
							if (jsonBuf) newContent.input = partialParse$1(jsonBuf);
							snapshot.content[event.index] = newContent;
						}
						break;
					case "thinking_delta":
						if (snapshotContent?.type === "thinking") snapshot.content[event.index] = {
							...snapshotContent,
							thinking: snapshotContent.thinking + event.delta.thinking
						};
						break;
					case "signature_delta":
						if (snapshotContent?.type === "thinking") snapshot.content[event.index] = {
							...snapshotContent,
							signature: event.delta.signature
						};
						break;
					default: checkNever(event.delta);
				}
				return snapshot;
			}
			case "content_block_stop": return snapshot;
		}
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("streamEvent", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	toReadableStream() {
		return new Stream$1(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
};
function checkNever(x) {}
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/messages/batches.mjs
var Batches$1 = class extends APIResource$1 {
	/**
	* Send a batch of Message creation requests.
	*
	* The Message Batches API can be used to process multiple Messages API requests at
	* once. Once a Message Batch is created, it begins processing immediately. Batches
	* can take up to 24 hours to complete.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const messageBatch = await client.messages.batches.create({
	*   requests: [
	*     {
	*       custom_id: 'my-custom-id-1',
	*       params: {
	*         max_tokens: 1024,
	*         messages: [
	*           { content: 'Hello, world', role: 'user' },
	*         ],
	*         model: 'claude-opus-4-6',
	*       },
	*     },
	*   ],
	* });
	* ```
	*/
	create(body, options) {
		return this._client.post("/v1/messages/batches", {
			body,
			...options
		});
	}
	/**
	* This endpoint is idempotent and can be used to poll for Message Batch
	* completion. To access the results of a Message Batch, make a request to the
	* `results_url` field in the response.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const messageBatch = await client.messages.batches.retrieve(
	*   'message_batch_id',
	* );
	* ```
	*/
	retrieve(messageBatchID, options) {
		return this._client.get(path$1`/v1/messages/batches/${messageBatchID}`, options);
	}
	/**
	* List all Message Batches within a Workspace. Most recently created batches are
	* returned first.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const messageBatch of client.messages.batches.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/v1/messages/batches", Page$1, {
			query,
			...options
		});
	}
	/**
	* Delete a Message Batch.
	*
	* Message Batches can only be deleted once they've finished processing. If you'd
	* like to delete an in-progress batch, you must first cancel it.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const deletedMessageBatch =
	*   await client.messages.batches.delete('message_batch_id');
	* ```
	*/
	delete(messageBatchID, options) {
		return this._client.delete(path$1`/v1/messages/batches/${messageBatchID}`, options);
	}
	/**
	* Batches may be canceled any time before processing ends. Once cancellation is
	* initiated, the batch enters a `canceling` state, at which time the system may
	* complete any in-progress, non-interruptible requests before finalizing
	* cancellation.
	*
	* The number of canceled requests is specified in `request_counts`. To determine
	* which requests were canceled, check the individual results within the batch.
	* Note that cancellation may not result in any canceled requests if they were
	* non-interruptible.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const messageBatch = await client.messages.batches.cancel(
	*   'message_batch_id',
	* );
	* ```
	*/
	cancel(messageBatchID, options) {
		return this._client.post(path$1`/v1/messages/batches/${messageBatchID}/cancel`, options);
	}
	/**
	* Streams the results of a Message Batch as a `.jsonl` file.
	*
	* Each line in the file is a JSON object containing the result of a single request
	* in the Message Batch. Results are not guaranteed to be in the same order as
	* requests. Use the `custom_id` field to match results to requests.
	*
	* Learn more about the Message Batches API in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
	*
	* @example
	* ```ts
	* const messageBatchIndividualResponse =
	*   await client.messages.batches.results('message_batch_id');
	* ```
	*/
	async results(messageBatchID, options) {
		const batch = await this.retrieve(messageBatchID);
		if (!batch.results_url) throw new AnthropicError(`No batch \`results_url\`; Has it finished processing? ${batch.processing_status} - ${batch.id}`);
		return this._client.get(batch.results_url, {
			...options,
			headers: buildHeaders$1([{ Accept: "application/binary" }, options?.headers]),
			stream: true,
			__binaryResponse: true
		})._thenUnwrap((_, props) => JSONLDecoder.fromResponse(props.response, props.controller));
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/messages/messages.mjs
var Messages$2 = class extends APIResource$1 {
	constructor() {
		super(...arguments);
		this.batches = new Batches$1(this._client);
	}
	create(body, options) {
		if (body.model in DEPRECATED_MODELS) console.warn(`The model '${body.model}' is deprecated and will reach end-of-life on ${DEPRECATED_MODELS[body.model]}\nPlease migrate to a newer model. Visit https://docs.anthropic.com/en/docs/resources/model-deprecations for more information.`);
		if (body.model in MODELS_TO_WARN_WITH_THINKING_ENABLED && body.thinking && body.thinking.type === "enabled") console.warn(`Using Claude with ${body.model} and 'thinking.type=enabled' is deprecated. Use 'thinking.type=adaptive' instead which results in better model performance in our testing: https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking`);
		let timeout = this._client._options.timeout;
		if (!body.stream && timeout == null) {
			const maxNonstreamingTokens = MODEL_NONSTREAMING_TOKENS[body.model] ?? void 0;
			timeout = this._client.calculateNonstreamingTimeout(body.max_tokens, maxNonstreamingTokens);
		}
		const helperHeader = stainlessHelperHeader(body.tools, body.messages);
		return this._client.post("/v1/messages", {
			body,
			timeout: timeout ?? 6e5,
			...options,
			headers: buildHeaders$1([helperHeader, options?.headers]),
			stream: body.stream ?? false
		});
	}
	/**
	* Send a structured list of input messages with text and/or image content, along with an expected `output_config.format` and
	* the response will be automatically parsed and available in the `parsed_output` property of the message.
	*
	* @example
	* ```ts
	* const message = await client.messages.parse({
	*   model: 'claude-sonnet-4-5-20250929',
	*   max_tokens: 1024,
	*   messages: [{ role: 'user', content: 'What is 2+2?' }],
	*   output_config: {
	*     format: zodOutputFormat(z.object({ answer: z.number() })),
	*   },
	* });
	*
	* console.log(message.parsed_output?.answer); // 4
	* ```
	*/
	parse(params, options) {
		return this.create(params, options).then((message) => parseMessage(message, params, { logger: this._client.logger ?? console }));
	}
	/**
	* Create a Message stream.
	*
	* If `output_config.format` is provided with a parseable format (like `zodOutputFormat()`),
	* the final message will include a `parsed_output` property with the parsed content.
	*
	* @example
	* ```ts
	* const stream = client.messages.stream({
	*   model: 'claude-sonnet-4-5-20250929',
	*   max_tokens: 1024,
	*   messages: [{ role: 'user', content: 'What is 2+2?' }],
	*   output_config: {
	*     format: zodOutputFormat(z.object({ answer: z.number() })),
	*   },
	* });
	*
	* const message = await stream.finalMessage();
	* console.log(message.parsed_output?.answer); // 4
	* ```
	*/
	stream(body, options) {
		return MessageStream.createMessage(this, body, options, { logger: this._client.logger ?? console });
	}
	/**
	* Count the number of tokens in a Message.
	*
	* The Token Count API can be used to count the number of tokens in a Message,
	* including tools, images, and documents, without creating it.
	*
	* Learn more about token counting in our
	* [user guide](https://docs.claude.com/en/docs/build-with-claude/token-counting)
	*
	* @example
	* ```ts
	* const messageTokensCount =
	*   await client.messages.countTokens({
	*     messages: [{ content: 'string', role: 'user' }],
	*     model: 'claude-opus-4-6',
	*   });
	* ```
	*/
	countTokens(body, options) {
		return this._client.post("/v1/messages/count_tokens", {
			body,
			...options
		});
	}
};
const DEPRECATED_MODELS = {
	"claude-1.3": "November 6th, 2024",
	"claude-1.3-100k": "November 6th, 2024",
	"claude-instant-1.1": "November 6th, 2024",
	"claude-instant-1.1-100k": "November 6th, 2024",
	"claude-instant-1.2": "November 6th, 2024",
	"claude-3-sonnet-20240229": "July 21st, 2025",
	"claude-3-opus-20240229": "January 5th, 2026",
	"claude-2.1": "July 21st, 2025",
	"claude-2.0": "July 21st, 2025",
	"claude-3-7-sonnet-latest": "February 19th, 2026",
	"claude-3-7-sonnet-20250219": "February 19th, 2026",
	"claude-3-5-haiku-latest": "February 19th, 2026",
	"claude-3-5-haiku-20241022": "February 19th, 2026"
};
const MODELS_TO_WARN_WITH_THINKING_ENABLED = ["claude-opus-4-6"];
Messages$2.Batches = Batches$1;
//#endregion
//#region node_modules/@anthropic-ai/sdk/resources/models.mjs
var Models$1 = class extends APIResource$1 {
	/**
	* Get a specific model.
	*
	* The Models API response can be used to determine information about a specific
	* model or resolve a model alias to a model ID.
	*/
	retrieve(modelID, params = {}, options) {
		const { betas } = params ?? {};
		return this._client.get(path$1`/v1/models/${modelID}`, {
			...options,
			headers: buildHeaders$1([{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 }, options?.headers])
		});
	}
	/**
	* List available models.
	*
	* The Models API response can be used to determine which models are available for
	* use in the API. More recently released models are listed first.
	*/
	list(params = {}, options) {
		const { betas, ...query } = params ?? {};
		return this._client.getAPIList("/v1/models", Page$1, {
			query,
			...options,
			headers: buildHeaders$1([{ ...betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0 }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/internal/utils/env.mjs
/**
* Read an environment variable.
*
* Trims beginning and trailing whitespace.
*
* Will return undefined if the environment variable doesn't exist or cannot be accessed.
*/
const readEnv$1 = (env) => {
	if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() ?? void 0;
	if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim();
};
//#endregion
//#region node_modules/@anthropic-ai/sdk/client.mjs
var _BaseAnthropic_instances, _a$2, _BaseAnthropic_encoder, _BaseAnthropic_baseURLOverridden;
const HUMAN_PROMPT = "\\n\\nHuman:";
const AI_PROMPT = "\\n\\nAssistant:";
/**
* Base class for Anthropic API clients.
*/
var BaseAnthropic = class {
	/**
	* API Client for interfacing with the Anthropic API.
	*
	* @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
	* @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
	* @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
	* @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
	* @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
	* @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
	* @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
	* @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
	* @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
	* @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
	*/
	constructor({ baseURL = readEnv$1("ANTHROPIC_BASE_URL"), apiKey = readEnv$1("ANTHROPIC_API_KEY") ?? null, authToken = readEnv$1("ANTHROPIC_AUTH_TOKEN") ?? null, ...opts } = {}) {
		_BaseAnthropic_instances.add(this);
		_BaseAnthropic_encoder.set(this, void 0);
		const options = {
			apiKey,
			authToken,
			...opts,
			baseURL: baseURL || `https://api.anthropic.com`
		};
		if (!options.dangerouslyAllowBrowser && isRunningInBrowser$1()) throw new AnthropicError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n");
		this.baseURL = options.baseURL;
		this.timeout = options.timeout ?? _a$2.DEFAULT_TIMEOUT;
		this.logger = options.logger ?? console;
		const defaultLogLevel = "warn";
		this.logLevel = defaultLogLevel;
		this.logLevel = parseLogLevel$1(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel$1(readEnv$1("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ?? defaultLogLevel;
		this.fetchOptions = options.fetchOptions;
		this.maxRetries = options.maxRetries ?? 2;
		this.fetch = options.fetch ?? getDefaultFetch$1();
		__classPrivateFieldSet$1(this, _BaseAnthropic_encoder, FallbackEncoder$1, "f");
		this._options = options;
		this.apiKey = typeof apiKey === "string" ? apiKey : null;
		this.authToken = authToken;
	}
	/**
	* Create a new client instance re-using the same options given to the current client with optional overriding.
	*/
	withOptions(options) {
		return new this.constructor({
			...this._options,
			baseURL: this.baseURL,
			maxRetries: this.maxRetries,
			timeout: this.timeout,
			logger: this.logger,
			logLevel: this.logLevel,
			fetch: this.fetch,
			fetchOptions: this.fetchOptions,
			apiKey: this.apiKey,
			authToken: this.authToken,
			...options
		});
	}
	defaultQuery() {
		return this._options.defaultQuery;
	}
	validateHeaders({ values, nulls }) {
		if (values.get("x-api-key") || values.get("authorization")) return;
		if (this.apiKey && values.get("x-api-key")) return;
		if (nulls.has("x-api-key")) return;
		if (this.authToken && values.get("authorization")) return;
		if (nulls.has("authorization")) return;
		throw new Error("Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the \"X-Api-Key\" or \"Authorization\" headers to be explicitly omitted");
	}
	async authHeaders(opts) {
		return buildHeaders$1([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
	}
	async apiKeyAuth(opts) {
		if (this.apiKey == null) return;
		return buildHeaders$1([{ "X-Api-Key": this.apiKey }]);
	}
	async bearerAuth(opts) {
		if (this.authToken == null) return;
		return buildHeaders$1([{ Authorization: `Bearer ${this.authToken}` }]);
	}
	/**
	* Basic re-implementation of `qs.stringify` for primitive types.
	*/
	stringifyQuery(query) {
		return stringifyQuery$1(query);
	}
	getUserAgent() {
		return `${this.constructor.name}/JS ${VERSION$1}`;
	}
	defaultIdempotencyKey() {
		return `stainless-node-retry-${uuid4$1()}`;
	}
	makeStatusError(status, error, message, headers) {
		return APIError$1.generate(status, error, message, headers);
	}
	buildURL(path, query, defaultBaseURL) {
		const baseURL = !__classPrivateFieldGet$1(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
		const url = isAbsoluteURL$1(path) ? new URL(path) : new URL(baseURL + (baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
		const defaultQuery = this.defaultQuery();
		const pathQuery = Object.fromEntries(url.searchParams);
		if (!isEmptyObj$1(defaultQuery) || !isEmptyObj$1(pathQuery)) query = {
			...pathQuery,
			...defaultQuery,
			...query
		};
		if (typeof query === "object" && query && !Array.isArray(query)) url.search = this.stringifyQuery(query);
		return url.toString();
	}
	_calculateNonstreamingTimeout(maxTokens) {
		const defaultTimeout = 600;
		if (3600 * maxTokens / 128e3 > defaultTimeout) throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details");
		return defaultTimeout * 1e3;
	}
	/**
	* Used as a callback for mutating the given `FinalRequestOptions` object.
	*/
	async prepareOptions(options) {}
	/**
	* Used as a callback for mutating the given `RequestInit` object.
	*
	* This is useful for cases where you want to add certain headers based off of
	* the request properties, e.g. `method` or `url`.
	*/
	async prepareRequest(request, { url, options }) {}
	get(path, opts) {
		return this.methodRequest("get", path, opts);
	}
	post(path, opts) {
		return this.methodRequest("post", path, opts);
	}
	patch(path, opts) {
		return this.methodRequest("patch", path, opts);
	}
	put(path, opts) {
		return this.methodRequest("put", path, opts);
	}
	delete(path, opts) {
		return this.methodRequest("delete", path, opts);
	}
	methodRequest(method, path, opts) {
		return this.request(Promise.resolve(opts).then((opts) => {
			return {
				method,
				path,
				...opts
			};
		}));
	}
	request(options, remainingRetries = null) {
		return new APIPromise$1(this, this.makeRequest(options, remainingRetries, void 0));
	}
	async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
		const options = await optionsInput;
		const maxRetries = options.maxRetries ?? this.maxRetries;
		if (retriesRemaining == null) retriesRemaining = maxRetries;
		await this.prepareOptions(options);
		const { req, url, timeout } = await this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });
		await this.prepareRequest(req, {
			url,
			options
		});
		/** Not an API request ID, just for correlating local log entries. */
		const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
		const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
		const startTime = Date.now();
		loggerFor$1(this).debug(`[${requestLogID}] sending request`, formatRequestDetails$1({
			retryOfRequestLogID,
			method: options.method,
			url,
			options,
			headers: req.headers
		}));
		if (options.signal?.aborted) throw new APIUserAbortError$1();
		const controller = new AbortController();
		const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError$1);
		const headersTime = Date.now();
		if (response instanceof globalThis.Error) {
			const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
			if (options.signal?.aborted) throw new APIUserAbortError$1();
			const isTimeout = isAbortError$1(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
			if (retriesRemaining) {
				loggerFor$1(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
				loggerFor$1(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails$1({
					retryOfRequestLogID,
					url,
					durationMs: headersTime - startTime,
					message: response.message
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
			}
			loggerFor$1(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
			loggerFor$1(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails$1({
				retryOfRequestLogID,
				url,
				durationMs: headersTime - startTime,
				message: response.message
			}));
			if (isTimeout) throw new APIConnectionTimeoutError$1();
			throw new APIConnectionError$1({ cause: response });
		}
		const responseInfo = `[${requestLogID}${retryLogStr}${[...response.headers.entries()].filter(([name]) => name === "request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("")}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
		if (!response.ok) {
			const shouldRetry = await this.shouldRetry(response);
			if (retriesRemaining && shouldRetry) {
				const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
				await CancelReadableStream$1(response.body);
				loggerFor$1(this).info(`${responseInfo} - ${retryMessage}`);
				loggerFor$1(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails$1({
					retryOfRequestLogID,
					url: response.url,
					status: response.status,
					headers: response.headers,
					durationMs: headersTime - startTime
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
			}
			const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
			loggerFor$1(this).info(`${responseInfo} - ${retryMessage}`);
			const errText = await response.text().catch((err) => castToError$1(err).message);
			const errJSON = safeJSON$1(errText);
			const errMessage = errJSON ? void 0 : errText;
			loggerFor$1(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails$1({
				retryOfRequestLogID,
				url: response.url,
				status: response.status,
				headers: response.headers,
				message: errMessage,
				durationMs: Date.now() - startTime
			}));
			throw this.makeStatusError(response.status, errJSON, errMessage, response.headers);
		}
		loggerFor$1(this).info(responseInfo);
		loggerFor$1(this).debug(`[${requestLogID}] response start`, formatRequestDetails$1({
			retryOfRequestLogID,
			url: response.url,
			status: response.status,
			headers: response.headers,
			durationMs: headersTime - startTime
		}));
		return {
			response,
			options,
			controller,
			requestLogID,
			retryOfRequestLogID,
			startTime
		};
	}
	getAPIList(path, Page, opts) {
		return this.requestAPIList(Page, opts && "then" in opts ? opts.then((opts) => ({
			method: "get",
			path,
			...opts
		})) : {
			method: "get",
			path,
			...opts
		});
	}
	requestAPIList(Page, options) {
		const request = this.makeRequest(options, null, void 0);
		return new PagePromise$1(this, request, Page);
	}
	async fetchWithTimeout(url, init, ms, controller) {
		const { signal, method, ...options } = init || {};
		const abort = this._makeAbort(controller);
		if (signal) signal.addEventListener("abort", abort, { once: true });
		const timeout = setTimeout(abort, ms);
		const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
		const fetchOptions = {
			signal: controller.signal,
			...isReadableBody ? { duplex: "half" } : {},
			method: "GET",
			...options
		};
		if (method) fetchOptions.method = method.toUpperCase();
		try {
			return await this.fetch.call(void 0, url, fetchOptions);
		} finally {
			clearTimeout(timeout);
		}
	}
	async shouldRetry(response) {
		const shouldRetryHeader = response.headers.get("x-should-retry");
		if (shouldRetryHeader === "true") return true;
		if (shouldRetryHeader === "false") return false;
		if (response.status === 408) return true;
		if (response.status === 409) return true;
		if (response.status === 429) return true;
		if (response.status >= 500) return true;
		return false;
	}
	async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
		let timeoutMillis;
		const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
		if (retryAfterMillisHeader) {
			const timeoutMs = parseFloat(retryAfterMillisHeader);
			if (!Number.isNaN(timeoutMs)) timeoutMillis = timeoutMs;
		}
		const retryAfterHeader = responseHeaders?.get("retry-after");
		if (retryAfterHeader && !timeoutMillis) {
			const timeoutSeconds = parseFloat(retryAfterHeader);
			if (!Number.isNaN(timeoutSeconds)) timeoutMillis = timeoutSeconds * 1e3;
			else timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
		}
		if (timeoutMillis === void 0) {
			const maxRetries = options.maxRetries ?? this.maxRetries;
			timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
		}
		await sleep$1(timeoutMillis);
		return this.makeRequest(options, retriesRemaining - 1, requestLogID);
	}
	calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
		const initialRetryDelay = .5;
		const maxRetryDelay = 8;
		const numRetries = maxRetries - retriesRemaining;
		return Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay) * (1 - Math.random() * .25) * 1e3;
	}
	calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
		const maxTime = 3600 * 1e3;
		const defaultTime = 600 * 1e3;
		if (maxTime * maxTokens / 128e3 > defaultTime || maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens) throw new AnthropicError("Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details");
		return defaultTime;
	}
	async buildRequest(inputOptions, { retryCount = 0 } = {}) {
		const options = { ...inputOptions };
		const { method, path, query, defaultBaseURL } = options;
		const url = this.buildURL(path, query, defaultBaseURL);
		if ("timeout" in options) validatePositiveInteger$1("timeout", options.timeout);
		options.timeout = options.timeout ?? this.timeout;
		const { bodyHeaders, body } = this.buildBody({ options });
		return {
			req: {
				method,
				headers: await this.buildHeaders({
					options: inputOptions,
					method,
					bodyHeaders,
					retryCount
				}),
				...options.signal && { signal: options.signal },
				...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
				...body && { body },
				...this.fetchOptions ?? {},
				...options.fetchOptions ?? {}
			},
			url,
			timeout: options.timeout
		};
	}
	async buildHeaders({ options, method, bodyHeaders, retryCount }) {
		let idempotencyHeaders = {};
		if (this.idempotencyHeader && method !== "get") {
			if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
			idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
		}
		const headers = buildHeaders$1([
			idempotencyHeaders,
			{
				Accept: "application/json",
				"User-Agent": this.getUserAgent(),
				"X-Stainless-Retry-Count": String(retryCount),
				...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
				...getPlatformHeaders$1(),
				...this._options.dangerouslyAllowBrowser ? { "anthropic-dangerous-direct-browser-access": "true" } : void 0,
				"anthropic-version": "2023-06-01"
			},
			await this.authHeaders(options),
			this._options.defaultHeaders,
			bodyHeaders,
			options.headers
		]);
		this.validateHeaders(headers);
		return headers.values;
	}
	_makeAbort(controller) {
		return () => controller.abort();
	}
	buildBody({ options: { body, headers: rawHeaders } }) {
		if (!body) return {
			bodyHeaders: void 0,
			body: void 0
		};
		const headers = buildHeaders$1([rawHeaders]);
		if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && headers.values.has("content-type") || globalThis.Blob && body instanceof globalThis.Blob || body instanceof FormData || body instanceof URLSearchParams || globalThis.ReadableStream && body instanceof globalThis.ReadableStream) return {
			bodyHeaders: void 0,
			body
		};
		else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) return {
			bodyHeaders: void 0,
			body: ReadableStreamFrom$1(body)
		};
		else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") return {
			bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
			body: this.stringifyQuery(body)
		};
		else return __classPrivateFieldGet$1(this, _BaseAnthropic_encoder, "f").call(this, {
			body,
			headers
		});
	}
};
_a$2 = BaseAnthropic, _BaseAnthropic_encoder = /* @__PURE__ */ new WeakMap(), _BaseAnthropic_instances = /* @__PURE__ */ new WeakSet(), _BaseAnthropic_baseURLOverridden = function _BaseAnthropic_baseURLOverridden() {
	return this.baseURL !== "https://api.anthropic.com";
};
BaseAnthropic.Anthropic = _a$2;
BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
BaseAnthropic.AI_PROMPT = AI_PROMPT;
BaseAnthropic.DEFAULT_TIMEOUT = 6e5;
BaseAnthropic.AnthropicError = AnthropicError;
BaseAnthropic.APIError = APIError$1;
BaseAnthropic.APIConnectionError = APIConnectionError$1;
BaseAnthropic.APIConnectionTimeoutError = APIConnectionTimeoutError$1;
BaseAnthropic.APIUserAbortError = APIUserAbortError$1;
BaseAnthropic.NotFoundError = NotFoundError$1;
BaseAnthropic.ConflictError = ConflictError$1;
BaseAnthropic.RateLimitError = RateLimitError$1;
BaseAnthropic.BadRequestError = BadRequestError$1;
BaseAnthropic.AuthenticationError = AuthenticationError$1;
BaseAnthropic.InternalServerError = InternalServerError$1;
BaseAnthropic.PermissionDeniedError = PermissionDeniedError$1;
BaseAnthropic.UnprocessableEntityError = UnprocessableEntityError$1;
BaseAnthropic.toFile = toFile$1;
/**
* API Client for interfacing with the Anthropic API.
*/
var Anthropic = class extends BaseAnthropic {
	constructor() {
		super(...arguments);
		this.completions = new Completions$2(this);
		this.messages = new Messages$2(this);
		this.models = new Models$1(this);
		this.beta = new Beta$1(this);
	}
};
Anthropic.Completions = Completions$2;
Anthropic.Messages = Messages$2;
Anthropic.Models = Models$1;
Anthropic.Beta = Beta$1;
//#endregion
//#region src/agents/provider-transport-fetch.ts
function buildManagedResponse(response, release) {
	if (!response.body) {
		release();
		return response;
	}
	const source = response.body;
	let reader;
	let released = false;
	const finalize = async () => {
		if (released) return;
		released = true;
		await release().catch(() => void 0);
	};
	const wrappedBody = new ReadableStream({
		start() {
			reader = source.getReader();
		},
		async pull(controller) {
			try {
				const chunk = await reader?.read();
				if (!chunk || chunk.done) {
					controller.close();
					await finalize();
					return;
				}
				controller.enqueue(chunk.value);
			} catch (error) {
				controller.error(error);
				await finalize();
			}
		},
		async cancel(reason) {
			try {
				await reader?.cancel(reason);
			} finally {
				await finalize();
			}
		}
	});
	return new Response(wrappedBody, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}
function resolveModelRequestPolicy(model) {
	return resolveProviderRequestPolicyConfig({
		provider: model.provider,
		api: model.api,
		baseUrl: model.baseUrl,
		capability: "llm",
		transport: "stream",
		request: getModelProviderRequestTransport(model)
	});
}
function buildGuardedModelFetch(model) {
	const requestConfig = resolveModelRequestPolicy(model);
	const dispatcherPolicy = buildProviderRequestDispatcherPolicy(requestConfig);
	return async (input, init) => {
		const request = input instanceof Request ? new Request(input, init) : void 0;
		const result = await fetchWithSsrFGuard({
			url: request?.url ?? (input instanceof URL ? input.toString() : typeof input === "string" ? input : (() => {
				throw new Error("Unsupported fetch input for transport-aware model request");
			})()),
			init: (request && {
				method: request.method,
				headers: request.headers,
				body: request.body ?? void 0,
				redirect: request.redirect,
				signal: request.signal,
				...request.body ? { duplex: "half" } : {}
			}) ?? init,
			dispatcherPolicy,
			...requestConfig.allowPrivateNetwork ? { policy: { allowPrivateNetwork: true } } : {}
		});
		return buildManagedResponse(result.response, result.release);
	};
}
//#endregion
//#region src/agents/transport-message-transform.ts
function transformTransportMessages(messages, model, normalizeToolCallId) {
	const toolCallIdMap = /* @__PURE__ */ new Map();
	const transformed = messages.map((msg) => {
		if (msg.role === "user") return msg;
		if (msg.role === "toolResult") {
			const normalizedId = toolCallIdMap.get(msg.toolCallId);
			return normalizedId && normalizedId !== msg.toolCallId ? {
				...msg,
				toolCallId: normalizedId
			} : msg;
		}
		if (msg.role !== "assistant") return msg;
		const isSameModel = msg.provider === model.provider && msg.api === model.api && msg.model === model.id;
		const content = [];
		for (const block of msg.content) {
			if (block.type === "thinking") {
				if (block.redacted) {
					if (isSameModel) content.push(block);
					continue;
				}
				if (isSameModel && block.thinkingSignature) {
					content.push(block);
					continue;
				}
				if (!block.thinking.trim()) continue;
				content.push(isSameModel ? block : {
					type: "text",
					text: block.thinking
				});
				continue;
			}
			if (block.type === "text") {
				content.push(isSameModel ? block : {
					type: "text",
					text: block.text
				});
				continue;
			}
			if (block.type !== "toolCall") {
				content.push(block);
				continue;
			}
			let normalizedToolCall = block;
			if (!isSameModel && block.thoughtSignature) {
				normalizedToolCall = { ...normalizedToolCall };
				delete normalizedToolCall.thoughtSignature;
			}
			if (!isSameModel && normalizeToolCallId) {
				const normalizedId = normalizeToolCallId(block.id, model, msg);
				if (normalizedId !== block.id) {
					toolCallIdMap.set(block.id, normalizedId);
					normalizedToolCall = {
						...normalizedToolCall,
						id: normalizedId
					};
				}
			}
			content.push(normalizedToolCall);
		}
		return {
			...msg,
			content
		};
	});
	const result = [];
	let pendingToolCalls = [];
	let existingToolResultIds = /* @__PURE__ */ new Set();
	for (const msg of transformed) {
		if (msg.role === "assistant") {
			if (pendingToolCalls.length > 0) {
				for (const toolCall of pendingToolCalls) if (!existingToolResultIds.has(toolCall.id)) result.push({
					role: "toolResult",
					toolCallId: toolCall.id,
					toolName: toolCall.name,
					content: [{
						type: "text",
						text: "No result provided"
					}],
					isError: true,
					timestamp: Date.now()
				});
				pendingToolCalls = [];
				existingToolResultIds = /* @__PURE__ */ new Set();
			}
			if (msg.stopReason === "error" || msg.stopReason === "aborted") continue;
			const toolCalls = msg.content.filter((block) => block.type === "toolCall");
			if (toolCalls.length > 0) {
				pendingToolCalls = toolCalls.map((block) => ({
					id: block.id,
					name: block.name
				}));
				existingToolResultIds = /* @__PURE__ */ new Set();
			}
			result.push(msg);
			continue;
		}
		if (msg.role === "toolResult") {
			existingToolResultIds.add(msg.toolCallId);
			result.push(msg);
			continue;
		}
		if (pendingToolCalls.length > 0) {
			for (const toolCall of pendingToolCalls) if (!existingToolResultIds.has(toolCall.id)) result.push({
				role: "toolResult",
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				content: [{
					type: "text",
					text: "No result provided"
				}],
				isError: true,
				timestamp: Date.now()
			});
			pendingToolCalls = [];
			existingToolResultIds = /* @__PURE__ */ new Set();
		}
		result.push(msg);
	}
	return result;
}
//#endregion
//#region src/agents/transport-stream-shared.ts
function sanitizeTransportPayloadText(text) {
	return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
function mergeTransportHeaders(...headerSources) {
	const merged = {};
	for (const headers of headerSources) if (headers) Object.assign(merged, headers);
	return Object.keys(merged).length > 0 ? merged : void 0;
}
function mergeTransportMetadata(payload, metadata) {
	if (!metadata || Object.keys(metadata).length === 0) return payload;
	const existingMetadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata) ? payload.metadata : void 0;
	return {
		...payload,
		metadata: {
			...existingMetadata,
			...metadata
		}
	};
}
function createEmptyTransportUsage() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0
		}
	};
}
function createWritableTransportEventStream() {
	const eventStream = createAssistantMessageEventStream();
	return {
		eventStream,
		stream: eventStream
	};
}
function finalizeTransportStream(params) {
	const { stream, output, signal } = params;
	if (signal?.aborted) throw new Error("Request was aborted");
	if (output.stopReason === "aborted" || output.stopReason === "error") throw new Error("An unknown error occurred");
	stream.push({
		type: "done",
		reason: output.stopReason,
		message: output
	});
	stream.end();
}
function failTransportStream(params) {
	const { stream, output, signal, error, cleanup } = params;
	cleanup?.();
	output.stopReason = signal?.aborted ? "aborted" : "error";
	output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
	stream.push({
		type: "error",
		reason: output.stopReason,
		error: output
	});
	stream.end();
}
//#endregion
//#region src/agents/anthropic-transport-stream.ts
const CLAUDE_CODE_VERSION = "2.1.75";
const CLAUDE_CODE_TOOL_LOOKUP = new Map([
	"Read",
	"Write",
	"Edit",
	"Bash",
	"Grep",
	"Glob",
	"AskUserQuestion",
	"EnterPlanMode",
	"ExitPlanMode",
	"KillShell",
	"NotebookEdit",
	"Skill",
	"Task",
	"TaskOutput",
	"TodoWrite",
	"WebFetch",
	"WebSearch"
].map((tool) => [tool.toLowerCase(), tool]));
function supportsAdaptiveThinking(modelId) {
	return modelId.includes("opus-4-6") || modelId.includes("opus-4.6") || modelId.includes("sonnet-4-6") || modelId.includes("sonnet-4.6");
}
function mapThinkingLevelToEffort(level, modelId) {
	switch (level) {
		case "minimal":
		case "low": return "low";
		case "medium": return "medium";
		case "xhigh": return modelId.includes("opus-4-6") || modelId.includes("opus-4.6") ? "max" : "high";
		default: return "high";
	}
}
function clampReasoningLevel(level) {
	return level === "xhigh" ? "high" : level;
}
function adjustMaxTokensForThinking(params) {
	const budgets = {
		minimal: 1024,
		low: 2048,
		medium: 8192,
		high: 16384,
		...params.customBudgets
	};
	const minOutputTokens = 1024;
	let thinkingBudget = budgets[clampReasoningLevel(params.reasoningLevel)];
	const maxTokens = Math.min(params.baseMaxTokens + thinkingBudget, params.modelMaxTokens);
	if (maxTokens <= thinkingBudget) thinkingBudget = Math.max(0, maxTokens - minOutputTokens);
	return {
		maxTokens,
		thinkingBudget
	};
}
function isAnthropicOAuthToken(apiKey) {
	return apiKey.includes("sk-ant-oat");
}
function toClaudeCodeName(name) {
	return CLAUDE_CODE_TOOL_LOOKUP.get(name.toLowerCase()) ?? name;
}
function fromClaudeCodeName(name, tools) {
	if (tools && tools.length > 0) {
		const lowerName = name.toLowerCase();
		const matchedTool = tools.find((tool) => tool.name.toLowerCase() === lowerName);
		if (matchedTool) return matchedTool.name;
	}
	return name;
}
function convertContentBlocks(content) {
	if (!content.some((item) => item.type === "image")) return sanitizeTransportPayloadText(content.map((item) => "text" in item ? item.text : "").join("\n"));
	const blocks = content.map((block) => {
		if (block.type === "text") return {
			type: "text",
			text: sanitizeTransportPayloadText(block.text)
		};
		return {
			type: "image",
			source: {
				type: "base64",
				media_type: block.mimeType,
				data: block.data
			}
		};
	});
	if (!blocks.some((block) => block.type === "text")) blocks.unshift({
		type: "text",
		text: "(see attached image)"
	});
	return blocks;
}
function normalizeToolCallId$1(id) {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
function convertAnthropicMessages(messages, model, isOAuthToken) {
	const params = [];
	const transformedMessages = transformTransportMessages(messages, model, normalizeToolCallId$1);
	for (let i = 0; i < transformedMessages.length; i += 1) {
		const msg = transformedMessages[i];
		if (msg.role === "user") {
			if (typeof msg.content === "string") {
				if (msg.content.trim().length > 0) params.push({
					role: "user",
					content: sanitizeTransportPayloadText(msg.content)
				});
				continue;
			}
			const blocks = msg.content.map((item) => item.type === "text" ? {
				type: "text",
				text: sanitizeTransportPayloadText(item.text)
			} : {
				type: "image",
				source: {
					type: "base64",
					media_type: item.mimeType,
					data: item.data
				}
			});
			let filteredBlocks = model.input.includes("image") ? blocks : blocks.filter((block) => block.type !== "image");
			filteredBlocks = filteredBlocks.filter((block) => block.type !== "text" || block.text.trim().length > 0);
			if (filteredBlocks.length === 0) continue;
			params.push({
				role: "user",
				content: filteredBlocks
			});
			continue;
		}
		if (msg.role === "assistant") {
			const blocks = [];
			for (const block of msg.content) {
				if (block.type === "text") {
					if (block.text.trim().length > 0) blocks.push({
						type: "text",
						text: sanitizeTransportPayloadText(block.text)
					});
					continue;
				}
				if (block.type === "thinking") {
					if (block.redacted) {
						blocks.push({
							type: "redacted_thinking",
							data: block.thinkingSignature
						});
						continue;
					}
					if (block.thinking.trim().length === 0) continue;
					if (!block.thinkingSignature || block.thinkingSignature.trim().length === 0) blocks.push({
						type: "text",
						text: sanitizeTransportPayloadText(block.thinking)
					});
					else blocks.push({
						type: "thinking",
						thinking: sanitizeTransportPayloadText(block.thinking),
						signature: block.thinkingSignature
					});
					continue;
				}
				if (block.type === "toolCall") blocks.push({
					type: "tool_use",
					id: block.id,
					name: isOAuthToken ? toClaudeCodeName(block.name) : block.name,
					input: block.arguments ?? {}
				});
			}
			if (blocks.length > 0) params.push({
				role: "assistant",
				content: blocks
			});
			continue;
		}
		if (msg.role === "toolResult") {
			const toolResult = msg;
			const toolResults = [{
				type: "tool_result",
				tool_use_id: toolResult.toolCallId,
				content: convertContentBlocks(toolResult.content),
				is_error: toolResult.isError
			}];
			let j = i + 1;
			while (j < transformedMessages.length && transformedMessages[j].role === "toolResult") {
				const nextMsg = transformedMessages[j];
				toolResults.push({
					type: "tool_result",
					tool_use_id: nextMsg.toolCallId,
					content: convertContentBlocks(nextMsg.content),
					is_error: nextMsg.isError
				});
				j += 1;
			}
			i = j - 1;
			params.push({
				role: "user",
				content: toolResults
			});
		}
	}
	return params;
}
function convertAnthropicTools(tools, isOAuthToken) {
	if (!tools) return [];
	return tools.map((tool) => ({
		name: isOAuthToken ? toClaudeCodeName(tool.name) : tool.name,
		description: tool.description,
		input_schema: {
			type: "object",
			properties: tool.parameters.properties || {},
			required: tool.parameters.required || []
		}
	}));
}
function mapStopReason$1(reason) {
	switch (reason) {
		case "end_turn": return "stop";
		case "max_tokens": return "length";
		case "tool_use": return "toolUse";
		case "pause_turn": return "stop";
		case "refusal":
		case "sensitive": return "error";
		case "stop_sequence": return "stop";
		default: throw new Error(`Unhandled stop reason: ${String(reason)}`);
	}
}
function createAnthropicTransportClient(params) {
	const { model, context, apiKey, options } = params;
	const needsInterleavedBeta = (options?.interleavedThinking ?? true) && !supportsAdaptiveThinking(model.id);
	const fetch = buildGuardedModelFetch(model);
	if (model.provider === "github-copilot") {
		const betaFeatures = needsInterleavedBeta ? ["interleaved-thinking-2025-05-14"] : [];
		return {
			client: new Anthropic({
				apiKey: null,
				authToken: apiKey,
				baseURL: model.baseUrl,
				dangerouslyAllowBrowser: true,
				defaultHeaders: mergeTransportHeaders({
					accept: "application/json",
					"anthropic-dangerous-direct-browser-access": "true",
					...betaFeatures.length > 0 ? { "anthropic-beta": betaFeatures.join(",") } : {}
				}, model.headers, buildCopilotDynamicHeaders({
					messages: context.messages,
					hasImages: hasCopilotVisionInput(context.messages)
				}), options?.headers),
				fetch
			}),
			isOAuthToken: false
		};
	}
	const betaFeatures = ["fine-grained-tool-streaming-2025-05-14"];
	if (needsInterleavedBeta) betaFeatures.push("interleaved-thinking-2025-05-14");
	if (isAnthropicOAuthToken(apiKey)) return {
		client: new Anthropic({
			apiKey: null,
			authToken: apiKey,
			baseURL: model.baseUrl,
			dangerouslyAllowBrowser: true,
			defaultHeaders: mergeTransportHeaders({
				accept: "application/json",
				"anthropic-dangerous-direct-browser-access": "true",
				"anthropic-beta": `claude-code-20250219,oauth-2025-04-20,${betaFeatures.join(",")}`,
				"user-agent": `claude-cli/${CLAUDE_CODE_VERSION}`,
				"x-app": "cli"
			}, model.headers, options?.headers),
			fetch
		}),
		isOAuthToken: true
	};
	return {
		client: new Anthropic({
			apiKey,
			baseURL: model.baseUrl,
			dangerouslyAllowBrowser: true,
			defaultHeaders: mergeTransportHeaders({
				accept: "application/json",
				"anthropic-dangerous-direct-browser-access": "true",
				"anthropic-beta": betaFeatures.join(",")
			}, model.headers, options?.headers),
			fetch
		}),
		isOAuthToken: false
	};
}
function buildAnthropicParams(model, context, isOAuthToken, options) {
	const payloadPolicy = resolveAnthropicPayloadPolicy({
		provider: model.provider,
		api: model.api,
		baseUrl: model.baseUrl,
		cacheRetention: options?.cacheRetention,
		enableCacheControl: true
	});
	const defaultMaxTokens = Math.min(model.maxTokens, 32e3);
	const params = {
		model: model.id,
		messages: convertAnthropicMessages(context.messages, model, isOAuthToken),
		max_tokens: options?.maxTokens || defaultMaxTokens,
		stream: true
	};
	if (isOAuthToken) params.system = [{
		type: "text",
		text: "You are Claude Code, Anthropic's official CLI for Claude."
	}, ...context.systemPrompt ? [{
		type: "text",
		text: sanitizeTransportPayloadText(context.systemPrompt)
	}] : []];
	else if (context.systemPrompt) params.system = [{
		type: "text",
		text: sanitizeTransportPayloadText(context.systemPrompt)
	}];
	if (options?.temperature !== void 0 && !options.thinkingEnabled) params.temperature = options.temperature;
	if (context.tools) params.tools = convertAnthropicTools(context.tools, isOAuthToken);
	if (model.reasoning) {
		if (options?.thinkingEnabled) if (supportsAdaptiveThinking(model.id)) {
			params.thinking = { type: "adaptive" };
			if (options.effort) params.output_config = { effort: options.effort };
		} else params.thinking = {
			type: "enabled",
			budget_tokens: options.thinkingBudgetTokens || 1024
		};
		else if (options?.thinkingEnabled === false) params.thinking = { type: "disabled" };
	}
	if (options?.metadata && typeof options.metadata.user_id === "string") params.metadata = { user_id: options.metadata.user_id };
	if (options?.toolChoice) params.tool_choice = typeof options.toolChoice === "string" ? { type: options.toolChoice } : options.toolChoice;
	applyAnthropicPayloadPolicyToParams(params, payloadPolicy);
	return params;
}
function resolveAnthropicTransportOptions(model, options, apiKey) {
	const baseMaxTokens = options?.maxTokens || Math.min(model.maxTokens, 32e3);
	const resolved = {
		temperature: options?.temperature,
		maxTokens: baseMaxTokens,
		signal: options?.signal,
		apiKey,
		cacheRetention: options?.cacheRetention,
		sessionId: options?.sessionId,
		headers: options?.headers,
		onPayload: options?.onPayload,
		maxRetryDelayMs: options?.maxRetryDelayMs,
		metadata: options?.metadata,
		interleavedThinking: options?.interleavedThinking,
		toolChoice: options?.toolChoice,
		thinkingBudgets: options?.thinkingBudgets,
		reasoning: options?.reasoning
	};
	if (!options?.reasoning) {
		resolved.thinkingEnabled = false;
		return resolved;
	}
	if (supportsAdaptiveThinking(model.id)) {
		resolved.thinkingEnabled = true;
		resolved.effort = mapThinkingLevelToEffort(options.reasoning, model.id);
		return resolved;
	}
	const adjusted = adjustMaxTokensForThinking({
		baseMaxTokens,
		modelMaxTokens: model.maxTokens,
		reasoningLevel: options.reasoning,
		customBudgets: options.thinkingBudgets
	});
	resolved.maxTokens = adjusted.maxTokens;
	resolved.thinkingEnabled = true;
	resolved.thinkingBudgetTokens = adjusted.thinkingBudget;
	return resolved;
}
function createAnthropicMessagesTransportStreamFn() {
	return (rawModel, context, rawOptions) => {
		const model = rawModel;
		const options = rawOptions;
		const { eventStream, stream } = createWritableTransportEventStream();
		(async () => {
			const output = {
				role: "assistant",
				content: [],
				api: "anthropic-messages",
				provider: model.provider,
				model: model.id,
				usage: createEmptyTransportUsage(),
				stopReason: "stop",
				timestamp: Date.now()
			};
			try {
				const apiKey = options?.apiKey ?? getEnvApiKey(model.provider) ?? "";
				if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);
				const transportOptions = resolveAnthropicTransportOptions(model, options, apiKey);
				const { client, isOAuthToken } = createAnthropicTransportClient({
					model,
					context,
					apiKey,
					options: transportOptions
				});
				let params = buildAnthropicParams(model, context, isOAuthToken, transportOptions);
				const nextParams = await transportOptions.onPayload?.(params, model);
				if (nextParams !== void 0) params = nextParams;
				const anthropicStream = client.messages.stream({
					...params,
					stream: true
				}, transportOptions.signal ? { signal: transportOptions.signal } : void 0);
				stream.push({
					type: "start",
					partial: output
				});
				const blocks = output.content;
				for await (const event of anthropicStream) {
					if (event.type === "message_start") {
						const message = event.message;
						const usage = message?.usage ?? {};
						output.responseId = typeof message?.id === "string" ? message.id : void 0;
						output.usage.input = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
						output.usage.output = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
						output.usage.cacheRead = typeof usage.cache_read_input_tokens === "number" ? usage.cache_read_input_tokens : 0;
						output.usage.cacheWrite = typeof usage.cache_creation_input_tokens === "number" ? usage.cache_creation_input_tokens : 0;
						output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
						calculateCost(model, output.usage);
						continue;
					}
					if (event.type === "content_block_start") {
						const contentBlock = event.content_block;
						const index = typeof event.index === "number" ? event.index : -1;
						if (contentBlock?.type === "text") {
							const block = {
								type: "text",
								text: "",
								index
							};
							output.content.push(block);
							stream.push({
								type: "text_start",
								contentIndex: output.content.length - 1,
								partial: output
							});
							continue;
						}
						if (contentBlock?.type === "thinking") {
							const block = {
								type: "thinking",
								thinking: "",
								thinkingSignature: "",
								index
							};
							output.content.push(block);
							stream.push({
								type: "thinking_start",
								contentIndex: output.content.length - 1,
								partial: output
							});
							continue;
						}
						if (contentBlock?.type === "redacted_thinking") {
							const block = {
								type: "thinking",
								thinking: "[Reasoning redacted]",
								thinkingSignature: typeof contentBlock.data === "string" ? contentBlock.data : "",
								redacted: true,
								index
							};
							output.content.push(block);
							stream.push({
								type: "thinking_start",
								contentIndex: output.content.length - 1,
								partial: output
							});
							continue;
						}
						if (contentBlock?.type === "tool_use") {
							const block = {
								type: "toolCall",
								id: typeof contentBlock.id === "string" ? contentBlock.id : "",
								name: typeof contentBlock.name === "string" ? isOAuthToken ? fromClaudeCodeName(contentBlock.name, context.tools) : contentBlock.name : "",
								arguments: contentBlock.input && typeof contentBlock.input === "object" ? contentBlock.input : {},
								partialJson: "",
								index
							};
							output.content.push(block);
							stream.push({
								type: "toolcall_start",
								contentIndex: output.content.length - 1,
								partial: output
							});
						}
						continue;
					}
					if (event.type === "content_block_delta") {
						const index = blocks.findIndex((block) => block.index === event.index);
						const block = blocks[index];
						const delta = event.delta;
						if (block?.type === "text" && delta?.type === "text_delta" && typeof delta.text === "string") {
							block.text += delta.text;
							stream.push({
								type: "text_delta",
								contentIndex: index,
								delta: delta.text,
								partial: output
							});
							continue;
						}
						if (block?.type === "thinking" && delta?.type === "thinking_delta" && typeof delta.thinking === "string") {
							block.thinking += delta.thinking;
							stream.push({
								type: "thinking_delta",
								contentIndex: index,
								delta: delta.thinking,
								partial: output
							});
							continue;
						}
						if (block?.type === "toolCall" && delta?.type === "input_json_delta" && typeof delta.partial_json === "string") {
							block.partialJson += delta.partial_json;
							block.arguments = parseStreamingJson(block.partialJson);
							stream.push({
								type: "toolcall_delta",
								contentIndex: index,
								delta: delta.partial_json,
								partial: output
							});
							continue;
						}
						if (block?.type === "thinking" && delta?.type === "signature_delta" && typeof delta.signature === "string") block.thinkingSignature = `${String(block.thinkingSignature ?? "")}${delta.signature}`;
						continue;
					}
					if (event.type === "content_block_stop") {
						const index = blocks.findIndex((block) => block.index === event.index);
						const block = blocks[index];
						if (!block) continue;
						delete block.index;
						if (block.type === "text") {
							stream.push({
								type: "text_end",
								contentIndex: index,
								content: block.text,
								partial: output
							});
							continue;
						}
						if (block.type === "thinking") {
							stream.push({
								type: "thinking_end",
								contentIndex: index,
								content: block.thinking,
								partial: output
							});
							continue;
						}
						if (block.type === "toolCall") {
							if (typeof block.partialJson === "string" && block.partialJson.length > 0) block.arguments = parseStreamingJson(block.partialJson);
							delete block.partialJson;
							stream.push({
								type: "toolcall_end",
								contentIndex: index,
								toolCall: block,
								partial: output
							});
						}
						continue;
					}
					if (event.type === "message_delta") {
						const delta = event.delta;
						const usage = event.usage;
						if (delta?.stop_reason) output.stopReason = mapStopReason$1(delta.stop_reason);
						if (typeof usage?.input_tokens === "number") output.usage.input = usage.input_tokens;
						if (typeof usage?.output_tokens === "number") output.usage.output = usage.output_tokens;
						if (typeof usage?.cache_read_input_tokens === "number") output.usage.cacheRead = usage.cache_read_input_tokens;
						if (typeof usage?.cache_creation_input_tokens === "number") output.usage.cacheWrite = usage.cache_creation_input_tokens;
						output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite;
						calculateCost(model, output.usage);
					}
				}
				finalizeTransportStream({
					stream,
					output,
					signal: transportOptions.signal
				});
			} catch (error) {
				failTransportStream({
					stream,
					output,
					signal: options?.signal,
					error,
					cleanup: () => {
						for (const block of output.content) delete block.index;
					}
				});
			}
		})();
		return eventStream;
	};
}
//#endregion
//#region src/agents/google-transport-stream.ts
let toolCallCounter = 0;
function isGemini3ProModel(modelId) {
	return /gemini-3(?:\.\d+)?-pro/.test(modelId.toLowerCase());
}
function isGemini3FlashModel(modelId) {
	return /gemini-3(?:\.\d+)?-flash/.test(modelId.toLowerCase());
}
function requiresToolCallId(modelId) {
	return modelId.startsWith("claude-") || modelId.startsWith("gpt-oss-");
}
function supportsMultimodalFunctionResponse(modelId) {
	const match = modelId.toLowerCase().match(/^gemini(?:-live)?-(\d+)/);
	if (!match) return true;
	return Number.parseInt(match[1] ?? "", 10) >= 3;
}
function retainThoughtSignature(existing, incoming) {
	if (typeof incoming === "string" && incoming.length > 0) return incoming;
	return existing;
}
function mapToolChoice(choice) {
	if (!choice) return;
	if (typeof choice === "object" && choice.type === "function") return {
		mode: "ANY",
		allowedFunctionNames: [choice.function.name]
	};
	switch (choice) {
		case "none": return { mode: "NONE" };
		case "any":
		case "required": return { mode: "ANY" };
		default: return { mode: "AUTO" };
	}
}
function mapStopReasonString(reason) {
	switch (reason) {
		case "STOP": return "stop";
		case "MAX_TOKENS": return "length";
		default: return "error";
	}
}
function normalizeToolCallId(id) {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}
function resolveGoogleModelPath(modelId) {
	if (modelId.startsWith("models/") || modelId.startsWith("tunedModels/")) return modelId;
	return `models/${modelId}`;
}
function buildGoogleRequestUrl(model) {
	return `${normalizeGoogleApiBaseUrl(model.baseUrl)}/${resolveGoogleModelPath(model.id)}:streamGenerateContent?alt=sse`;
}
function resolveThinkingLevel(level, modelId) {
	if (isGemini3ProModel(modelId)) switch (level) {
		case "minimal":
		case "low": return "LOW";
		case "medium":
		case "high":
		case "xhigh": return "HIGH";
	}
	switch (level) {
		case "minimal": return "MINIMAL";
		case "low": return "LOW";
		case "medium": return "MEDIUM";
		case "high":
		case "xhigh": return "HIGH";
	}
}
function getDisabledThinkingConfig(modelId) {
	if (isGemini3ProModel(modelId)) return { thinkingLevel: "LOW" };
	if (isGemini3FlashModel(modelId)) return { thinkingLevel: "MINIMAL" };
	return { thinkingBudget: 0 };
}
function getGoogleThinkingBudget(modelId, effort, customBudgets) {
	const normalizedEffort = effort === "xhigh" ? "high" : effort;
	if (customBudgets?.[normalizedEffort] !== void 0) return customBudgets[normalizedEffort];
	if (modelId.includes("2.5-pro")) return {
		minimal: 128,
		low: 2048,
		medium: 8192,
		high: 32768
	}[normalizedEffort];
	if (modelId.includes("2.5-flash")) return {
		minimal: 128,
		low: 2048,
		medium: 8192,
		high: 24576
	}[normalizedEffort];
}
function resolveGoogleThinkingConfig(model, options) {
	if (!model.reasoning) return;
	if (options?.thinking) {
		if (!options.thinking.enabled) return getDisabledThinkingConfig(model.id);
		const config = { includeThoughts: true };
		if (options.thinking.level) config.thinkingLevel = options.thinking.level;
		else if (typeof options.thinking.budgetTokens === "number") config.thinkingBudget = options.thinking.budgetTokens;
		return config;
	}
	if (!options?.reasoning) return getDisabledThinkingConfig(model.id);
	if (isGemini3ProModel(model.id) || isGemini3FlashModel(model.id)) return {
		includeThoughts: true,
		thinkingLevel: resolveThinkingLevel(options.reasoning, model.id)
	};
	const budget = getGoogleThinkingBudget(model.id, options.reasoning, options.thinkingBudgets);
	return {
		includeThoughts: true,
		...typeof budget === "number" ? { thinkingBudget: budget } : {}
	};
}
function convertGoogleMessages(model, context) {
	const contents = [];
	const transformedMessages = transformTransportMessages(context.messages, model, (id) => requiresToolCallId(model.id) ? normalizeToolCallId(id) : id);
	for (const msg of transformedMessages) {
		if (msg.role === "user") {
			if (typeof msg.content === "string") {
				contents.push({
					role: "user",
					parts: [{ text: sanitizeTransportPayloadText(msg.content) }]
				});
				continue;
			}
			const parts = msg.content.map((item) => item.type === "text" ? { text: sanitizeTransportPayloadText(item.text) } : { inlineData: {
				mimeType: item.mimeType,
				data: item.data
			} }).filter((item) => model.input.includes("image") || !("inlineData" in item));
			if (parts.length > 0) contents.push({
				role: "user",
				parts
			});
			continue;
		}
		if (msg.role === "assistant") {
			const isSameProviderAndModel = msg.provider === model.provider && msg.model === model.id;
			const parts = [];
			for (const block of msg.content) {
				if (block.type === "text") {
					if (!block.text.trim()) continue;
					parts.push({
						text: sanitizeTransportPayloadText(block.text),
						...isSameProviderAndModel && block.textSignature ? { thoughtSignature: block.textSignature } : {}
					});
					continue;
				}
				if (block.type === "thinking") {
					if (!block.thinking.trim()) continue;
					if (isSameProviderAndModel) parts.push({
						thought: true,
						text: sanitizeTransportPayloadText(block.thinking),
						...block.thinkingSignature ? { thoughtSignature: block.thinkingSignature } : {}
					});
					else parts.push({ text: sanitizeTransportPayloadText(block.thinking) });
					continue;
				}
				if (block.type === "toolCall") parts.push({
					functionCall: {
						name: block.name,
						args: block.arguments ?? {},
						...requiresToolCallId(model.id) ? { id: block.id } : {}
					},
					...isSameProviderAndModel && block.thoughtSignature ? { thoughtSignature: block.thoughtSignature } : {}
				});
			}
			if (parts.length > 0) contents.push({
				role: "model",
				parts
			});
			continue;
		}
		if (msg.role === "toolResult") {
			const textResult = msg.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
			const imageContent = model.input.includes("image") ? msg.content.filter((item) => item.type === "image") : [];
			const responseValue = textResult ? sanitizeTransportPayloadText(textResult) : imageContent.length > 0 ? "(see attached image)" : "";
			const imageParts = imageContent.map((imageBlock) => ({ inlineData: {
				mimeType: imageBlock.mimeType,
				data: imageBlock.data
			} }));
			const functionResponse = { functionResponse: {
				name: msg.toolName,
				response: msg.isError ? { error: responseValue } : { output: responseValue },
				...supportsMultimodalFunctionResponse(model.id) && imageParts.length > 0 ? { parts: imageParts } : {},
				...requiresToolCallId(model.id) ? { id: msg.toolCallId } : {}
			} };
			const last = contents[contents.length - 1];
			if (last?.role === "user" && Array.isArray(last.parts) && last.parts.some((part) => "functionResponse" in part)) last.parts.push(functionResponse);
			else contents.push({
				role: "user",
				parts: [functionResponse]
			});
			if (imageParts.length > 0 && !supportsMultimodalFunctionResponse(model.id)) contents.push({
				role: "user",
				parts: [{ text: "Tool result image:" }, ...imageParts]
			});
		}
	}
	return contents;
}
function convertGoogleTools(tools) {
	if (tools.length === 0) return;
	return [{ functionDeclarations: tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		parametersJsonSchema: tool.parameters
	})) }];
}
function buildGoogleGenerativeAiParams(model, context, options) {
	const generationConfig = {};
	if (typeof options?.temperature === "number") generationConfig.temperature = options.temperature;
	if (typeof options?.maxTokens === "number") generationConfig.maxOutputTokens = options.maxTokens;
	const thinkingConfig = resolveGoogleThinkingConfig(model, options);
	if (thinkingConfig) generationConfig.thinkingConfig = thinkingConfig;
	const params = { contents: convertGoogleMessages(model, context) };
	if (typeof options?.cachedContent === "string" && options.cachedContent.trim()) params.cachedContent = options.cachedContent.trim();
	if (Object.keys(generationConfig).length > 0) params.generationConfig = generationConfig;
	if (context.systemPrompt) params.systemInstruction = { parts: [{ text: sanitizeTransportPayloadText(stripSystemPromptCacheBoundary(context.systemPrompt)) }] };
	if (context.tools?.length) {
		params.tools = convertGoogleTools(context.tools);
		const toolChoice = mapToolChoice(options?.toolChoice);
		if (toolChoice) params.toolConfig = { functionCallingConfig: toolChoice };
	}
	return params;
}
function buildGoogleHeaders(model, apiKey, optionHeaders) {
	return mergeTransportHeaders({ accept: "text/event-stream" }, apiKey ? parseGeminiAuth(apiKey).headers : void 0, model.headers, optionHeaders) ?? { accept: "text/event-stream" };
}
async function* parseGoogleSseChunks(response, signal) {
	if (!response.body) throw new Error("No response body");
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const abortHandler = () => {
		reader.cancel().catch(() => void 0);
	};
	signal?.addEventListener("abort", abortHandler);
	try {
		while (true) {
			if (signal?.aborted) throw new Error("Request was aborted");
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true }).replace(/\r/g, "");
			let boundary = buffer.indexOf("\n\n");
			while (boundary >= 0) {
				const rawEvent = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				boundary = buffer.indexOf("\n\n");
				const data = rawEvent.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
				if (!data || data === "[DONE]") continue;
				yield JSON.parse(data);
			}
		}
	} finally {
		signal?.removeEventListener("abort", abortHandler);
	}
}
function updateUsage(output, model, chunk) {
	const usage = chunk.usageMetadata;
	if (!usage) return;
	const promptTokens = usage.promptTokenCount || 0;
	const cacheRead = usage.cachedContentTokenCount || 0;
	output.usage = {
		input: Math.max(0, promptTokens - cacheRead),
		output: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0),
		cacheRead,
		cacheWrite: 0,
		totalTokens: usage.totalTokenCount || 0,
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0
		}
	};
	calculateCost(model, output.usage);
}
function pushTextBlockEnd(stream, output, blockIndex) {
	const block = output.content[blockIndex];
	if (!block) return;
	if (block.type === "thinking") {
		stream.push({
			type: "thinking_end",
			contentIndex: blockIndex,
			content: block.thinking,
			partial: output
		});
		return;
	}
	if (block.type === "text") stream.push({
		type: "text_end",
		contentIndex: blockIndex,
		content: block.text,
		partial: output
	});
}
function createGoogleGenerativeAiTransportStreamFn() {
	return (rawModel, context, rawOptions) => {
		const model = rawModel;
		const options = rawOptions;
		const { eventStream, stream } = createWritableTransportEventStream();
		(async () => {
			const output = {
				role: "assistant",
				content: [],
				api: "google-generative-ai",
				provider: model.provider,
				model: model.id,
				usage: createEmptyTransportUsage(),
				stopReason: "stop",
				timestamp: Date.now()
			};
			try {
				const apiKey = options?.apiKey ?? getEnvApiKey(model.provider) ?? void 0;
				const fetch = buildGuardedModelFetch(model);
				let params = buildGoogleGenerativeAiParams(model, context, options);
				const nextParams = await options?.onPayload?.(params, model);
				if (nextParams !== void 0) params = nextParams;
				const response = await fetch(buildGoogleRequestUrl(model), {
					method: "POST",
					headers: buildGoogleHeaders(model, apiKey, options?.headers),
					body: JSON.stringify(params),
					signal: options?.signal
				});
				if (!response.ok) {
					const message = await response.text().catch(() => "");
					throw new Error(`Google Generative AI API error (${response.status}): ${message}`);
				}
				stream.push({
					type: "start",
					partial: output
				});
				let currentBlockIndex = -1;
				for await (const chunk of parseGoogleSseChunks(response, options?.signal)) {
					output.responseId ||= chunk.responseId;
					updateUsage(output, model, chunk);
					const candidate = chunk.candidates?.[0];
					if (candidate?.content?.parts) for (const part of candidate.content.parts) {
						if (typeof part.text === "string") {
							const isThinking = part.thought === true;
							const currentBlock = output.content[currentBlockIndex];
							if (currentBlockIndex < 0 || !currentBlock || isThinking && currentBlock.type !== "thinking" || !isThinking && currentBlock.type !== "text") {
								if (currentBlockIndex >= 0) pushTextBlockEnd(stream, output, currentBlockIndex);
								if (isThinking) {
									output.content.push({
										type: "thinking",
										thinking: ""
									});
									currentBlockIndex = output.content.length - 1;
									stream.push({
										type: "thinking_start",
										contentIndex: currentBlockIndex,
										partial: output
									});
								} else {
									output.content.push({
										type: "text",
										text: ""
									});
									currentBlockIndex = output.content.length - 1;
									stream.push({
										type: "text_start",
										contentIndex: currentBlockIndex,
										partial: output
									});
								}
							}
							const activeBlock = output.content[currentBlockIndex];
							if (activeBlock?.type === "thinking") {
								activeBlock.thinking += part.text;
								activeBlock.thinkingSignature = retainThoughtSignature(activeBlock.thinkingSignature, part.thoughtSignature);
								stream.push({
									type: "thinking_delta",
									contentIndex: currentBlockIndex,
									delta: part.text,
									partial: output
								});
							} else if (activeBlock?.type === "text") {
								activeBlock.text += part.text;
								activeBlock.textSignature = retainThoughtSignature(activeBlock.textSignature, part.thoughtSignature);
								stream.push({
									type: "text_delta",
									contentIndex: currentBlockIndex,
									delta: part.text,
									partial: output
								});
							}
						}
						if (part.functionCall) {
							if (currentBlockIndex >= 0) {
								pushTextBlockEnd(stream, output, currentBlockIndex);
								currentBlockIndex = -1;
							}
							const providedId = part.functionCall.id;
							const isDuplicate = output.content.some((block) => block.type === "toolCall" && block.id === providedId);
							const toolCall = {
								type: "toolCall",
								id: providedId && !isDuplicate ? providedId : `${part.functionCall.name || "tool"}_${Date.now()}_${++toolCallCounter}`,
								name: part.functionCall.name || "",
								arguments: part.functionCall.args ?? {}
							};
							output.content.push(toolCall);
							const blockIndex = output.content.length - 1;
							stream.push({
								type: "toolcall_start",
								contentIndex: blockIndex,
								partial: output
							});
							stream.push({
								type: "toolcall_delta",
								contentIndex: blockIndex,
								delta: JSON.stringify(toolCall.arguments),
								partial: output
							});
							stream.push({
								type: "toolcall_end",
								contentIndex: blockIndex,
								toolCall,
								partial: output
							});
						}
					}
					if (typeof candidate?.finishReason === "string") {
						output.stopReason = mapStopReasonString(candidate.finishReason);
						if (output.content.some((block) => block.type === "toolCall")) output.stopReason = "toolUse";
					}
				}
				if (currentBlockIndex >= 0) pushTextBlockEnd(stream, output, currentBlockIndex);
				finalizeTransportStream({
					stream,
					output,
					signal: options?.signal
				});
			} catch (error) {
				failTransportStream({
					stream,
					output,
					signal: options?.signal,
					error
				});
			}
		})();
		return eventStream;
	};
}
//#endregion
//#region node_modules/openai/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
	if (kind === "m") throw new TypeError("Private method is not writable");
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
	return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
	if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
	if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
	return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
//#endregion
//#region node_modules/openai/internal/utils/uuid.mjs
/**
* https://stackoverflow.com/a/2117523
*/
let uuid4 = function() {
	const { crypto } = globalThis;
	if (crypto?.randomUUID) {
		uuid4 = crypto.randomUUID.bind(crypto);
		return crypto.randomUUID();
	}
	const u8 = new Uint8Array(1);
	const randomByte = crypto ? () => crypto.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};
//#endregion
//#region node_modules/openai/internal/errors.mjs
function isAbortError(err) {
	return typeof err === "object" && err !== null && ("name" in err && err.name === "AbortError" || "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
const castToError = (err) => {
	if (err instanceof Error) return err;
	if (typeof err === "object" && err !== null) {
		try {
			if (Object.prototype.toString.call(err) === "[object Error]") {
				const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
				if (err.stack) error.stack = err.stack;
				if (err.cause && !error.cause) error.cause = err.cause;
				if (err.name) error.name = err.name;
				return error;
			}
		} catch {}
		try {
			return new Error(JSON.stringify(err));
		} catch {}
	}
	return new Error(err);
};
//#endregion
//#region node_modules/openai/core/error.mjs
var OpenAIError = class extends Error {};
var APIError = class APIError extends OpenAIError {
	constructor(status, error, message, headers) {
		super(`${APIError.makeMessage(status, error, message)}`);
		this.status = status;
		this.headers = headers;
		this.requestID = headers?.get("x-request-id");
		this.error = error;
		const data = error;
		this.code = data?.["code"];
		this.param = data?.["param"];
		this.type = data?.["type"];
	}
	static makeMessage(status, error, message) {
		const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
		if (status && msg) return `${status} ${msg}`;
		if (status) return `${status} status code (no body)`;
		if (msg) return msg;
		return "(no status code or body)";
	}
	static generate(status, errorResponse, message, headers) {
		if (!status || !headers) return new APIConnectionError({
			message,
			cause: castToError(errorResponse)
		});
		const error = errorResponse?.["error"];
		if (status === 400) return new BadRequestError(status, error, message, headers);
		if (status === 401) return new AuthenticationError(status, error, message, headers);
		if (status === 403) return new PermissionDeniedError(status, error, message, headers);
		if (status === 404) return new NotFoundError(status, error, message, headers);
		if (status === 409) return new ConflictError(status, error, message, headers);
		if (status === 422) return new UnprocessableEntityError(status, error, message, headers);
		if (status === 429) return new RateLimitError(status, error, message, headers);
		if (status >= 500) return new InternalServerError(status, error, message, headers);
		return new APIError(status, error, message, headers);
	}
};
var APIUserAbortError = class extends APIError {
	constructor({ message } = {}) {
		super(void 0, void 0, message || "Request was aborted.", void 0);
	}
};
var APIConnectionError = class extends APIError {
	constructor({ message, cause }) {
		super(void 0, void 0, message || "Connection error.", void 0);
		if (cause) this.cause = cause;
	}
};
var APIConnectionTimeoutError = class extends APIConnectionError {
	constructor({ message } = {}) {
		super({ message: message ?? "Request timed out." });
	}
};
var BadRequestError = class extends APIError {};
var AuthenticationError = class extends APIError {};
var PermissionDeniedError = class extends APIError {};
var NotFoundError = class extends APIError {};
var ConflictError = class extends APIError {};
var UnprocessableEntityError = class extends APIError {};
var RateLimitError = class extends APIError {};
var InternalServerError = class extends APIError {};
var LengthFinishReasonError = class extends OpenAIError {
	constructor() {
		super(`Could not parse response content as the length limit was reached`);
	}
};
var ContentFilterFinishReasonError = class extends OpenAIError {
	constructor() {
		super(`Could not parse response content as the request was rejected by the content filter`);
	}
};
var InvalidWebhookSignatureError = class extends Error {
	constructor(message) {
		super(message);
	}
};
//#endregion
//#region node_modules/openai/internal/utils/values.mjs
const startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
const isAbsoluteURL = (url) => {
	return startsWithSchemeRegexp.test(url);
};
let isArray = (val) => (isArray = Array.isArray, isArray(val));
let isReadonlyArray = isArray;
/** Returns an object if the given value isn't an object, otherwise returns as-is */
function maybeObj(x) {
	if (typeof x !== "object") return {};
	return x ?? {};
}
function isEmptyObj(obj) {
	if (!obj) return true;
	for (const _k in obj) return false;
	return true;
}
function hasOwn(obj, key) {
	return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
	return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
const validatePositiveInteger = (name, n) => {
	if (typeof n !== "number" || !Number.isInteger(n)) throw new OpenAIError(`${name} must be an integer`);
	if (n < 0) throw new OpenAIError(`${name} must be a positive integer`);
	return n;
};
const safeJSON = (text) => {
	try {
		return JSON.parse(text);
	} catch (err) {
		return;
	}
};
//#endregion
//#region node_modules/openai/internal/utils/sleep.mjs
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
//#endregion
//#region node_modules/openai/version.mjs
const VERSION = "6.26.0";
//#endregion
//#region node_modules/openai/internal/detect-platform.mjs
const isRunningInBrowser = () => {
	return typeof window !== "undefined" && typeof window.document !== "undefined" && typeof navigator !== "undefined";
};
/**
* Note this does not detect 'browser'; for that, use getBrowserInfo().
*/
function getDetectedPlatform() {
	if (typeof Deno !== "undefined" && Deno.build != null) return "deno";
	if (typeof EdgeRuntime !== "undefined") return "edge";
	if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") return "node";
	return "unknown";
}
const getPlatformProperties = () => {
	const detectedPlatform = getDetectedPlatform();
	if (detectedPlatform === "deno") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": normalizePlatform(Deno.build.os),
		"X-Stainless-Arch": normalizeArch(Deno.build.arch),
		"X-Stainless-Runtime": "deno",
		"X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
	};
	if (typeof EdgeRuntime !== "undefined") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": `other:${EdgeRuntime}`,
		"X-Stainless-Runtime": "edge",
		"X-Stainless-Runtime-Version": globalThis.process.version
	};
	if (detectedPlatform === "node") return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
		"X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
		"X-Stainless-Runtime": "node",
		"X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
	};
	const browserInfo = getBrowserInfo();
	if (browserInfo) return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": `browser:${browserInfo.browser}`,
		"X-Stainless-Runtime-Version": browserInfo.version
	};
	return {
		"X-Stainless-Lang": "js",
		"X-Stainless-Package-Version": VERSION,
		"X-Stainless-OS": "Unknown",
		"X-Stainless-Arch": "unknown",
		"X-Stainless-Runtime": "unknown",
		"X-Stainless-Runtime-Version": "unknown"
	};
};
function getBrowserInfo() {
	if (typeof navigator === "undefined" || !navigator) return null;
	for (const { key, pattern } of [
		{
			key: "edge",
			pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "ie",
			pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "chrome",
			pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "firefox",
			pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
		},
		{
			key: "safari",
			pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
		}
	]) {
		const match = pattern.exec(navigator.userAgent);
		if (match) return {
			browser: key,
			version: `${match[1] || 0}.${match[2] || 0}.${match[3] || 0}`
		};
	}
	return null;
}
const normalizeArch = (arch) => {
	if (arch === "x32") return "x32";
	if (arch === "x86_64" || arch === "x64") return "x64";
	if (arch === "arm") return "arm";
	if (arch === "aarch64" || arch === "arm64") return "arm64";
	if (arch) return `other:${arch}`;
	return "unknown";
};
const normalizePlatform = (platform) => {
	platform = platform.toLowerCase();
	if (platform.includes("ios")) return "iOS";
	if (platform === "android") return "Android";
	if (platform === "darwin") return "MacOS";
	if (platform === "win32") return "Windows";
	if (platform === "freebsd") return "FreeBSD";
	if (platform === "openbsd") return "OpenBSD";
	if (platform === "linux") return "Linux";
	if (platform) return `Other:${platform}`;
	return "Unknown";
};
let _platformHeaders;
const getPlatformHeaders = () => {
	return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};
//#endregion
//#region node_modules/openai/internal/shims.mjs
function getDefaultFetch() {
	if (typeof fetch !== "undefined") return fetch;
	throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
	const ReadableStream = globalThis.ReadableStream;
	if (typeof ReadableStream === "undefined") throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
	return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
	let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
	return makeReadableStream({
		start() {},
		async pull(controller) {
			const { done, value } = await iter.next();
			if (done) controller.close();
			else controller.enqueue(value);
		},
		async cancel() {
			await iter.return?.();
		}
	});
}
/**
* Most browsers don't yet have async iterable support for ReadableStream,
* and Node has a very different way of reading bytes from its "ReadableStream".
*
* This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
*/
function ReadableStreamToAsyncIterable(stream) {
	if (stream[Symbol.asyncIterator]) return stream;
	const reader = stream.getReader();
	return {
		async next() {
			try {
				const result = await reader.read();
				if (result?.done) reader.releaseLock();
				return result;
			} catch (e) {
				reader.releaseLock();
				throw e;
			}
		},
		async return() {
			const cancelPromise = reader.cancel();
			reader.releaseLock();
			await cancelPromise;
			return {
				done: true,
				value: void 0
			};
		},
		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
/**
* Cancels a ReadableStream we don't need to consume.
* See https://undici.nodejs.org/#/?id=garbage-collection
*/
async function CancelReadableStream(stream) {
	if (stream === null || typeof stream !== "object") return;
	if (stream[Symbol.asyncIterator]) {
		await stream[Symbol.asyncIterator]().return?.();
		return;
	}
	const reader = stream.getReader();
	const cancelPromise = reader.cancel();
	reader.releaseLock();
	await cancelPromise;
}
//#endregion
//#region node_modules/openai/internal/request-options.mjs
const FallbackEncoder = ({ headers, body }) => {
	return {
		bodyHeaders: { "content-type": "application/json" },
		body: JSON.stringify(body)
	};
};
//#endregion
//#region node_modules/openai/internal/qs/formats.mjs
const default_format = "RFC3986";
const default_formatter = (v) => String(v);
const formatters = {
	RFC1738: (v) => String(v).replace(/%20/g, "+"),
	RFC3986: default_formatter
};
//#endregion
//#region node_modules/openai/internal/qs/utils.mjs
let has = (obj, key) => (has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key));
const hex_table = /* @__PURE__ */ (() => {
	const array = [];
	for (let i = 0; i < 256; ++i) array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
	return array;
})();
const limit = 1024;
const encode = (str, _defaultEncoder, charset, _kind, format) => {
	if (str.length === 0) return str;
	let string = str;
	if (typeof str === "symbol") string = Symbol.prototype.toString.call(str);
	else if (typeof str !== "string") string = String(str);
	if (charset === "iso-8859-1") return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
		return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
	});
	let out = "";
	for (let j = 0; j < string.length; j += limit) {
		const segment = string.length >= limit ? string.slice(j, j + limit) : string;
		const arr = [];
		for (let i = 0; i < segment.length; ++i) {
			let c = segment.charCodeAt(i);
			if (c === 45 || c === 46 || c === 95 || c === 126 || c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || format === "RFC1738" && (c === 40 || c === 41)) {
				arr[arr.length] = segment.charAt(i);
				continue;
			}
			if (c < 128) {
				arr[arr.length] = hex_table[c];
				continue;
			}
			if (c < 2048) {
				arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
				continue;
			}
			if (c < 55296 || c >= 57344) {
				arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
				continue;
			}
			i += 1;
			c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
			arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
		}
		out += arr.join("");
	}
	return out;
};
function is_buffer(obj) {
	if (!obj || typeof obj !== "object") return false;
	return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function maybe_map(val, fn) {
	if (isArray(val)) {
		const mapped = [];
		for (let i = 0; i < val.length; i += 1) mapped.push(fn(val[i]));
		return mapped;
	}
	return fn(val);
}
//#endregion
//#region node_modules/openai/internal/qs/stringify.mjs
const array_prefix_generators = {
	brackets(prefix) {
		return String(prefix) + "[]";
	},
	comma: "comma",
	indices(prefix, key) {
		return String(prefix) + "[" + key + "]";
	},
	repeat(prefix) {
		return String(prefix);
	}
};
const push_to_array = function(arr, value_or_array) {
	Array.prototype.push.apply(arr, isArray(value_or_array) ? value_or_array : [value_or_array]);
};
let toISOString;
const defaults = {
	addQueryPrefix: false,
	allowDots: false,
	allowEmptyArrays: false,
	arrayFormat: "indices",
	charset: "utf-8",
	charsetSentinel: false,
	delimiter: "&",
	encode: true,
	encodeDotInKeys: false,
	encoder: encode,
	encodeValuesOnly: false,
	format: default_format,
	formatter: default_formatter,
	indices: false,
	serializeDate(date) {
		return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
	},
	skipNulls: false,
	strictNullHandling: false
};
function is_non_nullish_primitive(v) {
	return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
const sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
	let obj = object;
	let tmp_sc = sideChannel;
	let step = 0;
	let find_flag = false;
	while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
		const pos = tmp_sc.get(object);
		step += 1;
		if (typeof pos !== "undefined") if (pos === step) throw new RangeError("Cyclic object value");
		else find_flag = true;
		if (typeof tmp_sc.get(sentinel) === "undefined") step = 0;
	}
	if (typeof filter === "function") obj = filter(prefix, obj);
	else if (obj instanceof Date) obj = serializeDate?.(obj);
	else if (generateArrayPrefix === "comma" && isArray(obj)) obj = maybe_map(obj, function(value) {
		if (value instanceof Date) return serializeDate?.(value);
		return value;
	});
	if (obj === null) {
		if (strictNullHandling) return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, "key", format) : prefix;
		obj = "";
	}
	if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
		if (encoder) {
			const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
			return [formatter?.(key_value) + "=" + formatter?.(encoder(obj, defaults.encoder, charset, "value", format))];
		}
		return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
	}
	const values = [];
	if (typeof obj === "undefined") return values;
	let obj_keys;
	if (generateArrayPrefix === "comma" && isArray(obj)) {
		if (encodeValuesOnly && encoder) obj = maybe_map(obj, encoder);
		obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
	} else if (isArray(filter)) obj_keys = filter;
	else {
		const keys = Object.keys(obj);
		obj_keys = sort ? keys.sort(sort) : keys;
	}
	const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
	const adjusted_prefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
	if (allowEmptyArrays && isArray(obj) && obj.length === 0) return adjusted_prefix + "[]";
	for (let j = 0; j < obj_keys.length; ++j) {
		const key = obj_keys[j];
		const value = typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key];
		if (skipNulls && value === null) continue;
		const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
		const key_prefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
		sideChannel.set(object, step);
		const valueSideChannel = /* @__PURE__ */ new WeakMap();
		valueSideChannel.set(sentinel, sideChannel);
		push_to_array(values, inner_stringify(value, key_prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, valueSideChannel));
	}
	return values;
}
function normalize_stringify_options(opts = defaults) {
	if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
	if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
	if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") throw new TypeError("Encoder has to be a function.");
	const charset = opts.charset || defaults.charset;
	if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
	let format = default_format;
	if (typeof opts.format !== "undefined") {
		if (!has(formatters, opts.format)) throw new TypeError("Unknown format option provided.");
		format = opts.format;
	}
	const formatter = formatters[format];
	let filter = defaults.filter;
	if (typeof opts.filter === "function" || isArray(opts.filter)) filter = opts.filter;
	let arrayFormat;
	if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) arrayFormat = opts.arrayFormat;
	else if ("indices" in opts) arrayFormat = opts.indices ? "indices" : "repeat";
	else arrayFormat = defaults.arrayFormat;
	if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
	const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
	return {
		addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
		allowDots,
		allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
		arrayFormat,
		charset,
		charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
		commaRoundTrip: !!opts.commaRoundTrip,
		delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
		encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
		encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
		encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
		encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
		filter,
		format,
		formatter,
		serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
		skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
		sort: typeof opts.sort === "function" ? opts.sort : null,
		strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
	};
}
function stringify(object, opts = {}) {
	let obj = object;
	const options = normalize_stringify_options(opts);
	let obj_keys;
	let filter;
	if (typeof options.filter === "function") {
		filter = options.filter;
		obj = filter("", obj);
	} else if (isArray(options.filter)) {
		filter = options.filter;
		obj_keys = filter;
	}
	const keys = [];
	if (typeof obj !== "object" || obj === null) return "";
	const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
	const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
	if (!obj_keys) obj_keys = Object.keys(obj);
	if (options.sort) obj_keys.sort(options.sort);
	const sideChannel = /* @__PURE__ */ new WeakMap();
	for (let i = 0; i < obj_keys.length; ++i) {
		const key = obj_keys[i];
		if (options.skipNulls && obj[key] === null) continue;
		push_to_array(keys, inner_stringify(obj[key], key, generateArrayPrefix, commaRoundTrip, options.allowEmptyArrays, options.strictNullHandling, options.skipNulls, options.encodeDotInKeys, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.format, options.formatter, options.encodeValuesOnly, options.charset, sideChannel));
	}
	const joined = keys.join(options.delimiter);
	let prefix = options.addQueryPrefix === true ? "?" : "";
	if (options.charsetSentinel) if (options.charset === "iso-8859-1") prefix += "utf8=%26%2310003%3B&";
	else prefix += "utf8=%E2%9C%93&";
	return joined.length > 0 ? prefix + joined : "";
}
//#endregion
//#region node_modules/openai/internal/utils/query.mjs
function stringifyQuery(query) {
	return stringify(query, { arrayFormat: "brackets" });
}
//#endregion
//#region node_modules/openai/internal/utils/bytes.mjs
function concatBytes(buffers) {
	let length = 0;
	for (const buffer of buffers) length += buffer.length;
	const output = new Uint8Array(length);
	let index = 0;
	for (const buffer of buffers) {
		output.set(buffer, index);
		index += buffer.length;
	}
	return output;
}
let encodeUTF8_;
function encodeUTF8(str) {
	let encoder;
	return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str);
}
let decodeUTF8_;
function decodeUTF8(bytes) {
	let decoder;
	return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}
//#endregion
//#region node_modules/openai/internal/decoders/line.mjs
var _LineDecoder_buffer, _LineDecoder_carriageReturnIndex;
/**
* A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
* reading lines from text.
*
* https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
*/
var LineDecoder = class {
	constructor() {
		_LineDecoder_buffer.set(this, void 0);
		_LineDecoder_carriageReturnIndex.set(this, void 0);
		__classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
		__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
	}
	decode(chunk) {
		if (chunk == null) return [];
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
		__classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
		const lines = [];
		let patternIndex;
		while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
			if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
				__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
				continue;
			}
			if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
				lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
				__classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
				__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
				continue;
			}
			const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
			const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
			lines.push(line);
			__classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
			__classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
		}
		return lines;
	}
	flush() {
		if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) return [];
		return this.decode("\n");
	}
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/**
* This function searches the buffer for the end patterns, (\r or \n)
* and returns an object with the index preceding the matched newline and the
* index after the newline char. `null` is returned if no new line is found.
*
* ```ts
* findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
* ```
*/
function findNewlineIndex(buffer, startIndex) {
	const newline = 10;
	const carriage = 13;
	for (let i = startIndex ?? 0; i < buffer.length; i++) {
		if (buffer[i] === newline) return {
			preceding: i,
			index: i + 1,
			carriage: false
		};
		if (buffer[i] === carriage) return {
			preceding: i,
			index: i + 1,
			carriage: true
		};
	}
	return null;
}
function findDoubleNewlineIndex(buffer) {
	const newline = 10;
	const carriage = 13;
	for (let i = 0; i < buffer.length - 1; i++) {
		if (buffer[i] === newline && buffer[i + 1] === newline) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === carriage) return i + 2;
		if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) return i + 4;
	}
	return -1;
}
//#endregion
//#region node_modules/openai/internal/utils/log.mjs
const levelNumbers = {
	off: 0,
	error: 200,
	warn: 300,
	info: 400,
	debug: 500
};
const parseLogLevel = (maybeLevel, sourceName, client) => {
	if (!maybeLevel) return;
	if (hasOwn(levelNumbers, maybeLevel)) return maybeLevel;
	loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
};
function noop() {}
function makeLogFn(fnLevel, logger, logLevel) {
	if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) return noop;
	else return logger[fnLevel].bind(logger);
}
const noopLogger = {
	error: noop,
	warn: noop,
	info: noop,
	debug: noop
};
let cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
	const logger = client.logger;
	const logLevel = client.logLevel ?? "off";
	if (!logger) return noopLogger;
	const cachedLogger = cachedLoggers.get(logger);
	if (cachedLogger && cachedLogger[0] === logLevel) return cachedLogger[1];
	const levelLogger = {
		error: makeLogFn("error", logger, logLevel),
		warn: makeLogFn("warn", logger, logLevel),
		info: makeLogFn("info", logger, logLevel),
		debug: makeLogFn("debug", logger, logLevel)
	};
	cachedLoggers.set(logger, [logLevel, levelLogger]);
	return levelLogger;
}
const formatRequestDetails = (details) => {
	if (details.options) {
		details.options = { ...details.options };
		delete details.options["headers"];
	}
	if (details.headers) details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [name, name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value]));
	if ("retryOfRequestLogID" in details) {
		if (details.retryOfRequestLogID) details.retryOf = details.retryOfRequestLogID;
		delete details.retryOfRequestLogID;
	}
	return details;
};
//#endregion
//#region node_modules/openai/core/streaming.mjs
var _Stream_client;
var Stream = class Stream {
	constructor(iterator, controller, client) {
		this.iterator = iterator;
		_Stream_client.set(this, void 0);
		this.controller = controller;
		__classPrivateFieldSet(this, _Stream_client, client, "f");
	}
	static fromSSEResponse(response, controller, client, synthesizeEventData) {
		let consumed = false;
		const logger = client ? loggerFor(client) : console;
		async function* iterator() {
			if (consumed) throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const sse of _iterSSEMessages(response, controller)) {
					if (done) continue;
					if (sse.data.startsWith("[DONE]")) {
						done = true;
						continue;
					}
					if (sse.event === null || !sse.event.startsWith("thread.")) {
						let data;
						try {
							data = JSON.parse(sse.data);
						} catch (e) {
							logger.error(`Could not parse message into JSON:`, sse.data);
							logger.error(`From chunk:`, sse.raw);
							throw e;
						}
						if (data && data.error) throw new APIError(void 0, data.error, void 0, response.headers);
						yield synthesizeEventData ? {
							event: sse.event,
							data
						} : data;
					} else {
						let data;
						try {
							data = JSON.parse(sse.data);
						} catch (e) {
							console.error(`Could not parse message into JSON:`, sse.data);
							console.error(`From chunk:`, sse.raw);
							throw e;
						}
						if (sse.event == "error") throw new APIError(void 0, data.error, data.message, void 0);
						yield {
							event: sse.event,
							data
						};
					}
				}
				done = true;
			} catch (e) {
				if (isAbortError(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream(iterator, controller, client);
	}
	/**
	* Generates a Stream from a newline-separated ReadableStream
	* where each item is a JSON value.
	*/
	static fromReadableStream(readableStream, controller, client) {
		let consumed = false;
		async function* iterLines() {
			const lineDecoder = new LineDecoder();
			const iter = ReadableStreamToAsyncIterable(readableStream);
			for await (const chunk of iter) for (const line of lineDecoder.decode(chunk)) yield line;
			for (const line of lineDecoder.flush()) yield line;
		}
		async function* iterator() {
			if (consumed) throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
			consumed = true;
			let done = false;
			try {
				for await (const line of iterLines()) {
					if (done) continue;
					if (line) yield JSON.parse(line);
				}
				done = true;
			} catch (e) {
				if (isAbortError(e)) return;
				throw e;
			} finally {
				if (!done) controller.abort();
			}
		}
		return new Stream(iterator, controller, client);
	}
	[(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		return this.iterator();
	}
	/**
	* Splits the stream into two streams which can be
	* independently read from at different speeds.
	*/
	tee() {
		const left = [];
		const right = [];
		const iterator = this.iterator();
		const teeIterator = (queue) => {
			return { next: () => {
				if (queue.length === 0) {
					const result = iterator.next();
					left.push(result);
					right.push(result);
				}
				return queue.shift();
			} };
		};
		return [new Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")), new Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))];
	}
	/**
	* Converts this stream to a newline-separated ReadableStream of
	* JSON stringified values in the stream
	* which can be turned back into a Stream with `Stream.fromReadableStream()`.
	*/
	toReadableStream() {
		const self = this;
		let iter;
		return makeReadableStream({
			async start() {
				iter = self[Symbol.asyncIterator]();
			},
			async pull(ctrl) {
				try {
					const { value, done } = await iter.next();
					if (done) return ctrl.close();
					const bytes = encodeUTF8(JSON.stringify(value) + "\n");
					ctrl.enqueue(bytes);
				} catch (err) {
					ctrl.error(err);
				}
			},
			async cancel() {
				await iter.return?.();
			}
		});
	}
};
async function* _iterSSEMessages(response, controller) {
	if (!response.body) {
		controller.abort();
		if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
		throw new OpenAIError(`Attempted to iterate over a response with no body`);
	}
	const sseDecoder = new SSEDecoder();
	const lineDecoder = new LineDecoder();
	const iter = ReadableStreamToAsyncIterable(response.body);
	for await (const sseChunk of iterSSEChunks(iter)) for (const line of lineDecoder.decode(sseChunk)) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
	for (const line of lineDecoder.flush()) {
		const sse = sseDecoder.decode(line);
		if (sse) yield sse;
	}
}
/**
* Given an async iterable iterator, iterates over it and yields full
* SSE chunks, i.e. yields when a double new-line is encountered.
*/
async function* iterSSEChunks(iterator) {
	let data = new Uint8Array();
	for await (const chunk of iterator) {
		if (chunk == null) continue;
		const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
		let newData = new Uint8Array(data.length + binaryChunk.length);
		newData.set(data);
		newData.set(binaryChunk, data.length);
		data = newData;
		let patternIndex;
		while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
			yield data.slice(0, patternIndex);
			data = data.slice(patternIndex);
		}
	}
	if (data.length > 0) yield data;
}
var SSEDecoder = class {
	constructor() {
		this.event = null;
		this.data = [];
		this.chunks = [];
	}
	decode(line) {
		if (line.endsWith("\r")) line = line.substring(0, line.length - 1);
		if (!line) {
			if (!this.event && !this.data.length) return null;
			const sse = {
				event: this.event,
				data: this.data.join("\n"),
				raw: this.chunks
			};
			this.event = null;
			this.data = [];
			this.chunks = [];
			return sse;
		}
		this.chunks.push(line);
		if (line.startsWith(":")) return null;
		let [fieldname, _, value] = partition(line, ":");
		if (value.startsWith(" ")) value = value.substring(1);
		if (fieldname === "event") this.event = value;
		else if (fieldname === "data") this.data.push(value);
		return null;
	}
};
function partition(str, delimiter) {
	const index = str.indexOf(delimiter);
	if (index !== -1) return [
		str.substring(0, index),
		delimiter,
		str.substring(index + delimiter.length)
	];
	return [
		str,
		"",
		""
	];
}
//#endregion
//#region node_modules/openai/internal/parse.mjs
async function defaultParseResponse(client, props) {
	const { response, requestLogID, retryOfRequestLogID, startTime } = props;
	const body = await (async () => {
		if (props.options.stream) {
			loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
			if (props.options.__streamClass) return props.options.__streamClass.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
			return Stream.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
		}
		if (response.status === 204) return null;
		if (props.options.__binaryResponse) return response;
		const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim();
		if (mediaType?.includes("application/json") || mediaType?.endsWith("+json")) {
			if (response.headers.get("content-length") === "0") return;
			return addRequestID(await response.json(), response);
		}
		return await response.text();
	})();
	loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
		retryOfRequestLogID,
		url: response.url,
		status: response.status,
		body,
		durationMs: Date.now() - startTime
	}));
	return body;
}
function addRequestID(value, response) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return value;
	return Object.defineProperty(value, "_request_id", {
		value: response.headers.get("x-request-id"),
		enumerable: false
	});
}
//#endregion
//#region node_modules/openai/core/api-promise.mjs
var _APIPromise_client;
/**
* A subclass of `Promise` providing additional helper methods
* for interacting with the SDK.
*/
var APIPromise = class APIPromise extends Promise {
	constructor(client, responsePromise, parseResponse = defaultParseResponse) {
		super((resolve) => {
			resolve(null);
		});
		this.responsePromise = responsePromise;
		this.parseResponse = parseResponse;
		_APIPromise_client.set(this, void 0);
		__classPrivateFieldSet(this, _APIPromise_client, client, "f");
	}
	_thenUnwrap(transform) {
		return new APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
	}
	/**
	* Gets the raw `Response` instance instead of parsing the response
	* data.
	*
	* If you want to parse the response body but still get the `Response`
	* instance, you can use {@link withResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	asResponse() {
		return this.responsePromise.then((p) => p.response);
	}
	/**
	* Gets the parsed response data, the raw `Response` instance and the ID of the request,
	* returned via the X-Request-ID header which is useful for debugging requests and reporting
	* issues to OpenAI.
	*
	* If you just want to get the raw `Response` instance without parsing it,
	* you can use {@link asResponse()}.
	*
	* 👋 Getting the wrong TypeScript type for `Response`?
	* Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
	* to your `tsconfig.json`.
	*/
	async withResponse() {
		const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
		return {
			data,
			response,
			request_id: response.headers.get("x-request-id")
		};
	}
	parse() {
		if (!this.parsedPromise) this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
		return this.parsedPromise;
	}
	then(onfulfilled, onrejected) {
		return this.parse().then(onfulfilled, onrejected);
	}
	catch(onrejected) {
		return this.parse().catch(onrejected);
	}
	finally(onfinally) {
		return this.parse().finally(onfinally);
	}
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();
//#endregion
//#region node_modules/openai/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
	constructor(client, response, body, options) {
		_AbstractPage_client.set(this, void 0);
		__classPrivateFieldSet(this, _AbstractPage_client, client, "f");
		this.options = options;
		this.response = response;
		this.body = body;
	}
	hasNextPage() {
		if (!this.getPaginatedItems().length) return false;
		return this.nextPageRequestOptions() != null;
	}
	async getNextPage() {
		const nextOptions = this.nextPageRequestOptions();
		if (!nextOptions) throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
		return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
	}
	async *iterPages() {
		let page = this;
		yield page;
		while (page.hasNextPage()) {
			page = await page.getNextPage();
			yield page;
		}
	}
	async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
		for await (const page of this.iterPages()) for (const item of page.getPaginatedItems()) yield item;
	}
};
/**
* This subclass of Promise will resolve to an instantiated Page once the request completes.
*
* It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
*
*    for await (const item of client.items.list()) {
*      console.log(item)
*    }
*/
var PagePromise = class extends APIPromise {
	constructor(client, request, Page) {
		super(client, request, async (client, props) => new Page(client, props.response, await defaultParseResponse(client, props), props.options));
	}
	/**
	* Allow auto-paginating iteration on an unawaited list call, eg:
	*
	*    for await (const item of client.items.list()) {
	*      console.log(item)
	*    }
	*/
	async *[Symbol.asyncIterator]() {
		const page = await this;
		for await (const item of page) yield item;
	}
};
/**
* Note: no pagination actually occurs yet, this is for forwards-compatibility.
*/
var Page = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.object = body.object;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	nextPageRequestOptions() {
		return null;
	}
};
var CursorPage = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const data = this.getPaginatedItems();
		const id = data[data.length - 1]?.id;
		if (!id) return null;
		return {
			...this.options,
			query: {
				...maybeObj(this.options.query),
				after: id
			}
		};
	}
};
var ConversationCursorPage = class extends AbstractPage {
	constructor(client, response, body, options) {
		super(client, response, body, options);
		this.data = body.data || [];
		this.has_more = body.has_more || false;
		this.last_id = body.last_id || "";
	}
	getPaginatedItems() {
		return this.data ?? [];
	}
	hasNextPage() {
		if (this.has_more === false) return false;
		return super.hasNextPage();
	}
	nextPageRequestOptions() {
		const cursor = this.last_id;
		if (!cursor) return null;
		return {
			...this.options,
			query: {
				...maybeObj(this.options.query),
				after: cursor
			}
		};
	}
};
//#endregion
//#region node_modules/openai/internal/uploads.mjs
const checkFileSupport = () => {
	if (typeof File === "undefined") {
		const { process } = globalThis;
		const isOldNode = typeof process?.versions?.node === "string" && parseInt(process.versions.node.split(".")) < 20;
		throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
	}
};
/**
* Construct a `File` instance. This is used to ensure a helpful error is thrown
* for environments that don't define a global `File` yet.
*/
function makeFile(fileBits, fileName, options) {
	checkFileSupport();
	return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
	return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
const isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
/**
* Returns a multipart/form-data request if any part of the given request body contains a File / Blob value.
* Otherwise returns the request as is.
*/
const maybeMultipartFormRequestOptions = async (opts, fetch) => {
	if (!hasUploadableValue(opts.body)) return opts;
	return {
		...opts,
		body: await createForm(opts.body, fetch)
	};
};
const multipartFormRequestOptions = async (opts, fetch) => {
	return {
		...opts,
		body: await createForm(opts.body, fetch)
	};
};
const supportsFormDataMap = /* @__PURE__ */ new WeakMap();
/**
* node-fetch doesn't support the global FormData object in recent node versions. Instead of sending
* properly-encoded form data, it just stringifies the object, resulting in a request body of "[object FormData]".
* This function detects if the fetch function provided supports the global FormData object to avoid
* confusing error messages later on.
*/
function supportsFormData(fetchObject) {
	const fetch = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
	const cached = supportsFormDataMap.get(fetch);
	if (cached) return cached;
	const promise = (async () => {
		try {
			const FetchResponse = "Response" in fetch ? fetch.Response : (await fetch("data:,")).constructor;
			const data = new FormData();
			if (data.toString() === await new FetchResponse(data).text()) return false;
			return true;
		} catch {
			return true;
		}
	})();
	supportsFormDataMap.set(fetch, promise);
	return promise;
}
const createForm = async (body, fetch) => {
	if (!await supportsFormData(fetch)) throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
	const form = new FormData();
	await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
	return form;
};
const isNamedBlob = (value) => value instanceof Blob && "name" in value;
const isUploadable = (value) => typeof value === "object" && value !== null && (value instanceof Response || isAsyncIterable(value) || isNamedBlob(value));
const hasUploadableValue = (value) => {
	if (isUploadable(value)) return true;
	if (Array.isArray(value)) return value.some(hasUploadableValue);
	if (value && typeof value === "object") {
		for (const k in value) if (hasUploadableValue(value[k])) return true;
	}
	return false;
};
const addFormValue = async (form, key, value) => {
	if (value === void 0) return;
	if (value == null) throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") form.append(key, String(value));
	else if (value instanceof Response) form.append(key, makeFile([await value.blob()], getName(value)));
	else if (isAsyncIterable(value)) form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
	else if (isNamedBlob(value)) form.append(key, value, getName(value));
	else if (Array.isArray(value)) await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
	else if (typeof value === "object") await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
	else throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
};
//#endregion
//#region node_modules/openai/internal/to-file.mjs
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
/**
* This check adds the arrayBuffer() method type because it is available and used at runtime
*/
const isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
const isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
/**
* Helper for creating a {@link File} to pass to an SDK upload method from a variety of different data formats
* @param value the raw content of the file. Can be an {@link Uploadable}, BlobLikePart, or AsyncIterable of BlobLikeParts
* @param {string=} name the name of the file. If omitted, toFile will try to determine a file name from bits if possible
* @param {Object=} options additional properties
* @param {string=} options.type the MIME type of the content
* @param {number=} options.lastModified the last modified timestamp
* @returns a {@link File} with the given properties
*/
async function toFile(value, name, options) {
	checkFileSupport();
	value = await value;
	if (isFileLike(value)) {
		if (value instanceof File) return value;
		return makeFile([await value.arrayBuffer()], value.name);
	}
	if (isResponseLike(value)) {
		const blob = await value.blob();
		name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
		return makeFile(await getBytes(blob), name, options);
	}
	const parts = await getBytes(value);
	name || (name = getName(value));
	if (!options?.type) {
		const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
		if (typeof type === "string") options = {
			...options,
			type
		};
	}
	return makeFile(parts, name, options);
}
async function getBytes(value) {
	let parts = [];
	if (typeof value === "string" || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) parts.push(value);
	else if (isBlobLike(value)) parts.push(value instanceof Blob ? value : await value.arrayBuffer());
	else if (isAsyncIterable(value)) for await (const chunk of value) parts.push(...await getBytes(chunk));
	else {
		const constructor = value?.constructor?.name;
		throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
	}
	return parts;
}
function propsForError(value) {
	if (typeof value !== "object" || value === null) return "";
	return `; props: [${Object.getOwnPropertyNames(value).map((p) => `"${p}"`).join(", ")}]`;
}
//#endregion
//#region node_modules/openai/core/resource.mjs
var APIResource = class {
	constructor(client) {
		this._client = client;
	}
};
//#endregion
//#region node_modules/openai/internal/utils/path.mjs
/**
* Percent-encode everything that isn't safe to have in a path without encoding safe chars.
*
* Taken from https://datatracker.ietf.org/doc/html/rfc3986#section-3.3:
* > unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
* > sub-delims  = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
* > pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
*/
function encodeURIPath(str) {
	return str.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
const EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
const createPathTagFunction = (pathEncoder = encodeURIPath) => function path(statics, ...params) {
	if (statics.length === 1) return statics[0];
	let postPath = false;
	const invalidSegments = [];
	const path = statics.reduce((previousValue, currentValue, index) => {
		if (/[?#]/.test(currentValue)) postPath = true;
		const value = params[index];
		let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
		if (index !== params.length && (value == null || typeof value === "object" && value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
			encoded = value + "";
			invalidSegments.push({
				start: previousValue.length + currentValue.length,
				length: encoded.length,
				error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
			});
		}
		return previousValue + currentValue + (index === params.length ? "" : encoded);
	}, "");
	const pathOnly = path.split(/[?#]/, 1)[0];
	const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
	let match;
	while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) invalidSegments.push({
		start: match.index,
		length: match[0].length,
		error: `Value "${match[0]}" can\'t be safely passed as a path parameter`
	});
	invalidSegments.sort((a, b) => a.start - b.start);
	if (invalidSegments.length > 0) {
		let lastEnd = 0;
		const underline = invalidSegments.reduce((acc, segment) => {
			const spaces = " ".repeat(segment.start - lastEnd);
			const arrows = "^".repeat(segment.length);
			lastEnd = segment.start + segment.length;
			return acc + spaces + arrows;
		}, "");
		throw new OpenAIError(`Path parameters result in path with invalid segments:\n${invalidSegments.map((e) => e.error).join("\n")}\n${path}\n${underline}`);
	}
	return path;
};
/**
* URI-encodes path params and ensures no unsafe /./ or /../ path segments are introduced.
*/
const path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);
//#endregion
//#region node_modules/openai/resources/chat/completions/messages.mjs
/**
* Given a list of messages comprising a conversation, the model will return a response.
*/
var Messages$1 = class extends APIResource {
	/**
	* Get the messages in a stored chat completion. Only Chat Completions that have
	* been created with the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
	*   'completion_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(completionID, query = {}, options) {
		return this._client.getAPIList(path`/chat/completions/${completionID}/messages`, CursorPage, {
			query,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/lib/parser.mjs
function isChatCompletionFunctionTool(tool) {
	return tool !== void 0 && "function" in tool && tool.function !== void 0;
}
function isAutoParsableResponseFormat(response_format) {
	return response_format?.["$brand"] === "auto-parseable-response-format";
}
function isAutoParsableTool$1(tool) {
	return tool?.["$brand"] === "auto-parseable-tool";
}
function maybeParseChatCompletion(completion, params) {
	if (!params || !hasAutoParseableInput$1(params)) return {
		...completion,
		choices: completion.choices.map((choice) => {
			assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
			return {
				...choice,
				message: {
					...choice.message,
					parsed: null,
					...choice.message.tool_calls ? { tool_calls: choice.message.tool_calls } : void 0
				}
			};
		})
	};
	return parseChatCompletion(completion, params);
}
function parseChatCompletion(completion, params) {
	const choices = completion.choices.map((choice) => {
		if (choice.finish_reason === "length") throw new LengthFinishReasonError();
		if (choice.finish_reason === "content_filter") throw new ContentFilterFinishReasonError();
		assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
		return {
			...choice,
			message: {
				...choice.message,
				...choice.message.tool_calls ? { tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall$1(params, toolCall)) ?? void 0 } : void 0,
				parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
			}
		};
	});
	return {
		...completion,
		choices
	};
}
function parseResponseFormat(params, content) {
	if (params.response_format?.type !== "json_schema") return null;
	if (params.response_format?.type === "json_schema") {
		if ("$parseRaw" in params.response_format) return params.response_format.$parseRaw(content);
		return JSON.parse(content);
	}
	return null;
}
function parseToolCall$1(params, toolCall) {
	const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function.name);
	return {
		...toolCall,
		function: {
			...toolCall.function,
			parsed_arguments: isAutoParsableTool$1(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCall.function.arguments) : null
		}
	};
}
function shouldParseToolCall(params, toolCall) {
	if (!params || !("tools" in params) || !params.tools) return false;
	const inputTool = params.tools?.find((inputTool) => isChatCompletionFunctionTool(inputTool) && inputTool.function?.name === toolCall.function.name);
	return isChatCompletionFunctionTool(inputTool) && (isAutoParsableTool$1(inputTool) || inputTool?.function.strict || false);
}
function hasAutoParseableInput$1(params) {
	if (isAutoParsableResponseFormat(params.response_format)) return true;
	return params.tools?.some((t) => isAutoParsableTool$1(t) || t.type === "function" && t.function.strict === true) ?? false;
}
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
	for (const toolCall of toolCalls || []) if (toolCall.type !== "function") throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
}
function validateInputTools(tools) {
	for (const tool of tools ?? []) {
		if (tool.type !== "function") throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
		if (tool.function.strict !== true) throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
	}
}
//#endregion
//#region node_modules/openai/lib/chatCompletionUtils.mjs
const isAssistantMessage = (message) => {
	return message?.role === "assistant";
};
const isToolMessage = (message) => {
	return message?.role === "tool";
};
//#endregion
//#region node_modules/openai/lib/EventStream.mjs
var _EventStream_instances, _EventStream_connectedPromise, _EventStream_resolveConnectedPromise, _EventStream_rejectConnectedPromise, _EventStream_endPromise, _EventStream_resolveEndPromise, _EventStream_rejectEndPromise, _EventStream_listeners, _EventStream_ended, _EventStream_errored, _EventStream_aborted, _EventStream_catchingPromiseCreated, _EventStream_handleError;
var EventStream = class {
	constructor() {
		_EventStream_instances.add(this);
		this.controller = new AbortController();
		_EventStream_connectedPromise.set(this, void 0);
		_EventStream_resolveConnectedPromise.set(this, () => {});
		_EventStream_rejectConnectedPromise.set(this, () => {});
		_EventStream_endPromise.set(this, void 0);
		_EventStream_resolveEndPromise.set(this, () => {});
		_EventStream_rejectEndPromise.set(this, () => {});
		_EventStream_listeners.set(this, {});
		_EventStream_ended.set(this, false);
		_EventStream_errored.set(this, false);
		_EventStream_aborted.set(this, false);
		_EventStream_catchingPromiseCreated.set(this, false);
		__classPrivateFieldSet(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_resolveConnectedPromise, resolve, "f");
			__classPrivateFieldSet(this, _EventStream_rejectConnectedPromise, reject, "f");
		}), "f");
		__classPrivateFieldSet(this, _EventStream_endPromise, new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_resolveEndPromise, resolve, "f");
			__classPrivateFieldSet(this, _EventStream_rejectEndPromise, reject, "f");
		}), "f");
		__classPrivateFieldGet(this, _EventStream_connectedPromise, "f").catch(() => {});
		__classPrivateFieldGet(this, _EventStream_endPromise, "f").catch(() => {});
	}
	_run(executor) {
		setTimeout(() => {
			executor().then(() => {
				this._emitFinal();
				this._emit("end");
			}, __classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
		}, 0);
	}
	_connected() {
		if (this.ended) return;
		__classPrivateFieldGet(this, _EventStream_resolveConnectedPromise, "f").call(this);
		this._emit("connect");
	}
	get ended() {
		return __classPrivateFieldGet(this, _EventStream_ended, "f");
	}
	get errored() {
		return __classPrivateFieldGet(this, _EventStream_errored, "f");
	}
	get aborted() {
		return __classPrivateFieldGet(this, _EventStream_aborted, "f");
	}
	abort() {
		this.controller.abort();
	}
	/**
	* Adds the listener function to the end of the listeners array for the event.
	* No checks are made to see if the listener has already been added. Multiple calls passing
	* the same combination of event and listener will result in the listener being added, and
	* called, multiple times.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	on(event, listener) {
		(__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = [])).push({ listener });
		return this;
	}
	/**
	* Removes the specified listener from the listener array for the event.
	* off() will remove, at most, one instance of a listener from the listener array. If any single
	* listener has been added multiple times to the listener array for the specified event, then
	* off() must be called multiple times to remove each instance.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	off(event, listener) {
		const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
		if (!listeners) return this;
		const index = listeners.findIndex((l) => l.listener === listener);
		if (index >= 0) listeners.splice(index, 1);
		return this;
	}
	/**
	* Adds a one-time listener function for the event. The next time the event is triggered,
	* this listener is removed and then invoked.
	* @returns this ChatCompletionStream, so that calls can be chained
	*/
	once(event, listener) {
		(__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = [])).push({
			listener,
			once: true
		});
		return this;
	}
	/**
	* This is similar to `.once()`, but returns a Promise that resolves the next time
	* the event is triggered, instead of calling a listener callback.
	* @returns a Promise that resolves the next time given event is triggered,
	* or rejects if an error is emitted.  (If you request the 'error' event,
	* returns a promise that resolves with the error).
	*
	* Example:
	*
	*   const message = await stream.emitted('message') // rejects if the stream errors
	*/
	emitted(event) {
		return new Promise((resolve, reject) => {
			__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
			if (event !== "error") this.once("error", reject);
			this.once(event, resolve);
		});
	}
	async done() {
		__classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
		await __classPrivateFieldGet(this, _EventStream_endPromise, "f");
	}
	_emit(event, ...args) {
		if (__classPrivateFieldGet(this, _EventStream_ended, "f")) return;
		if (event === "end") {
			__classPrivateFieldSet(this, _EventStream_ended, true, "f");
			__classPrivateFieldGet(this, _EventStream_resolveEndPromise, "f").call(this);
		}
		const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
		if (listeners) {
			__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
			listeners.forEach(({ listener }) => listener(...args));
		}
		if (event === "abort") {
			const error = args[0];
			if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
			return;
		}
		if (event === "error") {
			const error = args[0];
			if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) Promise.reject(error);
			__classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
			__classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
			this._emit("end");
		}
	}
	_emitFinal() {}
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = function _EventStream_handleError(error) {
	__classPrivateFieldSet(this, _EventStream_errored, true, "f");
	if (error instanceof Error && error.name === "AbortError") error = new APIUserAbortError();
	if (error instanceof APIUserAbortError) {
		__classPrivateFieldSet(this, _EventStream_aborted, true, "f");
		return this._emit("abort", error);
	}
	if (error instanceof OpenAIError) return this._emit("error", error);
	if (error instanceof Error) {
		const openAIError = new OpenAIError(error.message);
		openAIError.cause = error;
		return this._emit("error", openAIError);
	}
	return this._emit("error", new OpenAIError(String(error)));
};
//#endregion
//#region node_modules/openai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
	return typeof fn.parse === "function";
}
//#endregion
//#region node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances, _AbstractChatCompletionRunner_getFinalContent, _AbstractChatCompletionRunner_getFinalMessage, _AbstractChatCompletionRunner_getFinalFunctionToolCall, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult, _AbstractChatCompletionRunner_calculateTotalUsage, _AbstractChatCompletionRunner_validateParams, _AbstractChatCompletionRunner_stringifyFunctionCallResult;
const DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
	constructor() {
		super(...arguments);
		_AbstractChatCompletionRunner_instances.add(this);
		this._chatCompletions = [];
		this.messages = [];
	}
	_addChatCompletion(chatCompletion) {
		this._chatCompletions.push(chatCompletion);
		this._emit("chatCompletion", chatCompletion);
		const message = chatCompletion.choices[0]?.message;
		if (message) this._addMessage(message);
		return chatCompletion;
	}
	_addMessage(message, emit = true) {
		if (!("content" in message)) message.content = null;
		this.messages.push(message);
		if (emit) {
			this._emit("message", message);
			if (isToolMessage(message) && message.content) this._emit("functionToolCallResult", message.content);
			else if (isAssistantMessage(message) && message.tool_calls) {
				for (const tool_call of message.tool_calls) if (tool_call.type === "function") this._emit("functionToolCall", tool_call.function);
			}
		}
	}
	/**
	* @returns a promise that resolves with the final ChatCompletion, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletion.
	*/
	async finalChatCompletion() {
		await this.done();
		const completion = this._chatCompletions[this._chatCompletions.length - 1];
		if (!completion) throw new OpenAIError("stream ended without producing a ChatCompletion");
		return completion;
	}
	/**
	* @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalContent() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
	}
	/**
	* @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
	* or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalMessage() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
	}
	/**
	* @returns a promise that resolves with the content of the final FunctionCall, or rejects
	* if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
	*/
	async finalFunctionToolCall() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
	}
	async finalFunctionToolCallResult() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
	}
	async totalUsage() {
		await this.done();
		return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
	}
	allChatCompletions() {
		return [...this._chatCompletions];
	}
	_emitFinal() {
		const completion = this._chatCompletions[this._chatCompletions.length - 1];
		if (completion) this._emit("finalChatCompletion", completion);
		const finalMessage = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
		if (finalMessage) this._emit("finalMessage", finalMessage);
		const finalContent = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
		if (finalContent) this._emit("finalContent", finalContent);
		const finalFunctionCall = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
		if (finalFunctionCall) this._emit("finalFunctionToolCall", finalFunctionCall);
		const finalFunctionCallResult = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
		if (finalFunctionCallResult != null) this._emit("finalFunctionToolCallResult", finalFunctionCallResult);
		if (this._chatCompletions.some((c) => c.usage)) this._emit("totalUsage", __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
	}
	async _createChatCompletion(client, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
		const chatCompletion = await client.chat.completions.create({
			...params,
			stream: false
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
	}
	async _runChatCompletion(client, params, options) {
		for (const message of params.messages) this._addMessage(message, false);
		return await this._createChatCompletion(client, params, options);
	}
	async _runTools(client, params, options) {
		const role = "tool";
		const { tool_choice = "auto", stream, ...restParams } = params;
		const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice.type === "function" && tool_choice?.function?.name;
		const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
		const inputTools = params.tools.map((tool) => {
			if (isAutoParsableTool$1(tool)) {
				if (!tool.$callback) throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
				return {
					type: "function",
					function: {
						function: tool.$callback,
						name: tool.function.name,
						description: tool.function.description || "",
						parameters: tool.function.parameters,
						parse: tool.$parseRaw,
						strict: true
					}
				};
			}
			return tool;
		});
		const functionsByName = {};
		for (const f of inputTools) if (f.type === "function") functionsByName[f.function.name || f.function.function.name] = f.function;
		const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
			type: "function",
			function: {
				name: t.function.name || t.function.function.name,
				parameters: t.function.parameters,
				description: t.function.description,
				strict: t.function.strict
			}
		} : t) : void 0;
		for (const message of params.messages) this._addMessage(message, false);
		for (let i = 0; i < maxChatCompletions; ++i) {
			const message = (await this._createChatCompletion(client, {
				...restParams,
				tool_choice,
				tools,
				messages: [...this.messages]
			}, options)).choices[0]?.message;
			if (!message) throw new OpenAIError(`missing message in ChatCompletion response`);
			if (!message.tool_calls?.length) return;
			for (const tool_call of message.tool_calls) {
				if (tool_call.type !== "function") continue;
				const tool_call_id = tool_call.id;
				const { name, arguments: args } = tool_call.function;
				const fn = functionsByName[name];
				if (!fn) {
					const content = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name) => JSON.stringify(name)).join(", ")}. Please try again`;
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				} else if (singleFunctionToCall && singleFunctionToCall !== name) {
					const content = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				}
				let parsed;
				try {
					parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
				} catch (error) {
					const content = error instanceof Error ? error.message : String(error);
					this._addMessage({
						role,
						tool_call_id,
						content
					});
					continue;
				}
				const rawContent = await fn.function(parsed, this);
				const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
				this._addMessage({
					role,
					tool_call_id,
					content
				});
				if (singleFunctionToCall) return;
			}
		}
	}
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent() {
	return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage() {
	let i = this.messages.length;
	while (i-- > 0) {
		const message = this.messages[i];
		if (isAssistantMessage(message)) return {
			...message,
			content: message.content ?? null,
			refusal: message.refusal ?? null
		};
	}
	throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionToolCall = function _AbstractChatCompletionRunner_getFinalFunctionToolCall() {
	for (let i = this.messages.length - 1; i >= 0; i--) {
		const message = this.messages[i];
		if (isAssistantMessage(message) && message?.tool_calls?.length) return message.tool_calls.filter((x) => x.type === "function").at(-1)?.function;
	}
}, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult() {
	for (let i = this.messages.length - 1; i >= 0; i--) {
		const message = this.messages[i];
		if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) return message.content;
	}
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage() {
	const total = {
		completion_tokens: 0,
		prompt_tokens: 0,
		total_tokens: 0
	};
	for (const { usage } of this._chatCompletions) if (usage) {
		total.completion_tokens += usage.completion_tokens;
		total.prompt_tokens += usage.prompt_tokens;
		total.total_tokens += usage.total_tokens;
	}
	return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams(params) {
	if (params.n != null && params.n > 1) throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult(rawContent) {
	return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};
//#endregion
//#region node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class ChatCompletionRunner extends AbstractChatCompletionRunner {
	static runTools(client, params, options) {
		const runner = new ChatCompletionRunner();
		const opts = {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "runTools"
			}
		};
		runner._run(() => runner._runTools(client, params, opts));
		return runner;
	}
	_addMessage(message, emit = true) {
		super._addMessage(message, emit);
		if (isAssistantMessage(message) && message.content) this._emit("content", message.content);
	}
};
//#endregion
//#region node_modules/openai/_vendor/partial-json-parser/parser.mjs
const STR = 1;
const NUM = 2;
const ARR = 4;
const OBJ = 8;
const NULL = 16;
const BOOL = 32;
const NAN = 64;
const INFINITY = 128;
const MINUS_INFINITY = 256;
const INF = INFINITY | MINUS_INFINITY;
const SPECIAL = 496;
const ATOM = NUM | 497;
const COLLECTION = ARR | OBJ;
const Allow = {
	STR,
	NUM,
	ARR,
	OBJ,
	NULL,
	BOOL,
	NAN,
	INFINITY,
	MINUS_INFINITY,
	INF,
	SPECIAL,
	ATOM,
	COLLECTION,
	ALL: ATOM | COLLECTION
};
var PartialJSON = class extends Error {};
var MalformedJSON = class extends Error {};
/**
* Parse incomplete JSON
* @param {string} jsonString Partial JSON to be parsed
* @param {number} allowPartial Specify what types are allowed to be partial, see {@link Allow} for details
* @returns The parsed JSON
* @throws {PartialJSON} If the JSON is incomplete (related to the `allow` parameter)
* @throws {MalformedJSON} If the JSON is malformed
*/
function parseJSON(jsonString, allowPartial = Allow.ALL) {
	if (typeof jsonString !== "string") throw new TypeError(`expecting str, got ${typeof jsonString}`);
	if (!jsonString.trim()) throw new Error(`${jsonString} is empty`);
	return _parseJSON(jsonString.trim(), allowPartial);
}
const _parseJSON = (jsonString, allow) => {
	const length = jsonString.length;
	let index = 0;
	const markPartialJSON = (msg) => {
		throw new PartialJSON(`${msg} at position ${index}`);
	};
	const throwMalformedError = (msg) => {
		throw new MalformedJSON(`${msg} at position ${index}`);
	};
	const parseAny = () => {
		skipBlank();
		if (index >= length) markPartialJSON("Unexpected end of input");
		if (jsonString[index] === "\"") return parseStr();
		if (jsonString[index] === "{") return parseObj();
		if (jsonString[index] === "[") return parseArr();
		if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
			index += 4;
			return null;
		}
		if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
			index += 4;
			return true;
		}
		if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
			index += 5;
			return false;
		}
		if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
			index += 8;
			return Infinity;
		}
		if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
			index += 9;
			return -Infinity;
		}
		if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
			index += 3;
			return NaN;
		}
		return parseNum();
	};
	const parseStr = () => {
		const start = index;
		let escape = false;
		index++;
		while (index < length && (jsonString[index] !== "\"" || escape && jsonString[index - 1] === "\\")) {
			escape = jsonString[index] === "\\" ? !escape : false;
			index++;
		}
		if (jsonString.charAt(index) == "\"") try {
			return JSON.parse(jsonString.substring(start, ++index - Number(escape)));
		} catch (e) {
			throwMalformedError(String(e));
		}
		else if (Allow.STR & allow) try {
			return JSON.parse(jsonString.substring(start, index - Number(escape)) + "\"");
		} catch (e) {
			return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + "\"");
		}
		markPartialJSON("Unterminated string literal");
	};
	const parseObj = () => {
		index++;
		skipBlank();
		const obj = {};
		try {
			while (jsonString[index] !== "}") {
				skipBlank();
				if (index >= length && Allow.OBJ & allow) return obj;
				const key = parseStr();
				skipBlank();
				index++;
				try {
					const value = parseAny();
					Object.defineProperty(obj, key, {
						value,
						writable: true,
						enumerable: true,
						configurable: true
					});
				} catch (e) {
					if (Allow.OBJ & allow) return obj;
					else throw e;
				}
				skipBlank();
				if (jsonString[index] === ",") index++;
			}
		} catch (e) {
			if (Allow.OBJ & allow) return obj;
			else markPartialJSON("Expected '}' at end of object");
		}
		index++;
		return obj;
	};
	const parseArr = () => {
		index++;
		const arr = [];
		try {
			while (jsonString[index] !== "]") {
				arr.push(parseAny());
				skipBlank();
				if (jsonString[index] === ",") index++;
			}
		} catch (e) {
			if (Allow.ARR & allow) return arr;
			markPartialJSON("Expected ']' at end of array");
		}
		index++;
		return arr;
	};
	const parseNum = () => {
		if (index === 0) {
			if (jsonString === "-" && Allow.NUM & allow) markPartialJSON("Not sure what '-' is");
			try {
				return JSON.parse(jsonString);
			} catch (e) {
				if (Allow.NUM & allow) try {
					if ("." === jsonString[jsonString.length - 1]) return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
					return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
				} catch (e) {}
				throwMalformedError(String(e));
			}
		}
		const start = index;
		if (jsonString[index] === "-") index++;
		while (jsonString[index] && !",]}".includes(jsonString[index])) index++;
		if (index == length && !(Allow.NUM & allow)) markPartialJSON("Unterminated number literal");
		try {
			return JSON.parse(jsonString.substring(start, index));
		} catch (e) {
			if (jsonString.substring(start, index) === "-" && Allow.NUM & allow) markPartialJSON("Not sure what '-' is");
			try {
				return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
			} catch (e) {
				throwMalformedError(String(e));
			}
		}
	};
	const skipBlank = () => {
		while (index < length && " \n\r	".includes(jsonString[index])) index++;
	};
	return parseAny();
};
const partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);
//#endregion
//#region node_modules/openai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances, _ChatCompletionStream_params, _ChatCompletionStream_choiceEventStates, _ChatCompletionStream_currentChatCompletionSnapshot, _ChatCompletionStream_beginRequest, _ChatCompletionStream_getChoiceEventState, _ChatCompletionStream_addChunk, _ChatCompletionStream_emitToolCallDoneEvent, _ChatCompletionStream_emitContentDoneEvents, _ChatCompletionStream_endRequest, _ChatCompletionStream_getAutoParseableResponseFormat, _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class ChatCompletionStream extends AbstractChatCompletionRunner {
	constructor(params) {
		super();
		_ChatCompletionStream_instances.add(this);
		_ChatCompletionStream_params.set(this, void 0);
		_ChatCompletionStream_choiceEventStates.set(this, void 0);
		_ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
		__classPrivateFieldSet(this, _ChatCompletionStream_params, params, "f");
		__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
	}
	get currentChatCompletionSnapshot() {
		return __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
	}
	/**
	* Intended for use on the frontend, consuming a stream produced with
	* `.toReadableStream()` on the backend.
	*
	* Note that messages sent to the model do not appear in `.on('message')`
	* in this context.
	*/
	static fromReadableStream(stream) {
		const runner = new ChatCompletionStream(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static createChatCompletion(client, params, options) {
		const runner = new ChatCompletionStream(params);
		runner._run(() => runner._runChatCompletion(client, {
			...params,
			stream: true
		}, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createChatCompletion(client, params, options) {
		super._createChatCompletion;
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
		const stream = await client.chat.completions.create({
			...params,
			stream: true
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const chunk of stream) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
		this._connected();
		const stream = Stream.fromReadableStream(readableStream, this.controller);
		let chatId;
		for await (const chunk of stream) {
			if (chatId && chatId !== chunk.id) this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
			__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
			chatId = chunk.id;
		}
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
	}
	[(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
	}, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState(choice) {
		let state = __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
		if (state) return state;
		state = {
			content_done: false,
			refusal_done: false,
			logprobs_content_done: false,
			logprobs_refusal_done: false,
			done_tool_calls: /* @__PURE__ */ new Set(),
			current_tool_call_index: null
		};
		__classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
		return state;
	}, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk(chunk) {
		if (this.ended) return;
		const completion = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
		this._emit("chunk", chunk, completion);
		for (const choice of chunk.choices) {
			const choiceSnapshot = completion.choices[choice.index];
			if (choice.delta.content != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.content) {
				this._emit("content", choice.delta.content, choiceSnapshot.message.content);
				this._emit("content.delta", {
					delta: choice.delta.content,
					snapshot: choiceSnapshot.message.content,
					parsed: choiceSnapshot.message.parsed
				});
			}
			if (choice.delta.refusal != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.refusal) this._emit("refusal.delta", {
				delta: choice.delta.refusal,
				snapshot: choiceSnapshot.message.refusal
			});
			if (choice.logprobs?.content != null && choiceSnapshot.message?.role === "assistant") this._emit("logprobs.content.delta", {
				content: choice.logprobs?.content,
				snapshot: choiceSnapshot.logprobs?.content ?? []
			});
			if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === "assistant") this._emit("logprobs.refusal.delta", {
				refusal: choice.logprobs?.refusal,
				snapshot: choiceSnapshot.logprobs?.refusal ?? []
			});
			const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
			if (choiceSnapshot.finish_reason) {
				__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
				if (state.current_tool_call_index != null) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
			}
			for (const toolCall of choice.delta.tool_calls ?? []) {
				if (state.current_tool_call_index !== toolCall.index) {
					__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
					if (state.current_tool_call_index != null) __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
				}
				state.current_tool_call_index = toolCall.index;
			}
			for (const toolCallDelta of choice.delta.tool_calls ?? []) {
				const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
				if (!toolCallSnapshot?.type) continue;
				if (toolCallSnapshot?.type === "function") this._emit("tool_calls.function.arguments.delta", {
					name: toolCallSnapshot.function?.name,
					index: toolCallDelta.index,
					arguments: toolCallSnapshot.function.arguments,
					parsed_arguments: toolCallSnapshot.function.parsed_arguments,
					arguments_delta: toolCallDelta.function?.arguments ?? ""
				});
				else assertNever$1(toolCallSnapshot?.type);
			}
		}
	}, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent(choiceSnapshot, toolCallIndex) {
		if (__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot).done_tool_calls.has(toolCallIndex)) return;
		const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
		if (!toolCallSnapshot) throw new Error("no tool call snapshot");
		if (!toolCallSnapshot.type) throw new Error("tool call snapshot missing `type`");
		if (toolCallSnapshot.type === "function") {
			const inputTool = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => isChatCompletionFunctionTool(tool) && tool.function.name === toolCallSnapshot.function.name);
			this._emit("tool_calls.function.arguments.done", {
				name: toolCallSnapshot.function.name,
				index: toolCallIndex,
				arguments: toolCallSnapshot.function.arguments,
				parsed_arguments: isAutoParsableTool$1(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCallSnapshot.function.arguments) : null
			});
		} else assertNever$1(toolCallSnapshot.type);
	}, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents(choiceSnapshot) {
		const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
		if (choiceSnapshot.message.content && !state.content_done) {
			state.content_done = true;
			const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
			this._emit("content.done", {
				content: choiceSnapshot.message.content,
				parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
			});
		}
		if (choiceSnapshot.message.refusal && !state.refusal_done) {
			state.refusal_done = true;
			this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
		}
		if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
			state.logprobs_content_done = true;
			this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
		}
		if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
			state.logprobs_refusal_done = true;
			this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
		}
	}, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest() {
		if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
		if (!snapshot) throw new OpenAIError(`request ended without sending any chunks`);
		__classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
		__classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
		return finalizeChatCompletion(snapshot, __classPrivateFieldGet(this, _ChatCompletionStream_params, "f"));
	}, _ChatCompletionStream_getAutoParseableResponseFormat = function _ChatCompletionStream_getAutoParseableResponseFormat() {
		const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format;
		if (isAutoParsableResponseFormat(responseFormat)) return responseFormat;
		return null;
	}, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion(chunk) {
		var _a, _b, _c, _d;
		let snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
		const { choices, ...rest } = chunk;
		if (!snapshot) snapshot = __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
			...rest,
			choices: []
		}, "f");
		else Object.assign(snapshot, rest);
		for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
			let choice = snapshot.choices[index];
			if (!choice) choice = snapshot.choices[index] = {
				finish_reason,
				index,
				message: {},
				logprobs,
				...other
			};
			if (logprobs) if (!choice.logprobs) choice.logprobs = Object.assign({}, logprobs);
			else {
				const { content, refusal, ...rest } = logprobs;
				assertIsEmpty(rest);
				Object.assign(choice.logprobs, rest);
				if (content) {
					(_a = choice.logprobs).content ?? (_a.content = []);
					choice.logprobs.content.push(...content);
				}
				if (refusal) {
					(_b = choice.logprobs).refusal ?? (_b.refusal = []);
					choice.logprobs.refusal.push(...refusal);
				}
			}
			if (finish_reason) {
				choice.finish_reason = finish_reason;
				if (__classPrivateFieldGet(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput$1(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"))) {
					if (finish_reason === "length") throw new LengthFinishReasonError();
					if (finish_reason === "content_filter") throw new ContentFilterFinishReasonError();
				}
			}
			Object.assign(choice, other);
			if (!delta) continue;
			const { content, refusal, function_call, role, tool_calls, ...rest } = delta;
			assertIsEmpty(rest);
			Object.assign(choice.message, rest);
			if (refusal) choice.message.refusal = (choice.message.refusal || "") + refusal;
			if (role) choice.message.role = role;
			if (function_call) if (!choice.message.function_call) choice.message.function_call = function_call;
			else {
				if (function_call.name) choice.message.function_call.name = function_call.name;
				if (function_call.arguments) {
					(_c = choice.message.function_call).arguments ?? (_c.arguments = "");
					choice.message.function_call.arguments += function_call.arguments;
				}
			}
			if (content) {
				choice.message.content = (choice.message.content || "") + content;
				if (!choice.message.refusal && __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) choice.message.parsed = partialParse(choice.message.content);
			}
			if (tool_calls) {
				if (!choice.message.tool_calls) choice.message.tool_calls = [];
				for (const { index, id, type, function: fn, ...rest } of tool_calls) {
					const tool_call = (_d = choice.message.tool_calls)[index] ?? (_d[index] = {});
					Object.assign(tool_call, rest);
					if (id) tool_call.id = id;
					if (type) tool_call.type = type;
					if (fn) tool_call.function ?? (tool_call.function = {
						name: fn.name ?? "",
						arguments: ""
					});
					if (fn?.name) tool_call.function.name = fn.name;
					if (fn?.arguments) {
						tool_call.function.arguments += fn.arguments;
						if (shouldParseToolCall(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), tool_call)) tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
					}
				}
			}
		}
		return snapshot;
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("chunk", (chunk) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(chunk);
			else pushQueue.push(chunk);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	toReadableStream() {
		return new Stream(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
};
function finalizeChatCompletion(snapshot, params) {
	const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
	return maybeParseChatCompletion({
		...rest,
		id,
		choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
			if (!finish_reason) throw new OpenAIError(`missing finish_reason for choice ${index}`);
			const { content = null, function_call, tool_calls, ...messageRest } = message;
			const role = message.role;
			if (!role) throw new OpenAIError(`missing role for choice ${index}`);
			if (function_call) {
				const { arguments: args, name } = function_call;
				if (args == null) throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
				if (!name) throw new OpenAIError(`missing function_call.name for choice ${index}`);
				return {
					...choiceRest,
					message: {
						content,
						function_call: {
							arguments: args,
							name
						},
						role,
						refusal: message.refusal ?? null
					},
					finish_reason,
					index,
					logprobs
				};
			}
			if (tool_calls) return {
				...choiceRest,
				index,
				finish_reason,
				logprobs,
				message: {
					...messageRest,
					role,
					content,
					refusal: message.refusal ?? null,
					tool_calls: tool_calls.map((tool_call, i) => {
						const { function: fn, type, id, ...toolRest } = tool_call;
						const { arguments: args, name, ...fnRest } = fn || {};
						if (id == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id\n${str(snapshot)}`);
						if (type == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type\n${str(snapshot)}`);
						if (name == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name\n${str(snapshot)}`);
						if (args == null) throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments\n${str(snapshot)}`);
						return {
							...toolRest,
							id,
							type,
							function: {
								...fnRest,
								name,
								arguments: args
							}
						};
					})
				}
			};
			return {
				...choiceRest,
				message: {
					...messageRest,
					content,
					role,
					refusal: message.refusal ?? null
				},
				finish_reason,
				index,
				logprobs
			};
		}),
		created,
		model,
		object: "chat.completion",
		...system_fingerprint ? { system_fingerprint } : {}
	}, params);
}
function str(x) {
	return JSON.stringify(x);
}
/**
* Ensures the given argument is an empty object, useful for
* asserting that all known properties on an object have been
* destructured.
*/
function assertIsEmpty(obj) {}
function assertNever$1(_x) {}
//#endregion
//#region node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class ChatCompletionStreamingRunner extends ChatCompletionStream {
	static fromReadableStream(stream) {
		const runner = new ChatCompletionStreamingRunner(null);
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	static runTools(client, params, options) {
		const runner = new ChatCompletionStreamingRunner(params);
		const opts = {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "runTools"
			}
		};
		runner._run(() => runner._runTools(client, params, opts));
		return runner;
	}
};
//#endregion
//#region node_modules/openai/resources/chat/completions/completions.mjs
/**
* Given a list of messages comprising a conversation, the model will return a response.
*/
var Completions$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.messages = new Messages$1(this._client);
	}
	create(body, options) {
		return this._client.post("/chat/completions", {
			body,
			...options,
			stream: body.stream ?? false
		});
	}
	/**
	* Get a stored chat completion. Only Chat Completions that have been created with
	* the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* const chatCompletion =
	*   await client.chat.completions.retrieve('completion_id');
	* ```
	*/
	retrieve(completionID, options) {
		return this._client.get(path`/chat/completions/${completionID}`, options);
	}
	/**
	* Modify a stored chat completion. Only Chat Completions that have been created
	* with the `store` parameter set to `true` can be modified. Currently, the only
	* supported modification is to update the `metadata` field.
	*
	* @example
	* ```ts
	* const chatCompletion = await client.chat.completions.update(
	*   'completion_id',
	*   { metadata: { foo: 'string' } },
	* );
	* ```
	*/
	update(completionID, body, options) {
		return this._client.post(path`/chat/completions/${completionID}`, {
			body,
			...options
		});
	}
	/**
	* List stored Chat Completions. Only Chat Completions that have been stored with
	* the `store` parameter set to `true` will be returned.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatCompletion of client.chat.completions.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/chat/completions", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete a stored chat completion. Only Chat Completions that have been created
	* with the `store` parameter set to `true` can be deleted.
	*
	* @example
	* ```ts
	* const chatCompletionDeleted =
	*   await client.chat.completions.delete('completion_id');
	* ```
	*/
	delete(completionID, options) {
		return this._client.delete(path`/chat/completions/${completionID}`, options);
	}
	parse(body, options) {
		validateInputTools(body.tools);
		return this._client.chat.completions.create(body, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "chat.completions.parse"
			}
		})._thenUnwrap((completion) => parseChatCompletion(completion, body));
	}
	runTools(body, options) {
		if (body.stream) return ChatCompletionStreamingRunner.runTools(this._client, body, options);
		return ChatCompletionRunner.runTools(this._client, body, options);
	}
	/**
	* Creates a chat completion stream
	*/
	stream(body, options) {
		return ChatCompletionStream.createChatCompletion(this._client, body, options);
	}
};
Completions$1.Messages = Messages$1;
//#endregion
//#region node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource {
	constructor() {
		super(...arguments);
		this.completions = new Completions$1(this._client);
	}
};
Chat.Completions = Completions$1;
//#endregion
//#region node_modules/openai/internal/headers.mjs
const brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
	if (!headers) return;
	if (brand_privateNullableHeaders in headers) {
		const { values, nulls } = headers;
		yield* values.entries();
		for (const name of nulls) yield [name, null];
		return;
	}
	let shouldClear = false;
	let iter;
	if (headers instanceof Headers) iter = headers.entries();
	else if (isReadonlyArray(headers)) iter = headers;
	else {
		shouldClear = true;
		iter = Object.entries(headers ?? {});
	}
	for (let row of iter) {
		const name = row[0];
		if (typeof name !== "string") throw new TypeError("expected header name to be a string");
		const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
		let didClear = false;
		for (const value of values) {
			if (value === void 0) continue;
			if (shouldClear && !didClear) {
				didClear = true;
				yield [name, null];
			}
			yield [name, value];
		}
	}
}
const buildHeaders = (newHeaders) => {
	const targetHeaders = new Headers();
	const nullHeaders = /* @__PURE__ */ new Set();
	for (const headers of newHeaders) {
		const seenHeaders = /* @__PURE__ */ new Set();
		for (const [name, value] of iterateHeaders(headers)) {
			const lowerName = name.toLowerCase();
			if (!seenHeaders.has(lowerName)) {
				targetHeaders.delete(name);
				seenHeaders.add(lowerName);
			}
			if (value === null) {
				targetHeaders.delete(name);
				nullHeaders.add(lowerName);
			} else {
				targetHeaders.append(name, value);
				nullHeaders.delete(lowerName);
			}
		}
	}
	return {
		[brand_privateNullableHeaders]: true,
		values: targetHeaders,
		nulls: nullHeaders
	};
};
//#endregion
//#region node_modules/openai/resources/audio/speech.mjs
/**
* Turn audio into text or text into audio.
*/
var Speech = class extends APIResource {
	/**
	* Generates audio from the input text.
	*
	* Returns the audio file content, or a stream of audio events.
	*
	* @example
	* ```ts
	* const speech = await client.audio.speech.create({
	*   input: 'input',
	*   model: 'string',
	*   voice: 'ash',
	* });
	*
	* const content = await speech.blob();
	* console.log(content);
	* ```
	*/
	create(body, options) {
		return this._client.post("/audio/speech", {
			body,
			...options,
			headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
			__binaryResponse: true
		});
	}
};
//#endregion
//#region node_modules/openai/resources/audio/transcriptions.mjs
/**
* Turn audio into text or text into audio.
*/
var Transcriptions = class extends APIResource {
	create(body, options) {
		return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
			body,
			...options,
			stream: body.stream ?? false,
			__metadata: { model: body.model }
		}, this._client));
	}
};
//#endregion
//#region node_modules/openai/resources/audio/translations.mjs
/**
* Turn audio into text or text into audio.
*/
var Translations = class extends APIResource {
	create(body, options) {
		return this._client.post("/audio/translations", multipartFormRequestOptions({
			body,
			...options,
			__metadata: { model: body.model }
		}, this._client));
	}
};
//#endregion
//#region node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource {
	constructor() {
		super(...arguments);
		this.transcriptions = new Transcriptions(this._client);
		this.translations = new Translations(this._client);
		this.speech = new Speech(this._client);
	}
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;
//#endregion
//#region node_modules/openai/resources/batches.mjs
/**
* Create large batches of API requests to run asynchronously.
*/
var Batches = class extends APIResource {
	/**
	* Creates and executes a batch from an uploaded file of requests
	*/
	create(body, options) {
		return this._client.post("/batches", {
			body,
			...options
		});
	}
	/**
	* Retrieves a batch.
	*/
	retrieve(batchID, options) {
		return this._client.get(path`/batches/${batchID}`, options);
	}
	/**
	* List your organization's batches.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/batches", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Cancels an in-progress batch. The batch will be in status `cancelling` for up to
	* 10 minutes, before changing to `cancelled`, where it will have partial results
	* (if any) available in the output file.
	*/
	cancel(batchID, options) {
		return this._client.post(path`/batches/${batchID}/cancel`, options);
	}
};
//#endregion
//#region node_modules/openai/resources/beta/assistants.mjs
/**
* Build Assistants that can call models and use tools.
*/
var Assistants = class extends APIResource {
	/**
	* Create an assistant with a model and instructions.
	*
	* @deprecated
	*/
	create(body, options) {
		return this._client.post("/assistants", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieves an assistant.
	*
	* @deprecated
	*/
	retrieve(assistantID, options) {
		return this._client.get(path`/assistants/${assistantID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Modifies an assistant.
	*
	* @deprecated
	*/
	update(assistantID, body, options) {
		return this._client.post(path`/assistants/${assistantID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of assistants.
	*
	* @deprecated
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/assistants", CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Delete an assistant.
	*
	* @deprecated
	*/
	delete(assistantID, options) {
		return this._client.delete(path`/assistants/${assistantID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/realtime/sessions.mjs
var Sessions$1 = class extends APIResource {
	/**
	* Create an ephemeral API token for use in client-side applications with the
	* Realtime API. Can be configured with the same session parameters as the
	* `session.update` client event.
	*
	* It responds with a session object, plus a `client_secret` key which contains a
	* usable ephemeral API token that can be used to authenticate browser clients for
	* the Realtime API.
	*
	* @example
	* ```ts
	* const session =
	*   await client.beta.realtime.sessions.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
var TranscriptionSessions = class extends APIResource {
	/**
	* Create an ephemeral API token for use in client-side applications with the
	* Realtime API specifically for realtime transcriptions. Can be configured with
	* the same session parameters as the `transcription_session.update` client event.
	*
	* It responds with a session object, plus a `client_secret` key which contains a
	* usable ephemeral API token that can be used to authenticate browser clients for
	* the Realtime API.
	*
	* @example
	* ```ts
	* const transcriptionSession =
	*   await client.beta.realtime.transcriptionSessions.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/transcription_sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/realtime/realtime.mjs
/**
* @deprecated Realtime has now launched and is generally available. The old beta API is now deprecated.
*/
var Realtime$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.sessions = new Sessions$1(this._client);
		this.transcriptionSessions = new TranscriptionSessions(this._client);
	}
};
Realtime$1.Sessions = Sessions$1;
Realtime$1.TranscriptionSessions = TranscriptionSessions;
//#endregion
//#region node_modules/openai/resources/beta/chatkit/sessions.mjs
var Sessions = class extends APIResource {
	/**
	* Create a ChatKit session.
	*
	* @example
	* ```ts
	* const chatSession =
	*   await client.beta.chatkit.sessions.create({
	*     user: 'x',
	*     workflow: { id: 'id' },
	*   });
	* ```
	*/
	create(body, options) {
		return this._client.post("/chatkit/sessions", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
	/**
	* Cancel an active ChatKit session and return its most recent metadata.
	*
	* Cancelling prevents new requests from using the issued client secret.
	*
	* @example
	* ```ts
	* const chatSession =
	*   await client.beta.chatkit.sessions.cancel('cksess_123');
	* ```
	*/
	cancel(sessionID, options) {
		return this._client.post(path`/chatkit/sessions/${sessionID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/chatkit/threads.mjs
var Threads$1 = class extends APIResource {
	/**
	* Retrieve a ChatKit thread by its identifier.
	*
	* @example
	* ```ts
	* const chatkitThread =
	*   await client.beta.chatkit.threads.retrieve('cthr_123');
	* ```
	*/
	retrieve(threadID, options) {
		return this._client.get(path`/chatkit/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
	/**
	* List ChatKit threads with optional pagination and user filters.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const chatkitThread of client.beta.chatkit.threads.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/chatkit/threads", ConversationCursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
	/**
	* Delete a ChatKit thread along with its items and stored attachments.
	*
	* @example
	* ```ts
	* const thread = await client.beta.chatkit.threads.delete(
	*   'cthr_123',
	* );
	* ```
	*/
	delete(threadID, options) {
		return this._client.delete(path`/chatkit/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
	/**
	* List items that belong to a ChatKit thread.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const thread of client.beta.chatkit.threads.listItems(
	*   'cthr_123',
	* )) {
	*   // ...
	* }
	* ```
	*/
	listItems(threadID, query = {}, options) {
		return this._client.getAPIList(path`/chatkit/threads/${threadID}/items`, ConversationCursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/chatkit/chatkit.mjs
var ChatKit = class extends APIResource {
	constructor() {
		super(...arguments);
		this.sessions = new Sessions(this._client);
		this.threads = new Threads$1(this._client);
	}
};
ChatKit.Sessions = Sessions;
ChatKit.Threads = Threads$1;
//#endregion
//#region node_modules/openai/resources/beta/threads/messages.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Messages = class extends APIResource {
	/**
	* Create a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	create(threadID, body, options) {
		return this._client.post(path`/threads/${threadID}/messages`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieve a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(messageID, params, options) {
		const { thread_id } = params;
		return this._client.get(path`/threads/${thread_id}/messages/${messageID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Modifies a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(messageID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/messages/${messageID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of messages for a given thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(threadID, query = {}, options) {
		return this._client.getAPIList(path`/threads/${threadID}/messages`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Deletes a message.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	delete(messageID, params, options) {
		const { thread_id } = params;
		return this._client.delete(path`/threads/${thread_id}/messages/${messageID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/beta/threads/runs/steps.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Steps = class extends APIResource {
	/**
	* Retrieves a run step.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(stepID, params, options) {
		const { thread_id, run_id, ...query } = params;
		return this._client.get(path`/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of run steps belonging to a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(runID, params, options) {
		const { thread_id, ...query } = params;
		return this._client.getAPIList(path`/threads/${thread_id}/runs/${runID}/steps`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/internal/utils/base64.mjs
/**
* Converts a Base64 encoded string to a Float32Array.
* @param base64Str - The Base64 encoded string.
* @returns An Array of numbers interpreted as Float32 values.
*/
const toFloat32Array = (base64Str) => {
	if (typeof Buffer !== "undefined") {
		const buf = Buffer.from(base64Str, "base64");
		return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
	} else {
		const binaryStr = atob(base64Str);
		const len = binaryStr.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
		return Array.from(new Float32Array(bytes.buffer));
	}
};
//#endregion
//#region node_modules/openai/internal/utils/env.mjs
/**
* Read an environment variable.
*
* Trims beginning and trailing whitespace.
*
* Will return undefined if the environment variable doesn't exist or cannot be accessed.
*/
const readEnv = (env) => {
	if (typeof globalThis.process !== "undefined") return globalThis.process.env?.[env]?.trim() ?? void 0;
	if (typeof globalThis.Deno !== "undefined") return globalThis.Deno.env?.get?.(env)?.trim();
};
//#endregion
//#region node_modules/openai/lib/AssistantStream.mjs
var _AssistantStream_instances, _a$1, _AssistantStream_events, _AssistantStream_runStepSnapshots, _AssistantStream_messageSnapshots, _AssistantStream_messageSnapshot, _AssistantStream_finalRun, _AssistantStream_currentContentIndex, _AssistantStream_currentContent, _AssistantStream_currentToolCallIndex, _AssistantStream_currentToolCall, _AssistantStream_currentEvent, _AssistantStream_currentRunSnapshot, _AssistantStream_currentRunStepSnapshot, _AssistantStream_addEvent, _AssistantStream_endRequest, _AssistantStream_handleMessage, _AssistantStream_handleRunStep, _AssistantStream_handleEvent, _AssistantStream_accumulateRunStep, _AssistantStream_accumulateMessage, _AssistantStream_accumulateContent, _AssistantStream_handleRun;
var AssistantStream = class extends EventStream {
	constructor() {
		super(...arguments);
		_AssistantStream_instances.add(this);
		_AssistantStream_events.set(this, []);
		_AssistantStream_runStepSnapshots.set(this, {});
		_AssistantStream_messageSnapshots.set(this, {});
		_AssistantStream_messageSnapshot.set(this, void 0);
		_AssistantStream_finalRun.set(this, void 0);
		_AssistantStream_currentContentIndex.set(this, void 0);
		_AssistantStream_currentContent.set(this, void 0);
		_AssistantStream_currentToolCallIndex.set(this, void 0);
		_AssistantStream_currentToolCall.set(this, void 0);
		_AssistantStream_currentEvent.set(this, void 0);
		_AssistantStream_currentRunSnapshot.set(this, void 0);
		_AssistantStream_currentRunStepSnapshot.set(this, void 0);
	}
	[(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("event", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((chunk) => chunk ? {
						value: chunk,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	static fromReadableStream(stream) {
		const runner = new _a$1();
		runner._run(() => runner._fromReadableStream(stream));
		return runner;
	}
	async _fromReadableStream(readableStream, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		this._connected();
		const stream = Stream.fromReadableStream(readableStream, this.controller);
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	toReadableStream() {
		return new Stream(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
	}
	static createToolAssistantStream(runId, runs, params, options) {
		const runner = new _a$1();
		runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createToolAssistantStream(run, runId, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await run.submitToolOutputs(runId, body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	static createThreadAssistantStream(params, thread, options) {
		const runner = new _a$1();
		runner._run(() => runner._threadAssistantStream(params, thread, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	static createAssistantStream(threadId, runs, params, options) {
		const runner = new _a$1();
		runner._run(() => runner._runAssistantStream(threadId, runs, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	currentEvent() {
		return __classPrivateFieldGet(this, _AssistantStream_currentEvent, "f");
	}
	currentRun() {
		return __classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f");
	}
	currentMessageSnapshot() {
		return __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f");
	}
	currentRunStepSnapshot() {
		return __classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f");
	}
	async finalRunSteps() {
		await this.done();
		return Object.values(__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f"));
	}
	async finalMessages() {
		await this.done();
		return Object.values(__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f"));
	}
	async finalRun() {
		await this.done();
		if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) throw Error("Final run was not received.");
		return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
	}
	async _createThreadAssistantStream(thread, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await thread.createAndRun(body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	async _createAssistantStream(run, threadId, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		const body = {
			...params,
			stream: true
		};
		const stream = await run.create(threadId, body, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
	}
	static accumulateDelta(acc, delta) {
		for (const [key, deltaValue] of Object.entries(delta)) {
			if (!acc.hasOwnProperty(key)) {
				acc[key] = deltaValue;
				continue;
			}
			let accValue = acc[key];
			if (accValue === null || accValue === void 0) {
				acc[key] = deltaValue;
				continue;
			}
			if (key === "index" || key === "type") {
				acc[key] = deltaValue;
				continue;
			}
			if (typeof accValue === "string" && typeof deltaValue === "string") accValue += deltaValue;
			else if (typeof accValue === "number" && typeof deltaValue === "number") accValue += deltaValue;
			else if (isObj(accValue) && isObj(deltaValue)) accValue = this.accumulateDelta(accValue, deltaValue);
			else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
				if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
					accValue.push(...deltaValue);
					continue;
				}
				for (const deltaEntry of deltaValue) {
					if (!isObj(deltaEntry)) throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
					const index = deltaEntry["index"];
					if (index == null) {
						console.error(deltaEntry);
						throw new Error("Expected array delta entry to have an `index` property");
					}
					if (typeof index !== "number") throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
					const accEntry = accValue[index];
					if (accEntry == null) accValue.push(deltaEntry);
					else accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
				}
				continue;
			} else throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
			acc[key] = accValue;
		}
		return acc;
	}
	_addRun(run) {
		return run;
	}
	async _threadAssistantStream(params, thread, options) {
		return await this._createThreadAssistantStream(thread, params, options);
	}
	async _runAssistantStream(threadId, runs, params, options) {
		return await this._createAssistantStream(runs, threadId, params, options);
	}
	async _runToolAssistantStream(runId, runs, params, options) {
		return await this._createToolAssistantStream(runs, runId, params, options);
	}
};
_a$1 = AssistantStream, _AssistantStream_addEvent = function _AssistantStream_addEvent(event) {
	if (this.ended) return;
	__classPrivateFieldSet(this, _AssistantStream_currentEvent, event, "f");
	__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
	switch (event.event) {
		case "thread.created": break;
		case "thread.run.created":
		case "thread.run.queued":
		case "thread.run.in_progress":
		case "thread.run.requires_action":
		case "thread.run.completed":
		case "thread.run.incomplete":
		case "thread.run.failed":
		case "thread.run.cancelling":
		case "thread.run.cancelled":
		case "thread.run.expired":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
			break;
		case "thread.run.step.created":
		case "thread.run.step.in_progress":
		case "thread.run.step.delta":
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
			break;
		case "thread.message.created":
		case "thread.message.in_progress":
		case "thread.message.delta":
		case "thread.message.completed":
		case "thread.message.incomplete":
			__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
			break;
		case "error": throw new Error("Encountered an error event in event processing - errors should be processed earlier");
		default: assertNever(event);
	}
}, _AssistantStream_endRequest = function _AssistantStream_endRequest() {
	if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
	if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f")) throw Error("Final run has not been received");
	return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage(event) {
	const [accumulatedMessage, newContent] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
	__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
	__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
	for (const content of newContent) {
		const snapshotContent = accumulatedMessage.content[content.index];
		if (snapshotContent?.type == "text") this._emit("textCreated", snapshotContent.text);
	}
	switch (event.event) {
		case "thread.message.created":
			this._emit("messageCreated", event.data);
			break;
		case "thread.message.in_progress": break;
		case "thread.message.delta":
			this._emit("messageDelta", event.data.delta, accumulatedMessage);
			if (event.data.delta.content) for (const content of event.data.delta.content) {
				if (content.type == "text" && content.text) {
					let textDelta = content.text;
					let snapshot = accumulatedMessage.content[content.index];
					if (snapshot && snapshot.type == "text") this._emit("textDelta", textDelta, snapshot.text);
					else throw Error("The snapshot associated with this text delta is not text or missing");
				}
				if (content.index != __classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")) {
					if (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f")) switch (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").type) {
						case "text":
							this._emit("textDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
							break;
						case "image_file":
							this._emit("imageFileDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
							break;
					}
					__classPrivateFieldSet(this, _AssistantStream_currentContentIndex, content.index, "f");
				}
				__classPrivateFieldSet(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
			}
			break;
		case "thread.message.completed":
		case "thread.message.incomplete":
			if (__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
				const currentContent = event.data.content[__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")];
				if (currentContent) switch (currentContent.type) {
					case "image_file":
						this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
						break;
					case "text":
						this._emit("textDone", currentContent.text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
						break;
				}
			}
			if (__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f")) this._emit("messageDone", event.data);
			__classPrivateFieldSet(this, _AssistantStream_messageSnapshot, void 0, "f");
	}
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep(event) {
	const accumulatedRunStep = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
	__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
	switch (event.event) {
		case "thread.run.step.created":
			this._emit("runStepCreated", event.data);
			break;
		case "thread.run.step.delta":
			const delta = event.data.delta;
			if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") for (const toolCall of delta.step_details.tool_calls) if (toolCall.index == __classPrivateFieldGet(this, _AssistantStream_currentToolCallIndex, "f")) this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
			else {
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
				__classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
				__classPrivateFieldSet(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) this._emit("toolCallCreated", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
			}
			this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
			break;
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
			__classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
			if (event.data.step_details.type == "tool_calls") {
				if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
					this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
					__classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
				}
			}
			this._emit("runStepDone", event.data, accumulatedRunStep);
			break;
		case "thread.run.step.in_progress": break;
	}
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent(event) {
	__classPrivateFieldGet(this, _AssistantStream_events, "f").push(event);
	this._emit("event", event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep(event) {
	switch (event.event) {
		case "thread.run.step.created":
			__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
			return event.data;
		case "thread.run.step.delta":
			let snapshot = __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
			if (!snapshot) throw Error("Received a RunStepDelta before creation of a snapshot");
			let data = event.data;
			if (data.delta) {
				const accumulated = _a$1.accumulateDelta(snapshot, data.delta);
				__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
			}
			return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
		case "thread.run.step.completed":
		case "thread.run.step.failed":
		case "thread.run.step.cancelled":
		case "thread.run.step.expired":
		case "thread.run.step.in_progress":
			__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
			break;
	}
	if (__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id]) return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
	throw new Error("No snapshot available");
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage(event, snapshot) {
	let newContent = [];
	switch (event.event) {
		case "thread.message.created": return [event.data, newContent];
		case "thread.message.delta":
			if (!snapshot) throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
			let data = event.data;
			if (data.delta.content) for (const contentElement of data.delta.content) if (contentElement.index in snapshot.content) {
				let currentContent = snapshot.content[contentElement.index];
				snapshot.content[contentElement.index] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
			} else {
				snapshot.content[contentElement.index] = contentElement;
				newContent.push(contentElement);
			}
			return [snapshot, newContent];
		case "thread.message.in_progress":
		case "thread.message.completed":
		case "thread.message.incomplete": if (snapshot) return [snapshot, newContent];
		else throw Error("Received thread message event with no existing snapshot");
	}
	throw Error("Tried to accumulate a non-message event");
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent(contentElement, currentContent) {
	return _a$1.accumulateDelta(currentContent, contentElement);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun(event) {
	__classPrivateFieldSet(this, _AssistantStream_currentRunSnapshot, event.data, "f");
	switch (event.event) {
		case "thread.run.created": break;
		case "thread.run.queued": break;
		case "thread.run.in_progress": break;
		case "thread.run.requires_action":
		case "thread.run.cancelled":
		case "thread.run.failed":
		case "thread.run.completed":
		case "thread.run.expired":
		case "thread.run.incomplete":
			__classPrivateFieldSet(this, _AssistantStream_finalRun, event.data, "f");
			if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
				this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
				__classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
			}
			break;
		case "thread.run.cancelling": break;
	}
};
function assertNever(_x) {}
//#endregion
//#region node_modules/openai/resources/beta/threads/runs/runs.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Runs$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.steps = new Steps(this._client);
	}
	create(threadID, params, options) {
		const { include, ...body } = params;
		return this._client.post(path`/threads/${threadID}/runs`, {
			query: { include },
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: params.stream ?? false,
			__synthesizeEventData: true
		});
	}
	/**
	* Retrieves a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(runID, params, options) {
		const { thread_id } = params;
		return this._client.get(path`/threads/${thread_id}/runs/${runID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Modifies a run.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(runID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of runs belonging to a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	list(threadID, query = {}, options) {
		return this._client.getAPIList(path`/threads/${threadID}/runs`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Cancels a run that is `in_progress`.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	cancel(runID, params, options) {
		const { thread_id } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* A helper to create a run an poll for a terminal state. More information on Run
	* lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async createAndPoll(threadId, body, options) {
		const run = await this.create(threadId, body, options);
		return await this.poll(run.id, { thread_id: threadId }, options);
	}
	/**
	* Create a Run stream
	*
	* @deprecated use `stream` instead
	*/
	createAndStream(threadId, body, options) {
		return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
	}
	/**
	* A helper to poll a run status until it reaches a terminal state. More
	* information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async poll(runId, params, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const { data: run, response } = await this.retrieve(runId, params, {
				...options,
				headers: {
					...options?.headers,
					...headers
				}
			}).withResponse();
			switch (run.status) {
				case "queued":
				case "in_progress":
				case "cancelling":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "requires_action":
				case "incomplete":
				case "cancelled":
				case "completed":
				case "failed":
				case "expired": return run;
			}
		}
	}
	/**
	* Create a Run stream
	*/
	stream(threadId, body, options) {
		return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
	}
	submitToolOutputs(runID, params, options) {
		const { thread_id, ...body } = params;
		return this._client.post(path`/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: params.stream ?? false,
			__synthesizeEventData: true
		});
	}
	/**
	* A helper to submit a tool output to a run and poll for a terminal run state.
	* More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async submitToolOutputsAndPoll(runId, params, options) {
		const run = await this.submitToolOutputs(runId, params, options);
		return await this.poll(run.id, params, options);
	}
	/**
	* Submit the tool outputs from a previous run and stream the run to a terminal
	* state. More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	submitToolOutputsStream(runId, params, options) {
		return AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
	}
};
Runs$1.Steps = Steps;
//#endregion
//#region node_modules/openai/resources/beta/threads/threads.mjs
/**
* Build Assistants that can call models and use tools.
*
* @deprecated The Assistants API is deprecated in favor of the Responses API
*/
var Threads = class extends APIResource {
	constructor() {
		super(...arguments);
		this.runs = new Runs$1(this._client);
		this.messages = new Messages(this._client);
	}
	/**
	* Create a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	create(body = {}, options) {
		return this._client.post("/threads", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieves a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	retrieve(threadID, options) {
		return this._client.get(path`/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Modifies a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	update(threadID, body, options) {
		return this._client.post(path`/threads/${threadID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Delete a thread.
	*
	* @deprecated The Assistants API is deprecated in favor of the Responses API
	*/
	delete(threadID, options) {
		return this._client.delete(path`/threads/${threadID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	createAndRun(body, options) {
		return this._client.post("/threads/runs", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
			stream: body.stream ?? false,
			__synthesizeEventData: true
		});
	}
	/**
	* A helper to create a thread, start a run and then poll for a terminal state.
	* More information on Run lifecycles can be found here:
	* https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
	*/
	async createAndRunPoll(body, options) {
		const run = await this.createAndRun(body, options);
		return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
	}
	/**
	* Create a thread and stream the run back
	*/
	createAndRunStream(body, options) {
		return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
	}
};
Threads.Runs = Runs$1;
Threads.Messages = Messages;
//#endregion
//#region node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource {
	constructor() {
		super(...arguments);
		this.realtime = new Realtime$1(this._client);
		this.chatkit = new ChatKit(this._client);
		this.assistants = new Assistants(this._client);
		this.threads = new Threads(this._client);
	}
};
Beta.Realtime = Realtime$1;
Beta.ChatKit = ChatKit;
Beta.Assistants = Assistants;
Beta.Threads = Threads;
//#endregion
//#region node_modules/openai/resources/completions.mjs
/**
* Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
*/
var Completions = class extends APIResource {
	create(body, options) {
		return this._client.post("/completions", {
			body,
			...options,
			stream: body.stream ?? false
		});
	}
};
//#endregion
//#region node_modules/openai/resources/containers/files/content.mjs
var Content$2 = class extends APIResource {
	/**
	* Retrieve Container File Content
	*/
	retrieve(fileID, params, options) {
		const { container_id } = params;
		return this._client.get(path`/containers/${container_id}/files/${fileID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__binaryResponse: true
		});
	}
};
//#endregion
//#region node_modules/openai/resources/containers/files/files.mjs
var Files$2 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content$2(this._client);
	}
	/**
	* Create a Container File
	*
	* You can send either a multipart/form-data request with the raw file content, or
	* a JSON request with a file ID.
	*/
	create(containerID, body, options) {
		return this._client.post(path`/containers/${containerID}/files`, maybeMultipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	/**
	* Retrieve Container File
	*/
	retrieve(fileID, params, options) {
		const { container_id } = params;
		return this._client.get(path`/containers/${container_id}/files/${fileID}`, options);
	}
	/**
	* List Container files
	*/
	list(containerID, query = {}, options) {
		return this._client.getAPIList(path`/containers/${containerID}/files`, CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete Container File
	*/
	delete(fileID, params, options) {
		const { container_id } = params;
		return this._client.delete(path`/containers/${container_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
};
Files$2.Content = Content$2;
//#endregion
//#region node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource {
	constructor() {
		super(...arguments);
		this.files = new Files$2(this._client);
	}
	/**
	* Create Container
	*/
	create(body, options) {
		return this._client.post("/containers", {
			body,
			...options
		});
	}
	/**
	* Retrieve Container
	*/
	retrieve(containerID, options) {
		return this._client.get(path`/containers/${containerID}`, options);
	}
	/**
	* List Containers
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/containers", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete Container
	*/
	delete(containerID, options) {
		return this._client.delete(path`/containers/${containerID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
};
Containers.Files = Files$2;
//#endregion
//#region node_modules/openai/resources/conversations/items.mjs
/**
* Manage conversations and conversation items.
*/
var Items = class extends APIResource {
	/**
	* Create items in a conversation with the given ID.
	*/
	create(conversationID, params, options) {
		const { include, ...body } = params;
		return this._client.post(path`/conversations/${conversationID}/items`, {
			query: { include },
			body,
			...options
		});
	}
	/**
	* Get a single item from a conversation with the given IDs.
	*/
	retrieve(itemID, params, options) {
		const { conversation_id, ...query } = params;
		return this._client.get(path`/conversations/${conversation_id}/items/${itemID}`, {
			query,
			...options
		});
	}
	/**
	* List all items for a conversation with the given ID.
	*/
	list(conversationID, query = {}, options) {
		return this._client.getAPIList(path`/conversations/${conversationID}/items`, ConversationCursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete an item from a conversation with the given IDs.
	*/
	delete(itemID, params, options) {
		const { conversation_id } = params;
		return this._client.delete(path`/conversations/${conversation_id}/items/${itemID}`, options);
	}
};
//#endregion
//#region node_modules/openai/resources/conversations/conversations.mjs
/**
* Manage conversations and conversation items.
*/
var Conversations = class extends APIResource {
	constructor() {
		super(...arguments);
		this.items = new Items(this._client);
	}
	/**
	* Create a conversation.
	*/
	create(body = {}, options) {
		return this._client.post("/conversations", {
			body,
			...options
		});
	}
	/**
	* Get a conversation
	*/
	retrieve(conversationID, options) {
		return this._client.get(path`/conversations/${conversationID}`, options);
	}
	/**
	* Update a conversation
	*/
	update(conversationID, body, options) {
		return this._client.post(path`/conversations/${conversationID}`, {
			body,
			...options
		});
	}
	/**
	* Delete a conversation. Items in the conversation will not be deleted.
	*/
	delete(conversationID, options) {
		return this._client.delete(path`/conversations/${conversationID}`, options);
	}
};
Conversations.Items = Items;
//#endregion
//#region node_modules/openai/resources/embeddings.mjs
/**
* Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
*/
var Embeddings = class extends APIResource {
	/**
	* Creates an embedding vector representing the input text.
	*
	* @example
	* ```ts
	* const createEmbeddingResponse =
	*   await client.embeddings.create({
	*     input: 'The quick brown fox jumped over the lazy dog',
	*     model: 'text-embedding-3-small',
	*   });
	* ```
	*/
	create(body, options) {
		const hasUserProvidedEncodingFormat = !!body.encoding_format;
		let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
		if (hasUserProvidedEncodingFormat) loggerFor(this._client).debug("embeddings/user defined encoding_format:", body.encoding_format);
		const response = this._client.post("/embeddings", {
			body: {
				...body,
				encoding_format
			},
			...options
		});
		if (hasUserProvidedEncodingFormat) return response;
		loggerFor(this._client).debug("embeddings/decoding base64 embeddings from base64");
		return response._thenUnwrap((response) => {
			if (response && response.data) response.data.forEach((embeddingBase64Obj) => {
				const embeddingBase64Str = embeddingBase64Obj.embedding;
				embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
			});
			return response;
		});
	}
};
//#endregion
//#region node_modules/openai/resources/evals/runs/output-items.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var OutputItems = class extends APIResource {
	/**
	* Get an evaluation run output item by ID.
	*/
	retrieve(outputItemID, params, options) {
		const { eval_id, run_id } = params;
		return this._client.get(path`/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, options);
	}
	/**
	* Get a list of output items for an evaluation run.
	*/
	list(runID, params, options) {
		const { eval_id, ...query } = params;
		return this._client.getAPIList(path`/evals/${eval_id}/runs/${runID}/output_items`, CursorPage, {
			query,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/evals/runs/runs.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var Runs = class extends APIResource {
	constructor() {
		super(...arguments);
		this.outputItems = new OutputItems(this._client);
	}
	/**
	* Kicks off a new run for a given evaluation, specifying the data source, and what
	* model configuration to use to test. The datasource will be validated against the
	* schema specified in the config of the evaluation.
	*/
	create(evalID, body, options) {
		return this._client.post(path`/evals/${evalID}/runs`, {
			body,
			...options
		});
	}
	/**
	* Get an evaluation run by ID.
	*/
	retrieve(runID, params, options) {
		const { eval_id } = params;
		return this._client.get(path`/evals/${eval_id}/runs/${runID}`, options);
	}
	/**
	* Get a list of runs for an evaluation.
	*/
	list(evalID, query = {}, options) {
		return this._client.getAPIList(path`/evals/${evalID}/runs`, CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete an eval run.
	*/
	delete(runID, params, options) {
		const { eval_id } = params;
		return this._client.delete(path`/evals/${eval_id}/runs/${runID}`, options);
	}
	/**
	* Cancel an ongoing evaluation run.
	*/
	cancel(runID, params, options) {
		const { eval_id } = params;
		return this._client.post(path`/evals/${eval_id}/runs/${runID}`, options);
	}
};
Runs.OutputItems = OutputItems;
//#endregion
//#region node_modules/openai/resources/evals/evals.mjs
/**
* Manage and run evals in the OpenAI platform.
*/
var Evals = class extends APIResource {
	constructor() {
		super(...arguments);
		this.runs = new Runs(this._client);
	}
	/**
	* Create the structure of an evaluation that can be used to test a model's
	* performance. An evaluation is a set of testing criteria and the config for a
	* data source, which dictates the schema of the data used in the evaluation. After
	* creating an evaluation, you can run it on different models and model parameters.
	* We support several types of graders and datasources. For more information, see
	* the [Evals guide](https://platform.openai.com/docs/guides/evals).
	*/
	create(body, options) {
		return this._client.post("/evals", {
			body,
			...options
		});
	}
	/**
	* Get an evaluation by ID.
	*/
	retrieve(evalID, options) {
		return this._client.get(path`/evals/${evalID}`, options);
	}
	/**
	* Update certain properties of an evaluation.
	*/
	update(evalID, body, options) {
		return this._client.post(path`/evals/${evalID}`, {
			body,
			...options
		});
	}
	/**
	* List evaluations for a project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/evals", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete an evaluation.
	*/
	delete(evalID, options) {
		return this._client.delete(path`/evals/${evalID}`, options);
	}
};
Evals.Runs = Runs;
//#endregion
//#region node_modules/openai/resources/files.mjs
/**
* Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
*/
var Files$1 = class extends APIResource {
	/**
	* Upload a file that can be used across various endpoints. Individual files can be
	* up to 512 MB, and each project can store up to 2.5 TB of files in total. There
	* is no organization-wide storage limit.
	*
	* - The Assistants API supports files up to 2 million tokens and of specific file
	*   types. See the
	*   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
	*   for details.
	* - The Fine-tuning API only supports `.jsonl` files. The input also has certain
	*   required formats for fine-tuning
	*   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
	*   or
	*   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
	*   models.
	* - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
	*   also has a specific required
	*   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
	*
	* Please [contact us](https://help.openai.com/) if you need to increase these
	* storage limits.
	*/
	create(body, options) {
		return this._client.post("/files", multipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	/**
	* Returns information about a specific file.
	*/
	retrieve(fileID, options) {
		return this._client.get(path`/files/${fileID}`, options);
	}
	/**
	* Returns a list of files.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/files", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete a file and remove it from all vector stores.
	*/
	delete(fileID, options) {
		return this._client.delete(path`/files/${fileID}`, options);
	}
	/**
	* Returns the contents of the specified file.
	*/
	content(fileID, options) {
		return this._client.get(path`/files/${fileID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__binaryResponse: true
		});
	}
	/**
	* Waits for the given file to be processed, default timeout is 30 mins.
	*/
	async waitForProcessing(id, { pollInterval = 5e3, maxWait = 1800 * 1e3 } = {}) {
		const TERMINAL_STATES = new Set([
			"processed",
			"error",
			"deleted"
		]);
		const start = Date.now();
		let file = await this.retrieve(id);
		while (!file.status || !TERMINAL_STATES.has(file.status)) {
			await sleep(pollInterval);
			file = await this.retrieve(id);
			if (Date.now() - start > maxWait) throw new APIConnectionTimeoutError({ message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.` });
		}
		return file;
	}
};
//#endregion
//#region node_modules/openai/resources/fine-tuning/methods.mjs
var Methods = class extends APIResource {};
//#endregion
//#region node_modules/openai/resources/fine-tuning/alpha/graders.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Graders$1 = class extends APIResource {
	/**
	* Run a grader.
	*
	* @example
	* ```ts
	* const response = await client.fineTuning.alpha.graders.run({
	*   grader: {
	*     input: 'input',
	*     name: 'name',
	*     operation: 'eq',
	*     reference: 'reference',
	*     type: 'string_check',
	*   },
	*   model_sample: 'model_sample',
	* });
	* ```
	*/
	run(body, options) {
		return this._client.post("/fine_tuning/alpha/graders/run", {
			body,
			...options
		});
	}
	/**
	* Validate a grader.
	*
	* @example
	* ```ts
	* const response =
	*   await client.fineTuning.alpha.graders.validate({
	*     grader: {
	*       input: 'input',
	*       name: 'name',
	*       operation: 'eq',
	*       reference: 'reference',
	*       type: 'string_check',
	*     },
	*   });
	* ```
	*/
	validate(body, options) {
		return this._client.post("/fine_tuning/alpha/graders/validate", {
			body,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource {
	constructor() {
		super(...arguments);
		this.graders = new Graders$1(this._client);
	}
};
Alpha.Graders = Graders$1;
//#endregion
//#region node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Permissions = class extends APIResource {
	/**
	* **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
	*
	* This enables organization owners to share fine-tuned models with other projects
	* in their organization.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
	*   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
	*   { project_ids: ['string'] },
	* )) {
	*   // ...
	* }
	* ```
	*/
	create(fineTunedModelCheckpoint, body, options) {
		return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, Page, {
			body,
			method: "post",
			...options
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to view all permissions for a
	* fine-tuned model checkpoint.
	*
	* @deprecated Retrieve is deprecated. Please swap to the paginated list method instead.
	*/
	retrieve(fineTunedModelCheckpoint, query = {}, options) {
		return this._client.get(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
			query,
			...options
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to view all permissions for a
	* fine-tuned model checkpoint.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const permissionListResponse of client.fineTuning.checkpoints.permissions.list(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(fineTunedModelCheckpoint, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, ConversationCursorPage, {
			query,
			...options
		});
	}
	/**
	* **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
	*
	* Organization owners can use this endpoint to delete a permission for a
	* fine-tuned model checkpoint.
	*
	* @example
	* ```ts
	* const permission =
	*   await client.fineTuning.checkpoints.permissions.delete(
	*     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
	*     {
	*       fine_tuned_model_checkpoint:
	*         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
	*     },
	*   );
	* ```
	*/
	delete(permissionID, params, options) {
		const { fine_tuned_model_checkpoint } = params;
		return this._client.delete(path`/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, options);
	}
};
//#endregion
//#region node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints$1 = class extends APIResource {
	constructor() {
		super(...arguments);
		this.permissions = new Permissions(this._client);
	}
};
Checkpoints$1.Permissions = Permissions;
//#endregion
//#region node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Checkpoints = class extends APIResource {
	/**
	* List checkpoints for a fine-tuning job.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(fineTuningJobID, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, CursorPage, {
			query,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
/**
* Manage fine-tuning jobs to tailor a model to your specific training data.
*/
var Jobs = class extends APIResource {
	constructor() {
		super(...arguments);
		this.checkpoints = new Checkpoints(this._client);
	}
	/**
	* Creates a fine-tuning job which begins the process of creating a new model from
	* a given dataset.
	*
	* Response includes details of the enqueued job including job status and the name
	* of the fine-tuned models once complete.
	*
	* [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.create({
	*   model: 'gpt-4o-mini',
	*   training_file: 'file-abc123',
	* });
	* ```
	*/
	create(body, options) {
		return this._client.post("/fine_tuning/jobs", {
			body,
			...options
		});
	}
	/**
	* Get info about a fine-tuning job.
	*
	* [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.retrieve(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	retrieve(fineTuningJobID, options) {
		return this._client.get(path`/fine_tuning/jobs/${fineTuningJobID}`, options);
	}
	/**
	* List your organization's fine-tuning jobs
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJob of client.fineTuning.jobs.list()) {
	*   // ...
	* }
	* ```
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/fine_tuning/jobs", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Immediately cancel a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.cancel(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	cancel(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/cancel`, options);
	}
	/**
	* Get status updates for a fine-tuning job.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* )) {
	*   // ...
	* }
	* ```
	*/
	listEvents(fineTuningJobID, query = {}, options) {
		return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/events`, CursorPage, {
			query,
			...options
		});
	}
	/**
	* Pause a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.pause(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	pause(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/pause`, options);
	}
	/**
	* Resume a fine-tune job.
	*
	* @example
	* ```ts
	* const fineTuningJob = await client.fineTuning.jobs.resume(
	*   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
	* );
	* ```
	*/
	resume(fineTuningJobID, options) {
		return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/resume`, options);
	}
};
Jobs.Checkpoints = Checkpoints;
//#endregion
//#region node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource {
	constructor() {
		super(...arguments);
		this.methods = new Methods(this._client);
		this.jobs = new Jobs(this._client);
		this.checkpoints = new Checkpoints$1(this._client);
		this.alpha = new Alpha(this._client);
	}
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.Checkpoints = Checkpoints$1;
FineTuning.Alpha = Alpha;
//#endregion
//#region node_modules/openai/resources/graders/grader-models.mjs
var GraderModels = class extends APIResource {};
//#endregion
//#region node_modules/openai/resources/graders/graders.mjs
var Graders = class extends APIResource {
	constructor() {
		super(...arguments);
		this.graderModels = new GraderModels(this._client);
	}
};
Graders.GraderModels = GraderModels;
//#endregion
//#region node_modules/openai/resources/images.mjs
/**
* Given a prompt and/or an input image, the model will generate a new image.
*/
var Images = class extends APIResource {
	/**
	* Creates a variation of a given image. This endpoint only supports `dall-e-2`.
	*
	* @example
	* ```ts
	* const imagesResponse = await client.images.createVariation({
	*   image: fs.createReadStream('otter.png'),
	* });
	* ```
	*/
	createVariation(body, options) {
		return this._client.post("/images/variations", multipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	edit(body, options) {
		return this._client.post("/images/edits", multipartFormRequestOptions({
			body,
			...options,
			stream: body.stream ?? false
		}, this._client));
	}
	generate(body, options) {
		return this._client.post("/images/generations", {
			body,
			...options,
			stream: body.stream ?? false
		});
	}
};
//#endregion
//#region node_modules/openai/resources/models.mjs
/**
* List and describe the various models available in the API.
*/
var Models = class extends APIResource {
	/**
	* Retrieves a model instance, providing basic information about the model such as
	* the owner and permissioning.
	*/
	retrieve(model, options) {
		return this._client.get(path`/models/${model}`, options);
	}
	/**
	* Lists the currently available models, and provides basic information about each
	* one such as the owner and availability.
	*/
	list(options) {
		return this._client.getAPIList("/models", Page, options);
	}
	/**
	* Delete a fine-tuned model. You must have the Owner role in your organization to
	* delete a model.
	*/
	delete(model, options) {
		return this._client.delete(path`/models/${model}`, options);
	}
};
//#endregion
//#region node_modules/openai/resources/moderations.mjs
/**
* Given text and/or image inputs, classifies if those inputs are potentially harmful.
*/
var Moderations = class extends APIResource {
	/**
	* Classifies if text and/or image inputs are potentially harmful. Learn more in
	* the [moderation guide](https://platform.openai.com/docs/guides/moderation).
	*/
	create(body, options) {
		return this._client.post("/moderations", {
			body,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/realtime/calls.mjs
var Calls = class extends APIResource {
	/**
	* Accept an incoming SIP call and configure the realtime session that will handle
	* it.
	*
	* @example
	* ```ts
	* await client.realtime.calls.accept('call_id', {
	*   type: 'realtime',
	* });
	* ```
	*/
	accept(callID, body, options) {
		return this._client.post(path`/realtime/calls/${callID}/accept`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
	/**
	* End an active Realtime API call, whether it was initiated over SIP or WebRTC.
	*
	* @example
	* ```ts
	* await client.realtime.calls.hangup('call_id');
	* ```
	*/
	hangup(callID, options) {
		return this._client.post(path`/realtime/calls/${callID}/hangup`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
	/**
	* Transfer an active SIP call to a new destination using the SIP REFER verb.
	*
	* @example
	* ```ts
	* await client.realtime.calls.refer('call_id', {
	*   target_uri: 'tel:+14155550123',
	* });
	* ```
	*/
	refer(callID, body, options) {
		return this._client.post(path`/realtime/calls/${callID}/refer`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
	/**
	* Decline an incoming SIP call by returning a SIP status code to the caller.
	*
	* @example
	* ```ts
	* await client.realtime.calls.reject('call_id');
	* ```
	*/
	reject(callID, body = {}, options) {
		return this._client.post(path`/realtime/calls/${callID}/reject`, {
			body,
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/realtime/client-secrets.mjs
var ClientSecrets = class extends APIResource {
	/**
	* Create a Realtime client secret with an associated session configuration.
	*
	* Client secrets are short-lived tokens that can be passed to a client app, such
	* as a web frontend or mobile client, which grants access to the Realtime API
	* without leaking your main API key. You can configure a custom TTL for each
	* client secret.
	*
	* You can also attach session configuration options to the client secret, which
	* will be applied to any sessions created using that client secret, but these can
	* also be overridden by the client connection.
	*
	* [Learn more about authentication with client secrets over WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc).
	*
	* Returns the created client secret and the effective session object. The client
	* secret is a string that looks like `ek_1234`.
	*
	* @example
	* ```ts
	* const clientSecret =
	*   await client.realtime.clientSecrets.create();
	* ```
	*/
	create(body, options) {
		return this._client.post("/realtime/client_secrets", {
			body,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/realtime/realtime.mjs
var Realtime = class extends APIResource {
	constructor() {
		super(...arguments);
		this.clientSecrets = new ClientSecrets(this._client);
		this.calls = new Calls(this._client);
	}
};
Realtime.ClientSecrets = ClientSecrets;
Realtime.Calls = Calls;
//#endregion
//#region node_modules/openai/lib/ResponsesParser.mjs
function maybeParseResponse(response, params) {
	if (!params || !hasAutoParseableInput(params)) return {
		...response,
		output_parsed: null,
		output: response.output.map((item) => {
			if (item.type === "function_call") return {
				...item,
				parsed_arguments: null
			};
			if (item.type === "message") return {
				...item,
				content: item.content.map((content) => ({
					...content,
					parsed: null
				}))
			};
			else return item;
		})
	};
	return parseResponse(response, params);
}
function parseResponse(response, params) {
	const output = response.output.map((item) => {
		if (item.type === "function_call") return {
			...item,
			parsed_arguments: parseToolCall(params, item)
		};
		if (item.type === "message") {
			const content = item.content.map((content) => {
				if (content.type === "output_text") return {
					...content,
					parsed: parseTextFormat(params, content.text)
				};
				return content;
			});
			return {
				...item,
				content
			};
		}
		return item;
	});
	const parsed = Object.assign({}, response, { output });
	if (!Object.getOwnPropertyDescriptor(response, "output_text")) addOutputText(parsed);
	Object.defineProperty(parsed, "output_parsed", {
		enumerable: true,
		get() {
			for (const output of parsed.output) {
				if (output.type !== "message") continue;
				for (const content of output.content) if (content.type === "output_text" && content.parsed !== null) return content.parsed;
			}
			return null;
		}
	});
	return parsed;
}
function parseTextFormat(params, content) {
	if (params.text?.format?.type !== "json_schema") return null;
	if ("$parseRaw" in params.text?.format) return (params.text?.format).$parseRaw(content);
	return JSON.parse(content);
}
function hasAutoParseableInput(params) {
	if (isAutoParsableResponseFormat(params.text?.format)) return true;
	return false;
}
function isAutoParsableTool(tool) {
	return tool?.["$brand"] === "auto-parseable-tool";
}
function getInputToolByName(input_tools, name) {
	return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
function parseToolCall(params, toolCall) {
	const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
	return {
		...toolCall,
		...toolCall,
		parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : inputTool?.strict ? JSON.parse(toolCall.arguments) : null
	};
}
function addOutputText(rsp) {
	const texts = [];
	for (const output of rsp.output) {
		if (output.type !== "message") continue;
		for (const content of output.content) if (content.type === "output_text") texts.push(content.text);
	}
	rsp.output_text = texts.join("");
}
//#endregion
//#region node_modules/openai/lib/responses/ResponseStream.mjs
var _ResponseStream_instances, _ResponseStream_params, _ResponseStream_currentResponseSnapshot, _ResponseStream_finalResponse, _ResponseStream_beginRequest, _ResponseStream_addEvent, _ResponseStream_endRequest, _ResponseStream_accumulateResponse;
var ResponseStream = class ResponseStream extends EventStream {
	constructor(params) {
		super();
		_ResponseStream_instances.add(this);
		_ResponseStream_params.set(this, void 0);
		_ResponseStream_currentResponseSnapshot.set(this, void 0);
		_ResponseStream_finalResponse.set(this, void 0);
		__classPrivateFieldSet(this, _ResponseStream_params, params, "f");
	}
	static createResponse(client, params, options) {
		const runner = new ResponseStream(params);
		runner._run(() => runner._createOrRetrieveResponse(client, params, {
			...options,
			headers: {
				...options?.headers,
				"X-Stainless-Helper-Method": "stream"
			}
		}));
		return runner;
	}
	async _createOrRetrieveResponse(client, params, options) {
		const signal = options?.signal;
		if (signal) {
			if (signal.aborted) this.controller.abort();
			signal.addEventListener("abort", () => this.controller.abort());
		}
		__classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
		let stream;
		let starting_after = null;
		if ("response_id" in params) {
			stream = await client.responses.retrieve(params.response_id, { stream: true }, {
				...options,
				signal: this.controller.signal,
				stream: true
			});
			starting_after = params.starting_after ?? null;
		} else stream = await client.responses.create({
			...params,
			stream: true
		}, {
			...options,
			signal: this.controller.signal
		});
		this._connected();
		for await (const event of stream) __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
		if (stream.controller.signal?.aborted) throw new APIUserAbortError();
		return __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
	}
	[(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest() {
		if (this.ended) return;
		__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
	}, _ResponseStream_addEvent = function _ResponseStream_addEvent(event, starting_after) {
		if (this.ended) return;
		const maybeEmit = (name, event) => {
			if (starting_after == null || event.sequence_number > starting_after) this._emit(name, event);
		};
		const response = __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
		maybeEmit("event", event);
		switch (event.type) {
			case "response.output_text.delta": {
				const output = response.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "message") {
					const content = output.content[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "output_text") throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
					maybeEmit("response.output_text.delta", {
						...event,
						snapshot: content.text
					});
				}
				break;
			}
			case "response.function_call_arguments.delta": {
				const output = response.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "function_call") maybeEmit("response.function_call_arguments.delta", {
					...event,
					snapshot: output.arguments
				});
				break;
			}
			default:
				maybeEmit(event.type, event);
				break;
		}
	}, _ResponseStream_endRequest = function _ResponseStream_endRequest() {
		if (this.ended) throw new OpenAIError(`stream has ended, this shouldn't happen`);
		const snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
		if (!snapshot) throw new OpenAIError(`request ended without sending any events`);
		__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
		const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet(this, _ResponseStream_params, "f"));
		__classPrivateFieldSet(this, _ResponseStream_finalResponse, parsedResponse, "f");
		return parsedResponse;
	}, _ResponseStream_accumulateResponse = function _ResponseStream_accumulateResponse(event) {
		let snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
		if (!snapshot) {
			if (event.type !== "response.created") throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
			snapshot = __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
			return snapshot;
		}
		switch (event.type) {
			case "response.output_item.added":
				snapshot.output.push(event.item);
				break;
			case "response.content_part.added": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				const type = output.type;
				const part = event.part;
				if (type === "message" && part.type !== "reasoning_text") output.content.push(part);
				else if (type === "reasoning" && part.type === "reasoning_text") {
					if (!output.content) output.content = [];
					output.content.push(part);
				}
				break;
			}
			case "response.output_text.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "message") {
					const content = output.content[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "output_text") throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
					content.text += event.delta;
				}
				break;
			}
			case "response.function_call_arguments.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "function_call") output.arguments += event.delta;
				break;
			}
			case "response.reasoning_text.delta": {
				const output = snapshot.output[event.output_index];
				if (!output) throw new OpenAIError(`missing output at index ${event.output_index}`);
				if (output.type === "reasoning") {
					const content = output.content?.[event.content_index];
					if (!content) throw new OpenAIError(`missing content at index ${event.content_index}`);
					if (content.type !== "reasoning_text") throw new OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
					content.text += event.delta;
				}
				break;
			}
			case "response.completed":
				__classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
				break;
		}
		return snapshot;
	}, Symbol.asyncIterator)]() {
		const pushQueue = [];
		const readQueue = [];
		let done = false;
		this.on("event", (event) => {
			const reader = readQueue.shift();
			if (reader) reader.resolve(event);
			else pushQueue.push(event);
		});
		this.on("end", () => {
			done = true;
			for (const reader of readQueue) reader.resolve(void 0);
			readQueue.length = 0;
		});
		this.on("abort", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		this.on("error", (err) => {
			done = true;
			for (const reader of readQueue) reader.reject(err);
			readQueue.length = 0;
		});
		return {
			next: async () => {
				if (!pushQueue.length) {
					if (done) return {
						value: void 0,
						done: true
					};
					return new Promise((resolve, reject) => readQueue.push({
						resolve,
						reject
					})).then((event) => event ? {
						value: event,
						done: false
					} : {
						value: void 0,
						done: true
					});
				}
				return {
					value: pushQueue.shift(),
					done: false
				};
			},
			return: async () => {
				this.abort();
				return {
					value: void 0,
					done: true
				};
			}
		};
	}
	/**
	* @returns a promise that resolves with the final Response, or rejects
	* if an error occurred or the stream ended prematurely without producing a REsponse.
	*/
	async finalResponse() {
		await this.done();
		const response = __classPrivateFieldGet(this, _ResponseStream_finalResponse, "f");
		if (!response) throw new OpenAIError("stream ended without producing a ChatCompletion");
		return response;
	}
};
function finalizeResponse(snapshot, params) {
	return maybeParseResponse(snapshot, params);
}
//#endregion
//#region node_modules/openai/resources/responses/input-items.mjs
var InputItems = class extends APIResource {
	/**
	* Returns a list of input items for a given response.
	*
	* @example
	* ```ts
	* // Automatically fetches more pages as needed.
	* for await (const responseItem of client.responses.inputItems.list(
	*   'response_id',
	* )) {
	*   // ...
	* }
	* ```
	*/
	list(responseID, query = {}, options) {
		return this._client.getAPIList(path`/responses/${responseID}/input_items`, CursorPage, {
			query,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/responses/input-tokens.mjs
var InputTokens = class extends APIResource {
	/**
	* Returns input token counts of the request.
	*
	* Returns an object with `object` set to `response.input_tokens` and an
	* `input_tokens` count.
	*
	* @example
	* ```ts
	* const response = await client.responses.inputTokens.count();
	* ```
	*/
	count(body = {}, options) {
		return this._client.post("/responses/input_tokens", {
			body,
			...options
		});
	}
};
//#endregion
//#region node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource {
	constructor() {
		super(...arguments);
		this.inputItems = new InputItems(this._client);
		this.inputTokens = new InputTokens(this._client);
	}
	create(body, options) {
		return this._client.post("/responses", {
			body,
			...options,
			stream: body.stream ?? false
		})._thenUnwrap((rsp) => {
			if ("object" in rsp && rsp.object === "response") addOutputText(rsp);
			return rsp;
		});
	}
	retrieve(responseID, query = {}, options) {
		return this._client.get(path`/responses/${responseID}`, {
			query,
			...options,
			stream: query?.stream ?? false
		})._thenUnwrap((rsp) => {
			if ("object" in rsp && rsp.object === "response") addOutputText(rsp);
			return rsp;
		});
	}
	/**
	* Deletes a model response with the given ID.
	*
	* @example
	* ```ts
	* await client.responses.delete(
	*   'resp_677efb5139a88190b512bc3fef8e535d',
	* );
	* ```
	*/
	delete(responseID, options) {
		return this._client.delete(path`/responses/${responseID}`, {
			...options,
			headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
		});
	}
	parse(body, options) {
		return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
	}
	/**
	* Creates a model response stream
	*/
	stream(body, options) {
		return ResponseStream.createResponse(this._client, body, options);
	}
	/**
	* Cancels a model response with the given ID. Only responses created with the
	* `background` parameter set to `true` can be cancelled.
	* [Learn more](https://platform.openai.com/docs/guides/background).
	*
	* @example
	* ```ts
	* const response = await client.responses.cancel(
	*   'resp_677efb5139a88190b512bc3fef8e535d',
	* );
	* ```
	*/
	cancel(responseID, options) {
		return this._client.post(path`/responses/${responseID}/cancel`, options);
	}
	/**
	* Compact a conversation. Returns a compacted response object.
	*
	* Learn when and how to compact long-running conversations in the
	* [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
	* For ZDR-compatible compaction details, see
	* [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
	*
	* @example
	* ```ts
	* const compactedResponse = await client.responses.compact({
	*   model: 'gpt-5.4',
	* });
	* ```
	*/
	compact(body, options) {
		return this._client.post("/responses/compact", {
			body,
			...options
		});
	}
};
Responses.InputItems = InputItems;
Responses.InputTokens = InputTokens;
//#endregion
//#region node_modules/openai/resources/skills/content.mjs
var Content$1 = class extends APIResource {
	/**
	* Download a skill zip bundle by its ID.
	*/
	retrieve(skillID, options) {
		return this._client.get(path`/skills/${skillID}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__binaryResponse: true
		});
	}
};
//#endregion
//#region node_modules/openai/resources/skills/versions/content.mjs
var Content = class extends APIResource {
	/**
	* Download a skill version zip bundle.
	*/
	retrieve(version, params, options) {
		const { skill_id } = params;
		return this._client.get(path`/skills/${skill_id}/versions/${version}/content`, {
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__binaryResponse: true
		});
	}
};
//#endregion
//#region node_modules/openai/resources/skills/versions/versions.mjs
var Versions = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content(this._client);
	}
	/**
	* Create a new immutable skill version.
	*/
	create(skillID, body = {}, options) {
		return this._client.post(path`/skills/${skillID}/versions`, maybeMultipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	/**
	* Get a specific skill version.
	*/
	retrieve(version, params, options) {
		const { skill_id } = params;
		return this._client.get(path`/skills/${skill_id}/versions/${version}`, options);
	}
	/**
	* List skill versions for a skill.
	*/
	list(skillID, query = {}, options) {
		return this._client.getAPIList(path`/skills/${skillID}/versions`, CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete a skill version.
	*/
	delete(version, params, options) {
		const { skill_id } = params;
		return this._client.delete(path`/skills/${skill_id}/versions/${version}`, options);
	}
};
Versions.Content = Content;
//#endregion
//#region node_modules/openai/resources/skills/skills.mjs
var Skills = class extends APIResource {
	constructor() {
		super(...arguments);
		this.content = new Content$1(this._client);
		this.versions = new Versions(this._client);
	}
	/**
	* Create a new skill.
	*/
	create(body = {}, options) {
		return this._client.post("/skills", maybeMultipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	/**
	* Get a skill by its ID.
	*/
	retrieve(skillID, options) {
		return this._client.get(path`/skills/${skillID}`, options);
	}
	/**
	* Update the default version pointer for a skill.
	*/
	update(skillID, body, options) {
		return this._client.post(path`/skills/${skillID}`, {
			body,
			...options
		});
	}
	/**
	* List all skills for the current project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/skills", CursorPage, {
			query,
			...options
		});
	}
	/**
	* Delete a skill by its ID.
	*/
	delete(skillID, options) {
		return this._client.delete(path`/skills/${skillID}`, options);
	}
};
Skills.Content = Content$1;
Skills.Versions = Versions;
//#endregion
//#region node_modules/openai/resources/uploads/parts.mjs
/**
* Use Uploads to upload large files in multiple parts.
*/
var Parts = class extends APIResource {
	/**
	* Adds a
	* [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
	* A Part represents a chunk of bytes from the file you are trying to upload.
	*
	* Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
	* maximum of 8 GB.
	*
	* It is possible to add multiple Parts in parallel. You can decide the intended
	* order of the Parts when you
	* [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
	*/
	create(uploadID, body, options) {
		return this._client.post(path`/uploads/${uploadID}/parts`, multipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
};
//#endregion
//#region node_modules/openai/resources/uploads/uploads.mjs
/**
* Use Uploads to upload large files in multiple parts.
*/
var Uploads = class extends APIResource {
	constructor() {
		super(...arguments);
		this.parts = new Parts(this._client);
	}
	/**
	* Creates an intermediate
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
	* that you can add
	* [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
	* Currently, an Upload can accept at most 8 GB in total and expires after an hour
	* after you create it.
	*
	* Once you complete the Upload, we will create a
	* [File](https://platform.openai.com/docs/api-reference/files/object) object that
	* contains all the parts you uploaded. This File is usable in the rest of our
	* platform as a regular File object.
	*
	* For certain `purpose` values, the correct `mime_type` must be specified. Please
	* refer to documentation for the
	* [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
	*
	* For guidance on the proper filename extensions for each purpose, please follow
	* the documentation on
	* [creating a File](https://platform.openai.com/docs/api-reference/files/create).
	*
	* Returns the Upload object with status `pending`.
	*/
	create(body, options) {
		return this._client.post("/uploads", {
			body,
			...options
		});
	}
	/**
	* Cancels the Upload. No Parts may be added after an Upload is cancelled.
	*
	* Returns the Upload object with status `cancelled`.
	*/
	cancel(uploadID, options) {
		return this._client.post(path`/uploads/${uploadID}/cancel`, options);
	}
	/**
	* Completes the
	* [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
	*
	* Within the returned Upload object, there is a nested
	* [File](https://platform.openai.com/docs/api-reference/files/object) object that
	* is ready to use in the rest of the platform.
	*
	* You can specify the order of the Parts by passing in an ordered list of the Part
	* IDs.
	*
	* The number of bytes uploaded upon completion must match the number of bytes
	* initially specified when creating the Upload object. No Parts may be added after
	* an Upload is completed. Returns the Upload object with status `completed`,
	* including an additional `file` property containing the created usable File
	* object.
	*/
	complete(uploadID, body, options) {
		return this._client.post(path`/uploads/${uploadID}/complete`, {
			body,
			...options
		});
	}
};
Uploads.Parts = Parts;
//#endregion
//#region node_modules/openai/lib/Util.mjs
/**
* Like `Promise.allSettled()` but throws an error if any promises are rejected.
*/
const allSettledWithThrow = async (promises) => {
	const results = await Promise.allSettled(promises);
	const rejected = results.filter((result) => result.status === "rejected");
	if (rejected.length) {
		for (const result of rejected) console.error(result.reason);
		throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
	}
	const values = [];
	for (const result of results) if (result.status === "fulfilled") values.push(result.value);
	return values;
};
//#endregion
//#region node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource {
	/**
	* Create a vector store file batch.
	*/
	create(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}/file_batches`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieves a vector store file batch.
	*/
	retrieve(batchID, params, options) {
		const { vector_store_id } = params;
		return this._client.get(path`/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Cancel a vector store file batch. This attempts to cancel the processing of
	* files in this batch as soon as possible.
	*/
	cancel(batchID, params, options) {
		const { vector_store_id } = params;
		return this._client.post(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Create a vector store batch and poll until all files have been processed.
	*/
	async createAndPoll(vectorStoreId, body, options) {
		const batch = await this.create(vectorStoreId, body);
		return await this.poll(vectorStoreId, batch.id, options);
	}
	/**
	* Returns a list of vector store files in a batch.
	*/
	listFiles(batchID, params, options) {
		const { vector_store_id, ...query } = params;
		return this._client.getAPIList(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Wait for the given file batch to be processed.
	*
	* Note: this will return even if one of the files failed to process, you need to
	* check batch.file_counts.failed_count to handle this case.
	*/
	async poll(vectorStoreID, batchID, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
				...options,
				headers
			}).withResponse();
			switch (batch.status) {
				case "in_progress":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "failed":
				case "cancelled":
				case "completed": return batch;
			}
		}
	}
	/**
	* Uploads the given files concurrently and then creates a vector store file batch.
	*
	* The concurrency limit is configurable using the `maxConcurrency` parameter.
	*/
	async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
		if (files == null || files.length == 0) throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
		const configuredConcurrency = options?.maxConcurrency ?? 5;
		const concurrencyLimit = Math.min(configuredConcurrency, files.length);
		const client = this._client;
		const fileIterator = files.values();
		const allFileIds = [...fileIds];
		async function processFiles(iterator) {
			for (let item of iterator) {
				const fileObj = await client.files.create({
					file: item,
					purpose: "assistants"
				}, options);
				allFileIds.push(fileObj.id);
			}
		}
		await allSettledWithThrow(Array(concurrencyLimit).fill(fileIterator).map(processFiles));
		return await this.createAndPoll(vectorStoreId, { file_ids: allFileIds });
	}
};
//#endregion
//#region node_modules/openai/resources/vector-stores/files.mjs
var Files = class extends APIResource {
	/**
	* Create a vector store file by attaching a
	* [File](https://platform.openai.com/docs/api-reference/files) to a
	* [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
	*/
	create(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}/files`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieves a vector store file.
	*/
	retrieve(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.get(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Update attributes on a vector store file.
	*/
	update(fileID, params, options) {
		const { vector_store_id, ...body } = params;
		return this._client.post(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of vector store files.
	*/
	list(vectorStoreID, query = {}, options) {
		return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/files`, CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Delete a vector store file. This will remove the file from the vector store but
	* the file itself will not be deleted. To delete the file, use the
	* [delete file](https://platform.openai.com/docs/api-reference/files/delete)
	* endpoint.
	*/
	delete(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.delete(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Attach a file to the given vector store and wait for it to be processed.
	*/
	async createAndPoll(vectorStoreId, body, options) {
		const file = await this.create(vectorStoreId, body, options);
		return await this.poll(vectorStoreId, file.id, options);
	}
	/**
	* Wait for the vector store file to finish processing.
	*
	* Note: this will return even if the file failed to process, you need to check
	* file.last_error and file.status to handle these cases
	*/
	async poll(vectorStoreID, fileID, options) {
		const headers = buildHeaders([options?.headers, {
			"X-Stainless-Poll-Helper": "true",
			"X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
		}]);
		while (true) {
			const fileResponse = await this.retrieve(fileID, { vector_store_id: vectorStoreID }, {
				...options,
				headers
			}).withResponse();
			const file = fileResponse.data;
			switch (file.status) {
				case "in_progress":
					let sleepInterval = 5e3;
					if (options?.pollIntervalMs) sleepInterval = options.pollIntervalMs;
					else {
						const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
						if (headerInterval) {
							const headerIntervalMs = parseInt(headerInterval);
							if (!isNaN(headerIntervalMs)) sleepInterval = headerIntervalMs;
						}
					}
					await sleep(sleepInterval);
					break;
				case "failed":
				case "completed": return file;
			}
		}
	}
	/**
	* Upload a file to the `files` API and then attach it to the given vector store.
	*
	* Note the file will be asynchronously processed (you can use the alternative
	* polling helper method to wait for processing to complete).
	*/
	async upload(vectorStoreId, file, options) {
		const fileInfo = await this._client.files.create({
			file,
			purpose: "assistants"
		}, options);
		return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
	}
	/**
	* Add a file to a vector store and poll until processing is complete.
	*/
	async uploadAndPoll(vectorStoreId, file, options) {
		const fileInfo = await this.upload(vectorStoreId, file, options);
		return await this.poll(vectorStoreId, fileInfo.id, options);
	}
	/**
	* Retrieve the parsed contents of a vector store file.
	*/
	content(fileID, params, options) {
		const { vector_store_id } = params;
		return this._client.getAPIList(path`/vector_stores/${vector_store_id}/files/${fileID}/content`, Page, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
//#endregion
//#region node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource {
	constructor() {
		super(...arguments);
		this.files = new Files(this._client);
		this.fileBatches = new FileBatches(this._client);
	}
	/**
	* Create a vector store.
	*/
	create(body, options) {
		return this._client.post("/vector_stores", {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Retrieves a vector store.
	*/
	retrieve(vectorStoreID, options) {
		return this._client.get(path`/vector_stores/${vectorStoreID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Modifies a vector store.
	*/
	update(vectorStoreID, body, options) {
		return this._client.post(path`/vector_stores/${vectorStoreID}`, {
			body,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Returns a list of vector stores.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/vector_stores", CursorPage, {
			query,
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Delete a vector store.
	*/
	delete(vectorStoreID, options) {
		return this._client.delete(path`/vector_stores/${vectorStoreID}`, {
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
	/**
	* Search a vector store for relevant chunks based on a query and file attributes
	* filter.
	*/
	search(vectorStoreID, body, options) {
		return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/search`, Page, {
			body,
			method: "post",
			...options,
			headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
		});
	}
};
VectorStores.Files = Files;
VectorStores.FileBatches = FileBatches;
//#endregion
//#region node_modules/openai/resources/videos.mjs
var Videos = class extends APIResource {
	/**
	* Create a new video generation job from a prompt and optional reference assets.
	*/
	create(body, options) {
		return this._client.post("/videos", maybeMultipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
	/**
	* Fetch the latest metadata for a generated video.
	*/
	retrieve(videoID, options) {
		return this._client.get(path`/videos/${videoID}`, options);
	}
	/**
	* List recently generated videos for the current project.
	*/
	list(query = {}, options) {
		return this._client.getAPIList("/videos", ConversationCursorPage, {
			query,
			...options
		});
	}
	/**
	* Permanently delete a completed or failed video and its stored assets.
	*/
	delete(videoID, options) {
		return this._client.delete(path`/videos/${videoID}`, options);
	}
	/**
	* Download the generated video bytes or a derived preview asset.
	*
	* Streams the rendered video content for the specified video job.
	*/
	downloadContent(videoID, query = {}, options) {
		return this._client.get(path`/videos/${videoID}/content`, {
			query,
			...options,
			headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
			__binaryResponse: true
		});
	}
	/**
	* Create a remix of a completed video using a refreshed prompt.
	*/
	remix(videoID, body, options) {
		return this._client.post(path`/videos/${videoID}/remix`, maybeMultipartFormRequestOptions({
			body,
			...options
		}, this._client));
	}
};
//#endregion
//#region node_modules/openai/resources/webhooks/webhooks.mjs
var _Webhooks_instances, _Webhooks_validateSecret, _Webhooks_getRequiredHeader;
var Webhooks = class extends APIResource {
	constructor() {
		super(...arguments);
		_Webhooks_instances.add(this);
	}
	/**
	* Validates that the given payload was sent by OpenAI and parses the payload.
	*/
	async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
		await this.verifySignature(payload, headers, secret, tolerance);
		return JSON.parse(payload);
	}
	/**
	* Validates whether or not the webhook payload was sent by OpenAI.
	*
	* An error will be raised if the webhook payload was not sent by OpenAI.
	*
	* @param payload - The webhook payload
	* @param headers - The webhook headers
	* @param secret - The webhook secret (optional, will use client secret if not provided)
	* @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
	*/
	async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
		if (typeof crypto === "undefined" || typeof crypto.subtle.importKey !== "function" || typeof crypto.subtle.verify !== "function") throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
		__classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
		const headersObj = buildHeaders([headers]).values;
		const signatureHeader = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-signature");
		const timestamp = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-timestamp");
		const webhookId = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-id");
		const timestampSeconds = parseInt(timestamp, 10);
		if (isNaN(timestampSeconds)) throw new InvalidWebhookSignatureError("Invalid webhook timestamp format");
		const nowSeconds = Math.floor(Date.now() / 1e3);
		if (nowSeconds - timestampSeconds > tolerance) throw new InvalidWebhookSignatureError("Webhook timestamp is too old");
		if (timestampSeconds > nowSeconds + tolerance) throw new InvalidWebhookSignatureError("Webhook timestamp is too new");
		const signatures = signatureHeader.split(" ").map((part) => part.startsWith("v1,") ? part.substring(3) : part);
		const decodedSecret = secret.startsWith("whsec_") ? Buffer.from(secret.replace("whsec_", ""), "base64") : Buffer.from(secret, "utf-8");
		const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
		const key = await crypto.subtle.importKey("raw", decodedSecret, {
			name: "HMAC",
			hash: "SHA-256"
		}, false, ["verify"]);
		for (const signature of signatures) try {
			const signatureBytes = Buffer.from(signature, "base64");
			if (await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(signedPayload))) return;
		} catch {
			continue;
		}
		throw new InvalidWebhookSignatureError("The given webhook signature does not match the expected signature");
	}
};
_Webhooks_instances = /* @__PURE__ */ new WeakSet(), _Webhooks_validateSecret = function _Webhooks_validateSecret(secret) {
	if (typeof secret !== "string" || secret.length === 0) throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
}, _Webhooks_getRequiredHeader = function _Webhooks_getRequiredHeader(headers, name) {
	if (!headers) throw new Error(`Headers are required`);
	const value = headers.get(name);
	if (value === null || value === void 0) throw new Error(`Missing required header: ${name}`);
	return value;
};
//#endregion
//#region node_modules/openai/client.mjs
var _OpenAI_instances, _a, _OpenAI_encoder, _OpenAI_baseURLOverridden;
/**
* API Client for interfacing with the OpenAI API.
*/
var OpenAI = class {
	/**
	* API Client for interfacing with the OpenAI API.
	*
	* @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
	* @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
	* @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
	* @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
	* @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
	* @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
	* @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
	* @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
	* @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
	* @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
	* @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
	* @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
	*/
	constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("OPENAI_API_KEY"), organization = readEnv("OPENAI_ORG_ID") ?? null, project = readEnv("OPENAI_PROJECT_ID") ?? null, webhookSecret = readEnv("OPENAI_WEBHOOK_SECRET") ?? null, ...opts } = {}) {
		_OpenAI_instances.add(this);
		_OpenAI_encoder.set(this, void 0);
		/**
		* Given a prompt, the model will return one or more predicted completions, and can also return the probabilities of alternative tokens at each position.
		*/
		this.completions = new Completions(this);
		this.chat = new Chat(this);
		/**
		* Get a vector representation of a given input that can be easily consumed by machine learning models and algorithms.
		*/
		this.embeddings = new Embeddings(this);
		/**
		* Files are used to upload documents that can be used with features like Assistants and Fine-tuning.
		*/
		this.files = new Files$1(this);
		/**
		* Given a prompt and/or an input image, the model will generate a new image.
		*/
		this.images = new Images(this);
		this.audio = new Audio(this);
		/**
		* Given text and/or image inputs, classifies if those inputs are potentially harmful.
		*/
		this.moderations = new Moderations(this);
		/**
		* List and describe the various models available in the API.
		*/
		this.models = new Models(this);
		this.fineTuning = new FineTuning(this);
		this.graders = new Graders(this);
		this.vectorStores = new VectorStores(this);
		this.webhooks = new Webhooks(this);
		this.beta = new Beta(this);
		/**
		* Create large batches of API requests to run asynchronously.
		*/
		this.batches = new Batches(this);
		/**
		* Use Uploads to upload large files in multiple parts.
		*/
		this.uploads = new Uploads(this);
		this.responses = new Responses(this);
		this.realtime = new Realtime(this);
		/**
		* Manage conversations and conversation items.
		*/
		this.conversations = new Conversations(this);
		/**
		* Manage and run evals in the OpenAI platform.
		*/
		this.evals = new Evals(this);
		this.containers = new Containers(this);
		this.skills = new Skills(this);
		this.videos = new Videos(this);
		if (apiKey === void 0) throw new OpenAIError("Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.");
		const options = {
			apiKey,
			organization,
			project,
			webhookSecret,
			...opts,
			baseURL: baseURL || `https://api.openai.com/v1`
		};
		if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
		this.baseURL = options.baseURL;
		this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
		this.logger = options.logger ?? console;
		const defaultLogLevel = "warn";
		this.logLevel = defaultLogLevel;
		this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? defaultLogLevel;
		this.fetchOptions = options.fetchOptions;
		this.maxRetries = options.maxRetries ?? 2;
		this.fetch = options.fetch ?? getDefaultFetch();
		__classPrivateFieldSet(this, _OpenAI_encoder, FallbackEncoder, "f");
		this._options = options;
		this.apiKey = typeof apiKey === "string" ? apiKey : "Missing Key";
		this.organization = organization;
		this.project = project;
		this.webhookSecret = webhookSecret;
	}
	/**
	* Create a new client instance re-using the same options given to the current client with optional overriding.
	*/
	withOptions(options) {
		return new this.constructor({
			...this._options,
			baseURL: this.baseURL,
			maxRetries: this.maxRetries,
			timeout: this.timeout,
			logger: this.logger,
			logLevel: this.logLevel,
			fetch: this.fetch,
			fetchOptions: this.fetchOptions,
			apiKey: this.apiKey,
			organization: this.organization,
			project: this.project,
			webhookSecret: this.webhookSecret,
			...options
		});
	}
	defaultQuery() {
		return this._options.defaultQuery;
	}
	validateHeaders({ values, nulls }) {}
	async authHeaders(opts) {
		return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
	}
	stringifyQuery(query) {
		return stringifyQuery(query);
	}
	getUserAgent() {
		return `${this.constructor.name}/JS ${VERSION}`;
	}
	defaultIdempotencyKey() {
		return `stainless-node-retry-${uuid4()}`;
	}
	makeStatusError(status, error, message, headers) {
		return APIError.generate(status, error, message, headers);
	}
	async _callApiKey() {
		const apiKey = this._options.apiKey;
		if (typeof apiKey !== "function") return false;
		let token;
		try {
			token = await apiKey();
		} catch (err) {
			if (err instanceof OpenAIError) throw err;
			throw new OpenAIError(`Failed to get token from 'apiKey' function: ${err.message}`, { cause: err });
		}
		if (typeof token !== "string" || !token) throw new OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
		this.apiKey = token;
		return true;
	}
	buildURL(path, query, defaultBaseURL) {
		const baseURL = !__classPrivateFieldGet(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
		const url = isAbsoluteURL(path) ? new URL(path) : new URL(baseURL + (baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
		const defaultQuery = this.defaultQuery();
		if (!isEmptyObj(defaultQuery)) query = {
			...defaultQuery,
			...query
		};
		if (typeof query === "object" && query && !Array.isArray(query)) url.search = this.stringifyQuery(query);
		return url.toString();
	}
	/**
	* Used as a callback for mutating the given `FinalRequestOptions` object.
	*/
	async prepareOptions(options) {
		await this._callApiKey();
	}
	/**
	* Used as a callback for mutating the given `RequestInit` object.
	*
	* This is useful for cases where you want to add certain headers based off of
	* the request properties, e.g. `method` or `url`.
	*/
	async prepareRequest(request, { url, options }) {}
	get(path, opts) {
		return this.methodRequest("get", path, opts);
	}
	post(path, opts) {
		return this.methodRequest("post", path, opts);
	}
	patch(path, opts) {
		return this.methodRequest("patch", path, opts);
	}
	put(path, opts) {
		return this.methodRequest("put", path, opts);
	}
	delete(path, opts) {
		return this.methodRequest("delete", path, opts);
	}
	methodRequest(method, path, opts) {
		return this.request(Promise.resolve(opts).then((opts) => {
			return {
				method,
				path,
				...opts
			};
		}));
	}
	request(options, remainingRetries = null) {
		return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
	}
	async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
		const options = await optionsInput;
		const maxRetries = options.maxRetries ?? this.maxRetries;
		if (retriesRemaining == null) retriesRemaining = maxRetries;
		await this.prepareOptions(options);
		const { req, url, timeout } = await this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });
		await this.prepareRequest(req, {
			url,
			options
		});
		/** Not an API request ID, just for correlating local log entries. */
		const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
		const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
		const startTime = Date.now();
		loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
			retryOfRequestLogID,
			method: options.method,
			url,
			options,
			headers: req.headers
		}));
		if (options.signal?.aborted) throw new APIUserAbortError();
		const controller = new AbortController();
		const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
		const headersTime = Date.now();
		if (response instanceof globalThis.Error) {
			const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
			if (options.signal?.aborted) throw new APIUserAbortError();
			const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
			if (retriesRemaining) {
				loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
				loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
					retryOfRequestLogID,
					url,
					durationMs: headersTime - startTime,
					message: response.message
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
			}
			loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
			loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
				retryOfRequestLogID,
				url,
				durationMs: headersTime - startTime,
				message: response.message
			}));
			if (isTimeout) throw new APIConnectionTimeoutError();
			throw new APIConnectionError({ cause: response });
		}
		const responseInfo = `[${requestLogID}${retryLogStr}${[...response.headers.entries()].filter(([name]) => name === "x-request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("")}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
		if (!response.ok) {
			const shouldRetry = await this.shouldRetry(response);
			if (retriesRemaining && shouldRetry) {
				const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
				await CancelReadableStream(response.body);
				loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
				loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
					retryOfRequestLogID,
					url: response.url,
					status: response.status,
					headers: response.headers,
					durationMs: headersTime - startTime
				}));
				return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
			}
			const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
			loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
			const errText = await response.text().catch((err) => castToError(err).message);
			const errJSON = safeJSON(errText);
			const errMessage = errJSON ? void 0 : errText;
			loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
				retryOfRequestLogID,
				url: response.url,
				status: response.status,
				headers: response.headers,
				message: errMessage,
				durationMs: Date.now() - startTime
			}));
			throw this.makeStatusError(response.status, errJSON, errMessage, response.headers);
		}
		loggerFor(this).info(responseInfo);
		loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
			retryOfRequestLogID,
			url: response.url,
			status: response.status,
			headers: response.headers,
			durationMs: headersTime - startTime
		}));
		return {
			response,
			options,
			controller,
			requestLogID,
			retryOfRequestLogID,
			startTime
		};
	}
	getAPIList(path, Page, opts) {
		return this.requestAPIList(Page, opts && "then" in opts ? opts.then((opts) => ({
			method: "get",
			path,
			...opts
		})) : {
			method: "get",
			path,
			...opts
		});
	}
	requestAPIList(Page, options) {
		const request = this.makeRequest(options, null, void 0);
		return new PagePromise(this, request, Page);
	}
	async fetchWithTimeout(url, init, ms, controller) {
		const { signal, method, ...options } = init || {};
		const abort = this._makeAbort(controller);
		if (signal) signal.addEventListener("abort", abort, { once: true });
		const timeout = setTimeout(abort, ms);
		const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
		const fetchOptions = {
			signal: controller.signal,
			...isReadableBody ? { duplex: "half" } : {},
			method: "GET",
			...options
		};
		if (method) fetchOptions.method = method.toUpperCase();
		try {
			return await this.fetch.call(void 0, url, fetchOptions);
		} finally {
			clearTimeout(timeout);
		}
	}
	async shouldRetry(response) {
		const shouldRetryHeader = response.headers.get("x-should-retry");
		if (shouldRetryHeader === "true") return true;
		if (shouldRetryHeader === "false") return false;
		if (response.status === 408) return true;
		if (response.status === 409) return true;
		if (response.status === 429) return true;
		if (response.status >= 500) return true;
		return false;
	}
	async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
		let timeoutMillis;
		const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
		if (retryAfterMillisHeader) {
			const timeoutMs = parseFloat(retryAfterMillisHeader);
			if (!Number.isNaN(timeoutMs)) timeoutMillis = timeoutMs;
		}
		const retryAfterHeader = responseHeaders?.get("retry-after");
		if (retryAfterHeader && !timeoutMillis) {
			const timeoutSeconds = parseFloat(retryAfterHeader);
			if (!Number.isNaN(timeoutSeconds)) timeoutMillis = timeoutSeconds * 1e3;
			else timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
		}
		if (timeoutMillis === void 0) {
			const maxRetries = options.maxRetries ?? this.maxRetries;
			timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
		}
		await sleep(timeoutMillis);
		return this.makeRequest(options, retriesRemaining - 1, requestLogID);
	}
	calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
		const initialRetryDelay = .5;
		const maxRetryDelay = 8;
		const numRetries = maxRetries - retriesRemaining;
		return Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay) * (1 - Math.random() * .25) * 1e3;
	}
	async buildRequest(inputOptions, { retryCount = 0 } = {}) {
		const options = { ...inputOptions };
		const { method, path, query, defaultBaseURL } = options;
		const url = this.buildURL(path, query, defaultBaseURL);
		if ("timeout" in options) validatePositiveInteger("timeout", options.timeout);
		options.timeout = options.timeout ?? this.timeout;
		const { bodyHeaders, body } = this.buildBody({ options });
		return {
			req: {
				method,
				headers: await this.buildHeaders({
					options: inputOptions,
					method,
					bodyHeaders,
					retryCount
				}),
				...options.signal && { signal: options.signal },
				...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
				...body && { body },
				...this.fetchOptions ?? {},
				...options.fetchOptions ?? {}
			},
			url,
			timeout: options.timeout
		};
	}
	async buildHeaders({ options, method, bodyHeaders, retryCount }) {
		let idempotencyHeaders = {};
		if (this.idempotencyHeader && method !== "get") {
			if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
			idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
		}
		const headers = buildHeaders([
			idempotencyHeaders,
			{
				Accept: "application/json",
				"User-Agent": this.getUserAgent(),
				"X-Stainless-Retry-Count": String(retryCount),
				...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
				...getPlatformHeaders(),
				"OpenAI-Organization": this.organization,
				"OpenAI-Project": this.project
			},
			await this.authHeaders(options),
			this._options.defaultHeaders,
			bodyHeaders,
			options.headers
		]);
		this.validateHeaders(headers);
		return headers.values;
	}
	_makeAbort(controller) {
		return () => controller.abort();
	}
	buildBody({ options: { body, headers: rawHeaders } }) {
		if (!body) return {
			bodyHeaders: void 0,
			body: void 0
		};
		const headers = buildHeaders([rawHeaders]);
		if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && headers.values.has("content-type") || globalThis.Blob && body instanceof globalThis.Blob || body instanceof FormData || body instanceof URLSearchParams || globalThis.ReadableStream && body instanceof globalThis.ReadableStream) return {
			bodyHeaders: void 0,
			body
		};
		else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) return {
			bodyHeaders: void 0,
			body: ReadableStreamFrom(body)
		};
		else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") return {
			bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
			body: this.stringifyQuery(body)
		};
		else return __classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, {
			body,
			headers
		});
	}
};
_a = OpenAI, _OpenAI_encoder = /* @__PURE__ */ new WeakMap(), _OpenAI_instances = /* @__PURE__ */ new WeakSet(), _OpenAI_baseURLOverridden = function _OpenAI_baseURLOverridden() {
	return this.baseURL !== "https://api.openai.com/v1";
};
OpenAI.OpenAI = _a;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError;
OpenAI.APIConnectionError = APIConnectionError;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError;
OpenAI.APIUserAbortError = APIUserAbortError;
OpenAI.NotFoundError = NotFoundError;
OpenAI.ConflictError = ConflictError;
OpenAI.RateLimitError = RateLimitError;
OpenAI.BadRequestError = BadRequestError;
OpenAI.AuthenticationError = AuthenticationError;
OpenAI.InternalServerError = InternalServerError;
OpenAI.PermissionDeniedError = PermissionDeniedError;
OpenAI.UnprocessableEntityError = UnprocessableEntityError;
OpenAI.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
OpenAI.toFile = toFile;
OpenAI.Completions = Completions;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files$1;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders;
OpenAI.VectorStores = VectorStores;
OpenAI.Webhooks = Webhooks;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.Uploads = Uploads;
OpenAI.Responses = Responses;
OpenAI.Realtime = Realtime;
OpenAI.Conversations = Conversations;
OpenAI.Evals = Evals;
OpenAI.Containers = Containers;
OpenAI.Skills = Skills;
OpenAI.Videos = Videos;
//#endregion
//#region node_modules/openai/azure.mjs
/** API Client for interfacing with the Azure OpenAI API. */
var AzureOpenAI = class extends OpenAI {
	/**
	* API Client for interfacing with the Azure OpenAI API.
	*
	* @param {string | undefined} [opts.apiVersion=process.env['OPENAI_API_VERSION'] ?? undefined]
	* @param {string | undefined} [opts.endpoint=process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
	* @param {string | undefined} [opts.apiKey=process.env['AZURE_OPENAI_API_KEY'] ?? undefined]
	* @param {string | undefined} opts.deployment - A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
	* @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
	* @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL']] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`.
	* @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
	* @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
	* @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
	* @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
	* @param {Headers} opts.defaultHeaders - Default headers to include with every request to the API.
	* @param {DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
	* @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
	*/
	constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("AZURE_OPENAI_API_KEY"), apiVersion = readEnv("OPENAI_API_VERSION"), endpoint, deployment, azureADTokenProvider, dangerouslyAllowBrowser, ...opts } = {}) {
		if (!apiVersion) throw new OpenAIError("The OPENAI_API_VERSION environment variable is missing or empty; either provide it, or instantiate the AzureOpenAI client with an apiVersion option, like new AzureOpenAI({ apiVersion: 'My API Version' }).");
		if (typeof azureADTokenProvider === "function") dangerouslyAllowBrowser = true;
		if (!azureADTokenProvider && !apiKey) throw new OpenAIError("Missing credentials. Please pass one of `apiKey` and `azureADTokenProvider`, or set the `AZURE_OPENAI_API_KEY` environment variable.");
		if (azureADTokenProvider && apiKey) throw new OpenAIError("The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.");
		opts.defaultQuery = {
			...opts.defaultQuery,
			"api-version": apiVersion
		};
		if (!baseURL) {
			if (!endpoint) endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
			if (!endpoint) throw new OpenAIError("Must provide one of the `baseURL` or `endpoint` arguments, or the `AZURE_OPENAI_ENDPOINT` environment variable");
			baseURL = `${endpoint}/openai`;
		} else if (endpoint) throw new OpenAIError("baseURL and endpoint are mutually exclusive");
		super({
			apiKey: azureADTokenProvider ?? apiKey,
			baseURL,
			...opts,
			...dangerouslyAllowBrowser !== void 0 ? { dangerouslyAllowBrowser } : {}
		});
		this.apiVersion = "";
		this.apiVersion = apiVersion;
		this.deploymentName = deployment;
	}
	async buildRequest(options, props = {}) {
		if (_deployments_endpoints.has(options.path) && options.method === "post" && options.body !== void 0) {
			if (!isObj(options.body)) throw new Error("Expected request body to be an object");
			const model = this.deploymentName || options.body["model"] || options.__metadata?.["model"];
			if (model !== void 0 && !this.baseURL.includes("/deployments")) options.path = `/deployments/${model}${options.path}`;
		}
		return super.buildRequest(options, props);
	}
	async authHeaders(opts) {
		if (typeof this._options.apiKey === "string") return buildHeaders([{ "api-key": this.apiKey }]);
		return super.authHeaders(opts);
	}
};
const _deployments_endpoints = new Set([
	"/completions",
	"/chat/completions",
	"/embeddings",
	"/audio/transcriptions",
	"/audio/translations",
	"/audio/speech",
	"/images/generations",
	"/batches",
	"/images/edits"
]);
//#endregion
//#region src/agents/openai-tool-schema.ts
function optionalString(value) {
	return typeof value === "string" ? value : void 0;
}
function normalizeStrictOpenAIJsonSchema(schema) {
	return normalizeStrictOpenAIJsonSchemaRecursive(normalizeToolParameterSchema(schema ?? {}));
}
function normalizeStrictOpenAIJsonSchemaRecursive(schema) {
	if (Array.isArray(schema)) {
		let changed = false;
		const normalized = schema.map((entry) => {
			const next = normalizeStrictOpenAIJsonSchemaRecursive(entry);
			changed ||= next !== entry;
			return next;
		});
		return changed ? normalized : schema;
	}
	if (!schema || typeof schema !== "object") return schema;
	const record = schema;
	let changed = false;
	const normalized = {};
	for (const [key, value] of Object.entries(record)) {
		const next = normalizeStrictOpenAIJsonSchemaRecursive(value);
		normalized[key] = next;
		changed ||= next !== value;
	}
	if (normalized.type === "object") {
		const properties = normalized.properties && typeof normalized.properties === "object" && !Array.isArray(normalized.properties) ? normalized.properties : void 0;
		if (properties && Object.keys(properties).length === 0 && !Array.isArray(normalized.required)) {
			normalized.required = [];
			changed = true;
		}
	}
	return changed ? normalized : schema;
}
function normalizeOpenAIStrictToolParameters(schema, strict) {
	if (!strict) return normalizeToolParameterSchema(schema ?? {});
	return normalizeStrictOpenAIJsonSchema(schema);
}
function isStrictOpenAIJsonSchemaCompatible(schema) {
	return isStrictOpenAIJsonSchemaCompatibleRecursive(normalizeStrictOpenAIJsonSchema(schema));
}
function isStrictOpenAIJsonSchemaCompatibleRecursive(schema) {
	if (Array.isArray(schema)) return schema.every((entry) => isStrictOpenAIJsonSchemaCompatibleRecursive(entry));
	if (!schema || typeof schema !== "object") return true;
	const record = schema;
	if ("anyOf" in record || "oneOf" in record || "allOf" in record) return false;
	if (Array.isArray(record.type)) return false;
	if (record.type === "object" && record.additionalProperties !== false) return false;
	if (record.type === "object") {
		const properties = record.properties && typeof record.properties === "object" && !Array.isArray(record.properties) ? record.properties : {};
		const required = Array.isArray(record.required) ? record.required.filter((entry) => typeof entry === "string") : void 0;
		if (!required) return false;
		const requiredSet = new Set(required);
		if (Object.keys(properties).some((key) => !requiredSet.has(key))) return false;
	}
	return Object.entries(record).every(([key, entry]) => {
		if (key === "properties" && entry && typeof entry === "object" && !Array.isArray(entry)) return Object.values(entry).every((value) => isStrictOpenAIJsonSchemaCompatibleRecursive(value));
		return isStrictOpenAIJsonSchemaCompatibleRecursive(entry);
	});
}
function resolveOpenAIStrictToolFlagForInventory(tools, strict) {
	if (strict !== true) return strict === false ? false : void 0;
	return tools.every((tool) => isStrictOpenAIJsonSchemaCompatible(tool.parameters));
}
function resolvesToNativeOpenAIStrictTools(model, transport) {
	const capabilities = resolveProviderRequestCapabilities({
		provider: optionalString(model.provider),
		api: optionalString(model.api),
		baseUrl: optionalString(model.baseUrl),
		capability: "llm",
		transport,
		modelId: optionalString(model.id),
		compat: model.compat && typeof model.compat === "object" ? model.compat : void 0
	});
	if (!capabilities.usesKnownNativeOpenAIRoute) return false;
	return capabilities.provider === "openai" || capabilities.provider === "openai-codex" || capabilities.provider === "azure-openai" || capabilities.provider === "azure-openai-responses";
}
function resolveOpenAIStrictToolSetting(model, options) {
	if (resolvesToNativeOpenAIStrictTools(model, options?.transport ?? "stream")) return true;
	if (options?.supportsStrictMode) return false;
}
//#endregion
//#region src/agents/openai-transport-stream.ts
const DEFAULT_AZURE_OPENAI_API_VERSION = "2024-12-01-preview";
function stringifyUnknown(value, fallback = "") {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return fallback;
}
function stringifyJsonLike(value, fallback = "") {
	if (typeof value === "string") return value;
	if (value && typeof value === "object") return JSON.stringify(value);
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return fallback;
}
function getServiceTierCostMultiplier(serviceTier) {
	switch (serviceTier) {
		case "flex": return .5;
		case "priority": return 2;
		default: return 1;
	}
}
function applyServiceTierPricing(usage, serviceTier) {
	const multiplier = getServiceTierCostMultiplier(serviceTier);
	if (multiplier === 1) return;
	usage.cost.input *= multiplier;
	usage.cost.output *= multiplier;
	usage.cost.cacheRead *= multiplier;
	usage.cost.cacheWrite *= multiplier;
	usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
}
function resolveAzureOpenAIApiVersion(env = process.env) {
	return env.AZURE_OPENAI_API_VERSION?.trim() || DEFAULT_AZURE_OPENAI_API_VERSION;
}
function shortHash(value) {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) hash = hash * 31 + value.charCodeAt(i) | 0;
	return Math.abs(hash).toString(36);
}
function encodeTextSignatureV1(id, phase) {
	return JSON.stringify({
		v: 1,
		id,
		...phase ? { phase } : {}
	});
}
function parseTextSignature(signature) {
	if (!signature) return;
	if (signature.startsWith("{")) try {
		const parsed = JSON.parse(signature);
		if (parsed.v === 1 && typeof parsed.id === "string") return parsed.phase === "commentary" || parsed.phase === "final_answer" ? {
			id: parsed.id,
			phase: parsed.phase
		} : { id: parsed.id };
	} catch {}
	return { id: signature };
}
function convertResponsesMessages(model, context, allowedToolCallProviders, options) {
	const messages = [];
	const normalizeIdPart = (part) => {
		const sanitized = part.replace(/[^a-zA-Z0-9_-]/g, "_");
		return (sanitized.length > 64 ? sanitized.slice(0, 64) : sanitized).replace(/_+$/, "");
	};
	const buildForeignResponsesItemId = (itemId) => {
		const normalized = `fc_${shortHash(itemId)}`;
		return normalized.length > 64 ? normalized.slice(0, 64) : normalized;
	};
	const normalizeToolCallId = (id, _targetModel, source) => {
		if (!allowedToolCallProviders.has(model.provider)) return normalizeIdPart(id);
		if (!id.includes("|")) return normalizeIdPart(id);
		const [callId, itemId] = id.split("|");
		const normalizedCallId = normalizeIdPart(callId);
		let normalizedItemId = source.provider !== model.provider || source.api !== model.api ? buildForeignResponsesItemId(itemId) : normalizeIdPart(itemId);
		if (!normalizedItemId.startsWith("fc_")) normalizedItemId = normalizeIdPart(`fc_${normalizedItemId}`);
		return `${normalizedCallId}|${normalizedItemId}`;
	};
	const transformedMessages = transformTransportMessages(context.messages, model, normalizeToolCallId);
	if ((options?.includeSystemPrompt ?? true) && context.systemPrompt) messages.push({
		role: model.reasoning && options?.supportsDeveloperRole !== false ? "developer" : "system",
		content: sanitizeTransportPayloadText(stripSystemPromptCacheBoundary(context.systemPrompt))
	});
	let msgIndex = 0;
	for (const msg of transformedMessages) {
		if (msg.role === "user") if (typeof msg.content === "string") messages.push({
			role: "user",
			content: [{
				type: "input_text",
				text: sanitizeTransportPayloadText(msg.content)
			}]
		});
		else {
			const content = msg.content.map((item) => item.type === "text" ? {
				type: "input_text",
				text: sanitizeTransportPayloadText(item.text)
			} : {
				type: "input_image",
				detail: "auto",
				image_url: `data:${item.mimeType};base64,${item.data}`
			}).filter((item) => model.input.includes("image") || item.type !== "input_image");
			if (content.length > 0) messages.push({
				role: "user",
				content
			});
		}
		else if (msg.role === "assistant") {
			const output = [];
			const isDifferentModel = msg.model !== model.id && msg.provider === model.provider && msg.api === model.api;
			for (const block of msg.content) if (block.type === "thinking") {
				if (block.thinkingSignature) output.push(JSON.parse(block.thinkingSignature));
			} else if (block.type === "text") {
				let msgId = parseTextSignature(block.textSignature)?.id ?? `msg_${msgIndex}`;
				if (msgId.length > 64) msgId = `msg_${shortHash(msgId)}`;
				output.push({
					type: "message",
					role: "assistant",
					content: [{
						type: "output_text",
						text: sanitizeTransportPayloadText(block.text),
						annotations: []
					}],
					status: "completed",
					id: msgId,
					phase: parseTextSignature(block.textSignature)?.phase
				});
			} else if (block.type === "toolCall") {
				const [callId, itemIdRaw] = block.id.split("|");
				const itemId = isDifferentModel && itemIdRaw?.startsWith("fc_") ? void 0 : itemIdRaw;
				output.push({
					type: "function_call",
					id: itemId,
					call_id: callId,
					name: block.name,
					arguments: JSON.stringify(block.arguments)
				});
			}
			if (output.length > 0) messages.push(...output);
		} else if (msg.role === "toolResult") {
			const textResult = msg.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
			const hasImages = msg.content.some((item) => item.type === "image");
			const [callId] = msg.toolCallId.split("|");
			messages.push({
				type: "function_call_output",
				call_id: callId,
				output: hasImages && model.input.includes("image") ? [...textResult ? [{
					type: "input_text",
					text: sanitizeTransportPayloadText(textResult)
				}] : [], ...msg.content.filter((item) => item.type === "image").map((item) => ({
					type: "input_image",
					detail: "auto",
					image_url: `data:${item.mimeType};base64,${item.data}`
				}))] : sanitizeTransportPayloadText(textResult || "(see attached image)")
			});
		}
		msgIndex += 1;
	}
	return messages;
}
function convertResponsesTools(tools, options) {
	const strict = resolveOpenAIStrictToolFlagForInventory(tools, options?.strict);
	if (strict === void 0) return tools.map((tool) => ({
		type: "function",
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters
	}));
	return tools.map((tool) => ({
		type: "function",
		name: tool.name,
		description: tool.description,
		parameters: normalizeOpenAIStrictToolParameters(tool.parameters, strict),
		strict
	}));
}
async function processResponsesStream(openaiStream, output, stream, model, options) {
	let currentItem = null;
	let currentBlock = null;
	const blockIndex = () => output.content.length - 1;
	for await (const rawEvent of openaiStream) {
		const event = rawEvent;
		const type = stringifyUnknown(event.type);
		if (type === "response.created") output.responseId = stringifyUnknown(event.response?.id);
		else if (type === "response.output_item.added") {
			const item = event.item;
			if (item.type === "reasoning") {
				currentItem = item;
				currentBlock = {
					type: "thinking",
					thinking: ""
				};
				output.content.push(currentBlock);
				stream.push({
					type: "thinking_start",
					contentIndex: blockIndex(),
					partial: output
				});
			} else if (item.type === "message") {
				currentItem = item;
				currentBlock = {
					type: "text",
					text: ""
				};
				output.content.push(currentBlock);
				stream.push({
					type: "text_start",
					contentIndex: blockIndex(),
					partial: output
				});
			} else if (item.type === "function_call") {
				currentItem = item;
				currentBlock = {
					type: "toolCall",
					id: `${stringifyUnknown(item.call_id)}|${stringifyUnknown(item.id)}`,
					name: stringifyUnknown(item.name),
					arguments: {},
					partialJson: stringifyJsonLike(item.arguments)
				};
				output.content.push(currentBlock);
				stream.push({
					type: "toolcall_start",
					contentIndex: blockIndex(),
					partial: output
				});
			}
		} else if (type === "response.reasoning_summary_text.delta") {
			if (currentItem?.type === "reasoning" && currentBlock?.type === "thinking") {
				currentBlock.thinking = `${stringifyUnknown(currentBlock.thinking)}${stringifyUnknown(event.delta)}`;
				stream.push({
					type: "thinking_delta",
					contentIndex: blockIndex(),
					delta: stringifyUnknown(event.delta),
					partial: output
				});
			}
		} else if (type === "response.output_text.delta" || type === "response.refusal.delta") {
			if (currentItem?.type === "message" && currentBlock?.type === "text") {
				currentBlock.text = `${stringifyUnknown(currentBlock.text)}${stringifyUnknown(event.delta)}`;
				stream.push({
					type: "text_delta",
					contentIndex: blockIndex(),
					delta: stringifyUnknown(event.delta),
					partial: output
				});
			}
		} else if (type === "response.function_call_arguments.delta") {
			if (currentItem?.type === "function_call" && currentBlock?.type === "toolCall") {
				currentBlock.partialJson = `${stringifyJsonLike(currentBlock.partialJson)}${stringifyJsonLike(event.delta)}`;
				currentBlock.arguments = parseStreamingJson(stringifyJsonLike(currentBlock.partialJson));
				stream.push({
					type: "toolcall_delta",
					contentIndex: blockIndex(),
					delta: stringifyJsonLike(event.delta),
					partial: output
				});
			}
		} else if (type === "response.output_item.done") {
			const item = event.item;
			if (item.type === "reasoning" && currentBlock?.type === "thinking") {
				const summary = Array.isArray(item.summary) ? item.summary.map((part) => String(part.text ?? "")).join("\n\n") : "";
				currentBlock.thinking = summary;
				currentBlock.thinkingSignature = JSON.stringify(item);
				stream.push({
					type: "thinking_end",
					contentIndex: blockIndex(),
					content: stringifyUnknown(currentBlock.thinking),
					partial: output
				});
				currentBlock = null;
			} else if (item.type === "message" && currentBlock?.type === "text") {
				const content = Array.isArray(item.content) ? item.content : [];
				currentBlock.text = content.map((part) => part.type === "output_text" ? String(part.text ?? "") : String(part.refusal ?? "")).join("");
				currentBlock.textSignature = encodeTextSignatureV1(stringifyUnknown(item.id), item.phase ?? void 0);
				stream.push({
					type: "text_end",
					contentIndex: blockIndex(),
					content: stringifyUnknown(currentBlock.text),
					partial: output
				});
				currentBlock = null;
			} else if (item.type === "function_call") {
				const args = currentBlock?.type === "toolCall" && currentBlock.partialJson ? parseStreamingJson(stringifyJsonLike(currentBlock.partialJson, "{}")) : parseStreamingJson(stringifyJsonLike(item.arguments, "{}"));
				stream.push({
					type: "toolcall_end",
					contentIndex: blockIndex(),
					toolCall: {
						type: "toolCall",
						id: `${stringifyUnknown(item.call_id)}|${stringifyUnknown(item.id)}`,
						name: stringifyUnknown(item.name),
						arguments: args
					},
					partial: output
				});
				currentBlock = null;
			}
		} else if (type === "response.completed") {
			const response = event.response;
			if (typeof response?.id === "string") output.responseId = response.id;
			const usage = response?.usage;
			if (usage) {
				const cachedTokens = usage.input_tokens_details?.cached_tokens || 0;
				output.usage = {
					input: (usage.input_tokens || 0) - cachedTokens,
					output: usage.output_tokens || 0,
					cacheRead: cachedTokens,
					cacheWrite: 0,
					totalTokens: usage.total_tokens || 0,
					cost: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						total: 0
					}
				};
			}
			calculateCost(model, output.usage);
			if (options?.applyServiceTierPricing) options.applyServiceTierPricing(output.usage, response?.service_tier ?? options.serviceTier);
			output.stopReason = mapResponsesStopReason(response?.status);
			if (output.content.some((block) => block.type === "toolCall") && output.stopReason === "stop") output.stopReason = "toolUse";
		} else if (type === "error") throw new Error(`Error Code ${stringifyUnknown(event.code, "unknown")}: ${stringifyUnknown(event.message, "Unknown error")}`);
		else if (type === "response.failed") {
			const response = event.response;
			const msg = response?.error ? `${response.error.code || "unknown"}: ${response.error.message || "no message"}` : response?.incomplete_details?.reason ? `incomplete: ${response.incomplete_details.reason}` : "Unknown error (no error details in response)";
			throw new Error(msg);
		}
	}
}
function mapResponsesStopReason(status) {
	if (!status) return "stop";
	switch (status) {
		case "completed": return "stop";
		case "incomplete": return "length";
		case "failed":
		case "cancelled": return "error";
		case "in_progress":
		case "queued": return "stop";
		default: throw new Error(`Unhandled stop reason: ${status}`);
	}
}
function buildOpenAIClientHeaders(model, context, optionHeaders, turnHeaders) {
	const headers = { ...model.headers };
	if (model.provider === "github-copilot") Object.assign(headers, buildCopilotDynamicHeaders({
		messages: context.messages,
		hasImages: hasCopilotVisionInput(context.messages)
	}));
	if (optionHeaders) Object.assign(headers, optionHeaders);
	if (turnHeaders) Object.assign(headers, turnHeaders);
	return headers;
}
function resolveProviderTransportTurnState(model, params) {
	return resolveProviderTransportTurnStateWithPlugin({
		provider: model.provider,
		context: {
			provider: model.provider,
			modelId: model.id,
			model,
			sessionId: params.sessionId,
			turnId: params.turnId,
			attempt: params.attempt,
			transport: params.transport
		}
	});
}
function createOpenAIResponsesClient(model, context, apiKey, optionHeaders, turnHeaders) {
	return new OpenAI({
		apiKey,
		baseURL: model.baseUrl,
		dangerouslyAllowBrowser: true,
		defaultHeaders: buildOpenAIClientHeaders(model, context, optionHeaders, turnHeaders),
		fetch: buildGuardedModelFetch(model)
	});
}
function createOpenAIResponsesTransportStreamFn() {
	return (model, context, options) => {
		const eventStream = createAssistantMessageEventStream();
		const stream = eventStream;
		(async () => {
			const output = {
				role: "assistant",
				content: [],
				api: model.api,
				provider: model.provider,
				model: model.id,
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						total: 0
					}
				},
				stopReason: "stop",
				timestamp: Date.now()
			};
			try {
				const apiKey = options?.apiKey || getEnvApiKey(model.provider) || "";
				const turnState = resolveProviderTransportTurnState(model, {
					sessionId: options?.sessionId,
					turnId: randomUUID(),
					attempt: 1,
					transport: "stream"
				});
				const client = createOpenAIResponsesClient(model, context, apiKey, options?.headers, turnState?.headers);
				let params = buildOpenAIResponsesParams(model, context, options, turnState?.metadata);
				const nextParams = await options?.onPayload?.(params, model);
				if (nextParams !== void 0) params = nextParams;
				params = mergeTransportMetadata(params, turnState?.metadata);
				const responseStream = await client.responses.create(params, options?.signal ? { signal: options.signal } : void 0);
				stream.push({
					type: "start",
					partial: output
				});
				await processResponsesStream(responseStream, output, stream, model, {
					serviceTier: options?.serviceTier,
					applyServiceTierPricing
				});
				if (options?.signal?.aborted) throw new Error("Request was aborted");
				if (output.stopReason === "aborted" || output.stopReason === "error") throw new Error("An unknown error occurred");
				stream.push({
					type: "done",
					reason: output.stopReason,
					message: output
				});
				stream.end();
			} catch (error) {
				output.stopReason = options?.signal?.aborted ? "aborted" : "error";
				output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
				stream.push({
					type: "error",
					reason: output.stopReason,
					error: output
				});
				stream.end();
			}
		})();
		return eventStream;
	};
}
function resolveCacheRetention(cacheRetention) {
	if (cacheRetention === "short" || cacheRetention === "long" || cacheRetention === "none") return cacheRetention;
	if (typeof process !== "undefined" && process.env.PI_CACHE_RETENTION === "long") return "long";
	return "short";
}
function getPromptCacheRetention(baseUrl, cacheRetention) {
	if (cacheRetention !== "long") return;
	return baseUrl?.includes("api.openai.com") ? "24h" : void 0;
}
function buildOpenAIResponsesParams(model, context, options, metadata) {
	const compat = getCompat(model);
	const supportsDeveloperRole = typeof compat.supportsDeveloperRole === "boolean" ? compat.supportsDeveloperRole : void 0;
	const messages = convertResponsesMessages(model, context, new Set([
		"openai",
		"openai-codex",
		"opencode",
		"azure-openai-responses"
	]), { supportsDeveloperRole });
	const cacheRetention = resolveCacheRetention(options?.cacheRetention);
	const payloadPolicy = resolveOpenAIResponsesPayloadPolicy(model, { storeMode: "disable" });
	const params = {
		model: model.id,
		input: messages,
		stream: true,
		prompt_cache_key: cacheRetention === "none" ? void 0 : options?.sessionId,
		prompt_cache_retention: getPromptCacheRetention(model.baseUrl, cacheRetention),
		...metadata ? { metadata } : {}
	};
	if (options?.maxTokens) params.max_output_tokens = options.maxTokens;
	if (options?.temperature !== void 0) params.temperature = options.temperature;
	if (options?.serviceTier !== void 0 && payloadPolicy.allowsServiceTier) params.service_tier = options.serviceTier;
	if (context.tools) params.tools = convertResponsesTools(context.tools, { strict: resolveOpenAIStrictToolSetting(model, { transport: "stream" }) });
	if (model.reasoning) {
		if (options?.reasoningEffort || options?.reasoningSummary) {
			params.reasoning = {
				effort: options?.reasoningEffort || "medium",
				summary: options?.reasoningSummary || "auto"
			};
			params.include = ["reasoning.encrypted_content"];
		} else if (model.provider !== "github-copilot") params.reasoning = { effort: "none" };
	}
	applyOpenAIResponsesPayloadPolicy(params, payloadPolicy);
	return params;
}
function createAzureOpenAIResponsesTransportStreamFn() {
	return (model, context, options) => {
		const eventStream = createAssistantMessageEventStream();
		const stream = eventStream;
		(async () => {
			const output = {
				role: "assistant",
				content: [],
				api: "azure-openai-responses",
				provider: model.provider,
				model: model.id,
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						total: 0
					}
				},
				stopReason: "stop",
				timestamp: Date.now()
			};
			try {
				const apiKey = options?.apiKey || getEnvApiKey(model.provider) || "";
				const turnState = resolveProviderTransportTurnState(model, {
					sessionId: options?.sessionId,
					turnId: randomUUID(),
					attempt: 1,
					transport: "stream"
				});
				const client = createAzureOpenAIClient(model, context, apiKey, options?.headers, turnState?.headers);
				let params = buildAzureOpenAIResponsesParams(model, context, options, resolveAzureDeploymentName(model), turnState?.metadata);
				const nextParams = await options?.onPayload?.(params, model);
				if (nextParams !== void 0) params = nextParams;
				params = mergeTransportMetadata(params, turnState?.metadata);
				const responseStream = await client.responses.create(params, options?.signal ? { signal: options.signal } : void 0);
				stream.push({
					type: "start",
					partial: output
				});
				await processResponsesStream(responseStream, output, stream, model);
				if (options?.signal?.aborted) throw new Error("Request was aborted");
				if (output.stopReason === "aborted" || output.stopReason === "error") throw new Error("An unknown error occurred");
				stream.push({
					type: "done",
					reason: output.stopReason,
					message: output
				});
				stream.end();
			} catch (error) {
				output.stopReason = options?.signal?.aborted ? "aborted" : "error";
				output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
				stream.push({
					type: "error",
					reason: output.stopReason,
					error: output
				});
				stream.end();
			}
		})();
		return eventStream;
	};
}
function normalizeAzureBaseUrl(baseUrl) {
	return baseUrl.replace(/\/+$/, "");
}
function resolveAzureDeploymentName(model) {
	const deploymentMap = process.env.AZURE_OPENAI_DEPLOYMENT_NAME_MAP;
	if (deploymentMap) for (const entry of deploymentMap.split(",")) {
		const [modelId, deploymentName] = entry.split("=", 2).map((value) => value?.trim());
		if (modelId === model.id && deploymentName) return deploymentName;
	}
	return model.id;
}
function createAzureOpenAIClient(model, context, apiKey, optionHeaders, turnHeaders) {
	return new AzureOpenAI({
		apiKey,
		apiVersion: resolveAzureOpenAIApiVersion(),
		dangerouslyAllowBrowser: true,
		defaultHeaders: buildOpenAIClientHeaders(model, context, optionHeaders, turnHeaders),
		baseURL: normalizeAzureBaseUrl(model.baseUrl),
		fetch: buildGuardedModelFetch(model)
	});
}
function buildAzureOpenAIResponsesParams(model, context, options, deploymentName, metadata) {
	const params = buildOpenAIResponsesParams(model, context, options, metadata);
	params.model = deploymentName;
	delete params.store;
	return params;
}
function hasToolHistory(messages) {
	return messages.some((message) => message.role === "toolResult" || message.role === "assistant" && message.content.some((block) => block.type === "toolCall"));
}
function createOpenAICompletionsClient(model, context, apiKey, optionHeaders) {
	return new OpenAI({
		apiKey,
		baseURL: model.baseUrl,
		dangerouslyAllowBrowser: true,
		defaultHeaders: buildOpenAIClientHeaders(model, context, optionHeaders),
		fetch: buildGuardedModelFetch(model)
	});
}
function createOpenAICompletionsTransportStreamFn() {
	return (model, context, options) => {
		const eventStream = createAssistantMessageEventStream();
		const stream = eventStream;
		(async () => {
			const output = {
				role: "assistant",
				content: [],
				api: model.api,
				provider: model.provider,
				model: model.id,
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						total: 0
					}
				},
				stopReason: "stop",
				timestamp: Date.now()
			};
			try {
				const client = createOpenAICompletionsClient(model, context, options?.apiKey || getEnvApiKey(model.provider) || "", options?.headers);
				let params = buildOpenAICompletionsParams(model, context, options);
				const nextParams = await options?.onPayload?.(params, model);
				if (nextParams !== void 0) params = nextParams;
				const responseStream = await client.chat.completions.create(params, { signal: options?.signal });
				stream.push({
					type: "start",
					partial: output
				});
				await processOpenAICompletionsStream(responseStream, output, model, stream);
				if (options?.signal?.aborted) throw new Error("Request was aborted");
				stream.push({
					type: "done",
					reason: output.stopReason,
					message: output
				});
				stream.end();
			} catch (error) {
				output.stopReason = options?.signal?.aborted ? "aborted" : "error";
				output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
				stream.push({
					type: "error",
					reason: output.stopReason,
					error: output
				});
				stream.end();
			}
		})();
		return eventStream;
	};
}
async function processOpenAICompletionsStream(responseStream, output, model, stream) {
	let currentBlock = null;
	const blockIndex = () => output.content.length - 1;
	const finishCurrentBlock = () => {
		if (!currentBlock) return;
		if (currentBlock.type === "toolCall") {
			currentBlock.arguments = parseStreamingJson(currentBlock.partialArgs);
			const completed = {
				...currentBlock,
				arguments: parseStreamingJson(currentBlock.partialArgs)
			};
			output.content[blockIndex()] = completed;
		}
	};
	for await (const chunk of responseStream) {
		output.responseId ||= chunk.id;
		if (chunk.usage) output.usage = parseTransportChunkUsage(chunk.usage, model);
		const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : void 0;
		if (!choice) continue;
		const choiceUsage = choice.usage;
		if (!chunk.usage && choiceUsage) output.usage = parseTransportChunkUsage(choiceUsage, model);
		if (choice.finish_reason) {
			const finishReasonResult = mapStopReason(choice.finish_reason);
			output.stopReason = finishReasonResult.stopReason;
			if (finishReasonResult.errorMessage) output.errorMessage = finishReasonResult.errorMessage;
		}
		if (!choice.delta) continue;
		if (choice.delta.content) {
			if (!currentBlock || currentBlock.type !== "text") {
				finishCurrentBlock();
				currentBlock = {
					type: "text",
					text: ""
				};
				output.content.push(currentBlock);
				stream.push({
					type: "text_start",
					contentIndex: blockIndex(),
					partial: output
				});
			}
			currentBlock.text += choice.delta.content;
			stream.push({
				type: "text_delta",
				contentIndex: blockIndex(),
				delta: choice.delta.content,
				partial: output
			});
			continue;
		}
		const reasoningField = [
			"reasoning_content",
			"reasoning",
			"reasoning_text"
		].find((field) => {
			const value = choice.delta[field];
			return typeof value === "string" && value.length > 0;
		});
		if (reasoningField) {
			if (!currentBlock || currentBlock.type !== "thinking") {
				finishCurrentBlock();
				currentBlock = {
					type: "thinking",
					thinking: "",
					thinkingSignature: reasoningField
				};
				output.content.push(currentBlock);
				stream.push({
					type: "thinking_start",
					contentIndex: blockIndex(),
					partial: output
				});
			}
			currentBlock.thinking += String(choice.delta[reasoningField]);
			stream.push({
				type: "thinking_delta",
				contentIndex: blockIndex(),
				delta: String(choice.delta[reasoningField]),
				partial: output
			});
			continue;
		}
		if (choice.delta.tool_calls) for (const toolCall of choice.delta.tool_calls) {
			if (!currentBlock || currentBlock.type !== "toolCall" || toolCall.id && currentBlock.id !== toolCall.id) {
				finishCurrentBlock();
				currentBlock = {
					type: "toolCall",
					id: toolCall.id || "",
					name: toolCall.function?.name || "",
					arguments: {},
					partialArgs: ""
				};
				output.content.push(currentBlock);
				stream.push({
					type: "toolcall_start",
					contentIndex: blockIndex(),
					partial: output
				});
			}
			if (currentBlock.type !== "toolCall") continue;
			if (toolCall.id) currentBlock.id = toolCall.id;
			if (toolCall.function?.name) currentBlock.name = toolCall.function.name;
			if (toolCall.function?.arguments) {
				currentBlock.partialArgs += toolCall.function.arguments;
				currentBlock.arguments = parseStreamingJson(currentBlock.partialArgs);
				stream.push({
					type: "toolcall_delta",
					contentIndex: blockIndex(),
					delta: toolCall.function.arguments,
					partial: output
				});
			}
		}
	}
	finishCurrentBlock();
}
function detectCompat(model) {
	const provider = model.provider;
	const { capabilities, defaults: compatDefaults } = detectOpenAICompletionsCompat(model);
	const endpointClass = capabilities.endpointClass;
	const reasoningEffortMap = (endpointClass === "groq-native" || endpointClass === "default" && provider === "groq") && model.id === "qwen/qwen3-32b" ? {
		minimal: "default",
		low: "default",
		medium: "default",
		high: "default",
		xhigh: "default"
	} : {};
	return {
		supportsStore: compatDefaults.supportsStore,
		supportsDeveloperRole: compatDefaults.supportsDeveloperRole,
		supportsReasoningEffort: compatDefaults.supportsReasoningEffort,
		reasoningEffortMap,
		supportsUsageInStreaming: compatDefaults.supportsUsageInStreaming,
		maxTokensField: compatDefaults.maxTokensField,
		requiresToolResultName: false,
		requiresAssistantAfterToolResult: false,
		requiresThinkingAsText: false,
		thinkingFormat: compatDefaults.thinkingFormat,
		openRouterRouting: {},
		vercelGatewayRouting: {},
		supportsStrictMode: compatDefaults.supportsStrictMode
	};
}
function getCompat(model) {
	const detected = detectCompat(model);
	const compat = model.compat ?? {};
	const supportsStore = typeof compat.supportsStore === "boolean" ? compat.supportsStore : detected.supportsStore;
	const supportsReasoningEffort = typeof compat.supportsReasoningEffort === "boolean" ? compat.supportsReasoningEffort : detected.supportsReasoningEffort;
	return {
		supportsStore,
		supportsDeveloperRole: compat.supportsDeveloperRole ?? detected.supportsDeveloperRole,
		supportsReasoningEffort,
		reasoningEffortMap: compat.reasoningEffortMap ?? detected.reasoningEffortMap,
		supportsUsageInStreaming: compat.supportsUsageInStreaming ?? detected.supportsUsageInStreaming,
		maxTokensField: compat.maxTokensField ?? detected.maxTokensField,
		requiresToolResultName: compat.requiresToolResultName ?? detected.requiresToolResultName,
		requiresAssistantAfterToolResult: compat.requiresAssistantAfterToolResult ?? detected.requiresAssistantAfterToolResult,
		requiresThinkingAsText: compat.requiresThinkingAsText ?? detected.requiresThinkingAsText,
		thinkingFormat: compat.thinkingFormat ?? detected.thinkingFormat,
		openRouterRouting: compat.openRouterRouting ?? {},
		vercelGatewayRouting: compat.vercelGatewayRouting ?? detected.vercelGatewayRouting,
		supportsStrictMode: compat.supportsStrictMode ?? detected.supportsStrictMode
	};
}
function mapReasoningEffort(effort, reasoningEffortMap) {
	return reasoningEffortMap[effort] ?? effort;
}
function convertTools(tools, compat, model) {
	const strict = resolveOpenAIStrictToolFlagForInventory(tools, resolveOpenAIStrictToolSetting(model, {
		transport: "stream",
		supportsStrictMode: compat?.supportsStrictMode
	}));
	return tools.map((tool) => ({
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: normalizeOpenAIStrictToolParameters(tool.parameters, strict === true),
			...strict === void 0 ? {} : { strict }
		}
	}));
}
function buildOpenAICompletionsParams(model, context, options) {
	const compat = getCompat(model);
	const completionsContext = context.systemPrompt ? {
		...context,
		systemPrompt: stripSystemPromptCacheBoundary(context.systemPrompt)
	} : context;
	const params = {
		model: model.id,
		messages: convertMessages(model, completionsContext, compat),
		stream: true
	};
	if (compat.supportsUsageInStreaming) params.stream_options = { include_usage: true };
	if (compat.supportsStore) params.store = false;
	if (options?.maxTokens) if (compat.maxTokensField === "max_tokens") params.max_tokens = options.maxTokens;
	else params.max_completion_tokens = options.maxTokens;
	if (options?.temperature !== void 0) params.temperature = options.temperature;
	if (context.tools) params.tools = convertTools(context.tools, compat, model);
	else if (hasToolHistory(context.messages)) params.tools = [];
	if (options?.toolChoice) params.tool_choice = options.toolChoice;
	if (compat.thinkingFormat === "openrouter" && model.reasoning && options?.reasoningEffort) params.reasoning = { effort: mapReasoningEffort(options.reasoningEffort, compat.reasoningEffortMap) };
	else if (options?.reasoningEffort && model.reasoning && compat.supportsReasoningEffort) params.reasoning_effort = mapReasoningEffort(options.reasoningEffort, compat.reasoningEffortMap);
	return params;
}
function parseTransportChunkUsage(rawUsage, model) {
	const cachedTokens = rawUsage.prompt_tokens_details?.cached_tokens || 0;
	const promptTokens = rawUsage.prompt_tokens || 0;
	const input = Math.max(0, promptTokens - cachedTokens);
	const outputTokens = rawUsage.completion_tokens || 0;
	const usage = {
		input,
		output: outputTokens,
		cacheRead: cachedTokens,
		cacheWrite: 0,
		totalTokens: input + outputTokens + cachedTokens,
		cost: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			total: 0
		}
	};
	calculateCost(model, usage);
	return usage;
}
function mapStopReason(reason) {
	if (reason === null) return { stopReason: "stop" };
	switch (reason) {
		case "stop":
		case "end": return { stopReason: "stop" };
		case "length": return { stopReason: "length" };
		case "function_call":
		case "tool_calls": return { stopReason: "toolUse" };
		case "content_filter": return {
			stopReason: "error",
			errorMessage: "Provider finish_reason: content_filter"
		};
		case "network_error": return {
			stopReason: "error",
			errorMessage: "Provider finish_reason: network_error"
		};
		default: return {
			stopReason: "error",
			errorMessage: `Provider finish_reason: ${reason}`
		};
	}
}
//#endregion
//#region src/agents/provider-transport-stream.ts
const SUPPORTED_TRANSPORT_APIS = new Set([
	"openai-responses",
	"openai-codex-responses",
	"openai-completions",
	"azure-openai-responses",
	"anthropic-messages",
	"google-generative-ai"
]);
const SIMPLE_TRANSPORT_API_ALIAS = {
	"openai-responses": "openclaw-openai-responses-transport",
	"openai-codex-responses": "openclaw-openai-responses-transport",
	"openai-completions": "openclaw-openai-completions-transport",
	"azure-openai-responses": "openclaw-azure-openai-responses-transport",
	"anthropic-messages": "openclaw-anthropic-messages-transport",
	"google-generative-ai": "openclaw-google-generative-ai-transport"
};
function createSupportedTransportStreamFn(api) {
	switch (api) {
		case "openai-responses":
		case "openai-codex-responses": return createOpenAIResponsesTransportStreamFn();
		case "openai-completions": return createOpenAICompletionsTransportStreamFn();
		case "azure-openai-responses": return createAzureOpenAIResponsesTransportStreamFn();
		case "anthropic-messages": return createAnthropicMessagesTransportStreamFn();
		case "google-generative-ai": return createGoogleGenerativeAiTransportStreamFn();
		default: return;
	}
}
function hasTransportOverrides(model) {
	const request = getModelProviderRequestTransport(model);
	return Boolean(request?.proxy || request?.tls);
}
function isTransportAwareApiSupported(api) {
	return SUPPORTED_TRANSPORT_APIS.has(api);
}
function resolveTransportAwareSimpleApi(api) {
	return SIMPLE_TRANSPORT_API_ALIAS[api];
}
function createTransportAwareStreamFnForModel(model) {
	if (!hasTransportOverrides(model)) return;
	if (!isTransportAwareApiSupported(model.api)) throw new Error(`Model-provider request.proxy/request.tls is not yet supported for api "${model.api}"`);
	return createSupportedTransportStreamFn(model.api);
}
function createBoundaryAwareStreamFnForModel(model) {
	if (!isTransportAwareApiSupported(model.api)) return;
	return createSupportedTransportStreamFn(model.api);
}
function prepareTransportAwareSimpleModel(model) {
	const streamFn = createTransportAwareStreamFnForModel(model);
	const alias = resolveTransportAwareSimpleApi(model.api);
	if (!streamFn || !alias) return model;
	return {
		...model,
		api: alias
	};
}
function buildTransportAwareSimpleStreamFn(model) {
	return createTransportAwareStreamFnForModel(model);
}
//#endregion
//#region src/agents/provider-stream.ts
function registerProviderStreamForModel(params) {
	const streamFn = resolveProviderStreamFn({
		provider: params.model.provider,
		config: params.cfg,
		workspaceDir: params.workspaceDir,
		env: params.env,
		context: {
			config: params.cfg,
			agentDir: params.agentDir,
			workspaceDir: params.workspaceDir,
			provider: params.model.provider,
			modelId: params.model.id,
			model: params.model
		}
	}) ?? createTransportAwareStreamFnForModel(params.model);
	if (!streamFn) return;
	ensureCustomApiRegistered(params.model.api, streamFn);
	return streamFn;
}
//#endregion
//#region src/plugin-sdk/anthropic-vertex.ts
function loadFacadeModule() {
	return loadBundledPluginPublicSurfaceModuleSync({
		dirName: "anthropic-vertex",
		artifactBasename: "api.js"
	});
}
const resolveAnthropicVertexClientRegion = ((...args) => loadFacadeModule().resolveAnthropicVertexClientRegion(...args));
const resolveAnthropicVertexProjectId = ((...args) => loadFacadeModule().resolveAnthropicVertexProjectId(...args));
//#endregion
//#region src/agents/anthropic-vertex-stream.ts
function resolveAnthropicVertexMaxTokens(params) {
	const modelMax = typeof params.modelMaxTokens === "number" && Number.isFinite(params.modelMaxTokens) && params.modelMaxTokens > 0 ? Math.floor(params.modelMaxTokens) : void 0;
	const requested = typeof params.requestedMaxTokens === "number" && Number.isFinite(params.requestedMaxTokens) && params.requestedMaxTokens > 0 ? Math.floor(params.requestedMaxTokens) : void 0;
	if (modelMax !== void 0 && requested !== void 0) return Math.min(requested, modelMax);
	return requested ?? modelMax;
}
function createAnthropicVertexOnPayload(params) {
	const policy = resolveAnthropicPayloadPolicy({
		provider: params.model.provider,
		api: params.model.api,
		baseUrl: params.model.baseUrl,
		cacheRetention: params.cacheRetention,
		enableCacheControl: true
	});
	function applyPolicy(payload) {
		if (payload && typeof payload === "object" && !Array.isArray(payload)) applyAnthropicPayloadPolicyToParams(payload, policy);
		return payload;
	}
	return async (payload, model) => {
		const shapedPayload = applyPolicy(payload);
		const nextPayload = await params.onPayload?.(shapedPayload, model);
		if (nextPayload === void 0 || nextPayload === shapedPayload) return shapedPayload;
		return applyPolicy(nextPayload);
	};
}
/**
* Create a StreamFn that routes through pi-ai's `streamAnthropic` with an
* injected `AnthropicVertex` client.  All streaming, message conversion, and
* event handling is handled by pi-ai — we only supply the GCP-authenticated
* client and map SimpleStreamOptions → AnthropicOptions.
*/
function createAnthropicVertexStreamFn(projectId, region, baseURL) {
	const client = new AnthropicVertex({
		region,
		...baseURL ? { baseURL } : {},
		...projectId ? { projectId } : {}
	});
	return (model, context, options) => {
		const transportModel = model;
		const maxTokens = resolveAnthropicVertexMaxTokens({
			modelMaxTokens: transportModel.maxTokens,
			requestedMaxTokens: options?.maxTokens
		});
		const opts = {
			client,
			temperature: options?.temperature,
			...maxTokens !== void 0 ? { maxTokens } : {},
			signal: options?.signal,
			cacheRetention: options?.cacheRetention,
			sessionId: options?.sessionId,
			headers: options?.headers,
			onPayload: createAnthropicVertexOnPayload({
				model: transportModel,
				cacheRetention: options?.cacheRetention,
				onPayload: options?.onPayload
			}),
			maxRetryDelayMs: options?.maxRetryDelayMs,
			metadata: options?.metadata
		};
		if (options?.reasoning) if (model.id.includes("opus-4-6") || model.id.includes("opus-4.6") || model.id.includes("sonnet-4-6") || model.id.includes("sonnet-4.6")) {
			opts.thinkingEnabled = true;
			opts.effort = {
				minimal: "low",
				low: "low",
				medium: "medium",
				high: "high",
				xhigh: model.id.includes("opus-4-6") || model.id.includes("opus-4.6") ? "max" : "high"
			}[options.reasoning] ?? "high";
		} else {
			opts.thinkingEnabled = true;
			const budgets = options.thinkingBudgets;
			opts.thinkingBudgetTokens = (budgets && options.reasoning in budgets ? budgets[options.reasoning] : void 0) ?? 1e4;
		}
		else opts.thinkingEnabled = false;
		return streamAnthropic(transportModel, context, opts);
	};
}
function resolveAnthropicVertexSdkBaseUrl(baseUrl) {
	const trimmed = baseUrl?.trim();
	if (!trimmed) return;
	try {
		const url = new URL(trimmed);
		const normalizedPath = url.pathname.replace(/\/+$/, "");
		if (!normalizedPath || normalizedPath === "") {
			url.pathname = "/v1";
			return url.toString().replace(/\/$/, "");
		}
		if (!normalizedPath.endsWith("/v1")) {
			url.pathname = `${normalizedPath}/v1`;
			return url.toString().replace(/\/$/, "");
		}
		return trimmed;
	} catch {
		return trimmed;
	}
}
function createAnthropicVertexStreamFnForModel(model, env = process.env) {
	return createAnthropicVertexStreamFn(resolveAnthropicVertexProjectId(env), resolveAnthropicVertexClientRegion({
		baseUrl: model.baseUrl,
		env
	}), resolveAnthropicVertexSdkBaseUrl(model.baseUrl));
}
//#endregion
export { listChannelAgentTools as _, prepareTransportAwareSimpleModel as a, resolveChannelMessageToolHints as b, resolveOpenAIStrictToolSetting as c, sanitizeTransportPayloadText as d, buildGuardedModelFetch as f, getChannelAgentToolMeta as g, copyChannelAgentToolMeta as h, createBoundaryAwareStreamFnForModel as i, mergeTransportHeaders as l, normalizeToolParameters as m, registerProviderStreamForModel as n, normalizeOpenAIStrictToolParameters as o, ensureCustomApiRegistered as p, buildTransportAwareSimpleStreamFn as r, resolveOpenAIStrictToolFlagForInventory as s, createAnthropicVertexStreamFnForModel as t, mergeTransportMetadata as u, listChannelSupportedActions as v, resolveChannelReactionGuidance as x, resolveChannelMessageToolCapabilities as y };
