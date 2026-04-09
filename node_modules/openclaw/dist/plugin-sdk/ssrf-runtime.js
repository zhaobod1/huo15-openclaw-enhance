import { r as formatErrorMessage } from "../errors-Bs2h5H8p.js";
import { i as isPrivateOrLoopbackHost } from "../net-DwNAtbJy.js";
import { d as resolvePinnedHostnameWithPolicy, i as createPinnedDispatcher, r as closeDispatcher, s as isBlockedHostnameOrIp, u as resolvePinnedHostname } from "../ssrf-BWjc2mcC.js";
import { n as fetchWithSsrFGuard } from "../fetch-guard-Bl48brXk.js";
import { a as isPrivateNetworkOptInEnabled, c as ssrfPolicyFromAllowPrivateNetwork, l as ssrfPolicyFromDangerouslyAllowPrivateNetwork, n as buildHostnameAllowlistPolicyFromSuffixAllowlist, o as migrateLegacyFlatAllowPrivateNetworkAlias, r as hasLegacyFlatAllowPrivateNetworkAlias, t as assertHttpUrlTargetsPrivateNetwork, u as ssrfPolicyFromPrivateNetworkOptIn } from "../ssrf-policy-Cb9w9jMO.js";
import "../ssrf-runtime-DGIvmaoK.js";
export { assertHttpUrlTargetsPrivateNetwork, buildHostnameAllowlistPolicyFromSuffixAllowlist, closeDispatcher, createPinnedDispatcher, fetchWithSsrFGuard, formatErrorMessage, hasLegacyFlatAllowPrivateNetworkAlias, isBlockedHostnameOrIp, isPrivateNetworkOptInEnabled, isPrivateOrLoopbackHost, migrateLegacyFlatAllowPrivateNetworkAlias, resolvePinnedHostname, resolvePinnedHostnameWithPolicy, ssrfPolicyFromAllowPrivateNetwork, ssrfPolicyFromDangerouslyAllowPrivateNetwork, ssrfPolicyFromPrivateNetworkOptIn };
