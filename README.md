# 火一五·克劳德·龙虾增强插件

---

<div align="center">

<img src="https://tools.huo15.com/uploads/images/system/logo-colours.png" alt="火一五Logo" style="width: 120px; height: auto; display: inline; margin: 0;" />

</div>

<div align="center">

<h3>打破信息孤岛，用一套系统驱动企业增长</h3>
<h3>加速企业用户向全场景人工智能机器人转变</h3>


</div>
<div align="center">

| 🏫 教学机构 | 👨‍🏫 讲师 | 📧 联系方式         | 💬 QQ群      | 📺 配套视频                         |
|:-----------:|:--------:|:------------------:|:-----------:|:-----------------------------------:|
| 逸寻智库 | Job | support@huo15.com | 1093992108  | [📺 B站视频](https://space.bilibili.com/400418085) |

</div>
---

## 简介

**火一五·克劳德·龙虾增强插件 v2.2** 是 [OpenClaw 2026.4.11+](https://github.com/openclaw/openclaw) 的**非侵入式**增强插件，对标 Claude Code 的 Agent Harness 体验；**所有能力重叠处都以龙虾为准**，绝不复制或覆盖龙虾原生功能。

完全通过公共 Plugin SDK 实现，**不修改任何核心代码**，一键安装即可使用。
（非龙虾团队开发）

### 核心特性

- **多 Agent 隔离** — 完美适配 WeCom 插件的动态 Agent 功能，每个企微用户/群组拥有独立的记忆、任务、章节、宠物与定时工作流
- **结构化记忆（corpus supplement）** — 按 user/project/feedback/reference/decision 五类分类存储，**通过 `registerMemoryCorpusSupplement` 并入龙虾 `memory` 搜索结果**，不自建第二套向量库
- **工具安全补丁** — 仅作为**观察员**存在（尊重龙虾原生 `tools.allow/deny`），统计错误分类、给出退避建议，从不擅自重试或硬拦截
- **提示词增强** — 仅保留 `qualityGuidelines`，其它早已由龙虾系统提示词覆盖，不重复
- **任务/章节/模式闸门** — Claude Code TodoWrite / mark_chapter / plan-explore 的龙虾化实现；模式闸门在 `before_tool_call` 阻止计划/探索模式误触写操作
- **状态栏 / 技能巡检 / 子任务孵化** — 一行看全当前状态；诊断技能目录缺失；把"现在不该做"的副作用登记为延期任务
- **定时任务桥** — 登记工作流时返回一条 `openclaw cron add` 命令，**调度归龙虾**，插件只负责触发时装填上下文
- **增强仪表盘（含小火苗宠物）** — Web UI 实时查看记忆 / 任务 / 章节 / 定时 / 宠物状态，支持按 Agent 筛选

---

## 一键安装

```bash
openclaw plugins install @huo15/openclaw-enhance
```

重启 OpenClaw 生效：

```bash
openclaw restart
```

安装完成后访问仪表盘：`http://localhost:18789/plugins/enhance/`

---

## 功能模块（v2.2 全量）

| 模块 | 说明 | Agent 工具 |
|------|------|-----------|
| **分类记忆（并入龙虾搜索）** | user/project/feedback/reference/decision 五类；作为 corpus supplement 与龙虾 `memory` 合并排名 | `enhance_memory_store` `enhance_memory_search` `enhance_memory_review` `enhance_memory_export` |
| **工具安全观察** | 错误分类（429/5xx/网络）+ 指数退避建议；不拦截，不重试 | `enhance_safety_log` `enhance_retry_status` `enhance_safety_rules` |
| **提示词段落** | 追加 `qualityGuidelines`，其它已由龙虾系统提示词覆盖 | 自动（hook 注入） |
| **任务追踪** | Claude Code TodoWrite 语义；SQLite 持久化；会警告多 in_progress | `enhance_todo_write` `enhance_todo_update` `enhance_todo_list` |
| **章节时间线** | session 级「mark_chapter」 | `enhance_mark_chapter` `enhance_chapter_list` |
| **模式闸门** | plan / explore / normal；前两种下 `before_tool_call` 阻止写操作 | `enhance_set_mode` `enhance_current_mode` |
| **状态栏** | 一行/详情/json 三格式快照（模式、任务、记忆、宠物、通知） | `enhance_statusline` |
| **技能巡检** | 只读检查 4 个增强技能安装状态 + 给出 clawhub 修复命令 | `enhance_skill_doctor` |
| **子任务孵化** | 把"该做但别现在"登记为延期任务 | `enhance_spawn_task` |
| **定时任务桥** | 返回 `openclaw cron add` CLI 命令，尊重龙虾原生 cron-cli | `enhance_loop_register` `enhance_loop_list` `enhance_loop_disable` |
| **工作流自动化** | 触发词 → 行为指令注入（旧式，保留兼容） | `enhance_workflow_define` `enhance_workflow_list` `enhance_workflow_delete` |
| **增强仪表盘** | Web UI：记忆 / 任务 / 章节 / 定时 / 孵化子任务 / 小火苗 | `http://localhost:18789/plugins/enhance/` |

## 与龙虾原生的关系（设计契约）

| 能力 | 龙虾原生 | enhance 策略 |
|------|---------|--------------|
| 记忆向量库（LanceDB） | ✅ 龙虾负责 | **enhance 不自建**；改为 corpus supplement 并入搜索 |
| 记忆系统提示词 | ✅ 龙虾负责 | enhance 只在段落底部追加一行工具说明（如果龙虾提供 `registerMemoryPromptSupplement`） |
| 工具 allow/deny | ✅ 龙虾负责 | enhance 只**观察**结果、做错误分类；不拦截 |
| 任务清单 / 计划文件 | ⚠️ 无对应原语 | enhance 独立实现（SQLite），语义对齐 Claude Code |
| Cron 调度 | ✅ 龙虾 cron-cli | enhance 不管理调度；只在触发时注入 instructions |
| 技能安装 | ✅ ClawHub | enhance 只读巡检，不擅自安装 |

---

## 增强技能

安装时会自动注入 4 个增强技能到 `workspace/skills/`：

| 技能 | 说明 | 灵感来源 |
|------|------|---------|
| `huo15-openclaw-plan-mode` | 结构化规划模式 — 执行复杂任务前先做需求分析、方案设计、风险评估 | Claude Code Plan Agent |
| `huo15-openclaw-explore-mode` | 深度探索模式 — 只读调研代码库/系统/话题后再给出结论 | Claude Code Explore Agent |
| `huo15-openclaw-verify-mode` | 验证检查模式 — 检查工作成果、运行测试、验证假设 | Claude Code Verification Agent |
| `huo15-openclaw-memory-curator` | 记忆整理 — 定期审查记忆、提取洞察、清理过期条目 | Claude Code auto-memory |

---

## 配置说明

在 `openclaw.json` 的 `plugins.entries.enhance.config` 中配置各模块：

```json
{
  "plugins": {
    "allow": ["enhance"],
    "entries": {
      "enhance": {
        "enabled": true,
        "config": {
          "memory": {
            "enabled": true,
            "autoCapture": true,
            "maxContextEntries": 5
          },
          "safety": {
            "enabled": true,
            "rules": [
              { "tool": "exec", "pattern": "rm -rf *", "action": "block", "reason": "危险命令" },
              { "tool": "exec", "pattern": "sudo *", "action": "block", "reason": "禁止 sudo" },
              { "tool": "file_write", "pathPattern": "*.env", "action": "block", "reason": "禁止写入环境变量文件" }
            ],
            "defaultAction": "allow"
          },
          "prompt": {
            "enabled": true,
            "sections": ["qualityGuidelines", "memoryContext"]
          },
          "workflows": { "enabled": true },
          "dashboard": { "enabled": true }
        }
      }
    }
  }
}
```

### 安全规则配置

| 字段 | 说明 |
|------|------|
| `tool` | 工具名称，支持通配符（如 `exec`、`file_*`） |
| `pattern` | 参数匹配模式，支持通配符（如 `rm -rf *`） |
| `pathPattern` | 文件路径匹配模式（如 `*.env`、`/etc/*`） |
| `action` | 匹配后动作：`block`（拦截）/ `log`（记录）/ `allow`（放行） |
| `reason` | 规则说明（可选） |

### 提示词段落配置

可选段落：`taskClassification`（任务分类）、`qualityGuidelines`（质量指引）、`memoryContext`（记忆上下文）、`safetyAwareness`（安全意识）

---

## 与 WeCom 动态 Agent 配合

当 WeCom 插件启用 `dynamicAgents` 后，每个用户/群组被分配独立的 `agentId`（如 `wecom-acct-ws-dm-hidaomax`）。增强包自动实现：

1. **记忆隔离** — 用户 A 存的记忆，用户 B 看不到
2. **日志隔离** — 每个用户的安全事件独立记录
3. **工作流隔离** — 用户 A 定义的工作流不影响用户 B
4. **上下文隔离** — 提示词增强只注入当前用户的记忆

**实现原理**：
- 工具使用 `OpenClawPluginToolFactory` 模式，从 `ctx.agentId` 获取当前 Agent
- 钩子从 `ctx.agentId` 获取当前 Agent
- SQLite 所有表包含 `agent_id` 列，查询时自动按 Agent 过滤

仪表盘支持 `?agent=wecom-acct-ws-dm-hidaomax` 参数查看特定用户数据。

---

## 设计理念

借鉴 Claude Code 的核心设计模式，适配 OpenClaw 的插件架构：

| 维度 | Claude Code 原版 | 火一五·克劳德·龙虾增强插件适配 |
|------|-----------------|--------------|
| 记忆系统 | 6 层记忆 + Agent frontmatter | 5 类分类 + SQLite agent_id 隔离 |
| 权限安全 | 5 层权限模型 + 异步分类器 | 规则匹配 + block/log/allow + 审计日志 |
| 提示词工程 | Memoized sections + 优先级系统 | 可配置段落 + appendSystemContext 注入 |
| Agent 系统 | 3 种 Agent 类型 + frontmatter 配置 | 4 个增强技能 + OpenClaw skill 系统 |
| 工作流 | 17 个生命周期事件 | 触发词驱动 + before_prompt_build 注入 |

---

## 版本历史

见 [CHANGELOG.md](./CHANGELOG.md)。

## License

MIT

---

<div align="center">

**公司名称：** 青岛火一五信息科技有限公司

**联系邮箱：** postmaster@huo15.com | **QQ群：** 1093992108

---

**关注逸寻智库公众号，获取更多资讯**

<img src="https://tools.huo15.com/uploads/images/system/qrcode_yxzk.jpg" alt="逸寻智库公众号二维码" style="width: 200px; height: auto; margin: 10px 0;" />

</div>

---
