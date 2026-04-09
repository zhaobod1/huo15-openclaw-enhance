import "./utils-ms6h9yny.js";
import "./links-BFfjc3N-.js";
import "./setup-helpers-BiAtGxsL.js";
import "./setup-wizard-helpers-ecC16ic3.js";
import "./setup-binary-DV0A1Tl2.js";
import "./setup-group-access-Cq1zeHF4.js";
import "./setup-wizard-proxy-CnO9z2dq.js";
//#region src/plugin-sdk/resolution-notes.ts
/** Format a short note that separates successfully resolved targets from unresolved passthrough values. */
function formatResolvedUnresolvedNote(params) {
	if (params.resolved.length === 0 && params.unresolved.length === 0) return;
	return [params.resolved.length > 0 ? `Resolved: ${params.resolved.join(", ")}` : void 0, params.unresolved.length > 0 ? `Unresolved (kept as typed): ${params.unresolved.join(", ")}` : void 0].filter(Boolean).join("\n");
}
//#endregion
export { formatResolvedUnresolvedNote as t };
