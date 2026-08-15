import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface PhpunitEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const PHP_PROJECT_FILES = new Set([
  "composer.json",
  "composer.lock",
  "phpunit.xml",
  "phpunit.xml.dist",
]);

const PHP_TEST_FILE_PATTERN = /(^|\/)tests?(\/|$)|Test\.php$/i;
const PHPUNIT_CHECK_PATTERN = /(^|[\s:/_-])(phpunit|php tests?|unit tests?)([\s:/_-]|$)/i;

function isPhpProjectFile(path: string): boolean {
  return PHP_PROJECT_FILES.has(path) || /(^|\/)composer\.json$/i.test(path);
}

function isPhpTestFile(path: string): boolean {
  return PHP_TEST_FILE_PATTERN.test(path);
}

function isPhpunitCheck(check: CheckRunSummary): boolean {
  return PHPUNIT_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessPhpunitEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): PhpunitEvidenceResult {
  const signals = [
    ...changedFiles.filter(isPhpProjectFile).map((path) => `project:${path}`),
    ...changedFiles.filter(isPhpTestFile).map((path) => `test-file:${path}`),
  ];

  const matchedChecks = checks.filter(isPhpunitCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No PHP/PHPUnit project, test-file, or test-check signal was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `PHPUnit evidence contains ${failed.length} failed test check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "PHP/PHPUnit signals exist, but no recognizable PHPUnit test check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one PHPUnit test check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized PHPUnit test check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
