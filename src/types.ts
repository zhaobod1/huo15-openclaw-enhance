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
/** block: 弹出用户确认对话框（可超时拒绝）；hardblock: 无条件拦截；log: 只记录；allow: 放行 */
export type SafetyAction = "block" | "hardblock" | "log" | "allow";

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
// 注意：taskClassification / safetyAwareness / memoryInstructions 已移除
// 因为 openclaw 内置系统提示词已包含：
//   - "## Execution Bias" 覆盖了任务分类
//   - "## Safety" 覆盖了安全意识
//   - "## Memory Recall" 覆盖了记忆工具说明
// 仅保留 qualityGuidelines（openclaw 无对应内置内容）
export type PromptSection = "qualityGuidelines";

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

// ── 小火苗宠物 ──
export type FlameMood = "idle" | "busy" | "happy" | "excited" | "sleep" | "hungry" | "success" | "tired" | "error";
export type FlameColor = "orange" | "blue" | "purple" | "green" | "white";
export type NotificationLevel = "info" | "success" | "warning" | "error";
export type NotificationSource = "safety" | "memory" | "pet" | "tips" | "workflow";

export interface PetConfig {
  enabled?: boolean;
  name?: string;
  color?: FlameColor;
}

export interface Notification {
  id: number;
  agent_id: string;
  level: NotificationLevel;
  source: NotificationSource;
  title: string;
  detail: string;
  read: boolean;
  created_at: string;
}

export interface NotificationConfig {
  enabled?: boolean;
  maxRetained?: number;
}

export interface NotificationQueue {
  emit(agentId: string, level: NotificationLevel, source: NotificationSource, title: string, detail?: string): void;
  getRecent(agentId?: string, limit?: number): Notification[];
  getUnreadCount(agentId?: string): number;
  markRead(id: number): void;
  prune(maxRetained: number): void;
}

// ── 智能贴士 ──
export type TipCategory = "shortcuts" | "memory" | "workflow" | "safety" | "general";

export interface Tip {
  id: string;
  category: TipCategory;
  text: string;
  weight?: number;
}

export interface TipsConfig {
  enabled?: boolean;
  cooldownMinutes?: number;
  injectInPrompt?: boolean;
}

// ── 插件总配置 ──
export interface EnhancePluginConfig {
  memory?: MemoryConfig;
  safety?: SafetyConfig;
  prompt?: PromptConfig;
  workflows?: WorkflowConfig;
  dashboard?: DashboardConfig;
  pet?: PetConfig;
  tips?: TipsConfig;
  notifications?: NotificationConfig;
}
