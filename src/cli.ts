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

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }
  return parsed;
}

const program = new Command();
program
  .name("prtruth")
  .description("Evidence-based verification for GitHub pull requests")
  .version(getPackageVersion());

program
  .command("verify")
  .description("Verify an existing pull request against a GitHub issue")
  .requiredOption("--issue <number>", "GitHub issue number", positiveInteger)
  .requiredOption("--pr <number>", "GitHub pull request number", positiveInteger)
  .option("--repo <owner/repo>", "GitHub repository; auto-detected by default")
  .option("--format <format>", "terminal, markdown, json, or badge", "terminal")
  .option("--output <path>", "Write the selected report format to a file")
  .option("--github-summary", "append the Markdown report to GITHUB_STEP_SUMMARY")
  .option("--comment", "create or update the PRTruth evidence comment on the pull request")
  .option(
    "--policy <policy>",
    "strict, failures-only, or report-only",
    parseVerificationPolicy,
    "strict"
  )
  .action(async (options: {
    issue: number;
    pr: number;
    repo?: string;
    format: string;
    output?: string;
    githubSummary?: boolean;
    comment?: boolean;
    policy: ReturnType<typeof parseVerificationPolicy>;
  }) => {
    try {
      const repository = options.repo ?? detectRepository();
      const report = await verifyPullRequest({
        repository,
        issueNumber: options.issue,
        prNumber: options.pr
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
        rendered = renderTerminal(report);
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

await program.parseAsync(process.argv);
