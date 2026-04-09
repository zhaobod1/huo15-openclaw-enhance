import { g as DEFAULT_ACCOUNT_ID } from "../../session-key-BR3Z-ljs.js";
import { r as buildChannelConfigSchema } from "../../config-schema-BEuKmAWr.js";
import { r as IMessageConfigSchema } from "../../zod-schema.providers-core-COgcDZGS.js";
import { m as formatTrimmedAllowFromEntries } from "../../channel-config-helpers-CWYUF2eN.js";
import { o as getChatChannelMeta } from "../../core-D7mi2qmR.js";
import { t as createPluginRuntimeStore } from "../../runtime-store-Cwr8GGg4.js";
import { t as resolveChannelMediaMaxBytes } from "../../media-limits-bs8TnBXO.js";
import { t as PAIRING_APPROVED_MESSAGE } from "../../pairing-message-B1YYl-hh.js";
import { c as collectStatusIssuesFromLastError, r as buildComputedAccountStatusSnapshot } from "../../status-helpers-ChR3_7qO.js";
import "../../media-runtime-BfmVsgHe.js";
import "../../channel-status-45SWZx-g.js";
import { _ as normalizeIMessageMessagingTarget, g as looksLikeIMessageTargetId, h as chunkTextForOutbound, t as probeIMessage, v as resolveIMessageConfigAllowFrom, y as resolveIMessageConfigDefaultTo } from "../../probe-4P3jCy_Z.js";
import { n as resolveIMessageGroupToolPolicy, t as resolveIMessageGroupRequireMention } from "../../group-policy-MjFVlUPy.js";
import "../../config-api-DwoqLfdj.js";
import { n as sendMessageIMessage, t as monitorIMessageProvider } from "../../monitor-Z-vt8TV6.js";
//#region extensions/imessage/src/runtime.ts
const { setRuntime: setIMessageRuntime, getRuntime: getIMessageRuntime } = createPluginRuntimeStore("iMessage runtime not initialized");
//#endregion
export { DEFAULT_ACCOUNT_ID, IMessageConfigSchema, PAIRING_APPROVED_MESSAGE, buildChannelConfigSchema, buildComputedAccountStatusSnapshot, chunkTextForOutbound, collectStatusIssuesFromLastError, formatTrimmedAllowFromEntries, getChatChannelMeta, looksLikeIMessageTargetId, monitorIMessageProvider, normalizeIMessageMessagingTarget, probeIMessage, resolveChannelMediaMaxBytes, resolveIMessageConfigAllowFrom, resolveIMessageConfigDefaultTo, resolveIMessageGroupRequireMention, resolveIMessageGroupToolPolicy, sendMessageIMessage, setIMessageRuntime };
