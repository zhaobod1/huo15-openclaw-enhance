import { a as loadBundledPluginPublicSurfaceModuleSync } from "./facade-runtime-Bv3MxT2V.js";
//#region src/plugin-sdk/ollama-runtime.ts
function loadFacadeModule() {
	return loadBundledPluginPublicSurfaceModuleSync({
		dirName: "ollama",
		artifactBasename: "runtime-api.js"
	});
}
const DEFAULT_OLLAMA_EMBEDDING_MODEL = loadFacadeModule().DEFAULT_OLLAMA_EMBEDDING_MODEL;
const createOllamaEmbeddingProvider = ((...args) => loadFacadeModule().createOllamaEmbeddingProvider(...args));
//#endregion
export { createOllamaEmbeddingProvider as n, DEFAULT_OLLAMA_EMBEDDING_MODEL as t };
