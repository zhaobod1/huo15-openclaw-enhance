//#region src/plugin-sdk/approval-approvers.ts
function dedupeDefined(values) {
	const resolved = /* @__PURE__ */ new Set();
	for (const value of values) {
		if (!value) continue;
		resolved.add(value);
	}
	return [...resolved];
}
function resolveApprovalApprovers(params) {
	const explicit = dedupeDefined((params.explicit ?? []).map((entry) => params.normalizeApprover(entry)));
	if (explicit.length > 0) return explicit;
	return dedupeDefined([
		...(params.allowFrom ?? []).map((entry) => params.normalizeApprover(entry)),
		...(params.extraAllowFrom ?? []).map((entry) => params.normalizeApprover(entry)),
		...params.defaultTo?.trim() ? [(params.normalizeDefaultTo ?? ((value) => params.normalizeApprover(value)))(params.defaultTo.trim())] : []
	]);
}
//#endregion
//#region src/plugin-sdk/approval-auth-helpers.ts
function defaultNormalizeSenderId(value) {
	return value.trim() || void 0;
}
function createResolvedApproverActionAuthAdapter(params) {
	const normalizeSenderId = params.normalizeSenderId ?? defaultNormalizeSenderId;
	return { authorizeActorAction({ cfg, accountId, senderId, approvalKind }) {
		const approvers = params.resolveApprovers({
			cfg,
			accountId
		});
		if (approvers.length === 0) return { authorized: true };
		const normalizedSenderId = senderId ? normalizeSenderId(senderId) : void 0;
		if (normalizedSenderId && approvers.includes(normalizedSenderId)) return { authorized: true };
		return {
			authorized: false,
			reason: `❌ You are not authorized to approve ${approvalKind} requests on ${params.channelLabel}.`
		};
	} };
}
//#endregion
export { resolveApprovalApprovers as n, createResolvedApproverActionAuthAdapter as t };
