# CHANGELOG

本插件语义化版本号与龙虾适配版本解耦：`package.json.version` 为插件自身的发布版本，`openclaw.build.openclawVersion` 为目标龙虾版本。

## 5.6.0 — 2026-04-24（工具分层 + workflow 5→2 合并 + 描述压缩）

针对实际使用中"long session 仅 15% 上下文使用率即触发 Context limit exceeded"的现象做容量优化。根因有二：(a) 用户的 `~/.openclaw/openclaw.json` 把 `compaction.reserveTokensFloor` 误设为 `200000`（>205k 总窗），每次压缩都失败 — 需要用户侧改回 `20000`；(b) 插件这边一次性暴露 29 个工具 schema，每轮 prompt 固定底座过重。本版本聚焦 (b)。

### 新增

- **`types.ts: ToolTier` 类型 + `EnhancePluginConfig.toolTier`** — 新增工具分层枚举 `"minimal" | "balanced" | "full"`，默认 `"balanced"`。
- **`openclaw.plugin.json: configSchema.toolTier`** — 暴露给龙虾配置 UI，三档可选。

### 变更

- **`index.ts`** — 模块清单增加 `tier: 1 | 2 | 3` 字段；启动期按 `TIER_MAX[toolTier]` 过滤，超出层级的工具模块整个不 register（连 schema 都不进 prompt）。
  - tier 1 常驻层（minimal 即可见，10 工具）：结构化记忆 / 状态栏 / spawn / 模式闸门 / 章节标记 / installer / integrator
  - tier 2 均衡层（balanced 默认，+8 工具，共 18）：todo / 章节 / 定时任务桥
  - tier 3 完整层（full，+8 工具，共 26）：workflow / safety / task-planner / session-recap / skill-doctor
  - 非工具模块（仪表盘、通知、自检、prompt-enhancer、kb-corpus）一律 tier 1：它们不占 tool schema、不影响 per-turn 成本。
- **`workflow-hooks.ts` 5→2 工具合并** — `enhance_workflow_define / _list / _delete` 三个独立工具合并为单一 `enhance_workflow`（`action=define/list/delete/tasks`）；`enhance_task` 保留独立但仍是 action 派发器。`before_prompt_build` 触发逻辑、所有工作流持久化和评估辅助函数全部保留。
- **批量描述压缩** — 24 个工具的 description 字段从多行 `[...].join("\n")` 压成单行 ≤ 80 字符；总字符量 ~4610 → ~1750（-62%），按中文 ≈0.5 token/字 估算每轮 prompt 节省约 1400 token。压缩注重保留触发关键词，不改 parameters schema。
  - 最大幅压缩：`enhance_memory_store`（~700 字 → 38 字）、`enhance_exit_plan_mode`、`enhance_install_skills`
  - `enhance_todo_list` 已经 ≤ 80 字，未改

### 行为变化

- 默认 `balanced` 模式下 **不暴露** workflow / safety / task-planner / session-recap / skill-doctor 工具。如果你需要这些能力（特别是工作流自动化和 plan-mode-审批闭环），请在 `openclaw.json.plugins.enhance` 配置里加 `"toolTier": "full"` 并重启。
- session-recap 的 `before_prompt_build` hook 在 balanced 下**不**生效（模块整体没注册）；如果你依赖 75min idle 自动回顾，需 `toolTier: "full"`。
- 升级后总工具数 29 → 26（workflow 5→2），即使切回 full 也比 v5.5.1 少 3 个。

### 配置示例

```jsonc
// ~/.openclaw/openclaw.json
{
  "plugins": {
    "enhance": {
      "toolTier": "minimal"   // 极致省 schema，仅留 10 工具
      // "toolTier": "full"   // 全功能，26 工具
    }
  },
  "compaction": {
    "reserveTokensFloor": 20000   // ⚠️ 不要设 200000，会比总窗还大
  }
}
```

