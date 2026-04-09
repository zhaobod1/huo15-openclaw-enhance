import "./zod-schema.core-BITC5-JP.js";
import "./config-schema-BEuKmAWr.js";
import "./ssrf-BWjc2mcC.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import "./status-helpers-ChR3_7qO.js";
import "./webhook-memory-guards-DJIij6K3.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-B910pSi0.js";
import "./direct-dm-FXOCN0sA.js";
//#region src/plugin-sdk/nostr.ts
const nostrSetup = createOptionalChannelSetupSurface({
	channel: "nostr",
	label: "Nostr",
	npmSpec: "@openclaw/nostr",
	docsPath: "/channels/nostr"
});
const nostrSetupAdapter = nostrSetup.setupAdapter;
const nostrSetupWizard = nostrSetup.setupWizard;
//#endregion
export { nostrSetupWizard as n, nostrSetupAdapter as t };
