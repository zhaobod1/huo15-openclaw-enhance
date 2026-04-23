---
name: huo15-openclaw-enhance
description: "火一五·克劳德·龙虾增强插件 v5.4 — OpenClaw 2026.4.11+ 的非侵入式增强：五类分类记忆（Why/How-to-apply 两段式 + 并入龙虾 memory 搜索）、工具安全观察员、TodoWrite / mark_chapter / plan-explore 模式闸门（含 ExitPlanMode 审批闭环）、statusline（含模型/思考档/通道观测）、技能巡检、子任务一键 CLI 派发、定时任务桥；v5.4 新增 4 个设计能力 skill（frontend-design / design-director / brand-protocol / design-critique）"
version: 5.4.0
homepage: https://cnb.cool/huo15/ai/huo15-openclaw-enhance
metadata: { "openclaw": { "emoji": "🦞", "requires": { "bins": [] } } }
---

# 火一五·克劳德·龙虾增强插件 v5.4

## 简介

`@huo15/openclaw-enhance` 是 **OpenClaw 2026.4.11+** 的**非侵入式**增强插件，对标 Claude Code 的 Agent Harness 体验。

**核心原则**：凡是龙虾原生有的功能一律不复制，重叠处以龙虾为准；只补龙虾没有的 Claude-Code 体验。

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

详见 [README.md](./README.md) 与 [CHANGELOG.md](./CHANGELOG.md)。

## 链接

- npm: https://www.npmjs.com/package/@huo15/openclaw-enhance
- 仓库: https://cnb.cool/huo15/ai/huo15-openclaw-enhance
- License: MIT
- 公司: 青岛火一五信息科技有限公司 — www.huo15.com
