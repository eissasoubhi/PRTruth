import type { CheckRunSummary, EvidenceStatus } from "./types.js";

export interface ClaimEvidenceAssessment {
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
}

type CheckCategory = "test" | "lint" | "type" | "build";

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure"
]);

function claimCategory(claim: string): CheckCategory | null {
  if (/\btests?\b|\btest suite\b/i.test(claim)) return "test";
  if (/\blint(?:ing)?\b|eslint|phpstan|static analysis/i.test(claim)) return "lint";
  if (/type[ -]?check|typescript/i.test(claim)) return "type";
  if (/\bbuild\b|compile|compilation/i.test(claim)) return "build";
  return null;
}

function checkMatchesCategory(check: CheckRunSummary, category: CheckCategory): boolean {
  const name = check.name.toLowerCase();

  if (category === "test") {
    return /\btest\b|tests|vitest|jest|phpunit|pytest|go test/.test(name);
  }
  if (category === "lint") {
    return /\blint\b|eslint|phpstan|static analysis/.test(name);
  }
  if (category === "type") {
    return /type[ -]?check|typescript|\btypes\b/.test(name);
  }
  return /\bbuild\b|compile|compilation/.test(name);
}

function isNoBreakingChangesClaim(claim: string): boolean {
  return /\bno\s+breaking\s+changes?\b|\bbackward[- ]compatible\b/i.test(claim);
}

function isNoRegressionClaim(claim: string): boolean {
  return /\bno\s+regressions?\b/i.test(claim);
}

export function assessCompletionClaim(
  claim: string,
  checks: CheckRunSummary[]
): ClaimEvidenceAssessment {
  if (isNoBreakingChangesClaim(claim)) {
    return {
      status: "UNPROVEN",
      reason: "A no-breaking-changes claim requires API or schema compatibility evidence, not only CI status.",
      matchedChecks: []
    };
  }

  if (isNoRegressionClaim(claim)) {
    return {
      status: "UNPROVEN",
      reason: "A no-regressions claim is broader than the deterministic evidence currently available.",
      matchedChecks: []
    };
  }

  const category = claimCategory(claim);
  if (!category) {
    return {
      status: "UNPROVEN",
      reason: "No deterministic evidence rule currently matches this completion claim.",
      matchedChecks: []
    };
  }

  const matchedChecks = checks.filter((check) => checkMatchesCategory(check, category));
  if (matchedChecks.length === 0) {
    return {
      status: "UNPROVEN",
      reason: `No matching ${category} check was observed.`,
      matchedChecks
    };
  }

  const failed = matchedChecks.find((check) => FAILED_CONCLUSIONS.has(check.conclusion ?? ""));
  if (failed) {
    return {
      status: "FAILED",
      reason: `A matching ${category} check failed: ${failed.name}.`,
      matchedChecks
    };
  }

  const incomplete = matchedChecks.find(
    (check) => check.status !== "completed" || check.conclusion === null
  );
  if (incomplete) {
    return {
      status: "UNPROVEN",
      reason: `A matching ${category} check has not completed: ${incomplete.name}.`,
      matchedChecks
    };
  }

  if (matchedChecks.every((check) => check.conclusion === "success")) {
    return {
      status: "PROVEN",
      reason: `All observed ${category} checks completed successfully.`,
      matchedChecks
    };
  }

  return {
    status: "UNPROVEN",
    reason: `Matching ${category} checks did not provide a definitive success or failure result.`,
    matchedChecks
  };
}
