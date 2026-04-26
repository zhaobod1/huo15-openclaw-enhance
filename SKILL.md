---
name: huo15-openclaw-enhance
description: "火一五·克劳德·龙虾增强插件 v5.7.4 — config-doctor 扩展：扫所有已装插件的 bare pluginApi（违反 '>=X.Y.Z' 规则会被 openclaw 拒绝，报错"插件要求 X.Y.Z"）；扫 ~/.openclaw/extensions/ + node_modules/@huo15/* 等路径，给 python3 inline 修复命令。继承 v5.7.3 openclaw.json 陷阱诊断（reserveTokensFloor / model maxTokens）+ v5.7.2 hardening（Map LRU + safety_log TTL + corpus tag 黑名单）+ v5.7.1 移除 before_compaction 噪音 hook + memory_purge + v5.7 transcript-search + v5.6 工具分层；三层记忆协调；session-recap；statusline；spawn_task；ExitPlanMode；捆绑 11 个配套 skill"
version: 5.7.4
homepage: https://cnb.cool/huo15/ai/huo15-openclaw-enhance
metadata: { "openclaw": { "emoji": "🦞", "requires": { "bins": [] } } }
---

# 火一五·克劳德·龙虾增强插件 v5.7.4

## 简介

`@huo15/openclaw-enhance` 是 **OpenClaw 2026.4.22+** 的**非侵入式**增强插件，对标 Claude Code 的 Agent Harness 体验。

**核心原则**：凡是龙虾原生有的功能一律不复制，重叠处以龙虾为准；只补龙虾没有的 Claude-Code 体验。

## v5.7.4 config-doctor 扩展：扫已装插件 bare pluginApi（2026-04-26 同日）

**用户反馈**："提示插件要求 2026.2.24，但是我的 openclaw 已经是 2026.4.22"

**根因**：openclaw plugin compat 规则要求 `compat.pluginApi` 必须是 ranged spec（`>=X.Y.Z` / `^X.Y.Z` / `~X.Y.Z`）。**bare 字符串（如 `"2026.2.24"` 没前缀）= 精确匹配**，与当前 openclaw 不匹配时启动失败。用户实测：

- `~/.openclaw/extensions/tips/package.json` v1.0.0 → `pluginApi: "2026.4.11"` ❌
- `~/.openclaw/node_modules/@huo15/huo15-huihuoyun-odoo/package.json` v1.2.0（npm peerDep 残留）→ `pluginApi: "2026.2.24"` ❌

**新增**：`config-doctor` 启动期扫描 `~/.openclaw/extensions/*` + `~/.openclaw/node_modules/@huo15/*` + 无 scope 的 `node_modules/*`，对每个声明 `openclaw.extensions` 的包检查 `compat.pluginApi`。bare 命中 → 推仪表盘 + log warn + 给可粘贴 fix 命令。

```
⚠️ [plugin-bare-pluginApi] 已装插件 @huo15/wecom-tips 的 openclaw.compat.pluginApi="2026.4.11" 是 bare 版本，会被解读为精确匹配...
   → 修复: python3 -c "..."（一行 inline）
```

## v5.7.3 config-doctor（2026-04-26 同日）

直击用户高频反馈"装上插件还是 'Context limit exceeded'" — 根因往往不在插件，而在 `~/.openclaw/openclaw.json` 的两处陷阱：

1. **缺失 `agents.defaults.compaction.reserveTokensFloor`** — openclaw 4.22 把这个字段嵌套到 `agents.defaults` 里（4.11 时是顶层 `compaction`），老用户配置文件没自动迁移，用 4.22 默认值（很小）→ 长 session 必爆
2. **某个 model 的 `maxTokens` 占 `contextWindow` 一半以上** — 例如 MiniMax-M2.7 默认 maxTokens=131072 / contextWindow=204800，每轮预留输出就吃掉 64% budget。openclaw 把 maxTokens 当作"必须留给输出的 reserve"，剩 73k 给 input/tools/memory，**任意几轮就爆**

### 新增

- **`src/modules/config-doctor.ts`** — 启动期 sync 读 openclaw.json 检查上述两类陷阱，发现后用 `notifyQueue.emit("config-doctor", ...)` 推到仪表盘 + log warn + 给可粘贴的 fix 命令（python3 一行原地改 JSON，**不调 child_process**）
- **工具：`enhance_config_doctor`** — 无参数，agent / 用户随时调一下，重新跑诊断（修完了配置可以再跑确认 ✅）
- **配置项：`config.configDoctor`** — `enabled` / `minReserveTokensFloor`（默认 5000）/ `maxReserveTokensFloor`（默认 100000）/ `maxModelMaxTokens`（默认 32000）

