/**
 * 龙虾增强包 (OpenClaw Enhancement Kit)
 *
 * 非侵入式增强插件（v1.2.1 — 多 Agent 隔离）：
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
import { registerToolSafety } from "./src/modules/tool-safety.js";
import { registerPromptEnhancer } from "./src/modules/prompt-enhancer.js";
import { registerWorkflowHooks } from "./src/modules/workflow-hooks.js";
import { registerDashboard } from "./src/modules/dashboard.js";
import type { EnhancePluginConfig } from "./src/types.js";

export default definePluginEntry({
  id: "enhance",
  name: "龙虾增强包 (OpenClaw Enhancement Kit)",
  description: "结构化记忆、工具安全守卫、提示词增强、工作流自动化、仪表盘",

  register(api) {
    const config = (api.pluginConfig ?? {}) as EnhancePluginConfig;

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
        load: () => registerDashboard(api, config.dashboard),
      },
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

    api.logger.info(`[enhance] 龙虾增强包 v1.2.1 已加载（多 Agent 隔离），启用模块: ${loaded.join("、")}`);
  },
});
