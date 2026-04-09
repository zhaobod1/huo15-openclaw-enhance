import { i as loadActivatedBundledPluginPublicSurfaceModuleSync, n as createLazyFacadeObjectValue } from "./facade-runtime-Bv3MxT2V.js";
//#region src/plugin-sdk/memory-core-engine-runtime.ts
function loadFacadeModule() {
	return loadActivatedBundledPluginPublicSurfaceModuleSync({
		dirName: "memory-core",
		artifactBasename: "runtime-api.js"
	});
}
const auditShortTermPromotionArtifacts = ((...args) => loadFacadeModule()["auditShortTermPromotionArtifacts"](...args));
const getBuiltinMemoryEmbeddingProviderDoctorMetadata = ((...args) => loadFacadeModule()["getBuiltinMemoryEmbeddingProviderDoctorMetadata"](...args));
const getMemorySearchManager = ((...args) => loadFacadeModule()["getMemorySearchManager"](...args));
const listBuiltinAutoSelectMemoryEmbeddingProviderDoctorMetadata = ((...args) => loadFacadeModule()["listBuiltinAutoSelectMemoryEmbeddingProviderDoctorMetadata"](...args));
const MemoryIndexManager = createLazyFacadeObjectValue(() => loadFacadeModule()["MemoryIndexManager"]);
const repairShortTermPromotionArtifacts = ((...args) => loadFacadeModule()["repairShortTermPromotionArtifacts"](...args));
//#endregion
export { listBuiltinAutoSelectMemoryEmbeddingProviderDoctorMetadata as a, getMemorySearchManager as i, auditShortTermPromotionArtifacts as n, repairShortTermPromotionArtifacts as o, getBuiltinMemoryEmbeddingProviderDoctorMetadata as r, MemoryIndexManager as t };
