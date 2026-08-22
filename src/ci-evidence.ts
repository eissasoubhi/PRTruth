import type { CheckRunSummary, EvidenceStatus, RequiredStatusCheck } from "./types.js";

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

function hasToolSuccessLanguage(text: string): boolean {
  return hasSuccessLanguage(text)
    || /\bclean\b/i.test(text)
    || /\b(?:reports?|reported|finds?|found)\s+no\b[^.\n]{0,80}\b(?:findings?|issues?|vulnerabilit(?:y|ies)|secrets?)\b/i.test(text);
}

function isRequiredChecksSuccessStatement(text: string): boolean {
  return /\brequired\b[^.\n]{0,80}\b(?:ci|checks?|workflows?|jobs?)\b/i.test(text)
    || /\b(?:ci|checks?|workflows?|jobs?)\b[^.\n]{0,80}\brequired\b/i.test(text);
}

function matcher(label: string, pattern: RegExp): ScopeMatcher {
  return {
    label,
    matches: (name: string) => pattern.test(name)
  };
}

function toolSpecificValidationMatchers(text: string): ScopeMatcher[] {
  const tools: ScopeMatcher[] = [];
  if (/\bpytest\b/i.test(text)) tools.push(matcher("pytest", /\bpytest\b/i));
  if (/\bruff\b/i.test(text)) tools.push(matcher("ruff", /\bruff\b/i));
  if (/\bmypy\b/i.test(text)) tools.push(matcher("mypy", /\bmypy\b/i));
  if (/\bpyright\b/i.test(text)) tools.push(matcher("pyright", /\bpyright\b/i));
  if (/\bty\s+check\b/i.test(text)) tools.push(matcher("ty", /\bty\b/i));
  if (/\bflake8\b/i.test(text)) tools.push(matcher("flake8", /\bflake8\b/i));
  if (/\bshellcheck\b/i.test(text)) tools.push(matcher("shellcheck", /\bshellcheck\b/i));
  if (/\bshfmt\b/i.test(text)) tools.push(matcher("shfmt", /\bshfmt\b/i));
  if (/\bhadolint\b/i.test(text)) tools.push(matcher("hadolint", /\bhadolint\b/i));
  if (/\bactionlint\b/i.test(text)) tools.push(matcher("actionlint", /\bactionlint\b/i));
  if (/\bgolangci[- ]lint\b/i.test(text)) tools.push(matcher("golangci-lint", /\bgolangci[- ]lint\b/i));
  if (/\bstaticcheck\b/i.test(text)) tools.push(matcher("staticcheck", /\bstaticcheck\b/i));
  if (/\bgocritic\b|\bgo-critic\b/i.test(text)) tools.push(matcher("gocritic", /\bgocritic\b|\bgo-critic\b/i));
  if (/\berrcheck\b/i.test(text)) tools.push(matcher("errcheck", /\berrcheck\b/i));
  if (/\bdeadcode\b|\bdead code\b/i.test(text)) tools.push(matcher("deadcode", /\bdeadcode\b|\bdead code\b/i));
  if (/\bclippy\b/i.test(text)) tools.push(matcher("clippy", /\b(?:cargo\s+)?clippy\b/i));
  if (/\brustfmt\b|\bcargo\s+fmt\b/i.test(text)) tools.push(matcher("rustfmt", /\brustfmt\b|\bcargo\s+fmt\b/i));
  if (/\bcargo[- ]deny\b/i.test(text)) tools.push(matcher("cargo-deny", /\bcargo[- ]deny\b/i));
  if (/\bcargo[- ]machete\b/i.test(text)) tools.push(matcher("cargo-machete", /\bcargo[- ]machete\b/i));
  if (/\brustsec\b|\bcargo[- ]audit\b/i.test(text)) tools.push(matcher("rustsec/cargo-audit", /\brustsec\b|\bcargo[- ]audit\b/i));
  if (/\bcargo\s+check\b/i.test(text)) tools.push(matcher("cargo check", /\bcargo\s+check\b/i));
  if (/\bgit\s+diff\s+--check\b/i.test(text)) tools.push(matcher("git diff --check", /\bgit\s+diff\s+--check\b/i));
  if (/\beslint\b/i.test(text)) tools.push(matcher("eslint", /\beslint\b/i));
  if (/\bprettier\b/i.test(text)) tools.push(matcher("prettier", /\bprettier\b/i));
  if (/\bstylelint\b/i.test(text)) tools.push(matcher("stylelint", /\bstylelint\b/i));
  if (/\bmarkdownlint(?:-cli(?:2)?)?\b/i.test(text)) tools.push(matcher("markdownlint", /\bmarkdownlint(?:-cli(?:2)?)?\b/i));
  if (/\bbiome\b/i.test(text)) tools.push(matcher("biome", /\bbiome\b/i));
  if (/\boxlint\b/i.test(text)) tools.push(matcher("oxlint", /\boxlint\b/i));
  if (/\bktlint\b/i.test(text)) tools.push(matcher("ktlint", /\bktlint(?:check)?\b/i));
  if (/\bdetekt\b/i.test(text)) tools.push(matcher("detekt", /\bdetekt\b/i));
  if (/\bswiftlint\b/i.test(text)) tools.push(matcher("swiftlint", /\bswiftlint\b/i));
  if (/\bswiftformat\b/i.test(text)) tools.push(matcher("swiftformat", /\bswiftformat\b/i));
  if (/\bgitleaks\b/i.test(text)) tools.push(matcher("gitleaks", /\bgitleaks\b/i));
  if (/\bsemgrep\b/i.test(text)) tools.push(matcher("semgrep", /\bsemgrep\b/i));
  if (/\bbandit\b/i.test(text)) tools.push(matcher("bandit", /\bbandit\b/i));
  if (/\bpip[- ]audit\b/i.test(text)) tools.push(matcher("pip-audit", /\bpip[- ]audit\b/i));
  if (/\brubocop\b/i.test(text)) tools.push(matcher("rubocop", /\brubocop\b/i));
  if (/\bstandard(?:rb| ruby)\b/i.test(text)) tools.push(matcher("standardrb", /\bstandard(?:rb)?\b/i));
  if (/\bphpcs\b/i.test(text)) tools.push(matcher("phpcs", /\bphpcs\b/i));
  if (/\bphpstan\b/i.test(text)) tools.push(matcher("phpstan", /\bphpstan\b/i));
  if (/\bpsalm\b/i.test(text)) tools.push(matcher("psalm", /\bpsalm\b/i));
  if (/\b(?:laravel\s+)?pint\b/i.test(text)) tools.push(matcher("pint", /\b(?:laravel\s+)?pint\b/i));
  if (/\brector\b/i.test(text)) tools.push(matcher("rector", /\brector\b/i));
  if (/\bpest\b/i.test(text)) tools.push(matcher("pest", /\bpest\b/i));
  if (/\bblack\b(?![- ]box)/i.test(text)) tools.push(matcher("black", /\bblack\b(?![- ]box)/i));
  if (/\bisort\b/i.test(text)) tools.push(matcher("isort", /\bisort\b/i));
  if (/\bcodespell\b/i.test(text)) tools.push(matcher("codespell", /\bcodespell\b/i));
  if (/\bpylint\b/i.test(text)) tools.push(matcher("pylint", /\bpylint\b/i));
  if (/\bpyink\b/i.test(text)) tools.push(matcher("pyink", /\bpyink\b/i));
  if (/\bmdformat\b/i.test(text)) tools.push(matcher("mdformat", /\bmdformat\b/i));
  if (/\byamllint\b/i.test(text)) tools.push(matcher("yamllint", /\byamllint\b/i));
  if (/\bsqlfluff\b/i.test(text)) tools.push(matcher("sqlfluff", /\bsqlfluff\b/i));
  if (/\bansible[- ]lint\b/i.test(text)) tools.push(matcher("ansible-lint", /\bansible[- ]lint\b/i));
  if (/\btrunk\s+(?:check|fmt)\b/i.test(text)) tools.push(matcher("trunk", /\btrunk\b/i));
  if (/\bterraform\s+fmt\b/i.test(text)) tools.push(matcher("terraform fmt", /\bterraform\s+fmt\b/i));
  if (/\bterraform\s+validate\b/i.test(text)) tools.push(matcher("terraform validate", /\bterraform\s+validate\b/i));
  if (/\btflint\b/i.test(text)) tools.push(matcher("tflint", /\btflint\b/i));
  if (/\bcheckov\b/i.test(text)) tools.push(matcher("checkov", /\bcheckov\b/i));
  return tools;
}

