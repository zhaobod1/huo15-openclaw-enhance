import { i as coerceSecretRef } from "./types.secrets-BZdSA8i7.js";
import { m as resolveNonEnvSecretRefApiKeyMarker } from "./model-auth-markers-DBBQxeVp.js";
import "./provider-auth-BI9t-Krp.js";
import { a as resolveCloudflareAiGatewayBaseUrl, i as buildCloudflareAiGatewayModelDefinition } from "./models-CPHOQqea.js";
//#region extensions/cloudflare-ai-gateway/catalog-provider.ts
function resolveCloudflareAiGatewayApiKey(cred) {
	if (!cred || cred.type !== "api_key") return;
	const keyRef = coerceSecretRef(cred.keyRef);
	if (keyRef && keyRef.id.trim()) return keyRef.source === "env" ? keyRef.id.trim() : resolveNonEnvSecretRefApiKeyMarker(keyRef.source);
	return cred.key?.trim() || void 0;
}
function resolveCloudflareAiGatewayMetadata(cred) {
	if (!cred || cred.type !== "api_key") return {};
	return {
		accountId: cred.metadata?.accountId?.trim() || void 0,
		gatewayId: cred.metadata?.gatewayId?.trim() || void 0
	};
}
function buildCloudflareAiGatewayCatalogProvider(params) {
	const apiKey = params.envApiKey?.trim() || resolveCloudflareAiGatewayApiKey(params.credential);
	if (!apiKey) return null;
	const { accountId, gatewayId } = resolveCloudflareAiGatewayMetadata(params.credential);
	if (!accountId || !gatewayId) return null;
	const baseUrl = resolveCloudflareAiGatewayBaseUrl({
		accountId,
		gatewayId
	});
	if (!baseUrl) return null;
	return {
		baseUrl,
		api: "anthropic-messages",
		apiKey,
		models: [buildCloudflareAiGatewayModelDefinition()]
	};
}
//#endregion
export { resolveCloudflareAiGatewayApiKey as n, resolveCloudflareAiGatewayMetadata as r, buildCloudflareAiGatewayCatalogProvider as t };
