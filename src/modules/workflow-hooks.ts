/**
 * 模块4: 工作流自动化（多 Agent 隔离版）
 *
 * 工作流按 agentId 隔离存储和触发。
 * 每个动态 Agent 拥有独立的工作流集合。
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_AGENT_ID, type Workflow, type WorkflowConfig } from "../types.js";

function getWorkflowsPath(openclawDir: string): string {
  return join(openclawDir, "memory", "enhance-workflows.json");
}

function loadAllWorkflows(openclawDir: string): Workflow[] {
  const path = getWorkflowsPath(openclawDir);
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    // v1 兼容：如果旧数据没有 agent_id，补上 DEFAULT_AGENT_ID
    return (data as Workflow[]).map((w) => ({
      ...w,
      agent_id: w.agent_id || DEFAULT_AGENT_ID,
    }));
  } catch {
    return [];
  }
}

function loadWorkflows(openclawDir: string, agentId: string): Workflow[] {
  return loadAllWorkflows(openclawDir).filter((w) => w.agent_id === agentId);
}

function saveWorkflows(openclawDir: string, workflows: Workflow[]): void {
  writeFileSync(getWorkflowsPath(openclawDir), JSON.stringify(workflows, null, 2), "utf-8");
}

export function registerWorkflowHooks(api: OpenClawPluginApi, _config?: WorkflowConfig) {
  const openclawDir = api.runtime.paths?.home ?? process.env.HOME + "/.openclaw";

  // ── Tool Factory: enhance_workflow_define ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_workflow_define",
      description: [
        "定义一个工作流自动化规则（隔离到当前 Agent）。",
        "工作流是「触发词 → 行为指令」的映射。",
        "当用户消息包含触发词时，对应指令会被注入到系统提示中引导你的行为。",
        "",
        "示例：",
        "  trigger: '部署'",
        "  instructions: '先运行 git status 查看状态，然后询问用户确认，最后执行 ./deploy.sh'",
      ].join("\n"),
      parameters: Type.Object({
        name: Type.String({ description: "工作流名称" }),
        trigger: Type.String({ description: "触发词（出现在用��消息中即触发）" }),
        instructions: Type.String({ description: "触发后注入的行为指令" }),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = ctx.agentId?.trim() || DEFAULT_AGENT_ID;
        const allWorkflows = loadAllWorkflows(openclawDir);
        const existing = allWorkflows.findIndex(
          (w) => w.name === params.name && w.agent_id === agentId,
        );

        const workflow: Workflow = {
          id: existing >= 0 ? allWorkflows[existing].id : `wf_${Date.now()}`,
          agent_id: agentId,
          name: params.name as string,
          trigger: params.trigger as string,
          instructions: params.instructions as string,
          enabled: true,
          created_at: existing >= 0 ? allWorkflows[existing].created_at : new Date().toISOString(),
        };

        if (existing >= 0) {
          allWorkflows[existing] = workflow;
        } else {
          allWorkflows.push(workflow);
        }
        saveWorkflows(openclawDir, allWorkflows);

        return {
          content: [
            {
              type: "text" as const,
              text: `已${existing >= 0 ? "更新" : "创建"}工作流「${params.name}」(agent: ${agentId})\n触发词: "${params.trigger}"\n指令: ${(params.instructions as string).slice(0, 100)}...`,
            },
          ],
        };
      },
    }),
    { name: "enhance_workflow_define" },
  );

  // ── Tool Factory: enhance_workflow_list ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_workflow_list",
      description: "列出当前 Agent 的所有工作流。",
      parameters: Type.Object({}),
      async execute() {
        const agentId = ctx.agentId?.trim() || DEFAULT_AGENT_ID;
        const workflows = loadWorkflows(openclawDir, agentId);
        if (workflows.length === 0) {
          return { content: [{ type: "text" as const, text: `暂无工作流 (agent: ${agentId})。使用 enhance_workflow_define 创建。` }] };
        }
        const lines = workflows.map(
          (w) =>
            `${w.enabled ? "✅" : "⏸️"} ${w.name} (触发: "${w.trigger}")\n   ${w.instructions.slice(0, 80)}`,
        );
        return {
          content: [{ type: "text" as const, text: `工作流列表 (agent: ${agentId}, ${workflows.length} 个)：\n\n${lines.join("\n\n")}` }],
        };
      },
    }),
    { name: "enhance_workflow_list" },
  );

  // ── Tool Factory: enhance_workflow_delete ──
  api.registerTool(
    (ctx: OpenClawPluginToolContext) => ({
      name: "enhance_workflow_delete",
      description: "删除当前 Agent 的一个工作流。",
      parameters: Type.Object({
        name: Type.String({ description: "要删除的工作流名称" }),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const agentId = ctx.agentId?.trim() || DEFAULT_AGENT_ID;
        const allWorkflows = loadAllWorkflows(openclawDir);
        const idx = allWorkflows.findIndex(
          (w) => w.name === params.name && w.agent_id === agentId,
        );
        if (idx < 0) {
          return { content: [{ type: "text" as const, text: `未找到工作流「${params.name}」(agent: ${agentId})` }] };
        }
        allWorkflows.splice(idx, 1);
        saveWorkflows(openclawDir, allWorkflows);
        return { content: [{ type: "text" as const, text: `已删除工作流「${params.name}」(agent: ${agentId})` }] };
      },
    }),
    { name: "enhance_workflow_delete" },
  );

  // ── Hook: before_prompt_build — 按当前 Agent 检查触发词 ──
  api.on("before_prompt_build", (_event, ctx) => {
    const agentId = ctx?.agentId?.trim() || DEFAULT_AGENT_ID;
    const userMessage = ctx?.lastUserMessage ?? "";
    if (!userMessage) return {};

    const workflows = loadWorkflows(openclawDir, agentId);
    const triggered = workflows.filter(
      (w) => w.enabled && userMessage.includes(w.trigger),
    );

    if (triggered.length === 0) return {};

    const instructions = triggered
      .map((w) => `### 工作流「${w.name}」已触发\n${w.instructions}`)
      .join("\n\n");

    return {
      appendSystemContext: [
        "\n\n## 工作流自动化（增强包）",
        `当前 Agent: ${agentId}`,
        "以下工作流被用户消息触发，请按指令执行：",
        instructions,
      ].join("\n"),
    };
  });

  api.logger.info("[enhance] 工作流自动化模块已加载（多 Agent 隔离）");
}
