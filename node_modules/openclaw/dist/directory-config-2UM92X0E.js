import { t as adaptScopedAccountAccessor } from "./channel-config-helpers-CWYUF2eN.js";
import "./directory-runtime-BrmKrim8.js";
import { f as listResolvedDirectoryGroupEntriesFromMapKeys, p as listResolvedDirectoryUserEntriesFromAllowFrom } from "./directory-config-helpers-47ChUpH6.js";
import { s as resolveWhatsAppAccount } from "./accounts-DU73wvhy.js";
import { o as normalizeWhatsAppTarget, t as isWhatsAppGroupJid } from "./normalize-target-Rq2SUNBo.js";
import "./normalize-NKCRvjJ3.js";
//#region extensions/whatsapp/src/directory-config.ts
async function listWhatsAppDirectoryPeersFromConfig(params) {
	return listResolvedDirectoryUserEntriesFromAllowFrom({
		...params,
		resolveAccount: adaptScopedAccountAccessor(resolveWhatsAppAccount),
		resolveAllowFrom: (account) => account.allowFrom,
		normalizeId: (entry) => {
			const normalized = normalizeWhatsAppTarget(entry);
			if (!normalized || isWhatsAppGroupJid(normalized)) return null;
			return normalized;
		}
	});
}
async function listWhatsAppDirectoryGroupsFromConfig(params) {
	return listResolvedDirectoryGroupEntriesFromMapKeys({
		...params,
		resolveAccount: adaptScopedAccountAccessor(resolveWhatsAppAccount),
		resolveGroups: (account) => account.groups
	});
}
//#endregion
export { listWhatsAppDirectoryPeersFromConfig as n, listWhatsAppDirectoryGroupsFromConfig as t };
