import { n as ensureAuthProfileStore } from "./store-HF_Z-jKz.js";
import { n as listProfilesForProvider } from "./profiles-DKQdaSwr.js";
import "./repair-C9rOoFG7.js";
import "./provider-env-vars-DtNkBToj.js";
import "./model-auth-markers-DBBQxeVp.js";
import { t as resolveEnvApiKey } from "./model-auth-env--oAvogL1.js";
import "./provider-auth-helpers-BNggjuMu.js";
import "./provider-auth-input-Cg2BMbzx.js";
import "./provider-api-key-auth-4XNvOlkz.js";
import { createHash, randomBytes } from "node:crypto";
//#region src/plugin-sdk/oauth-utils.ts
/** Encode a flat object as application/x-www-form-urlencoded form data. */
function toFormUrlEncoded(data) {
	return Object.entries(data).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
}
/** Generate a PKCE verifier/challenge pair suitable for OAuth authorization flows. */
function generatePkceVerifierChallenge() {
	const verifier = randomBytes(32).toString("base64url");
	return {
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url")
	};
}
//#endregion
//#region src/plugin-sdk/provider-auth.ts
function isProviderApiKeyConfigured(params) {
	if (resolveEnvApiKey(params.provider)?.apiKey) return true;
	const agentDir = params.agentDir?.trim();
	if (!agentDir) return false;
	return listProfilesForProvider(ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false }), params.provider).length > 0;
}
//#endregion
export { generatePkceVerifierChallenge as n, toFormUrlEncoded as r, isProviderApiKeyConfigured as t };
