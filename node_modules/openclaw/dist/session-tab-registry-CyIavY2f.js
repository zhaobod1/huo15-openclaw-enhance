import { t as fetchBrowserJson } from "./client-fetch-Dm_m6F1E.js";
//#region extensions/browser/src/browser/client.ts
function buildProfileQuery(profile) {
	return profile ? `?profile=${encodeURIComponent(profile)}` : "";
}
function withBaseUrl(baseUrl, path) {
	const trimmed = baseUrl?.trim();
	if (!trimmed) return path;
	return `${trimmed.replace(/\/$/, "")}${path}`;
}
async function browserStatus(baseUrl, opts) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/${buildProfileQuery(opts?.profile)}`), { timeoutMs: 1500 });
}
async function browserProfiles(baseUrl) {
	return (await fetchBrowserJson(withBaseUrl(baseUrl, `/profiles`), { timeoutMs: 3e3 })).profiles ?? [];
}
async function browserStart(baseUrl, opts) {
	await fetchBrowserJson(withBaseUrl(baseUrl, `/start${buildProfileQuery(opts?.profile)}`), {
		method: "POST",
		timeoutMs: 15e3
	});
}
async function browserStop(baseUrl, opts) {
	await fetchBrowserJson(withBaseUrl(baseUrl, `/stop${buildProfileQuery(opts?.profile)}`), {
		method: "POST",
		timeoutMs: 15e3
	});
}
async function browserResetProfile(baseUrl, opts) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/reset-profile${buildProfileQuery(opts?.profile)}`), {
		method: "POST",
		timeoutMs: 2e4
	});
}
async function browserCreateProfile(baseUrl, opts) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/profiles/create`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: opts.name,
			color: opts.color,
			cdpUrl: opts.cdpUrl,
			userDataDir: opts.userDataDir,
			driver: opts.driver
		}),
		timeoutMs: 1e4
	});
}
async function browserDeleteProfile(baseUrl, profile) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/profiles/${encodeURIComponent(profile)}`), {
		method: "DELETE",
		timeoutMs: 2e4
	});
}
async function browserTabs(baseUrl, opts) {
	return (await fetchBrowserJson(withBaseUrl(baseUrl, `/tabs${buildProfileQuery(opts?.profile)}`), { timeoutMs: 3e3 })).tabs ?? [];
}
async function browserOpenTab(baseUrl, url, opts) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/tabs/open${buildProfileQuery(opts?.profile)}`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
		timeoutMs: 15e3
	});
}
async function browserFocusTab(baseUrl, targetId, opts) {
	await fetchBrowserJson(withBaseUrl(baseUrl, `/tabs/focus${buildProfileQuery(opts?.profile)}`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ targetId }),
		timeoutMs: 5e3
	});
}
async function browserCloseTab(baseUrl, targetId, opts) {
	const q = buildProfileQuery(opts?.profile);
	await fetchBrowserJson(withBaseUrl(baseUrl, `/tabs/${encodeURIComponent(targetId)}${q}`), {
		method: "DELETE",
		timeoutMs: 5e3
	});
}
async function browserTabAction(baseUrl, opts) {
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/tabs/action${buildProfileQuery(opts.profile)}`), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			action: opts.action,
			index: opts.index
		}),
		timeoutMs: 1e4
	});
}
async function browserSnapshot(baseUrl, opts) {
	const q = new URLSearchParams();
	if (opts.format) q.set("format", opts.format);
	if (opts.targetId) q.set("targetId", opts.targetId);
	if (typeof opts.limit === "number") q.set("limit", String(opts.limit));
	if (typeof opts.maxChars === "number" && Number.isFinite(opts.maxChars)) q.set("maxChars", String(opts.maxChars));
	if (opts.refs === "aria" || opts.refs === "role") q.set("refs", opts.refs);
	if (typeof opts.interactive === "boolean") q.set("interactive", String(opts.interactive));
	if (typeof opts.compact === "boolean") q.set("compact", String(opts.compact));
	if (typeof opts.depth === "number" && Number.isFinite(opts.depth)) q.set("depth", String(opts.depth));
	if (opts.selector?.trim()) q.set("selector", opts.selector.trim());
	if (opts.frame?.trim()) q.set("frame", opts.frame.trim());
	if (opts.labels === true) q.set("labels", "1");
	if (opts.mode) q.set("mode", opts.mode);
	if (opts.profile) q.set("profile", opts.profile);
	return await fetchBrowserJson(withBaseUrl(baseUrl, `/snapshot?${q.toString()}`), { timeoutMs: 2e4 });
}
//#endregion
//#region extensions/browser/src/browser/session-tab-registry.ts
const trackedTabsBySession = /* @__PURE__ */ new Map();
function normalizeSessionKey(raw) {
	return raw.trim().toLowerCase();
}
function normalizeTargetId(raw) {
	return raw.trim();
}
function normalizeProfile(raw) {
	if (!raw) return;
	const trimmed = raw.trim();
	return trimmed ? trimmed.toLowerCase() : void 0;
}
function normalizeBaseUrl(raw) {
	if (!raw) return;
	const trimmed = raw.trim();
	return trimmed ? trimmed : void 0;
}
function toTrackedTabId(params) {
	return `${params.targetId}\u0000${params.baseUrl ?? ""}\u0000${params.profile ?? ""}`;
}
function isIgnorableCloseError(err) {
	const message = String(err).toLowerCase();
	return message.includes("tab not found") || message.includes("target closed") || message.includes("target not found") || message.includes("no such target");
}
function trackSessionBrowserTab(params) {
	const sessionKeyRaw = params.sessionKey?.trim();
	const targetIdRaw = params.targetId?.trim();
	if (!sessionKeyRaw || !targetIdRaw) return;
	const sessionKey = normalizeSessionKey(sessionKeyRaw);
	const tracked = {
		sessionKey,
		targetId: normalizeTargetId(targetIdRaw),
		baseUrl: normalizeBaseUrl(params.baseUrl),
		profile: normalizeProfile(params.profile),
		trackedAt: Date.now()
	};
	const trackedId = toTrackedTabId(tracked);
	let trackedForSession = trackedTabsBySession.get(sessionKey);
	if (!trackedForSession) {
		trackedForSession = /* @__PURE__ */ new Map();
		trackedTabsBySession.set(sessionKey, trackedForSession);
	}
	trackedForSession.set(trackedId, tracked);
}
function untrackSessionBrowserTab(params) {
	const sessionKeyRaw = params.sessionKey?.trim();
	const targetIdRaw = params.targetId?.trim();
	if (!sessionKeyRaw || !targetIdRaw) return;
	const sessionKey = normalizeSessionKey(sessionKeyRaw);
	const trackedForSession = trackedTabsBySession.get(sessionKey);
	if (!trackedForSession) return;
	const trackedId = toTrackedTabId({
		targetId: normalizeTargetId(targetIdRaw),
		baseUrl: normalizeBaseUrl(params.baseUrl),
		profile: normalizeProfile(params.profile)
	});
	trackedForSession.delete(trackedId);
	if (trackedForSession.size === 0) trackedTabsBySession.delete(sessionKey);
}
function takeTrackedTabsForSessionKeys(sessionKeys) {
	const uniqueSessionKeys = /* @__PURE__ */ new Set();
	for (const key of sessionKeys) {
		if (!key?.trim()) continue;
		uniqueSessionKeys.add(normalizeSessionKey(key));
	}
	if (uniqueSessionKeys.size === 0) return [];
	const seenTrackedIds = /* @__PURE__ */ new Set();
	const tabs = [];
	for (const sessionKey of uniqueSessionKeys) {
		const trackedForSession = trackedTabsBySession.get(sessionKey);
		if (!trackedForSession || trackedForSession.size === 0) continue;
		trackedTabsBySession.delete(sessionKey);
		for (const tracked of trackedForSession.values()) {
			const trackedId = toTrackedTabId(tracked);
			if (seenTrackedIds.has(trackedId)) continue;
			seenTrackedIds.add(trackedId);
			tabs.push(tracked);
		}
	}
	return tabs;
}
async function closeTrackedBrowserTabsForSessions(params) {
	const tabs = takeTrackedTabsForSessionKeys(params.sessionKeys);
	if (tabs.length === 0) return 0;
	const closeTab = params.closeTab ?? (async (tab) => {
		await browserCloseTab(tab.baseUrl, tab.targetId, { profile: tab.profile });
	});
	let closed = 0;
	for (const tab of tabs) try {
		await closeTab({
			targetId: tab.targetId,
			baseUrl: tab.baseUrl,
			profile: tab.profile
		});
		closed += 1;
	} catch (err) {
		if (!isIgnorableCloseError(err)) params.onWarn?.(`failed to close tracked browser tab ${tab.targetId}: ${String(err)}`);
	}
	return closed;
}
//#endregion
export { browserCreateProfile as a, browserOpenTab as c, browserSnapshot as d, browserStart as f, browserTabs as g, browserTabAction as h, browserCloseTab as i, browserProfiles as l, browserStop as m, trackSessionBrowserTab as n, browserDeleteProfile as o, browserStatus as p, untrackSessionBrowserTab as r, browserFocusTab as s, closeTrackedBrowserTabsForSessions as t, browserResetProfile as u };
