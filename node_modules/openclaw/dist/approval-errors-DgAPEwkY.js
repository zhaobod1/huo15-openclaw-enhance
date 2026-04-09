//#region src/infra/approval-errors.ts
const INVALID_REQUEST = "INVALID_REQUEST";
const APPROVAL_NOT_FOUND = "APPROVAL_NOT_FOUND";
function readErrorCode(value) {
	return typeof value === "string" && value.trim() ? value : null;
}
function readApprovalNotFoundDetailsReason(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const reason = value.reason;
	return typeof reason === "string" && reason.trim() ? reason : null;
}
function isApprovalNotFoundError(err) {
	if (!(err instanceof Error)) return false;
	const gatewayCode = readErrorCode(err.gatewayCode);
	if (gatewayCode === APPROVAL_NOT_FOUND) return true;
	const detailsReason = readApprovalNotFoundDetailsReason(err.details);
	if (gatewayCode === INVALID_REQUEST && detailsReason === APPROVAL_NOT_FOUND) return true;
	return /unknown or expired approval id/i.test(err.message);
}
//#endregion
export { isApprovalNotFoundError as t };
