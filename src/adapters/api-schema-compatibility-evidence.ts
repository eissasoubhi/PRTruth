import type { CheckRunSummary, EvidenceStatus } from "../types.js";

export interface ApiSchemaCompatibilityEvidenceResult {
  applicable: boolean;
  status: EvidenceStatus;
  reason: string;
  matchedChecks: CheckRunSummary[];
  signals: string[];
}

const API_SCHEMA_FILE_PATTERN = /(^|\/)(openapi|swagger)(\.[^/]+)?\.(ya?ml|json)$|(^|\/)schema\.graphqls?$|\.proto$/i;
const COMPATIBILITY_CHECK_PATTERN = /(api[\s:/_-]*(compat|compatibility)|schema[\s:/_-]*(compat|compatibility|diff)|breaking[\s:/_-]*(change|changes|check)|openapi[\s:/_-]*diff|oasdiff|graphql[\s:/_-]*inspector|buf[\s:/_-]*breaking|proto[\s:/_-]*(compat|compatibility))/i;

function isApiSchemaFile(path: string): boolean {
  return API_SCHEMA_FILE_PATTERN.test(path);
}

function isCompatibilityCheck(check: CheckRunSummary): boolean {
  return COMPATIBILITY_CHECK_PATTERN.test(check.name);
}

function isSuccessful(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["success", "neutral", "skipped"].includes(check.conclusion ?? "");
}

function isFailed(check: CheckRunSummary): boolean {
  return check.status === "completed" && ["failure", "timed_out", "cancelled", "action_required"].includes(check.conclusion ?? "");
}

export function assessApiSchemaCompatibilityEvidence(
  changedFiles: string[],
  checks: CheckRunSummary[],
): ApiSchemaCompatibilityEvidenceResult {
  const signals = changedFiles
    .filter(isApiSchemaFile)
    .map((path) => `schema:${path}`);

  const matchedChecks = checks.filter(isCompatibilityCheck);
  const applicable = signals.length > 0 || matchedChecks.length > 0;

  if (!applicable) {
    return {
      applicable: false,
      status: "UNPROVEN",
      reason: "No API schema file or compatibility-check signal was found.",
      matchedChecks,
      signals,
    };
  }

  const failed = matchedChecks.filter(isFailed);
  if (failed.length > 0) {
    return {
      applicable: true,
      status: "FAILED",
      reason: `API/schema compatibility evidence contains ${failed.length} failed compatibility check${failed.length === 1 ? "" : "s"}.`,
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.length === 0) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "API schema changes were detected, but no recognizable compatibility check was reported by CI.",
      matchedChecks,
      signals,
    };
  }

  if (matchedChecks.some((check) => !isSuccessful(check))) {
    return {
      applicable: true,
      status: "UNPROVEN",
      reason: "At least one API/schema compatibility check is incomplete or has a non-success conclusion.",
      matchedChecks,
      signals,
    };
  }

  return {
    applicable: true,
    status: "PROVEN",
    reason: `All ${matchedChecks.length} recognized API/schema compatibility check${matchedChecks.length === 1 ? "" : "s"} completed successfully.`,
    matchedChecks,
    signals,
  };
}
