#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { renderVerificationBadge } from "./badge.js";
import { writeGitHubStepSummary } from "./github-summary.js";
import { renderJson } from "./json.js";
import { parseVerificationPolicy, shouldFailVerification } from "./policy.js";
import { upsertPullRequestComment } from "./pr-comment.js";
import { detectRepository } from "./repository.js";
import { renderMarkdown, renderTerminal } from "./report.js";
import { getPackageVersion } from "./version.js";
import { verifyPullRequest } from "./verify.js";

type ColorMode = "auto" | "always" | "never";

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }
  return parsed;
}

function parseColorMode(value: string): ColorMode {
  if (value === "auto" || value === "always" || value === "never") {
    return value;
  }
  throw new Error(`Unknown color mode: ${value}. Use auto, always, or never.`);
}

function shouldUseTerminalColor(mode: ColorMode, outputPath?: string): boolean {
  if (outputPath) {
    return false;
  }
  if (mode === "always") {
    return true;
  }
  if (mode === "never") {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(process.env, "NO_COLOR")) {
    return false;
  }
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") {
    return true;
  }
  return Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb";
}

function renderVerifyOptionReference(command: Command): string {
  const entries = command.options.map((option) => [option.flags, option.description] as const);
  const width = Math.max(...entries.map(([flags]) => flags.length), 0);

  return [
    "",
    "Verify arguments:",
    "  No positional arguments. The verify command uses the options below.",
    "",
    "Verify options:",
    ...entries.map(([flags, description]) => `  ${flags.padEnd(width)}  ${description}`),
    "",
    "Examples:",
    "  prtruth verify --pr 42",
    "  prtruth verify --repo owner/repository --issue 12 --pr 42 --policy report-only",
    "  prtruth verify --pr 42 --format json --output prtruth.json",
    "  prtruth verify --pr 42 --color always",
    "",
    "Environment:",
    "  GITHUB_TOKEN  Token used to read GitHub API data when authentication is needed.",
    "  NO_COLOR      Disable automatic ANSI colors.",
    "  FORCE_COLOR   Enable colors in auto mode when set to a non-zero value."
  ].join("\n");
}

const program = new Command();
program
  .name("prtruth")
  .description("Evidence-based verification for GitHub pull requests")
  .version(getPackageVersion())
  .showHelpAfterError();

const verifyCommand = program
  .command("verify")
  .description("Verify an existing pull request against a GitHub issue")
  .option(
    "--issue <number>",
    "GitHub issue number; inferred from a single Fixes/Closes/Resolves #123 reference when omitted",
    positiveInteger
  )
  .requiredOption("--pr <number>", "GitHub pull request number (required)", positiveInteger)
  .option("--repo <owner/repo>", "GitHub repository; auto-detected by default")
  .option("--format <format>", "Report format: terminal, markdown, json, or badge (default: terminal)", "terminal")
  .option("--output <path>", "Write the selected report format to a file; terminal colors are disabled")
  .option("--github-summary", "Append the Markdown report to GITHUB_STEP_SUMMARY")
  .option("--comment", "Create or update the PRTruth evidence comment on the pull request")
  .option(
    "--policy <policy>",
    "Exit policy: strict, failures-only, or report-only (default: strict)",
    parseVerificationPolicy,
    "strict"
  )
  .option(
    "--color <mode>",
    "Terminal colors: auto, always, or never (default: auto)",
    parseColorMode,
    "auto"
  )
  .action(async (options: {
    issue?: number;
    pr: number;
    repo?: string;
    format: string;
    output?: string;
    githubSummary?: boolean;
    comment?: boolean;
    policy: ReturnType<typeof parseVerificationPolicy>;
    color: ColorMode;
  }) => {
    try {
      const repository = options.repo ?? detectRepository();
      const report = await verifyPullRequest({
        repository,
        prNumber: options.pr,
        ...(options.issue !== undefined ? { issueNumber: options.issue } : {})
      });
      const markdown = renderMarkdown(report);

      let rendered: string;
      if (options.format === "json") {
        rendered = renderJson(report);
      } else if (options.format === "markdown") {
        rendered = markdown;
      } else if (options.format === "badge") {
        rendered = renderVerificationBadge(report);
      } else if (options.format === "terminal") {
        rendered = renderTerminal(report, {
          color: shouldUseTerminalColor(options.color, options.output)
        });
      } else {
        throw new Error(
          `Unknown format: ${options.format}. Use terminal, markdown, json, or badge.`
        );
      }

      if (options.githubSummary) {
        const written = await writeGitHubStepSummary(markdown);
        if (!written) {
          throw new Error("--github-summary requires GITHUB_STEP_SUMMARY to be set.");
        }
      }

      if (options.output) {
        await writeFile(options.output, `${rendered}\n`, "utf8");
      } else {
        console.log(rendered);
      }

      if (options.comment) {
        const published = await upsertPullRequestComment({
          repository,
          prNumber: options.pr,
          body: markdown
        });
        console.error(
          `PRTruth evidence comment ${published.action}${published.htmlUrl ? `: ${published.htmlUrl}` : ` (#${published.commentId})`}`
        );
      }

      if (shouldFailVerification(report.verdict, options.policy)) {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(`PRTruth error: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
    }
  });

program.addHelpText("after", () => renderVerifyOptionReference(verifyCommand));

await program.parseAsync(process.argv);
