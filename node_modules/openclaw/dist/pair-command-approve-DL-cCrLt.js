import { n as approveDevicePairing } from "./device-pairing-eajdmrdw.js";
import "./api-DRymHYl2.js";
import { n as formatPendingRequests } from "./notify-DRcdbmP9.js";
//#region extensions/device-pair/pair-command-approve.ts
function buildMultiplePendingApprovalReply(pending) {
	return { text: `${formatPendingRequests(pending)}\n\nMultiple pending requests found. Approve one explicitly:
/pair approve <requestId>
Or approve the most recent:
/pair approve latest` };
}
function selectPendingApprovalRequest(params) {
	if (params.pending.length === 0) return { reply: { text: "No pending device pairing requests." } };
	if (!params.requested) return params.pending.length === 1 ? { pending: params.pending[0] } : { reply: buildMultiplePendingApprovalReply(params.pending) };
	if (params.requested.toLowerCase() === "latest") return { pending: [...params.pending].toSorted((a, b) => (b.ts ?? 0) - (a.ts ?? 0))[0] };
	return {
		pending: params.pending.find((entry) => entry.requestId === params.requested),
		reply: void 0
	};
}
function formatApprovedPairingReply(approved) {
	const label = approved.device.displayName?.trim() || approved.device.deviceId;
	const platform = approved.device.platform?.trim();
	return { text: `✅ Paired ${label}${platform ? ` (${platform})` : ""}.` };
}
async function approvePendingPairingRequest(params) {
	const approved = params.callerScopes === void 0 ? await approveDevicePairing(params.requestId) : await approveDevicePairing(params.requestId, { callerScopes: params.callerScopes });
	if (!approved) return { text: "Pairing request not found." };
	if (approved.status === "forbidden") return { text: `⚠️ This command requires ${approved.missingScope} to approve this pairing request.` };
	return formatApprovedPairingReply(approved);
}
//#endregion
export { selectPendingApprovalRequest as n, approvePendingPairingRequest as t };
