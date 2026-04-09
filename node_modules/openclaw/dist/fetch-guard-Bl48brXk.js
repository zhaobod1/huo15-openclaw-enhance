import { a as logWarn } from "./logger-DC8YwEpM.js";
import { n as buildTimeoutAbortSignal } from "./fetch-timeout-BoLO0G3U.js";
import { r as hasProxyEnvConfigured } from "./proxy-env-Cx-kiLdZ.js";
import { t as retainSafeHeadersForCrossOriginRedirect$1 } from "./redirect-headers-BnYemaGU.js";
import { d as resolvePinnedHostnameWithPolicy, i as createPinnedDispatcher, p as loadUndiciRuntimeDeps, r as closeDispatcher, t as SsrFBlockedError } from "./ssrf-BWjc2mcC.js";
//#region src/infra/net/runtime-fetch.ts
function isMockedFetch(fetchImpl) {
	if (typeof fetchImpl !== "function") return false;
	return typeof fetchImpl.mock === "object";
}
async function fetchWithRuntimeDispatcher(input, init) {
	const runtimeFetch = loadUndiciRuntimeDeps().fetch;
	return await runtimeFetch(input, init);
}
//#endregion
//#region src/infra/net/fetch-guard.ts
const GUARDED_FETCH_MODE = {
	STRICT: "strict",
	TRUSTED_ENV_PROXY: "trusted_env_proxy"
};
const DEFAULT_MAX_REDIRECTS = 3;
function withStrictGuardedFetchMode(params) {
	return {
		...params,
		mode: GUARDED_FETCH_MODE.STRICT
	};
}
function withTrustedEnvProxyGuardedFetchMode(params) {
	return {
		...params,
		mode: GUARDED_FETCH_MODE.TRUSTED_ENV_PROXY
	};
}
function resolveGuardedFetchMode(params) {
	if (params.mode) return params.mode;
	if (params.proxy === "env" && params.dangerouslyAllowEnvProxyWithoutPinnedDns === true) return GUARDED_FETCH_MODE.TRUSTED_ENV_PROXY;
	return GUARDED_FETCH_MODE.STRICT;
}
function assertExplicitProxySupportsPinnedDns(url, dispatcherPolicy, pinDns) {
	if (pinDns !== false && dispatcherPolicy?.mode === "explicit-proxy" && url.protocol !== "https:") throw new Error("Explicit proxy SSRF pinning requires HTTPS targets; plain HTTP targets are not supported");
}
function createPolicyDispatcherWithoutPinnedDns(dispatcherPolicy) {
	if (!dispatcherPolicy) return null;
	const { Agent, EnvHttpProxyAgent, ProxyAgent } = loadUndiciRuntimeDeps();
	if (dispatcherPolicy.mode === "direct") return new Agent(dispatcherPolicy.connect ? { connect: { ...dispatcherPolicy.connect } } : {});
	if (dispatcherPolicy.mode === "env-proxy") return new EnvHttpProxyAgent({
		...dispatcherPolicy.connect ? { connect: { ...dispatcherPolicy.connect } } : {},
		...dispatcherPolicy.proxyTls ? { proxyTls: { ...dispatcherPolicy.proxyTls } } : {}
	});
	const proxyUrl = dispatcherPolicy.proxyUrl.trim();
	return dispatcherPolicy.proxyTls ? new ProxyAgent({
		uri: proxyUrl,
		requestTls: { ...dispatcherPolicy.proxyTls }
	}) : new ProxyAgent(proxyUrl);
}
async function assertExplicitProxyAllowed(dispatcherPolicy, lookupFn, policy) {
	if (!dispatcherPolicy || dispatcherPolicy.mode !== "explicit-proxy") return;
	let parsedProxyUrl;
	try {
		parsedProxyUrl = new URL(dispatcherPolicy.proxyUrl);
	} catch {
		throw new Error("Invalid explicit proxy URL");
	}
	if (!["http:", "https:"].includes(parsedProxyUrl.protocol)) throw new Error("Explicit proxy URL must use http or https");
	await resolvePinnedHostnameWithPolicy(parsedProxyUrl.hostname, {
		lookupFn,
		policy: dispatcherPolicy.allowPrivateProxy === true ? {
			...policy,
			allowPrivateNetwork: true
		} : policy
	});
}
function isRedirectStatus(status) {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
function isAmbientGlobalFetch(params) {
	return typeof params.fetchImpl === "function" && typeof params.globalFetch === "function" && params.fetchImpl === params.globalFetch;
}
function retainSafeHeadersForCrossOriginRedirectHeaders(headers) {
	return retainSafeHeadersForCrossOriginRedirect$1(headers);
}
function retainSafeHeadersForCrossOriginRedirect(init) {
	if (!init?.headers) return init;
	return {
		...init,
		headers: retainSafeHeadersForCrossOriginRedirect$1(init.headers)
	};
}
function dropBodyHeaders(headers) {
	if (!headers) return headers;
	const nextHeaders = new Headers(headers);
	nextHeaders.delete("content-encoding");
	nextHeaders.delete("content-language");
	nextHeaders.delete("content-length");
	nextHeaders.delete("content-location");
	nextHeaders.delete("content-type");
	nextHeaders.delete("transfer-encoding");
	return nextHeaders;
}
function rewriteRedirectInitForMethod(params) {
	const { init, status } = params;
	if (!init) return init;
	const currentMethod = init.method?.toUpperCase() ?? "GET";
	if (!(status === 303 ? currentMethod !== "GET" && currentMethod !== "HEAD" : (status === 301 || status === 302) && currentMethod === "POST")) return init;
	return {
		...init,
		method: "GET",
		body: void 0,
		headers: dropBodyHeaders(init.headers)
	};
}
async function fetchWithSsrFGuard(params) {
	const defaultFetch = params.fetchImpl ?? globalThis.fetch;
	if (!defaultFetch) throw new Error("fetch is not available");
	const maxRedirects = typeof params.maxRedirects === "number" && Number.isFinite(params.maxRedirects) ? Math.max(0, Math.floor(params.maxRedirects)) : DEFAULT_MAX_REDIRECTS;
	const mode = resolveGuardedFetchMode(params);
	const { signal, cleanup } = buildTimeoutAbortSignal({
		timeoutMs: params.timeoutMs,
		signal: params.signal
	});
	let released = false;
	const release = async (dispatcher) => {
		if (released) return;
		released = true;
		cleanup();
		await closeDispatcher(dispatcher ?? void 0);
	};
	const visited = new Set([params.url]);
	let currentUrl = params.url;
	let currentInit = params.init ? { ...params.init } : void 0;
	let redirectCount = 0;
	while (true) {
		let parsedUrl;
		try {
			parsedUrl = new URL(currentUrl);
		} catch {
			await release();
			throw new Error("Invalid URL: must be http or https");
		}
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			await release();
			throw new Error("Invalid URL: must be http or https");
		}
		let dispatcher = null;
		try {
			assertExplicitProxySupportsPinnedDns(parsedUrl, params.dispatcherPolicy, params.pinDns);
			await assertExplicitProxyAllowed(params.dispatcherPolicy, params.lookupFn, params.policy);
			const pinned = await resolvePinnedHostnameWithPolicy(parsedUrl.hostname, {
				lookupFn: params.lookupFn,
				policy: params.policy
			});
			if (mode === GUARDED_FETCH_MODE.TRUSTED_ENV_PROXY && hasProxyEnvConfigured()) {
				const { EnvHttpProxyAgent } = loadUndiciRuntimeDeps();
				dispatcher = new EnvHttpProxyAgent();
			} else if (params.pinDns === false) dispatcher = createPolicyDispatcherWithoutPinnedDns(params.dispatcherPolicy);
			else dispatcher = createPinnedDispatcher(pinned, params.dispatcherPolicy, params.policy);
			const init = {
				...currentInit ? { ...currentInit } : {},
				redirect: "manual",
				...dispatcher ? { dispatcher } : {},
				...signal ? { signal } : {}
			};
			const supportsDispatcherInit = params.fetchImpl !== void 0 && !isAmbientGlobalFetch({
				fetchImpl: params.fetchImpl,
				globalFetch: globalThis.fetch
			}) || isMockedFetch(defaultFetch);
			const response = Boolean(dispatcher) && !supportsDispatcherInit ? await fetchWithRuntimeDispatcher(parsedUrl.toString(), init) : await defaultFetch(parsedUrl.toString(), init);
			if (isRedirectStatus(response.status)) {
				const location = response.headers.get("location");
				if (!location) {
					await release(dispatcher);
					throw new Error(`Redirect missing location header (${response.status})`);
				}
				redirectCount += 1;
				if (redirectCount > maxRedirects) {
					await release(dispatcher);
					throw new Error(`Too many redirects (limit: ${maxRedirects})`);
				}
				const nextParsedUrl = new URL(location, parsedUrl);
				const nextUrl = nextParsedUrl.toString();
				if (visited.has(nextUrl)) {
					await release(dispatcher);
					throw new Error("Redirect loop detected");
				}
				currentInit = rewriteRedirectInitForMethod({
					init: currentInit,
					status: response.status
				});
				if (nextParsedUrl.origin !== parsedUrl.origin) currentInit = retainSafeHeadersForCrossOriginRedirect(currentInit);
				visited.add(nextUrl);
				response.body?.cancel();
				await closeDispatcher(dispatcher);
				currentUrl = nextUrl;
				continue;
			}
			return {
				response,
				finalUrl: currentUrl,
				release: async () => release(dispatcher)
			};
		} catch (err) {
			if (err instanceof SsrFBlockedError) logWarn(`security: blocked URL fetch (${params.auditContext ?? "url-fetch"}) target=${parsedUrl.origin}${parsedUrl.pathname} reason=${err.message}`);
			await release(dispatcher);
			throw err;
		}
	}
}
//#endregion
export { withTrustedEnvProxyGuardedFetchMode as a, withStrictGuardedFetchMode as i, fetchWithSsrFGuard as n, fetchWithRuntimeDispatcher as o, retainSafeHeadersForCrossOriginRedirectHeaders as r, GUARDED_FETCH_MODE as t };
