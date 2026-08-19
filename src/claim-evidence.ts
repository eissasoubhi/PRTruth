import { assessGenericCiSuccess } from "./ci-evidence.js";
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
type DatabaseScopeToken = "postgres" | "mysql" | "sqlite" | "mariadb";
type StaticScopeToken = "windows" | "macos" | "linux" | "arm64" | "x64" | DatabaseScopeToken;
type RuntimeScopeToken = `node:${string}` | `php:${string}` | `python:${string}` | `go:${string}`;
type ScopeToken = StaticScopeToken | RuntimeScopeToken;

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure"
]);

const DATABASE_SCOPES = new Set<DatabaseScopeToken>(["postgres", "mysql", "sqlite", "mariadb"]);

const FILE_MATCH_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "when", "then", "must", "should",
  "have", "has", "are", "was", "were", "will", "not", "all", "any", "can", "its", "their", "our",
  "added", "add", "fix", "fixed", "support", "supports", "first", "flow", "ux"
]);

const GENERIC_UNPROVEN_REASON = "No deterministic evidence rule currently matches this completion claim.";
const TEST_COVERAGE_UNPROVEN_REASON =
  "A specific test-coverage claim requires evidence that the named behavior is exercised, not only a successful test run.";

function claimCategories(claim: string): CheckCategory[] {
  const categories: CheckCategory[] = [];

  if (/\binstall(?:ation|ed|s)?\b|\bdependencies\b/i.test(claim)) categories.push("install");
  if (/\btests?\b|\btest suite\b/i.test(claim)) categories.push("test");
  if (/\blint(?:ing)?\b|eslint|phpstan|static analysis/i.test(claim)) categories.push("lint");
  if (/type[ -]?check|typescript/i.test(claim)) categories.push("type");
  if (/\bbuild\b|compile|compilation/i.test(claim)) categories.push("build");

  return categories;
}

