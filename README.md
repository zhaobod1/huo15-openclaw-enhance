# 🦞 龙虾增强包 (OpenClaw Enhancement Kit)

> 非侵入式增强你的 OpenClaw Agent — 借鉴 Claude Code 的最佳实践

## 多 Agent 隔离 (v1.1.0)

完全适配 WeCom 插件的**动态 Agent** 功能。每个企微用户/群组拥有独立的：
- 记忆空间（不同用户的记忆互不可见）
- 安全审计日志（按 Agent 独立记录）
- 工作流集合（每个用户可定义自己的工作流）
- 仪表盘视图（支持按 Agent 筛选）

**实现原理**：
- 工具使用 `OpenClawPluginToolFactory` 模式，从 `ctx.agentId` 获取当前 Agent
- 钩子从 `ctx.agentId` 获取当前 Agent
- SQLite 所有表包含 `agent_id` 列，查询时自动按 Agent 过滤
- v1.0 数据自动迁移（补充 `agent_id = 'main'`）

## 功能模块

| 模块 | 说明 | 工具 |
|------|------|------|
| **结构化记忆** | 按类型分类存储记忆（user/project/feedback/reference/decision），按 Agent 隔离 | `enhance_memory_store` `enhance_memory_search` `enhance_memory_review` |
| **工具安全** | 可配置的工具调用拦截规则 + 按 Agent 隔离的审计日志 | `enhance_safety_log` `enhance_safety_rules` |
| **提示词增强** | 自动注入任务分类、质量指引、当前 Agent 的记忆上下文 | 自动（通过 hook） |
| **工作流自动化** | 触发词驱动的行为指令注入，按 Agent 隔离 | `enhance_workflow_define` `enhance_workflow_list` `enhance_workflow_delete` |
| **仪表盘** | Web UI 查看记忆/安全/工作流状态，支持按 Agent 筛选 | `http://localhost:18789/enhance/` |

## 增强技能

| 技能 | 说明 |
|------|------|
| `plan-mode` | 结构化规划模式（借鉴 Claude Code Plan Agent） |
| `explore-mode` | 深度探索模式（借鉴 Claude Code Explore Agent） |
| `verify-mode` | 验证检查模式（借鉴 Claude Code Verification Agent） |
| `memory-curator` | 记忆整理和优化 |

## 安装

```bash
openclaw plugins install @huo15/openclaw-enhance
```

然后重启 OpenClaw：

```bash
openclaw restart
```

## 配置

在 `openclaw.json` 中配置各模块：

```json
{
  "plugins": {
    "entries": {
      "enhance": {
        "enabled": true,
        "config": {
          "memory": { "enabled": true, "autoCapture": true, "maxContextEntries": 5 },
          "safety": {
            "enabled": true,
            "rules": [
              { "tool": "exec", "pattern": "rm -rf *", "action": "block", "reason": "危险命令" }
            ],
            "defaultAction": "allow"
          },
          "prompt": { "enabled": true, "sections": ["qualityGuidelines", "memoryContext"] },
          "workflows": { "enabled": true },
          "dashboard": { "enabled": true }
        }
      }
    }
  }
}
```

## 与 WeCom 动态 Agent 配合

当 WeCom 插件启用 `dynamicAgents` 后，每个用户/群组会被分配一个独立的 `agentId`（如 `wecom-acct-ws-dm-hidaomax`）。增强包自动：

1. **记忆隔离** — 用户 A 存的记忆，用户 B 看不到
2. **日志隔离** — 每个用户的安全事件独立记录
3. **工作流隔离** — 用户 A 定义的工作流不会影响用户 B
4. **上下文隔离** — 提示词增强只注入当前用户的记忆

仪表盘支持 `?agent=wecom-acct-ws-dm-hidaomax` 参数查看特定用户数据。

## 设计理念

- **非侵入**: 不修改 OpenClaw 核心代码，完全通过插件 API
- **模块化**: 每个模块可独立开关
- **隔离优先**: 天然适配多 Agent 架构
- **借鉴但不照搬**: 取 Claude Code 的精华，适配 OpenClaw 的架构

## License

MIT
