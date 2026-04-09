import "./registry-DldQsVOb.js";
import "./links-BFfjc3N-.js";
import "./config-schema-BEuKmAWr.js";
import "./zod-schema.providers-core-COgcDZGS.js";
import "./common-B7pbdYUb.js";
import "./fetch-guard-Bl48brXk.js";
import "./fetch-DzQEmCkk.js";
import { n as resolveChannelGroupRequireMention } from "./group-policy-D1X7pmp3.js";
import "./setup-helpers-BiAtGxsL.js";
import "./channel-policy-DIVRdPsQ.js";
import "./dm-policy-shared-CWGTUVOf.js";
import "./setup-wizard-helpers-ecC16ic3.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import "./channel-pairing-DrJTvhRN.js";
import "./status-helpers-ChR3_7qO.js";
import "./webhook-ingress-BwX4VVop.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-B910pSi0.js";
import "./web-media-CwsGSbKF.js";
import "./outbound-media-55sTJsgk.js";
//#region src/plugin-sdk/googlechat.ts
function resolveGoogleChatGroupRequireMention(params) {
	return resolveChannelGroupRequireMention({
		cfg: params.cfg,
		channel: "googlechat",
		groupId: params.groupId,
		accountId: params.accountId
	});
}
const googlechatSetup = createOptionalChannelSetupSurface({
	channel: "googlechat",
	label: "Google Chat",
	npmSpec: "@openclaw/googlechat",
	docsPath: "/channels/googlechat"
});
const googlechatSetupAdapter = googlechatSetup.setupAdapter;
const googlechatSetupWizard = googlechatSetup.setupWizard;
//#endregion
export { googlechatSetupWizard as n, resolveGoogleChatGroupRequireMention as r, googlechatSetupAdapter as t };