function dedupeChecks(checks: CheckRunSummary[]): CheckRunSummary[] {
  const seen = new Set<string>();
  return checks.filter((check) => {
    const key = `${check.name}\u0000${check.scope ?? ""}\u0000${check.status}\u0000${check.conclusion ?? ""}\u0000${check.htmlUrl ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isToolSetupNoise(check: CheckRunSummary): boolean {
  return /\b(?:install|setup|set up|download|cache)\b/i.test(check.name)
    || /(?:^|\/\s*)post\b/i.test(check.name.trim());
}

function selectToolEvidence(checks: CheckRunSummary[], tool: ScopeMatcher): CheckRunSummary[] {
  const meaningful = checks.filter((check) => tool.matches(check.name) && !isToolSetupNoise(check));
  const steps = meaningful.filter((check) => check.scope === "step");
  return steps.length > 0 ? steps : meaningful.filter((check) => check.scope !== "step");
}

function assessToolSpecificValidation(
  checks: CheckRunSummary[],
  tools: ScopeMatcher[]
): CiEvidenceAssessment {
  const matchedByTool = tools.map((tool) => ({
    tool,
    checks: selectToolEvidence(checks, tool)
  }));
  const allMatchedChecks = dedupeChecks(matchedByTool.flatMap((entry) => entry.checks));
  const matchedChecks = allMatchedChecks.filter((check) => check.conclusion !== "skipped");
  const missing = matchedByTool.filter((entry) => entry.checks.length === 0).map((entry) => entry.tool.label);

  if (missing.length > 0) {
    return {
      status: "UNPROVEN",
      reason: `No matching CI evidence was observed for the named validation tool${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
      matchedChecks
    };
  }

  const failed = allMatchedChecks.find((check) => FAILED_CONCLUSIONS.has(check.conclusion ?? ""));
  if (failed) {
    return {
      status: "FAILED",
      reason: `A matching tool-specific CI check failed: ${failed.name}.`,
      matchedChecks
    };
  }

  const incomplete = allMatchedChecks.find(
    (check) => check.status !== "completed" || check.conclusion === null
  );
  if (incomplete) {
    return {
      status: "UNPROVEN",
      reason: `A matching tool-specific CI check has not completed: ${incomplete.name}.`,
      matchedChecks
    };
  }

  const withoutSuccess = matchedByTool
    .filter((entry) => !entry.checks.some((check) => check.conclusion === "success"))
    .map((entry) => entry.tool.label);
  if (withoutSuccess.length > 0) {
    return {
      status: "UNPROVEN",
      reason: `No successful executable CI evidence was observed for the named validation tool${withoutSuccess.length === 1 ? "" : "s"}: ${withoutSuccess.join(", ")}.`,
      matchedChecks
    };
  }

  return {
    status: "PROVEN",
    reason: "Every named validation tool was observed in matching executable CI evidence and completed successfully.",
    matchedChecks
  };
}

function versionMatchers(text: string, label: string, claimPattern: RegExp, checkPrefixPattern: string): ScopeMatcher[] {
  const versions = [...new Set([...text.matchAll(claimPattern)].map((match) => match[1]).filter(Boolean))] as string[];
  return versions.map((version) => {
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return matcher(
      `${label} ${version}`,
      new RegExp(`\\b${checkPrefixPattern}\\s*v?${escapedVersion}(?:\\b|\\.)`, "i")
    );
  });
}

function runtimeMatchers(text: string, runtime: "node" | "php" | "python" | "go"): ScopeMatcher[] {
  const runtimePattern = runtime === "node" ? "(?:node(?:\\.js)?|nodejs)" : runtime;
  return versionMatchers(
    text,
    runtime,
    new RegExp(`\\b${runtimePattern}\\s*v?(\\d+(?:\\.\\d+){0,2})\\b`, "gi"),
    runtimePattern
  );
}

function frameworkMatchers(text: string): ScopeMatcher[] {
  const rails = versionMatchers(
    text,
    "rails",
    /\b(?:rails|ruby on rails|active\s*record)\s*v?(\d+(?:\.\d+){1,3})\b/gi,
    "(?:rails|ruby on rails|active\\s*record)"
  );
  const django = versionMatchers(
    text,
    "django",
    /\bdjango\s*v?(\d+(?:\.\d+){1,2})\b/gi,
    "django(?:\\s+compatibility)?\\s*(?:==|~=|=)?"
  );
  const springBoot = versionMatchers(
    text,
    "spring boot",
    /\bspring\s+boot\s*v?(\d+(?:\.\d+){1,2})\b/gi,
    "spring\\s+boot"
  );
  return [...rails, ...django, ...springBoot];
}

function databaseMatchers(text: string, database: "postgres" | "mysql" | "mariadb" | "sqlite"): ScopeMatcher[] {
  const databasePattern = database === "postgres"
    ? "(?:postgres(?:ql)?|pg)"
    : database === "sqlite"
      ? "sqlite(?:3)?"
      : database;
  const claimPattern = new RegExp(`\\b${databasePattern}\\s*v?(\\d+(?:\\.\\d+){0,2})\\b`, "gi");
  const versions = [...new Set([...text.matchAll(claimPattern)].map((match) => match[1]).filter(Boolean))] as string[];

  if (versions.length === 0) return [];
  return versions.map((version) => {
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return matcher(
      `${database} ${version}`,
      new RegExp(`\\b${databasePattern}\\s*v?${escapedVersion}(?:\\b|\\.)`, "i")
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

  const runnerTypes: ScopeMatcher[] = [];
  if (/\bself[- ]hosted\b/i.test(text)) runnerTypes.push(matcher("self-hosted", /\bself[- ]hosted\b/i));
  if (/\bgithub[- ]hosted\b/i.test(text)) runnerTypes.push(matcher("github-hosted", /\bgithub[- ]hosted\b/i));
  if (runnerTypes.length > 0) axes.push(runnerTypes);

  const accelerators: ScopeMatcher[] = [];
  if (/\ba100\b/i.test(text)) accelerators.push(matcher("a100", /\ba100\b/i));
  if (/\bh100\b/i.test(text)) accelerators.push(matcher("h100", /\bh100\b/i));
  if (/\bh200\b/i.test(text)) accelerators.push(matcher("h200", /\bh200\b/i));
  if (/\bb200\b/i.test(text)) accelerators.push(matcher("b200", /\bb200\b/i));
  if (/\bb300\b/i.test(text)) accelerators.push(matcher("b300", /\bb300\b/i));
  if (/\bgb200\b/i.test(text)) accelerators.push(matcher("gb200", /\bgb200\b/i));
  if (/\bgb300\b/i.test(text)) accelerators.push(matcher("gb300", /\bgb300\b/i));
  if (/\bl40s\b/i.test(text)) accelerators.push(matcher("l40s", /\bl40s\b/i));
  if (/\brtx(?:[\s_-]*pro)?[\s_-]*6000(?:bw)?\b/i.test(text)) {
    accelerators.push(matcher("rtx pro 6000", /\brtx(?:[\s_-]*pro)?[\s_-]*6000(?:bw)?\b/i));
  }
  if (accelerators.length > 0) axes.push(accelerators);

  const gpuBackends: ScopeMatcher[] = [];
  if (/\bcuda\b/i.test(text)) gpuBackends.push(matcher("cuda", /\bcuda\b/i));
  if (/\brocm\b/i.test(text)) gpuBackends.push(matcher("rocm", /\brocm\b/i));
  if (gpuBackends.length > 0) axes.push(gpuBackends);

  if (/\bgpu\b/i.test(text) && accelerators.length === 0 && gpuBackends.length === 0) {
    environment.push(matcher("gpu", /\bgpu\b/i));
  }

  const databases: ScopeMatcher[] = [];
  const versionedDatabases = new Set<string>();
  for (const database of ["postgres", "mysql", "mariadb", "sqlite"] as const) {
    const databaseVersionMatchers = databaseMatchers(text, database);
    if (databaseVersionMatchers.length > 0) {
      versionedDatabases.add(database);
      databases.push(...databaseVersionMatchers);
    }
  }
  if ((/\bpostgres(?:ql)?\b|\bpg\b/i.test(text)) && !versionedDatabases.has("postgres")) {
    databases.push(matcher("postgres", /\bpostgres(?:ql)?\b|\bpg\b/i));
  }
  if (/\bmysql\b/i.test(text) && !versionedDatabases.has("mysql")) databases.push(matcher("mysql", /\bmysql\b/i));
  if (/\bsqlite(?:3)?\b/i.test(text) && !versionedDatabases.has("sqlite")) databases.push(matcher("sqlite", /\bsqlite(?:3)?\b/i));
  if (/\bmariadb\b/i.test(text) && !versionedDatabases.has("mariadb")) databases.push(matcher("mariadb", /\bmariadb\b/i));
  if (databases.length > 0) axes.push(databases);

  const browsers: ScopeMatcher[] = [];
  if (/\bchromium\b/i.test(text)) browsers.push(matcher("chromium", /\bchromium\b/i));
  if (/\bchrome\b|\bgoogle chrome\b/i.test(text)) browsers.push(matcher("chrome", /\bchrome\b|\bgoogle chrome\b/i));
  if (/\bfirefox\b/i.test(text)) browsers.push(matcher("firefox", /\bfirefox\b/i));
  if (/\bwebkit\b/i.test(text)) browsers.push(matcher("webkit", /\bwebkit\b/i));
  if (/\bsafari\b/i.test(text)) browsers.push(matcher("safari", /\bsafari\b/i));
  if (browsers.length > 0) axes.push(browsers);

  const summernoteHosts: ScopeMatcher[] = [];
  if (/\bbootstrap\s*3\b|\bbs3\b/i.test(text)) summernoteHosts.push(matcher("bootstrap 3", /\bbootstrap\s*3\b|\bbs3\b/i));
  if (/\bbootstrap\s*4\b|\bbs4\b/i.test(text)) summernoteHosts.push(matcher("bootstrap 4", /\bbootstrap\s*4\b|\bbs4\b/i));
  if (/\bbootstrap\s*5\b|\bbs5\b/i.test(text)) summernoteHosts.push(matcher("bootstrap 5", /\bbootstrap\s*5\b|\bbs5\b/i));
  if (/\bsummernote\b/i.test(text) && /\blite\b/i.test(text)) summernoteHosts.push(matcher("summernote lite", /\bsummernote\s+lite\b|\blite\b/i));
  if (summernoteHosts.length > 0) axes.push(summernoteHosts);

  const frameworks = frameworkMatchers(text);
  if (frameworks.length > 0) axes.push(frameworks);

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

function normalizeCheckName(name: string): string {
  return name.trim().toLowerCase();
}

function checkMatchesRequiredSource(check: CheckRunSummary, required: RequiredStatusCheck): boolean {
  return normalizeCheckName(required.context) === normalizeCheckName(check.name)
    && (required.appId === undefined || check.appId === required.appId);
}

function requiredCheckLabel(required: RequiredStatusCheck): string {
  return required.appId === undefined
    ? required.context
    : `${required.context} (GitHub App ${required.appId})`;
}

function assessConfiguredRequiredChecks(
  checks: CheckRunSummary[],
  requiredCheckContexts: RequiredStatusCheck[] | null
): CiEvidenceAssessment {
  if (requiredCheckContexts === null) {
    return {
      status: "UNPROVEN",
      reason: "Required-check membership and completeness are not available in the current evidence.",
      matchedChecks: checks
    };
  }

  if (requiredCheckContexts.length === 0) {
    return {
      status: "UNPROVEN",
      reason: "No required status checks are configured for the pull request base branch.",
      matchedChecks: []
    };
  }

  const requiredContexts = requiredCheckContexts.filter((required, index, all) =>
    required.context.trim()
    && all.findIndex((candidate) =>
      normalizeCheckName(candidate.context) === normalizeCheckName(required.context)
      && candidate.appId === required.appId
    ) === index
  );
  const matchedChecks = checks.filter((check) =>
    requiredContexts.some((required) => checkMatchesRequiredSource(check, required))
  );
  const missingContexts = requiredContexts.filter((required) =>
    !matchedChecks.some((check) => checkMatchesRequiredSource(check, required))
  );

  if (missingContexts.length > 0) {
    return {
      status: "UNPROVEN",
      reason: `Required status checks were not observed with the configured source on the pull request head: ${missingContexts
        .map(requiredCheckLabel)
        .join(", ")}.`,
      matchedChecks
    };
  }

  for (const required of requiredContexts) {
    const contextChecks = matchedChecks.filter((check) => checkMatchesRequiredSource(check, required));
    const label = requiredCheckLabel(required);
    const incomplete = contextChecks.find(
      (check) => check.status !== "completed" || check.conclusion === null
    );
    if (incomplete) {
      return {
        status: "UNPROVEN",
        reason: `Required status check has not completed: ${label}.`,
        matchedChecks
      };
    }

    const successes = contextChecks.filter((check) => check.conclusion === "success");
    const failures = contextChecks.filter((check) => FAILED_CONCLUSIONS.has(check.conclusion ?? ""));
    if (successes.length > 0 && failures.length > 0) {
      return {
        status: "UNPROVEN",
        reason: `Conflicting observations exist for required status check: ${label}.`,
        matchedChecks
      };
    }
    if (failures.length > 0) {
      return {
        status: "FAILED",
        reason: `A required status check failed: ${label}.`,
        matchedChecks
      };
    }
    if (successes.length !== contextChecks.length) {
      return {
        status: "UNPROVEN",
        reason: `Required status check did not provide a definitive success result: ${label}.`,
        matchedChecks
      };
    }
  }

  return {
    status: "PROVEN",
    reason: "Every configured required status check was observed from its configured source and completed successfully.",
    matchedChecks
  };
}

export function isGenericCiSuccessStatement(text: string): boolean {
  const toolRequirements = toolSpecificValidationMatchers(text);
  return (hasSuccessLanguage(text) && /\b(?:ci|continuous integration|workflow|checks?)\b/i.test(text))
    || (toolRequirements.length > 0 && hasToolSuccessLanguage(text));
}

export function assessGenericCiSuccess(
  text: string,
  checks: CheckRunSummary[],
  requiredCheckContexts: RequiredStatusCheck[] | null = null
): CiEvidenceAssessment | null {
  if (!isGenericCiSuccessStatement(text)) return null;

  const toolRequirements = toolSpecificValidationMatchers(text);
  if (toolRequirements.length > 0) {
    return assessToolSpecificValidation(checks, toolRequirements);
  }

  const topLevelChecks = checks.filter((check) => check.scope !== "step");
  const requiredChecksClaim = isRequiredChecksSuccessStatement(text);

  if (topLevelChecks.length === 0) {
    return {
      status: "UNPROVEN",
      reason: "No top-level CI checks were observed for this pull request.",
      matchedChecks: []
    };
  }

  if (requiredChecksClaim) {
    return assessConfiguredRequiredChecks(topLevelChecks, requiredCheckContexts);
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