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

function hasSuccessLanguage(text: string): boolean {
  return /\b(?:pass(?:es|ed)?|succeed(?:s|ed)?|success(?:ful(?:ly)?)?|green)\b/i.test(text);
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

  if (topLevelChecks.every((check) => check.conclusion === "success")) {
    return {
      status: "PROVEN",
      reason: "All observed top-level CI checks completed successfully.",
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
