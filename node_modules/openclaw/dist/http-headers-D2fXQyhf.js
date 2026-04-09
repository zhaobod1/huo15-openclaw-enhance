//#region extensions/voice-call/src/http-headers.ts
function getHeader(headers, name) {
	const target = name.toLowerCase();
	const value = headers[target] ?? Object.entries(headers).find(([key]) => key.toLowerCase() === target)?.[1];
	if (Array.isArray(value)) return value[0];
	return value;
}
//#endregion
export { getHeader as t };
