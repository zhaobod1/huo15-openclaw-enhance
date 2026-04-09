//#region src/config/runtime-snapshot.ts
let runtimeConfigSnapshot = null;
let runtimeConfigSourceSnapshot = null;
let runtimeConfigSnapshotRefreshHandler = null;
function setRuntimeConfigSnapshot(config, sourceConfig) {
	runtimeConfigSnapshot = config;
	runtimeConfigSourceSnapshot = sourceConfig ?? null;
}
function resetConfigRuntimeState() {
	runtimeConfigSnapshot = null;
	runtimeConfigSourceSnapshot = null;
}
function clearRuntimeConfigSnapshot() {
	resetConfigRuntimeState();
}
function getRuntimeConfigSnapshot() {
	return runtimeConfigSnapshot;
}
function getRuntimeConfigSourceSnapshot() {
	return runtimeConfigSourceSnapshot;
}
function setRuntimeConfigSnapshotRefreshHandler(refreshHandler) {
	runtimeConfigSnapshotRefreshHandler = refreshHandler;
}
function getRuntimeConfigSnapshotRefreshHandler() {
	return runtimeConfigSnapshotRefreshHandler;
}
//#endregion
export { resetConfigRuntimeState as a, getRuntimeConfigSourceSnapshot as i, getRuntimeConfigSnapshot as n, setRuntimeConfigSnapshot as o, getRuntimeConfigSnapshotRefreshHandler as r, setRuntimeConfigSnapshotRefreshHandler as s, clearRuntimeConfigSnapshot as t };
