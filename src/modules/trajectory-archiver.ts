/**
 * v5.7.20 trajectory 自动归档模块
 *
 * session-doctor 已经能发现 trajectory.jsonl 累计超阈值；本模块给出"一次性部署 +
 * 每日 03:00 自动归档"的方案：把归档逻辑做成 macOS launchd LaunchAgent，由系统调度
 * 跑 find -mtime +1d -size +5M -exec mv，把陈旧大文件挪到 .archive/。
 *
 * 触发场景：用户重启 webchat / control-ui tab 后客户端会再次轮询 sessions.list；
 * 持续控制 trajectory 总量在 100MB 以下能避免 99% CPU 复发（实测 264MB 已经卡）。
 *
 * 红线一致性：
 * - 完全只读 + 出 cliCmd（红线 #5 "诊断不修复"），plugin 不擅自 fs.renameSync 用户数据
 * - 不用 child_process（红线 #4）—— LaunchAgent 由 launchd 跑 bash 命令，不在 plugin 进程
 * - 不修改 openclaw 任何配置（红线 #1）
 * - 启动期检查 plist 是否已部署：纯 fs.existsSync 读判，不写不改
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";

// 默认 LaunchAgent label / 路径，避免 plist label 撞库
const DEFAULT_LABEL = "ai.huo15.openclaw.trajectory-archiver";

interface TrajectoryArchiverConfig {
  enabled?: boolean;
  /** LaunchAgent label，撞库时可改 */
  label?: string;
  /** mtime 阈值（天），早于此天数才归档；默认 1 */
  archiveAgeDays?: number;
  /** size 阈值（MB），≥ 才归档；默认 5 */
  archiveMinSizeMB?: number;
  /** 触发时刻 hour（0-23）；默认 3（凌晨 3 点） */
  scheduleHour?: number;
}

function plistPath(label: string): string {
  return join(homedir(), "Library", "LaunchAgents", `${label}.plist`);
}

function archiveDir(): string {
  return join(homedir(), ".openclaw", "agents", "main", "sessions", ".archive");
}

function logPath(): string {
  return join(homedir(), ".openclaw", "logs", "trajectory-archiver.log");
}

function buildPlistContent(opts: {
  label: string;
  ageDays: number;
  minSizeMB: number;
  hour: number;
}): string {
  const home = homedir();
  const ageMin = opts.ageDays * 1440;
  const findCmd =
    `mkdir -p ${archiveDir().replace(home, "$HOME")} && ` +
    `find ${join("$HOME", ".openclaw", "agents")} ` +
    `-name '*.trajectory.jsonl' -mmin +${ageMin} -size +${opts.minSizeMB}M ` +
    `-not -path '*/.archive/*' ` +
    `-exec mv {} ${archiveDir().replace(home, "$HOME")}/ \\;`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${opts.label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>${findCmd}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>${opts.hour}</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>${logPath()}</string>
  <key>StandardErrorPath</key><string>${logPath()}</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>`;
}

function buildSetupCliCmd(opts: {
  label: string;
  ageDays: number;
  minSizeMB: number;
  hour: number;
}): string {
  const path = plistPath(opts.label);
  const content = buildPlistContent(opts);
  // heredoc + launchctl load 一气呵成
  return [
    `# 一次性部署：写 LaunchAgent plist + 加载到 launchd`,
    `mkdir -p "${join(homedir(), "Library", "LaunchAgents")}"`,
    `cat > "${path}" << 'PLIST_EOF'`,
    content,
    `PLIST_EOF`,
    `launchctl load "${path}"`,
    `# 验证：launchctl list | grep ${opts.label}`,
    `# 卸载：launchctl unload "${path}" && rm "${path}"`,
  ].join("\n");
}

export function registerTrajectoryArchiver(
  api: OpenClawPluginApi,
  config: TrajectoryArchiverConfig | undefined,
) {
  const label = config?.label ?? DEFAULT_LABEL;
  const ageDays = config?.archiveAgeDays ?? 1;
  const minSizeMB = config?.archiveMinSizeMB ?? 5;
  const hour = config?.scheduleHour ?? 3;

  // 启动期：只读检查 plist 是否已部署
  try {
    const path = plistPath(label);
    if (existsSync(path)) {
      api.logger.info(
        `[enhance-trajectory-archiver] LaunchAgent 已部署: ${path}（每日 ${hour
          .toString()
          .padStart(2, "0")}:00 自动归档 ≥${minSizeMB}MB & mtime>${ageDays}d 的 trajectory）`,
      );
    } else {
      api.logger.info(
        `[enhance-trajectory-archiver] 未部署自动归档（运行 enhance_trajectory_archiver_setup 获取一次性部署命令）`,
      );
    }
  } catch (err) {
    api.logger.error(
      `[enhance-trajectory-archiver] 启动检查失败（不影响插件其它功能）: ${(err as Error).message}`,
    );
  }

  // 工具：返回一次性部署 cliCmd
  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_trajectory_archiver_setup",
      description:
        "输出 macOS launchd LaunchAgent 部署命令，部署后每日凌晨自动归档老旧大 trajectory.jsonl 到 .archive/。" +
        "防止 gateway sessions.list 因全量 JSON.parse 超大 trajectory 卡 13s+ event-loop / 99% CPU。" +
        "只输出命令，不擅自执行（你复制粘贴到 shell 跑一次即可）。",
      parameters: Type.Object({}),
      async execute() {
        const path = plistPath(label);
        const alreadyDeployed = existsSync(path);
        const cliCmd = buildSetupCliCmd({ label, ageDays, minSizeMB, hour });

        const lines: string[] = [];
        if (alreadyDeployed) {
          lines.push(`✅ LaunchAgent 已部署：${path}`);
          lines.push(`触发条件：每日 ${hour.toString().padStart(2, "0")}:00 自动归档`);
          lines.push(`  - 文件 ≥ ${minSizeMB}MB`);
          lines.push(`  - mtime > ${ageDays} 天`);
          lines.push(`  - 排除 .archive/ 子目录`);
          lines.push(``);
          lines.push(`查看运行日志: tail ${logPath()}`);
          lines.push(`手动触发一次: launchctl start ${label}`);
          lines.push(`卸载: launchctl unload "${path}" && rm "${path}"`);
        } else {
          lines.push(`一次性部署 macOS LaunchAgent（每日 ${hour.toString().padStart(2, "0")}:00 自动归档）：`);
          lines.push(``);
          lines.push("```bash");
          lines.push(cliCmd);
          lines.push("```");
          lines.push(``);
          lines.push(`触发条件：`);
          lines.push(`  - 文件 ≥ ${minSizeMB}MB`);
          lines.push(`  - mtime > ${ageDays} 天（活动 session 受保护）`);
          lines.push(`  - 排除已归档目录`);
          lines.push(``);
          lines.push(`部署后 trajectory 总量会被自动控制在低位，配合 enhance_session_doctor 监控。`);
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      },
    })) as any,
    { name: "enhance_trajectory_archiver_setup" },
  );

  api.logger.info(
    "[enhance] trajectory 自动归档模块已加载（只读 + return-cliCmd，由 launchd 调度，不在 plugin 进程跑 mv）",
  );
}
