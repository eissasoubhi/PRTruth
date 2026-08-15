import { GitHubClient } from "./github.js";
import { discoverInstructionFiles } from "./instructions.js";
import { extractRequirements } from "./requirements.js";
import type { CheckRunSummary, Requirement, RequirementResult, VerificationReport } from "./types.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "must", "should",
  "have", "has", "are", "was", "were", "will", "not", "all", "any", "can", "its", "their", "our",
  "les", "des", "une", "dans", "avec", "pour", "que", "qui", "sur", "est", "être", "doit", "doivent"
]);

function tokenize(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_./-]+/gi, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
  )];
}

function checkCategory(text: string): string | null {
  if (/\btests?\b|\btest suite\b/i.test(text)) return "test";
  if (/\blint\b|eslint|phpstan|static analysis/i.test(text)) return "lint";
  if (/type[ -]?check|typescript/i.test(text)) return "type";
  if (/\bbuild\b|compile/i.test(text)) return "build";
  return null;
}

function evaluateRequirement(
  requirement: Requirement,
  changedFiles: string[],
  checks: CheckRunSummary[]
): RequirementResult {
  const category = checkCategory(requirement.text);
  if (category) {
    const matchingChecks = checks.filter((check) => check.name.toLowerCase().includes(category));
    if (matchingChecks.length > 0) {
      const failed = matchingChecks.find((check) =>
        ["failure", "cancelled", "timed_out", "action_required", "startup_failure"].includes(
          check.conclusion ?? ""
        )
      );
      if (failed) {
        return {
          requirement,
          status: "FAILED",
          reason: `A matching CI check failed: ${failed.name}.`,
          evidence: [{ kind: "ci", summary: `${failed.name}: ${failed.conclusion ?? failed.status}` }]
        };
      }

      const successful = matchingChecks.filter((check) => check.conclusion === "success");
      if (successful.length === matchingChecks.length) {
        return {
          requirement,
          status: "PROVEN",
          reason: "Matching CI checks completed successfully.",
          evidence: successful.map((check) => ({
            kind: "ci" as const,
            summary: `${check.name}: success`,
            ...(check.htmlUrl ? { url: check.htmlUrl } : {})
          }))
        };
      }
    }
  }

  const terms = tokenize(requirement.text);
  const candidates = changedFiles.filter((file) => {
    const lower = file.toLowerCase();
    return terms.some((term) => lower.includes(term));
  });

  return {
    requirement,
    status: "UNPROVEN",
    reason:
      candidates.length > 0
        ? "Changed files are relevant, but file changes alone do not prove the requirement."
        : "No deterministic evidence currently proves this requirement.",
    evidence: candidates.slice(0, 5).map((file) => ({ kind: "diff", summary: `Changed file: ${file}` }))
  };
}

export async function verifyPullRequest(input: {
  repository: string;
  issueNumber: number;
  prNumber: number;
  token?: string;
}): Promise<VerificationReport> {
  const client = new GitHubClient(input.token);
  const [issue, pull, files, instructions] = await Promise.all([
    client.getIssue(input.repository, input.issueNumber),
    client.getPull(input.repository, input.prNumber),
    client.getPullFiles(input.repository, input.prNumber),
    discoverInstructionFiles(client, input.repository)
  ]);

  const checkRuns = await client.getCheckRuns(input.repository, pull.head.sha);
  const checks: CheckRunSummary[] = checkRuns.map((check) => ({
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
    ...(check.html_url ? { htmlUrl: check.html_url } : {})
  }));

  const requirements = extractRequirements(issue.body ?? "");
  const changedFiles = files.map((file) => file.filename);
  const results = requirements.map((requirement) => evaluateRequirement(requirement, changedFiles, checks));

  const verdict = results.some((result) => result.status === "FAILED")
    ? "FAILED"
    : results.length > 0 && results.every((result) => result.status === "PROVEN")
      ? "PROVEN"
      : "NOT_PROVEN";

  return {
    repository: input.repository,
    issueNumber: input.issueNumber,
    issueTitle: issue.title,
    prNumber: input.prNumber,
    prTitle: pull.title,
    changedFiles,
    checks,
    instructions,
    results,
    verdict
  };
}
