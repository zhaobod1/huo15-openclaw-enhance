import "./message-channel-DnQkETjb.js";
import "./bindings-CzEur-oN.js";
import "./resolve-route-CavttejP.js";
import "./base-session-key-2NJCUHEq.js";
//#region src/infra/outbound/thread-id.ts
function normalizeOutboundThreadId(value) {
	if (value == null) return;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) return;
		return String(Math.trunc(value));
	}
	const trimmed = value.trim();
	return trimmed ? trimmed : void 0;
}
//#endregion
export { normalizeOutboundThreadId as t };
