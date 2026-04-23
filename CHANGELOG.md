# CHANGELOG

本插件语义化版本号与龙虾适配版本解耦：`package.json.version` 为插件自身的发布版本，`openclaw.build.openclawVersion` 为目标龙虾版本。

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