### 不破坏的兼容点

- 所有工具名（`enhance_*`）都保留，旧的 `enhance_workflow_define` 等命名外部没用过（只在内部 register），改成 `enhance_workflow` 不破坏任何用户脚本。
- SQLite schema 完全没动；现有记忆 / 任务 / 章节数据无需迁移。
- npm 包对外 API 没变（`definePluginEntry` 出口不变）。

### 修复（顺手）

- **session-recap.ts** — `buildRecapText` 引用了 `MemoryEntry` 上不存在的 `key` / `rule` 字段（v5.5.1 编译错但未被 CI 拦下），全 full tier 场景下生成 decision 段会运行时抛 `TypeError`。修正为 `d.content` 后兼容正确字段并裁切 80 字符。

### 调研依据

参见本仓库 [`docs/v5.6-context-pressure-postmortem.md`](./docs/v5.6-context-pressure-postmortem.md)（如该文件存在），以及本地 KB 条目 `~/knowledge/huo15/2026-04-24-openclaw-context-pressure-postmortem.md`。

---

## 5.5.1 — 2026-04-24（session-recap + 3 个开发辅助 skill）

在 v5.5.0「三层记忆协调」基础上，对齐 Claude Code 2026 Q2 最新能力谱调研结果，补齐两块高频能力：**会话回顾**与**开发辅助三件套**。

### 新增（plugin 模块）

- **`src/modules/session-recap.ts`** — 对齐 Claude Code 75min idle auto-summary。当检测到当前 agent/session 距上次活动 > `recapIdleMinutes`（默认 75），在 `before_prompt_build` 自动 prependContext 一段"你上次到这儿"的回顾（最近章节 + in_progress/pending todo + 最近 decision 记忆）。
  - 工具 `enhance_session_recap` 支持手动触发（不受 idle 阈值限制）
  - 进程内防抖表避免重复 recap：两次间隔 < `recapMinIntervalMinutes`（默认 30）直接 skip
  - 非侵入：只读三张已有表（chapters / todos / memories），**不建新表、不改现有 schema**
  - 可通过 `config.sessionRecap.enabled = false` 关闭
- **`types.ts: SessionRecapConfigType`** — 新配置段 `config.sessionRecap`。

### 新增（3 个开发辅助 skill，通过 huo15-skills 分发）

对齐 Claude Code 原生 `/simplify` / `/security-review` / `/review` 三件套，全部自研、MIT：

- **`huo15-openclaw-simplify` v1.0.0** — 代码简化三维审查（复用 / 质量 / 效率）+ 分级修复清单 + 🔴必改/🟡建议/🟢可选。严格硬红线：不跨文件重命名、不改测试断言、不引入新依赖、不跑格式化器、不碰 generated 代码。
- **`huo15-openclaw-security-review` v1.0.0** — 六类漏洞矩阵（密钥 / 注入 / XSS / SSRF / 权限 / 危险依赖）+ CVSS-like 四档严重度（🔴Critical / 🟠High / 🟡Medium / 🟢Low）+ CWE 编号对照。硬红线：不 exec `npm audit`、不改历史、不明文打印密钥。
- **`huo15-openclaw-code-review` v1.0.0** — PR 五维综合评审（设计 / 实现 / 测试 / 安全 / 可维护）+ 可粘贴 markdown 评论。`gh` CLI 命令走 return-cliCmd 模式（禁 child_process 铁律）。硬红线：不 `gh pr review --approve`、不 `gh pr merge`、不自动 `gh pr comment`。

### 变更（enhance 插件内）

- **`skill-installer.ts`**：`CLAW_HUB_SKILLS` 从 8 扩到 **11**（+simplify / security-review / code-review）。
- **`skill-doctor.ts`**：`EXPECTED_SKILLS` 同步到 11；tool description 从"8 个"改"11 个"。
- **`index.ts`**：新增「会话回顾」模块条目，默认启用。

