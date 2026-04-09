import { a as hasConfiguredSecretInput, c as normalizeResolvedSecretInputString } from "./types.secrets-BZdSA8i7.js";
//#region src/memory-host-sdk/host/secret-input.ts
function hasConfiguredMemorySecretInput(value) {
	return hasConfiguredSecretInput(value);
}
function resolveMemorySecretInputString(params) {
	return normalizeResolvedSecretInputString({
		value: params.value,
		path: params.path
	});
}
//#endregion
export { resolveMemorySecretInputString as n, hasConfiguredMemorySecretInput as t };
