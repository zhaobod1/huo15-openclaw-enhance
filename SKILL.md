---
name: huo15-openclaw-enhance
description: "火一五·克劳德·龙虾增强插件 — 借鉴 Claude Code 优秀设计：结构化记忆、工具安全守卫、提示词增强、工作流自动化、仪表盘"
version: 1.6.0
homepage: https://github.com/zhaobod1/huo15-openclaw-enhance
metadata: { "openclaw": { "emoji": "🦞", "requires": { "bins": [] } } }
---

# 火一五·克劳德·龙虾增强插件

## 简介

**火一五·克劳德·龙虾增强插件**（`@huo15/openclaw-enhance`）是 OpenClaw 的非侵入式增强插件，借鉴 Claude Code 的优秀设计模式。

完全通过 OpenClaw 插件 API 实现，**不修改任何核心代码**，一键安装即可使用。

## 核心特性

- **多 Agent 隔离** — 完美适配 WeCom/钉钉 插件的动态 Agent 功能
- **结构化记忆系统** — 按 user/project/feedback/reference/decision 五类分类存储
- **工具安全守卫** — 可配置规则拦截危险工具调用并记录审计日志
- **提示词增强** — 自动注入任务分类、质量指引和记忆上下文
- **工作流自动化** — 触发词驱动的行为指令注入
- **增强仪表盘** — Web UI 实时查看记忆/安全/工作流状态

## 安装

```bash
openclaw plugins install @huo15/openclaw-enhance
```

重启 OpenClaw：

```bash
openclaw restart
```

## 技能

安装时自动注入 4 个增强技能：

- `plan-mode` — 结构化规划模式
- `explore-mode` — 深度探索模式
- `verify-mode` — 验证检查模式
- `memory-curator` — 记忆整理技能

## 配置

在 `openclaw.json` 的 `plugins.entries.enhance.config` 中配置各模块：

```json
{
  "plugins": {
    "allow": ["enhance"],
    "entries": {
      "enhance": {
        "enabled": true,
        "config": {
          "memory": { "enabled": true, "autoCapture": true, "maxContextEntries": 5 },
          "safety": { "enabled": true, "rules": [], "defaultAction": "allow" },
          "prompt": { "enabled": true, "sections": ["qualityGuidelines"] },
          "workflows": { "enabled": true },
          "dashboard": { "enabled": true }
        }
      }
    }
  }
}
```

## NPM 包

- **npm**: https://www.npmjs.com/package/@huo15/openclaw-enhance
- **版本**: 1.4.0
- **作者**: jobzhao15
- **许可证**: MIT

## GitHub

- **仓库**: https://github.com/zhaobod1/huo15-openclaw-enhance

## 公司

**青岛火一五信息科技有限公司** — www.huo15.com
