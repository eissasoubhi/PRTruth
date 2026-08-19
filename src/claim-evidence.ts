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
type DatabaseVersionScopeToken = `db:${DatabaseScopeToken}:${string}`;
type BrowserScopeToken = "chromium" | "chrome" | "firefox" | "webkit" | "safari";
type OperatingSystemScopeToken = "windows" | "macos" | "linux";
type ArchitectureScopeToken = "arm64" | "x64";
type ServiceScopeToken = "redis" | "rabbitmq" | "kafka" | "elasticsearch";
type RuntimeFamily = "node" | "php" | "python" | "go";
type RuntimeScopeToken = `${RuntimeFamily}:${string}`;
type FrameworkVersionScopeToken = `framework:spring-boot:${string}`;
type MatrixScopeToken = DatabaseScopeToken | DatabaseVersionScopeToken | BrowserScopeToken | OperatingSystemScopeToken | ArchitectureScopeToken | RuntimeScopeToken | FrameworkVersionScopeToken;
type StaticScopeToken = OperatingSystemScopeToken | ArchitectureScopeToken | DatabaseScopeToken | BrowserScopeToken | ServiceScopeToken;
type ScopeToken = StaticScopeToken | DatabaseVersionScopeToken | RuntimeScopeToken | FrameworkVersionScopeToken;

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure"
]);

const DATABASE_SCOPES = new Set<DatabaseScopeToken>(["postgres", "mysql", "sqlite", "mariadb"]);
const BROWSER_SCOPES = new Set<BrowserScopeToken>(["chromium", "chrome", "firefox", "webkit", "safari"]);
const OPERATING_SYSTEM_SCOPES = new Set<OperatingSystemScopeToken>(["windows", "macos", "linux"]);
const ARCHITECTURE_SCOPES = new Set<ArchitectureScopeToken>(["arm64", "x64"]);

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

