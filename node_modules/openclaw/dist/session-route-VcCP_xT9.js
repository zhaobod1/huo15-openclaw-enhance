import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { s as resolveMergedAccountConfig, t as createAccountListHelpers } from "./account-helpers-A6tF0W1f.js";
import { t as buildChannelOutboundSessionRoute } from "./core-D7mi2qmR.js";
import "./account-resolution-CIVX3Yfx.js";
//#region extensions/zalouser/src/accounts.ts
let zalouserAccountsRuntimePromise;
async function loadZalouserAccountsRuntime() {
	zalouserAccountsRuntimePromise ??= import("./accounts.runtime-DfTKHTlC.js");
	return await zalouserAccountsRuntimePromise;
}
const { listAccountIds: listZalouserAccountIds, resolveDefaultAccountId: resolveDefaultZalouserAccountId } = createAccountListHelpers("zalouser");
function mergeZalouserAccountConfig(cfg, accountId) {
	const merged = resolveMergedAccountConfig({
		channelConfig: cfg.channels?.zalouser,
		accounts: (cfg.channels?.zalouser)?.accounts,
		accountId,
		omitKeys: ["defaultAccount"]
	});
	return {
		...merged,
		groupPolicy: merged.groupPolicy ?? "allowlist"
	};
}
function resolveProfile(config, accountId) {
	if (config.profile?.trim()) return config.profile.trim();
	if (process.env.ZALOUSER_PROFILE?.trim()) return process.env.ZALOUSER_PROFILE.trim();
	if (process.env.ZCA_PROFILE?.trim()) return process.env.ZCA_PROFILE.trim();
	if (accountId !== "default") return accountId;
	return "default";
}
function resolveZalouserAccountBase(params) {
	const accountId = normalizeAccountId(params.accountId ?? resolveDefaultZalouserAccountId(params.cfg));
	const baseEnabled = (params.cfg.channels?.zalouser)?.enabled !== false;
	const merged = mergeZalouserAccountConfig(params.cfg, accountId);
	return {
		accountId,
		enabled: baseEnabled && merged.enabled !== false,
		merged,
		profile: resolveProfile(merged, accountId)
	};
}
function resolveZalouserAccountSync(params) {
	const { accountId, enabled, merged, profile } = resolveZalouserAccountBase(params);
	return {
		accountId,
		name: merged.name?.trim() || void 0,
		enabled,
		profile,
		authenticated: false,
		config: merged
	};
}
async function getZcaUserInfo(profile) {
	const info = await (await loadZalouserAccountsRuntime()).getZaloUserInfo(profile);
	if (!info) return null;
	return {
		userId: info.userId,
		displayName: info.displayName
	};
}
async function checkZcaAuthenticated(profile) {
	return await (await loadZalouserAccountsRuntime()).checkZaloAuthenticated(profile);
}
//#endregion
//#region extensions/zalouser/src/session-route.ts
function stripZalouserTargetPrefix(raw) {
	return raw.trim().replace(/^(zalouser|zlu):/i, "").trim();
}
function normalizeZalouserTarget(raw) {
	const trimmed = stripZalouserTargetPrefix(raw);
	if (!trimmed) return;
	const lower = trimmed.toLowerCase();
	if (lower.startsWith("group:")) {
		const id = trimmed.slice(6).trim();
		return id ? `group:${id}` : void 0;
	}
	if (lower.startsWith("g:")) {
		const id = trimmed.slice(2).trim();
		return id ? `group:${id}` : void 0;
	}
	if (lower.startsWith("user:")) {
		const id = trimmed.slice(5).trim();
		return id ? `user:${id}` : void 0;
	}
	if (lower.startsWith("dm:")) {
		const id = trimmed.slice(3).trim();
		return id ? `user:${id}` : void 0;
	}
	if (lower.startsWith("u:")) {
		const id = trimmed.slice(2).trim();
		return id ? `user:${id}` : void 0;
	}
	if (/^g-\S+$/i.test(trimmed)) return `group:${trimmed}`;
	if (/^u-\S+$/i.test(trimmed)) return `user:${trimmed}`;
	return trimmed;
}
function parseZalouserOutboundTarget(raw) {
	const normalized = normalizeZalouserTarget(raw);
	if (!normalized) throw new Error("Zalouser target is required");
	const lowered = normalized.toLowerCase();
	if (lowered.startsWith("group:")) {
		const threadId = normalized.slice(6).trim();
		if (!threadId) throw new Error("Zalouser group target is missing group id");
		return {
			threadId,
			isGroup: true
		};
	}
	if (lowered.startsWith("user:")) {
		const threadId = normalized.slice(5).trim();
		if (!threadId) throw new Error("Zalouser user target is missing user id");
		return {
			threadId,
			isGroup: false
		};
	}
	return {
		threadId: normalized,
		isGroup: false
	};
}
function parseZalouserDirectoryGroupId(raw) {
	const normalized = normalizeZalouserTarget(raw);
	if (!normalized) throw new Error("Zalouser group target is required");
	const lowered = normalized.toLowerCase();
	if (lowered.startsWith("group:")) {
		const groupId = normalized.slice(6).trim();
		if (!groupId) throw new Error("Zalouser group target is missing group id");
		return groupId;
	}
	if (lowered.startsWith("user:")) throw new Error("Zalouser group members lookup requires a group target (group:<id>)");
	return normalized;
}
function resolveZalouserOutboundSessionRoute(params) {
	const normalized = normalizeZalouserTarget(params.target);
	if (!normalized) return null;
	const isGroup = normalized.toLowerCase().startsWith("group:");
	const peerId = normalized.replace(/^(group|user):/i, "").trim();
	return buildChannelOutboundSessionRoute({
		cfg: params.cfg,
		agentId: params.agentId,
		channel: "zalouser",
		accountId: params.accountId,
		peer: {
			kind: isGroup ? "group" : "direct",
			id: peerId
		},
		chatType: isGroup ? "group" : "direct",
		from: isGroup ? `zalouser:group:${peerId}` : `zalouser:${peerId}`,
		to: `zalouser:${peerId}`
	});
}
//#endregion
export { checkZcaAuthenticated as a, resolveDefaultZalouserAccountId as c, resolveZalouserOutboundSessionRoute as i, resolveZalouserAccountSync as l, parseZalouserDirectoryGroupId as n, getZcaUserInfo as o, parseZalouserOutboundTarget as r, listZalouserAccountIds as s, normalizeZalouserTarget as t };
