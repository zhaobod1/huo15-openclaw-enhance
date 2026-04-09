import "./provider-model-shared-DUTxdm38.js";
import "./provider-catalog-shared-CEuY8K3k.js";
//#region extensions/openai/shared.ts
const OPENAI_API_BASE_URL = "https://api.openai.com/v1";
function isOpenAIApiBaseUrl(baseUrl) {
	const trimmed = baseUrl?.trim();
	if (!trimmed) return false;
	return /^https?:\/\/api\.openai\.com(?:\/v1)?\/?$/i.test(trimmed);
}
//#endregion
export { isOpenAIApiBaseUrl as n, OPENAI_API_BASE_URL as t };