function runtimeScopes(claim: string): RuntimeScopeToken[] {
  const scopes: RuntimeScopeToken[] = [];
  const definitions = [
    { runtime: "node", pattern: /\b(?:node(?:\.js)?|nodejs)\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { runtime: "php", pattern: /\bphp\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { runtime: "python", pattern: /\bpython\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { runtime: "go", pattern: /\bgo\s*v?(\d+(?:\.\d+){0,2})\b/gi }
  ] as const;

  for (const { runtime, pattern } of definitions) {
    for (const match of claim.matchAll(pattern)) {
      const version = match[1];
      if (version) scopes.push(`${runtime}:${version}` as RuntimeScopeToken);
    }
  }

  return scopes;
}

function claimScopes(claim: string): ScopeToken[] {
  const scopes: ScopeToken[] = [];
  if (/\bwindows\b|\bwin32\b/i.test(claim)) scopes.push("windows");
  if (/\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/i.test(claim)) scopes.push("macos");
  if (/\blinux\b/i.test(claim)) scopes.push("linux");
  if (/\barm64\b|\baarch64\b/i.test(claim)) scopes.push("arm64");
  if (/\bx64\b|\bx86_64\b|\bamd64\b/i.test(claim)) scopes.push("x64");
  if (/\bpostgres(?:ql)?\b/i.test(claim)) scopes.push("postgres");
  if (/\bmysql\b/i.test(claim)) scopes.push("mysql");
  if (/\bsqlite(?:3)?\b/i.test(claim)) scopes.push("sqlite");
  if (/\bmariadb\b/i.test(claim)) scopes.push("mariadb");
  scopes.push(...runtimeScopes(claim));
  return scopes;
}

function isDatabaseScope(scope: ScopeToken): scope is DatabaseScopeToken {
  return !scope.includes(":") && DATABASE_SCOPES.has(scope as DatabaseScopeToken);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runtimeScopeMatches(name: string, scope: RuntimeScopeToken): boolean {
  const [runtime, version] = scope.split(":", 2);
  if (!runtime || !version) return false;
  const runtimePattern = runtime === "node"
    ? "(?:node(?:\\.js)?|nodejs)"
    : runtime;
  const versionPattern = escapeRegex(version).replace(/\\\./g, "\\.");
  return new RegExp(`\\b${runtimePattern}\\s*v?${versionPattern}(?:\\b|\\.)`, "i").test(name);
}

function checkMatchesScope(check: CheckRunSummary, scope: ScopeToken): boolean {
  const name = check.name.toLowerCase();
  if (scope.includes(":")) return runtimeScopeMatches(name, scope as RuntimeScopeToken);
  if (scope === "windows") return /\bwindows\b|\bwin32\b/.test(name);
  if (scope === "macos") return /\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/.test(name);
  if (scope === "linux") return /\blinux\b/.test(name);
  if (scope === "arm64") return /\barm64\b|\baarch64\b/.test(name);
  if (scope === "x64") return /\bx64\b|\bx86_64\b|\bamd64\b/.test(name);
  if (scope === "postgres") return /\bpostgres(?:ql)?\b/.test(name);
  if (scope === "mysql") return /\bmysql\b/.test(name);
  if (scope === "sqlite") return /\bsqlite(?:3)?\b/.test(name);
  return /\bmariadb\b/.test(name);
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
  return /\bno\s+breaking(?:\s+(?:api|schema|contract|public[- ]api))?\s+changes?\b|\bbackward[- ]compatible\b/i.test(claim);
}

function isNoRegressionClaim(claim: string): boolean {
  return /\bno\s+regressions?\b/i.test(claim);
}

function isSpecificTestCoverageClaim(claim: string): boolean {
  return /\btests?\s+(?:for|cover(?:s|ed|ing)?|verify|verifies|validat(?:e|es|ed|ing))\b/i.test(claim)
    || /\b(?:test\s+coverage|coverage\s+(?:for|of)|covered\s+by\s+tests?)\b/i.test(claim);
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

function scopeLabel(scopes: ScopeToken[]): string {
  return scopes.map((scope) => scope.replace(":", " ")).join(", ");
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

  if (isSpecificTestCoverageClaim(claim)) {
    return {
      status: "UNPROVEN",
      reason: TEST_COVERAGE_UNPROVEN_REASON,
      matchedChecks: []
    };
  }

  const categories = claimCategories(claim);
  if (categories.length === 0) {
    const overallCi = assessGenericCiSuccess(claim, checks);
    if (overallCi) return overallCi;

    return {
      status: "UNPROVEN",
      reason: GENERIC_UNPROVEN_REASON,
      matchedChecks: []
    };
  }

  const scopes = claimScopes(claim);
  const databaseScopes = scopes.filter(isDatabaseScope);
  const environmentScopes = scopes.filter((scope) => !isDatabaseScope(scope));
  const matchesByCategory = categories.map((category) => {
    const environmentMatches = checks.filter((check) =>
      checkMatchesCategory(check, category)
      && environmentScopes.every((scope) => checkMatchesScope(check, scope))
    );

    if (databaseScopes.length === 0) {
      return { category, checks: environmentMatches, missingDatabaseScopes: [] as DatabaseScopeToken[] };
    }

    const databaseMatches = databaseScopes.map((scope) => ({
      scope,
      checks: environmentMatches.filter((check) => checkMatchesScope(check, scope))
    }));

    return {
      category,
      checks: dedupeChecks(databaseMatches.flatMap((entry) => entry.checks)),
      missingDatabaseScopes: databaseMatches
        .filter((entry) => entry.checks.length === 0)
        .map((entry) => entry.scope)
    };
  });
  const missing = matchesByCategory
    .filter((entry) => entry.checks.length === 0 || entry.missingDatabaseScopes.length > 0)
    .map((entry) => entry.category);
  const matchedChecks = dedupeChecks(matchesByCategory.flatMap((entry) => entry.checks));

  if (missing.length > 0) {
    const scopeSuffix = scopes.length > 0 ? ` for the claimed scope (${scopeLabel(scopes)})` : "";
    return {
      status: "UNPROVEN",
      reason: `No matching ${categoryLabel(missing)} check was observed${scopeSuffix}.`,
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
    const shouldShowCandidateFiles =
      assessment.reason === GENERIC_UNPROVEN_REASON || assessment.reason === TEST_COVERAGE_UNPROVEN_REASON;
    const candidateFiles = shouldShowCandidateFiles
      ? relevantChangedFiles(claim.text, changedFiles)
      : [];

    return {
      claim,
      status: assessment.status,
      reason:
        assessment.reason === GENERIC_UNPROVEN_REASON && candidateFiles.length > 0
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
