import type { CheckRunSummary, EvidenceStatus } from "./types.js";

const FAILED_CONCLUSIONS = new Set([
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
  "startup_failure"
]);

export interface CiEvidenceAssessment {
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
}

interface ScopeMatcher {
  label: string;
  matches(name: string): boolean;
}

interface GenericCiScopeRequirements {
  axes: ScopeMatcher[][];
  environment: ScopeMatcher[];
}

function hasSuccessLanguage(text: string): boolean {
  return /\b(?:pass(?:es|ed)?|succeed(?:s|ed)?|success(?:ful(?:ly)?)?|green)\b/i.test(text);
}

function matcher(label: string, pattern: RegExp): ScopeMatcher {
  return {
    label,
    matches: (name: string) => pattern.test(name)
  };
}

function runtimeMatchers(text: string, runtime: "node" | "php" | "python" | "go"): ScopeMatcher[] {
  const runtimePattern = runtime === "node" ? "(?:node(?:\\.js)?|nodejs)" : runtime;
  const claimPattern = new RegExp(`\\b${runtimePattern}\\s*v?(\\d+(?:\\.\\d+){0,2})\\b`, "gi");
  const versions = [...new Set([...text.matchAll(claimPattern)].map((match) => match[1]).filter(Boolean))] as string[];

  return versions.map((version) => {
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return matcher(
      `${runtime} ${version}`,
      new RegExp(`\\b${runtimePattern}\\s*v?${escapedVersion}(?:\\b|\\.)`, "i")
    );
  });
}

function genericCiScopeRequirements(text: string): GenericCiScopeRequirements | null {
  const axes: ScopeMatcher[][] = [];
  const environment: ScopeMatcher[] = [];

  const operatingSystems: ScopeMatcher[] = [];
  if (/\bwindows\b|\bwin32\b/i.test(text)) operatingSystems.push(matcher("windows", /\bwindows\b|\bwin32\b/i));
  if (/\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/i.test(text)) operatingSystems.push(matcher("macos", /\bmacos\b|\bmac os\b|\bosx\b|\bdarwin\b/i));
  if (/\blinux\b/i.test(text)) operatingSystems.push(matcher("linux", /\blinux\b/i));
  if (operatingSystems.length > 0) axes.push(operatingSystems);

  const architectures: ScopeMatcher[] = [];
  if (/\barm64\b|\baarch64\b/i.test(text)) architectures.push(matcher("arm64", /\barm64\b|\baarch64\b/i));
  if (/\bx64\b|\bx86_64\b|\bamd64\b/i.test(text)) architectures.push(matcher("x64", /\bx64\b|\bx86_64\b|\bamd64\b/i));
  if (architectures.length > 0) axes.push(architectures);

  const databases: ScopeMatcher[] = [];
  if (/\bpostgres(?:ql)?\b/i.test(text)) databases.push(matcher("postgres", /\bpostgres(?:ql)?\b/i));
  if (/\bmysql\b/i.test(text)) databases.push(matcher("mysql", /\bmysql\b/i));
  if (/\bsqlite(?:3)?\b/i.test(text)) databases.push(matcher("sqlite", /\bsqlite(?:3)?\b/i));
  if (/\bmariadb\b/i.test(text)) databases.push(matcher("mariadb", /\bmariadb\b/i));
  if (databases.length > 0) axes.push(databases);

  const browsers: ScopeMatcher[] = [];
  if (/\bchromium\b/i.test(text)) browsers.push(matcher("chromium", /\bchromium\b/i));
  if (/\bchrome\b|\bgoogle chrome\b/i.test(text)) browsers.push(matcher("chrome", /\bchrome\b|\bgoogle chrome\b/i));
  if (/\bfirefox\b/i.test(text)) browsers.push(matcher("firefox", /\bfirefox\b/i));
  if (/\bwebkit\b/i.test(text)) browsers.push(matcher("webkit", /\bwebkit\b/i));
  if (/\bsafari\b/i.test(text)) browsers.push(matcher("safari", /\bsafari\b/i));
  if (browsers.length > 0) axes.push(browsers);

  const summernoteHosts: ScopeMatcher[] = [];
  if (/\bbootstrap\s*3\b|\bbs3\b/i.test(text)) {
    summernoteHosts.push(matcher("bootstrap 3", /\bbootstrap\s*3\b|\bbs3\b/i));
  }
  if (/\bbootstrap\s*4\b|\bbs4\b/i.test(text)) {
    summernoteHosts.push(matcher("bootstrap 4", /\bbootstrap\s*4\b|\bbs4\b/i));
  }
  if (/\bbootstrap\s*5\b|\bbs5\b/i.test(text)) {
    summernoteHosts.push(matcher("bootstrap 5", /\bbootstrap\s*5\b|\bbs5\b/i));
  }
  if (/\bsummernote\b/i.test(text) && /\blite\b/i.test(text)) {
    summernoteHosts.push(matcher("summernote lite", /\bsummernote\s+lite\b|\blite\b/i));
  }
  if (summernoteHosts.length > 0) axes.push(summernoteHosts);

  for (const runtime of ["node", "php", "python", "go"] as const) {
    const runtimes = runtimeMatchers(text, runtime);
    if (runtimes.length > 0) axes.push(runtimes);
  }

  if (/\bredis\b/i.test(text)) environment.push(matcher("redis", /\bredis\b/i));
  if (/\brabbitmq\b|\brabbit mq\b/i.test(text)) environment.push(matcher("rabbitmq", /\brabbitmq\b|\brabbit mq\b/i));
  if (/\bkafka\b|\bapache kafka\b/i.test(text)) environment.push(matcher("kafka", /\bkafka\b|\bapache kafka\b/i));
  if (/\belasticsearch\b|\belastic search\b/i.test(text)) environment.push(matcher("elasticsearch", /\belasticsearch\b|\belastic search\b/i));

  return axes.length > 0 || environment.length > 0 ? { axes, environment } : null;
}

