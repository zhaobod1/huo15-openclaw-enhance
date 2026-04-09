import { t as formatDocsLink } from "../links-BFfjc3N-.js";
import { _ as normalizeAccountId, g as DEFAULT_ACCOUNT_ID } from "../session-key-BR3Z-ljs.js";
import { t as createDedupeCache } from "../dedupe-CB5IJsQ1.js";
import { r as buildChannelConfigSchema } from "../config-schema-BEuKmAWr.js";
import { s as isBlockedHostnameOrIp, t as SsrFBlockedError } from "../ssrf-BWjc2mcC.js";
import { n as fetchWithSsrFGuard } from "../fetch-guard-Bl48brXk.js";
import { t as createLoggerBackedRuntime } from "../runtime-logger-BnKnijEj.js";
import "../runtime-C9er17zX.js";
import { n as emptyPluginConfigSchema } from "../config-schema-BTVf9GZX.js";
import { l as patchScopedAccountConfig, t as applyAccountNameToChannelSection } from "../setup-helpers-BiAtGxsL.js";
import { t as createChannelReplyPipeline } from "../channel-reply-pipeline-DkatqAK5.js";
import { r as buildComputedAccountStatusSnapshot } from "../status-helpers-ChR3_7qO.js";
import { t as createOptionalChannelSetupSurface } from "../channel-setup-B910pSi0.js";
//#region src/plugin-sdk/tlon.ts
const tlonSetup = createOptionalChannelSetupSurface({
	channel: "tlon",
	label: "Tlon",
	npmSpec: "@openclaw/tlon",
	docsPath: "/channels/tlon"
});
const tlonSetupAdapter = tlonSetup.setupAdapter;
const tlonSetupWizard = tlonSetup.setupWizard;
//#endregion
export { DEFAULT_ACCOUNT_ID, SsrFBlockedError, applyAccountNameToChannelSection, buildChannelConfigSchema, buildComputedAccountStatusSnapshot, createChannelReplyPipeline, createDedupeCache, createLoggerBackedRuntime, emptyPluginConfigSchema, fetchWithSsrFGuard, formatDocsLink, isBlockedHostnameOrIp, normalizeAccountId, patchScopedAccountConfig, tlonSetupAdapter, tlonSetupWizard };