### 红线遵守

- **完全只读** ~/.openclaw/openclaw.json（红线 #1：不侵入式修改 openclaw）
- **不调 child_process**（红线 #4） — 修复命令是 python3 inline，由用户/cron-cli 执行
- **不暴露在 minimal 之外**？反过来：**tier=1 minimal 也启用** — 这是关键的"防爆 context"诊断，每个用户都该有

## v5.7.2 hardening（2026-04-26 同日）

继 v5.7.1 hot-fix 之后，对全代码库做了一次审计，修复 4 类潜在 bug：

- **进程内 Map LRU 上限** — `mode-gate` 的 `modeState` / `plannedActions` 和 `session-recap` 的 `lastRecapAt` 之前 keyed by `agentId::sessionId` **跨 session 永不清**。WeCom 多用户场景下 100+ session 会无限累积。现在加 200/200/500 三档 LRU cap，活跃 session 重新插入刷新顺序，老 session 自动淘汰
- **safety_log / notifications 启动期 TTL** — `getDb()` 时跑一次 `DELETE WHERE created_at < datetime('now', '-90 days')`，避免长期运行库无限增长。新增 `purgeOldSafetyLogs(retentionDays)` helper 给运维调
- **memory corpus tag 黑名单** — `auto-compact` / `auto-checkpoint` / `audit` / `internal` 这 4 个保留 tag 在 `scoreRelevance()` 入口直接 return 0，永不召回到 prompt（防御未来 hook 万一又写入 noise）
- **enhance_memory_store 拒收保留 tag** — 用户/agent 显式调 store 时若 tags 含保留词，立即返回错误而非写入

### bump openclaw peerDep `^2026.4.22`

之前 peerDep `>=2026.4.11`，但 npm global 已升到 2026.4.22（差 11 个 patch）。本地 SDK 类型定义同步升级；hook 名验证全部仍存在（`before_prompt_build` / `before_tool_call` / `after_tool_call` / `before_compaction` / `before_agent_reply`），无破坏性变更。

## v5.7.1 hot-fix（2026-04-26）

- **删除 `before_compaction` 噪音 hook** — 之前每次 openclaw auto-compact 都会以 `decision` 类、`auto-compact` tag 写入一条「[auto-compact] 对话上下文已压缩…」记忆。实测单 agent 24 小时积累 613 条全是噪音，关键词命中率虚高 0.4-0.5（过 corpus pruner 默认 0.5 阈值），把真正的 user/project/feedback 决策记忆挤出 prompt 上下文
- **新增工具 `enhance_memory_purge`** — 按 `tag` / `category` / `contentLike` 批量清理当前 agent 记忆，`dry_run` 默认 true（仅预览匹配数）。一键清理历史噪音：`enhance_memory_purge tag="auto-compact" dry_run=false`
- **首次启动自动迁移**：升级到 5.7.1 后即不再生成新噪音；旧噪音留待用户用 purge 工具或直接 SQL 清

## v5.7 新特性（2026-04-25）

- **历史会话搜索（transcript-search）** — 照搬 Claude Desktop `transcriptSearchWorker` 算法（解包 `/Applications/Claude.app/Contents/Resources/app.asar` 抽出参考实现）：
  - 流式扫 `~/.openclaw/agents/<agentId>/sessions/*.jsonl`，行级 JSON.parse
  - `extractText` 兼容 `string` / `[{type:"text", text}]` 数组
  - `indexOf` 子串匹配 + ±80 字符 snippet
  - 79 个 session 中扫 30 个 → 3–5 ms 找到 5 个 hits（实测）
  - 完全只读、不建索引、不建表 — 不动 openclaw 任何东西
- **工具：`enhance_transcript_search`** — `query` 必填；可选 `agentId / limit / includeReset / caseSensitive`
- 模块 tier=2，默认 balanced/full 即可见（minimal 下不暴露）

## v5.6 新特性（2026-04-24）

- **工具分层（toolTier）** — 按 minimal/balanced/full 三档暴露工具 schema，降低每轮 prompt 固定底座（解决长会话 context 提早爆满）
  - `minimal`（10 工具）：仅核心层 — 记忆 / 状态栏 / spawn / 模式 / 章节 / installer / integrator
  - `balanced`（18 工具，默认）：+ todo / 章节 / 定时任务桥
  - `full`（26 工具）：+ workflow / safety / task-planner / session-recap / skill-doctor
