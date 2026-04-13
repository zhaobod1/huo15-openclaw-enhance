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
  /** 是否启用自动重试（429指数退避/5xx重试/网络超时重试），默认 true */
  enableRetry?: boolean;
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
export type FlameColor = "orange" | "blue" | "purple" | "green" | "white";
export type FlameSize = "tiny" | "small" | "medium" | "large";
export type FlameMood = "idle" | "busy" | "error" | "success" | "sleep";

export interface FlameStats {
  warmth: number;
  brightness: number;
  stability: number;
  spark: number;
  endurance: number;
}

export interface FlamePet {
  agent_id: string;
  name: string;
  color: FlameColor;
  size: FlameSize;
  level: number;
  xp: number;
  total_xp: number;
  mood: FlameMood;
  stats: FlameStats;
  personality: string;
  created_at: string;
  updated_at: string;
}

export interface PetConfig {
  enabled?: boolean;
  name?: string;
  color?: FlameColor;
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
  injectInPrompt?: boolean;
  cooldownMinutes?: number;
}

// ── 通知中心 ──
export type NotificationLevel = "info" | "warn" | "success";
export type NotificationSource = "safety" | "memory" | "pet" | "tips" | "workflow";

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

// ── 输出自检 ──
export interface SelfCheckConfig {
  enabled?: boolean;
  checkEmpty?: boolean;
  checkNoReply?: boolean;
  checkErrorKeywords?: boolean;
  checkExcessiveLength?: boolean;
  maxLength?: number;
  errorKeywords?: string[];
  blockOnEmpty?: boolean;
}

// ── Context 裁剪 ──
export interface ContextPrunerConfig {
  enabled?: boolean;
  /** 相关性阈值（0-1），低于此分数的记忆被过滤，默认 0.25 */
  threshold?: number;
  /** 最多注入多少条记忆，默认 10 */
  maxEntries?: number;
  debug?: boolean;
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
  selfCheck?: SelfCheckConfig;
  contextPruner?: ContextPrunerConfig;
}
