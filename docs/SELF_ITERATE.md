# enhance 持续自我迭代 SOP

> 用户硬要求（2026-04-25）：
>
> 1. **不断自我迭代** — 每 3 天对照 Claude Code（官方 docs / 本地 npm 源码 / 反编译 Claude Desktop APP）做一次能力 gap 调研，挑高 ROI 候选落地。
> 2. **零侵入** — 永远不动 openclaw 核心代码、不复制龙虾原生功能。重叠功能以龙虾为准。
> 3. **skill 走 ClawHub** — 任何要新增 / 修改的 skill **必须先在本地 `huo15-skills/` 里写好 → 发布到 ClawHub → 然后让本插件的 `skill-installer.ts` 引用 slug**。**插件代码里绝不内嵌 skill 内容**。

本文档把这套迭代节奏沉淀成 SOP，每次迭代结束直接更新这里。

---

## 1. 三个信息源

| 源 | 路径 | 用途 |
|---|---|---|
| **Claude Code 官方 docs** | https://docs.claude.com/en/docs/claude-code/ + 子页 | 最权威能力清单 — 看 hooks/skills/slash-commands/sessions/modes 各页 |
| **Claude Code npm 包源码** | `~/.nvm/versions/node/<ver>/lib/node_modules/@anthropic-ai/claude-code/` | `sdk-tools.d.ts` 揭示 SDK 工具/Hook/Agent 的真实类型定义；`bin/` 入口 |
| **Claude Desktop APP（反编译）** | `/Applications/Claude.app/Contents/Resources/app.asar` | 解包后 `.vite/build/` 下有完整业务逻辑 — workers、UI、native helpers 都在 |

### 反编译 Claude Desktop（验证可行）

```bash
# 解包（不修改原 app）
mkdir -p /tmp/claude-app-extract
npx --yes @electron/asar extract /Applications/Claude.app/Contents/Resources/app.asar /tmp/claude-app-extract

# 关键工程目录
ls /tmp/claude-app-extract/.vite/build/
#   ├─ index.js                              # 主进程 bundle (10k+ 行)
#   ├─ index.pre.js                          # 预加载
#   ├─ mainView.js / mainWindow.js / quickWindow.js / aboutWindow.js / buddy.js
#   ├─ coworkArtifact.js / findInPage.js / computerUseTeach.js
#   ├─ mcp-runtime/{directMcpHost.js, nodeHost.js}
#   ├─ shell-path-worker/shellPathWorker.js
#   ├─ sqlite-worker/sqliteWorker.node.js
#   └─ transcript-search-worker/transcriptSearchWorker.js   ← v5.7 灵感来源
```

**v5.7 transcript-search 就是这样找到的** —— Claude Desktop 用纯流式扫 JSONL + indexOf，**不用 SQL FTS5**。我们直接照搬，省下了 v5.5.1 路线图里"建 session_messages 新表 + FTS"的工作量。

清理：`rm -rf /tmp/claude-app-extract` 不留痕。

---

## 2. 候选迭代池（按 ROI 排序，每次更新）

