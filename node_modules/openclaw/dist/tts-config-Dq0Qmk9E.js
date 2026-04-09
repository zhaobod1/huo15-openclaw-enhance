//#region src/tts/tts-config.ts
function resolveConfiguredTtsMode(cfg) {
	return cfg.messages?.tts?.mode ?? "final";
}
//#endregion
export { resolveConfiguredTtsMode as t };
