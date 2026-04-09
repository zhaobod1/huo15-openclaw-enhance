import { n as redactSensitiveText, t as getDefaultRedactPatterns } from "./redact-BDinS1q9.js";
import { t as isVerbose } from "./global-state-DUuMGgts.js";
import { f as shouldLogSubsystemToConsole, t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { w as parseAgentSessionKey } from "./session-key-BR3Z-ljs.js";
import "./globals-B43CpcZo.js";
import "./exec-CHN1LzVK.js";
import { a as hasConfiguredSecretInput } from "./types.secrets-BZdSA8i7.js";
import { r as replaceConfigFile } from "./config-dzPpvDz6.js";
import { t as assertExplicitGatewayAuthModeWhenBothConfigured } from "./auth-mode-policy-ClDXr0JP.js";
import "./net-DwNAtbJy.js";
import { a as readGatewayTokenEnv, n as hasGatewayPasswordEnvCandidate, r as hasGatewayTokenEnvCandidate } from "./credential-planner-DVhLNnc0.js";
import "./credentials-pGvqXsM2.js";
import { o as resolveGatewayAuth } from "./auth-D6Uk4TMd.js";
import { on as ErrorCodes, p as formatValidationErrors, sn as errorShape } from "./method-scopes-D4ep-GlN.js";
import { r as resolveRequiredConfiguredSecretRefInputString } from "./resolve-configured-secret-input-string-CYiXRDwm.js";
import { p as resolveSendableOutboundReplyParts } from "./reply-payload-Dp5nBPsr.js";
import "./gateway-rpc-Dfq20F8q.js";
import "./cli-utils-BdKzKa-H.js";
import "./node-command-policy-BVMJMqp7.js";
import { t as getGatewayWsLogStyle } from "./ws-logging-D23GgwNR.js";
import "./lazy-service-module-t59FA6X-.js";
import "./runtime-C9er17zX.js";
import chalk from "chalk";
import crypto from "node:crypto";
//#region src/gateway/ws-log.ts
const LOG_VALUE_LIMIT = 240;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WS_LOG_REDACT_OPTIONS = {
	mode: "tools",
	patterns: getDefaultRedactPatterns()
};
const wsInflightCompact = /* @__PURE__ */ new Map();
let wsLastCompactConnId;
const wsInflightOptimized = /* @__PURE__ */ new Map();
const wsInflightSince = /* @__PURE__ */ new Map();
const wsLog = createSubsystemLogger("gateway/ws");
const WS_META_SKIP_KEYS = new Set([
	"connId",
	"id",
	"method",
	"ok",
	"event"
]);
function collectWsRestMeta(meta) {
	const restMeta = [];
	if (!meta) return restMeta;
	for (const [key, value] of Object.entries(meta)) {
		if (value === void 0) continue;
		if (WS_META_SKIP_KEYS.has(key)) continue;
		restMeta.push(`${chalk.dim(key)}=${formatForLog(value)}`);
	}
	return restMeta;
}
function buildWsHeadline(params) {
	if ((params.kind === "req" || params.kind === "res") && params.method) return chalk.bold(params.method);
	if (params.kind === "event" && params.event) return chalk.bold(params.event);
}
function buildWsStatusToken(kind, ok) {
	if (kind !== "res" || ok === void 0) return;
	return ok ? chalk.greenBright("✓") : chalk.redBright("✗");
}
function logWsInfoLine(params) {
	const tokens = [
		params.prefix,
		params.statusToken,
		params.headline,
		params.durationToken,
		...params.restMeta,
		...params.trailing
	].filter((t) => Boolean(t));
	wsLog.info(tokens.join(" "));
}
function shouldLogWs() {
	return shouldLogSubsystemToConsole("gateway/ws");
}
function shortId(value) {
	const s = value.trim();
	if (UUID_RE.test(s)) return `${s.slice(0, 8)}…${s.slice(-4)}`;
	if (s.length <= 24) return s;
	return `${s.slice(0, 12)}…${s.slice(-4)}`;
}
function formatForLog(value) {
	try {
		if (value instanceof Error) {
			const parts = [];
			if (value.name) parts.push(value.name);
			if (value.message) parts.push(value.message);
			const code = "code" in value && (typeof value.code === "string" || typeof value.code === "number") ? String(value.code) : "";
			if (code) parts.push(`code=${code}`);
			const combined = parts.filter(Boolean).join(": ").trim();
			if (combined) return combined.length > LOG_VALUE_LIMIT ? `${combined.slice(0, LOG_VALUE_LIMIT)}...` : combined;
		}
		if (value && typeof value === "object") {
			const rec = value;
			if (typeof rec.message === "string" && rec.message.trim()) {
				const name = typeof rec.name === "string" ? rec.name.trim() : "";
				const code = typeof rec.code === "string" || typeof rec.code === "number" ? String(rec.code) : "";
				const parts = [name, rec.message.trim()].filter(Boolean);
				if (code) parts.push(`code=${code}`);
				const combined = parts.join(": ").trim();
				return combined.length > LOG_VALUE_LIMIT ? `${combined.slice(0, LOG_VALUE_LIMIT)}...` : combined;
			}
		}
		const str = typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value);
		if (!str) return "";
		const redacted = redactSensitiveText(str, WS_LOG_REDACT_OPTIONS);
		return redacted.length > LOG_VALUE_LIMIT ? `${redacted.slice(0, LOG_VALUE_LIMIT)}...` : redacted;
	} catch {
		return String(value);
	}
}
function compactPreview(input, maxLen = 160) {
	const oneLine = input.replace(/\s+/g, " ").trim();
	if (oneLine.length <= maxLen) return oneLine;
	return `${oneLine.slice(0, Math.max(0, maxLen - 1))}…`;
}
function summarizeAgentEventForWsLog(payload) {
	if (!payload || typeof payload !== "object") return {};
	const rec = payload;
	const runId = typeof rec.runId === "string" ? rec.runId : void 0;
	const stream = typeof rec.stream === "string" ? rec.stream : void 0;
	const seq = typeof rec.seq === "number" ? rec.seq : void 0;
	const sessionKey = typeof rec.sessionKey === "string" ? rec.sessionKey : void 0;
	const data = rec.data && typeof rec.data === "object" ? rec.data : void 0;
	const extra = {};
	if (runId) extra.run = shortId(runId);
	if (sessionKey) {
		const parsed = parseAgentSessionKey(sessionKey);
		if (parsed) {
			extra.agent = parsed.agentId;
			extra.session = parsed.rest;
		} else extra.session = sessionKey;
	}
	if (stream) extra.stream = stream;
	if (seq !== void 0) extra.aseq = seq;
	if (!data) return extra;
	if (stream === "assistant") {
		const text = typeof data.text === "string" ? data.text : void 0;
		if (text?.trim()) extra.text = compactPreview(text);
		const mediaCount = resolveSendableOutboundReplyParts({ mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls : void 0 }).mediaCount;
		if (mediaCount > 0) extra.media = mediaCount;
		return extra;
	}
	if (stream === "tool") {
		const phase = typeof data.phase === "string" ? data.phase : void 0;
		const name = typeof data.name === "string" ? data.name : void 0;
		if (phase || name) extra.tool = `${phase ?? "?"}:${name ?? "?"}`;
		const toolCallId = typeof data.toolCallId === "string" ? data.toolCallId : void 0;
		if (toolCallId) extra.call = shortId(toolCallId);
		const meta = typeof data.meta === "string" ? data.meta : void 0;
		if (meta?.trim()) extra.meta = meta;
		if (typeof data.isError === "boolean") extra.err = data.isError;
		return extra;
	}
	if (stream === "lifecycle") {
		const phase = typeof data.phase === "string" ? data.phase : void 0;
		if (phase) extra.phase = phase;
		if (typeof data.aborted === "boolean") extra.aborted = data.aborted;
		const error = typeof data.error === "string" ? data.error : void 0;
		if (error?.trim()) extra.error = compactPreview(error, 120);
		return extra;
	}
	const reason = typeof data.reason === "string" ? data.reason : void 0;
	if (reason?.trim()) extra.reason = reason;
	return extra;
}
function logWs(direction, kind, meta) {
	if (!shouldLogSubsystemToConsole("gateway/ws")) return;
	const style = getGatewayWsLogStyle();
	if (!isVerbose()) {
		logWsOptimized(direction, kind, meta);
		return;
	}
	if (style === "compact" || style === "auto") {
		logWsCompact(direction, kind, meta);
		return;
	}
	const now = Date.now();
	const connId = typeof meta?.connId === "string" ? meta.connId : void 0;
	const id = typeof meta?.id === "string" ? meta.id : void 0;
	const method = typeof meta?.method === "string" ? meta.method : void 0;
	const ok = typeof meta?.ok === "boolean" ? meta.ok : void 0;
	const event = typeof meta?.event === "string" ? meta.event : void 0;
	const inflightKey = connId && id ? `${connId}:${id}` : void 0;
	if (direction === "in" && kind === "req" && inflightKey) wsInflightSince.set(inflightKey, now);
	const durationMs = direction === "out" && kind === "res" && inflightKey ? (() => {
		const startedAt = wsInflightSince.get(inflightKey);
		if (startedAt === void 0) return;
		wsInflightSince.delete(inflightKey);
		return now - startedAt;
	})() : void 0;
	const dirArrow = direction === "in" ? "←" : "→";
	const prefix = `${(direction === "in" ? chalk.greenBright : chalk.cyanBright)(dirArrow)} ${chalk.bold(kind)}`;
	const headline = buildWsHeadline({
		kind,
		method,
		event
	});
	const statusToken = buildWsStatusToken(kind, ok);
	const durationToken = typeof durationMs === "number" ? chalk.dim(`${durationMs}ms`) : void 0;
	const restMeta = collectWsRestMeta(meta);
	const trailing = [];
	if (connId) trailing.push(`${chalk.dim("conn")}=${chalk.gray(shortId(connId))}`);
	if (id) trailing.push(`${chalk.dim("id")}=${chalk.gray(shortId(id))}`);
	logWsInfoLine({
		prefix,
		statusToken,
		headline,
		durationToken,
		restMeta,
		trailing
	});
}
function logWsOptimized(direction, kind, meta) {
	const connId = typeof meta?.connId === "string" ? meta.connId : void 0;
	const id = typeof meta?.id === "string" ? meta.id : void 0;
	const ok = typeof meta?.ok === "boolean" ? meta.ok : void 0;
	const method = typeof meta?.method === "string" ? meta.method : void 0;
	const inflightKey = connId && id ? `${connId}:${id}` : void 0;
	if (direction === "in" && kind === "req" && inflightKey) {
		wsInflightOptimized.set(inflightKey, Date.now());
		if (wsInflightOptimized.size > 2e3) wsInflightOptimized.clear();
		return;
	}
	if (kind === "parse-error") {
		const errorMsg = typeof meta?.error === "string" ? formatForLog(meta.error) : void 0;
		wsLog.warn([
			`${chalk.redBright("✗")} ${chalk.bold("parse-error")}`,
			errorMsg ? `${chalk.dim("error")}=${errorMsg}` : void 0,
			`${chalk.dim("conn")}=${chalk.gray(shortId(connId ?? "?"))}`
		].filter((t) => Boolean(t)).join(" "));
		return;
	}
	if (direction !== "out" || kind !== "res") return;
	const startedAt = inflightKey ? wsInflightOptimized.get(inflightKey) : void 0;
	if (inflightKey) wsInflightOptimized.delete(inflightKey);
	const durationMs = typeof startedAt === "number" ? Date.now() - startedAt : void 0;
	if (!(ok === false || typeof durationMs === "number" && durationMs >= 50)) return;
	const statusToken = buildWsStatusToken("res", ok);
	const durationToken = typeof durationMs === "number" ? chalk.dim(`${durationMs}ms`) : void 0;
	const restMeta = collectWsRestMeta(meta);
	logWsInfoLine({
		prefix: `${chalk.yellowBright("⇄")} ${chalk.bold("res")}`,
		statusToken,
		headline: method ? chalk.bold(method) : void 0,
		durationToken,
		restMeta,
		trailing: [connId ? `${chalk.dim("conn")}=${chalk.gray(shortId(connId))}` : "", id ? `${chalk.dim("id")}=${chalk.gray(shortId(id))}` : ""].filter(Boolean)
	});
}
function logWsCompact(direction, kind, meta) {
	const now = Date.now();
	const connId = typeof meta?.connId === "string" ? meta.connId : void 0;
	const id = typeof meta?.id === "string" ? meta.id : void 0;
	const method = typeof meta?.method === "string" ? meta.method : void 0;
	const ok = typeof meta?.ok === "boolean" ? meta.ok : void 0;
	const inflightKey = connId && id ? `${connId}:${id}` : void 0;
	if (kind === "req" && direction === "in" && inflightKey) {
		wsInflightCompact.set(inflightKey, {
			ts: now,
			method,
			meta
		});
		return;
	}
	const compactArrow = (() => {
		if (kind === "req" || kind === "res") return "⇄";
		return direction === "in" ? "←" : "→";
	})();
	const prefix = `${(kind === "req" || kind === "res" ? chalk.yellowBright : direction === "in" ? chalk.greenBright : chalk.cyanBright)(compactArrow)} ${chalk.bold(kind)}`;
	const statusToken = buildWsStatusToken(kind, ok);
	const startedAt = kind === "res" && direction === "out" && inflightKey ? wsInflightCompact.get(inflightKey)?.ts : void 0;
	if (kind === "res" && direction === "out" && inflightKey) wsInflightCompact.delete(inflightKey);
	const durationToken = typeof startedAt === "number" ? chalk.dim(`${now - startedAt}ms`) : void 0;
	const headline = buildWsHeadline({
		kind,
		method,
		event: typeof meta?.event === "string" ? meta.event : void 0
	});
	const restMeta = collectWsRestMeta(meta);
	const trailing = [];
	if (connId && connId !== wsLastCompactConnId) {
		trailing.push(`${chalk.dim("conn")}=${chalk.gray(shortId(connId))}`);
		wsLastCompactConnId = connId;
	}
	if (id) trailing.push(`${chalk.dim("id")}=${chalk.gray(shortId(id))}`);
	logWsInfoLine({
		prefix,
		statusToken,
		headline,
		durationToken,
		restMeta,
		trailing
	});
}
//#endregion
//#region src/gateway/server-methods/nodes.helpers.ts
function respondInvalidParams(params) {
	params.respond(false, void 0, errorShape(ErrorCodes.INVALID_REQUEST, `invalid ${params.method} params: ${formatValidationErrors(params.validator.errors)}`));
}
async function respondUnavailableOnThrow(respond, fn) {
	try {
		await fn();
	} catch (err) {
		respond(false, void 0, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
	}
}
function safeParseJson(value) {
	if (typeof value !== "string") return;
	const trimmed = value.trim();
	if (!trimmed) return;
	try {
		return JSON.parse(trimmed);
	} catch {
		return { payloadJSON: value };
	}
}
function respondUnavailableOnNodeInvokeError(respond, res) {
	if (res.ok) return true;
	const nodeError = res.error && typeof res.error === "object" ? res.error : null;
	const nodeCode = typeof nodeError?.code === "string" ? nodeError.code.trim() : "";
	const nodeMessage = typeof nodeError?.message === "string" && nodeError.message.trim().length > 0 ? nodeError.message.trim() : "node invoke failed";
	const message = nodeCode ? `${nodeCode}: ${nodeMessage}` : nodeMessage;
	respond(false, void 0, errorShape(ErrorCodes.UNAVAILABLE, message, { details: { nodeError: res.error ?? null } }));
	return false;
}
//#endregion
//#region src/gateway/startup-auth.ts
function mergeGatewayAuthConfig(base, override) {
	const merged = { ...base };
	if (!override) return merged;
	if (override.mode !== void 0) merged.mode = override.mode;
	if (override.token !== void 0) merged.token = override.token;
	if (override.password !== void 0) merged.password = override.password;
	if (override.allowTailscale !== void 0) merged.allowTailscale = override.allowTailscale;
	if (override.rateLimit !== void 0) merged.rateLimit = override.rateLimit;
	if (override.trustedProxy !== void 0) merged.trustedProxy = override.trustedProxy;
	return merged;
}
function mergeGatewayTailscaleConfig(base, override) {
	const merged = { ...base };
	if (!override) return merged;
	if (override.mode !== void 0) merged.mode = override.mode;
	if (override.resetOnExit !== void 0) merged.resetOnExit = override.resetOnExit;
	return merged;
}
function resolveGatewayAuthFromConfig(params) {
	const tailscaleConfig = mergeGatewayTailscaleConfig(params.cfg.gateway?.tailscale, params.tailscaleOverride);
	return resolveGatewayAuth({
		authConfig: params.cfg.gateway?.auth,
		authOverride: params.authOverride,
		env: params.env,
		tailscaleMode: tailscaleConfig.mode ?? "off"
	});
}
function shouldPersistGeneratedToken(params) {
	if (!params.persistRequested) return false;
	if (params.resolvedAuth.modeSource === "override") return false;
	return true;
}
function hasGatewayTokenCandidate(params) {
	if (readGatewayTokenEnv(params.env)) return true;
	if (typeof params.authOverride?.token === "string" && params.authOverride.token.trim().length > 0) return true;
	return hasConfiguredSecretInput(params.cfg.gateway?.auth?.token, params.cfg.secrets?.defaults);
}
function hasGatewayTokenOverrideCandidate(params) {
	return Boolean(typeof params.authOverride?.token === "string" && params.authOverride.token.trim().length > 0);
}
function hasGatewayPasswordOverrideCandidate(params) {
	if (hasGatewayPasswordEnvCandidate(params.env)) return true;
	return Boolean(typeof params.authOverride?.password === "string" && params.authOverride.password.trim().length > 0);
}
function shouldResolveGatewayTokenSecretRef(params) {
	if (hasGatewayTokenOverrideCandidate({ authOverride: params.authOverride })) return false;
	if (hasGatewayTokenEnvCandidate(params.env)) return false;
	const explicitMode = params.authOverride?.mode ?? params.cfg.gateway?.auth?.mode;
	if (explicitMode === "token") return true;
	if (explicitMode === "password" || explicitMode === "none" || explicitMode === "trusted-proxy") return false;
	if (hasGatewayPasswordOverrideCandidate(params)) return false;
	return !hasConfiguredSecretInput(params.cfg.gateway?.auth?.password, params.cfg.secrets?.defaults);
}
async function resolveGatewayTokenSecretRef(cfg, env, authOverride) {
	if (!shouldResolveGatewayTokenSecretRef({
		cfg,
		env,
		authOverride
	})) return;
	return await resolveRequiredConfiguredSecretRefInputString({
		config: cfg,
		env,
		value: cfg.gateway?.auth?.token,
		path: "gateway.auth.token"
	});
}
function shouldResolveGatewayPasswordSecretRef(params) {
	if (hasGatewayPasswordOverrideCandidate(params)) return false;
	const explicitMode = params.authOverride?.mode ?? params.cfg.gateway?.auth?.mode;
	if (explicitMode === "password") return true;
	if (explicitMode === "token" || explicitMode === "none" || explicitMode === "trusted-proxy") return false;
	if (hasGatewayTokenCandidate(params)) return false;
	return true;
}
async function resolveGatewayPasswordSecretRef(cfg, env, authOverride) {
	if (!shouldResolveGatewayPasswordSecretRef({
		cfg,
		env,
		authOverride
	})) return;
	return await resolveRequiredConfiguredSecretRefInputString({
		config: cfg,
		env,
		value: cfg.gateway?.auth?.password,
		path: "gateway.auth.password"
	});
}
async function ensureGatewayStartupAuth(params) {
	assertExplicitGatewayAuthModeWhenBothConfigured(params.cfg);
	const env = params.env ?? process.env;
	const persistRequested = params.persist === true;
	const [resolvedTokenRefValue, resolvedPasswordRefValue] = await Promise.all([resolveGatewayTokenSecretRef(params.cfg, env, params.authOverride), resolveGatewayPasswordSecretRef(params.cfg, env, params.authOverride)]);
	const authOverride = params.authOverride || resolvedTokenRefValue || resolvedPasswordRefValue ? {
		...params.authOverride,
		...resolvedTokenRefValue ? { token: resolvedTokenRefValue } : {},
		...resolvedPasswordRefValue ? { password: resolvedPasswordRefValue } : {}
	} : void 0;
	const resolved = resolveGatewayAuthFromConfig({
		cfg: params.cfg,
		env,
		authOverride,
		tailscaleOverride: params.tailscaleOverride
	});
	if (resolved.mode !== "token" || (resolved.token?.trim().length ?? 0) > 0) {
		assertHooksTokenSeparateFromGatewayAuth({
			cfg: params.cfg,
			auth: resolved
		});
		return {
			cfg: params.cfg,
			auth: resolved,
			persistedGeneratedToken: false
		};
	}
	const generatedToken = crypto.randomBytes(24).toString("hex");
	const nextCfg = {
		...params.cfg,
		gateway: {
			...params.cfg.gateway,
			auth: {
				...params.cfg.gateway?.auth,
				mode: "token",
				token: generatedToken
			}
		}
	};
	const persist = shouldPersistGeneratedToken({
		persistRequested,
		resolvedAuth: resolved
	});
	if (persist) await replaceConfigFile({
		nextConfig: nextCfg,
		baseHash: params.baseHash
	});
	const nextAuth = resolveGatewayAuthFromConfig({
		cfg: nextCfg,
		env,
		authOverride: params.authOverride,
		tailscaleOverride: params.tailscaleOverride
	});
	assertHooksTokenSeparateFromGatewayAuth({
		cfg: nextCfg,
		auth: nextAuth
	});
	return {
		cfg: nextCfg,
		auth: nextAuth,
		generatedToken,
		persistedGeneratedToken: persist
	};
}
function assertHooksTokenSeparateFromGatewayAuth(params) {
	if (params.cfg.hooks?.enabled !== true) return;
	const hooksToken = typeof params.cfg.hooks.token === "string" ? params.cfg.hooks.token.trim() : "";
	if (!hooksToken) return;
	const gatewayToken = params.auth.mode === "token" && typeof params.auth.token === "string" ? params.auth.token.trim() : "";
	if (!gatewayToken) return;
	if (hooksToken !== gatewayToken) return;
	throw new Error("Invalid config: hooks.token must not match gateway auth token. Set a distinct hooks.token for hook ingress.");
}
//#endregion
//#region src/node-host/with-timeout.ts
async function withTimeout(work, timeoutMs, label) {
	const resolved = typeof timeoutMs === "number" && Number.isFinite(timeoutMs) ? Math.max(1, Math.floor(timeoutMs)) : void 0;
	if (!resolved) return await work(void 0);
	const abortCtrl = new AbortController();
	const timeoutError = /* @__PURE__ */ new Error(`${label ?? "request"} timed out`);
	const timer = setTimeout(() => abortCtrl.abort(timeoutError), resolved);
	timer.unref?.();
	let abortListener;
	const abortPromise = abortCtrl.signal.aborted ? Promise.reject(abortCtrl.signal.reason ?? timeoutError) : new Promise((_, reject) => {
		abortListener = () => reject(abortCtrl.signal.reason ?? timeoutError);
		abortCtrl.signal.addEventListener("abort", abortListener, { once: true });
	});
	try {
		return await Promise.race([work(abortCtrl.signal), abortPromise]);
	} finally {
		clearTimeout(timer);
		if (abortListener) abortCtrl.signal.removeEventListener("abort", abortListener);
	}
}
//#endregion
export { respondInvalidParams as a, safeParseJson as c, shouldLogWs as d, summarizeAgentEventForWsLog as f, mergeGatewayTailscaleConfig as i, formatForLog as l, ensureGatewayStartupAuth as n, respondUnavailableOnNodeInvokeError as o, mergeGatewayAuthConfig as r, respondUnavailableOnThrow as s, withTimeout as t, logWs as u };