| # | 候选 | 来源 | 形态 | 估算 | 状态 |
|---|------|------|------|------|------|
| ✅ | **transcript-search** | Claude Desktop transcriptSearchWorker | Plugin 模块 | ~200 行 | 已落地 v5.7.0 |
| ✅ | **before_compaction 噪音 hook 删除 + memory_purge 工具** | 用户实测 enhance 库 613 条全为 auto-compact 噪音 | Plugin hot-fix | ~80 行净改动 | 已落地 **v5.7.1**（2026-04-26 计划外 hot-fix）|
| ✅ | **hardening 套件**（Map LRU + safety_log TTL + corpus tag 黑名单）| Explore agent 全代码审计 + 防御未来类似 v5.7.1 的 noise factory | Plugin patch | ~120 行 | 已落地 **v5.7.2**（2026-04-26 同日延伸防御）|
| ✅ | **config-doctor 启动期诊断** | 用户装 v5.7.2 仍爆 'Context limit exceeded'，根因是 openclaw 配置陷阱（缺 reserveTokensFloor / model maxTokens 过大），enhance 主动诊断把信号给到用户 | Plugin 模块 + 工具 | ~200 行 | 已落地 **v5.7.3**（2026-04-26 同日，calendar 外第 3 次 hot-fix）|
| ✅ | **config-doctor 扩展扫已装插件 bare pluginApi** | 用户报"提示插件要求 2026.2.24"实际是其它插件违反 ">=X.Y.Z" 规则；扫所有装的 plugin package.json 检测 bare → 给 fix 命令 | Plugin 模块扩展 | ~80 行净增 | 已落地 **v5.7.4**（2026-04-26 同日，calendar 外第 4 次 hot-fix）|
| 1 | **auto-memory-curator cron 触发** | enhance 已有 skill，缺定时器 | Plugin 模块 | ~40 行 + cron 命令 | 待选 |
| 2 | **path-rules**（plan/explore 写入静态参数白名单）| Claude Code Settings | Plugin 模块 | ~150 行 | 待选 |
| 3 | **WeCom push notification 桥接** | Claude Code Notifications | Plugin 模块 + WeCom webhook | ~100 行（需 @huo15/wecom 协作）| 待选 |
| 4 | **skill-creator** skill | Claude Code 内置 skill | **Skill**（先发 ClawHub 再让 enhance 引用）| 半天 | 待选 |
| 5 | **less-permission-prompts** skill | Claude Code 内置 skill | **Skill** | 半天 | 待选 |
| 6 | **init-soul** skill | Claude Code 内置 skill | **Skill** | 半天 | 待选 |
| 7 | **cowork artifact**（多 agent 协作产物管理）| Claude Desktop coworkArtifact.js | Plugin 模块（待调研）| 1 天 | 待选 |

**ROI 排序原则**：

1. **有现成实现可参考**（如 transcript-search 有 Claude Desktop worker）> 凭空设计
2. **Plugin 模块** ROI 通常 > Skill（Plugin 改一次所有 agent 受益，Skill 要语义召唤）
3. **解决用户实测痛点**（如 long session 找不回历史）> 锦上添花
4. **完全非侵入**（只读 / 自建数据）> 需要 hook 配合
5. **代码量 < 200 行**（一次能写完）> 大工程

---

## 3. 标准迭代流程（每 3 天一次）

### Step 1 — 信息更新（10–15 min）

```bash
# 1. 拉最新 docs（用 WebFetch 或浏览器）
#    最常变化的页：hooks / skills / sessions / modes / recent-additions

# 2. 重装 Claude Code 到最新（看 sdk-tools.d.ts 有没有新 type）
npm i -g @anthropic-ai/claude-code

# 3. 检查 Claude Desktop 有没有自动更新
ls -la /Applications/Claude.app/Contents/Info.plist | head -3
```

### Step 2 — Gap 比对（15–30 min）

```bash
# 列 enhance 当前的 hook + tool 注册
grep -RnE 'api\.(on|registerTool|registerMemory)' \
  /Users/jobzhao/workspace/projects/openclaw/huo15-openclaw-enhance/src \
  /Users/jobzhao/workspace/projects/openclaw/huo15-openclaw-enhance/index.ts

# 列 Claude Code SDK 的所有 hook + tool 类型
grep -E '^(export|tool: ")' \
  ~/.nvm/versions/node/$(node -v | tr -d v)/lib/node_modules/@anthropic-ai/claude-code/sdk-tools.d.ts \
  | head -60
```

把当前候选池里的 #1–#7 与最新清单 diff，更新候选状态。

### Step 3 — 选 1 个 ROI 最高的落地（1–4 h）

按下面的 Plugin vs Skill 决策树挑形态：

