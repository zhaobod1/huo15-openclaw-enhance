import { t as safeParseJsonWithSchema } from "./zod-parse-SRMZ4WYD.js";
import fs from "node:fs";
import { z } from "zod";
//#region src/config/sessions/store-read.ts
const SessionStoreSchema = z.record(z.string(), z.unknown());
function readSessionStoreReadOnly(storePath) {
	try {
		const raw = fs.readFileSync(storePath, "utf-8");
		if (!raw.trim()) return {};
		return safeParseJsonWithSchema(SessionStoreSchema, raw) ?? {};
	} catch {
		return {};
	}
}
//#endregion
export { readSessionStoreReadOnly as t };