- **Workflow 5→2 工具合并** — `enhance_workflow_define / _list / _delete / _tasks / enhance_task` 合并为 `enhance_workflow`（action=define/list/delete/tasks）+ `enhance_task`（保留独立 action 派发器）
- **工具描述全面压缩** — 26 个工具描述从 ~4610 字符 → ~1750 字符（-62%），每轮 prompt 节省约 1400 token，prompt cache 更稳

## 一键安装

```bash
openclaw plugins install @huo15/openclaw-enhance
openclaw restart
```

安装后访问仪表盘：`http://localhost:18789/plugins/enhance/`

## 核心能力

- **分类记忆（corpus supplement + 两段式）** — user / project / feedback / reference / decision 五类，额外支持 `why`（背景/约束）和 `howToApply`（套用时机），对齐 Claude Code feedback/project 记忆体例；通过 `registerMemoryCorpusSupplement` 合入龙虾原生 memory 搜索，**不自建第二套向量库**；搜索结果 deterministic 排序（score → importance → updated → id）保持 prompt cache 稳定
- **工具安全观察员** — 只分类错误 + 建议退避，完全尊重龙虾 `tools.allow/deny`
- **任务 / 章节 / 模式闸门 + ExitPlanMode** — TodoWrite / mark_chapter / plan-explore 模式；`enhance_exit_plan_mode` 在 plan 模式下提交计划给用户审批，自动把计划期间被拦截的写入意图打包成 decision 记忆
- **状态栏（含可观测性）** — `enhance_statusline` 额外展示当前模型、思考档、fast 模式、消息通道、会话 ID；HTTP 端点 `/plugins/enhance/api/statusline` 输出 JSON 供仪表盘嵌入
- **技能巡检 / 子任务一键派发** — `enhance_spawn_task` 返回可直接粘贴到终端的 `openclaw agent` CLI 命令，支持跨 agent 派发和思考档选择
- **定时任务桥** — 登记定时工作流时返回一条 `openclaw cron add` 命令；**调度归龙虾 cron-cli**，插件只管触发时注入 instructions
- **多 Agent 隔离** — 完美适配 WeCom 插件的动态 Agent，记忆/任务/章节/宠物全部按 `agentId` 隔离
- **增强仪表盘** — 小火苗宠物 + 记忆/任务/章节/定时全景

## 与龙虾原生的关系

| 能力 | 龙虾原生 | enhance 策略 |
|------|---------|--------------|
| 记忆向量库 | ✅ 龙虾负责 | 不复制，改为 corpus supplement 并入搜索 |
| 工具 allow/deny | ✅ 龙虾负责 | 只观察，不拦截 |
| Cron 调度 | ✅ 龙虾 cron-cli | 不管理调度，只在触发时注入上下文 |
| 技能安装 | ✅ ClawHub | 只读巡检，不擅自安装 |

## 增强技能（自动注入 `workspace/skills/`）

**工作流模式（4 个）**

- `huo15-openclaw-plan-mode` — 结构化规划模式
- `huo15-openclaw-explore-mode` — 深度探索模式
- `huo15-openclaw-verify-mode` — 验证检查模式
- `huo15-openclaw-memory-curator` — 记忆整理

**设计能力（v5.4 新增，对标 Anthropic frontend-design + huashu-design 生态）**

- `huo15-openclaw-frontend-design` — 高保真 Web UI 原型 + 5 美学流派 + 反 AI Slop 硬红线
- `huo15-openclaw-design-director` — 设计方向顾问（3 方向反差对比 + 强制推荐）
- `huo15-openclaw-brand-protocol` — 品牌规范抓取（Ask/Search/Download/Verify/Codify 5 步）
- `huo15-openclaw-design-critique` — 5 维设计评审（美学/可用性/品牌/内容/实现）

**开发辅助（v5.5.1 新增，对标 Claude Code /simplify / /security-review / /review）**

- `huo15-openclaw-simplify` — 代码简化三维审查（复用/质量/效率）+ 分级修复清单
- `huo15-openclaw-security-review` — 六类漏洞矩阵（密钥/注入/XSS/SSRF/权限/依赖）+ CVSS 分级
- `huo15-openclaw-code-review` — PR 五维综合评审（设计/实现/测试/安全/可维护）+ 可粘贴评论

详见 [README.md](./README.md) 与 [CHANGELOG.md](./CHANGELOG.md)。

## 链接

- npm: https://www.npmjs.com/package/@huo15/openclaw-enhance
- 仓库: https://cnb.cool/huo15/ai/huo15-openclaw-enhance
- License: MIT
- 公司: 青岛火一五信息科技有限公司 — www.huo15.com
