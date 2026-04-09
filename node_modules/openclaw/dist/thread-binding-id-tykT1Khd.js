//#region src/channels/thread-binding-id.ts
function resolveThreadBindingConversationIdFromBindingId(params) {
	const bindingId = params.bindingId?.trim();
	if (!bindingId) return;
	const prefix = `${params.accountId}:`;
	if (!bindingId.startsWith(prefix)) return;
	return bindingId.slice(prefix.length).trim() || void 0;
}
//#endregion
export { resolveThreadBindingConversationIdFromBindingId as t };