### 设计决策：为什么 session-recap 是 Plugin 而非 Skill

参照 [MEMORY.md Plugin vs Skill Decision](../../../.claude/projects/-Users-jobzhao/memory/plugin_vs_skill_decision.md)：
- 需要 `before_prompt_build` hook → Skill 做不了
- 需要跨进程状态（lastRecapAt 防抖表 + SQLite 只读查询）→ Skill 做不了
- 触发条件是"idle 时长"的系统级信号，不是用户语义意图 → Plugin 更合适

反之，3 个开发辅助能力是"用户说'帮我 review'时自动加载最佳实践"的语义触发场景，天然 Skill。

### 调研依据

[2026-04-24 Claude Code 能力全景调研（115 条）](../../../knowledge/huo15/2026-04-24-claude-code-capability-survey-and-enhance-roadmap.md)：enhance v5.4 已覆盖 TodoWrite/mark_chapter/plan-mode/ExitPlanMode/statusline 等核心 harness；本版本补齐 session-recap；后续 v5.6/5.7 规划补 hook-observer / path-rules / transcript search。

---

## 5.5.0 — 2026-04-23（三层记忆/知识库协调）

本次聚焦「龙虾原生 memory / enhance 结构化记忆 / KB wiki」三者的职责切分和聚合搜索。

### 新增

- **`src/modules/kb-corpus.ts`** — 新增 corpus supplement，把 huo15-openclaw-openai-knowledge-base 技能的**共享知识库**（`~/.openclaw/kb/shared/wiki/`）注册为龙虾 `memory` 的 `corpus="kb"`。调用 `memory_search` 会同时搜到 enhance-memory + shared KB wiki，无需切换工具。
- **`types.ts: KbCorpusConfigType`** — 新配置段 `config.kbCorpus`，可调阈值、路径、debug。
- **`index.ts`** — 注册「共享知识库语料」模块，默认启用（`kbCorpus.enabled !== false`）。

### 变更

- **`structured-memory.ts: enhance_memory_store` 的 tool description** — 增加 L2/L3 边界提示：「本工具只存规则/为什么/怎么做的短条目；长文档请走 `kb-ingest` 入共享 KB」。

### 三层协调总览

| 层 | 存什么 | 存储 | 隔离 | corpus |
|----|--------|------|------|--------|
| L1 龙虾原生 memory | 向量+FTS 底座 | `~/.openclaw/memory/<agent>.sqlite` | per-agent | `memory` |
| L2 enhance 结构化记忆 | 规则/反馈/决策（短） | `enhance-memory.sqlite` | per-agent | `enhance` |
| L3 共享知识库 | 事实/文档/教程（长） | `~/.openclaw/kb/shared/wiki/*.md` | 跨 agent | `kb` |

### 配套更新

- `huo15-openclaw-openai-knowledge-base` skill v2.5.0 — 所有 `kb-*` 脚本新增 `--scope agent|shared`；`kb-search` 默认聚合搜 agent+shared+obsidian；新增 `kb-scope.sh` 公共库。

---

## 5.4.0 — 2026-04-23（对齐 2026 Q2 设计能力生态）

本次聚焦"设计能力"这一纵向领域，对标 Anthropic 官方 `frontend-design` skill（277k+ 安装）与中文圈 `alchaincyf/huashu-design`（画术，4.6k★）的设计理念，但**全部内容自研**（避开 huashu 仅限个人使用的 license 限制）。

### 新增（4 个设计能力 skill）

