import { i as loadActivatedBundledPluginPublicSurfaceModuleSync, n as createLazyFacadeObjectValue } from "./facade-runtime-Bv3MxT2V.js";
//#region src/plugin-sdk/tts-runtime.ts
function loadFacadeModule() {
	return loadActivatedBundledPluginPublicSurfaceModuleSync({
		dirName: "speech-core",
		artifactBasename: "runtime-api.js"
	});
}
const _test = createLazyFacadeObjectValue(() => loadFacadeModule()._test);
const buildTtsSystemPromptHint = createLazyFacadeValue("buildTtsSystemPromptHint");
const getLastTtsAttempt = createLazyFacadeValue("getLastTtsAttempt");
const getResolvedSpeechProviderConfig = createLazyFacadeValue("getResolvedSpeechProviderConfig");
const getTtsMaxLength = createLazyFacadeValue("getTtsMaxLength");
const getTtsProvider = createLazyFacadeValue("getTtsProvider");
const isSummarizationEnabled = createLazyFacadeValue("isSummarizationEnabled");
const isTtsEnabled = createLazyFacadeValue("isTtsEnabled");
const isTtsProviderConfigured = createLazyFacadeValue("isTtsProviderConfigured");
const listSpeechVoices = createLazyFacadeValue("listSpeechVoices");
const maybeApplyTtsToPayload = createLazyFacadeValue("maybeApplyTtsToPayload");
const resolveTtsAutoMode = createLazyFacadeValue("resolveTtsAutoMode");
const resolveTtsConfig = createLazyFacadeValue("resolveTtsConfig");
const resolveTtsPrefsPath = createLazyFacadeValue("resolveTtsPrefsPath");
const resolveTtsProviderOrder = createLazyFacadeValue("resolveTtsProviderOrder");
const setLastTtsAttempt = createLazyFacadeValue("setLastTtsAttempt");
const setSummarizationEnabled = createLazyFacadeValue("setSummarizationEnabled");
const setTtsAutoMode = createLazyFacadeValue("setTtsAutoMode");
const setTtsEnabled = createLazyFacadeValue("setTtsEnabled");
const setTtsMaxLength = createLazyFacadeValue("setTtsMaxLength");
const setTtsProvider = createLazyFacadeValue("setTtsProvider");
const synthesizeSpeech = createLazyFacadeValue("synthesizeSpeech");
const textToSpeech = createLazyFacadeValue("textToSpeech");
const textToSpeechTelephony = createLazyFacadeValue("textToSpeechTelephony");
function createLazyFacadeValue(key) {
	return ((...args) => {
		const value = loadFacadeModule()[key];
		if (typeof value !== "function") return value;
		return value(...args);
	});
}
//#endregion
export { textToSpeech as C, synthesizeSpeech as S, setSummarizationEnabled as _, getTtsMaxLength as a, setTtsMaxLength as b, isTtsEnabled as c, maybeApplyTtsToPayload as d, resolveTtsAutoMode as f, setLastTtsAttempt as g, resolveTtsProviderOrder as h, getResolvedSpeechProviderConfig as i, isTtsProviderConfigured as l, resolveTtsPrefsPath as m, buildTtsSystemPromptHint as n, getTtsProvider as o, resolveTtsConfig as p, getLastTtsAttempt as r, isSummarizationEnabled as s, _test as t, listSpeechVoices as u, setTtsAutoMode as v, textToSpeechTelephony as w, setTtsProvider as x, setTtsEnabled as y };
