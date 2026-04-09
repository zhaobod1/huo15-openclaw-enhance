import { c as globalExpect } from "../../dist-KOGvtMrW.js";
import { o as normalizeWhatsAppTarget$1, t as isWhatsAppGroupJid$1 } from "../../normalize-target-Rq2SUNBo.js";
import { i as whatsappCommandPolicy$1, n as isLegacyGroupSessionKey$1, r as resolveLegacyGroupSessionKey$1, t as canonicalizeLegacySessionKey$1 } from "../../session-contract-CcjFxIC0.js";
import { t as resolveWhatsAppRuntimeGroupPolicy$1 } from "../../runtime-group-policy-wKpchRiL.js";
import { t as __testing } from "../../access-control-DRxlDyXY.js";
//#region extensions/whatsapp/src/outbound-test-support.ts
function createWhatsAppPollFixture$1() {
	return {
		cfg: { marker: "resolved-cfg" },
		poll: {
			question: "Lunch?",
			options: ["Pizza", "Sushi"],
			maxSelections: 1
		},
		to: "+1555",
		accountId: "work"
	};
}
function expectWhatsAppPollSent$1(sendPollWhatsApp, params) {
	globalExpect(sendPollWhatsApp).toHaveBeenCalledWith(params.to ?? "+1555", params.poll, {
		verbose: false,
		accountId: params.accountId ?? "work",
		cfg: params.cfg
	});
}
//#endregion
//#region extensions/whatsapp/contract-api.ts
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
const unsupportedSecretRefSurfacePatterns = ["channels.whatsapp.creds.json", "channels.whatsapp.accounts.*.creds.json"];
const canonicalizeLegacySessionKey = canonicalizeLegacySessionKey$1;
const createWhatsAppPollFixture = createWhatsAppPollFixture$1;
const expectWhatsAppPollSent = expectWhatsAppPollSent$1;
const isLegacyGroupSessionKey = isLegacyGroupSessionKey$1;
const isWhatsAppGroupJid = isWhatsAppGroupJid$1;
const normalizeWhatsAppTarget = normalizeWhatsAppTarget$1;
const resolveLegacyGroupSessionKey = resolveLegacyGroupSessionKey$1;
const resolveWhatsAppRuntimeGroupPolicy = resolveWhatsAppRuntimeGroupPolicy$1;
const whatsappAccessControlTesting = __testing;
const whatsappCommandPolicy = whatsappCommandPolicy$1;
function collectUnsupportedSecretRefConfigCandidates(raw) {
	if (!isRecord(raw)) return [];
	if (!isRecord(raw.channels) || !isRecord(raw.channels.whatsapp)) return [];
	const candidates = [];
	const whatsapp = raw.channels.whatsapp;
	const creds = isRecord(whatsapp.creds) ? whatsapp.creds : null;
	if (creds) candidates.push({
		path: "channels.whatsapp.creds.json",
		value: creds.json
	});
	const accounts = isRecord(whatsapp.accounts) ? whatsapp.accounts : null;
	if (!accounts) return candidates;
	for (const [accountId, account] of Object.entries(accounts)) {
		if (!isRecord(account) || !isRecord(account.creds)) continue;
		candidates.push({
			path: `channels.whatsapp.accounts.${accountId}.creds.json`,
			value: account.creds.json
		});
	}
	return candidates;
}
//#endregion
export { canonicalizeLegacySessionKey, collectUnsupportedSecretRefConfigCandidates, createWhatsAppPollFixture, expectWhatsAppPollSent, isLegacyGroupSessionKey, isWhatsAppGroupJid, normalizeWhatsAppTarget, resolveLegacyGroupSessionKey, resolveWhatsAppRuntimeGroupPolicy, unsupportedSecretRefSurfacePatterns, whatsappAccessControlTesting, whatsappCommandPolicy };