通过 [huo15-skills monorepo](https://cnb.cool/huo15/ai/huo15-skills) 分发，首次安装会自动从 clawhub 拉取：

- **`huo15-openclaw-frontend-design` v1.0.0** — 高保真 Web UI 原型生成。5 大美学流派（BOLD-MINIMAL / EDITORIAL / BRUTALIST / RETRO-FUTURE / ORGANIC）+ 8 条反 AI Slop 硬红线（禁 Inter/Roboto、禁紫渐变、禁 emoji 当图标等）+ Junior/Full 两趟渲染工作流 + Playwright 自验证 CLI（延续"禁 child_process"铁律）。对标 Anthropic frontend-design。
- **`huo15-openclaw-design-director` v1.0.0** — 设计方向顾问。内置 20 条设计哲学库（极简/编辑/前卫/东方/功能 5 派）+ 3 方向反差生成规则（1 保守 + 1 反差 + 1 中间）+ 五维对比矩阵 + 强制推荐表态。
- **`huo15-openclaw-brand-protocol` v1.0.0** — 品牌规范抓取。5 步硬流程 Ask / Search / Download / Verify+Extract / Codify，产出结构化 `brand-spec.md`。返回 curl / Playwright CLI 命令让用户执行，**不调 child_process**。
- **`huo15-openclaw-design-critique` v1.0.0** — 5 维设计评审（美学/可用性/品牌一致/内容/实现）+ Keep/Fix/Quick Wins 三分类 + ASCII 雷达图。木桶短板决定总分，命中硬红线美学直接 ≤ 2。

### 变更（enhance 插件内）

- **`skill-installer.ts`**：`CLAW_HUB_SKILLS` 列表从 4 扩展到 8，加入 4 个设计 skill。
- **`skill-doctor.ts`**：`EXPECTED_SKILLS` 同步到 8；tool description 更新。
- **README.md / SKILL.md**：技能清单分为「工作流模式」和「设计能力」两段，加入新增 4 个 skill 的说明。

### 设计决策（为什么做成 Skill 而非 Plugin 模块）

遵循 [MEMORY.md Plugin vs Skill Decision](../../../.claude/projects/-Users-jobzhao/memory/plugin_vs_skill_decision.md) 框架：设计能力是"当用户做 X 时自动应用最佳实践"的**语义触发场景**，不需要 hook / 新 tool / 跨进程状态，因此 Skill-first。Plugin 仅扩展了 `CLAW_HUB_SKILLS` 列表做发现和巡检。

### 与 OpenClaw 原生 / 其他 huo15 技能的边界

| 能力 | 归属 |
|------|------|
| Web UI / HTML 原型 | `huo15-openclaw-frontend-design`（新） |
| 设计方向选型 | `huo15-openclaw-design-director`（新） |
| 品牌规范抓取 | `huo15-openclaw-brand-protocol`（新） |
| 设计评审打分 | `huo15-openclaw-design-critique`（新） |
| PPT 演示稿 | `huo15-openclaw-ppt`（已有） |
| Word / PDF | `huo15-openclaw-office-doc`（已有） |

### 商用合规

本批 4 个 skill 内容**全部自研**，仅参考 Anthropic frontend-design（Anthropic 自有 license）和 huashu-design（仅限个人使用）的**结构设计与设计理念**，不 vendor 其 markdown 文本。@huo15/* 系列所有发布物为商用合规，License 保持 MIT。

---

## 5.2.0 — 2026-04-22（对齐 OpenClaw 2026.4.11）

本次是一次**方向性重写**：把之前"跟着龙虾跑"的模式彻底倒转为"给龙虾打补丁"。核心原则——**凡是龙虾有的，我们绝不复制；凡是龙虾没的 Claude-Code 体验，我们填平**。

### 破坏性变更

- **记忆整合从 prompt-inject 改为 corpus supplement**：
  - 旧版本 `context-pruner` 模块通过 `before_prompt_build` 把打分后的记忆直接 `prependContext`，**与龙虾原生 memory injection 重复/竞争**。
  - 新版本删除 `context-pruner`，在 `memory-integrator` 中改用 `api.registerMemoryCorpusSupplement(...)`（2026.4.11 新增 API），把 enhance 分类记忆作为**并列 corpus** 交给龙虾排序——龙虾是主，插件是补。
- **tool-safety 降级为观察员**：
  - 旧版本尝试"重试"（在 `after_tool_call` 中"retry"并不会真的重新调用工具，是假动作）。
  - 新版本只做错误分类 + 指数退避建议 + 60s TTL 观察窗，**完全不与龙虾原生 `tools.allow/deny` 竞争**。每个工具描述都声明"若与龙虾配置冲突以龙虾为准"。
- `package.json` peerDep：`openclaw >= 2026.4.11`；旧版本不再支持。
- `openclaw.plugin.json` 升至 v2.2.0，重写了 configSchema（新增 7 个模块的开关）。

### 新增（对齐 Claude Code Agent Harness）

- **`enhance_todo_write` / `enhance_todo_update` / `enhance_todo_list`**：对齐 Claude Code `TodoWrite`；SQLite `todos` 表 + 会话隔离；出现多个 `in_progress` 自动发通知警告。
- **`enhance_mark_chapter` / `enhance_chapter_list`**：对齐 Claude Code `mark_chapter`，为 session 打时间线。
- **`enhance_set_mode` / `enhance_current_mode`**：plan / explore / normal 三模式；前两者下 `before_tool_call`（priority=950）阻止 Write/Edit/NotebookEdit + 破坏性 Bash（`rm`、`mv`、`curl -X POST` 等），直到模式切回 normal 或 `exec()` 显式批准。
- **`enhance_statusline`**：line/detail/json 三格式状态快照；HTTP 路由交给 dashboard 统一托管。
- **`enhance_skill_doctor`**：只读巡检 4 个 huo15-\*-mode 技能；缺失时给出 `clawhub install` 命令，**不擅自安装**。
- **`enhance_spawn_task`**：孵化子任务；由于龙虾无 spawn 原语，**只记录不伪装执行**，存为 `category=project, tag=spawn-task` 记忆条目。
- **`enhance_loop_register` / `enhance_loop_list` / `enhance_loop_disable`**：登记定时工作流并返回**一条 `openclaw cron add` CLI 命令**，调度生命周期归龙虾 `cron-cli` 管理；触发时 `before_prompt_build` 识别 `[enhance-loop:{name}]` 前缀并注入 instructions。

### 仪表盘增强

- `/plugins/enhance/api/statusline` — 供 Control UI / 外部嵌入
- `/plugins/enhance/api/todos` — 最近 session 的 todo 快照
- `/plugins/enhance/api/chapters` — 章节时间线
- `/plugins/enhance/api/loops` — 定时工作流登记
- `/plugins/enhance/api/spawn-tasks` — 已孵化子任务
- UI 新增 4 个面板（Todos / Chapters / Loops / Spawn Tasks），切 agent 时全量刷新

### 修复

- 修复 `tool-safety.ts` 中因 `)),` 误写导致的多 tool 注册被串成逗号表达式的 bug。
- 修复 `memory-integrator.ts` 的 `registerMemoryCorpusSupplement` 签名误用（2026.4.11 SDK 公共面是单参，内部全局是双参，之前混了）。
- 移除 `statusline.ts` 内对不存在的 `api.http.registerRoute` 的调用。

### 迁移指引（从 v1.x 升级）

1. 在你的 `openclaw.json` 里把 `plugins.entries.enhance.version` 升到 `^5.2`。
2. 若你之前依赖 `contextPruner.*` 配置段，**现在可以删除**；打分逻辑已并入 corpus supplement（配置项改名为 `memory.relevanceThreshold` / `memory.maxContextEntries`）。
3. 若你期望 enhance 实现自动重试，请**改用龙虾原生的 `tools.retry.*` 配置**；enhance 只给观察数据。
4. Cron 工作流：旧版 `workflows` 触发词仍可用；若要真正定时触发，改用 `enhance_loop_register`，按返回的命令手动跑 `openclaw cron add`。

---

## 5.1.2 — 历史版本

见 git 历史。
