import { n as listChannelPlugins } from "./registry-Bol_V2Fp.js";
//#region src/commands/doctor/shared/channel-doctor.ts
function listChannelDoctorEntries() {
	try {
		return listChannelPlugins().flatMap((plugin) => plugin.doctor ? [{
			channelId: plugin.id,
			doctor: plugin.doctor
		}] : []).filter((entry) => entry.doctor);
	} catch {
		return [];
	}
}
async function runChannelDoctorConfigSequences(params) {
	const changeNotes = [];
	const warningNotes = [];
	for (const entry of listChannelDoctorEntries()) {
		const result = await entry.doctor.runConfigSequence?.(params);
		if (!result) continue;
		changeNotes.push(...result.changeNotes);
		warningNotes.push(...result.warningNotes);
	}
	return {
		changeNotes,
		warningNotes
	};
}
function collectChannelDoctorCompatibilityMutations(cfg) {
	const mutations = [];
	let nextCfg = cfg;
	for (const entry of listChannelDoctorEntries()) {
		const mutation = entry.doctor.normalizeCompatibilityConfig?.({ cfg: nextCfg });
		if (!mutation || mutation.changes.length === 0) continue;
		mutations.push(mutation);
		nextCfg = mutation.config;
	}
	return mutations;
}
async function collectChannelDoctorStaleConfigMutations(cfg) {
	const mutations = [];
	let nextCfg = cfg;
	for (const entry of listChannelDoctorEntries()) {
		const mutation = await entry.doctor.cleanStaleConfig?.({ cfg: nextCfg });
		if (!mutation || mutation.changes.length === 0) continue;
		mutations.push(mutation);
		nextCfg = mutation.config;
	}
	return mutations;
}
async function collectChannelDoctorPreviewWarnings(params) {
	const warnings = [];
	for (const entry of listChannelDoctorEntries()) {
		const lines = await entry.doctor.collectPreviewWarnings?.(params);
		if (lines?.length) warnings.push(...lines);
	}
	return warnings;
}
async function collectChannelDoctorMutableAllowlistWarnings(params) {
	const warnings = [];
	for (const entry of listChannelDoctorEntries()) {
		const lines = await entry.doctor.collectMutableAllowlistWarnings?.(params);
		if (lines?.length) warnings.push(...lines);
	}
	return warnings;
}
async function collectChannelDoctorRepairMutations(params) {
	const mutations = [];
	let nextCfg = params.cfg;
	for (const entry of listChannelDoctorEntries()) {
		const mutation = await entry.doctor.repairConfig?.({
			cfg: nextCfg,
			doctorFixCommand: params.doctorFixCommand
		});
		if (!mutation || mutation.changes.length === 0) {
			if (mutation?.warnings?.length) mutations.push({
				config: nextCfg,
				changes: [],
				warnings: mutation.warnings
			});
			continue;
		}
		mutations.push(mutation);
		nextCfg = mutation.config;
	}
	return mutations;
}
function collectChannelDoctorEmptyAllowlistExtraWarnings(params) {
	const warnings = [];
	for (const entry of listChannelDoctorEntries()) {
		const lines = entry.doctor.collectEmptyAllowlistExtraWarnings?.(params);
		if (lines?.length) warnings.push(...lines);
	}
	return warnings;
}
function shouldSkipChannelDoctorDefaultEmptyGroupAllowlistWarning(params) {
	return listChannelDoctorEntries().some((entry) => entry.doctor.shouldSkipDefaultEmptyGroupAllowlistWarning?.(params) === true);
}
//#endregion
export { collectChannelDoctorRepairMutations as a, shouldSkipChannelDoctorDefaultEmptyGroupAllowlistWarning as c, collectChannelDoctorPreviewWarnings as i, collectChannelDoctorEmptyAllowlistExtraWarnings as n, collectChannelDoctorStaleConfigMutations as o, collectChannelDoctorMutableAllowlistWarnings as r, runChannelDoctorConfigSequences as s, collectChannelDoctorCompatibilityMutations as t };
