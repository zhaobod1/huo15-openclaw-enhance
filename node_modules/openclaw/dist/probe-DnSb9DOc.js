import "./text-runtime-DQoOM_co.js";
import { t as withTimeout } from "./with-timeout-Bm2KFScn.js";
import { r as createSlackWebClient } from "./client-C5Kf086m.js";
//#region extensions/slack/src/probe.ts
async function probeSlack(token, timeoutMs = 2500) {
	const client = createSlackWebClient(token);
	const start = Date.now();
	try {
		const result = await withTimeout(client.auth.test(), timeoutMs);
		if (!result.ok) return {
			ok: false,
			status: 200,
			error: result.error ?? "unknown",
			elapsedMs: Date.now() - start
		};
		return {
			ok: true,
			status: 200,
			elapsedMs: Date.now() - start,
			bot: {
				id: result.user_id,
				name: result.user
			},
			team: {
				id: result.team_id,
				name: result.team
			}
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			ok: false,
			status: typeof err.status === "number" ? err.status : null,
			error: message,
			elapsedMs: Date.now() - start
		};
	}
}
//#endregion
export { probeSlack as t };
