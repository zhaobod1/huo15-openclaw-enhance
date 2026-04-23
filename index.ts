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
import { registerMemoryIntegrator } from "./src/modules/memory-integrator.js";
import { registerTodoTracker } from "./src/modules/todo-tracker.js";
import { registerChapterMarks } from "./src/modules/chapter-marks.js";
import { registerModeGate } from "./src/modules/mode-gate.js";
import { registerStatusline } from "./src/modules/statusline.js";
import { registerSpawnTask } from "./src/modules/spawn-task.js";
import { registerSkillDoctor } from "./src/modules/skill-doctor.js";
import { registerScheduledTasksBridge } from "./src/modules/scheduled-tasks-bridge.js";
import { registerSkillInstaller, CLAW_HUB_SKILLS } from "./src/modules/skill-installer.js";
import { createNotificationQueue } from "./src/modules/notification-queue.js";
import { resolveOpenClawHome } from "./src/utils/resolve-home.js";
import { getDb } from "./src/utils/sqlite-store.js";
import type { EnhancePluginConfig } from "./src/types.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

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
        name: "任务规划",
        enabled: true,
        load: () => registerTaskPlanner(api),
      },
      {
        name: "记忆整合",
        enabled: config.memory?.enabled !== false,
        load: () => registerMemoryIntegrator(api, config.contextPruner),
      },
      {
        name: "任务追踪",
        enabled: config.todos?.enabled !== false,
        load: () => registerTodoTracker(api, notifyQueue),
      },
      {
        name: "章节标记",
        enabled: config.chapters?.enabled !== false,
        load: () => registerChapterMarks(api),
      },
      {
        name: "模式闸门",
        enabled: config.mode?.enabled === true,
        load: () => registerModeGate(api, config.mode, notifyQueue),
      },
      {
        name: "状态栏",
        enabled: config.statusline?.enabled !== false,
        load: () => registerStatusline(api, db, notifyQueue),
      },
      {
        name: "子任务派发",
        enabled: true,
        load: () => registerSpawnTask(api),
      },
      {
        name: "技能巡检",
        enabled: true,
        load: () => registerSkillDoctor(api),
      },
      {
        name: "定时任务桥",
        enabled: config.scheduledTasks?.enabled !== false,
        load: () => registerScheduledTasksBridge(api),
      },
      {
        name: "技能安装器",
        enabled: true,
        load: () => registerSkillInstaller(api),
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

    // 首次启动提示：配套技能需手动安装（插件不执行外部命令，只给提示）
    try {
      const globalSkillsDir = join(openclawHome, "workspace", "skills");
      const missing = CLAW_HUB_SKILLS.filter(
        (s) => !existsSync(join(globalSkillsDir, s)),
      );
      if (missing.length > 0) {
        api.logger.info(
          `[enhance] 检测到 ${missing.length} 个配套技能未安装：${missing.join("、")}；` +
            `调用 enhance_install_skills 获取一键安装命令，或手动运行 clawhub install <技能名> --dir ${globalSkillsDir}`,
        );
      }
    } catch {
      // 静默跳过（非关键路径）
    }

    api.logger.info(`[enhance] 龙虾增强包 v5.3.2 已加载（非侵入式，不重复龙虾原生功能），启用模块: ${loaded.join("、")}`);
  },
});
