//#region src/infra/tls/fingerprint.ts
function normalizeFingerprint(input) {
	return input.trim().replace(/^sha-?256\s*:?\s*/i, "").replace(/[^a-fA-F0-9]/g, "").toLowerCase();
}
//#endregion
export { normalizeFingerprint as t };
