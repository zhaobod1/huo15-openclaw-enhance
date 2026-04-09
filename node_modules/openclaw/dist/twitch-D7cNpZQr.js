import "./links-BFfjc3N-.js";
import "./zod-schema.core-BITC5-JP.js";
import "./config-schema-BEuKmAWr.js";
import "./channel-reply-pipeline-DkatqAK5.js";
import { t as createOptionalChannelSetupSurface } from "./channel-setup-B910pSi0.js";
//#region src/plugin-sdk/twitch.ts
const twitchSetup = createOptionalChannelSetupSurface({
	channel: "twitch",
	label: "Twitch",
	npmSpec: "@openclaw/twitch"
});
const twitchSetupAdapter = twitchSetup.setupAdapter;
const twitchSetupWizard = twitchSetup.setupWizard;
//#endregion
export { twitchSetupWizard as n, twitchSetupAdapter as t };
