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

**火一五·克劳德·龙虾增强插件** 是 [OpenClaw](https://github.com/nicepkg/openclaw) 的非侵入式增强插件，借鉴 Claude Code 的优秀设计模式，为你的龙虾 AI Agent 注入结构化记忆、工具安全守卫、提示词工程、工作流自动化和可视化仪表盘等能力。

完全通过 OpenClaw 插件 API 实现，**不修改任何核心代码**，一键安装即可使用。
(非龙虾开发)
### 核心特性

- **多 Agent 隔离** — 完美适配 WeCom 插件的动态 Agent 功能，每个企微用户/群组拥有独立的记忆空间、安全日志和工作流
- **结构化记忆系统** — 借鉴 Claude Code auto-memory，按 user/project/feedback/reference/decision 五类分类存储
- **工具安全守卫** — 借鉴 Claude Code 权限系统，可配置规则拦截危险工具调用并记录审计日志
- **提示词增强** — 借鉴 Claude Code systemPromptSections，自动注入任务分类、质量指引和记忆上下文
- **工作流自动化** — 借鉴 Claude Code hooks 事件驱动，通过触发词自动注入行为指令
- **增强仪表盘** — Web UI 实时查看记忆/安全/工作流状态，支持按 Agent 筛选

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

## 功能模块

| 模块 | 说明 | Agent 工具 |
|------|------|-----------|
| **结构化记忆** | 按类型分类存储记忆，按 Agent 隔离 | `enhance_memory_store` `enhance_memory_search` `enhance_memory_review` |
| **工具安全** | 可配置的工具调用拦截规则 + 审计日志 | `enhance_safety_log` `enhance_safety_rules` |
| **提示词增强** | 自动注入任务分类、质量指引、记忆上下文 | 自动（通过 hook） |
| **工作流自动化** | 触发词驱动的行为指令注入 | `enhance_workflow_define` `enhance_workflow_list` `enhance_workflow_delete` |
| **仪表盘** | Web UI 查看系统状态 | `http://localhost:18789/plugins/enhance/` |

---

## 增强技能

安装时会自动注入 4 个增强技能到 `workspace/skills/`：

| 技能 | 说明 | 灵感来源 |
|------|------|---------|
| `plan-mode` | 结构化规划模式 — 执行复杂任务前先做需求分析、方案设计、风险评估 | Claude Code Plan Agent |
| `explore-mode` | 深度探索模式 — 只读调研代码库/系统/话题后再给出结论 | Claude Code Explore Agent |
| `verify-mode` | 验证检查模式 — 检查工作成果、运行测试、验证假设 | Claude Code Verification Agent |
| `memory-curator` | 记忆整理 — 定期审查记忆、提取洞察、清理过期条目 | Claude Code auto-memory |

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