```
新需求来了 →
├─ 用户一句话召唤 + 单次输出？           → Skill
├─ 需要 hook / 跨 session 状态 / DB？    → Plugin
├─ 用户可能不装 plugin 也想用？          → Skill
└─ 形态混合？                            → Plugin（主动）+ Skill（人工召唤）
```

### Step 4 — 发布（半小时）

**Plugin 模块发布（v5.X.Y）**：

```bash
cd /Users/jobzhao/workspace/projects/openclaw/huo15-openclaw-enhance
# typecheck
npx tsc --noEmit
# bump 版本（package.json + openclaw.plugin.json + SKILL.md + CHANGELOG.md + README.md）
# commit + tag + push
git push origin main && git push origin vX.Y.Z
git push github main && git push github vX.Y.Z
# 双发布
npm publish --access public "--//registry.npmjs.org/:_authToken=npm_<TOKEN>"
CLAWHUB_TOKEN=clh_<TOKEN> clawhub publish . --workdir . --dir . --version X.Y.Z --tags latest,plugin
```

**Skill 发布（必须先 ClawHub 后插件引用，⚠️ 用户硬要求）**：

```bash
# 1. 先在 huo15-skills 仓库写 skill
cd /Users/jobzhao/workspace/projects/openclaw/huo15-skills
# 编辑 huo15-openclaw-<name>/SKILL.md 等

# 2. 发布到 ClawHub
CLAWHUB_TOKEN=clh_<TOKEN> clawhub publish ./huo15-openclaw-<name> --version 1.0.0

# 3. 等 ClawHub 索引可见（搜索能找到）
clawhub search huo15-openclaw-<name>

# 4. 然后到 enhance 仓库 src/modules/skill-installer.ts 把 slug 加到 CLAW_HUB_SKILLS
#    src/modules/skill-doctor.ts 同步加到 EXPECTED_SKILLS
#    bump enhance 版本 → 走上面的 plugin 发布流程
```

⚠️ **绝对不要在插件代码里内嵌 skill 内容**。Skill 必须独立发版，插件只引用 slug。

### Step 5 — 沉淀（10 min）

更新两处：

1. **本仓库 `docs/SELF_ITERATE.md`** 候选池 — 把已落地的标 ✅，新发现的加进去
2. **本地 KB `~/knowledge/huo15/`** — 一次发布写一篇 markdown 完整 post-mortem（含 design 决策、实测数据、踩过的坑）

---

## 4. 历史迭代记录

| 日期 | 版本 | 主题 | 来源 | 落地形态 |
|------|------|------|------|---------|
| 2026-04-23 | v5.4.0 | 设计能力套件（4 个 skill） | huashu-design + Anthropic frontend-design | 4 Skills |
| 2026-04-24 | v5.5.0 | 三层记忆/KB 协调（corpus="kb"） | Claude Code memory 文档 | Plugin 模块 |
| 2026-04-24 | v5.5.1 | 开发辅助三件套 + session-recap | Claude Code /simplify /security-review /review + idle recap | 3 Skills + 1 Plugin 模块 |
| 2026-04-24 | v5.6.0 | 工具分层 + workflow 5→2 + 描述压缩 | Long session context pressure 实测 | Plugin 容量优化 |
| 2026-04-25 | v5.7.0 | transcript-search（流式扫 jsonl） | 反编译 Claude Desktop transcriptSearchWorker | Plugin 模块 |
| 2026-04-26 | v5.7.1 | hot-fix：删 before_compaction 噪音 hook + 加 memory_purge | 用户实测 enhance 库 613 条全为 auto-compact 噪音 | Plugin hot-fix |
| 2026-04-26 | v5.7.2 | hardening：Map LRU + safety_log TTL + corpus tag 黑名单 + peerDep 4.22 | Explore agent 全代码审计后挑 4 项 ROI 最高的批量修 | Plugin patch |
| 2026-04-26 | v5.7.3 | config-doctor：启动期诊断 openclaw.json 陷阱（reserveTokensFloor 缺失 / model maxTokens 过大）| 用户实测装 v5.7.2 仍爆 'Context limit exceeded'，根因在 openclaw 配置而非插件 | Plugin 模块 |
| 2026-04-26 | **v5.7.4** | **config-doctor 扫已装插件 bare pluginApi** | **用户报"插件要求 2026.2.24"实际是其它插件违反 ranged spec 规则** | **Plugin 模块扩展** |

