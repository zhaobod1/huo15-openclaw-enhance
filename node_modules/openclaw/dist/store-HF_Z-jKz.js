import { m as resolveUserPath } from "./utils-ms6h9yny.js";
import { t as createSubsystemLogger } from "./subsystem-CVf5iEWk.js";
import { g as resolveOAuthPath } from "./paths-yyDPxM31.js";
import { i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { i as withFileLock } from "./file-lock-pcxXyqiN.js";
import "./file-lock-CUt_hrsH.js";
import { n as saveJsonFile, t as loadJsonFile } from "./json-file-1PGlTqjr.js";
import { t as resolveOpenClawAgentDir } from "./agent-paths-BQP0rGzW.js";
import fs from "node:fs";
import path from "node:path";
//#region src/agents/auth-profiles/constants.ts
const AUTH_PROFILE_FILENAME = "auth-profiles.json";
const LEGACY_AUTH_FILENAME = "auth.json";
const CODEX_CLI_PROFILE_ID = "openai-codex:codex-cli";
const AUTH_STORE_LOCK_OPTIONS = {
	retries: {
		retries: 10,
		factor: 2,
		minTimeout: 100,
		maxTimeout: 1e4,
		randomize: true
	},
	stale: 3e4
};
const log = createSubsystemLogger("agents/auth-profiles");
//#endregion
//#region src/agents/auth-profiles/paths.ts
function resolveAuthStorePath(agentDir) {
	const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
	return path.join(resolved, AUTH_PROFILE_FILENAME);
}
function resolveLegacyAuthStorePath(agentDir) {
	const resolved = resolveUserPath(agentDir ?? resolveOpenClawAgentDir());
	return path.join(resolved, LEGACY_AUTH_FILENAME);
}
function resolveAuthStorePathForDisplay(agentDir) {
	const pathname = resolveAuthStorePath(agentDir);
	return pathname.startsWith("~") ? pathname : resolveUserPath(pathname);
}
function ensureAuthStoreFile(pathname) {
	if (fs.existsSync(pathname)) return;
	saveJsonFile(pathname, {
		version: 1,
		profiles: {}
	});
}
//#endregion
//#region src/agents/auth-profiles/store.ts
const AUTH_PROFILE_TYPES = new Set([
	"api_key",
	"oauth",
	"token"
]);
const runtimeAuthStoreSnapshots = /* @__PURE__ */ new Map();
const loadedAuthStoreCache = /* @__PURE__ */ new Map();
const AUTH_STORE_CACHE_TTL_MS = 900 * 1e3;
function resolveRuntimeStoreKey(agentDir) {
	return resolveAuthStorePath(agentDir);
}
function cloneAuthProfileStore(store) {
	return structuredClone(store);
}
function resolveRuntimeAuthProfileStore(agentDir) {
	if (runtimeAuthStoreSnapshots.size === 0) return null;
	const mainKey = resolveRuntimeStoreKey(void 0);
	const requestedKey = resolveRuntimeStoreKey(agentDir);
	const mainStore = runtimeAuthStoreSnapshots.get(mainKey);
	const requestedStore = runtimeAuthStoreSnapshots.get(requestedKey);
	if (!agentDir || requestedKey === mainKey) {
		if (!mainStore) return null;
		return cloneAuthProfileStore(mainStore);
	}
	if (mainStore && requestedStore) return mergeAuthProfileStores(cloneAuthProfileStore(mainStore), cloneAuthProfileStore(requestedStore));
	if (requestedStore) return cloneAuthProfileStore(requestedStore);
	if (mainStore) return cloneAuthProfileStore(mainStore);
	return null;
}
function replaceRuntimeAuthProfileStoreSnapshots(entries) {
	runtimeAuthStoreSnapshots.clear();
	for (const entry of entries) runtimeAuthStoreSnapshots.set(resolveRuntimeStoreKey(entry.agentDir), cloneAuthProfileStore(entry.store));
}
function clearRuntimeAuthProfileStoreSnapshots() {
	runtimeAuthStoreSnapshots.clear();
	loadedAuthStoreCache.clear();
}
function readAuthStoreMtimeMs(authPath) {
	try {
		return fs.statSync(authPath).mtimeMs;
	} catch {
		return null;
	}
}
function readCachedAuthProfileStore(authPath, mtimeMs) {
	const cached = loadedAuthStoreCache.get(authPath);
	if (!cached || cached.mtimeMs !== mtimeMs) return null;
	if (Date.now() - cached.syncedAtMs >= AUTH_STORE_CACHE_TTL_MS) return null;
	return cloneAuthProfileStore(cached.store);
}
function writeCachedAuthProfileStore(authPath, mtimeMs, store) {
	loadedAuthStoreCache.set(authPath, {
		mtimeMs,
		syncedAtMs: Date.now(),
		store: cloneAuthProfileStore(store)
	});
}
function normalizeSecretBackedField(params) {
	const value = params.entry[params.valueField];
	if (value == null || typeof value === "string") return;
	const ref = coerceSecretRef(value);
	if (ref && !coerceSecretRef(params.entry[params.refField])) params.entry[params.refField] = ref;
	delete params.entry[params.valueField];
}
async function updateAuthProfileStoreWithLock(params) {
	const authPath = resolveAuthStorePath(params.agentDir);
	ensureAuthStoreFile(authPath);
	try {
		return await withFileLock(authPath, AUTH_STORE_LOCK_OPTIONS, async () => {
			const store = loadAuthProfileStoreForAgent(params.agentDir);
			if (params.updater(store)) saveAuthProfileStore(store, params.agentDir);
			return store;
		});
	} catch {
		return null;
	}
}
/**
* Normalise a raw auth-profiles.json credential entry.
*
* The official format uses `type` and (for api_key credentials) `key`.
* A common mistake — caused by the similarity with the `openclaw.json`
* `auth.profiles` section which uses `mode` — is to write `mode` instead of
* `type` and `apiKey` instead of `key`.  Accept both spellings so users don't
* silently lose their credentials.
*/
function normalizeRawCredentialEntry(raw) {
	const entry = { ...raw };
	if (!("type" in entry) && typeof entry["mode"] === "string") entry["type"] = entry["mode"];
	if (!("key" in entry) && typeof entry["apiKey"] === "string") entry["key"] = entry["apiKey"];
	normalizeSecretBackedField({
		entry,
		valueField: "key",
		refField: "keyRef"
	});
	normalizeSecretBackedField({
		entry,
		valueField: "token",
		refField: "tokenRef"
	});
	return entry;
}
function parseCredentialEntry(raw, fallbackProvider) {
	if (!raw || typeof raw !== "object") return {
		ok: false,
		reason: "non_object"
	};
	const typed = normalizeRawCredentialEntry(raw);
	if (!AUTH_PROFILE_TYPES.has(typed.type)) return {
		ok: false,
		reason: "invalid_type"
	};
	const provider = typed.provider ?? fallbackProvider;
	if (typeof provider !== "string" || provider.trim().length === 0) return {
		ok: false,
		reason: "missing_provider"
	};
	return {
		ok: true,
		credential: {
			...typed,
			provider
		}
	};
}
function warnRejectedCredentialEntries(source, rejected) {
	if (rejected.length === 0) return;
	const reasons = rejected.reduce((acc, current) => {
		acc[current.reason] = (acc[current.reason] ?? 0) + 1;
		return acc;
	}, {});
	log.warn("ignored invalid auth profile entries during store load", {
		source,
		dropped: rejected.length,
		reasons,
		keys: rejected.slice(0, 10).map((entry) => entry.key)
	});
}
function coerceLegacyStore(raw) {
	if (!raw || typeof raw !== "object") return null;
	const record = raw;
	if ("profiles" in record) return null;
	const entries = {};
	const rejected = [];
	for (const [key, value] of Object.entries(record)) {
		const parsed = parseCredentialEntry(value, key);
		if (!parsed.ok) {
			rejected.push({
				key,
				reason: parsed.reason
			});
			continue;
		}
		entries[key] = parsed.credential;
	}
	warnRejectedCredentialEntries("auth.json", rejected);
	return Object.keys(entries).length > 0 ? entries : null;
}
function coerceAuthStore(raw) {
	if (!raw || typeof raw !== "object") return null;
	const record = raw;
	if (!record.profiles || typeof record.profiles !== "object") return null;
	const profiles = record.profiles;
	const normalized = {};
	const rejected = [];
	for (const [key, value] of Object.entries(profiles)) {
		const parsed = parseCredentialEntry(value);
		if (!parsed.ok) {
			rejected.push({
				key,
				reason: parsed.reason
			});
			continue;
		}
		normalized[key] = parsed.credential;
	}
	warnRejectedCredentialEntries("auth-profiles.json", rejected);
	const order = record.order && typeof record.order === "object" ? Object.entries(record.order).reduce((acc, [provider, value]) => {
		if (!Array.isArray(value)) return acc;
		const list = value.map((entry) => typeof entry === "string" ? entry.trim() : "").filter(Boolean);
		if (list.length === 0) return acc;
		acc[provider] = list;
		return acc;
	}, {}) : void 0;
	return {
		version: Number(record.version ?? 1),
		profiles: normalized,
		order,
		lastGood: record.lastGood && typeof record.lastGood === "object" ? record.lastGood : void 0,
		usageStats: record.usageStats && typeof record.usageStats === "object" ? record.usageStats : void 0
	};
}
function mergeRecord(base, override) {
	if (!base && !override) return;
	if (!base) return { ...override };
	if (!override) return { ...base };
	return {
		...base,
		...override
	};
}
function mergeAuthProfileStores(base, override) {
	if (Object.keys(override.profiles).length === 0 && !override.order && !override.lastGood && !override.usageStats) return base;
	return {
		version: Math.max(base.version, override.version ?? base.version),
		profiles: {
			...base.profiles,
			...override.profiles
		},
		order: mergeRecord(base.order, override.order),
		lastGood: mergeRecord(base.lastGood, override.lastGood),
		usageStats: mergeRecord(base.usageStats, override.usageStats)
	};
}
function buildPersistedAuthProfileStore(store) {
	return {
		version: 1,
		profiles: Object.fromEntries(Object.entries(store.profiles).flatMap(([profileId, credential]) => {
			if (credential.type === "api_key" && credential.keyRef && credential.key !== void 0) {
				const sanitized = { ...credential };
				delete sanitized.key;
				return [[profileId, sanitized]];
			}
			if (credential.type === "token" && credential.tokenRef && credential.token !== void 0) {
				const sanitized = { ...credential };
				delete sanitized.token;
				return [[profileId, sanitized]];
			}
			return [[profileId, credential]];
		})),
		order: store.order ?? void 0,
		lastGood: store.lastGood ?? void 0,
		usageStats: store.usageStats ?? void 0
	};
}
function mergeOAuthFileIntoStore(store) {
	const oauthRaw = loadJsonFile(resolveOAuthPath());
	if (!oauthRaw || typeof oauthRaw !== "object") return false;
	const oauthEntries = oauthRaw;
	let mutated = false;
	for (const [provider, creds] of Object.entries(oauthEntries)) {
		if (!creds || typeof creds !== "object") continue;
		const profileId = `${provider}:default`;
		if (store.profiles[profileId]) continue;
		store.profiles[profileId] = {
			type: "oauth",
			provider,
			...creds
		};
		mutated = true;
	}
	return mutated;
}
function applyLegacyStore(store, legacy) {
	for (const [provider, cred] of Object.entries(legacy)) {
		const profileId = `${provider}:default`;
		if (cred.type === "api_key") {
			store.profiles[profileId] = {
				type: "api_key",
				provider: String(cred.provider ?? provider),
				key: cred.key,
				...cred.email ? { email: cred.email } : {}
			};
			continue;
		}
		if (cred.type === "token") {
			store.profiles[profileId] = {
				type: "token",
				provider: String(cred.provider ?? provider),
				token: cred.token,
				...typeof cred.expires === "number" ? { expires: cred.expires } : {},
				...cred.email ? { email: cred.email } : {}
			};
			continue;
		}
		store.profiles[profileId] = {
			type: "oauth",
			provider: String(cred.provider ?? provider),
			access: cred.access,
			refresh: cred.refresh,
			expires: cred.expires,
			...cred.enterpriseUrl ? { enterpriseUrl: cred.enterpriseUrl } : {},
			...cred.projectId ? { projectId: cred.projectId } : {},
			...cred.accountId ? { accountId: cred.accountId } : {},
			...cred.email ? { email: cred.email } : {}
		};
	}
}
function loadCoercedStore(authPath) {
	return coerceAuthStore(loadJsonFile(authPath));
}
function loadAuthProfileStore() {
	const asStore = loadCoercedStore(resolveAuthStorePath());
	if (asStore) return asStore;
	const legacy = coerceLegacyStore(loadJsonFile(resolveLegacyAuthStorePath()));
	if (legacy) {
		const store = {
			version: 1,
			profiles: {}
		};
		applyLegacyStore(store, legacy);
		return store;
	}
	return {
		version: 1,
		profiles: {}
	};
}
function loadAuthProfileStoreForAgent(agentDir, options) {
	const readOnly = options?.readOnly === true;
	const authPath = resolveAuthStorePath(agentDir);
	if (!readOnly) {
		const cached = readCachedAuthProfileStore(authPath, readAuthStoreMtimeMs(authPath));
		if (cached) return cached;
	}
	const asStore = loadCoercedStore(authPath);
	if (asStore) {
		if (!readOnly) writeCachedAuthProfileStore(authPath, readAuthStoreMtimeMs(authPath), asStore);
		return asStore;
	}
	if (agentDir && !readOnly) {
		const mainStore = coerceAuthStore(loadJsonFile(resolveAuthStorePath()));
		if (mainStore && Object.keys(mainStore.profiles).length > 0) {
			saveJsonFile(authPath, mainStore);
			log.info("inherited auth-profiles from main agent", { agentDir });
			writeCachedAuthProfileStore(authPath, readAuthStoreMtimeMs(authPath), mainStore);
			return mainStore;
		}
	}
	const legacy = coerceLegacyStore(loadJsonFile(resolveLegacyAuthStorePath(agentDir)));
	const store = {
		version: 1,
		profiles: {}
	};
	if (legacy) applyLegacyStore(store, legacy);
	const mergedOAuth = mergeOAuthFileIntoStore(store);
	const forceReadOnly = process.env.OPENCLAW_AUTH_STORE_READONLY === "1";
	const shouldWrite = !readOnly && !forceReadOnly && (legacy !== null || mergedOAuth);
	if (shouldWrite) saveAuthProfileStore(store, agentDir);
	if (shouldWrite && legacy !== null) {
		const legacyPath = resolveLegacyAuthStorePath(agentDir);
		try {
			fs.unlinkSync(legacyPath);
		} catch (err) {
			if (err?.code !== "ENOENT") log.warn("failed to delete legacy auth.json after migration", {
				err,
				legacyPath
			});
		}
	}
	if (!readOnly) writeCachedAuthProfileStore(authPath, readAuthStoreMtimeMs(authPath), store);
	return store;
}
function loadAuthProfileStoreForRuntime(agentDir, options) {
	const store = loadAuthProfileStoreForAgent(agentDir, options);
	const authPath = resolveAuthStorePath(agentDir);
	const mainAuthPath = resolveAuthStorePath();
	if (!agentDir || authPath === mainAuthPath) return store;
	return mergeAuthProfileStores(loadAuthProfileStoreForAgent(void 0, options), store);
}
function loadAuthProfileStoreForSecretsRuntime(agentDir) {
	return loadAuthProfileStoreForRuntime(agentDir, {
		readOnly: true,
		allowKeychainPrompt: false
	});
}
function ensureAuthProfileStore(agentDir, options) {
	const runtimeStore = resolveRuntimeAuthProfileStore(agentDir);
	if (runtimeStore) return runtimeStore;
	const store = loadAuthProfileStoreForAgent(agentDir, options);
	const authPath = resolveAuthStorePath(agentDir);
	const mainAuthPath = resolveAuthStorePath();
	if (!agentDir || authPath === mainAuthPath) return store;
	return mergeAuthProfileStores(loadAuthProfileStoreForAgent(void 0, options), store);
}
function saveAuthProfileStore(store, agentDir) {
	const authPath = resolveAuthStorePath(agentDir);
	const runtimeKey = resolveRuntimeStoreKey(agentDir);
	saveJsonFile(authPath, buildPersistedAuthProfileStore(store));
	const runtimeStore = cloneAuthProfileStore(store);
	writeCachedAuthProfileStore(authPath, readAuthStoreMtimeMs(authPath), runtimeStore);
	if (runtimeAuthStoreSnapshots.has(runtimeKey)) runtimeAuthStoreSnapshots.set(runtimeKey, cloneAuthProfileStore(runtimeStore));
}
//#endregion
export { loadAuthProfileStoreForSecretsRuntime as a, updateAuthProfileStoreWithLock as c, resolveAuthStorePathForDisplay as d, AUTH_STORE_LOCK_OPTIONS as f, loadAuthProfileStoreForRuntime as i, ensureAuthStoreFile as l, log as m, ensureAuthProfileStore as n, replaceRuntimeAuthProfileStoreSnapshots as o, CODEX_CLI_PROFILE_ID as p, loadAuthProfileStore as r, saveAuthProfileStore as s, clearRuntimeAuthProfileStoreSnapshots as t, resolveAuthStorePath as u };
