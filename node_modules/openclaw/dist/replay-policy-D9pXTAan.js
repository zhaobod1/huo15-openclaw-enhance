//#region extensions/github-copilot/replay-policy.ts
function buildGithubCopilotReplayPolicy(modelId) {
	return (modelId?.toLowerCase() ?? "").includes("claude") ? { dropThinkingBlocks: true } : {};
}
//#endregion
export { buildGithubCopilotReplayPolicy as t };
