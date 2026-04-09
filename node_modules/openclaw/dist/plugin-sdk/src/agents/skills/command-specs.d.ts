import type { OpenClawConfig } from "../../config/config.js";
import type { SkillEligibilityContext, SkillCommandSpec, SkillEntry } from "./types.js";
export declare function buildWorkspaceSkillCommandSpecs(workspaceDir: string, opts?: {
    config?: OpenClawConfig;
    managedSkillsDir?: string;
    bundledSkillsDir?: string;
    entries?: SkillEntry[];
    agentId?: string;
    skillFilter?: string[];
    eligibility?: SkillEligibilityContext;
    reservedNames?: Set<string>;
}): SkillCommandSpec[];
