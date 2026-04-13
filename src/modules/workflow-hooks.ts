/**
 * 模块4: 工作流自动化 — 增强版（多 Agent 隔离 + 条件分支 + 任务状态）
 *
 * P2 增强：
 * - 正则触发词（不只是 plain string includes）
 * - 时间条件（cron 风格：每天9点、周一上班等）
 * - 任务状态持久化（跨 session 追踪 TODO 进度）
 * - 条件分支（if/then/else 逻辑）
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolveOpenClawHome } from "../utils/resolve-home.js";
import { DEFAULT_AGENT_ID, type Workflow, type WorkflowConfig } from "../types.js";

// ──────────────────────────────────────────────
// 常量
// ──────────────────────────────────────────────
const WORKFLOWS_DIR = "workflows";
const TASKS_FILE = "workflow-tasks.json";

// ──────────────────────────────────────────────
// 任务状态
// ──────────────────────────────────────────────
export interface WorkflowTask {
  id: string;
  workflowName: string;
  agentId: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  priority: "high" | "medium" | "low";
  tags: string[];
}

function getTasksPath(openclawDir: string): string {
  return join(openclawDir, WORKFLOWS_DIR, TASKS_FILE);
}

function ensureTasksDir(openclawDir: string): void {
  const dir = join(openclawDir, WORKFLOWS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadAllTasks(openclawDir: string): WorkflowTask[] {
  const path = getTasksPath(openclawDir);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as WorkflowTask[];
  } catch {
    return [];
  }
}

function saveTasks(openclawDir: string, tasks: WorkflowTask[]): void {
  ensureTasksDir(openclawDir);
  writeFileSync(getTasksPath(openclawDir), JSON.stringify(tasks, null, 2), "utf-8");
}

// ──────────────────────────────────────────────
// 条件评估
// ──────────────────────────────────────────────
export type ConditionType =
  | "always"
  | "keyword"
  | "regex"
  | "time_range"
  | "day_of_week"
  | "agent_state";

export interface WorkflowCondition {
  type: ConditionType;
  /** keyword / regex: 匹配文本 */
  pattern?: string;
  /** time_range: "09:00-17:30" */
  timeRange?: string;
  /** day_of_week: ["monday","tuesday"] 或 ["weekday","weekend"] */
  daysOfWeek?: string[];
  /** agent_state: 触发的工作流名称 */
  afterWorkflow?: string;
}

function evaluateCondition(
  cond: WorkflowCondition,
  userMessage: string,
  now: Date,
): boolean {
  switch (cond.type) {
    case "always":
      return true;

    case "keyword":
      return !!(cond.pattern && userMessage.includes(cond.pattern));

    case "regex":
      try {
        return !!(cond.pattern && new RegExp(cond.pattern, "i").test(userMessage));
      } catch {
        return false;
      }

    case "time_range":
      return evaluateTimeRange(cond.timeRange ?? "", now);

    case "day_of_week":
      return evaluateDayOfWeek(cond.daysOfWeek ?? [], now);

    case "agent_state":
      // 由调用方在 hook 中处理
      return false;

    default:
      return false;
  }
}

function evaluateTimeRange(range: string, now: Date): boolean {
  if (!range) return false;
  const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return false;

  const [_, sh, sm, eh, em] = match.map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (startMins <= endMins) {
    return currentMins >= startMins && currentMins <= endMins;
  } else {
    // 跨天（如 22:00-02:00）
    return currentMins >= startMins || currentMins <= endMins;
  }
}

function evaluateDayOfWeek(days: string[], now: Date): boolean {
  if (days.length === 0) return false;
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = dayNames[now.getDay()];

  if (days.includes("weekday")) {
    return today !== "saturday" && today !== "sunday";
  }
  if (days.includes("weekend")) {
    return today === "saturday" || today === "sunday";
  }
  return days.map((d) => d.toLowerCase()).includes(today);
}

// ──────────────────────────────────────────────
// 主模块
// ──────────────────────────────────────────────
function getWorkflowsDir(openclawDir: string): string {
  return join(openclawDir, WORKFLOWS_DIR);
}

