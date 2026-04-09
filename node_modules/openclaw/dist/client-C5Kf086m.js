import { WebClient } from "@slack/web-api";
//#region extensions/slack/src/client.ts
const SLACK_DEFAULT_RETRY_OPTIONS = {
	retries: 2,
	factor: 2,
	minTimeout: 500,
	maxTimeout: 3e3,
	randomize: true
};
const SLACK_WRITE_RETRY_OPTIONS = { retries: 0 };
function resolveSlackWebClientOptions(options = {}) {
	return {
		...options,
		retryConfig: options.retryConfig ?? SLACK_DEFAULT_RETRY_OPTIONS
	};
}
function resolveSlackWriteClientOptions(options = {}) {
	return {
		...options,
		retryConfig: options.retryConfig ?? SLACK_WRITE_RETRY_OPTIONS
	};
}
function createSlackWebClient(token, options = {}) {
	return new WebClient(token, resolveSlackWebClientOptions(options));
}
function createSlackWriteClient(token, options = {}) {
	return new WebClient(token, resolveSlackWriteClientOptions(options));
}
//#endregion
export { resolveSlackWebClientOptions as a, createSlackWriteClient as i, SLACK_WRITE_RETRY_OPTIONS as n, resolveSlackWriteClientOptions as o, createSlackWebClient as r, SLACK_DEFAULT_RETRY_OPTIONS as t };
