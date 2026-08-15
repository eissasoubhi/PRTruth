import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface GoTestEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const GO_PROJECT_FILES = new Set(["go.mod", "go.sum", "go.work", "go.work.sum"]);
const GO_TEST_FILE_PATTERN = /(^|\/)[^/]+_test\.go$/i;
const GO_TEST_CHECK_PATTERN = /(^|[\s:/_-])(go test|gotest|golang test|go-tests?|tests?)([\s:/_-]|$)/i;

function isGoProjectFile(path: string): boolean {
  return GO_PROJECT_FILES.has(path) || /(^|\/)(go\.mod|go\.work)$/i.test(path);
}

function isGoTestFile(path: string): boolean {
  return GO_TEST_FILE_PATTERN.test(path);
}

function isGoTestCheck(check: CheckRunSummary): boolean {
  return GO_TEST_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessGoTestEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): GoTestEvidenceResult {
  const signals = [
    ...changedFiles.filter(isGoProjectFile).map((path) => `project:${path}`),
    ...changedFiles.filter(isGoTestFile).map((path) => `test-file:${path}`),
  ];

  const matchedChecks = checks.filter(isGoTestCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No Go project, Go test-file, or Go test-check signal was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `Go test evidence contains ${failed.length} failed test check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "Go project/test signals exist, but no recognizable Go test check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one Go test check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized Go test check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
