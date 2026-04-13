/**
 * 龙虾增强包 (OpenClaw Enhancement Kit)
 *
 * 非侵入式增强插件（v1.2.3 — 多 Agent 隔离）：
 * - 模块1: 结构化记忆系统（按 agentId 隔离，借鉴 Claude Code auto-memory）
 * - 模块2: 工具安全守卫（按 agentId 记录日志，借鉴 Claude Code 权限系统）
 * - 模块3: 提示词增强（按 agentId 注入上下文，借鉴 Claude Code systemPromptSections）
 * - 模块4: 工作流自动化（按 agentId 隔离工作流，借鉴 Claude Code hooks 事件驱动）
 * - 模块5: 增强仪表盘（支持按 Agent 筛选）
 *
 * 完全适配 WeCom 插件的动态 Agent 功能：
 * - 工具使用 OpenClawPluginToolFactory 模式，从 ctx.agentId 获取当前 Agent
 * - 钩子从 ctx.agentId 获取当前 Agent
 * - 每个企微用户/群组的数据完全隔离
 */
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { registerStructuredMemory } from "./src/modules/structured-memory.js";
import { registerTaskPlanner } from "./src/modules/task-planner.js";
import { registerToolSafety } from "./src/modules/tool-safety.js";
import { registerPromptEnhancer } from "./src/modules/prompt-enhancer.js";
import { registerWorkflowHooks } from "./src/modules/workflow-hooks.js";
import { registerDashboard } from "./src/modules/dashboard.js";

