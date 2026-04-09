import { d as resolvePinnedHostnameWithPolicy, i as createPinnedDispatcher, r as closeDispatcher } from "../../ssrf-BWjc2mcC.js";
import { n as writeJsonFileAtomically } from "../../json-store-DmPegdww.js";
import { n as formatZonedTimestamp } from "../../format-datetime-mjlYeCZJ.js";
import { c as ssrfPolicyFromAllowPrivateNetwork, l as ssrfPolicyFromDangerouslyAllowPrivateNetwork, t as assertHttpUrlTargetsPrivateNetwork } from "../../ssrf-policy-Cb9w9jMO.js";
import "../../ssrf-runtime-DGIvmaoK.js";
import { a as resolveMatrixDefaultOrOnlyAccountId, c as resolveMatrixEnvAccountToken, i as resolveMatrixChannelConfig, l as resolveMatrixAccountStringValues, n as requiresExplicitMatrixDefaultAccount, o as getMatrixScopedEnvVarNames, r as resolveConfiguredMatrixAccountIds, s as listMatrixEnvAccountIds, t as findMatrixAccountEntry } from "../../account-selection-BneLmcra.js";
import { n as setMatrixRuntime } from "../../runtime-CQ_wJXn2.js";
import { a as resolveMatrixCredentialsPath, c as resolveMatrixLegacyFlatStoreRoot, i as resolveMatrixCredentialsFilename, l as sanitizeMatrixPathSegment, n as resolveMatrixAccountStorageRoot, o as resolveMatrixHomeserverKey, r as resolveMatrixCredentialsDir, s as resolveMatrixLegacyFlatStoragePaths, t as hashMatrixAccessToken } from "../../storage-paths-Cih0M06F.js";
import { f as setMatrixThreadBindingMaxAgeBySessionKey, u as setMatrixThreadBindingIdleTimeoutBySessionKey } from "../../thread-bindings-shared-xF9Fm7l4.js";
import { n as ensureMatrixSdkInstalled, r as isMatrixSdkAvailable } from "../../deps-BEf6znsR.js";
//#region extensions/matrix/runtime-api.ts
function chunkTextForOutbound(text, limit) {
	const chunks = [];
	let remaining = text;
	while (remaining.length > limit) {
		const window = remaining.slice(0, limit);
		const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
		const breakAt = splitAt > 0 ? splitAt : limit;
		chunks.push(remaining.slice(0, breakAt).trimEnd());
		remaining = remaining.slice(breakAt).trimStart();
	}
	if (remaining.length > 0 || text.length === 0) chunks.push(remaining);
	return chunks;
}
//#endregion
export { assertHttpUrlTargetsPrivateNetwork, chunkTextForOutbound, closeDispatcher, createPinnedDispatcher, ensureMatrixSdkInstalled, findMatrixAccountEntry, formatZonedTimestamp, getMatrixScopedEnvVarNames, hashMatrixAccessToken, isMatrixSdkAvailable, listMatrixEnvAccountIds, requiresExplicitMatrixDefaultAccount, resolveConfiguredMatrixAccountIds, resolveMatrixAccountStorageRoot, resolveMatrixAccountStringValues, resolveMatrixChannelConfig, resolveMatrixCredentialsDir, resolveMatrixCredentialsFilename, resolveMatrixCredentialsPath, resolveMatrixDefaultOrOnlyAccountId, resolveMatrixEnvAccountToken, resolveMatrixHomeserverKey, resolveMatrixLegacyFlatStoragePaths, resolveMatrixLegacyFlatStoreRoot, resolvePinnedHostnameWithPolicy, sanitizeMatrixPathSegment, setMatrixRuntime, setMatrixThreadBindingIdleTimeoutBySessionKey, setMatrixThreadBindingMaxAgeBySessionKey, ssrfPolicyFromAllowPrivateNetwork, ssrfPolicyFromDangerouslyAllowPrivateNetwork, writeJsonFileAtomically };
