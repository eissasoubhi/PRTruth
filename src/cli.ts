#!/usr/bin/env node

import { Command, InvalidArgumentError } from 'commander';
import { assessRequirement, overallVerdict } from './evidence.js';
import { extractClaims, extractRequirements } from './extract.js';
import { GitHubClient } from './github.js';
import { renderJson, renderMarkdown, renderTerminal } from './report.js';
import { inferRepository } from './repo.js';
import type { VerificationReport } from './types.js';

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new InvalidArgumentError('Expected a positive integer.');
  return parsed;
}

const program = new Command();
program
  .name('prtruth')
  .description('Check whether a pull request proves the issue requirements it claims to solve.')
  .version('0.0.0');

program
  .command('verify')
  .description('Build an evidence report from an existing GitHub issue and pull request.')
  .requiredOption('--issue <number>', 'GitHub issue number', positiveInteger)
  .requiredOption('--pr <number>', 'GitHub pull request number', positiveInteger)
  .option('--repo <owner/name>', 'GitHub repository; inferred from git remote when omitted')
  .option('--format <format>', 'terminal, markdown, or json', 'terminal')
  .action(async (options: { issue: number; pr: number; repo?: string; format: string }) => {
    try {
      if (!['terminal', 'markdown', 'json'].includes(options.format)) {
        throw new Error('--format must be terminal, markdown, or json.');
      }

      const repository = options.repo ?? inferRepository();
      const github = new GitHubClient();

      const [issue, pullRequest, files] = await Promise.all([
        github.getIssue(repository, options.issue),
        github.getPullRequest(repository, options.pr),
        github.getPullFiles(repository, options.pr),
      ]);
      const [checks, instructionFiles] = await Promise.all([
        github.getChecks(repository, pullRequest.head.sha),
        github.getInstructionFiles(repository, pullRequest.head.sha),
      ]);

      const requirements = extractRequirements(issue.body, issue.title);
      const assessments = requirements.map((requirement) => assessRequirement(requirement, files, checks));
      const report: VerificationReport = {
        repository,
        issue: { number: issue.number, title: issue.title, html_url: issue.html_url },
        pullRequest: {
          number: pullRequest.number,
          title: pullRequest.title,
          html_url: pullRequest.html_url,
        },
        assessments,
        instructionFiles,
        claims: extractClaims(pullRequest.body),
        verdict: overallVerdict(assessments),
      };

      const output =
        options.format === 'json'
          ? renderJson(report)
          : options.format === 'markdown'
            ? renderMarkdown(report)
            : renderTerminal(report);
      process.stdout.write(`${output}\n`);

      if (report.verdict === 'failed') process.exitCode = 2;
      else if (report.verdict === 'unproven') process.exitCode = 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`PRTruth error: ${message}\n`);
      process.exitCode = 2;
    }
  });

await program.parseAsync(process.argv);
