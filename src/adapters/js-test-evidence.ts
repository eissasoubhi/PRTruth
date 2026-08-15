import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface JsTestEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const JS_PROJECT_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
]);

const TEST_FILE_PATTERN = /(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/i;
const TEST_CHECK_PATTERN = /(^|[\s:/_-])(test|tests|vitest|jest|mocha|ava|playwright|cypress)([\s:/_-]|$)/i;

function isJsProjectFile(path: string): boolean {
  return JS_PROJECT_FILES.has(path) || /(^|\/)package\.json$/i.test(path);
}

function isJsTestFile(path: string): boolean {
  return TEST_FILE_PATTERN.test(path);
}

function isTestCheck(check: CheckRunSummary): boolean {
  return TEST_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessJsTestEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): JsTestEvidenceResult {
  const signals = [
    ...changedFiles.filter(isJsProjectFile).map((path) => `project:${path}`),
    ...changedFiles.filter(isJsTestFile).map((path) => `test-file:${path}`),
  ];

  const matchedChecks = checks.filter(isTestCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No JavaScript/TypeScript project, test-file, or test-check signal was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `JavaScript/TypeScript test evidence contains ${failed.length} failed test check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "JavaScript/TypeScript signals exist, but no recognizable test check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one JavaScript/TypeScript test check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized JavaScript/TypeScript test check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
