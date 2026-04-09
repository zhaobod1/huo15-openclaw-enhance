import { c as isPrivateIpAddress, d as resolvePinnedHostnameWithPolicy, s as isBlockedHostnameOrIp } from "./ssrf-BWjc2mcC.js";
//#region src/plugin-sdk/ssrf-policy.ts
function asRecord(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function isPrivateNetworkOptInEnabled(input) {
	if (input === true) return true;
	const record = asRecord(input);
	if (!record) return false;
	const network = asRecord(record.network);
	return record.allowPrivateNetwork === true || record.dangerouslyAllowPrivateNetwork === true || network?.allowPrivateNetwork === true || network?.dangerouslyAllowPrivateNetwork === true;
}
function ssrfPolicyFromPrivateNetworkOptIn(input) {
	return isPrivateNetworkOptInEnabled(input) ? { allowPrivateNetwork: true } : void 0;
}
function ssrfPolicyFromDangerouslyAllowPrivateNetwork(dangerouslyAllowPrivateNetwork) {
	return ssrfPolicyFromPrivateNetworkOptIn(dangerouslyAllowPrivateNetwork);
}
function hasLegacyFlatAllowPrivateNetworkAlias(value) {
	const entry = asRecord(value);
	return Boolean(entry && Object.prototype.hasOwnProperty.call(entry, "allowPrivateNetwork"));
}
function migrateLegacyFlatAllowPrivateNetworkAlias(params) {
	if (!hasLegacyFlatAllowPrivateNetworkAlias(params.entry)) return {
		entry: params.entry,
		changed: false
	};
	const legacyAllowPrivateNetwork = params.entry.allowPrivateNetwork;
	const currentNetworkRecord = asRecord(params.entry.network);
	const currentNetwork = currentNetworkRecord ? { ...currentNetworkRecord } : {};
	const currentDangerousAllowPrivateNetwork = currentNetwork.dangerouslyAllowPrivateNetwork;
	let resolvedDangerousAllowPrivateNetwork = currentDangerousAllowPrivateNetwork;
	if (typeof currentDangerousAllowPrivateNetwork === "boolean") resolvedDangerousAllowPrivateNetwork = currentDangerousAllowPrivateNetwork;
	else if (typeof legacyAllowPrivateNetwork === "boolean") resolvedDangerousAllowPrivateNetwork = legacyAllowPrivateNetwork;
	else if (currentDangerousAllowPrivateNetwork === void 0) resolvedDangerousAllowPrivateNetwork = legacyAllowPrivateNetwork;
	delete currentNetwork.dangerouslyAllowPrivateNetwork;
	if (resolvedDangerousAllowPrivateNetwork !== void 0) currentNetwork.dangerouslyAllowPrivateNetwork = resolvedDangerousAllowPrivateNetwork;
	const nextEntry = { ...params.entry };
	delete nextEntry.allowPrivateNetwork;
	if (Object.keys(currentNetwork).length > 0) nextEntry.network = currentNetwork;
	else delete nextEntry.network;
	params.changes.push(`Moved ${params.pathPrefix}.allowPrivateNetwork → ${params.pathPrefix}.network.dangerouslyAllowPrivateNetwork (${String(resolvedDangerousAllowPrivateNetwork)}).`);
	return {
		entry: nextEntry,
		changed: true
	};
}
function ssrfPolicyFromAllowPrivateNetwork(allowPrivateNetwork) {
	return ssrfPolicyFromDangerouslyAllowPrivateNetwork(allowPrivateNetwork);
}
async function assertHttpUrlTargetsPrivateNetwork(url, params = {}) {
	const parsed = new URL(url);
	if (parsed.protocol !== "http:") return;
	const errorMessage = params.errorMessage ?? "HTTP URL must target a trusted private/internal host";
	const { hostname } = parsed;
	if (!hostname) throw new Error(errorMessage);
	if (isBlockedHostnameOrIp(hostname)) return;
	if ((typeof params.dangerouslyAllowPrivateNetwork === "boolean" ? params.dangerouslyAllowPrivateNetwork : params.allowPrivateNetwork) !== true) throw new Error(errorMessage);
	if (!(await resolvePinnedHostnameWithPolicy(hostname, {
		lookupFn: params.lookupFn,
		policy: ssrfPolicyFromDangerouslyAllowPrivateNetwork(true)
	})).addresses.every((address) => isPrivateIpAddress(address))) throw new Error(errorMessage);
}
function normalizeHostnameSuffix(value) {
	const trimmed = value.trim().toLowerCase();
	if (!trimmed) return "";
	if (trimmed === "*" || trimmed === "*.") return "*";
	return trimmed.replace(/^\*\.?/, "").replace(/^\.+/, "").replace(/\.+$/, "");
}
function isHostnameAllowedBySuffixAllowlist(hostname, allowlist) {
	if (allowlist.includes("*")) return true;
	const normalized = hostname.toLowerCase();
	return allowlist.some((entry) => normalized === entry || normalized.endsWith(`.${entry}`));
}
/** Normalize suffix-style host allowlists into lowercase canonical entries with wildcard collapse. */
function normalizeHostnameSuffixAllowlist(input, defaults) {
	const source = input && input.length > 0 ? input : defaults;
	if (!source || source.length === 0) return [];
	const normalized = source.map(normalizeHostnameSuffix).filter(Boolean);
	if (normalized.includes("*")) return ["*"];
	return Array.from(new Set(normalized));
}
/** Check whether a URL is HTTPS and its hostname matches the normalized suffix allowlist. */
function isHttpsUrlAllowedByHostnameSuffixAllowlist(url, allowlist) {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") return false;
		return isHostnameAllowedBySuffixAllowlist(parsed.hostname, allowlist);
	} catch {
		return false;
	}
}
/**
* Converts suffix-style host allowlists (for example "example.com") into SSRF
* hostname allowlist patterns used by the shared fetch guard.
*
* Suffix semantics:
* - "example.com" allows "example.com" and "*.example.com"
* - "*" disables hostname allowlist restrictions
*/
function buildHostnameAllowlistPolicyFromSuffixAllowlist(allowHosts) {
	const normalizedAllowHosts = normalizeHostnameSuffixAllowlist(allowHosts);
	if (normalizedAllowHosts.length === 0) return;
	const patterns = /* @__PURE__ */ new Set();
	for (const normalized of normalizedAllowHosts) {
		if (normalized === "*") return;
		patterns.add(normalized);
		patterns.add(`*.${normalized}`);
	}
	if (patterns.size === 0) return;
	return { hostnameAllowlist: Array.from(patterns) };
}
//#endregion
export { isPrivateNetworkOptInEnabled as a, ssrfPolicyFromAllowPrivateNetwork as c, isHttpsUrlAllowedByHostnameSuffixAllowlist as i, ssrfPolicyFromDangerouslyAllowPrivateNetwork as l, buildHostnameAllowlistPolicyFromSuffixAllowlist as n, migrateLegacyFlatAllowPrivateNetworkAlias as o, hasLegacyFlatAllowPrivateNetworkAlias as r, normalizeHostnameSuffixAllowlist as s, assertHttpUrlTargetsPrivateNetwork as t, ssrfPolicyFromPrivateNetworkOptIn as u };
