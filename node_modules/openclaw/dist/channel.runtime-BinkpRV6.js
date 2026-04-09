import { t as detectBinary } from "./detect-binary-B5tovLqI.js";
import { t as resolveOutboundSendDep } from "./send-deps-CVbk0lDS.js";
import { t as resolveChannelMediaMaxBytes } from "./media-limits-bs8TnBXO.js";
import { J as setSetupChannelEnabled } from "./setup-wizard-helpers-ecC16ic3.js";
import { t as PAIRING_APPROVED_MESSAGE } from "./pairing-message-B1YYl-hh.js";
import { l as createDetectedBinaryStatus } from "./setup-wizard-proxy-CnO9z2dq.js";
import "./setup-Dp8bIdbL.js";
import "./setup-tools-DC-2q-4o.js";
import "./outbound-runtime-BSC4z6CP.js";
import { s as resolveIMessageAccount } from "./media-contract-C8ZK0sub.js";
import { t as probeIMessage } from "./probe-4P3jCy_Z.js";
import { a as imessageDmPolicy, i as imessageCompletionNote, n as createIMessageCliPathTextInput, s as imessageSetupStatusBase, t as IMESSAGE_LEGACY_OUTBOUND_SEND_DEP_KEYS } from "./outbound-send-deps-B50ET6q4.js";
import { n as sendMessageIMessage, t as monitorIMessageProvider } from "./monitor-Z-vt8TV6.js";
//#region extensions/imessage/src/setup-surface.ts
const channel = "imessage";
const imessageSetupWizard = {
	channel,
	status: createDetectedBinaryStatus({
		channelLabel: "iMessage",
		binaryLabel: "imsg",
		configuredLabel: imessageSetupStatusBase.configuredLabel,
		unconfiguredLabel: imessageSetupStatusBase.unconfiguredLabel,
		configuredHint: imessageSetupStatusBase.configuredHint,
		unconfiguredHint: imessageSetupStatusBase.unconfiguredHint,
		configuredScore: imessageSetupStatusBase.configuredScore,
		unconfiguredScore: imessageSetupStatusBase.unconfiguredScore,
		resolveConfigured: imessageSetupStatusBase.resolveConfigured,
		resolveBinaryPath: ({ cfg, accountId }) => resolveIMessageAccount({
			cfg,
			accountId
		}).config.cliPath ?? "imsg",
		detectBinary
	}),
	credentials: [],
	textInputs: [createIMessageCliPathTextInput(async ({ currentValue }) => {
		return !await detectBinary(currentValue ?? "imsg");
	})],
	completionNote: imessageCompletionNote,
	dmPolicy: imessageDmPolicy,
	disable: (cfg) => setSetupChannelEnabled(cfg, channel, false)
};
//#endregion
//#region extensions/imessage/src/channel.runtime.ts
async function sendIMessageOutbound(params) {
	const send = resolveOutboundSendDep(params.deps, "imessage", { legacyKeys: IMESSAGE_LEGACY_OUTBOUND_SEND_DEP_KEYS }) ?? sendMessageIMessage;
	const maxBytes = resolveChannelMediaMaxBytes({
		cfg: params.cfg,
		resolveChannelLimitMb: ({ cfg, accountId }) => cfg.channels?.imessage?.accounts?.[accountId]?.mediaMaxMb ?? cfg.channels?.imessage?.mediaMaxMb,
		accountId: params.accountId
	});
	return await send(params.to, params.text, {
		config: params.cfg,
		...params.mediaUrl ? { mediaUrl: params.mediaUrl } : {},
		...params.mediaLocalRoots?.length ? { mediaLocalRoots: params.mediaLocalRoots } : {},
		maxBytes,
		accountId: params.accountId ?? void 0,
		replyToId: params.replyToId ?? void 0
	});
}
async function notifyIMessageApproval(id) {
	await sendMessageIMessage(id, PAIRING_APPROVED_MESSAGE);
}
async function probeIMessageAccount(params) {
	return await probeIMessage(params?.timeoutMs, {
		cliPath: params?.cliPath,
		dbPath: params?.dbPath
	});
}
async function startIMessageGatewayAccount(ctx) {
	const account = ctx.account;
	const cliPath = account.config.cliPath?.trim() || "imsg";
	const dbPath = account.config.dbPath?.trim();
	ctx.setStatus({
		accountId: account.accountId,
		cliPath,
		dbPath: dbPath ?? null
	});
	ctx.log?.info?.(`[${account.accountId}] starting provider (${cliPath}${dbPath ? ` db=${dbPath}` : ""})`);
	return await monitorIMessageProvider({
		accountId: account.accountId,
		config: ctx.cfg,
		runtime: ctx.runtime,
		abortSignal: ctx.abortSignal
	});
}
//#endregion
export { imessageSetupWizard, notifyIMessageApproval, probeIMessageAccount, sendIMessageOutbound, startIMessageGatewayAccount };
