import { i as telegramSetupAdapter, r as telegramSetupWizard } from "./channel-CUlsn_7D.js";
import { t as createTelegramPluginBase } from "./shared-BcMjbMbX.js";
//#region extensions/telegram/src/channel.setup.ts
const telegramSetupPlugin = { ...createTelegramPluginBase({
	setupWizard: telegramSetupWizard,
	setup: telegramSetupAdapter
}) };
//#endregion
export { telegramSetupPlugin as t };
