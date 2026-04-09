import { i as resolveSessionThreadInfo } from "./session-conversation-DBSu72d1.js";
//#region src/config/sessions/thread-info.ts
/**
* Extract deliveryContext and threadId from a sessionKey.
* Supports generic :thread: suffixes plus plugin-owned thread/session grammars.
*/
function parseSessionThreadInfo(sessionKey) {
	return resolveSessionThreadInfo(sessionKey);
}
//#endregion
export { parseSessionThreadInfo as t };
