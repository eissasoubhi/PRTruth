import type {
  CheckRunSummary,
  ClaimResult,
  CompletionClaim,
  EvidenceStatus
} from "./types.js";

export interface ClaimEvidenceAssessment {
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
}

type CheckCategory = "install" | "test" | "lint" | "type" | "build";

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure"
]);

const FILE_MATCH_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "must", "should",
  "have", "has", "are", "was", "were", "will", "not", "all", "any", "can", "its", "their", "our",
  "added", "add", "fix", "fixed", "support", "supports", "first", "flow", "ux"
]);

const GENERIC_UNPROVEN_REASON = "No deterministic evidence rule currently matches this completion claim.";

function claimCategories(claim: string): CheckCategory[] {
  const categories: CheckCategory[] = [];

  if (/\binstall(?:ation|ed|s)?\b|\bdependencies\b/i.test(claim)) categories.push("install");
  if (/\btests?\b|\btest suite\b/i.test(claim)) categories.push("test");
  if (/\blint(?:ing)?\b|eslint|phpstan|static analysis/i.test(claim)) categories.push("lint");
  if (/type[ -]?check|typescript/i.test(claim)) categories.push("type");
  if (/\bbuild\b|compile|compilation/i.test(claim)) categories.push("build");

  return categories;
}

function checkMatchesCategory(check: CheckRunSummary, category: CheckCategory): boolean {
  const name = check.name.toLowerCase();

  if (category === "install") {
    return /\binstall\b|dependencies|npm ci|pnpm install|composer install/.test(name);
  }
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

function dedupeChecks(checks: CheckRunSummary[]): CheckRunSummary[] {
  const seen = new Set<string>();
  return checks.filter((check) => {
    const key = `${check.name}\u0000${check.status}\u0000${check.conclusion ?? ""}\u0000${check.htmlUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function categoryLabel(categories: CheckCategory[]): string {
  return categories.join(", ");
}

function claimTerms(text: string): string[] {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_./-]+/gi, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !FILE_MATCH_STOP_WORDS.has(term))
  )];
}

function relevantChangedFiles(claim: string, changedFiles: string[]): string[] {
  const terms = claimTerms(claim);
  if (terms.length === 0) return [];

  return changedFiles
    .filter((file) => {
      const lower = file.toLowerCase();
      return terms.some((term) => lower.includes(term));
    })
    .slice(0, 5);
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

  const categories = claimCategories(claim);
  if (categories.length === 0) {
    return {
      status: "UNPROVEN",
      reason: GENERIC_UNPROVEN_REASON,
      matchedChecks: []
    };
  }

  const matchesByCategory = categories.map((category) => ({
    category,
    checks: checks.filter((check) => checkMatchesCategory(check, category))
  }));
  const missing = matchesByCategory.filter((entry) => entry.checks.length === 0).map((entry) => entry.category);
  const matchedChecks = dedupeChecks(matchesByCategory.flatMap((entry) => entry.checks));

  if (missing.length > 0) {
    return {
      status: "UNPROVEN",
      reason: `No matching ${categoryLabel(missing)} check was observed.`,
      matchedChecks
    };
  }

  const failed = matchedChecks.find((check) => FAILED_CONCLUSIONS.has(check.conclusion ?? ""));
  if (failed) {
    return {
      status: "FAILED",
      reason: `A matching CI check failed: ${failed.name}.`,
      matchedChecks
    };
  }

  const incomplete = matchedChecks.find(
    (check) => check.status !== "completed" || check.conclusion === null
  );
  if (incomplete) {
    return {
      status: "UNPROVEN",
      reason: `A matching CI check has not completed: ${incomplete.name}.`,
      matchedChecks
    };
  }

  if (matchedChecks.every((check) => check.conclusion === "success")) {
    return {
      status: "PROVEN",
      reason: `All observed ${categoryLabel(categories)} checks completed successfully.`,
      matchedChecks
    };
  }

  return {
    status: "UNPROVEN",
    reason: `Matching ${categoryLabel(categories)} checks did not provide a definitive success or failure result.`,
    matchedChecks
  };
}

export function buildClaimResults(
  claims: CompletionClaim[],
  checks: CheckRunSummary[],
  changedFiles: string[] = []
): ClaimResult[] {
  return claims.map((claim) => {
    const assessment = assessCompletionClaim(claim.text, checks);
    const candidateFiles = assessment.reason === GENERIC_UNPROVEN_REASON
      ? relevantChangedFiles(claim.text, changedFiles)
      : [];

    return {
      claim,
      status: assessment.status,
      reason: candidateFiles.length > 0
        ? "Changed files are relevant, but no deterministic evidence rule currently proves this completion claim."
        : assessment.reason,
      evidence: [
        ...assessment.matchedChecks.map((check) => ({
          kind: "ci" as const,
          summary: `${check.name}: ${check.conclusion ?? check.status}`,
          ...(check.htmlUrl ? { url: check.htmlUrl } : {})
        })),
        ...candidateFiles.map((file) => ({
          kind: "diff" as const,
          summary: `Changed file: ${file}`
        }))
      ]
    };
  });
}
