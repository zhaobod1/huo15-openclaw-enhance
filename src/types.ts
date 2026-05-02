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
  /** 该条记忆为什么值得记 — 通常是背景、约束、踩过的坑 */
  why?: string;
  /** 记忆适用场景 — 未来会话何时/如何套用这条 */
  how_to_apply?: string;
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
export type NotificationSource = "safety" | "memory" | "pet" | "tips" | "workflow" | "config-doctor" | "session-doctor";

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
  /** 相关性阈值（0-1），低于此分数的记忆被过滤，默认 0.5 */
  threshold?: number;
  /** 最多注入多少条记忆，默认 5 */
  maxEntries?: number;
  debug?: boolean;
}

// ── KB Corpus（共享知识库 → 龙虾 memory corpus 桥接） ──
export interface KbCorpusConfigType {
  enabled?: boolean;
  /** 共享 KB 根目录，默认 ~/.openclaw/kb/shared */
  sharedKbPath?: string;
  /** 相关性阈值（0-1），默认 0.3 */
  threshold?: number;
  /** 单次 search 最多返回几条，默认 5 */
  maxResults?: number;
  debug?: boolean;
}

// ── Todos ──
export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoEntry {
  id: number;
  agent_id: string;
  session_id: string;
  content: string;
  active_form: string;
  status: TodoStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TodoConfig {
  enabled?: boolean;
}

// ── Chapter marks ──
export interface ChapterMark {
  id: number;
  agent_id: string;
  session_id: string;
  title: string;
  summary?: string;
  created_at: string;
}

export interface ChapterConfig {
  enabled?: boolean;
}

// ── Mode gate ──
export type AgentMode = "normal" | "plan" | "explore";

export interface ModeConfig {
  enabled?: boolean;
  defaultMode?: AgentMode;
}

// ── Statusline / Scheduled tasks ──
export interface StatuslineConfig {
  enabled?: boolean;
}

export interface ScheduledTasksConfig {
  enabled?: boolean;
}

// ── Transcript search (v5.7) ──
/**
 * 历史会话全文搜索（流式扫 ~/.openclaw/agents/<agentId>/sessions/*.jsonl）。
 * 算法照搬 Claude Desktop 的 transcriptSearchWorker：行级 JSON.parse + indexOf + ±80 字符 snippet。
 * 完全只读 openclaw session 目录，不建表、不建索引。
 */
export interface TranscriptSearchConfig {
  enabled?: boolean;
}

// ── Session Lifecycle (v5.7.7) ──
/**
 * 接入 openclaw 4.22 的 session_start / session_end / before_reset /
 * subagent_spawned / subagent_ended 五个 hook，闭环 session 生命周期。
 * 写入用专用 tag `lifecycle-flush` 避免被 corpus pruner 当成决策记忆召回（v5.7.2 黑名单逻辑）。
 */
export interface SessionLifecycleConfig {
  enabled?: boolean;
  /** 接 session_start hook：新会话起点加章节占位（仅 idle > 30min 时） */
  enableSessionStart?: boolean;
  /** 接 session_end hook：会话结束自动 mark_chapter + flush in_progress todo 到 project memory */
  enableSessionEnd?: boolean;
  /** 接 before_reset hook：reset 前最后机会抢救 in_progress + 最近章节到 decision memory */
  enableBeforeReset?: boolean;
  /** 接 subagent_spawned/ended hook：spawn 链路自动落 chapter */
  enableSubagent?: boolean;
  debug?: boolean;
}

// ── Skill Recommender (v5.7.5) ──
/**
 * 按用户需求挑已装 skill / 推荐未装 huo15-* / 给自建规划。
 * 算法灵感：反编译 Claude Desktop loadSkills + "Available skills: ${list}." prompt 注入；
 * enhance 改成按需工具避免每轮 prompt 占 schema。
 */
export interface SkillRecommenderConfig {
  enabled?: boolean;
  /** 已装 skill 命中相关度的阈值（< 阈值视为"没找到"，触发未装/自建建议），默认 0.25 */
  installedThreshold?: number;
  /** 启动期扫描结果缓存 TTL（秒），默认 60 */
  cacheTtlSec?: number;
}

// ── Config doctor (v5.7.3) ──
/**
 * 启动期诊断 ~/.openclaw/openclaw.json 的常见配置陷阱：
 * - 缺失 agents.defaults.compaction.reserveTokensFloor（4.22 默认值过小）
 * - reserveTokensFloor < 5000 或 > 100000
 * - 各 model maxTokens ≥ contextWindow/2 且 > 32000（吃掉太多输出预算导致 'Context limit exceeded'）
 * 工具 enhance_config_doctor 让用户主动诊断并拿到 fix 命令。
 * 完全只读 openclaw.json，不修改用户配置。
 */
export interface ConfigDoctorConfig {
  enabled?: boolean;
  /** 推荐的 reserveTokensFloor 下限阈值，默认 5000 */
  minReserveTokensFloor?: number;
  /** 推荐的 reserveTokensFloor 上限阈值，默认 100000 */
  maxReserveTokensFloor?: number;
  /** 推荐 model maxTokens 上限，默认 32000；超过会警告 */
  maxModelMaxTokens?: number;
}

/**
 * v5.7.16 trajectory 体量诊断
 * 扫描 ~/.openclaw/agents/*\/sessions/*.trajectory.jsonl，超大时给归档 cliCmd。
 * 触发场景：openclaw-control-ui webchat 反复 sessions.list 时，gateway 主线程
 * 在 V8 JsonParser 上被超大 trajectory 钉死（symptom: 99% CPU + sessions.list 12s+）。
 * 只读，不删不改不归档。
 */
export interface SessionDoctorConfig {
  enabled?: boolean;
  /** 单文件 ≥ 多少 MB 触发 warn，默认 20 */
  warnSingleFileMB?: number;
  /** 累计 ≥ 多少 MB 触发 warn，默认 200 */
  warnTotalMB?: number;
  /** 批量归档命令里 mtime 阈值（多少天前才允许归档），默认 7 */
  archiveAgeDays?: number;
  /** 输出 top N 大文件路径，默认 5 */
  topN?: number;
}

/**
 * v5.7.20 trajectory 自动归档（macOS LaunchAgent）
 * 给出"一次性部署 + 每日 03:00 自动归档"的命令，由 launchd 调度跑 find -mtime -size -mv。
 * plugin 自己不执行 mv（红线 #5 诊断不修复 + 红线 #4 不 child_process）。
 */
export interface TrajectoryArchiverConfig {
  enabled?: boolean;
  /** LaunchAgent label，默认 ai.huo15.openclaw.trajectory-archiver */
  label?: string;
  /** mtime 阈值（天）；早于此天数才归档；默认 1 */
  archiveAgeDays?: number;
  /** size 阈值（MB），≥ 才归档；默认 5 */
  archiveMinSizeMB?: number;
  /** 触发时刻 hour（0-23）；默认 3 */
  scheduleHour?: number;
}

// ── 工具分层（v5.6 新增） ──
/**
 * 工具分层：
 * - minimal: 仅 L1 常驻层（~10 工具）— 仅核心功能（记忆 / 状态栏 / spawn / 模式 / 章节 / installer）
 * - balanced: L1 + L2（~18 工具）— 默认值，加上 todo / chapter / 定时任务桥
 * - full: 全部（~26 工具，workflow 合并后）— 完整功能
 *
 * 目的：降低每轮 prompt 里的工具 schema 总量，缓解 context 填满压力。
 * 现象：所有工具 schema 每轮都会全量发给模型，工具越多，单轮固定底座越高。
 * 修改 toolTier 后需重启 openclaw 生效。
 */
export type ToolTier = "minimal" | "balanced" | "full";

// ── 插件总配置 ──
export interface EnhancePluginConfig {
  /** 工具分层预设，v5.6 新增。默认 "balanced"。 */
  toolTier?: ToolTier;
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
  todos?: TodoConfig;
  chapters?: ChapterConfig;
  mode?: ModeConfig;
  statusline?: StatuslineConfig;
  scheduledTasks?: ScheduledTasksConfig;
  kbCorpus?: KbCorpusConfigType;
  sessionRecap?: SessionRecapConfigType;
  transcriptSearch?: TranscriptSearchConfig;
  /** v5.7.3: 启动期诊断 openclaw.json 陷阱配置 */
  configDoctor?: ConfigDoctorConfig;
  /** v5.7.16: 启动期诊断 trajectory.jsonl 体量(防 gateway sessions.list 卡 CPU) */
  sessionDoctor?: SessionDoctorConfig;
  /** v5.7.20: trajectory 自动归档（输出 macOS LaunchAgent 部署 cliCmd） */
  trajectoryArchiver?: TrajectoryArchiverConfig;
  /** v5.7.5: 按用户需求挑已装 skill / 推荐未装 / 给自建规划 */
  skillRecommender?: SkillRecommenderConfig;
  /** v5.7.7: 接入 openclaw 4.22 的 session_start/end/before_reset/subagent_* hook 闭环 session 生命周期 */
  sessionLifecycle?: SessionLifecycleConfig;
  /** v5.7.10: 主动 surface 龙虾原生 .md memory 文件锚点(解决"第二天失忆") */
  nativeMemorySurfacer?: NativeMemorySurfacerConfigType;
  /** v5.7.22: BOT 文件分享桥（企微/钉钉无法直传大文件时的兜底，内网穿透 + 临时 URL） */
  botShare?: BotShareConfig;
  /** v5.7.26: 跨 reset 把上次会话末尾对话拉回当前 prependContext */
  sessionBridge?: SessionBridgeConfigType;
  /** v5.8.0: 量化 OpenClaw 端到端首字延迟（log-tailer + profileHook + enhance_hook_doctor 工具） */
  hookProfiler?: HookProfilerConfig;
  /** v5.7.12 / v5.8.3 接入: before_model_resolve hook 多供应商路由 + sidus 降权兜底 */
  modelRouter?: ModelRouterConfig;
}

/**
 * v5.8.3 模型路由器配置：interface 简单（路由实现完全 hardcode 在 model-router.ts）。
 * 当前唯一 config 就是 enabled 开关；未来可扩展 PROVIDER_REGISTRY override / 黑名单等。
 */
export interface ModelRouterConfig {
  enabled?: boolean;
}

// ── Session Bridge (v5.7.26) ──
/**
 * 跨 reset/compact 自动桥接上次会话末尾对话。
 * 触发：当前 session 文件刚起（< freshSessionMaxBytes）+ 同 chat_id 的 .jsonl.reset.* 在 priorMaxAgeHours 内
 *      + idle ≥ bridgeIdleMinutes → 拉末 N 条 message 注入 prependContext。
 * 解决场景：openclaw runtime 把活跃 session 硬 reset 时不发 before_reset，lifecycle 抢救漏的盲区。
 */
export interface SessionBridgeConfigType {
  enabled?: boolean;
  bridgeIdleMinutes?: number;
  priorMaxAgeHours?: number;
  tailMessages?: number;
  maxChars?: number;
  freshSessionMaxBytes?: number;
  debug?: boolean;
}

/**
 * v5.7.22 BOT 文件分享桥（enhance_share_file / list / revoke）
 *
 * 解决企微/钉钉等渠道无法直传大文件（>20-50MB），需要给用户一个内网穿透下的临时下载链接。
 * 用户用 FRP/Nginx 把内网静态目录反代到公网（如 Keepermac.huo15.com → localhost:18789），
 * 本插件把 LLM 指定的本地文件投递到 <shareRoot>/files/<token>-<basename>，返回
 *   <baseUrl><urlPrefix>/<token>-<basename>
 * URL 给 LLM 直接发用户。
 *
 * baseUrl 优先级：env BOT_BASE_URL > pluginConfig.botShare.baseUrl > http://localhost:18789。
 */
export interface BotShareConfig {
  enabled?: boolean;
  /** 公网 base URL（不含尾部 /）。优先级：env BOT_BASE_URL > 此配置 > http://localhost:18789 */
  baseUrl?: string;
  /** 落盘根目录（web server 应该 alias 到 <shareRoot>/files），默认 ~/.openclaw/share */
  shareRoot?: string;
  /** URL 路径前缀（对应 nginx alias 挂载位置），默认 /share */
  urlPrefix?: string;
  /** 链接默认过期小时数，默认 24 */
  expireHours?: number;
  /** 单文件最大 MB，默认 500 */
  maxFileSizeMB?: number;
}

// ── Hook Profiler (v5.8.0) ──
/**
 * 量化 OpenClaw 端到端首字延迟。三路数据汇合到 enhance-memory.sqlite：
 *  - log-tailer 解析 ~/.openclaw/logs/gateway.err.log 的 [trace:embedded-run] prep stages
 *    + [hooks] handler timeout/threw 行
 *  - profileHook wrapper 包装 enhance 自家 hook 精确测时
 *  - enhance_hook_doctor 工具输出 P50/P95/timeout 排行 + 行动建议
 * 完全不动 openclaw 核心，不替用户改 openclaw.json（红线 #1 + #5）。
 * 实测痛点：用户首字延迟 p50=9.9s/p95=38.8s 不知慢在哪。
 */
export interface HookProfilerConfig {
  enabled?: boolean;
  /** 数据保留天数，默认 30 */
  retentionDays?: number;
  /** log-tailer 子模块开关 */
  tailer?: {
    enabled?: boolean;
  };
}

export interface NativeMemorySurfacerConfigType {
  enabled?: boolean;
  /** 显式指定 memory 目录;不指定则按 cwd 推断 (~/.claude/projects/-<cwd-key>/memory) */
  memoryDir?: string;
  /** 单次注入最多展示的文件数,默认 5 */
  maxFiles?: number;
  /** 单文件 description 截断长度,默认 80 */
  descriptionMaxChars?: number;
  /** 评分阈值 (0-1),低于此分数的文件不进入 surface,默认 0.15 */
  threshold?: number;
  debug?: boolean;
}

export interface SessionRecapConfigType {
  enabled?: boolean;
  /** idle 判定阈值（分钟），默认 75 */
  recapIdleMinutes?: number;
  /** 两次 recap 最小间隔（分钟），防抖，默认 30 */
  recapMinIntervalMinutes?: number;
  /** recap 里最多展示章节数，默认 1 */
  maxChapters?: number;
  /** recap 里最多展示 todo 数，默认 3 */
  maxTodos?: number;
  /** recap 里最多展示 decision 记忆数，默认 2 */
  maxDecisions?: number;
}
