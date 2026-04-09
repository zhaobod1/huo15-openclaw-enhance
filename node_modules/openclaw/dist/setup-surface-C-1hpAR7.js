import { d as normalizeShip, i as resolveTlonSetupStatusLines, l as resolveTlonAccount, n as createTlonSetupWizardBase, o as isBlockedUrbitHostname, r as resolveTlonSetupConfigured, s as validateUrbitBaseUrl, t as applyTlonSetupConfig } from "./setup-core-THaM5w8p.js";
//#region extensions/tlon/src/setup-surface.ts
function parseList(value) {
	return value.split(/[\n,;]+/g).map((entry) => entry.trim()).filter(Boolean);
}
const tlonSetupWizard = createTlonSetupWizardBase({
	resolveConfigured: async ({ cfg, accountId }) => await resolveTlonSetupConfigured(cfg, accountId),
	resolveStatusLines: async ({ cfg, accountId }) => await resolveTlonSetupStatusLines(cfg, accountId),
	finalize: async ({ cfg, accountId, prompter }) => {
		let next = cfg;
		const resolved = resolveTlonAccount(next, accountId);
		const validatedUrl = validateUrbitBaseUrl(resolved.url ?? "");
		if (!validatedUrl.ok) throw new Error(`Invalid URL: ${validatedUrl.error}`);
		let dangerouslyAllowPrivateNetwork = resolved.dangerouslyAllowPrivateNetwork ?? false;
		if (isBlockedUrbitHostname(validatedUrl.hostname)) {
			dangerouslyAllowPrivateNetwork = await prompter.confirm({
				message: "Ship URL looks like a private/internal host. Allow private network access? (SSRF risk)",
				initialValue: dangerouslyAllowPrivateNetwork
			});
			if (!dangerouslyAllowPrivateNetwork) throw new Error("Refusing private/internal ship URL without explicit network opt-in");
		}
		next = applyTlonSetupConfig({
			cfg: next,
			accountId,
			input: { dangerouslyAllowPrivateNetwork }
		});
		const currentGroups = resolved.groupChannels;
		if (await prompter.confirm({
			message: "Add group channels manually? (optional)",
			initialValue: currentGroups.length > 0
		})) {
			const entry = await prompter.text({
				message: "Group channels (comma-separated)",
				placeholder: "chat/~host-ship/general, chat/~host-ship/support",
				initialValue: currentGroups.join(", ") || void 0
			});
			next = applyTlonSetupConfig({
				cfg: next,
				accountId,
				input: { groupChannels: parseList(String(entry ?? "")) }
			});
		}
		const currentAllowlist = resolved.dmAllowlist;
		if (await prompter.confirm({
			message: "Restrict DMs with an allowlist?",
			initialValue: currentAllowlist.length > 0
		})) {
			const entry = await prompter.text({
				message: "DM allowlist (comma-separated ship names)",
				placeholder: "~zod, ~nec",
				initialValue: currentAllowlist.join(", ") || void 0
			});
			next = applyTlonSetupConfig({
				cfg: next,
				accountId,
				input: { dmAllowlist: parseList(String(entry ?? "")).map((ship) => normalizeShip(ship)) }
			});
		}
		const autoDiscoverChannels = await prompter.confirm({
			message: "Enable auto-discovery of group channels?",
			initialValue: resolved.autoDiscoverChannels ?? true
		});
		next = applyTlonSetupConfig({
			cfg: next,
			accountId,
			input: { autoDiscoverChannels }
		});
		return { cfg: next };
	}
});
//#endregion
export { tlonSetupWizard as t };