下一次迭代锚点：**2026-04-28**（每 3 天间隔；如果有新 Claude Code release 或线上 bug 反馈提前触发）。

### 关于"诊断 vs 修复"的边界

v5.7.3 严格遵守"**诊断不修复**" — 即便 enhance 完全有能力 read/write `~/.openclaw/openclaw.json`，也只 `readFileSync` 不 `writeFileSync`。理由：
1. 红线 #1：不侵入式修改 openclaw（配置文件属于 openclaw 控制范围）
2. 用户对配置的掌控感 — 自己复制粘贴一行 python3 命令，至少看到改了啥
3. 排除责任 — 万一 fix 命令出错（比如把字段值打错），损失只是用户那一刻的副作用，不会让 enhance 担责"我装了插件配置就被改坏了"

**未来若加任何"建议改 openclaw 配置"的功能，硬约束：return-cliCmd 模式（输出 fix 命令字符串），永不 fs.writeFileSync 用户配置**。

### 发版前自查 checklist（v5.7.4 启示）

每次发布 plugin 前必跑：

```bash
# 1. 自查本插件 compat.pluginApi 是 ranged
grep -E '"pluginApi"' package.json openclaw.plugin.json
#   必须看到 ">=X.Y.Z" / "^X.Y.Z" / "~X.Y.Z"
#   绝不能看到裸的 "X.Y.Z" — 那会被 openclaw 解读为精确匹配

# 2. typecheck
npx tsc --noEmit

# 3. 跑一次本地 enhance_config_doctor 看自己安装目录有没有 bare plugin
#    （拿到 v5.7.4+ 之后此项自动）
```

为什么这条这么重要：v5.7.4 修的 bug 就是其它两个 huo15 插件作者（包括我自己）写 bare 字符串的失误造成的。**bare pluginApi 是 silent breakage** — 当时跑得好好，运行时一升级 openclaw 就炸。每次发版都自查能避免下个用户遭罪。

### 关于 hot-fix 的额外约束（v5.7.1 启示）

线上 bug（用户截图反馈）属于 **calendar 外触发** — 不等 cron 任务，立刻按照下面 fast-track 流程处理：

1. 用 Grep 直接定位 bug 代码（不要 Plan）
2. 修复 + typecheck（不要 release plan）
3. SQL 直接清用户残留数据（如本次 613 条），先 `cp ... .bak.before-vX.Y.Z-hotfix` 备份
4. 走标准发布流程（commit → tag → push 双 remote → npm + clawhub）
5. 把 bug 加进 SELF_ITERATE.md 候选池标 ✅，写一篇 KB post-mortem
6. 不影响下次 cron 调度（cron 还是 2026-04-28 跑）

---

## 5. 红线清单（永远不踩）

1. ❌ 不修改 openclaw 核心代码 / 不动 openclaw 仓库
2. ❌ 不复制龙虾原生功能（记忆向量库、tools.allow/deny、cron 调度、技能安装）
3. ❌ 插件代码里不内嵌 skill 内容（skill 必须独立发版到 ClawHub）
4. ❌ 不用 child_process（企业扫描器拦截 — 见 KB「No child_process in published plugins」）
5. ❌ 不在 plugin 里写 npm/pip/cli 一类的安装命令执行（必须用 return-cliCmd 模式让用户 / cron 执行）
6. ❌ ClawHub publish 不要一小时内发 5 个以上 new slug（rate limit）
7. ❌ 提交不带 secrets（即使是 publish-credentials.md 里的 token，不出现在 commit message 或 code）
