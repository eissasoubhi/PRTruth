#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { Command } from "commander";
import { renderJson } from "./json.js";
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
  .option("--output <path>", "Write the selected report format to a file")
  .action(async (options: {
    issue: number;
    pr: number;
    repo?: string;
    format: string;
    output?: string;
  }) => {
    try {
      const repository = options.repo ?? detectRepository();
      const report = await verifyPullRequest({
        repository,
        issueNumber: options.issue,
        prNumber: options.pr
      });

      let rendered: string;
      if (options.format === "json") {
        rendered = renderJson(report);
      } else if (options.format === "markdown") {
        rendered = renderMarkdown(report);
      } else if (options.format === "terminal") {
        rendered = renderTerminal(report);
      } else {
        throw new Error(`Unknown format: ${options.format}. Use terminal, markdown, or json.`);
      }

      if (options.output) {
        await writeFile(options.output, `${rendered}\n`, "utf8");
      } else {
        console.log(rendered);
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
