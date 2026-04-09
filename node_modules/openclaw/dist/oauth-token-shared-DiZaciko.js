//#region extensions/google/oauth-token-shared.ts
function parseGoogleOauthApiKey(apiKey) {
	try {
		const parsed = JSON.parse(apiKey);
		return {
			token: typeof parsed.token === "string" ? parsed.token : void 0,
			projectId: typeof parsed.projectId === "string" ? parsed.projectId : void 0
		};
	} catch {
		return null;
	}
}
function formatGoogleOauthApiKey(cred) {
	if (cred.type !== "oauth" || typeof cred.access !== "string" || !cred.access.trim()) return "";
	return JSON.stringify({
		token: cred.access,
		projectId: cred.projectId
	});
}
function parseGoogleUsageToken(apiKey) {
	const parsed = parseGoogleOauthApiKey(apiKey);
	if (parsed?.token) return parsed.token;
	return apiKey;
}
//#endregion
export { parseGoogleOauthApiKey as n, parseGoogleUsageToken as r, formatGoogleOauthApiKey as t };
