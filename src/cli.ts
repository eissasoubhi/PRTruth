#!/usr/bin/env node
import { Command } from "commander";
import { detectRepository } from "./repository.js";
import { renderMarkdown, renderTerminal } from "./report.js";
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
  .version("0.0.0");

program
  .command("verify")
  .description("Verify an existing pull request against a GitHub issue")
  .requiredOption("--issue <number>", "GitHub issue number", positiveInteger)
  .requiredOption("--pr <number>", "GitHub pull request number", positiveInteger)
  .option("--repo <owner/repo>", "GitHub repository; auto-detected by default")
  .option("--format <format>", "terminal, markdown, or json", "terminal")
  .action(async (options: { issue: number; pr: number; repo?: string; format: string }) => {
    try {
      const repository = options.repo ?? detectRepository();
      const report = await verifyPullRequest({
        repository,
        issueNumber: options.issue,
        prNumber: options.pr
      });

      if (options.format === "json") {
        console.log(JSON.stringify(report, null, 2));
      } else if (options.format === "markdown") {
        console.log(renderMarkdown(report));
      } else if (options.format === "terminal") {
        console.log(renderTerminal(report));
      } else {
        throw new Error(`Unknown format: ${options.format}. Use terminal, markdown, or json.`);
      }

      if (report.verdict !== "PROVEN") {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(`PRTruth error: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
    }
  });

await program.parseAsync(process.argv);
