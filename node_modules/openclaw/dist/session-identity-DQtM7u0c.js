//#region src/acp/runtime/errors.ts
const ACP_ERROR_CODES = [
	"ACP_BACKEND_MISSING",
	"ACP_BACKEND_UNAVAILABLE",
	"ACP_BACKEND_UNSUPPORTED_CONTROL",
	"ACP_DISPATCH_DISABLED",
	"ACP_INVALID_RUNTIME_OPTION",
	"ACP_SESSION_INIT_FAILED",
	"ACP_TURN_FAILED"
];
var AcpRuntimeError = class extends Error {
	constructor(code, message, options) {
		super(message);
		this.name = "AcpRuntimeError";
		this.code = code;
		this.cause = options?.cause;
	}
};
function isAcpRuntimeError(value) {
	return value instanceof AcpRuntimeError;
}
function toAcpRuntimeError(params) {
	if (params.error instanceof AcpRuntimeError) return params.error;
	if (params.error instanceof Error) return new AcpRuntimeError(params.fallbackCode, params.error.message, { cause: params.error });
	return new AcpRuntimeError(params.fallbackCode, params.fallbackMessage, { cause: params.error });
}
async function withAcpRuntimeErrorBoundary(params) {
	try {
		return await params.run();
	} catch (error) {
		throw toAcpRuntimeError({
			error,
			fallbackCode: params.fallbackCode,
			fallbackMessage: params.fallbackMessage
		});
	}
}
//#endregion
//#region src/acp/runtime/session-identity.ts
function normalizeText(value) {
	if (typeof value !== "string") return;
	return value.trim() || void 0;
}
function normalizeIdentityState(value) {
	if (value !== "pending" && value !== "resolved") return;
	return value;
}
function normalizeIdentitySource(value) {
	if (value !== "ensure" && value !== "status" && value !== "event") return;
	return value;
}
function normalizeIdentity(identity) {
	if (!identity) return;
	const state = normalizeIdentityState(identity.state);
	const source = normalizeIdentitySource(identity.source);
	const acpxRecordId = normalizeText(identity.acpxRecordId);
	const acpxSessionId = normalizeText(identity.acpxSessionId);
	const agentSessionId = normalizeText(identity.agentSessionId);
	const lastUpdatedAt = typeof identity.lastUpdatedAt === "number" && Number.isFinite(identity.lastUpdatedAt) ? identity.lastUpdatedAt : void 0;
	if (!state && !source && !Boolean(acpxRecordId || acpxSessionId || agentSessionId) && lastUpdatedAt === void 0) return;
	return {
		state: state ?? (Boolean(acpxSessionId || agentSessionId) ? "resolved" : "pending"),
		...acpxRecordId ? { acpxRecordId } : {},
		...acpxSessionId ? { acpxSessionId } : {},
		...agentSessionId ? { agentSessionId } : {},
		source: source ?? "status",
		lastUpdatedAt: lastUpdatedAt ?? Date.now()
	};
}
function resolveSessionIdentityFromMeta(meta) {
	if (!meta) return;
	return normalizeIdentity(meta.identity);
}
function resolveRuntimeResumeSessionId(identity) {
	if (!identity) return;
	return normalizeText(identity.agentSessionId) ?? normalizeText(identity.acpxSessionId);
}
function isSessionIdentityPending(identity) {
	if (!identity) return true;
	return identity.state === "pending";
}
function identityEquals(left, right) {
	const a = normalizeIdentity(left);
	const b = normalizeIdentity(right);
	if (!a && !b) return true;
	if (!a || !b) return false;
	return a.state === b.state && a.acpxRecordId === b.acpxRecordId && a.acpxSessionId === b.acpxSessionId && a.agentSessionId === b.agentSessionId && a.source === b.source;
}
function mergeSessionIdentity(params) {
	const current = normalizeIdentity(params.current);
	const incoming = normalizeIdentity(params.incoming);
	if (!current) {
		if (!incoming) return;
		return {
			...incoming,
			lastUpdatedAt: params.now
		};
	}
	if (!incoming) return current;
	const currentResolved = current.state === "resolved";
	const incomingResolved = incoming.state === "resolved";
	const allowIncomingValue = !currentResolved || incomingResolved;
	const nextRecordId = allowIncomingValue && incoming.acpxRecordId ? incoming.acpxRecordId : current.acpxRecordId;
	const nextAcpxSessionId = allowIncomingValue && incoming.acpxSessionId ? incoming.acpxSessionId : current.acpxSessionId;
	const nextAgentSessionId = allowIncomingValue && incoming.agentSessionId ? incoming.agentSessionId : current.agentSessionId;
	const nextState = Boolean(nextAcpxSessionId || nextAgentSessionId) ? "resolved" : currentResolved ? "resolved" : incoming.state;
	const nextSource = allowIncomingValue ? incoming.source : current.source;
	return {
		state: nextState,
		...nextRecordId ? { acpxRecordId: nextRecordId } : {},
		...nextAcpxSessionId ? { acpxSessionId: nextAcpxSessionId } : {},
		...nextAgentSessionId ? { agentSessionId: nextAgentSessionId } : {},
		source: nextSource,
		lastUpdatedAt: params.now
	};
}
function createIdentityFromEnsure(params) {
	const acpxRecordId = normalizeText(params.handle.acpxRecordId);
	const acpxSessionId = normalizeText(params.handle.backendSessionId);
	const agentSessionId = normalizeText(params.handle.agentSessionId);
	if (!acpxRecordId && !acpxSessionId && !agentSessionId) return;
	return {
		state: "pending",
		...acpxRecordId ? { acpxRecordId } : {},
		...acpxSessionId ? { acpxSessionId } : {},
		...agentSessionId ? { agentSessionId } : {},
		source: "ensure",
		lastUpdatedAt: params.now
	};
}
function createIdentityFromHandleEvent(params) {
	const acpxRecordId = normalizeText(params.handle.acpxRecordId);
	const acpxSessionId = normalizeText(params.handle.backendSessionId);
	const agentSessionId = normalizeText(params.handle.agentSessionId);
	if (!acpxRecordId && !acpxSessionId && !agentSessionId) return;
	return {
		state: agentSessionId ? "resolved" : "pending",
		...acpxRecordId ? { acpxRecordId } : {},
		...acpxSessionId ? { acpxSessionId } : {},
		...agentSessionId ? { agentSessionId } : {},
		source: "event",
		lastUpdatedAt: params.now
	};
}
function createIdentityFromStatus(params) {
	if (!params.status) return;
	const details = params.status.details;
	const acpxRecordId = normalizeText(params.status.acpxRecordId) ?? normalizeText(details?.acpxRecordId);
	const acpxSessionId = normalizeText(params.status.backendSessionId) ?? normalizeText(details?.backendSessionId) ?? normalizeText(details?.acpxSessionId);
	const agentSessionId = normalizeText(params.status.agentSessionId) ?? normalizeText(details?.agentSessionId);
	if (!acpxRecordId && !acpxSessionId && !agentSessionId) return;
	return {
		state: Boolean(acpxSessionId || agentSessionId) ? "resolved" : "pending",
		...acpxRecordId ? { acpxRecordId } : {},
		...acpxSessionId ? { acpxSessionId } : {},
		...agentSessionId ? { agentSessionId } : {},
		source: "status",
		lastUpdatedAt: params.now
	};
}
function resolveRuntimeHandleIdentifiersFromIdentity(identity) {
	if (!identity) return {};
	return {
		...identity.acpxSessionId ? { backendSessionId: identity.acpxSessionId } : {},
		...identity.agentSessionId ? { agentSessionId: identity.agentSessionId } : {}
	};
}
//#endregion
export { isSessionIdentityPending as a, resolveRuntimeResumeSessionId as c, AcpRuntimeError as d, isAcpRuntimeError as f, identityEquals as i, resolveSessionIdentityFromMeta as l, withAcpRuntimeErrorBoundary as m, createIdentityFromHandleEvent as n, mergeSessionIdentity as o, toAcpRuntimeError as p, createIdentityFromStatus as r, resolveRuntimeHandleIdentifiersFromIdentity as s, createIdentityFromEnsure as t, ACP_ERROR_CODES as u };
