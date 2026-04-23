/**
 * 模块: 技能安装器（enhance_install_skills）
 *
 * 设计原则：插件不执行任何外部进程，只返回可复制的 CLI 命令。
 * - 某些企业扫描器会把"执行外部命令"相关的 Node.js 内置模块 import
 *   标记为高危并整包拦截；改为"返回命令让用户自己跑"彻底绕开。
 * - 与 scheduled-tasks-bridge / enhance_spawn_task 的 cliCmd 语义保持一致：
 *   非侵入、可审计、可复制。
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { OpenClawPluginToolContext } from "openclaw/plugin-sdk/core";
import { Type } from "@sinclair/typebox";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveOpenClawHome } from "../utils/resolve-home.js";

export const CLAW_HUB_SKILLS = [
  "huo15-openclaw-explore-mode",
  "huo15-openclaw-memory-curator",
  "huo15-openclaw-plan-mode",
  "huo15-openclaw-verify-mode",
];

export function registerSkillInstaller(api: OpenClawPluginApi) {
  const openclawHome = resolveOpenClawHome(api);
  const defaultSkillsDir = join(openclawHome, "workspace", "skills");

  api.registerTool(
    ((_ctx: OpenClawPluginToolContext) => ({
      name: "enhance_install_skills",
      description: [
        "返回一键安装 4 个配套技能（explore-mode / plan-mode / verify-mode / memory-curator）的 CLI 命令。",
        "插件本身不执行任何外部进程，避免触发企业安全扫描器对『执行外部命令』的误报。",
        "使用场景：首次安装插件、切换 openclaw_home、或技能目录被清空后。",
      ].join("\n"),
      parameters: Type.Object({
        dir: Type.Optional(
          Type.String({
            description: `安装目录，默认 ${defaultSkillsDir}（openclaw_home/workspace/skills）`,
          }),
        ),
        missingOnly: Type.Optional(
          Type.Boolean({
            description: "只为未安装的技能生成命令，默认 true",
          }),
        ),
      }),
      async execute(_id: string, params: Record<string, unknown>) {
        const targetDir = String(params.dir ?? defaultSkillsDir);
        const missingOnly = params.missingOnly !== false;

        const status = CLAW_HUB_SKILLS.map((name) => ({
          name,
          installed: existsSync(join(targetDir, name)),
        }));
        const targets = missingOnly
          ? status.filter((s) => !s.installed).map((s) => s.name)
          : CLAW_HUB_SKILLS;

        if (targets.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `✓ 所有 4 个配套技能已在 ${targetDir} 安装完毕，无需操作。`,
              },
            ],
            structuredContent: { dir: targetDir, status, targets: [], cliCmds: [] },
          };
        }

        const cliCmds = targets.map(
          (name) => `clawhub install ${name} --dir ${JSON.stringify(targetDir)}`,
        );
        const oneLiner = cliCmds.join(" && ");

        const lines = [
          `→ 复制以下命令到终端执行，即可安装 ${targets.length} 个配套技能到：`,
          `  ${targetDir}`,
          ``,
          `一键执行（全部）：`,
          `  ${oneLiner}`,
          ``,
          `分步执行：`,
          ...cliCmds.map((c) => `  ${c}`),
          ``,
          `当前状态：`,
          ...status.map((s) => `  ${s.installed ? "✓" : "×"} ${s.name}`),
        ];

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: {
            dir: targetDir,
            status,
            targets,
            cliCmds,
            oneLiner,
          },
        };
      },
    })) as any,
    { name: "enhance_install_skills" },
  );

  api.logger.info("[enhance] 技能安装器已加载（enhance_install_skills，只返回命令不执行）");
}
