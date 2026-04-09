//#region extensions/signal/src/rpc-context.ts
function resolveSignalRpcContext(opts, accountInfo) {
	const hasBaseUrl = Boolean(opts.baseUrl?.trim());
	const hasAccount = Boolean(opts.account?.trim());
	if ((!hasBaseUrl || !hasAccount) && !accountInfo) throw new Error("Signal account config is required when baseUrl or account is missing");
	const resolvedAccount = accountInfo;
	const baseUrl = opts.baseUrl?.trim() || resolvedAccount?.baseUrl;
	if (!baseUrl) throw new Error("Signal base URL is required");
	return {
		baseUrl,
		account: opts.account?.trim() || resolvedAccount?.config.account?.trim()
	};
}
//#endregion
export { resolveSignalRpcContext as t };