function databaseVersionScopes(claim: string): DatabaseVersionScopeToken[] {
  const scopes: DatabaseVersionScopeToken[] = [];
  const definitions = [
    { database: "postgres", pattern: /\b(?:postgres(?:ql)?|pg)\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { database: "mysql", pattern: /\bmysql\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { database: "mariadb", pattern: /\bmariadb\s*v?(\d+(?:\.\d+){0,2})\b/gi },
    { database: "sqlite", pattern: /\bsqlite(?:3)?\s*v?(\d+(?:\.\d+){0,2})\b/gi }
  ] as const;

  for (const { database, pattern } of definitions) {
    for (const match of claim.matchAll(pattern)) {
      const version = match[1];
      if (version) scopes.push(`db:${database}:${version}` as DatabaseVersionScopeToken);
    }
  }

  return scopes;
}

function springBootVersionScopes(claim: string): FrameworkVersionScopeToken[] {
  const scopes: FrameworkVersionScopeToken[] = [];
  for (const match of claim.matchAll(/\bspring\s+boot\s*v?(\d+(?:\.\d+){1,2})\b/gi)) {
    const version = match[1];
    if (version) scopes.push(`framework:spring-boot:${version}`);
  }
  return scopes;
}

function databaseVersionFamilies(scopes: DatabaseVersionScopeToken[]): Set<DatabaseScopeToken> {
  return new Set(scopes.map((scope) => scope.split(":", 3)[1] as DatabaseScopeToken));
}

function claimScopes(claim: string): ScopeToken[] {
  const scopes: ScopeToken[] = [];
  if (/\bwindows\b|\bwin32\b/i.test(claim)) scopes.push("windows");
  if (/\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/i.test(claim)) scopes.push("macos");
  if (/\blinux\b/i.test(claim)) scopes.push("linux");
  if (/\barm64\b|\baarch64\b/i.test(claim)) scopes.push("arm64");
  if (/\bx64\b|\bx86_64\b|\bamd64\b/i.test(claim)) scopes.push("x64");

  const databaseVersions = databaseVersionScopes(claim);
  const versionedFamilies = databaseVersionFamilies(databaseVersions);
  if (/\bpostgres(?:ql)?\b|\bpg\b/i.test(claim) && !versionedFamilies.has("postgres")) scopes.push("postgres");
  if (/\bmysql\b/i.test(claim) && !versionedFamilies.has("mysql")) scopes.push("mysql");
  if (/\bsqlite(?:3)?\b/i.test(claim) && !versionedFamilies.has("sqlite")) scopes.push("sqlite");
  if (/\bmariadb\b/i.test(claim) && !versionedFamilies.has("mariadb")) scopes.push("mariadb");
  scopes.push(...databaseVersions);

  if (/\bchromium\b/i.test(claim)) scopes.push("chromium");
  if (/\bchrome\b|\bgoogle chrome\b/i.test(claim)) scopes.push("chrome");
  if (/\bfirefox\b/i.test(claim)) scopes.push("firefox");
  if (/\bwebkit\b/i.test(claim)) scopes.push("webkit");
  if (/\bsafari\b/i.test(claim)) scopes.push("safari");
  if (/\bredis\b/i.test(claim)) scopes.push("redis");
  if (/\brabbitmq\b|\brabbit mq\b/i.test(claim)) scopes.push("rabbitmq");
  if (/\bkafka\b|\bapache kafka\b/i.test(claim)) scopes.push("kafka");
  if (/\belasticsearch\b|\belastic search\b/i.test(claim)) scopes.push("elasticsearch");
  scopes.push(...springBootVersionScopes(claim));
  scopes.push(...runtimeScopes(claim));
  return scopes;
}

function isDatabaseScope(scope: ScopeToken): scope is DatabaseScopeToken {
  return !scope.includes(":") && DATABASE_SCOPES.has(scope as DatabaseScopeToken);
}

function isDatabaseVersionScope(scope: ScopeToken): scope is DatabaseVersionScopeToken {
  return scope.startsWith("db:");
}

function isFrameworkVersionScope(scope: ScopeToken): scope is FrameworkVersionScopeToken {
  return scope.startsWith("framework:spring-boot:");
}

function isBrowserScope(scope: ScopeToken): scope is BrowserScopeToken {
  return !scope.includes(":") && BROWSER_SCOPES.has(scope as BrowserScopeToken);
}

function isOperatingSystemScope(scope: ScopeToken): scope is OperatingSystemScopeToken {
  return !scope.includes(":") && OPERATING_SYSTEM_SCOPES.has(scope as OperatingSystemScopeToken);
}

function isArchitectureScope(scope: ScopeToken): scope is ArchitectureScopeToken {
  return !scope.includes(":") && ARCHITECTURE_SCOPES.has(scope as ArchitectureScopeToken);
}

function isRuntimeScope(scope: ScopeToken): scope is RuntimeScopeToken {
  return /^(?:node|php|python|go):/.test(scope);
}

function runtimeFamily(scope: RuntimeScopeToken): RuntimeFamily {
  return scope.split(":", 1)[0] as RuntimeFamily;
}

function runtimeMatrixScopes(scopes: ScopeToken[]): RuntimeScopeToken[] {
  const runtimes = scopes.filter(isRuntimeScope);
  const counts = new Map<RuntimeFamily, number>();
  for (const scope of runtimes) {
    const family = runtimeFamily(scope);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  return runtimes.filter((scope) => (counts.get(runtimeFamily(scope)) ?? 0) > 1);
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

function databaseVersionScopeMatches(name: string, scope: DatabaseVersionScopeToken): boolean {
  const [, database, version] = scope.split(":", 3);
  if (!database || !version) return false;
  const databasePattern = database === "postgres" ? "(?:postgres(?:ql)?|pg)" : database === "sqlite" ? "sqlite(?:3)?" : database;
  const versionPattern = escapeRegex(version).replace(/\\\./g, "\\.");
  return new RegExp(`\\b${databasePattern}\\s*v?${versionPattern}(?:\\b|\\.)`, "i").test(name);
}

function frameworkVersionScopeMatches(name: string, scope: FrameworkVersionScopeToken): boolean {
  const version = scope.split(":", 3)[2];
  if (!version) return false;
  const versionPattern = escapeRegex(version).replace(/\\\./g, "\\.");
  return new RegExp(`\\bspring\\s+boot\\s*v?${versionPattern}(?:\\b|\\.)`, "i").test(name);
}

function checkMatchesScope(check: CheckRunSummary, scope: ScopeToken): boolean {
  const name = check.name.toLowerCase();
  if (isDatabaseVersionScope(scope)) return databaseVersionScopeMatches(name, scope);
  if (isFrameworkVersionScope(scope)) return frameworkVersionScopeMatches(name, scope);
  if (isRuntimeScope(scope)) return runtimeScopeMatches(name, scope);
  if (scope === "windows") return /\bwindows\b|\bwin32\b/.test(name);
  if (scope === "macos") return /\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/.test(name);
  if (scope === "linux") return /\blinux\b/.test(name);
  if (scope === "arm64") return /\barm64\b|\baarch64\b/.test(name);
  if (scope === "x64") return /\bx64\b|\bx86_64\b|\bamd64\b/.test(name);
  if (scope === "postgres") return /\bpostgres(?:ql)?\b|\bpg\b/.test(name);
  if (scope === "mysql") return /\bmysql\b/.test(name);
  if (scope === "sqlite") return /\bsqlite(?:3)?\b/.test(name);
  if (scope === "mariadb") return /\bmariadb\b/.test(name);
  if (scope === "chromium") return /\bchromium\b/.test(name);
  if (scope === "chrome") return /\bchrome\b|\bgoogle chrome\b/.test(name);
  if (scope === "firefox") return /\bfirefox\b/.test(name);
  if (scope === "webkit") return /\bwebkit\b/.test(name);
  if (scope === "safari") return /\bsafari\b/.test(name);
  if (scope === "redis") return /\bredis\b/.test(name);
  if (scope === "rabbitmq") return /\brabbitmq\b|\brabbit mq\b/.test(name);
  if (scope === "kafka") return /\bkafka\b|\bapache kafka\b/.test(name);
  return /\belasticsearch\b|\belastic search\b/.test(name);
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
  return scopes.map((scope) => scope.replaceAll(":", " ")).join(", ");
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

function matrixScopeCombinations(scopes: ScopeToken[]): MatrixScopeToken[][] {
  const databases = scopes.filter((scope): scope is DatabaseScopeToken | DatabaseVersionScopeToken =>
    isDatabaseScope(scope) || isDatabaseVersionScope(scope)
  );
  const browsers = scopes.filter(isBrowserScope);
  const operatingSystems = scopes.filter(isOperatingSystemScope);
  const architectures = scopes.filter(isArchitectureScope);
  const frameworks = scopes.filter(isFrameworkVersionScope);
  const runtimeMatrices = runtimeMatrixScopes(scopes);
  const runtimeFamilies = [...new Set(runtimeMatrices.map(runtimeFamily))];
  const axes: MatrixScopeToken[][] = [];

  if (databases.length > 0) axes.push(databases);
  if (browsers.length > 0) axes.push(browsers);
  if (operatingSystems.length > 0) axes.push(operatingSystems);
  if (architectures.length > 0) axes.push(architectures);
  if (frameworks.length > 0) axes.push(frameworks);
  for (const family of runtimeFamilies) {
    axes.push(runtimeMatrices.filter((scope) => runtimeFamily(scope) === family));
  }

  if (axes.length === 0) return [[]];

  return axes.reduce<MatrixScopeToken[][]>(
    (combinations, axis) => combinations.flatMap((combination) => axis.map((scope) => [...combination, scope])),
    [[]]
  );
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
  const runtimeMatrices = runtimeMatrixScopes(scopes);
  const matrixScopes = scopes.filter((scope) =>
    isDatabaseScope(scope)
    || isDatabaseVersionScope(scope)
    || isBrowserScope(scope)
    || isOperatingSystemScope(scope)
    || isArchitectureScope(scope)
    || isFrameworkVersionScope(scope)
    || runtimeMatrices.includes(scope as RuntimeScopeToken)
  );
  const environmentScopes = scopes.filter((scope) => !matrixScopes.includes(scope as MatrixScopeToken));
  const matrixCombinations = matrixScopeCombinations(scopes);
  const matchesByCategory = categories.map((category) => {
    const environmentMatches = checks.filter((check) =>
      checkMatchesCategory(check, category)
      && environmentScopes.every((scope) => checkMatchesScope(check, scope))
    );

    if (matrixScopes.length === 0) {
      return { category, checks: environmentMatches, missingMatrixScopes: [] as MatrixScopeToken[][] };
    }

    const matrixMatches = matrixCombinations.map((combination) => ({
      scopes: combination,
      checks: environmentMatches.filter((check) => combination.every((scope) => checkMatchesScope(check, scope)))
    }));

    return {
      category,
      checks: dedupeChecks(matrixMatches.flatMap((entry) => entry.checks)),
      missingMatrixScopes: matrixMatches
        .filter((entry) => entry.checks.length === 0)
        .map((entry) => entry.scopes)
    };
  });
  const missing = matchesByCategory
    .filter((entry) => entry.checks.length === 0 || entry.missingMatrixScopes.length > 0)
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
