import { _ as normalizeAccountId } from "./session-key-BR3Z-ljs.js";
import { t as getMatrixRuntime } from "./runtime-CQ_wJXn2.js";
import { t as isBunRuntime } from "./runtime-DbZMyikc.js";
//#region extensions/matrix/src/matrix/active-client.ts
const activeClients = /* @__PURE__ */ new Map();
function resolveAccountKey(accountId) {
	return normalizeAccountId(accountId) || "default";
}
function setActiveMatrixClient(client, accountId) {
	const key = resolveAccountKey(accountId);
	if (!client) {
		activeClients.delete(key);
		return;
	}
	activeClients.set(key, client);
}
function getActiveMatrixClient(accountId) {
	const key = resolveAccountKey(accountId);
	return activeClients.get(key) ?? null;
}
//#endregion
//#region extensions/matrix/src/matrix/client-bootstrap.ts
let matrixSharedClientRuntimeDepsPromise;
async function loadMatrixSharedClientRuntimeDeps() {
	matrixSharedClientRuntimeDepsPromise ??= Promise.all([import("./client-CL0DhGZZ.js"), import("./shared-CU_6gseX.js")]).then(([clientModule, sharedModule]) => ({
		acquireSharedMatrixClient: clientModule.acquireSharedMatrixClient,
		resolveMatrixAuthContext: clientModule.resolveMatrixAuthContext,
		releaseSharedClientInstance: sharedModule.releaseSharedClientInstance
	}));
	return await matrixSharedClientRuntimeDepsPromise;
}
async function ensureResolvedClientReadiness(params) {
	if (params.readiness === "started") {
		await params.client.start();
		return;
	}
	if (params.readiness === "prepared" || !params.readiness && params.preparedByDefault) await params.client.prepareForOneOff();
}
function ensureMatrixNodeRuntime() {
	if (isBunRuntime()) throw new Error("Matrix support requires Node (bun runtime not supported)");
}
async function resolveRuntimeMatrixClient(opts) {
	ensureMatrixNodeRuntime();
	if (opts.client) {
		await opts.onResolved?.(opts.client, { preparedByDefault: false });
		return {
			client: opts.client,
			stopOnDone: false
		};
	}
	const cfg = opts.cfg ?? getMatrixRuntime().config.loadConfig();
	const { acquireSharedMatrixClient, releaseSharedClientInstance, resolveMatrixAuthContext } = await loadMatrixSharedClientRuntimeDeps();
	const authContext = resolveMatrixAuthContext({
		cfg,
		accountId: opts.accountId
	});
	const active = getActiveMatrixClient(authContext.accountId);
	if (active) {
		await opts.onResolved?.(active, { preparedByDefault: false });
		return {
			client: active,
			stopOnDone: false
		};
	}
	const client = await acquireSharedMatrixClient({
		cfg,
		timeoutMs: opts.timeoutMs,
		accountId: authContext.accountId,
		startClient: false
	});
	try {
		await opts.onResolved?.(client, { preparedByDefault: true });
	} catch (err) {
		await releaseSharedClientInstance(client, "stop");
		throw err;
	}
	return {
		client,
		stopOnDone: true,
		cleanup: async (mode) => {
			await releaseSharedClientInstance(client, mode);
		}
	};
}
async function resolveRuntimeMatrixClientWithReadiness(opts) {
	return await resolveRuntimeMatrixClient({
		client: opts.client,
		cfg: opts.cfg,
		timeoutMs: opts.timeoutMs,
		accountId: opts.accountId,
		onResolved: async (client, context) => {
			await ensureResolvedClientReadiness({
				client,
				readiness: opts.readiness,
				preparedByDefault: context.preparedByDefault
			});
		}
	});
}
async function stopResolvedRuntimeMatrixClient(resolved, mode = "stop") {
	if (!resolved.stopOnDone) return;
	if (resolved.cleanup) {
		await resolved.cleanup(mode);
		return;
	}
	if (mode === "persist") {
		await resolved.client.stopAndPersist();
		return;
	}
	resolved.client.stop();
}
async function withResolvedRuntimeMatrixClient(opts, run, stopMode = "stop") {
	const resolved = await resolveRuntimeMatrixClientWithReadiness(opts);
	try {
		return await run(resolved.client);
	} finally {
		await stopResolvedRuntimeMatrixClient(resolved, stopMode);
	}
}
//#endregion
export { setActiveMatrixClient as i, stopResolvedRuntimeMatrixClient as n, withResolvedRuntimeMatrixClient as r, resolveRuntimeMatrixClientWithReadiness as t };
