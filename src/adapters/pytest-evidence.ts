import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface PytestEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const PYTHON_PROJECT_PATTERN = /(^|\/)(pyproject\.toml|requirements(?:-[^/]+)?\.txt|setup\.py|setup\.cfg|tox\.ini|pytest\.ini)$/i;
const PYTEST_FILE_PATTERN = /(^|\/)(test_[^/]+|[^/]+_test)\.py$|(^|\/)(test|tests)(\/|$)/i;
const PYTEST_CHECK_PATTERN = /(^|[\s:/_-])(pytest|python tests?|unit tests?)([\s:/_-]|$)/i;

function isPythonProjectFile(path: string): boolean {
  return PYTHON_PROJECT_PATTERN.test(path);
}

function isPytestFile(path: string): boolean {
  return PYTEST_FILE_PATTERN.test(path);
}

function isPytestCheck(check: CheckRunSummary): boolean {
  return PYTEST_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessPytestEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): PytestEvidenceResult {
  const signals = [
    ...changedFiles.filter(isPythonProjectFile).map((path) => `project:${path}`),
    ...changedFiles.filter(isPytestFile).map((path) => `test-file:${path}`),
  ];

  const matchedChecks = checks.filter(isPytestCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No Python project, pytest test-file, or pytest check signal was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `Pytest evidence contains ${failed.length} failed test check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "Python/pytest signals exist, but no recognizable pytest check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one pytest check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized pytest check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