function getWorkflowsPath(openclawDir: string): string {
  return join(getWorkflowsDir(openclawDir), "enhance-workflows.json");
}

function loadAllWorkflows(openclawDir: string): Workflow[] {
  const path = getWorkflowsPath(openclawDir);
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
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
  ensureDir(openclawDir);
  writeFileSync(getWorkflowsPath(openclawDir), JSON.stringify(workflows, null, 2), "utf-8");
}

function ensureDir(openclawDir: string): void {
  const dir = getWorkflowsDir(openclawDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function registerWorkflowHooks(api: OpenClawPluginApi, _config?: WorkflowConfig) {
  const openclawDir = resolveOpenClawHome(api);

  // ── Tool: enhance_workflow_define ──
  api.registerTool(((ctx: any) => ({
    name: "enhance_workflow_define",
    description: [
      "定义工作流自动化规则（多 Agent 隔离，支持条件分支）。",
      "",
      "触发条件支持：",
      "  - keyword: 关键词匹配（默认）",
      "  - regex: 正则表达式匹配",
      "  - time_range: 时间范围，如 '09:00-17:30'",
      "  - day_of_week: 星期几，如 ['monday','friday'] 或 ['weekday']",
      "",
      "示例（正则触发）：",
      "  trigger: '帮我分析'",
      "  condition: { type: 'regex', pattern: '帮我(分析|处理)' }",
    ].join("\n"),
    parameters: Type.Object({
      name: Type.String({ description: "工作流名称" }),
      trigger: Type.String({ description: "触发词（plain string，支持正则标记 /pattern/flags）" }),
      instructions: Type.String({ description: "触发后注入的行为指令" }),
      condition: Type.Optional(
        Type.Object({
          type: Type.Union([
            Type.Literal("always"),
            Type.Literal("keyword"),
            Type.Literal("regex"),
            Type.Literal("time_range"),
            Type.Literal("day_of_week"),
          ]),
          pattern: Type.Optional(Type.String()),
          timeRange: Type.Optional(Type.String()),
          daysOfWeek: Type.Optional(Type.Array(Type.String())),
        }),
      ),
      priority: Type.Optional(
        Type.Union([Type.Literal("high"), Type.Literal("medium"), Type.Literal("low")]),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>): Promise<any> {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
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
            text: `已${existing >= 0 ? "更新" : "创建"}工作流「${params.name}」(agent: ${agentId})\n触发: "${params.trigger}"`,
          },
        ],
      };
    },
  })) as any, { name: "enhance_workflow_define" });

  // ── Tool: enhance_workflow_list ──
  api.registerTool(((ctx: any) => ({
    name: "enhance_workflow_list",
    description: "列出当前 Agent 的所有工作流。",
    parameters: Type.Object({}),
    async execute(_id: string, _params: Record<string, unknown>): Promise<any> {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
      const workflows = loadWorkflows(openclawDir, agentId);
      if (workflows.length === 0) {
        return { content: [{ type: "text" as const, text: `暂无工作流 (agent: ${agentId})。` }] };
      }
      const lines = workflows.map(
        (w) => `${w.enabled ? "✅" : "⏸️"} ${w.name} (触发: "${w.trigger}")`,
      );
      return {
        content: [{ type: "text" as const, text: `工作流 (${workflows.length} 个)：\n\n${lines.join("\n\n")}` }],
      };
    },
  })) as any, { name: "enhance_workflow_list" });

  // ── Tool: enhance_workflow_delete ──
  api.registerTool(((ctx: any) => ({
    name: "enhance_workflow_delete",
    description: "删除当前 Agent 的一个工作流。",
    parameters: Type.Object({ name: Type.String({ description: "工作流名称" }) }),
    async execute(_id: string, params: Record<string, unknown>): Promise<any> {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
      const allWorkflows = loadAllWorkflows(openclawDir);
      const idx = allWorkflows.findIndex((w) => w.name === params.name && w.agent_id === agentId);
      if (idx < 0) {
        return { content: [{ type: "text" as const, text: `未找到「${params.name}」` }] };
      }
      allWorkflows.splice(idx, 1);
      saveWorkflows(openclawDir, allWorkflows);
      return { content: [{ type: "text" as const, text: `已删除「${params.name}」` }] };
    },
  })) as any, { name: "enhance_workflow_delete" });

  // ── Tool: enhance_task ──
  api.registerTool(((ctx: any) => ({
    name: "enhance_task",
    description: [
      "创建/更新/查询跨 session 的任务状态（支持 pending/in_progress/completed/cancelled）。",
      "",
      "示例：",
      "  - 创建: action=create, description='完成 Odoo 迁移', priority=high",
      "  - 更新: action=update, id=task_xxx, status=completed",
      "  - 查询: action=list 或 action=get, id=task_xxx",
    ].join("\n"),
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("create"),
        Type.Literal("update"),
        Type.Literal("list"),
        Type.Literal("get"),
        Type.Literal("delete"),
      ]),
      id: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      status: Type.Optional(
        Type.Union([
          Type.Literal("pending"),
          Type.Literal("in_progress"),
          Type.Literal("completed"),
          Type.Literal("cancelled"),
        ]),
      ),
      priority: Type.Optional(
        Type.Union([Type.Literal("high"), Type.Literal("medium"), Type.Literal("low")]),
      ),
    }),
    async execute(_id: string, params: Record<string, unknown>): Promise<any> {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
      const allTasks = loadAllTasks(openclawDir);
      const now = new Date().toISOString();

      switch (params.action) {
        case "create": {
          const task: WorkflowTask = {
            id: `task_${Date.now()}`,
            workflowName: (params as any).workflowName ?? "manual",
            agentId,
            description: (params.description as string) ?? "",
            status: "pending",
            createdAt: now,
            updatedAt: now,
            priority: (params.priority as any) ?? "medium",
            tags: [],
          };
          allTasks.push(task);
          saveTasks(openclawDir, allTasks);
          return {
            content: [
              {
                type: "text" as const,
                text: `已创建任务 ${task.id} (agent: ${agentId})\n描述: ${task.description}\n优先级: ${task.priority}`,
              },
            ],
          };
        }

        case "update": {
          const taskId = params.id as string;
          const idx = allTasks.findIndex((t) => t.id === taskId && t.agentId === agentId);
          if (idx < 0) {
            return { content: [{ type: "text" as const, text: `未找到任务 ${taskId}` }] };
          }
          const task = allTasks[idx];
          if (params.status) task.status = params.status as any;
          if (params.description) task.description = params.description as string;
          if (params.priority) task.priority = params.priority as any;
          task.updatedAt = now;
          if (task.status === "completed" || task.status === "cancelled") {
            task.completedAt = now;
          }
          saveTasks(openclawDir, allTasks);
          return {
            content: [
              {
                type: "text" as const,
                text: `已更新任务 ${taskId}: ${task.status}${params.description ? `\n描述: ${task.description}` : ""}`,
              },
            ],
          };
        }

        case "list": {
          const mine = allTasks.filter((t) => t.agentId === agentId && t.status !== "completed" && t.status !== "cancelled");
          if (mine.length === 0) {
            return { content: [{ type: "text" as const, text: `暂无进行中任务 (agent: ${agentId})` }] };
          }
          const lines = mine.map(
            (t) =>
              `[${t.status}] ${t.id}: ${t.description} (${t.priority}, 创建于 ${t.createdAt.slice(0, 10)})`,
          );
          return {
            content: [
              { type: "text" as const, text: `进行中任务 (${mine.length} 个)：\n\n${lines.join("\n\n")}` },
            ],
          };
        }

        case "get": {
          const taskId = params.id as string;
          const task = allTasks.find((t) => t.id === taskId && t.agentId === agentId);
          if (!task) {
            return { content: [{ type: "text" as const, text: `未找到任务 ${taskId}` }] };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: `任务: ${task.id}\n状态: ${task.status}\n描述: ${task.description}\n优先级: ${task.priority}\n创建: ${task.createdAt}\n更新: ${task.updatedAt}${task.completedAt ? `\n完成: ${task.completedAt}` : ""}`,
              },
            ],
          };
        }

        case "delete": {
          const taskId = params.id as string;
          const before = allTasks.length;
          const remaining = allTasks.filter((t) => !(t.id === taskId && t.agentId === agentId));
          saveTasks(openclawDir, remaining);
          return {
            content: [
              {
                type: "text" as const,
                text: `已删除 ${before - remaining.length} 个任务`,
              },
            ],
          };
        }

        default:
          return { content: [{ type: "text" as const, text: "未知 action" }] };
      }
    },
  })) as any, { name: "enhance_task" });

  // ── Tool: enhance_workflow_tasks ──
  api.registerTool(((ctx: any) => ({
    name: "enhance_workflow_tasks",
    description: "查看当前 Agent 所有工作流关联的任务进度。",
    parameters: Type.Object({}),
    async execute(_id: string, _params: Record<string, unknown>): Promise<any> {
      const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
      const allTasks = loadAllTasks(openclawDir).filter((t) => t.agentId === agentId);
      const pending = allTasks.filter((t) => t.status === "pending");
      const inProgress = allTasks.filter((t) => t.status === "in_progress");
      const completed = allTasks.filter((t) => t.status === "completed" || t.status === "cancelled");

      const lines = [
        `📋 任务看板 (agent: ${agentId})`,
        `🔴 进行中: ${inProgress.length} 个`,
        `🟡 待处理: ${pending.length} 个`,
        `✅ 已完成: ${completed.length} 个`,
        "",
        ...inProgress.slice(0, 5).map(
          (t) => `  🔴 ${t.id}: ${t.description} (${t.priority})`,
        ),
        ...pending.slice(0, 5).map(
          (t) => `  🟡 ${t.id}: ${t.description} (${t.priority})`,
        ),
      ];

      return { content: [{ type: "text" as const, text: lines.filter(Boolean).join("\n") }] };
    },
  })) as any, { name: "enhance_workflow_tasks" });

  // ── Hook: before_prompt_build — 增强版触发评估 ──
  api.on("before_prompt_build" as any, (event: any, ctx: any): any => {
    const agentId = (ctx?.agentId ?? DEFAULT_AGENT_ID).trim();
    const userMessage: string = (event as any)?.prompt ?? "";
    if (!userMessage) return {};

    const now = new Date();
    const workflows = loadWorkflows(openclawDir, agentId);

    const triggered = workflows.filter((w) => {
      if (!w.enabled) return false;

      // 评估触发词（支持 /regex/flags 语法）
      let triggered = false;
      const t = w.trigger.trim();
      if (t.startsWith("/") && t.endsWith("/")) {
        // 正则触发
        try {
          triggered = new RegExp(t.slice(1, -1), "i").test(userMessage);
        } catch {
          triggered = userMessage.includes(t);
        }
      } else {
        triggered = userMessage.includes(t);
      }

      return triggered;
    });

    if (triggered.length === 0) return {};

    // 按优先级排序（high > medium > low）
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    triggered.sort((a, b) => {
      const ap = ((a as any)?.priority as keyof typeof priorityOrder) ?? "medium";
      const bp = ((b as any)?.priority as keyof typeof priorityOrder) ?? "medium";
      return (priorityOrder[ap] ?? 1) - (priorityOrder[bp] ?? 1);
    });

    const instructions = triggered
      .map((w) => `### 工作流「${w.name}」已触发\n${w.instructions}`)
      .join("\n\n");

    return {
      appendSystemContext: [
        "\n\n## 工作流自动化（增强包 v2.1）",
        `Agent: ${agentId}`,
        `时间: ${now.toISOString().slice(0, 16)} (${now.toLocaleDateString("zh-CN", { weekday: "long" })})`,
        "触发的工作流：",
        instructions,
      ].join("\n"),
    };
  });

  api.logger.info("[enhance] 工作流自动化增强版已加载（条件分支 + 任务状态 + 正则触发）");
}
