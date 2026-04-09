import "./text-runtime-DQoOM_co.js";
import { t as withTimeout } from "./with-timeout-Bm2KFScn.js";
import { messagingApi } from "@line/bot-sdk";
//#region extensions/line/src/probe.ts
async function probeLineBot(channelAccessToken, timeoutMs = 5e3) {
	if (!channelAccessToken?.trim()) return {
		ok: false,
		error: "Channel access token not configured"
	};
	const client = new messagingApi.MessagingApiClient({ channelAccessToken: channelAccessToken.trim() });
	try {
		const profile = await withTimeout(client.getBotInfo(), timeoutMs);
		return {
			ok: true,
			bot: {
				displayName: profile.displayName,
				userId: profile.userId,
				basicId: profile.basicId,
				pictureUrl: profile.pictureUrl
			}
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
}
//#endregion
export { probeLineBot as t };
