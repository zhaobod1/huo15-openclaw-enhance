import { v as normalizeOptionalAccountId } from "./session-key-BR3Z-ljs.js";
import { a as resolveMatrixDefaultOrOnlyAccountId } from "./account-selection-BneLmcra.js";
import { t as resolveMatrixConfigFieldPath } from "./config-paths-nydRhwNZ.js";
import { u as resolveMatrixRoomId } from "./send-DpaTmUoP.js";
import { r as withResolvedRuntimeMatrixClient } from "./client-bootstrap-DbhH9VxZ.js";
//#region extensions/matrix/src/matrix/actions/client.ts
async function withResolvedActionClient(opts, run, mode = "stop") {
	return await withResolvedRuntimeMatrixClient(opts, run, mode);
}
async function withStartedActionClient(opts, run) {
	return await withResolvedActionClient({
		...opts,
		readiness: "started"
	}, run, "persist");
}
async function withResolvedRoomAction(roomId, opts, run) {
	return await withResolvedActionClient(opts, async (client) => {
		return await run(client, await resolveMatrixRoomId(client, roomId));
	});
}
//#endregion
//#region extensions/matrix/src/matrix/encryption-guidance.ts
function resolveMatrixEncryptionConfigPath(cfg, accountId) {
	return resolveMatrixConfigFieldPath(cfg, normalizeOptionalAccountId(accountId) ?? resolveMatrixDefaultOrOnlyAccountId(cfg), "encryption");
}
function formatMatrixEncryptionUnavailableError(cfg, accountId) {
	return `Matrix encryption is not available (enable ${resolveMatrixEncryptionConfigPath(cfg, accountId)}=true)`;
}
function formatMatrixEncryptedEventDisabledWarning(cfg, accountId) {
	return `matrix: encrypted event received without encryption enabled; set ${resolveMatrixEncryptionConfigPath(cfg, accountId)}=true and verify the device to decrypt`;
}
//#endregion
export { withStartedActionClient as a, withResolvedRoomAction as i, formatMatrixEncryptionUnavailableError as n, withResolvedActionClient as r, formatMatrixEncryptedEventDisabledWarning as t };