import { registerSelfCheck } from "./src/modules/self-check.js";
import { registerContextPruner } from "./src/modules/context-pruner.js";
import { registerMemoryIntegrator } from "./src/modules/memory-integrator.js";
import { createNotificationQueue } from "./src/modules/notification-queue.js";
import { resolveOpenClawHome } from "./src/utils/resolve-home.js";
import { getDb } from "./src/utils/sqlite-store.js";
import type { EnhancePluginConfig } from "./src/types.js";
import { existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

/** 从 ClawHub 安装技能列表 */
const CLANGB_HUB_SKILLS = [
  "huo15-openclaw-explore-mode",
  "huo15-openclaw-memory-curator",
  "huo15-openclaw-plan-mode",
  "huo15-openclaw-verify-mode",
];

/**
 * 从 ClawHub 安装技能到目标目录。
 * 使用 clawhub install 命令，支持离线缓存。
 */
function installSkillFromClawHub(skillName: string, targetDir: string, logger: (msg: string) => void): boolean {
  try {
    // 确保目标目录存在
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // 使用 clawhub install 安装技能
    const cmd = `clawhub install ${skillName} --dir "${targetDir}"`;
    execSync(cmd, { stdio: "pipe" });
    logger(`[enhance] 已从 ClawHub 安装技能: ${skillName}`);
    return true;
  } catch (err) {
    logger(`[enhance] 从 ClawHub 安装技能失败: ${skillName}, ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * 同步插件 skills 到指定的 workspace/skills/ 目录。
 * 从 ClawHub 远程安装，不再依赖插件内置 skills 目录。
 */
function syncSkillsToDir(targetSkillsDir: string, logger: (msg: string) => void): number {
  if (!existsSync(targetSkillsDir)) {
    mkdirSync(targetSkillsDir, { recursive: true });
  }

  let synced = 0;
  for (const skillName of CLANGB_HUB_SKILLS) {
    const skillDestDir = join(targetSkillsDir, skillName);
    // 已安装则跳过
    if (existsSync(skillDestDir)) {
      continue;
    }
    if (installSkillFromClawHub(skillName, targetSkillsDir, logger)) {
      synced++;
    }
  }

  return synced;
}

/** 记录已同步过 skills 的 workspace 路径，避免重复同步 */
const syncedWorkspaces = new Set<string>();

export default definePluginEntry({
  id: "enhance",
  name: "龙虾增强包 (OpenClaw Enhancement Kit)",
  description: "结构化记忆、工具安全守卫、提示词增强、工作流自动化、仪表盘",

  register(api) {
    const config = (api.pluginConfig ?? {}) as EnhancePluginConfig;

    // 初始化共享数据库和通知队列
    const openclawHome = resolveOpenClawHome(api);
    const db = getDb(openclawHome);
    const notifyQueue = createNotificationQueue(db, config.notifications);

    const modules: Array<{ name: string; enabled: boolean; load: () => void }> = [
      {
        name: "结构化记忆",
        enabled: config.memory?.enabled !== false,
        load: () => registerStructuredMemory(api, config.memory),
      },
      {
        name: "工具安全",
        enabled: config.safety?.enabled !== false,
        load: () => registerToolSafety(api, config.safety),
      },
      {
        name: "提示词增强",
        enabled: config.prompt?.enabled !== false,
        load: () => registerPromptEnhancer(api, config.prompt),
      },
      {
        name: "工作流自动化",
        enabled: config.workflows?.enabled !== false,
        load: () => registerWorkflowHooks(api, config.workflows),
      },
      {
        name: "仪表盘",
        enabled: config.dashboard?.enabled !== false,
        load: () => registerDashboard(api, config.dashboard, notifyQueue, db),
      },

      {
        name: "输出自检",
        enabled: config.selfCheck?.enabled !== false,
        load: () => registerSelfCheck(api, config.selfCheck),
      },
      {
        name: "Context裁剪",
        enabled: config.contextPruner?.enabled !== false,
        load: () => registerContextPruner(api, config.contextPruner),
      },
      {
        name: "任务规划",
        enabled: true,
        load: () => registerTaskPlanner(api),
      },
      {
        name: "记忆整合",
        enabled: true,
        load: () => registerMemoryIntegrator(api),
      },
      // 智能贴士已合并到小火苗模块（before_prompt_build 统一输出）
      // {
      //   name: "智能贴士",
      //   enabled: config.tips?.enabled !== false,
      //   load: () => { console.error("[idx] loading spinner-tips..."); registerSpinnerTips(api, config.tips, notifyQueue); },
      // },
    ];

    const loaded: string[] = [];
    for (const mod of modules) {
      if (mod.enabled) {
        try {
          mod.load();
          loaded.push(mod.name);
        } catch (err) {
          api.logger.error(`[enhance] 模块「${mod.name}」加载失败: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 自动从 ClawHub 安装 skills 到全局 workspace
    try {
      const openclawHome = resolveOpenClawHome(api);
      const globalSkillsDir = join(openclawHome, "workspace", "skills");
      const syncCount = syncSkillsToDir(globalSkillsDir, (msg) => api.logger.info(msg));
      syncedWorkspaces.add(globalSkillsDir);
      if (syncCount > 0) {
        api.logger.info(`[enhance] 已从 ClawHub 安装 ${syncCount} 个增强技能到全局 workspace/skills/`);
      }
    } catch (err) {
      api.logger.error(`[enhance] 技能安装失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 为每个动态 Agent 的 workspace 也安装 skills（首次遇到时）
    api.on("before_prompt_build", (_event: unknown, ctx: unknown) => {
      try {
        const agentCtx = ctx as { workspaceDir?: string } | undefined;
        const workspaceDir = agentCtx?.workspaceDir;
        if (!workspaceDir) return;

        const agentSkillsDir = join(workspaceDir, "skills");
        if (syncedWorkspaces.has(agentSkillsDir)) return;

        syncSkillsToDir(agentSkillsDir, (msg) => api.logger.info(msg));
        syncedWorkspaces.add(agentSkillsDir);
        api.logger.info(`[enhance] 已从 ClawHub 安装增强技能到 Agent workspace: ${workspaceDir}`);
      } catch {
        // 静默失败，不影响主流程
      }
    });

    api.logger.info(`[enhance] 龙虾增强包 v2.1.0 已加载（多 Agent 隔离，不干涉 openclaw 内置功能），启用模块: ${loaded.join("、")}`);
  },
});