function missingScopeCombinations(
  checks: CheckRunSummary[],
  requirements: GenericCiScopeRequirements
): string[][] {
  const environmentMatches = checks.filter((check) =>
    requirements.environment.every((scope) => scope.matches(check.name))
  );
  const combinations = requirements.axes.reduce<ScopeMatcher[][]>(
    (current, axis) => current.flatMap((combination) => axis.map((scope) => [...combination, scope])),
    [[]]
  );

  return combinations
    .filter((combination) => !environmentMatches.some((check) => combination.every((scope) => scope.matches(check.name))))
    .map((combination) => [
      ...requirements.environment.map((scope) => scope.label),
      ...combination.map((scope) => scope.label)
    ]);
}

export function isGenericCiSuccessStatement(text: string): boolean {
  return hasSuccessLanguage(text)
    && /\b(?:ci|continuous integration|workflow|checks?)\b/i.test(text);
}

export function assessGenericCiSuccess(
  text: string,
  checks: CheckRunSummary[]
): CiEvidenceAssessment | null {
  if (!isGenericCiSuccessStatement(text)) return null;

  // Workflow steps are valuable for specific claims such as "lint passes".
  // A statement about the whole CI must be evaluated from top-level checks so
  // one failed job cannot be hidden by many successful steps in other jobs.
  const topLevelChecks = checks.filter((check) => check.scope !== "step");

  if (topLevelChecks.length === 0) {
    return {
      status: "UNPROVEN",
      reason: "No top-level CI checks were observed for this pull request.",
      matchedChecks: []
    };
  }

  const failed = topLevelChecks.filter((check) =>
    FAILED_CONCLUSIONS.has(check.conclusion ?? "")
  );
  if (failed.length > 0) {
    return {
      status: "FAILED",
      reason: `Observed top-level CI failure: ${failed.map((check) => check.name).join(", ")}.`,
      matchedChecks: topLevelChecks
    };
  }

  const incomplete = topLevelChecks.filter(
    (check) => check.status !== "completed" || check.conclusion === null
  );
  if (incomplete.length > 0) {
    return {
      status: "UNPROVEN",
      reason: `Top-level CI has not completed: ${incomplete.map((check) => check.name).join(", ")}.`,
      matchedChecks: topLevelChecks
    };
  }

  const scopeRequirements = genericCiScopeRequirements(text);
  if (scopeRequirements) {
    const missing = missingScopeCombinations(topLevelChecks, scopeRequirements);
    if (missing.length > 0) {
      return {
        status: "UNPROVEN",
        reason: `No top-level CI check was observed for the claimed scope: ${missing
          .map((combination) => combination.join(" + "))
          .join(", ")}.`,
        matchedChecks: topLevelChecks
      };
    }
  }

  if (topLevelChecks.every((check) => check.conclusion === "success")) {
    return {
      status: "PROVEN",
      reason: scopeRequirements
        ? "All observed top-level CI checks succeeded and every claimed environment scope was observed."
        : "All observed top-level CI checks completed successfully.",
      matchedChecks: topLevelChecks
    };
  }

  const nonSuccessful = topLevelChecks.filter((check) => check.conclusion !== "success");
  return {
    status: "UNPROVEN",
    reason: `Not every observed top-level CI check succeeded: ${nonSuccessful
      .map((check) => `${check.name} (${check.conclusion ?? check.status})`)
      .join(", ")}.`,
    matchedChecks: topLevelChecks
  };
}
