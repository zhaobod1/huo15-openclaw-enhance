/**
 * 龙虾增强包 — 类型定义
 */

// ── 默认 Agent ID ──
export const DEFAULT_AGENT_ID = "main";

// ── 结构化记忆 ──
export type MemoryCategory = "user" | "project" | "feedback" | "reference" | "decision";

export interface MemoryEntry {
  id: number;
  agent_id: string;
  category: MemoryCategory;
  content: string;
  tags: string;
  importance: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryConfig {
  enabled?: boolean;
  autoCapture?: boolean;
  maxContextEntries?: number;
}

// ── 工具安全 ──
export type SafetyAction = "block" | "log" | "allow";

export interface SafetyRule {
  tool: string;
  pattern?: string;
  pathPattern?: string;
  action: SafetyAction;
  reason?: string;
}

export interface SafetyConfig {
  enabled?: boolean;
  rules?: SafetyRule[];
  defaultAction?: SafetyAction;
}

// ── 提示词增强 ──
export type PromptSection =
  | "taskClassification"
  | "qualityGuidelines"
  | "memoryContext"
  | "safetyAwareness";

export interface PromptConfig {
  enabled?: boolean;
  sections?: PromptSection[];
}

// ── 工作流 ──
export interface Workflow {
  id: string;
  agent_id: string;
  name: string;
  trigger: string;
  instructions: string;
  enabled: boolean;
  created_at: string;
}

export interface WorkflowConfig {
  enabled?: boolean;
}

// ── 仪表盘 ──
export interface DashboardConfig {
  enabled?: boolean;
}

// ── 插件总配置 ──
export interface EnhancePluginConfig {
  memory?: MemoryConfig;
  safety?: SafetyConfig;
  prompt?: PromptConfig;
  workflows?: WorkflowConfig;
  dashboard?: DashboardConfig;
}
