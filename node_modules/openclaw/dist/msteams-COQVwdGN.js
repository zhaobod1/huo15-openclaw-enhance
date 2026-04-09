import "./utils-ms6h9yny.js";
import "./links-BFfjc3N-.js";
import "./config-schema-BEuKmAWr.js";
import "./zod-schema.providers-core-COgcDZGS.js";
import "./file-lock-pcxXyqiN.js";
import "./mime-MVyX1IzB.js";
import "./ssrf-BWjc2mcC.js";
import "./fetch-guard-Bl48brXk.js";
import "./tokens-wOGzQgw2.js";
import "./store-caT1P_9G.js";
import "./json-store-DmPegdww.js";
import "./dm-policy-shared-CWGTUVOf.js";
import "./history-ClGWPUk1.js";
import "./setup-wizard-helpers-ecC16ic3.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import "./channel-pairing-DrJTvhRN.js";
import "./status-helpers-ChR3_7qO.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-B910pSi0.js";
import "./inbound-reply-dispatch-rMXU9cNH.js";
import "./web-media-CwsGSbKF.js";
import "./outbound-media-55sTJsgk.js";
import "./ssrf-policy-Cb9w9jMO.js";
import "./session-envelope-oXR9OZTd.js";
//#region src/plugin-sdk/msteams.ts
const msteamsSetup = createOptionalChannelSetupSurface({
	channel: "msteams",
	label: "Microsoft Teams",
	npmSpec: "@openclaw/msteams",
	docsPath: "/channels/msteams"
});
const msteamsSetupWizard = msteamsSetup.setupWizard;
const msteamsSetupAdapter = msteamsSetup.setupAdapter;
//#endregion
export { msteamsSetupWizard as n, msteamsSetupAdapter as t };
